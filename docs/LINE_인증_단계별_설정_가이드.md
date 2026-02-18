# LINE → Supabase 인증: 단계별 설정 가이드

코드를 직접 보지 않아도, 메뉴 위치와 할 행동만 따라 하면 되도록 정리했습니다.

---

## 준비

- Supabase 프로젝트가 이미 만들어져 있고, **스키마(테이블)** 는 적용된 상태라고 가정합니다.
- **Edge Function** `line-auth` 코드는 프로젝트의 `supabase/functions/line-auth/index.ts`에 있다고 가정합니다. (없다면 개발자에게 해당 파일 추가를 요청하세요.)

---

## 1단계: Supabase에서 JWT Secret 확인하기

**목적**: 나중에 Edge Function에 넣을 비밀값을 복사해 둡니다.


1. 브라우저에서 **Supabase** 로그인 후, 사용 중인 **프로젝트**를 선택합니다.
2. 왼쪽 아래 **톱니바퀴 아이콘**을 클릭해 **Project Settings**로 들어갑니다.
3. 왼쪽 메뉴에서 **API**를 클릭합니다.
4. 아래로 내려 **JWT Settings** 섹션을 찾습니다.
5. **JWT Secret** 항목 옆에 있는 **긴 문자열**이 JWT Secret입니다.
   - **Reveal** 버튼이 있으면 눌러 표시한 뒤, 전체를 **복사**해 메모장 등에 잠시 붙여 넣어 둡니다.
   - 이 값은 **브라우저나 채팅에 붙여 넣지 말고**, 다음 단계에서 Supabase Secrets에만 입력합니다.

**정리**:  
메뉴 경로 = **Project Settings** → **API** → **JWT Settings** → **JWT Secret** 복사

---

## 2단계: Edge Function `line-auth` 배포하기

**목적**: LINE 토큰을 받아 프로필을 만들고 JWT를 돌려주는 함수를 Supabase에 올립니다.

### 방법 A: 대시보드에서 배포 (코드를 에디터에 붙여 넣기)

1. Supabase 프로젝트 대시보드에서 왼쪽 메뉴 **Edge Functions**를 클릭합니다.
2. **Create a new function** 또는 **Deploy a new function** 버튼을 클릭합니다.
3. **Via Editor** (에디터로 만들기)를 선택합니다.
4. **Function name**에 `line-auth`를 입력합니다.
5. 에디터가 열리면, 프로젝트의 `supabase/functions/line-auth/index.ts` 파일 **전체 내용**을 복사해 에디터에 붙여 넣습니다.  
   (파일을 열 수 없다면 개발자에게 “line-auth index.ts 전체 내용”을 요청하세요.)
6. **Deploy** / **Deploy function** 버튼을 눌러 배포합니다.
7. 배포가 끝날 때까지 기다립니다(보통 10~30초). 완료되면 해당 함수가 목록에 보입니다.

**정리**:  
메뉴 경로 = **Edge Functions** → **Create/Deploy new function** → **Via Editor** → 이름 `line-auth` → 코드 붙여 넣기 → **Deploy**

### 방법 B: 터미널(CLI)로 배포

1. 컴퓨터에 **Supabase CLI**가 설치되어 있고, 프로젝트 폴더에서 `supabase login`이 된 상태여야 합니다.
2. 터미널(또는 명령 프롬프트)을 열고, 프로젝트 루트 폴더로 이동합니다.
3. 아래 명령을 실행합니다.  
   `supabase functions deploy line-auth`
4. 배포가 끝나면 “Deployed function line-auth” 같은 메시지가 나옵니다.

**정리**:  
할 일 = 프로젝트 루트에서 `supabase functions deploy line-auth` 실행

---

## 3단계: Edge Function에 JWT Secret 넣기 (Secrets)

**목적**: 배포한 함수가 JWT를 만들 수 있도록, 1단계에서 복사한 JWT Secret을 함수 환경 변수로 등록합니다.

1. Supabase 대시보드에서 왼쪽 메뉴 **Edge Functions**를 클릭합니다.
2. **Secrets** 탭(또는 **Manage secrets** / **Secrets** 링크)을 엽니다.  
   (경로가 다를 수 있음: **Project Settings** → **Edge Functions** → **Secrets** 일 수 있습니다.)
