# Vercel에 GitHub 저장소 임포트 및 옵션 설정

## 1. GitHub 임포트 절차

### 1) Vercel 로그인
- [vercel.com](https://vercel.com) 접속 후 로그인(또는 GitHub로 로그인).

### 2) 새 프로젝트에서 GitHub 연결
- 대시보드에서 **Add New… → Project** (또는 [vercel.com/new](https://vercel.com/new)) 이동.
- **Import Git Repository**에서 **GitHub** 선택.
- 처음이면 **Configure GitHub App**으로 이동해 Vercel이 저장소에 접근할 수 있도록 권한 부여.
  - **All repositories** 또는 **Only select repositories** 중 선택 후, 이 프로젝트 저장소를 선택.

### 3) 저장소 선택
- 목록에서 **Human-Experiment**(또는 사용 중인 저장소 이름) 선택.
- **Import** 클릭.

### 4) 프로젝트 설정 화면
- 다음 단계에서 **Project Name**, **Framework Preset**, **Root Directory**, **Build & Output** 등을 설정(아래 2번 참고).

### 5) 배포
- **Deploy** 클릭.
- 빌드가 끝나면 **Visit**로 배포 URL 확인.

---

## 2. 옵션 설정 방법

### Project Name
- 기본값: 저장소 이름. 원하면 변경 가능.
- 배포 URL: `https://<Project-Name>-xxx.vercel.app`

### Framework Preset
- **정적 HTML/JS 프로젝트**(지금처럼 `index.html` + `js/`, `css/`만 있는 경우):
  - **Other** 선택.
- Next.js, Create React App 등 쓰는 경우에는 해당 프리셋 선택.

### Root Directory
- 저장소 루트에서 배포할 때: **비워 두기** (기본값).
- monorepo처럼 서브폴더가 앱 루트일 때: 예) `apps/web` 입력.

### Build and Output Settings (정적 사이트 예시)

| 항목 | 권장 값 | 설명 |
|------|--------|------|
| **Build Command** | *(비움)* 또는 `echo "No build"` | 빌드 없이 정적 파일만 배포할 때는 비우거나 더미 명령 |
| **Output Directory** | `.` | 배포할 파일이 프로젝트 루트에 있으면 `.` |
| **Install Command** | *(비움)* | `package.json` 없으면 비움 |

- **Development Command**는 로컬 개발용이라 배포에는 영향 없음.

### Environment Variables (환경 변수)
- **Environment Variables** 섹션 펼치기.
- **Key**, **Value** 입력 후 **Add**.
- 필요한 경우(예: 나중에 API 키를 빌드 시 주입):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등 추가.
- **Environment**: Production / Preview / Development 중 적용할 환경 선택.

### 기타
- **Git**: 기본적으로 `main`(또는 기본 브랜치)에 푸시할 때마다 Production 배포.
- **Preview**: PR마다 별도 URL 생성 가능(설정에서 활성화 여부 확인).

---

## 3. 이 프로젝트(HumanExperiment) 권장 설정 요약

- **Framework Preset**: Other  
- **Root Directory**: *(비움)*  
- **Build Command**: *(비움)*  
- **Output Directory**: `.`  
- **Install Command**: *(비움)*  
- 환경 변수: 현재 `config.js`에 직접 넣고 있다면 필수는 아니고, 나중에 숨기고 싶을 때 Vercel 환경 변수로 옮기면 됨.

이렇게 설정하면 GitHub에 푸시할 때마다 자동으로 Vercel이 재배포합니다.
