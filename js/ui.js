// ========================================
// UI 모듈 (ui.js)
// ========================================

// ========================================
// 배너 슬라이더
// ========================================

let currentBannerIndex = 0;
let bannerInterval;
let touchStartX = 0;
let touchEndX = 0;
let touchStartTime = 0;
let isDragging = false;
const SWIPE_THRESHOLD = 80; // 80px 이상 이동 시 스와이프
const SWIPE_TIME_THRESHOLD = 300; // 300ms 이내 빠른 스와이프

function initBannerSlider() {
    const track = document.getElementById('bannerTrack');
    const slider = document.querySelector('.top-banner-slider');

    if (!track || !slider) {
        console.error('배너 슬라이더 엘리먼트를 찾을 수 없습니다');
        return;
    }

    // 터치 이벤트
    slider.addEventListener('touchstart', handleTouchStart, { passive: true });
    slider.addEventListener('touchmove', handleTouchMove, { passive: false });
    slider.addEventListener('touchend', handleTouchEnd);

    // 마우스 이벤트 (데스크톱)
    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mousemove', handleMouseMove);
    slider.addEventListener('mouseup', handleMouseEnd);
    slider.addEventListener('mouseleave', handleMouseEnd);

    startBannerAutoSlide();
}

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isDragging = true;
    document.getElementById('bannerTrack').classList.add('dragging');
    clearInterval(bannerInterval);
}

function handleTouchMove(e) {
    if (!isDragging) return;
    touchEndX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    document.getElementById('bannerTrack').classList.remove('dragging');

    const diff = touchStartX - touchEndX;
    const touchDuration = Date.now() - touchStartTime;
    const distance = Math.abs(diff);

    // 스와이프 판단 기준:
    // 1. 80px 이상 이동
    // 2. 또는 300ms 이내 빠른 스와이프 (30px 이상)
    const isSwipe = distance > SWIPE_THRESHOLD ||
                   (distance > 30 && touchDuration < SWIPE_TIME_THRESHOLD);

    if (isSwipe) {
        // 스와이프
        if (diff > 0) {
            currentBannerIndex = (currentBannerIndex + 1) % 5;
        } else {
            currentBannerIndex = (currentBannerIndex - 1 + 5) % 5;
        }
        updateBannerPosition();
    } else {
        // 클릭 (작은 이동 또는 긴 터치)
        handleBannerClick();
    }

    startBannerAutoSlide();
}

function handleMouseDown(e) {
    touchStartX = e.clientX;
    touchStartTime = Date.now();
    isDragging = true;
    document.getElementById('bannerTrack').classList.add('dragging');
    clearInterval(bannerInterval);
}

function handleMouseMove(e) {
    if (!isDragging) return;
    touchEndX = e.clientX;
}

function handleMouseEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    document.getElementById('bannerTrack').classList.remove('dragging');

    const diff = touchStartX - touchEndX;
    const touchDuration = Date.now() - touchStartTime;
    const distance = Math.abs(diff);

    // 스와이프 판단 기준:
    // 1. 80px 이상 이동
    // 2. 또는 300ms 이내 빠른 스와이프 (30px 이상)
    const isSwipe = distance > SWIPE_THRESHOLD ||
                   (distance > 30 && touchDuration < SWIPE_TIME_THRESHOLD);

    if (isSwipe) {
        // 스와이프
        if (diff > 0) {
            currentBannerIndex = (currentBannerIndex + 1) % 5;
        } else {
            currentBannerIndex = (currentBannerIndex - 1 + 5) % 5;
        }
        updateBannerPosition();
    } else {
        // 클릭 (작은 이동 또는 긴 터치)
        handleBannerClick();
    }

    startBannerAutoSlide();
}

function handleBannerClick() {
    // 현재 배너의 링크로 이동
    const bannerLinks = [
        'https://www.naver.com',
        'https://www.naver.com',
        'https://www.naver.com',
        'https://www.naver.com',
        'https://www.naver.com'
    ];

    const link = bannerLinks[currentBannerIndex];
    if (link.startsWith('#')) {
        // 내부 링크
        const screen = link.substring(1);
        switchScreen(screen);
    } else {
        // 외부 링크
        window.open(link, '_blank');
    }
}

