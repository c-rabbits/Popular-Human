// ========================================
// LIFF 인증 모듈 (liff-auth.js)
// ========================================

const LIFF_CONFIG = {
    // TODO: LINE Developers Console에서 발급받은 LIFF ID 입력
    liffId: '2009089916-d5ymB1Rz',
    // 문의하기: LINE 공식 계정 ID (LINE Developers / 공식계정 관리자센터에서 확인, 예: 'abc123')
    lineOfficialAccountId: '811vdwss',
};

// 스플래시 최소 표시 시간 (ms) — 1초 미만이면 남은 시간만큼 대기 후 숨김
const SPLASH_MIN_MS = 1000;
const splashShownAt = Date.now();

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

        // Supabase 사용 시: LIFF 토큰으로 line-auth 호출 → JWT 받아 세션 설정
        if (typeof CONFIG !== 'undefined' && CONFIG.USE_SUPABASE && typeof setSupabaseSession === 'function') {
            const liffToken = liff.getAccessToken();
            const lineAuthUrl = (typeof CONFIG.LINE_AUTH_URL === 'string' && CONFIG.LINE_AUTH_URL) ? CONFIG.LINE_AUTH_URL : (CONFIG.SUPABASE_URL ? (CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/line-auth') : '');
            if (!liffToken) {
                console.warn('[LIFF] Supabase 연동 스킵: LIFF 액세스 토큰 없음 (Scope profile 필요)');
            } else if (!lineAuthUrl) {
                console.warn('[LIFF] Supabase 연동 스킵: LINE_AUTH_URL 또는 SUPABASE_URL 없음');
            } else {
                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (typeof CONFIG.SUPABASE_ANON_KEY === 'string' && CONFIG.SUPABASE_ANON_KEY) {
                        headers['Authorization'] = 'Bearer ' + CONFIG.SUPABASE_ANON_KEY;
                    }
                    const res = await fetch(lineAuthUrl, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ access_token: liffToken })
                    });
                    const data = res.ok ? await res.json() : null;
                    if (data && data.access_token) {
                        await setSupabaseSession(data.access_token, data.refresh_token || '');
                        console.log('[LIFF] Supabase 세션 설정 완료');
                    } else if (!res.ok) {
                        const errText = await res.text();
                        console.warn('[LIFF] line-auth 실패', res.status, errText);
                    }
                } catch (e) {
                    console.warn('[LIFF] line-auth 호출 오류', e);
                }
            }
        }

        // LIFF 초기화 완료 후 → Kaia SDK 초기화
        await initKaiaSDK();

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

// 로딩 화면 숨기기 (최소 SPLASH_MIN_MS 경과 후 숨김)
function hideLiffLoading() {
    const elapsed = Date.now() - splashShownAt;
    const delay = Math.max(0, SPLASH_MIN_MS - elapsed);

    const doHide = () => {
        const loadingScreen = document.getElementById('liffLoadingScreen');
        if (!loadingScreen) return;
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 400);
    };

    if (delay > 0) setTimeout(doHide, delay);
    else doHide();
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
