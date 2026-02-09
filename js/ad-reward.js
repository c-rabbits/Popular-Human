// ========================================
// 광고 리워드 모듈 (ad-reward.js)
// ========================================

// 광고 쿨타임 관리 (로컬 스토리지 사용)
const AD_COOLDOWN_DURATION = 60 * 60 * 1000; // 1시간 (밀리초)

// 광고 시청
function watchAd(slotNumber) {
    const btn = document.getElementById(`adRewardBtn${slotNumber}`);
    const icon = btn.querySelector('.ad-reward-icon');
    const text = btn.querySelector('.ad-reward-text');

    if (btn.classList.contains('cooldown')) {
        const cooldownDiv = document.getElementById(`adCooldown${slotNumber}`);
        showToast(`⏰ 쿨타임: ${cooldownDiv.textContent}`);
        return;
    }

    if (btn.classList.contains('loading')) {
        return; // 이미 로딩 중
    }

    // 로딩 상태 시작
    btn.classList.add('loading');
    const originalIcon = icon.textContent;
    icon.textContent = '⏳';
    text.innerHTML = '광고<br>로딩 중...';

    // 실제로는 광고 SDK를 연동해야 함
    // 예시: Google AdMob, Unity Ads 등
    // adSDK.showRewardedVideo({
    //     onComplete: () => { grantReward(slotNumber); },
    //     onError: () => { resetButton(slotNumber, originalIcon); }
    // });

    // 시뮬레이션: 2초 후 광고 완료
    console.log(`광고 슬롯 ${slotNumber} 시청 시작`);

    setTimeout(() => {
        // 광고 시청 완료 처리
        grantReward(slotNumber);

        // 로딩 상태 종료
        btn.classList.remove('loading');
        icon.textContent = originalIcon;
        text.innerHTML = '광고 보고<br>🎫 받기';
    }, 2000);
}

function grantReward(slotNumber) {
    // 티켓 지급
    const currentTickets = parseInt(document.getElementById('ticketCount').textContent);
    updateUserStats({ tickets: currentTickets + 1 });

    // 쿨타임 시작
    startAdCooldown(slotNumber);

    // 성공 알림
    showToast('🎫 티켓 1개를 받았습니다!');

    console.log(`광고 슬롯 ${slotNumber} 보상 지급 완료`);
}

function startAdCooldown(slotNumber) {
    const now = Date.now();
    const endTime = now + AD_COOLDOWN_DURATION;

    // 로컬 스토리지에 쿨타임 종료 시간 저장
    localStorage.setItem(`adCooldown${slotNumber}`, endTime);

    updateAdButton(slotNumber);
}

function updateAdButton(slotNumber) {
    const btn = document.getElementById(`adRewardBtn${slotNumber}`);
    const cooldownDiv = document.getElementById(`adCooldown${slotNumber}`);
    const endTime = localStorage.getItem(`adCooldown${slotNumber}`);

    if (!endTime) {
        btn.classList.remove('cooldown');
        cooldownDiv.textContent = '';
        return;
    }

    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) {
        // 쿨타임 종료
        localStorage.removeItem(`adCooldown${slotNumber}`);
        btn.classList.remove('cooldown');
        cooldownDiv.textContent = '';
    } else {
        // 쿨타임 진행 중
        btn.classList.add('cooldown');

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        cooldownDiv.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function initAdButtons() {
    // 모든 광고 버튼 상태 초기화
    for (let i = 1; i <= 3; i++) {
        updateAdButton(i);
    }

    // 1초마다 쿨타임 업데이트
    setInterval(() => {
        for (let i = 1; i <= 3; i++) {
            updateAdButton(i);
        }
    }, 1000);
}
