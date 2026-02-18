# LINE 앱 / LIFF 테스트 환경에서 실제 로그인 해보는 방법

실제 LINE 로그인과 Supabase 세션 설정이 되는지 확인하는 절차입니다.

---

## 준비 (한 번만 확인)

1. **앱이 배포된 주소**가 있어야 합니다.  
   예: Vercel 배포 URL `https://human-experiment-xxx.vercel.app` (또는 본인 프로젝트 도메인)

2. **LINE Developers Console**에서 해당 LIFF 앱의 **Endpoint URL**이 위 주소와 **완전히 같게** 설정되어 있어야 합니다.  
   - [LINE Developers Console](https://developers.line.biz/console/) → Provider → Channel(LINE Login 채널) → **LIFF** 탭 → 사용하는 LIFF 앱 선택  
   - **Endpoint URL**이 `https://본인앱주소` 인지 확인. 다르면 **Edit**에서 수정 후 저장.

3. **Scope**에 **profile**이 포함되어 있어야 합니다. (프로필·토큰 사용용)

---

## 방법 1: LINE 앱에서 열기 (가장 실제와 비슷함)

LIFF는 **LIFF 전용 주소**로 열어야 LINE 앱 안 브라우저에서 뜹니다.

1. **LIFF URL** 확인  
   - LINE Developers Console → LIFF 탭 → 해당 LIFF 앱  
   - **LIFF URL**이 예시처럼 나옵니다: `https://liff.line.me/2009089916-d5ymB1Rz`  
   - (숫자-영문 부분은 본인 LIFF ID에 맞게 다름)

2. **LINE 앱에서 이 주소로 들어가기**  
   - **옵션 A**: 휴대폰 LINE에서 **나와의 대화**나 **다른 대화방**에 위 LIFF URL을 붙여 넣어 보냅니다.  
     → 메시지 속 링크를 **탭**하면 LINE 앱 안 브라우저에서 LIFF가 열립니다.  
   - **옵션 B**: PC에서 LINE 로그인 후, **나와의 대화**에 LIFF URL 전송 → 휴대폰 LINE에서 그 링크 탭.  
   - **옵션 C**: 공식 계정(봇)이 있으면, 봇이 LIFF URL을 보내주는 메뉴를 만들어 두고, 사용자가 그걸 눌러 들어오게 할 수 있습니다.

3. **처음 열면**  
   - LINE 로그인/동의 화면이 나올 수 있습니다.  
   - **동의** 후 앱 화면으로 넘어가면 로그인된 상태입니다.

4. **확인**  
   - 앱이 정상적으로 보이면, 같은 LIFF URL을 **다시 한 번** 열어 보세요.  
   - 이미 로그인돼 있으면 로그인 화면 없이 바로 앱만 뜹니다.

---

## 방법 2: PC 웹 브라우저(Chrome 등)에서 열기

이 프로젝트는 `withLoginOnExternalBrowser: true` 로 되어 있어서, **외부 브라우저**에서도 LINE 로그인 후 앱이 동작합니다.

1. **브라우저에서 LIFF URL 열기**  
   - 주소창에 **LIFF URL** 입력:  
     `https://liff.line.me/2009089916-d5ymB1Rz`  
     (본인 LIFF ID로 바꿔서 사용)

2. **리다이렉트**  
   - LINE 로그인 페이지로 넘어갔다가, 로그인/동의 후 다시 앱(Endpoint URL)으로 돌아옵니다.

3. **개발자 도구로 로그 확인**  
   - Chrome: **F12** → **Console** 탭  
   - 다음 메시지가 보이면 Supabase 세션까지 설정된 것입니다.  
     - `[LIFF] 프로필: (이름)`  
     - `[LIFF] Supabase 세션 설정 완료`

4. **Supabase에서 확인**  
   - Supabase 대시보드 → **Table Editor** → **profiles**  
   - 방금 로그인한 LINE 계정의 `line_user_id`, `display_name` 등이 한 행으로 보이면 성공입니다.

---

## 방법 3: Endpoint URL을 브라우저에서 직접 열기

**앱 주소(Endpoint URL)** 를 브라우저에 직접 넣어도 됩니다.

1. 주소창에 **배포된 앱 URL** 입력.  
   예: `https://human-experiment-xxx.vercel.app`

2. 앱이 로드되면서 LIFF가 초기화되고, **로그인되지 않은 상태**면 `liff.login()` 때문에 LINE 로그인 페이지로 리다이렉트됩니다.

3. 로그인/동의 후 다시 앱 URL로 돌아오면, 이후 동작은 **방법 2**와 같습니다.  
   - Console에서 `[LIFF] Supabase 세션 설정 완료` 확인  
   - Supabase **profiles** 테이블에 행 추가 여부 확인

---

## 테스트 시 확인할 것

| 확인 항목 | 어디서 보나 |
|-----------|-------------|
| LINE 로그인/동의 후 앱 화면이 뜨는지 | LINE 앱 또는 브라우저 |
| `[LIFF] 프로필: (이름)` 로그 | 브라우저 F12 → Console |
| `[LIFF] Supabase 세션 설정 완료` 로그 | 브라우저 F12 → Console |
| profiles에 새 행이 생겼는지 | Supabase 대시보드 → Table Editor → profiles |

---

## 자주 나오는 문제

- **Endpoint URL이 다름**  
  - LIFF가 열리지 않거나, 로그인 후 빈 화면·에러가 날 수 있습니다.  
  - LINE Developers Console에서 **Endpoint URL**을 배포된 앱 URL과 **완전히 동일**하게 맞춰 주세요.

- **CORS / line-auth 401**  
  - LINE 액세스 토큰이 없거나 만료됐을 수 있습니다.  
  - 한 번 **로그아웃**한 뒤(앱에 로그아웃 기능이 있으면 사용), 다시 LIFF URL을 열어 로그인부터 다시 해 보세요.

- **Supabase profiles에 안 보임**  
  - Edge Function **line-auth**가 배포돼 있는지, **Secrets**에 **JWT_SECRET**이 들어가 있는지 확인하세요.  
  - Console에 `[LIFF] line-auth 실패` 같은 로그가 있으면, 해당 응답 메시지를 확인해 보세요.

---

## 요약

- **LINE 앱에서 테스트**: LIFF URL(`https://liff.line.me/본인LIFF ID`)을 LINE 대화 등으로 보내서 링크를 탭해 열기.  
- **PC에서 테스트**: 같은 LIFF URL을 Chrome 등에서 열거나, 배포된 앱 URL을 직접 열어서 로그인 후 Console·Supabase profiles로 확인.

위 순서대로 하면 LINE 앱 또는 LIFF 테스트 환경에서 실제 로그인을 해 보실 수 있습니다.
