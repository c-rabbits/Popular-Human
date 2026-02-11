// ========================================
// UI 모듈 (ui.js)
// ========================================

// ========================================
// 배너 슬라이더 (모바일·웹 공통: pointer 이벤트 사용)
// ========================================

let currentBannerIndex = 0;    // 실제 배너 인덱스 (0 ~ bannerCount-1)
let bannerVisualIndex = 0;     // 트랙 상의 시각적 인덱스 (클론 포함)
let bannerCount = 0;           // 실제 배너 개수
let bannerInterval;
let pointerStartX = 0;
let pointerEndX = 0;
let pointerStartTime = 0;
let isDragging = false;
let activePointerId = null; // pointerId로 터치/마우스 구분 (멀티포인터·이벤트 혼선 방지)
const SWIPE_THRESHOLD = 50; // 50px 이상 이동 시 스와이프, 미만이면 클릭 (이동 거리만 사용, 시간 무관)

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

    // 무한 루프용 클론 슬라이드 추가 (앞/뒤에 한 장씩), 배경 이미지 명시 복사로 항상 표시 보장
    const firstClone = slides[0].cloneNode(true);
    const lastClone = slides[slides.length - 1].cloneNode(true);
    firstClone.classList.add('banner-clone');
    lastClone.classList.add('banner-clone');

    const copyBannerImage = (fromSlide, toSlide) => {
        const fromImg = fromSlide.querySelector('.banner-image');
        const toImg = toSlide.querySelector('.banner-image');
        if (!fromImg || !toImg) return;
        const bg = fromImg.style.backgroundImage || (window.getComputedStyle && getComputedStyle(fromImg).backgroundImage);
        if (bg) toImg.style.backgroundImage = bg;
    };
    copyBannerImage(slides[0], firstClone);
    copyBannerImage(slides[slides.length - 1], lastClone);

    track.appendChild(firstClone);            // 맨 뒤에 첫 번째 슬라이드 클론
    track.insertBefore(lastClone, slides[0]); // 맨 앞에 마지막 슬라이드 클론

    // 초기 위치: 첫 번째 실제 배너(시각적 인덱스 1)
    currentBannerIndex = 0;
    bannerVisualIndex = 1;
    track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;

    // 루프용 transition 종료 처리 (transform만 처리해 중복 방지)
    track.addEventListener('transitionend', handleBannerTransitionEnd);

    // 포인터 이벤트 (터치·마우스·펜 통합 — 모바일/웹 모두 동일 동작)
    slider.addEventListener('pointerdown', handlePointerDown, { passive: true });
    slider.addEventListener('pointermove', handlePointerMove, { passive: false });
    slider.addEventListener('pointerup', handlePointerEnd);
    slider.addEventListener('pointercancel', handlePointerEnd);
    slider.addEventListener('pointerleave', handlePointerEnd);

    startBannerAutoSlide();
}

function handlePointerDown(e) {
    if (activePointerId !== null) return; // 이미 다른 포인터로 드래그 중이면 무시
    activePointerId = e.pointerId;
    pointerStartX = e.clientX;
    pointerEndX = pointerStartX;
    pointerStartTime = Date.now();
    isDragging = true;
    e.currentTarget.setPointerCapture(e.pointerId); // 슬라이더 밖에서 뗄 때도 이벤트 수신 (모바일/웹 공통)
    document.getElementById('bannerTrack').classList.add('dragging');
    clearInterval(bannerInterval);
}

function handlePointerMove(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    pointerEndX = e.clientX;
    e.preventDefault(); // 터치 스크롤 방지 (모바일에서 슬라이드만 인식)
}

