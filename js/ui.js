// ========================================
// UI 모듈 (ui.js)
// ========================================

// ========================================
// 배너 슬라이더
// ========================================

let currentBannerIndex = 0;    // 실제 배너 인덱스 (0 ~ bannerCount-1)
let bannerVisualIndex = 0;     // 트랙 상의 시각적 인덱스 (클론 포함)
let bannerCount = 0;           // 실제 배너 개수
let bannerInterval;
let touchStartX = 0;
let touchEndX = 0;
let touchStartTime = 0;
let isDragging = false;
const SWIPE_THRESHOLD = 100; // 100px 이상 이동 시 스와이프
const SWIPE_TIME_THRESHOLD = 600; // 600ms 이내 제스처만 스와이프 처리

function initBannerSlider() {
    const track = document.getElementById('bannerTrack');
    const slider = document.querySelector('.top-banner-slider');

    if (!track || !slider) {
        console.error('배너 슬라이더 엘리먼트를 찾을 수 없습니다');
        return;
    }

    // 실제 배너 슬라이드 목록
    const slides = track.querySelectorAll('.banner-slide');
    bannerCount = slides.length;

    if (bannerCount === 0) {
        console.error('배너 슬라이드가 없습니다');
        return;
    }

    // 무한 루프용 클론 슬라이드 추가 (앞/뒤에 한 장씩)
    const firstClone = slides[0].cloneNode(true);
    const lastClone = slides[slides.length - 1].cloneNode(true);
    firstClone.classList.add('banner-clone');
    lastClone.classList.add('banner-clone');

    track.appendChild(firstClone);            // 맨 뒤에 첫 번째 슬라이드 클론
    track.insertBefore(lastClone, slides[0]); // 맨 앞에 마지막 슬라이드 클론

    // 초기 위치: 첫 번째 실제 배너(시각적 인덱스 1)
    currentBannerIndex = 0;
    bannerVisualIndex = 1;
    track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;

    // 루프용 transition 종료 처리 (transform만 처리해 중복 방지)
    track.addEventListener('transitionend', handleBannerTransitionEnd);

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
    touchEndX = touchStartX; // 초기값을 시작 위치로 설정 (탭을 스와이프로 오인하지 않도록)
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

    // 스와이프 판단 기준 (감도 완화):
    // 일정 거리 이상(SWIPE_THRESHOLD) + 비교적 짧은 시간 안에 이동한 경우만 스와이프로 처리
    const isSwipe = distance >= SWIPE_THRESHOLD && touchDuration < SWIPE_TIME_THRESHOLD;

    if (isSwipe) {
        // 스와이프
        if (diff > 0) {
            // 왼쪽으로 스와이프 → 다음 배너
            currentBannerIndex = (currentBannerIndex + 1) % bannerCount;
            bannerVisualIndex += 1;
        } else {
            // 오른쪽으로 스와이프 → 이전 배너
            currentBannerIndex = (currentBannerIndex - 1 + bannerCount) % bannerCount;
            bannerVisualIndex -= 1;
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
    touchEndX = touchStartX; // 마우스도 동일하게 초기값 설정
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

    // 스와이프 판단 기준 (감도 완화):
    // 일정 거리 이상(SWIPE_THRESHOLD) + 비교적 짧은 시간 안에 이동한 경우만 스와이프로 처리
    const isSwipe = distance >= SWIPE_THRESHOLD && touchDuration < SWIPE_TIME_THRESHOLD;

    if (isSwipe) {
        // 스와이프
        if (diff > 0) {
            // 왼쪽으로 스와이프 → 다음 배너
            currentBannerIndex = (currentBannerIndex + 1) % bannerCount;
            bannerVisualIndex += 1;
        } else {
            // 오른쪽으로 스와이프 → 이전 배너
            currentBannerIndex = (currentBannerIndex - 1 + bannerCount) % bannerCount;
            bannerVisualIndex -= 1;
        }
        updateBannerPosition();
    } else {
        // 클릭 (작은 이동 또는 긴 터치)
        handleBannerClick();
    }

    startBannerAutoSlide();
}

function handleBannerClick() {
    // 현재 배너 인덱스에 따라 동작
    // 0번 배너: 지갑 → 친구초대 이벤트 섹션으로 이동
    if (currentBannerIndex === 0) {
        onInviteBannerClick();
        return;
    }

    // 나머지 배너는 추후 외부 링크 등으로 확장 가능
}

function startBannerAutoSlide() {
    clearInterval(bannerInterval);
    bannerInterval = setInterval(() => {
        // 자동으로 다음 배너로 이동 (무한 루프)
        currentBannerIndex = (currentBannerIndex + 1) % bannerCount;
        bannerVisualIndex += 1;
        updateBannerPosition();
    }, 5000); // 5초마다 자동 슬라이드
}

function goToBanner(index) {
    // 점(인디케이터) 클릭 시 해당 배너로 즉시 이동
    currentBannerIndex = index;
    // 실제 배너 인덱스는 0부터 시작, 시각적 인덱스는 클론 한 장이 앞에 있으므로 +1
    bannerVisualIndex = index + 1;
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

    // 시각적 인덱스를 기준으로 트랙 이동 (클론 포함)
    track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;

    dots.forEach((dot, index) => {
        if (index === currentBannerIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// 배너 무한 루프 처리를 위한 transition 종료 핸들러
function handleBannerTransitionEnd(e) {
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    const track = document.getElementById('bannerTrack');
    if (!track) return;

    const atLeftClone = (bannerVisualIndex === 0);
    const atRightClone = (bannerVisualIndex === bannerCount + 1);
    if (!atLeftClone && !atRightClone) return;

    // 다음 프레임에서 점프 실행 (transition 제거 → transform 변경 → 다음 프레임에 transition 복원)
    requestAnimationFrame(() => {
        track.style.transition = 'none';
        if (atLeftClone) {
            bannerVisualIndex = bannerCount;
            currentBannerIndex = bannerCount - 1;
        } else {
            bannerVisualIndex = 1;
            currentBannerIndex = 0;
        }
        track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;
        requestAnimationFrame(() => { track.style.transition = ''; });
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

// 지갑 페이지 업데이트
function updateWalletPage(data) {
    // 프로필 카드
    const walletImg = document.getElementById('walletProfileImg');
    const walletName = document.getElementById('walletProfileName');

    if (data.pictureUrl) {
        walletImg.src = data.pictureUrl;
        walletImg.style.display = 'block';
    }
    walletName.textContent = data.displayName || data.characterName || '-';

    // UID
    const walletUID = document.getElementById('walletUID');
    walletUID.textContent = data.uid || '-';

    // 지갑 주소 (앞10자...뒤6자 / 전체 주소를 data-full에 저장)
    const walletAddress = document.getElementById('walletAddress');
    if (data.walletAddress) {
        const addr = data.walletAddress;
        walletAddress.textContent = addr.substring(0, 10) + '...' + addr.substring(addr.length - 6);
        walletAddress.dataset.full = addr;
    } else {
        walletAddress.textContent = '-';
        walletAddress.dataset.full = '';
    }

    // 토큰 잔액
    const walletUSDT = document.getElementById('walletUSDT');
    const walletKAIA = document.getElementById('walletKAIA');
    const walletUSDTClaimable = document.getElementById('walletUSDTClaimable');
    const walletKAIAClaimable = document.getElementById('walletKAIAClaimable');

    if (data.tokenBalance) {
        walletUSDT.textContent = data.tokenBalance.usdt.toFixed(2);
        walletKAIA.textContent = data.tokenBalance.kaia.toFixed(2);
    }
    if (data.claimable) {
        walletUSDTClaimable.textContent = data.claimable.usdt.toFixed(2);
        walletKAIAClaimable.textContent = data.claimable.kaia.toFixed(2);
    }

    // 게임 재화
    const walletCoins = document.getElementById('walletCoins');
    const walletPoints = document.getElementById('walletPoints');
    const walletTickets = document.getElementById('walletTickets');

    walletCoins.textContent = data.coins !== undefined ? data.coins.toLocaleString() : '-';
    walletPoints.textContent = data.rewardPoints !== undefined ? data.rewardPoints.toLocaleString() : '-';
    walletTickets.textContent = data.tickets !== undefined ? data.tickets : '-';
}

// 클립보드 복사
function copyToClipboard(text, label) {
    if (!text || text === '-') {
        showToast('복사할 내용이 없습니다');
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(label + ' 복사 완료!');
        }).catch(() => {
            fallbackCopyToClipboard(text, label);
        });
    } else {
        fallbackCopyToClipboard(text, label);
    }
}

function fallbackCopyToClipboard(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast(label + ' 복사 완료!');
    } catch (e) {
        showToast('복사에 실패했습니다');
    }
    document.body.removeChild(textarea);
}

// 토큰 클레임
async function claimToken(tokenType) {
    const typeName = tokenType.toUpperCase();
    const claimableEl = document.getElementById(
        tokenType === 'usdt' ? 'walletUSDTClaimable' : 'walletKAIAClaimable'
    );
    const balanceEl = document.getElementById(
        tokenType === 'usdt' ? 'walletUSDT' : 'walletKAIA'
    );

    const claimableAmount = parseFloat(claimableEl.textContent);
    if (claimableAmount <= 0) {
        showToast('클레임 가능한 ' + typeName + '이 없습니다');
        return;
    }

    // 지갑 미연결 시 연결 유도
    if (!isWalletConnected()) {
        showToast('먼저 지갑을 연결해주세요');
        const section = document.getElementById('walletConnectArea');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // 온체인 클레임 트랜잭션 실행
    const success = await claimTokenOnChain(tokenType);
    if (success) {
        // UI 업데이트: 잔액 합산 + 클레임 가능 금액 0
        const currentBalance = parseFloat(balanceEl.textContent);
        balanceEl.textContent = (currentBalance + claimableAmount).toFixed(2);
        claimableEl.textContent = '0.00';
        showToast(typeName + ' ' + claimableAmount.toFixed(2) + ' 클레임 완료!');

        // 온체인 잔액 새로고침 (약간의 딜레이 후)
        setTimeout(function() { refreshTokenBalances(); }, 3000);
    }
}

// 거래 기록 드롭다운 토글
const historyPageSize = 10;
const historyDisplayed = { payment: 0, claim: 0 };

// 목업 결제기록 데이터 (향후 API 연동)
const mockPayments = [
    { title: '티켓 5장 구매', date: '2025-01-15 14:30', amount: '-5,000원', type: 'negative' },
    { title: '코인 1000개 구매', date: '2025-01-10 09:15', amount: '-3,000원', type: 'negative' },
    { title: '프리미엄 패스', date: '2025-01-05 18:42', amount: '-9,900원', type: 'negative' },
    { title: '티켓 10장 구매', date: '2024-12-28 11:00', amount: '-1,000원', type: 'negative' },
    { title: '코인 500개 구매', date: '2024-12-20 15:30', amount: '-1,500원', type: 'negative' },
    { title: '티켓 30장 구매', date: '2024-12-15 09:45', amount: '-3,000원', type: 'negative' },
    { title: '코인 2000개 구매', date: '2024-12-10 14:20', amount: '-6,000원', type: 'negative' },
    { title: '티켓 50장 구매', date: '2024-12-05 18:00', amount: '-5,000원', type: 'negative' },
    { title: '프리미엄 패스 갱신', date: '2024-12-01 10:30', amount: '-9,900원', type: 'negative' },
    { title: '티켓 100장 구매', date: '2024-11-25 13:15', amount: '-10,000원', type: 'negative' },
    { title: '코인 300개 구매', date: '2024-11-20 16:45', amount: '-900원', type: 'negative' },
    { title: '티켓 10장 구매', date: '2024-11-15 08:30', amount: '-1,000원', type: 'negative' }
];

// 목업 클레임기록 데이터 (향후 API 연동)
const mockClaims = [
    { title: 'USDT 클레임', date: '2025-01-14 11:20', amount: '+12.50 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2025-01-12 16:05', amount: '+150.00 KAIA', type: 'positive' },
    { title: 'USDT 클레임', date: '2025-01-08 08:30', amount: '+8.75 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2024-12-30 14:10', amount: '+200.00 KAIA', type: 'positive' },
    { title: 'USDT 클레임', date: '2024-12-25 09:00', amount: '+5.25 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2024-12-18 17:30', amount: '+100.00 KAIA', type: 'positive' },
    { title: 'USDT 클레임', date: '2024-12-12 11:45', amount: '+15.00 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2024-12-05 08:15', amount: '+300.00 KAIA', type: 'positive' },
    { title: 'USDT 클레임', date: '2024-11-28 13:00', amount: '+7.50 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2024-11-22 16:20', amount: '+180.00 KAIA', type: 'positive' },
    { title: 'USDT 클레임', date: '2024-11-15 10:30', amount: '+20.00 USDT', type: 'positive' },
    { title: 'KAIA 클레임', date: '2024-11-10 14:50', amount: '+250.00 KAIA', type: 'positive' }
];

function toggleHistoryDropdown(type) {
    const body = document.getElementById(type + 'DropdownBody');
    const arrow = document.getElementById(type + 'DropdownArrow');

    if (body.style.display === 'none') {
        body.style.display = 'block';
        arrow.classList.add('open');
        // 최초 열 때 데이터 로드
        if (historyDisplayed[type] === 0) {
            loadHistoryItems(type, true);
        }
    } else {
        body.style.display = 'none';
        arrow.classList.remove('open');
    }
}

function loadHistoryItems(type, reset) {
    const data = type === 'payment' ? mockPayments : mockClaims;
    const listEl = document.getElementById(type + 'HistoryList');
    const loadMoreBtn = document.getElementById(type + 'LoadMoreBtn');

    if (reset) {
        historyDisplayed[type] = 0;
        listEl.innerHTML = '';
    }

    if (data.length === 0) {
        listEl.innerHTML = '<div class="wallet-history-empty">' +
            (type === 'payment' ? '결제기록이 없습니다.' : '클레임기록이 없습니다.') + '</div>';
        loadMoreBtn.style.display = 'none';
        return;
    }

    const start = historyDisplayed[type];
    const end = Math.min(start + historyPageSize, data.length);
    const slice = data.slice(start, end);

    const html = slice.map(item => `
        <div class="wallet-history-item">
            <div class="wallet-history-item-left">
                <span class="wallet-history-item-title">${item.title}</span>
                <span class="wallet-history-item-date">${item.date}</span>
            </div>
            <span class="wallet-history-item-amount ${item.type}">${item.amount}</span>
        </div>
    `).join('');

    listEl.insertAdjacentHTML('beforeend', html);
    historyDisplayed[type] = end;

    // 더보기 버튼 표시/숨기기
    if (end < data.length) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMoreHistory(type) {
    loadHistoryItems(type, false);
}

// ========================================
// 친구 초대
// ========================================

// 초대 데이터 (localStorage 기반 목업)
function getInviteData() {
    const stored = localStorage.getItem('ph_invite_data');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) {}
    }
    return { invitedCount: 0, rewardTickets: 0 };
}

function saveInviteData(data) {
    localStorage.setItem('ph_invite_data', JSON.stringify(data));
}

function updateInviteStats() {
    const data = getInviteData();
    const countEl = document.getElementById('invitedCount');
    const rewardEl = document.getElementById('inviteRewardTotal');
    if (countEl) countEl.textContent = data.invitedCount;
    if (rewardEl) rewardEl.textContent = data.rewardTickets + '장';
}

// 초대 링크 생성
function getInviteLink() {
    const userId = liffProfile ? liffProfile.userId : 'user123';
    // 실제 배포 시 LIFF URL로 교체
    const baseUrl = LIFF_CONFIG.liffId
        ? 'https://liff.line.me/' + LIFF_CONFIG.liffId
        : window.location.origin + window.location.pathname;
    return baseUrl + '?ref=' + encodeURIComponent(userId);
}

// 홈 배너 클릭 → 지갑 화면 초대 섹션으로 이동
function onInviteBannerClick() {
    switchScreen('profile');
    // 살짝 딜레이 후 초대 섹션으로 스크롤
    setTimeout(() => {
        const section = document.getElementById('inviteRewardSection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 강조 효과
            section.style.transition = 'box-shadow 0.3s';
            section.style.boxShadow = '0 0 0 3px #FF6B35';
            setTimeout(() => {
                section.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
            }, 1500);
        }
    }, 200);
}

// LINE으로 초대 메시지 공유 (liff.shareTargetPicker)
function shareInviteLink() {
    const inviteLink = getInviteLink();

    // LIFF 환경에서 shareTargetPicker 사용
    if (typeof liff !== 'undefined' && liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([
            {
                type: 'flex',
                altText: '대중적 인간 - 함께 플레이해요!',
                contents: {
                    type: 'bubble',
                    hero: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🎁 대중적 인간',
                                weight: 'bold',
                                size: 'xl',
                                align: 'center',
                                color: '#FF6B35'
                            },
                            {
                                type: 'text',
                                text: '사회적 행동 예측 퀴즈 게임',
                                size: 'sm',
                                align: 'center',
                                color: '#999999',
                                margin: 'sm'
                            }
                        ],
                        paddingAll: '20px',
                        backgroundColor: '#FFF8F5'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '친구가 초대했어요!',
                                weight: 'bold',
                                size: 'md',
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: '지금 참여하면 티켓 3장을 드려요',
                                size: 'sm',
                                align: 'center',
                                color: '#999999',
                                margin: 'md'
                            }
                        ],
                        paddingAll: '16px'
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    label: '게임 시작하기',
                                    uri: inviteLink
                                },
                                style: 'primary',
                                color: '#FF6B35'
                            }
                        ],
                        paddingAll: '12px'
                    }
                }
            }
        ]).then((res) => {
            if (res) {
                showToast('초대 메시지를 전송했습니다!');
                // 목업: 초대 카운트 증가
                const data = getInviteData();
                data.invitedCount += 1;
                data.rewardTickets += 3;
                saveInviteData(data);
                updateInviteStats();
            }
        }).catch((err) => {
            console.error('shareTargetPicker 에러:', err);
            // 폴백: 링크 복사
            copyInviteLink();
        });
    } else {
        // LIFF 외 환경: 링크 복사 폴백
        copyInviteLink();
    }
}

// 초대 링크 복사
function copyInviteLink() {
    const link = getInviteLink();
    copyToClipboard(link, '초대 링크');
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