3. **Add new secret** / **New secret** 같은 버튼을 클릭합니다.
4. **Name** (키 이름)에 `JWT_SECRET`을 **정확히** 입력합니다.
5. **Value** (값)에 1단계에서 복사한 **JWT Secret** 전체를 붙여 넣습니다.
6. **Save** / **Add**를 눌러 저장합니다.

**정리**:  
메뉴 경로 = **Edge Functions** → **Secrets** → **Add new secret** → Name: `JWT_SECRET`, Value: (복사한 JWT Secret) → **Save**

---

## 4단계: Edge Function URL 확인하기

**목적**: 앱에서 호출할 주소를 알아 둡니다.

1. Supabase 대시보드에서 **Edge Functions**로 이동합니다.
2. 목록에서 **line-auth**를 클릭합니다.
3. **Function URL** 또는 **Invoke URL**이 표시됩니다.  
   형태는 보통 다음과 같습니다.  
   `https://xxxxx.supabase.co/functions/v1/line-auth`  
https://iqkkbulxmjpjrbyuyjqp.supabase.co/functions/v1/line-auth
4. 이 URL을 복사해, 개발자에게 “이 URL로 POST 요청을 보내야 한다”고 전달하거나, 본인이 앱 설정에 넣을 위치에 기록해 둡니다.

**정리**:  
메뉴 경로 = **Edge Functions** → **line-auth** 선택 → **Function URL** 복사

---

## 5단계: 앱에서 할 일 (개발자에게 전달할 내용)

**목적**: LIFF 로그인 직후에 Supabase 세션을 붙이도록 요청할 수 있게 정리한 내용입니다. 코드를 못 보는 사람은 아래 문장을 그대로 개발자에게 전달하면 됩니다.

---

### 코드 모르는 사람을 위한 설명 (일상 말로)

**지금 하려는 일이 뭐냐면**

1. **유저가 LINE으로 로그인한 직후**  
   앱은 “이 사람은 LINE에서 인증된 사용자다”라고 증명하는 **증명서 하나**를 LINE에서 받습니다. 이걸 **LIFF 액세스 토큰**이라고 부릅니다. (쉽게 말해 “LINE이 준 일회용 증명서”라고 생각하면 됩니다.)

2. **그 증명서를 우리 서버에 보냅니다**  
   Supabase에 만들어 둔 **line-auth**라는 기능이 “LINE 증명서를 받는 창구”입니다. 앱은 **LINE 로그인이 끝나고 프로필(이름, 사진 등)을 받은 직후**, 방금 받은 **LIFF 액세스 토큰**을 이 **line-auth**에 보냅니다.

3. **서버(line-auth)가 할 일**  
   LINE 쪽에 “이 증명서가 진짜 맞는지” 확인하고, 이 사용자를 우리 DB(profiles)에 없으면 한 번 만들어 두고, **우리 DB용 새 증명서(Supabase JWT)** 를 만들어서 앱에 돌려줍니다.

4. **앱이 할 일**  
   서버가 돌려준 **새 증명서(access_token)** 를 **Supabase에 등록**합니다. 이걸 “Supabase 세션 설정”이라고 부릅니다. 이렇게 해 두면, 앞으로 앱이 DB를 볼 때마다 “이 사용자다”라고 인식해서, 본인 프로필·본인 데이터만 보이게 됩니다.

**정리하면**  
- **시점**: LINE 로그인 끝나고, 프로필 받은 **바로 다음**에 한 번만 실행.  
- **순서**: (1) LINE이 준 증명서(LIFF 토큰) 받기 → (2) line-auth에 그 증명서 보내기 → (3) 서버가 돌려준 새 증명서(access_token)로 Supabase 세션 설정하기.

**개발자에게 전달할 한 문장**  
“LINE 로그인이 끝난 직후(프로필까지 받은 다음)에, LIFF 액세스 토큰으로 line-auth를 호출하고, 응답으로 받은 access_token으로 Supabase 세션 설정해 주세요.”

---