function handlePointerEnd(e) {
    if (e.pointerId !== activePointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    activePointerId = null;
    isDragging = false;
    document.getElementById('bannerTrack').classList.remove('dragging');
    pointerEndX = e.clientX; // 포인터가 떨어진 위치로 거리 계산 (move 미수신 대비)

    const diff = pointerStartX - pointerEndX;
    const distance = Math.abs(diff);

    if (distance >= SWIPE_THRESHOLD) {
        if (diff > 0) {
            currentBannerIndex = (currentBannerIndex + 1) % bannerCount;
            bannerVisualIndex += 1;
        } else {
            currentBannerIndex = (currentBannerIndex - 1 + bannerCount) % bannerCount;
            bannerVisualIndex -= 1;
        }
        updateBannerPosition();
    } else {
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
// 포인터 이벤트 공통 (모바일·웹 통합 탭/클릭)
// ========================================

const POINTER_TAP_MOVE_THRESHOLD = 10; // 이 거리 이상 이동 시 탭으로 인정하지 않음
const pointerDownById = new Map(); // pointerId -> { element, x, y }
const pointerTapHandlers = new Map(); // element -> onclick 함수 (위임용)

/** 요소에 포인터 탭(터치/마우스 통합) 핸들러 등록. JS에서 동적 바인딩할 때 사용 */
function onPointerTap(element, callback) {
    if (!element) return;
    const handler = function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        callback(e);
    };
    pointerTapHandlers.set(element, handler);
    element.addEventListener('pointerdown', handlePointerTapDown, { passive: true });
    element.addEventListener('pointerup', handlePointerTapUp);
    element.addEventListener('pointercancel', handlePointerTapCancel);
    element.addEventListener('pointerleave', handlePointerTapCancel);
}

function handlePointerTapDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerDownById.set(e.pointerId, {
        element: e.currentTarget,
        x: e.clientX,
        y: e.clientY
    });
}

function handlePointerTapUp(e) {
    const down = pointerDownById.get(e.pointerId);
    pointerDownById.delete(e.pointerId);
    if (!down || down.element !== e.currentTarget) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (dx * dx + dy * dy > POINTER_TAP_MOVE_THRESHOLD * POINTER_TAP_MOVE_THRESHOLD) return;
    const fn = pointerTapHandlers.get(e.currentTarget);
    if (fn) fn(e);
}

function handlePointerTapCancel(e) {
    pointerDownById.delete(e.pointerId);
}

/** document 위임: [onclick] 요소를 포인터 탭으로 동작하게 바인딩 (한 번만 호출) */
function initPointerTapDelegation() {
    if (initPointerTapDelegation.done) return;
    initPointerTapDelegation.done = true;

    const byPointerId = new Map(); // pointerId -> { element, x, y }
    const tapHandlerByElement = new Map(); // element -> 원래 onclick 함수

    document.querySelectorAll('[onclick]').forEach(el => {
        const fn = el.onclick;
        if (typeof fn !== 'function') return;
        tapHandlerByElement.set(el, fn);
        el.onclick = null;
    });

    function findTappedElement(node) {
        let n = node;
        while (n && n !== document.body) {
            if (tapHandlerByElement.has(n)) return n;
            n = n.parentElement;
        }
        return null;
    }

    document.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const el = findTappedElement(e.target);
        if (el) byPointerId.set(e.pointerId, { element: el, x: e.clientX, y: e.clientY });
    }, true);

    document.addEventListener('pointerup', function (e) {
        const down = byPointerId.get(e.pointerId);
        byPointerId.delete(e.pointerId);
        if (!down) return;
        const el = findTappedElement(e.target);
        if (el !== down.element) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (dx * dx + dy * dy > POINTER_TAP_MOVE_THRESHOLD * POINTER_TAP_MOVE_THRESHOLD) return;
        const fn = tapHandlerByElement.get(el);
        if (fn) fn.call(el, e);
    }, true);

    document.addEventListener('pointercancel', function (e) { byPointerId.delete(e.pointerId); }, true);

    // 키보드 접근성: 포커스된 요소에서 Enter/Space 시 동일 핸들러 실행
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = findTappedElement(e.target);
        if (!el || !tapHandlerByElement.has(el)) return;
        e.preventDefault();
        tapHandlerByElement.get(el).call(el, e);
    }, true);
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

// LINE으로 초대 메시지 공유 — 친구 선택 화면(Share Target Picker) 표시
// ※ LINE Developers 콘솔 → LIFF 앱 → Scope에 "chat_message.write" 추가 필요
function shareInviteLink() {
    const inviteLink = getInviteLink();

    // LINE 앱 내부가 아니면 친구 선택 불가 → 안내 후 링크 복사
    if (typeof liff === 'undefined') {
        showToast('LINE 앱에서 열어주시면 친구를 선택해서 보낼 수 있어요');
        copyInviteLink();
        return;
    }
    if (!liff.isInClient()) {
        showToast('LINE 앱 내에서 열어주시면 친구 선택 화면이 나타나요');
        copyInviteLink();
        return;
    }

    // LINE 앱 내부: Share Target Picker 호출 → 친구/그룹 선택 화면 표시
    var messages = [
        {
            type: 'flex',
            altText: '대중적 인간 - 함께 플레이해요!',
            contents: {
                type: 'bubble',
                hero: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🎁 대중적 인간', weight: 'bold', size: 'xl', align: 'center', color: '#FF6B35' },
                        { type: 'text', text: '사회적 행동 예측 퀴즈 게임', size: 'sm', align: 'center', color: '#999999', margin: 'sm' }
                    ],
                    paddingAll: '20px',
                    backgroundColor: '#FFF8F5'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '친구가 초대했어요!', weight: 'bold', size: 'md', align: 'center' },
                        { type: 'text', text: '지금 참여하면 티켓 3장을 드려요', size: 'sm', align: 'center', color: '#999999', margin: 'md' }
                    ],
                    paddingAll: '16px'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: { type: 'uri', label: '게임 시작하기', uri: inviteLink },
                            style: 'primary',
                            color: '#FF6B35'
                        }
                    ],
                    paddingAll: '12px'
                }
            }
        }
    ];

    liff.shareTargetPicker(messages)
        .then(function (res) {
            if (res) {
                showToast('초대 메시지를 전송했습니다!');
                var data = getInviteData();
                data.invitedCount += 1;
                data.rewardTickets += 3;
                saveInviteData(data);
                updateInviteStats();
            }
        })
        .catch(function (err) {
            console.error('shareTargetPicker 에러:', err);
            var code = err && err.code;
            if (code === 'UNAUTHORIZED') {
                showToast('로그인 후 다시 시도해 주세요');
            } else if (code === 'FORBIDDEN') {
                showToast('친구 선택 기능은 LINE 앱에서만 사용할 수 있어요');
            } else {
                showToast('친구 선택을 취소했거나 일시적인 오류가 발생했어요');
            }
        });
}

