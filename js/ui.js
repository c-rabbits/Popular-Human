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
let bannerCloneJumpTimeout = null; // 모바일에서 transitionend 미발생 시 폴백
let bannerImageUrls = []; // 원본 배너 이미지 URL (모바일 반복 스와이프 시 재적용용)
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

    // 원본 슬라이드 배경 URL 저장 (모바일 반복 스와이프 후 이미지 사라짐 방지)
    bannerImageUrls = Array.from(slides).map(s => {
        const img = s.querySelector('.banner-image');
        if (!img) return '';
        return img.style.backgroundImage || (window.getComputedStyle && getComputedStyle(img).backgroundImage) || '';
    });

    // 클론 슬라이드의 내용을 완전히 복사 (HTML 콘텐츠 배너 포함)
    const copyBannerContent = (fromSlide, toSlide) => {
        // innerHTML을 그대로 복사해 HTML 배너(친구초대 등)도 정상 표시
        toSlide.innerHTML = fromSlide.innerHTML;
        // 배경 이미지 기반 배너면 스타일도 복사
        const fromImg = fromSlide.querySelector('.banner-image');
        const toImg = toSlide.querySelector('.banner-image');
        if (fromImg && toImg) {
            const bg = fromImg.style.backgroundImage || (window.getComputedStyle && getComputedStyle(fromImg).backgroundImage);
            if (bg) toImg.style.backgroundImage = bg;
        }
        // 클론의 onclick은 제거 (클릭 이벤트는 currentBannerIndex 기반으로 handleBannerClick에서 처리)
        toSlide.removeAttribute('onclick');
    };
    copyBannerContent(slides[0], firstClone);
    copyBannerContent(slides[slides.length - 1], lastClone);

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
        // 클론 위치에서 한 번 더 스와이프하면 인덱스가 범위를 벗어나 흰 화면이 나오므로, 먼저 동기 점프로 실제 슬라이드로 보정
        var atLeftClone = (bannerVisualIndex === 0);
        var atRightClone = (bannerVisualIndex === bannerCount + 1);
        if (atLeftClone || atRightClone) {
            doBannerCloneJumpSync(atLeftClone);
        }
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
    // 배너 클릭 시 동작 (추후 외부 링크 등으로 확장 가능)
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

    // 클론 위치면 transitionend 미발생 시 대비 폴백 타이머 (모바일 대응)
    if (bannerCloneJumpTimeout) {
        clearTimeout(bannerCloneJumpTimeout);
        bannerCloneJumpTimeout = null;
    }
    const atLeftClone = (bannerVisualIndex === 0);
    const atRightClone = (bannerVisualIndex === bannerCount + 1);
    if (atLeftClone || atRightClone) {
        bannerCloneJumpTimeout = setTimeout(() => {
            bannerCloneJumpTimeout = null;
            if (bannerVisualIndex === 0) doBannerCloneJump(true);
            else if (bannerVisualIndex === bannerCount + 1) doBannerCloneJump(false);
        }, 600); // transition 0.5s보다 약간 여유 (모바일 transitionend 미발생 대비)
    }

    dots.forEach((dot, index) => {
        if (index === currentBannerIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

/** 클론 슬라이드에서 실제 슬라이드로 순간 점프 (동기, 빠른 스와이프 시 인덱스 보정용) */
function doBannerCloneJumpSync(atLeftClone) {
    const track = document.getElementById('bannerTrack');
    if (!track) return;
    if (bannerCloneJumpTimeout) {
        clearTimeout(bannerCloneJumpTimeout);
        bannerCloneJumpTimeout = null;
    }
    track.style.transition = 'none';
    if (atLeftClone) {
        bannerVisualIndex = bannerCount;
        currentBannerIndex = bannerCount - 1;
    } else {
        bannerVisualIndex = 1;
        currentBannerIndex = 0;
    }
    track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;
    void track.offsetHeight; // reflow
    track.style.transition = '';
    repaintBannerVisibleSlide();
    const dots = document.querySelectorAll('.banner-dot');
    dots.forEach(function (dot, index) {
        if (index === currentBannerIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

/** 클론 슬라이드에서 실제 슬라이드로 순간 점프 (무한 루프 유지, transitionend/타이머에서 호출) */
function doBannerCloneJump(atLeftClone) {
    const track = document.getElementById('bannerTrack');
    if (!track) return;
    const atRightClone = (bannerVisualIndex === bannerCount + 1);
    if (!atLeftClone && !atRightClone) return;

    track.style.transition = 'none';
    if (atLeftClone) {
        bannerVisualIndex = bannerCount;
        currentBannerIndex = bannerCount - 1;
    } else {
        bannerVisualIndex = 1;
        currentBannerIndex = 0;
    }
    track.style.transform = `translateX(-${bannerVisualIndex * 100}%)`;
    // 이중 rAF: 첫 프레임에서 transition 제거 후, 두 번째 프레임에서 transition 복원
    // 이렇게 해야 모바일에서 깜빡임 없이 안정적으로 점프
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            track.style.transition = '';
            repaintBannerVisibleSlide();
        });
    });

    const dots = document.querySelectorAll('.banner-dot');
    dots.forEach(function (dot, index) {
        if (index === currentBannerIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

/** 현재 보이는 배너 슬라이드에 배경 이미지 재적용 (모바일 repaint 유도) */
function repaintBannerVisibleSlide() {
    const track = document.getElementById('bannerTrack');
    if (!track) return;
    const slide = track.children[bannerVisualIndex];
    if (!slide) return;

    // 배경 이미지 배너인 경우 재적용
    const url = bannerImageUrls[currentBannerIndex];
    if (url) {
        const img = slide.querySelector('.banner-image');
        if (img) {
            img.style.backgroundImage = url;
        }
    }

    // 모든 슬라이드(HTML 포함)에 대해 reflow 유도 → 빈 화면 방지
    void track.offsetHeight;
}

// 배너 무한 루프 처리를 위한 transition 종료 핸들러 (모바일: transitionend 불안정 시 폴백 타이머로 보완)
function handleBannerTransitionEnd(e) {
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    if (e && e.target && e.target.id !== 'bannerTrack') return; // 자식 요소 전파 무시
    var track = document.getElementById('bannerTrack');
    if (!track) return;
    // 빠른 스와이프로 인덱스가 범위를 벗어난 경우(흰 화면) 보정: 클론으로만 점프
    var atLeftClone = (bannerVisualIndex === 0);
    var atRightClone = (bannerVisualIndex === bannerCount + 1);
    if (!atLeftClone && !atRightClone && (bannerVisualIndex < 0 || bannerVisualIndex > bannerCount + 1)) {
        if (bannerVisualIndex < 0) {
            bannerVisualIndex = bannerCount;
            currentBannerIndex = bannerCount - 1;
        } else {
            bannerVisualIndex = 1;
            currentBannerIndex = 0;
        }
        track.style.transition = 'none';
        track.style.transform = 'translateX(-' + (bannerVisualIndex * 100) + '%)';
        void track.offsetHeight;
        track.style.transition = '';
        repaintBannerVisibleSlide();
        return;
    }
    if (atLeftClone || atRightClone) {
        if (bannerCloneJumpTimeout) {
            clearTimeout(bannerCloneJumpTimeout);
            bannerCloneJumpTimeout = null;
        }
        requestAnimationFrame(function () { doBannerCloneJump(atLeftClone); });
    } else {
        // 클론이 아닐 때도 보이는 슬라이드 repaint (모바일 반복 스와이프 시 이미지 유지)
        repaintBannerVisibleSlide();
    }
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
// 트렌드 날짜 드롭다운 (버튼 클릭 → 날짜 목록 펼침, 선택 시 해당 시나리오만 아래 표시, 날짜 옆 에피소드 N개)
// ========================================
function initTrendDateDropdown() {
    const triggerEl = document.getElementById('trendDateDropdownTrigger');
    const panelEl = document.getElementById('trendDateDropdownPanel');
    const labelEl = document.querySelector('.trend-date-dropdown-trigger-label');
    const listEl = document.querySelector('.trend-date-list');
    if (!triggerEl || !panelEl || !labelEl || !listEl) return;

    const groups = listEl.querySelectorAll('.trend-date-group');
    if (groups.length === 0) return;

    // data-date 기준 최신순 정렬 후 DOM 순서 재배치
    const sorted = Array.from(groups).sort((a, b) => {
        const dA = a.getAttribute('data-date') || '';
        const dB = b.getAttribute('data-date') || '';
        return dB.localeCompare(dA);
    });
    sorted.forEach((g) => listEl.appendChild(g));

    function formatDateLabel(iso) {
        const [y, m, d] = iso.split('-');
        return y + '년 ' + parseInt(m, 10) + '월 ' + parseInt(d, 10) + '일';
    }

    function getScenarioCount(group) {
        return group.querySelectorAll('.trend-scenario-card').length;
    }

    // 패널에 날짜 목록 채우기 (날짜 + 에피소드 N개)
    panelEl.innerHTML = '';
    sorted.forEach((group) => {
        const date = group.getAttribute('data-date');
        if (!date) return;
        const count = getScenarioCount(group);
        const item = document.createElement('div');
        item.className = 'trend-date-dropdown-item';
        item.setAttribute('role', 'option');
        item.setAttribute('data-date', date);
        item.innerHTML = '<span class="trend-date-dropdown-item-date">' + formatDateLabel(date) + '</span><span class="trend-date-dropdown-item-count">에피소드 ' + count + '개</span>';
        panelEl.appendChild(item);
    });

    function showGroupForDate(date) {
        groups.forEach((g) => {
            g.style.display = g.getAttribute('data-date') === date ? '' : 'none';
        });
    }

    const prevBtn = document.getElementById('trendDatePrevBtn');
    const nextBtn = document.getElementById('trendDateNextBtn');

    function getIndexForDate(date) {
        return sorted.findIndex((g) => g.getAttribute('data-date') === date);
    }

    function setSelectedDate(date) {
        if (!date) return;
        if (labelEl) {
            labelEl.textContent = formatDateLabel(date);
            labelEl.setAttribute('data-current-date', date);
        }
        showGroupForDate(date);
        const idx = getIndexForDate(date);
        if (prevBtn) prevBtn.disabled = idx <= 0;
        if (nextBtn) nextBtn.disabled = idx < 0 || idx >= sorted.length - 1;
    }

    function closePanel() {
        panelEl.hidden = true;
        triggerEl.setAttribute('aria-expanded', 'false');
    }

    function openPanel() {
        panelEl.hidden = false;
        triggerEl.setAttribute('aria-expanded', 'true');
    }

    // 기본: 최신 날짜 선택
    const latestDate = sorted[0] && sorted[0].getAttribute('data-date');
    if (latestDate) setSelectedDate(latestDate);

    triggerEl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (panelEl.hidden) openPanel();
        else closePanel();
    });

    panelEl.querySelectorAll('.trend-date-dropdown-item').forEach((item) => {
        item.addEventListener('click', function () {
            const date = this.getAttribute('data-date');
            if (!date) return;
            setSelectedDate(date);
            closePanel();
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            const current = labelEl.getAttribute('data-current-date') || sorted[0] && sorted[0].getAttribute('data-date');
            const idx = getIndexForDate(current);
            if (idx > 0) setSelectedDate(sorted[idx - 1].getAttribute('data-date'));
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            const current = labelEl.getAttribute('data-current-date') || (sorted[0] && sorted[0].getAttribute('data-date'));
            const idx = getIndexForDate(current);
            if (idx >= 0 && idx < sorted.length - 1) setSelectedDate(sorted[idx + 1].getAttribute('data-date'));
        });
    }

    document.addEventListener('click', function (e) {
        if (!triggerEl.contains(e.target) && !panelEl.contains(e.target)) closePanel();
    });
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
// 상점 탭 전환
// ========================================
function switchShopTab(tab) {
    var panels = document.querySelectorAll('.shop-tab-panel');
    var tabs = document.querySelectorAll('.shop-tab');
    panels.forEach(function (p) {
        p.classList.remove('active');
        p.setAttribute('hidden', '');
    });
    tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    var panel = document.getElementById('shopPanel' + (tab === 'cash' ? 'Cash' : tab === 'item' ? 'Item' : 'Ticket'));
    var tabBtn = document.querySelector('.shop-tab[data-tab="' + tab + '"]');
    if (panel) {
        panel.classList.add('active');
        panel.removeAttribute('hidden');
    }
    if (tabBtn) {
        tabBtn.classList.add('active');
        tabBtn.setAttribute('aria-selected', 'true');
    }
}

function buyCash(amount, method) {
    if (typeof showToast === 'function') {
        showToast(method === 'line' ? 'LINE Pay 결제 기능은 준비 중입니다.' : '인앱 결제 기능은 준비 중입니다.');
    } else {
        alert(method === 'line' ? 'LINE Pay 결제 기능은 준비 중입니다.' : '인앱 결제 기능은 준비 중입니다.');
    }
}

function buyItem(itemType, itemId, priceCash) {
    var cashEl = document.getElementById('cashCount');
    var currentCash = parseInt(cashEl ? cashEl.textContent : '0', 10) || 0;
    if (currentCash < priceCash) {
        if (typeof showToast === 'function') showToast('캐시가 부족합니다.');
        else alert('캐시가 부족합니다.');
        return;
    }
    updateUserStats({ cash: currentCash - priceCash });
    if (typeof showToast === 'function') showToast('구매 완료! (보유 아이템 적용은 준비 중)');
    else alert('구매 완료! (보유 아이템 적용은 준비 중)');
}

function buyTicketsWithCash(amount, priceCash) {
    var cashEl = document.getElementById('cashCount');
    var ticketEl = document.getElementById('ticketCount');
    var currentCash = parseInt(cashEl ? cashEl.textContent : '0', 10) || 0;
    var currentTickets = parseInt(ticketEl ? ticketEl.textContent : '0', 10) || 0;
    if (currentCash < priceCash) {
        if (typeof showToast === 'function') showToast('캐시가 부족합니다.');
        else alert('캐시가 부족합니다.');
        return;
    }
    updateUserStats({ cash: currentCash - priceCash, tickets: currentTickets + amount });
    if (typeof showToast === 'function') showToast('티켓 ' + amount + '개 구매 완료!');
    else alert('티켓 ' + amount + '개 구매 완료!');
}

// ========================================
// 유저 정보 업데이트
// ========================================

function updateUserStats(data) {
    console.log('유저 스탯 업데이트:', data);
    if (data.cash !== undefined) {
        document.getElementById('cashCount').textContent = data.cash;
        var shopCashEl = document.getElementById('shopCashCount');
        if (shopCashEl) shopCashEl.textContent = data.cash;
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
    // 프로필 카드 (아바타 원 + 이름)
    const walletImg = document.getElementById('walletProfileImg');
    const walletName = document.getElementById('walletProfileName');
    const avatarWrap = walletImg && walletImg.closest('.wallet-profile-avatar');

    if (walletImg) {
        if (data.pictureUrl) {
            walletImg.src = data.pictureUrl;
            walletImg.style.display = 'block';
            if (avatarWrap) avatarWrap.classList.remove('no-image');
        } else {
            walletImg.removeAttribute('src');
            walletImg.style.display = 'none';
            if (avatarWrap) avatarWrap.classList.add('no-image');
        }
    }
    const displayLabel = data.nickname || data.displayName || data.characterName || '-';
    if (walletName) walletName.textContent = displayLabel;
    const nicknameBtn = document.getElementById('walletNicknameBtn');
    if (nicknameBtn) nicknameBtn.textContent = data.nickname ? '닉네임 변경' : '닉네임 만들기';

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
    const walletCash = document.getElementById('walletCash');
    const walletPoints = document.getElementById('walletPoints');
    const walletTickets = document.getElementById('walletTickets');

    walletCash.textContent = data.cash !== undefined ? data.cash.toLocaleString() : '-';
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

// 최종 승자 리스트 렌더링 (승자/패배 화면)
function fillWinnerList(containerId, winners) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!winners || winners.length === 0) {
        container.innerHTML = '<div class="winner-list-empty">승자 목록이 없습니다.</div>';
        return;
    }
    container.innerHTML = winners.map(function (w) {
        const imgSrc = w.profileImageUrl || '';
        const imgPart = imgSrc
            ? '<img src="' + imgSrc.replace(/"/g, '&quot;') + '" alt="">'
            : '<span class="winner-list-avatar-placeholder">?</span>';
        return '<div class="winner-list-item">' +
            '<div class="winner-list-avatar">' + imgPart + '</div>' +
            '<span class="winner-list-nickname">' + escapeHtml(w.nickname || '-') + '</span>' +
            '</div>';
    }).join('');
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// 닉네임 (로컬 저장, 서버 연동 시 API로 교체)
function getNickname() {
    try {
        return localStorage.getItem('ph_nickname') || null;
    } catch (e) {
        return null;
    }
}
function setNickname(name) {
    try {
        localStorage.setItem('ph_nickname', name);
        return true;
    } catch (e) {
        return false;
    }
}

// 닉네임 중복 확인 (실서버: GET /user/nickname/check?q=xxx)
async function checkNicknameDuplicate(nickname) {
    // TODO: 실제 서버 API 연동
    // const res = await fetch(`${API.baseURL}/user/nickname/check?q=${encodeURIComponent(nickname)}`);
    // const data = await res.json(); return data.used === true;
    return false;
}

function openNicknamePopup() {
    const popup = document.getElementById('nicknamePopup');
    const input = document.getElementById('nicknamePopupInput');
    const errEl = document.getElementById('nicknamePopupError');
    if (!popup || !input) return;
    errEl.textContent = '';
    input.value = getNickname() || '';
    input.focus();
    popup.classList.add('active');
}

function closeNicknamePopup() {
    const popup = document.getElementById('nicknamePopup');
    if (popup) popup.classList.remove('active');
    const errEl = document.getElementById('nicknamePopupError');
    if (errEl) errEl.textContent = '';
}

async function confirmNickname() {
    const input = document.getElementById('nicknamePopupInput');
    const errEl = document.getElementById('nicknamePopupError');
    if (!input || !errEl) return;
    const raw = (input.value || '').trim();
    if (raw.length < 2) {
        errEl.textContent = '2자 이상 입력해주세요.';
        return;
    }
    if (raw.length > 10) {
        errEl.textContent = '10자 이하로 입력해주세요.';
        return;
    }
    errEl.textContent = '확인 중...';
    const isUsed = await checkNicknameDuplicate(raw);
    if (isUsed) {
        errEl.textContent = '이미 사용 중인 닉네임입니다.';
        return;
    }
    setNickname(raw);
    errEl.textContent = '';
    closeNicknamePopup();
    const userInfo = await API.getUserInfo();
    if (userInfo) updateWalletPage(userInfo);
    if (typeof showToast === 'function') showToast('닉네임이 저장되었습니다.');
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
    { title: '캐시 1000개 구매', date: '2025-01-10 09:15', amount: '-3,000원', type: 'negative' },
    { title: '프리미엄 패스', date: '2025-01-05 18:42', amount: '-9,900원', type: 'negative' },
    { title: '티켓 10장 구매', date: '2024-12-28 11:00', amount: '-1,000원', type: 'negative' },
    { title: '캐시 500개 구매', date: '2024-12-20 15:30', amount: '-1,500원', type: 'negative' },
    { title: '티켓 30장 구매', date: '2024-12-15 09:45', amount: '-3,000원', type: 'negative' },
    { title: '캐시 2000개 구매', date: '2024-12-10 14:20', amount: '-6,000원', type: 'negative' },
    { title: '티켓 50장 구매', date: '2024-12-05 18:00', amount: '-5,000원', type: 'negative' },
    { title: '프리미엄 패스 갱신', date: '2024-12-01 10:30', amount: '-9,900원', type: 'negative' },
    { title: '티켓 100장 구매', date: '2024-11-25 13:15', amount: '-10,000원', type: 'negative' },
    { title: '캐시 300개 구매', date: '2024-11-20 16:45', amount: '-900원', type: 'negative' },
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
            altText: 'Human Experiment - 함께 플레이해요!',
            contents: {
                type: 'bubble',
                hero: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '🎁 Human Experiment', weight: 'bold', size: 'xl', align: 'center', color: '#FF6B35' },
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
    const termsEl = document.getElementById('termsScreen');
    const privacyEl = document.getElementById('privacyScreen');
    if (termsEl) termsEl.classList.remove('active');
    if (privacyEl) privacyEl.classList.remove('active');

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
    if (screenName === 'shop') {
        var cashEl = document.getElementById('cashCount');
        var shopCashEl = document.getElementById('shopCashCount');
        if (cashEl && shopCashEl) shopCashEl.textContent = cashEl.textContent;
    }
    applyLanguageToPage();
    if (screenName === 'settings') {
        updateSettingsLanguageDisplay();
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

        shareText = `🏆 Human Experiment 게임 결과 🏆

✅ 당신은 Human Experiment입니다!
전 세계 사람들의 판단 흐름을 끝까지 읽었습니다.

💰 획득 상금: ${rewardAmount}
📊 정답률: ${correctAnswers}
👥 총 승자: ${totalWinners}명 중 한 명

시나리오: ${currentScenario.name}

나도 도전해보기 👇
${gameUrl}`;
    } else {
        const correctAnswers = document.getElementById('correctAnswersLose').textContent;

        shareText = `🧠 Human Experiment 게임 결과

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
    const shareText = `🎮 Human Experiment - 트렌드 예측 게임

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
        notificationEndTime: '21:00',
        language: ''  // '' = 자동(기기/LIFF 언어)
    };
    try {
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
        return defaults;
    }
}

// 지원 언어 코드
const SUPPORTED_LANGS = ['ko', 'en', 'ja'];

// 현재 사용할 언어 코드 반환 (자동 감지 또는 설정값)
function getCurrentLanguage() {
    const settings = getSettings();
    if (settings.language && settings.language !== 'auto') return settings.language;
    if (typeof liff !== 'undefined' && liff.getLanguage) {
        const liffLang = liff.getLanguage();
        if (SUPPORTED_LANGS.includes(liffLang)) return liffLang;
    }
    const browser = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('ja')) return 'ja';
    return 'en';
}

// 언어 설정 저장 후 UI 반영
function saveLanguage(langCode) {
    const settings = getSettings();
    settings.language = langCode || '';
    saveSettings(settings);
    document.documentElement.lang = getCurrentLanguage();
    applyLanguageToPage();
    updateSettingsLanguageDisplay();
    console.log('[설정] 언어:', langCode || '자동');
}

// 설정 화면·모달·네비·기타 공통 문구 번역
const I18N = {
    ko: {
        settingsTitle: '설정',
        settingsSubtitle: '알림과 계정을 관리하세요',
        sectionGeneral: '일반',
        sectionNotifications: '알림',
        sectionAccount: '계정',
        sectionInfo: '정보',
        languageLabel: '언어',
        languageDesc: '앱 표시 언어',
        languageAuto: '자동 (기기 언어)',
        languageKo: '한국어',
        languageEn: 'English',
        languageJa: '日本語',
        navShop: '상점',
        navTrend: '트렌드',
        navHome: '홈',
        navWallet: '지갑',
        navSettings: '설정',
        screenShop: '🛍 상점',
        screenTrend: '📊 트렌드',
        screenWallet: '💎 지갑',
        eventNotif: '이벤트 알림',
        eventNotifDesc: '새 시나리오 오픈 시 알림',
        resultNotif: '결과 알림',
        resultNotifDesc: '이벤트 종료 및 결과 발표 알림',
        notifTimeRange: '알림 받을 시간대',
        notifTimeRangeDesc: '이 시간대에만 알림을 보내드립니다',
        timeStart: '시작',
        timeEnd: '종료',
        logout: '로그아웃',
        logoutDesc: 'LINE 계정 연결을 해제합니다',
        terms: '이용약관',
        privacy: '개인정보처리방침',
        inquiry: '문의하기',
        appVersion: '앱 버전',
        termsTitle: '이용약관',
        privacyTitle: '개인정보처리방침',
        backToSettings: '설정으로 돌아가기',
        legalPlaceholder: '(내용을 입력할 예정입니다)'
    },
    en: {
        settingsTitle: 'Settings',
        settingsSubtitle: 'Manage notifications and account',
        sectionGeneral: 'General',
        sectionNotifications: 'Notifications',
        sectionAccount: 'Account',
        sectionInfo: 'Information',
        languageLabel: 'Language',
        languageDesc: 'Display language',
        languageAuto: 'Auto (device)',
        languageKo: 'Korean',
        languageEn: 'English',
        languageJa: 'Japanese',
        navShop: 'Shop',
        navTrend: 'Trend',
        navHome: 'Home',
        navWallet: 'Wallet',
        navSettings: 'Settings',
        screenShop: '🛍 Shop',
        screenTrend: '📊 Trend',
        screenWallet: '💎 Wallet',
        eventNotif: 'Event notifications',
        eventNotifDesc: 'Notify when new scenarios open',
        resultNotif: 'Result notifications',
        resultNotifDesc: 'Notify when event ends and results are announced',
        notifTimeRange: 'Notification hours',
        notifTimeRangeDesc: 'Send notifications only during this time',
        timeStart: 'Start',
        timeEnd: 'End',
        logout: 'Log out',
        logoutDesc: 'Disconnect LINE account',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        inquiry: 'Contact',
        appVersion: 'App version',
        termsTitle: 'Terms of Service',
        privacyTitle: 'Privacy Policy',
        backToSettings: 'Back to settings',
        legalPlaceholder: '(Content to be added)'
    },
    ja: {
        settingsTitle: '設定',
        settingsSubtitle: '通知とアカウントを管理',
        sectionGeneral: '一般',
        sectionNotifications: '通知',
        sectionAccount: 'アカウント',
        sectionInfo: '情報',
        languageLabel: '言語',
        languageDesc: '表示言語',
        languageAuto: '自動（端末の言語）',
        languageKo: '韓国語',
        languageEn: '英語',
        languageJa: '日本語',
        navShop: 'ショップ',
        navTrend: 'トレンド',
        navHome: 'ホーム',
        navWallet: 'ウォレット',
        navSettings: '設定',
        screenShop: '🛍 ショップ',
        screenTrend: '📊 トレンド',
        screenWallet: '💎 ウォレット',
        eventNotif: 'イベント通知',
        eventNotifDesc: '新シナリオ公開時に通知',
        resultNotif: '結果通知',
        resultNotifDesc: 'イベント終了・結果発表時に通知',
        notifTimeRange: '通知を受け取る時間帯',
        notifTimeRangeDesc: 'この時間帯のみ通知を送信します',
        timeStart: '開始',
        timeEnd: '終了',
        logout: 'ログアウト',
        logoutDesc: 'LINEアカウントの連携を解除します',
        terms: '利用規約',
        privacy: 'プライバシーポリシー',
        inquiry: 'お問い合わせ',
        appVersion: 'アプリバージョン',
        termsTitle: '利用規約',
        privacyTitle: 'プライバシーポリシー',
        backToSettings: '設定に戻る',
        legalPlaceholder: '（内容は追って追加します）'
    }
};

function applyLanguageToPage() {
    const lang = getCurrentLanguage();
    const t = I18N[lang] || I18N.ko;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] != null) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (t[key] != null) el.setAttribute('aria-label', t[key]);
    });
}

function updateSettingsLanguageDisplay() {
    const valueEl = document.getElementById('settingsLanguageValue');
    if (!valueEl) return;
    const settings = getSettings();
    const t = I18N[getCurrentLanguage()] || I18N.ko;
    if (!settings.language || settings.language === 'auto') valueEl.textContent = t.languageAuto;
    else valueEl.textContent = t['language' + (settings.language === 'ko' ? 'Ko' : settings.language === 'en' ? 'En' : 'Ja')];
}

function openLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) modal.classList.add('active');
    const lang = getCurrentLanguage();
    const t = I18N[lang] || I18N.ko;
    ['auto', 'ko', 'en', 'ja'].forEach(code => {
        const btn = document.querySelector(`[data-lang-option="${code}"]`);
        if (!btn) return;
        if (code === 'auto') btn.textContent = t.languageAuto;
        else btn.textContent = t['language' + (code === 'ko' ? 'Ko' : code === 'en' ? 'En' : 'Ja')];
    });
}

function closeLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) modal.classList.remove('active');
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

    fillTimePickerOptions();

    if (startTimeInput) {
        startTimeInput.value = settings.notificationStartTime || '09:00';
        startTimeInput.addEventListener('change', saveNotificationTimeRange);
    }
    if (endTimeInput) {
        endTimeInput.value = settings.notificationEndTime || '21:00';
        endTimeInput.addEventListener('change', saveNotificationTimeRange);
    }

    syncCustomTimePickerFromSettings();
    bindCustomTimePickerListeners();

    document.documentElement.lang = getCurrentLanguage();
    applyLanguageToPage();
    updateSettingsLanguageDisplay();
}

function fillTimePickerOptions() {
    const pad = (n) => String(n).padStart(2, '0');
    const hours = Array.from({ length: 24 }, (_, i) => pad(i));
    const minutes = Array.from({ length: 60 }, (_, i) => pad(i));

    ['notificationStartHour', 'notificationEndHour'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = '';
        hours.forEach(v => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            el.appendChild(o);
        });
    });
    ['notificationStartMin', 'notificationEndMin'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = '';
        minutes.forEach(v => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            el.appendChild(o);
        });
    });
}