function startBannerAutoSlide() {
    clearInterval(bannerInterval);
    bannerInterval = setInterval(() => {
        currentBannerIndex = (currentBannerIndex + 1) % 5;
        updateBannerPosition();
    }, 5000); // 5초마다 자동 슬라이드
}

function goToBanner(index) {
    currentBannerIndex = index;
    updateBannerPosition();
    // 자동 슬라이드 재시작
    startBannerAutoSlide();
}

function updateBannerPosition() {
    const track = document.getElementById('bannerTrack');
    const dots = document.querySelectorAll('.banner-dot');

    if (!track) {
        console.error('bannerTrack을 찾을 수 없습니다');
        return;
    }

    track.style.transform = `translateX(-${currentBannerIndex * 100}%)`;

    dots.forEach((dot, index) => {
        if (index === currentBannerIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function navigateBanner(url) {
    if (url.startsWith('#')) {
        // 내부 링크
        const screen = url.substring(1);
        switchScreen(screen);
    } else {
        // 외부 링크
        window.open(url, '_blank');
    }
}

// ========================================
// 카운트다운 타이머
// ========================================

function startCountdowns() {
    // 임시: 2시간 50분 카운트다운 (실제로는 서버에서 종료 시간을 받아와야 함)
    // 서버 응답 예시: { endTime: '2026-02-07T15:30:00Z' }

    const countdowns = {
        'weddingCountdown': 2 * 60 * 60 + 50 * 60, // 2시간 50분 (10200초)
        'blindDateCountdown': 2 * 60 * 60 + 50 * 60,
        'bbqCountdown': 2 * 60 * 60 + 50 * 60
    };

    Object.keys(countdowns).forEach(id => {
        let timeLeft = countdowns[id];

        const updateTimer = () => {
            if (timeLeft <= 0) {
                document.getElementById(id).textContent = '종료됨';
                return;
            }

            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;

            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            document.getElementById(id).textContent = timeString;

            timeLeft--;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    });
}

// ========================================
// 유저 정보 업데이트
// ========================================

function updateUserStats(data) {
    console.log('유저 스탯 업데이트:', data);
    if (data.coins !== undefined) {
        document.getElementById('coinCount').textContent = data.coins;
    }
    if (data.rewardPoints !== undefined) {
        document.getElementById('rewardPoints').textContent = data.rewardPoints;
    }
    if (data.tickets !== undefined) {
        document.getElementById('ticketCount').textContent = data.tickets;
    }
}

// 프로필 페이지 업데이트
function updateProfilePage(data) {
    const pageImg = document.getElementById('profilePageImg');
    const pageName = document.getElementById('profilePageName');
    const pageStatus = document.getElementById('profilePageStatus');
    const pageUserId = document.getElementById('profilePageUserId');
    const pageCoins = document.getElementById('profilePageCoins');
    const pagePoints = document.getElementById('profilePagePoints');
    const pageTickets = document.getElementById('profilePageTickets');

    if (data.pictureUrl) {
        pageImg.src = data.pictureUrl;
        pageImg.style.display = 'block';
    }
    pageName.textContent = data.displayName || data.characterName || '';
    pageStatus.textContent = data.statusMessage || '';
    pageUserId.textContent = data.userId ? data.userId.substring(0, 10) + '...' : '-';
    pageCoins.textContent = data.coins !== undefined ? data.coins.toLocaleString() : '-';
    pagePoints.textContent = data.rewardPoints !== undefined ? data.rewardPoints.toLocaleString() : '-';
    pageTickets.textContent = data.tickets !== undefined ? data.tickets : '-';
}

// ========================================
// 화면 전환
// ========================================

function switchScreen(screenName) {
    // 모든 네비게이션 아이템 비활성화
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 모든 화면 숨기기
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('shopScreen').classList.remove('active');
    document.getElementById('rankingScreen').classList.remove('active');
    document.getElementById('profileScreen').classList.remove('active');
    document.getElementById('settingsScreen').classList.remove('active');

    // 선택된 화면 표시
    const screenMap = {
        'shop': 'shopScreen',
        'ranking': 'rankingScreen',
        'home': 'homeScreen',
        'profile': 'profileScreen',
        'settings': 'settingsScreen'
    };

    const targetScreen = screenMap[screenName];
    if (targetScreen) {
        document.getElementById(targetScreen).classList.add('active');
    }

    // 네비게이션 활성화 (이벤트 타겟 찾기)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${screenName}'`)) {
            item.classList.add('active');
        }
    });

    // 홈 화면일 때는 하단 메뉴 보이기
    const bottomNav = document.querySelector('.bottom-nav');
    if (screenName === 'home') {
        bottomNav.classList.remove('hidden');
    }
}

// ========================================
// 공유 기능
// ========================================

function shareResult() {
    // 현재 결과 데이터 가져오기
    const isWinner = document.getElementById('winnerContent').style.display !== 'none';

    let shareText = '';
    const gameUrl = window.location.href;

    if (isWinner) {
        const rewardAmount = document.getElementById('rewardAmount').textContent;
        const correctAnswers = document.getElementById('correctAnswers').textContent;
        const totalWinners = document.getElementById('totalWinners').textContent;

        shareText = `🏆 대중적 인간 게임 결과 🏆

✅ 당신은 대중적 인간입니다!
전 세계 사람들의 판단 흐름을 끝까지 읽었습니다.

💰 획득 상금: ${rewardAmount}
📊 정답률: ${correctAnswers}
👥 총 승자: ${totalWinners}명 중 한 명

시나리오: ${currentScenario.name}

나도 도전해보기 👇
${gameUrl}`;
    } else {
        const correctAnswers = document.getElementById('correctAnswersLose').textContent;

        shareText = `🧠 대중적 인간 게임 결과

당신은 대중과 다른 선택을 했습니다.
하지만, 대부분의 사람도 이 지점에서 갈렸습니다!

📊 정답률: ${correctAnswers}
시나리오: ${currentScenario.name}

다시 도전해보세요 👇
${gameUrl}`;
    }

    document.getElementById('shareText').textContent = shareText;
    document.getElementById('sharePopup').classList.add('active');
}

function closeSharePopup() {
    document.getElementById('sharePopup').classList.remove('active');
}

async function copyShareText() {
    const shareText = document.getElementById('shareText').textContent;

    try {
        await navigator.clipboard.writeText(shareText);
        alert('✅ 복사되었습니다!\n원하는 곳에 붙여넣기 하세요.');
        closeSharePopup();
    } catch (error) {
        // 폴백: 구식 방법
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            alert('✅ 복사되었습니다!\n원하는 곳에 붙여넣기 하세요.');
            closeSharePopup();
        } catch (err) {
            alert('❌ 복사에 실패했습니다.\n수동으로 복사해주세요.');
        }

        document.body.removeChild(textarea);
    }
}

function shareEvent() {
    const shareText = `🎮 대중적 인간 - 트렌드 예측 게임

"사람들은 당신과 같은 선택을 할까요?"

지금 참여 중: 128,492명
💰 상금 풀: 1,000 USDT

나도 참여하기 👇
${window.location.href}`;

    document.getElementById('shareText').textContent = shareText;
    document.getElementById('sharePopup').classList.add('active');
}

// ========================================
// 토글 기능
// ========================================

// 내 선택 보기 토글
function toggleMyChoices(type) {
    const contentId = type === 'win' ? 'myChoicesContentWin' : 'myChoicesContentLose';
    const arrowId = type === 'win' ? 'dropdownArrowWin' : 'dropdownArrowLose';

    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.classList.add('open');
    } else {
        content.style.display = 'none';
        arrow.classList.remove('open');
    }
}