// 초대 링크 복사
function copyInviteLink() {
    const link = getInviteLink();
    copyToClipboard(link, '초대 링크');
}

// ========================================
// 화면 전환
// ========================================

/** 트렌드 보드 각 시나리오별 "내 결과" 표시 갱신 */
function updateTrendMyResults() {
    const idByScenario = { 'wedding': 'Wedding', 'blind-date': 'Blinddate' };
    try {
        const saved = JSON.parse(localStorage.getItem('ph_trend_my_results') || '{}');
        Object.keys(idByScenario).forEach(function (scenarioId) {
            const el = document.getElementById('trendMyResultValue' + idByScenario[scenarioId]);
            if (!el) return;
            const data = saved[scenarioId];
            if (!data) {
                el.textContent = '—';
                el.classList.remove('trend-my-result-win', 'trend-my-result-lose');
                return;
            }
            const status = data.isWinner ? '성공' : '실패';
            el.textContent = status + ' · ' + data.correctCount + ' / ' + data.totalQuestions + ' 정답';
            el.classList.remove('trend-my-result-win', 'trend-my-result-lose');
            el.classList.add(data.isWinner ? 'trend-my-result-win' : 'trend-my-result-lose');
        });
    } catch (e) { console.warn('updateTrendMyResults', e); }
}

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

    if (screenName === 'ranking') {
        updateTrendMyResults();
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
        notificationStartTime: '09:00',
        notificationEndTime: '21:00'
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

// 설정 화면 토글·알림 시간대 초기화
function initSettingsToggles() {
    const settings = getSettings();
    const toggleEvent = document.getElementById('toggleEventNotif');
    const toggleResult = document.getElementById('toggleResultNotif');
    const startTimeInput = document.getElementById('notificationStartTime');
    const endTimeInput = document.getElementById('notificationEndTime');

    if (toggleEvent) toggleEvent.checked = settings.eventNotification;
    if (toggleResult) toggleResult.checked = settings.resultNotification;

    if (startTimeInput) {
        startTimeInput.value = settings.notificationStartTime || '09:00';
        startTimeInput.addEventListener('change', saveNotificationTimeRange);
    }
    if (endTimeInput) {
        endTimeInput.value = settings.notificationEndTime || '21:00';
        endTimeInput.addEventListener('change', saveNotificationTimeRange);
    }
}

function saveNotificationTimeRange() {
    const startEl = document.getElementById('notificationStartTime');
    const endEl = document.getElementById('notificationEndTime');
    if (!startEl || !endEl) return;
    const settings = getSettings();
    settings.notificationStartTime = startEl.value || '09:00';
    settings.notificationEndTime = endEl.value || '21:00';
    saveSettings(settings);
    console.log('[설정] 알림 시간대:', settings.notificationStartTime, '~', settings.notificationEndTime);
}

/** 현재 시각이 알림 허용 시간대 안인지 확인 (서버/클라이언트 공통 로직용) */
function isWithinNotificationTimeRange() {
    const settings = getSettings();
    const start = settings.notificationStartTime || '09:00';
    const end = settings.notificationEndTime || '21:00';
    const now = new Date();
    const toMinutes = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let startMin = toMinutes(start);
    let endMin = toMinutes(end);
    if (startMin <= endMin) {
        return nowMin >= startMin && nowMin <= endMin;
    }
    return nowMin >= startMin || nowMin <= endMin;
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
