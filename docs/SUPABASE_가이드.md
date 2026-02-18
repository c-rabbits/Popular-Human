# Human Experiment – Supabase 연동 가이드

이 문서는 Human Experiment 프로젝트에 Supabase를 백엔드로 연동하는 절차를 정리한 것입니다.

---

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 로그인 후 **New Project** 생성.
2. **Organization** / **Name** / **Database Password** 입력 후 리전 선택 (예: Northeast Asia (Seoul)).
3. 프로젝트가 준비되면 **Project Settings** → **API**에서 다음 값을 확인합니다.
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **anon public** key (클라이언트에서 사용)
   - **service_role** key (서버/Edge Function 전용, 노출 금지)

---

## 2. 데이터베이스 스키마 적용

1. Supabase 대시보드 **SQL Editor** 열기.
2. 프로젝트 루트의 `supabase/migrations/001_initial_schema.sql` 내용을 복사해 붙여넣고 **Run** 실행.
3. 테이블이 생성되고 RLS 정책이 적용된 뒤, **Table Editor**에서 테이블 목록을 확인합니다.

스키마 요약:

| 테이블 | 용도 |
|--------|------|
| `profiles` | LINE 유저 프로필, 닉네임, 캐시/포인트/티켓 |
| `events` | 이벤트(시나리오) 메타 – 관리자에서 등록 |
| `event_questions` | 이벤트별 문제/4지선다 (정답은 이벤트 종료 후 저장) |
| `games` | 게임 참여 기록 (이벤트, 유저, 시작/종료 시각) |
| `game_answers` | 유저가 선택한 답 (게임별, 문제 인덱스, 선택 인덱스) |
| `banners` | 메인/배너 이미지 및 링크 |
| `invites` | 친구 초대 관계 (초대자/피초대자, 보상 지급 여부) |

---

## 3. 인증 흐름 (LINE ↔ Supabase)

앱은 LINE LIFF로 로그인하고, Supabase에서는 **LINE 사용자 ID를 구분자**로 사용합니다.

- Supabase Auth에 LINE을 직접 붙이지 않고, **커스텀 JWT**를 사용하는 방식을 권장합니다.
- 흐름:
  1. 앱에서 LIFF `getAccessToken()` 등으로 LINE 액세스 토큰 획득.
  2. **Edge Function** `line-auth`에 토큰 전달.
  3. Edge Function에서 LINE API로 토큰 검증 후, 해당 LINE `userId`로 `profiles` 조회/생성.
  4. 동일한 `userId`를 `sub`로 넣은 **JWT**를 생성 (Supabase JWT Secret 사용).
  5. 앱에 JWT 반환 → 앱은 이 토큰으로 Supabase 클라이언트 `setSession` 호출.
  6. 이후 모든 Supabase 요청은 이 JWT로 인증되며, RLS에서 `auth.jwt()->>'sub'`로 LINE userId를 사용.

Supabase에서 **Custom JWT**를 쓰려면:

- **Project Settings** → **API** → **JWT Settings**에서 JWT Secret 확인.
- Edge Function 등 백엔드에서 이 Secret으로 서명한 JWT를 발급하면, Supabase는 해당 JWT를 “로그인된 사용자”로 인식합니다.
- RLS 정책에서 `auth.jwt()->>'sub' = profiles.line_user_id` 형태로 LINE 사용자만 자신의 `profiles` 행에 접근하도록 설정합니다.

(Edge Function 예시 코드는 `supabase/functions/line-auth/` 참고.)

---

## 4. 앱에서 Supabase 사용

### 4.1 설정

- `js/config.js`에 Supabase **Project URL**과 **anon key**를 넣습니다.  
  (실서비스에서는 빌드 시 환경 변수 등으로 치환하는 것을 권장합니다.)
- `index.html`에서 `config.js` → `supabase-client.js` → `api.js` 순으로 스크립트를 로드합니다.

### 4.2 스크립트 로드 순서 (index.html)

Supabase를 쓸 때는 `api.js`보다 **앞에** 아래를 넣습니다.

```html
<script src="js/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js"></script>
```

