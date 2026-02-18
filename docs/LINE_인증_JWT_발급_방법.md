# profiles 조회/생성 → JWT 발급(sub = line_user_id) 방법

Edge Function `line-auth`에서 **LIFF 액세스 토큰 검증 후** 이어서 할 작업입니다.

---

## 1. profiles 조회/생성

### 1.1 왜 서버에서 하는가

- RLS 정책이 `auth.jwt()->>'sub' = line_user_id` 이므로, **JWT가 없으면** 클라이언트는 `profiles`에 insert/select 할 수 없습니다.
- 최초 로그인 시 **프로필이 없을 수** 있으므로, Edge Function에서 **service_role**로 RLS를 우회해 조회/생성을 합니다.

### 1.2 사용할 Supabase 클라이언트

- **service_role 키**로 생성한 Admin 클라이언트를 사용합니다.
- Edge Function에서는 `SUPABASE_SERVICE_ROLE_KEY`가 기본 환경 변수로 제공됩니다.

```ts
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)
```

- 이 클라이언트로 하는 요청은 **RLS를 타지 않습니다.** (본인만 쓰고, 브라우저에 service_role을 두지 마세요.)

### 1.3 조회 후 없으면 생성 (upsert)

- `profiles` 테이블에 `line_user_id`가 **UNIQUE**이므로, 한 번만 넣으면 됩니다.

**방법 A: select 후 insert**

```ts
const lineUserId = '...'  // LINE 프로필 API에서 획득
const displayName = '...'
const pictureUrl = '...'

const { data: existing } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .eq('line_user_id', lineUserId)
  .maybeSingle()

if (!existing) {
  await supabaseAdmin.from('profiles').insert({
    line_user_id: lineUserId,
    display_name: displayName,
    picture_url: pictureUrl ?? null,
    nickname: null,
    use_default_name: true,
    cash: 0,
    reward_points: 0,
    tickets: 0,
  })
}
// 이미 있으면 그대로 둠 (필요 시 display_name, picture_url만 update 가능)
```

**방법 B: upsert (한 번에)**

```ts
const { error } = await supabaseAdmin
  .from('profiles')
  .upsert(
    {
      line_user_id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'line_user_id' }
  )
```

- `updated_at`은 트리거로 자동 갱신되므로, insert 시엔 생략해도 됩니다.
- 새 유저면 insert, 기존 유저면 `line_user_id` 기준으로 update 됩니다.

### 1.4 필요한 컬럼 (profiles)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| line_user_id | TEXT NOT NULL UNIQUE | LINE userId |
| display_name | TEXT | LINE displayName |
| picture_url | TEXT | LINE pictureUrl |
| nickname | TEXT | 앱에서 설정한 닉네임 (선택) |
| use_default_name | BOOLEAN | 기본 true |
| cash, reward_points, tickets | INTEGER | 기본 0 |

---

## 2. JWT 발급 (sub = line_user_id)

### 2.1 목적

- Supabase 클라이언트가 `setSession(access_token, refresh_token)`으로 이 JWT를 넣으면, 이후 요청부터 **RLS**에서 `auth.jwt()->>'sub'`로 `line_user_id`를 쓸 수 있습니다.
- 따라서 **sub에는 반드시 line_user_id 문자열**을 넣습니다.

### 2.2 JWT 구조 (Supabase가 기대하는 형태)

- **payload**에 최소한:
  - `sub`: LINE 사용자 ID (문자열)
  - `role`: `"authenticated"`
  - `exp`: 만료 시각 (Unix 초)
  - `iat`: 발급 시각 (Unix 초)
- **iss**는 Supabase 문서에 따르면 `https://<project-ref>.supabase.co/auth/v1` 형태를 쓰는 경우가 많습니다. (커스텀 JWT는 프로젝트 설정에 따라 다를 수 있음.)
- **서명**: Supabase 프로젝트의 **JWT Secret**으로 **HS256** 서명합니다.

### 2.3 JWT Secret 위치

- **Supabase 대시보드** → **Project Settings** → **API** → **JWT Settings**
- **JWT Secret** 값 확인 (길은 문자열).
- Edge Function에서만 쓰려면 **Secrets**에 넣어 둡니다:
  - 터미널: `supabase secrets set JWT_SECRET=your_jwt_secret`
  - 또는 대시보드 **Project Settings** → **Edge Functions** → **Secrets**에서 `JWT_SECRET` 추가.

### 2.4 Edge Function에서 JWT 생성 예시 (Deno + jose)

- `jose`로 HS256 서명합니다.

```ts
import * as jose from 'npm:jose'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const JWT_SECRET = Deno.env.get('JWT_SECRET') ?? ''  // Supabase JWT Secret

async function createSupabaseJWT(lineUserId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 60 * 60 // 1시간

  const token = await new jose.SignJWT({
    role: 'authenticated',
  })
    .setSubject(lineUserId)
    .setIssuer(SUPABASE_URL + '/auth/v1')
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret)

  return token
}
```

- 클라이언트에는 `access_token`만 넘겨도 되고, refresh는 안 쓸 경우 `refresh_token`은 빈 문자열로 두고 `setSupabaseSession(access_token, '')` 호출하면 됩니다.

### 2.5 클라이언트에 반환

- Edge Function 응답 예:

```ts
return new Response(
  JSON.stringify({
    access_token: jwt,
    refresh_token: '',
    expires_in: 3600,
  }),
  {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200,
  }
)
```

- 앱에서는 이 `access_token`을 받아 `setSupabaseSession(access_token, '')` 호출하면 됩니다.

---

## 3. 전체 흐름 요약

1. 앱에서 LIFF 액세스 토큰 획득 → `line-auth`에 POST.
2. Edge Function: LINE 프로필 API로 토큰 검증 + `userId`, `displayName`, `pictureUrl` 획득.
3. Edge Function: `supabaseAdmin`(service_role)으로 `profiles` 조회 후 없으면 insert(또는 upsert).
4. Edge Function: `createSupabaseJWT(line_user_id)`로 JWT 생성 후 `access_token` 반환.
5. 앱: `setSupabaseSession(access_token, '')` 호출.
6. 이후 `getUserInfo()` 등에서 `getSupabase()`로 요청 시 JWT가 붙고, RLS에서 `auth.jwt()->>'sub' = line_user_id`로 본인 행만 접근 가능.

---

## 4. Edge Function `line-auth` 요청 형식

- **URL**: `https://<project-ref>.supabase.co/functions/v1/line-auth`
- **Method**: POST
- **Body (JSON)**: `{ "access_token": "<LIFF 액세스 토큰>" }` (또는 `liff_access_token` 키도 가능)
- **응답**: `{ "access_token": "<Supabase JWT>", "refresh_token": "", "expires_in": 3600 }`

실제 코드는 `supabase/functions/line-auth/index.ts`에 있습니다. 배포 후 Supabase **Edge Function Secrets**에 `JWT_SECRET`을 넣어야 합니다 (값은 Project Settings → API → JWT Settings → JWT Secret과 동일).

---

## 5. 참고

- Supabase 문서: [JSON Web Token (JWT)](https://supabase.com/docs/guides/auth/jwts), [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- 프로젝트가 **Signing Keys**(비대칭)만 쓰는 경우, 커스텀 JWT는 “JWT Signing Keys”에 등록한 키로 서명해야 할 수 있습니다. 이 문서는 기존 **JWT Secret(HS256)** 기준입니다.
