# 인간실험 관리자 페이지

이벤트·회원·배너·설정을 관리하는 웹페이지입니다.  
현재는 **목업 데이터(localStorage)** 로 동작하며, 서버 연동 시 `admin/js/admin.js`의 API 호출을 실제 `fetch`로 바꾸면 됩니다.

## 실행 방법

1. **로컬에서 열기**  
   `admin/index.html`을 브라우저에서 직접 열거나,  
   프로젝트 루트에서 로컬 서버 실행 후 `http://localhost:포트/admin/` 접속  
   (예: `npx serve .` → `http://localhost:3000/admin/`)

2. **로그인**  
   - 비밀번호: `admin123` (프로토타입용, `admin/js/admin.js` 상단 `ADMIN_PASSWORD`에서 변경 가능)  
   - 서버 연동 시 로그인 API로 교체 권장

## 메뉴별 기능

- **이벤트 관리**: 이벤트 목록(상태·시나리오 필터), 이벤트 추가/수정(이벤트명·시나리오·배너 이미지 URL·일시·리워드·제한시간·티켓·문제 수·상태), 삭제
- **회원 관리**: 회원 목록(닉네임/회원 ID 검색), 캐시·티켓·리워드 포인트·가입일 표시 (현재 목업 데이터)
- **배너 관리**: 배너 목록, 배너 추가/수정(이미지 URL, 링크 유형: 내부/외부/없음, 링크 URL, 노출 순서), 삭제 (localStorage 저장)
- **설정**: 푸시 알림 허용 시간대 기본값, 이용약관 내용 편집, 개인정보처리방침 내용 편집 (localStorage 저장)

## 서버 연동 시 수정할 부분

`admin/js/admin.js`의 **AdminAPI** 객체 안 메서드에서 주석 처리된 `fetch` 예시를 활성화하고, 목업 함수(`getMockEvents`, `addMockEvent` 등) 호출을 제거하면 됩니다.

- `GET  /admin/events` – 목록
- `GET  /admin/events/:id` – 상세
- `POST /admin/events` – 생성
- `PUT  /admin/events/:id` – 수정
- `DELETE /admin/events/:id` – 삭제

요청 시 `credentials: 'include'`로 세션 쿠키를 보내면, 백엔드에서 관리자 인증을 처리할 수 있습니다.