- **할 일 요약**  
  “LIFF 로그인이 끝난 직후(프로필을 가져온 다음)에, LIFF 액세스 토큰을 이용해 `line-auth` Edge Function을 호출하고, 받은 `access_token`으로 Supabase 세션을 설정해 주세요.”

- **구체적으로**  
  1. LIFF 초기화 후 로그인된 상태에서 `liff.getAccessToken()`으로 액세스 토큰을 가져옵니다.  
  2. 4단계에서 확인한 **line-auth URL**로 **POST** 요청을 보냅니다.  
     - Body(JSON): `{ "access_token": "여기에 LIFF 액세스 토큰" }`  
  3. 응답 JSON에서 `access_token` 값을 꺼냅니다. (이게 Supabase용 JWT입니다.)  
  4. 이미 로드된 `setSupabaseSession(access_token, '')` 함수를 호출합니다.  
     - 예: `setSupabaseSession(응답.access_token, '')`  
  5. 이 호출은 **LIFF 프로필을 받은 직후, 한 번만** 실행되면 됩니다. (예: `liff-auth.js`의 `initLIFF` 안, `liffProfile = await liff.getProfile()` 다음)

- **설정할 값**  
  - Edge Function URL: (4단계에서 복사한 `https://xxxxx.supabase.co/functions/v1/line-auth`)  
  - `config.js`의 `USE_SUPABASE`가 `true`인지 확인합니다.

---

## 6단계: LINE LIFF 설정 확인 (선택)

**목적**: 앱이 LINE 안에서 열릴 때 올바른 주소로 열리도록 합니다.

1. **LINE Developers Console** (https://developers.line.biz/console/) 에 로그인합니다.
2. **Provider** → 사용 중인 **Channel**(LIFF를 쓰는 채널)을 선택합니다.
3. **LIFF** 탭을 클릭합니다.
4. 사용 중인 LIFF 앱을 선택한 뒤, **Endpoint URL**이 실제 앱 주소(예: Vercel 배포 URL)인지 확인합니다.  
   다르면 **Edit**에서 **Endpoint URL**을 수정해 저장합니다.

**정리**:  
메뉴 경로 = **LINE Developers Console** → **Provider** → **Channel** → **LIFF** 탭 → 해당 LIFF → **Endpoint URL** 확인/수정

---

## 체크리스트 (코드 못 보는 사람용)

- [ ] **1단계**: Supabase **Project Settings** → **API** → **JWT Settings**에서 **JWT Secret** 복사
- [ ] **2단계**: **Edge Functions**에서 `line-auth` 함수 생성/배포 (에디터에 코드 붙여 넣기 또는 CLI 배포)
- [ ] **3단계**: **Edge Functions** → **Secrets**에서 Name `JWT_SECRET`, Value에 복사한 JWT Secret 저장
- [ ] **4단계**: **line-auth**의 **Function URL** 복사해 개발자에게 전달 또는 기록
- [ ] **5단계**: 개발자에게 “LIFF 로그인 직후 line-auth 호출 → setSupabaseSession 호출” 요청 (위 5단계 문장 전달)
- [ ] **6단계**(선택): LINE Developers에서 LIFF **Endpoint URL**이 앱 주소와 같은지 확인

---

## 문제가 생겼을 때

- **401 / Invalid or expired LINE access token**  
  - LIFF 액세스 토큰이 만료됐거나 잘못됐을 수 있습니다. LIFF 로그인을 다시 시도하거나, LINE Developers에서 LIFF 앱 설정(Scope 등)을 확인하세요.
- **500 / Server configuration error**  
  - 3단계에서 **JWT_SECRET**을 Secrets에 넣었는지, 이름이 정확히 `JWT_SECRET`인지 확인하세요.
- **프로필이 Supabase에 안 보임**  
  - 5단계가 적용됐는지 확인하세요. 로그인 직후 `line-auth` 호출과 `setSupabaseSession`이 한 번이라도 호출되어야, 이후 앱에서 Supabase로 프로필 조회가 됩니다.

이 가이드만 따라 하면, 코드를 직접 보지 않아도 LINE → Supabase 인증을 위한 설정을 끝낼 수 있습니다.
