# 로그인했는데 Supabase profiles에 안 보일 때

LIFF 로그인은 됐는데 **Table Editor → profiles**에 행이 없다면, 아래 순서대로 확인하세요.

---

## 1. 브라우저 Console 확인 (가장 먼저)

앱을 연 상태에서 **F12** → **Console** 탭을 봅니다.

| 나오는 메시지 | 의미 |
|---------------|------|
| `[LIFF] Supabase 세션 설정 완료` | line-auth 성공 → DB에 프로필이 있어야 함. 2·3번 확인. |
| `[LIFF] Supabase 연동 스킵: LIFF 액세스 토큰 없음` | LINE Scope에 **profile**이 없거나, 토큰을 못 받은 상태. LINE Developers → LIFF → Scope에 **profile** 체크. |
| `[LIFF] Supabase 연동 스킵: LINE_AUTH_URL 또는 SUPABASE_URL 없음` | config.js에 `LINE_AUTH_URL` 또는 `SUPABASE_URL`이 비어 있음. |
| `[LIFF] line-auth 실패 401 ...` | LINE 토큰이 만료/잘못됨. 앱에서 로그아웃 후 다시 로그인. |
| `[LIFF] line-auth 실패 500 ...` | Edge Function 오류. 3번(Secrets·배포) 확인. |
| `[LIFF] line-auth 호출 오류` | 네트워크/ CORS 등. 4번(Network) 확인. |

**위 메시지가 전혀 없으면**  
→ `CONFIG.USE_SUPABASE`가 `false`이거나, `setSupabaseSession`이 로드되기 전에 실행됐을 수 있음.  
→ config.js에서 `USE_SUPABASE: true` 인지, index.html에서 **config → supabase-client → liff-auth** 순서로 로드되는지 확인.

---

## 2. Supabase 프로젝트 / 테이블 확인

- **같은 프로젝트**를 보고 있는지 확인합니다.  
  config.js의 `SUPABASE_URL`(예: `iqkkbulxmjpjrbyuyjqp.supabase.co`)과 Table Editor가 열린 프로젝트가 같아야 합니다.
- **테이블 이름**이 `profiles` (소문자)인지 확인합니다.
- Table Editor에서 **필터**가 걸려 있지 않은지, **새로고침** 해 봅니다.

---

## 3. Edge Function line-auth 배포·Secrets

- **Supabase 대시보드** → **Edge Functions** → **line-auth**가 **배포된 상태**인지 확인.
- **Edge Functions** → **Secrets**에 **JWT_SECRET**이 있고, 값이 **Project Settings → API → JWT Settings → Legacy JWT Secret**과 **동일**한지 확인.
- Secrets 수정 후에는 **재배포 없이** 바로 반영됩니다.  
  (코드를 수정했다면 **Deploy** 다시 해야 합니다.)

---

## 4. Network 탭에서 line-auth 호출 확인

**F12** → **Network** 탭 → 앱에서 **다시 로그인**하거나 **새로고침**합니다.

1. **line-auth** 또는 **functions/v1/line-auth** 요청을 찾습니다.
2. **Status** 확인  
   - **200**: 성공 → 응답 body에 `access_token`이 있으면 DB에도 넣는 코드가 실행된 상태. 2번(다른 프로젝트/테이블/필터) 다시 확인.  
   - **401**: LINE 토큰 문제 → 로그아웃 후 재로그인, LIFF Scope에 profile 확인.  
   - **500**: 서버 오류 → 3번(Secrets, JWT_SECRET) 확인.  
   - **CORS / 실패(빨간색)**: Edge Function URL이 잘못됐거나, 배포가 안 됐을 수 있음. config.js의 `LINE_AUTH_URL`과 실제 배포 URL 확인.
3. **Response** 탭에서 `{ "error": "..." }` 메시지가 있으면 그 내용으로 원인 파악.

---

## 5. LIFF Scope에 profile 있는지

- **LINE Developers Console** → 사용하는 채널 → **LIFF** 탭 → 해당 LIFF 앱 **Edit**.
- **Scope**에 **profile**이 **체크**되어 있어야 `liff.getAccessToken()`이 제대로 동작하고, line-auth가 LINE 프로필을 조회할 수 있습니다.
- 수정 후 **한 번 로그아웃**했다가 다시 LIFF로 로그인해 보세요.

---

## 요약 체크리스트

- [ ] Console에 `[LIFF] Supabase 세션 설정 완료` 가 찍힌다.
- [ ] Console에 `LIFF 액세스 토큰 없음` 이면 → LIFF Scope에 **profile** 추가 후 재로그인.
- [ ] Network에서 **line-auth** 요청이 **200**으로 성공한다.
- [ ] Supabase **같은 프로젝트**의 **profiles** 테이블을 보고, 필터 해제·새로고침 했다.
- [ ] Edge Function **line-auth** 배포됐고, **JWT_SECRET** 이 Secrets에 들어가 있다.

이렇게 해도 안 보이면, Console에 찍힌 메시지와 Network의 line-auth **Status·Response** 내용을 알려주면 원인 좁히기 쉽습니다.