그 다음 기존 순서대로 `data.js`, `liff-auth.js`, `kaia-wallet.js`, `api.js` … 를 로드합니다.

### 4.3 API 모듈 연동 예시

`api.js`의 `getUserInfo`를 Supabase와 연동하는 예시입니다. (실제로는 LIFF 토큰 → Edge Function → JWT 발급 후 `setSupabaseSession` 호출이 선행되어야 합니다.)

```javascript
async getUserInfo() {
    if (typeof CONFIG !== 'undefined' && CONFIG.USE_SUPABASE && typeof getSupabase === 'function') {
        const sb = getSupabase();
        const lineUserId = (liffProfile && liffProfile.userId) || (await getSupabaseUserId());
        if (sb && lineUserId) {
            const { data: profile, error } = await sb.from('profiles').select('*').eq('line_user_id', lineUserId).single();
            if (!error && profile)
                return {
                    userId: lineUserId,
                    displayName: profile.display_name || '',
                    pictureUrl: profile.picture_url || '',
                    nickname: profile.nickname || undefined,
                    cash: profile.cash ?? 0,
                    rewardPoints: profile.reward_points ?? 0,
                    tickets: profile.tickets ?? 0,
                    uid: 'PH-' + (lineUserId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()),
                    walletAddress: getConnectedAddress() || '',
                    tokenBalance: { usdt: 0, kaia: 0 },
                    claimable: { usdt: 0, kaia: 0 }
                };
        }
    }
    // 기존 목업 로직
    const userId = liffProfile ? liffProfile.userId : 'user123';
    // ...
}
```

- **이벤트 목록**: `supabase.from('events').select('*').eq('status', 'live')` 등.
- **게임 시작**: `games` insert 후 `profiles`에서 티켓 감소 update.
- **답안 제출**: `game_answers` insert.
- **게임 종료/결과**: `games` update, 이벤트 종료 시 정답/당첨자 계산 후 결과 조회.

기존 목업은 `if (CONFIG.USE_SUPABASE && getSupabase()) { ... } else { ... }` 처럼 분기해 두면 됩니다.

### 4.4 api.js에서 Supabase 호출 분기 방법 (자세히)

#### 전제 조건

- `index.html`에서 **반드시** 아래 순서로 로드되어 있어야 합니다.
  1. `config.js` → `CONFIG`, `CONFIG.USE_SUPABASE` 사용 가능
  2. `@supabase/supabase-js` (CDN) → `window.supabase` 사용 가능
  3. `supabase-client.js` → `getSupabase()`, `getSupabaseUserId()` 사용 가능
  4. `api.js` → 위 전역 함수/객체를 참조 가능