function syncCustomTimePickerFromSettings() {
    const settings = getSettings();
    const start = (settings.notificationStartTime || '09:00').split(':');
    const end = (settings.notificationEndTime || '21:00').split(':');
    const pad = (v) => String(v || '0').padStart(2, '0');
    const setSelect = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = pad(value);
    };
    setSelect('notificationStartHour', start[0]);
    setSelect('notificationStartMin', start[1]);
    setSelect('notificationEndHour', end[0]);
    setSelect('notificationEndMin', end[1]);
}

function bindCustomTimePickerListeners() {
    const ids = ['notificationStartHour', 'notificationStartMin', 'notificationEndHour', 'notificationEndMin'];
    const startIds = ['notificationStartHour', 'notificationStartMin'];
    const endIds = ['notificationEndHour', 'notificationEndMin'];

    function updateNativeFromSelects() {
        const startEl = document.getElementById('notificationStartTime');
        const endEl = document.getElementById('notificationEndTime');
        if (!startEl || !endEl) return;
        const h1 = document.getElementById('notificationStartHour');
        const m1 = document.getElementById('notificationStartMin');
        const h2 = document.getElementById('notificationEndHour');
        const m2 = document.getElementById('notificationEndMin');
        if (h1 && m1) startEl.value = (h1.value || '09') + ':' + (m1.value || '00');
        if (h2 && m2) endEl.value = (h2.value || '21') + ':' + (m2.value || '00');
        saveNotificationTimeRange();
    }

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateNativeFromSelects);
    });
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
    document.getElementById('settingsScreen').classList.remove('active');
    document.getElementById('termsScreen').classList.add('active');
    document.querySelector('.bottom-nav').classList.add('hidden');
}

// 개인정보처리방침
function openPrivacy() {
    document.getElementById('settingsScreen').classList.remove('active');
    document.getElementById('privacyScreen').classList.add('active');
    document.querySelector('.bottom-nav').classList.add('hidden');
}

// 약관/개인정보처리방침에서 설정으로 돌아가기
function goBackToSettings() {
    document.getElementById('termsScreen').classList.remove('active');
    document.getElementById('privacyScreen').classList.remove('active');
    document.getElementById('settingsScreen').classList.add('active');
    document.querySelector('.bottom-nav').classList.remove('hidden');
}

// 문의하기: LINE 공식 계정 1:1 채팅
function openInquiry() {
    const oaId = (LIFF_CONFIG && LIFF_CONFIG.lineOfficialAccountId) ? LIFF_CONFIG.lineOfficialAccountId.trim() : '';
    if (!oaId) {
        showToast('문의 채널이 설정되지 않았습니다. lineOfficialAccountId를 입력해주세요.');
        return;
    }
    const url = 'https://line.me/R/ti/p/' + (oaId.startsWith('@') ? oaId : '@' + oaId);
    if (typeof liff !== 'undefined' && liff.isInClient()) {
        liff.openWindow({ url: url });
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
