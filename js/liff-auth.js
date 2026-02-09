// ========================================
// LIFF 인증 모듈 (liff-auth.js)
// ========================================

const LIFF_CONFIG = {
    // TODO: LINE Developers Console에서 발급받은 LIFF ID 입력
    liffId: '2009089916-d5ymB1Rz',
};

// LIFF에서 가져온 유저 프로필 저장
let liffProfile = null;
let isLIFFInitialized = false;

// LIFF 초기화 및 로그인
async function initLIFF() {
    const loadingScreen = document.getElementById('liffLoadingScreen');
    const errorMsg = document.getElementById('liffErrorMsg');

    // LIFF ID 미설정 시 개발 모드
    if (!LIFF_CONFIG.liffId) {
        console.warn('[LIFF] LIFF ID 미설정 → 개발 모드로 실행');
        console.warn('[LIFF] LINE Developers Console에서 LIFF ID를 발급받아 LIFF_CONFIG.liffId에 입력하세요.');
        liffProfile = {
            userId: 'dev_user_' + Date.now(),
            displayName: '개발 테스터',
            pictureUrl: '',
            statusMessage: '개발 모드'
        };
        isLIFFInitialized = true;
        hideLiffLoading();
        await initApp();
        return;
    }

    try {
        await liff.init({
            liffId: LIFF_CONFIG.liffId,
            withLoginOnExternalBrowser: true
        });
        console.log('[LIFF] 초기화 성공');

        // 로그인 상태 확인
        if (!liff.isLoggedIn()) {
            console.log('[LIFF] 미로그인 → 로그인 페이지로 이동');
            liff.login();
            return; // 로그인 후 리다이렉트됨
        }

        // 프로필 가져오기
        liffProfile = await liff.getProfile();
        console.log('[LIFF] 프로필:', liffProfile.displayName);

        isLIFFInitialized = true;
        hideLiffLoading();
        await initApp();

    } catch (error) {
        console.error('[LIFF] 초기화 실패:', error);
        errorMsg.textContent = 'LINE 연결에 실패했습니다. 다시 시도해주세요.';
        errorMsg.style.display = 'block';

        // 3초 후 개발 모드로 폴백
        setTimeout(async () => {
            console.warn('[LIFF] 폴백 → 개발 모드로 실행');
            liffProfile = {
                userId: 'fallback_user',
                displayName: '게스트',
                pictureUrl: '',
                statusMessage: ''
            };
            isLIFFInitialized = true;
            hideLiffLoading();
            await initApp();
        }, 3000);
    }
}

// 로딩 화면 숨기기
function hideLiffLoading() {
    const loadingScreen = document.getElementById('liffLoadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 400);
}

// LIFF Access Token 가져오기 (API 호출용)
function getLIFFToken() {
    if (isLIFFInitialized && LIFF_CONFIG.liffId && typeof liff !== 'undefined' && liff.isLoggedIn()) {
        return liff.getAccessToken();
    }
    return null;
}

// LINE 환경 확인
function isInLINE() {
    return isLIFFInitialized && LIFF_CONFIG.liffId && typeof liff !== 'undefined' && liff.isInClient();
}