// 트렌드 보드 드롭다운 토글
function toggleTrendDropdown(scenarioId) {
    const contentId = 'trendContent' + scenarioId.charAt(0).toUpperCase() + scenarioId.slice(1);
    const arrowId = 'trendArrow' + scenarioId.charAt(0).toUpperCase() + scenarioId.slice(1);

    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);

    if (!content || !arrow) {
        console.error('트렌드 드롭다운 요소를 찾을 수 없습니다:', contentId, arrowId);
        return;
    }

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.classList.add('open');
    } else {
        content.style.display = 'none';
        arrow.classList.remove('open');
    }
}

// ========================================
// 토스트 메시지
// ========================================

function showToast(message) {
    // 간단한 토스트 메시지 (alert 대신)
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        document.body.removeChild(toast);
    }, 2000);
}

// ========================================
// 준비중 시나리오 카운트다운
// ========================================

function startUpcomingCountdowns() {
    const countdowns = {
        'upcomingCountdown1': 12 * 60 * 60 + 30 * 60, // 12시간 30분
        'upcomingCountdown2': 18 * 60 * 60 + 45 * 60  // 18시간 45분
    };

    Object.keys(countdowns).forEach(id => {
        let timeLeft = countdowns[id];

        const updateTimer = () => {
            if (timeLeft <= 0) {
                const element = document.getElementById(id);
                element.textContent = '🎉 곧 시작';
                element.style.background = 'rgba(76, 175, 80, 0.9)';
                element.style.color = '#fff';
                element.style.fontWeight = '700';
                element.style.animation = 'pulse 2s ease-in-out infinite';
                return;
            }

            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;

            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            document.getElementById(id).textContent = timeString;

            // 1시간 미만일 때 강조
            if (timeLeft < 3600) {
                const element = document.getElementById(id);
                element.style.background = 'rgba(255, 152, 0, 0.9)';
                element.style.color = '#fff';
            }

            timeLeft--;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    });
}

// ========================================
// 설정 화면
// ========================================

// 설정값 로컬 저장/불러오기
function getSettings() {
    const defaults = {
        eventNotification: true,
        resultNotification: true,
        soundEffect: true
    };
    try {
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
        return defaults;
    }
}

function saveSettings(settings) {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

// 토글 설정 변경
function toggleSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
    console.log(`[설정] ${key}: ${value}`);
}

// 설정 화면 프로필 업데이트
function updateSettingsProfile() {
    if (!liffProfile) return;

    const img = document.getElementById('settingsProfileImg');
    const name = document.getElementById('settingsProfileName');
    const status = document.getElementById('settingsProfileStatus');

    if (liffProfile.pictureUrl) {
        img.src = liffProfile.pictureUrl;
        img.style.display = 'block';
    }
    name.textContent = liffProfile.displayName || '게스트';
    status.textContent = LIFF_CONFIG.liffId ? 'LINE 계정 연동됨' : '개발 모드';
}

// 설정 화면 토글 초기화
function initSettingsToggles() {
    const settings = getSettings();
    const toggleEvent = document.getElementById('toggleEventNotif');
    const toggleResult = document.getElementById('toggleResultNotif');
    const toggleSound = document.getElementById('toggleSound');

    if (toggleEvent) toggleEvent.checked = settings.eventNotification;
    if (toggleResult) toggleResult.checked = settings.resultNotification;
    if (toggleSound) toggleSound.checked = settings.soundEffect;
}

// 게임 전적 초기화
function resetGameData() {
    if (confirm('정말로 게임 전적을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        // TODO: 백엔드 연동 시 서버 데이터 삭제 API 호출
        showToast('게임 전적이 초기화되었습니다');
        console.log('[설정] 게임 전적 초기화');
    }
}

// 로그아웃
function logoutLIFF() {
    if (confirm('로그아웃 하시겠습니까?')) {
        if (LIFF_CONFIG.liffId && typeof liff !== 'undefined' && liff.isLoggedIn()) {
            liff.logout();
            window.location.reload();
        } else {
            showToast('개발 모드에서는 로그아웃할 수 없습니다');
        }
    }
}

// 이용약관
function openTerms() {
    // TODO: 실제 약관 URL로 변경
    showToast('이용약관 페이지 준비 중입니다');
}

// 개인정보처리방침
function openPrivacy() {
    // TODO: 실제 개인정보처리방침 URL로 변경
    showToast('개인정보처리방침 페이지 준비 중입니다');
}

// 문의하기
function openInquiry() {
    // TODO: 실제 문의 채널로 변경 (카카오톡 채널, 이메일 등)
    showToast('문의 채널 준비 중입니다');
}
