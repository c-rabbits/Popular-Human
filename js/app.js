// ========================================
// 앱 초기화 (app.js)
// ========================================

let currentScenario = null;
let currentQuestion = 0;
let userAnswers = [];
let correctCount = 0;
let currentGameId = null;
let gameTimeLeft = 600; // 10분 (초 단위)
let gameTimerInterval = null;
let attemptCount = 0; // 도전 횟수 추적

// ========================================
// 초기화
// ========================================

async function initApp() {
    console.log('앱 초기화 시작...');

    // LIFF 프로필을 상단 헤더에 반영
    if (liffProfile) {
        const profileImg = document.getElementById('userProfileImg');
        const profileName = document.getElementById('userProfileName');

        if (liffProfile.pictureUrl) {
            profileImg.src = liffProfile.pictureUrl;
            profileImg.style.display = 'block';
        } else {
            profileImg.style.display = 'none';
        }
        profileName.textContent = liffProfile.displayName || '';
    }

    // 유저 정보 로드
    const userInfo = await API.getUserInfo();
    console.log('유저 정보:', userInfo);
    if (userInfo) {
        updateUserStats(userInfo);
        updateWalletPage(userInfo);
    }

    // 카운트다운 시작
    startCountdowns();

    // 배너 슬라이더 초기화
    initBannerSlider();

    // 광고 버튼 초기화
    initAdButtons();

    // 준비중 시나리오 카운트다운 시작
    startUpcomingCountdowns();

    // 설정 화면 초기화
    initSettingsToggles();

    // 친구 초대 현황 업데이트
    updateInviteStats();
}

// ========================================
// 페이지 로드 시 앱 초기화 실행
// ========================================

// 우클릭 메뉴 방지 (PC/모바일 모두)
document.addEventListener('contextmenu', e => e.preventDefault());

// 드래그 방지 (이미지 드래그 등)
document.addEventListener('dragstart', e => e.preventDefault());

// DOMContentLoaded 이벤트로 초기화 (LIFF → initApp 체인)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLIFF);
} else {
    // 이미 로드된 경우 바로 실행
    initLIFF();
}