- Supabase를 쓸 때만 `config.js`에서 `CONFIG.USE_SUPABASE = true`로 두고, `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 채웁니다.

#### 분기 판단 헬퍼 (선택)

`api.js` 상단에 아래를 두면, 매 메서드마다 조건을 짧게 쓸 수 있습니다.

```javascript
// Supabase 사용 가능 여부 (config.js + supabase-client.js 로드 후)
function useSupabase() {
    return typeof CONFIG !== 'undefined' && CONFIG.USE_SUPABASE && typeof getSupabase === 'function' && getSupabase() !== null;
}
```

- `getSupabase()`가 `null`이면 URL/키가 비어 있어서 클라이언트가 생성되지 않은 상태이므로, 이 경우도 목업으로 넘깁니다.

#### 공통 패턴 (각 API 메서드 안에서)

1. **Supabase 분기**
   - `if (useSupabase()) { ... }` 안에서만 Supabase 호출.
   - 그 안에서 `const sb = getSupabase();` 로 클라이언트를 받고, `sb.from('테이블명').select() / insert() / update()` 등 사용.

2. **비동기 사용자 식별**
   - 프로필/게임 등 “현재 유저”가 필요하면 `line_user_id`를 씁니다.
   - LIFF 로그인 상태면 `liffProfile.userId`, 아니면(또는 JWT만 있는 경우) `await getSupabaseUserId()` 사용.
   - 예: `const lineUserId = (liffProfile && liffProfile.userId) || (await getSupabaseUserId());`

3. **에러 처리**
   - Supabase 호출은 `const { data, error } = await sb.from(...)...` 형태로 받고, `if (error) { console.error(...); }` 후 **아래 기존 목업 로직으로 폴백**하거나, 메서드 규격에 맞게 `return null` / `return { success: false }` 등 처리.

4. **return 순서**
   - Supabase 분기 안에서 **성공 시 바로 return**.
   - Supabase를 쓰지 않거나, 에러가 나면 **기존 목업 코드가 실행되도록** 분기 밖에 기존 로직을 둡니다.

```text
async someMethod() {
    try {
        if (useSupabase()) {
            const sb = getSupabase();
            if (!sb) break;  // 또는 바로 목업으로
            const lineUserId = (liffProfile && liffProfile.userId) || (await getSupabaseUserId());
            if (!lineUserId) break;

            const { data, error } = await sb.from('...').select()...;
            if (error) {
                console.error('[API] Supabase error', error);
                break;
            }
            // data를 앱에서 쓰는 형태로 가공
            return { ... };
        }
    } catch (e) {
        console.error('[API] Supabase exception', e);
    }

    // 기존 목업 로직 (Supabase 미사용 또는 실패 시)
    return { ... };
}
```

#### 메서드별 분기 요약

| API 메서드       | Supabase 분기 시 할 일 |
|------------------|-------------------------|
| `getUserInfo()`  | `profiles`에서 `line_user_id`로 1건 조회 후 반환 형태로 매핑. |
| `getScenarios()` | 필요 시 `events` + `event_questions` 조회해 시나리오 목록 구성. (또는 기존 `scenarios` 정적 데이터 유지.) |
| `startGame()`    | `games` insert, `profiles`의 `tickets` 감소 update. |
| `submitAnswer()` | `game_answers` insert. |
| `completeGame()` | `games` 상태 update, 필요 시 결과 계산. |
| `getEventResult()` | `games` / 이벤트 정답·승자 정보 조회 후 반환. |

모두 **같은 패턴**: `if (useSupabase()) { sb = getSupabase(); ... await sb.from(...)...; return ...; }` 뒤에 기존 목업을 두면 됩니다.

---

## 5. 관리자 페이지 연동

- 관리자(이벤트/배너 등)는 **service_role**을 쓰는 백엔드(예: 별도 관리자 API 또는 Edge Function)에서만 사용하는 것을 권장합니다.
- 브라우저에 service_role을 두지 말고, “관리자 로그인 → 서버에서 Supabase service_role로 이벤트/배너 CRUD” 구조로 두면 됩니다.
- 우선은 앱(유저) 쪽만 Supabase 연동하고, 관리자는 기존처럼 localStorage/목업을 쓰다가, 나중에 관리자용 API를 Supabase + service_role로 옮기는 방식으로 진행해도 됩니다.

---

## 6. 환경 변수 / 보안

- **anon key**는 클라이언트에 노출되어도 되지만, RLS로 테이블/행 단위 접근을 제한해야 합니다.
- **service_role**과 **JWT Secret**은 서버(Edge Function 등)에만 두고, 깃 등에는 올리지 않습니다.
- `.env` 또는 `config.js.example`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 예시만 두고, 실제 값은 각자 로컬/CI에서 채우도록 합니다.

---

## 7. 체크리스트

- [v] Supabase 프로젝트 생성
- [v] `001_initial_schema.sql` 실행
- [ ] (선택) Edge Function `line-auth` 배포 및 LIFF 토큰 → JWT 교환 연동
- [v] `config.js`에 URL/anon key 설정
- [ ] `supabase-client.js` 로드 후 `api.js`에서 Supabase 호출 분기
- [ ] 프로필/이벤트/게임 시작·답안·종료 흐름 테스트
- [ ] 관리자 기능은 필요 시 별도 API로 이전

이 순서대로 진행하면 현재 Human Experiment 앱을 Supabase 기반으로 단계적으로 옮길 수 있습니다.
