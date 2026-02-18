// ========================================
// Kaia Wallet 모듈 (kaia-wallet.js)
// Dapp Portal SDK 연동
// ========================================

const KAIA_CONFIG = {
    // TODO: Dapp Portal 신청 후 발급받은 clientId 입력
    clientId: '',
    chainId: '1001',        // '1001' = Kairos 테스트넷, '8217' = 메인넷
    // 토큰 컨트랙트 주소 (메인넷 기준)
    contracts: {
        USDT: '0xd077a400968890eacc75cdc901f0356c943e4fdb'  // Kaia 메인넷 USDT
    },
    // 토큰 소수점
    decimals: {
        USDT: 6,
        KAIA: 18
    }
};

// SDK 인스턴스 (싱글톤)
let dappSDK = null;
let walletProvider = null;
let connectedAddress = null;
let isKaiaInitialized = false;

// ========================================
// SDK 초기화
// ========================================

async function initKaiaSDK() {
    // clientId 미설정 시 개발 모드 (경고 한 번만)
    if (!KAIA_CONFIG.clientId) {
        console.warn('[Kaia] clientId 미설정 → 개발 모드 (목업). Dapp Portal에서 clientId 발급 후 KAIA_CONFIG.clientId에 입력.');
        isKaiaInitialized = false;
        return false;
    }

    // DappPortalSDK가 로드되었는지 확인
    if (typeof DappPortalSDK === 'undefined') {
        console.error('[Kaia] DappPortalSDK가 로드되지 않았습니다.');
        isKaiaInitialized = false;
        return false;
    }

    try {
        dappSDK = await DappPortalSDK.init({
            clientId: KAIA_CONFIG.clientId,
            chainId: KAIA_CONFIG.chainId
        });
        walletProvider = dappSDK.getWalletProvider();
        isKaiaInitialized = true;
        console.log('[Kaia] DappPortalSDK 초기화 성공 (chainId:', KAIA_CONFIG.chainId + ')');

        // 이전에 연결된 지갑이 있는지 확인
        await checkExistingConnection();

        return true;
    } catch (error) {
        console.error('[Kaia] DappPortalSDK 초기화 실패:', error);
        isKaiaInitialized = false;
        return false;
    }
}

// ========================================
// 지갑 연결
// ========================================

// 이미 연결된 지갑 확인 (UI 프롬프트 없이)
async function checkExistingConnection() {
    if (!walletProvider) return null;

    try {
        const accounts = await walletProvider.request({
            method: 'kaia_accounts'
        });
        if (accounts && accounts.length > 0) {
            connectedAddress = accounts[0];
            console.log('[Kaia] 기존 지갑 연결 확인:', shortenAddress(connectedAddress));
            onWalletConnected(connectedAddress);
            return connectedAddress;
        }
    } catch (error) {
        console.log('[Kaia] 기존 연결 없음');
    }
    return null;
}

// 지갑 연결 요청 (사용자에게 UI 표시)
async function connectKaiaWallet() {
    // 개발 모드: 목업 지갑 연결
    if (!isKaiaInitialized) {
        console.log('[Kaia] 개발 모드 → 목업 지갑 연결');
        connectedAddress = '0x' + 'a'.repeat(40);  // 목업 주소
        onWalletConnected(connectedAddress);
        showToast('개발 모드: 목업 지갑 연결됨');
        return connectedAddress;
    }

    try {
        showToast('지갑 연결 중...');
        const accounts = await walletProvider.request({
            method: 'kaia_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
            connectedAddress = accounts[0];
            console.log('[Kaia] 지갑 연결 성공:', shortenAddress(connectedAddress));
            onWalletConnected(connectedAddress);
            showToast('지갑이 연결되었습니다!');
            return connectedAddress;
        }
    } catch (error) {
        console.error('[Kaia] 지갑 연결 실패:', error);
        if (error.code === 4001) {
            showToast('지갑 연결을 취소했습니다');
        } else {
            showToast('지갑 연결에 실패했습니다');
        }
    }
    return null;
}

// 지갑 연결 성공 시 UI 업데이트 + 잔액 로드
function onWalletConnected(address) {
    // 연결 상태 UI 전환
    const connectArea = document.getElementById('walletConnectArea');
    const addressArea = document.getElementById('walletAddressArea');
    const badge = document.getElementById('walletConnectionBadge');
    const addressEl = document.getElementById('walletAddress');

    if (connectArea) connectArea.style.display = 'none';
    if (addressArea) addressArea.style.display = 'block';
    if (badge) {
        badge.textContent = '연결됨';
        badge.classList.add('connected');
    }
    if (addressEl) {
        addressEl.textContent = shortenAddress(address);
        addressEl.dataset.full = address;
    }

    // 잔액 자동 로드
    refreshTokenBalances();
}

// ========================================
// 잔액 조회
// ========================================

// KAIA 네이티브 토큰 잔액
async function getKaiaBalance(address) {
    if (!walletProvider || !address) return 0;

    try {
        const balanceHex = await walletProvider.request({
            method: 'kaia_getBalance',
            params: [address, 'latest']
        });
        const balancePeb = BigInt(balanceHex);
        return Number(balancePeb) / 1e18;
    } catch (error) {
        console.error('[Kaia] KAIA 잔액 조회 실패:', error);
        return 0;
    }
}

// ERC-20 토큰 잔액 (USDT)
async function getUSDTBalance(address) {
    if (!walletProvider || !address) return 0;

    try {
        const balanceHex = await walletProvider.getErc20TokenBalance(
            KAIA_CONFIG.contracts.USDT,
            address
        );
        const balanceBigInt = BigInt(balanceHex);
        return Number(balanceBigInt) / Math.pow(10, KAIA_CONFIG.decimals.USDT);
    } catch (error) {
        console.error('[Kaia] USDT 잔액 조회 실패:', error);
        return 0;
    }
}

// 전체 잔액 새로고침 → UI 업데이트
async function refreshTokenBalances() {
    if (!connectedAddress) return;

    // 개발 모드: 목업 잔액
    if (!isKaiaInitialized) {
        updateTokenBalanceUI(0.00, 0.00);
        return;
    }

    try {
        const [kaiaBalance, usdtBalance] = await Promise.all([
            getKaiaBalance(connectedAddress),
            getUSDTBalance(connectedAddress)
        ]);

        updateTokenBalanceUI(usdtBalance, kaiaBalance);
        console.log('[Kaia] 잔액 조회:', { USDT: usdtBalance, KAIA: kaiaBalance });
    } catch (error) {
        console.error('[Kaia] 잔액 새로고침 실패:', error);
    }
}

// 잔액 UI 업데이트
function updateTokenBalanceUI(usdt, kaia) {
    const usdtEl = document.getElementById('walletUSDT');
    const kaiaEl = document.getElementById('walletKAIA');
    if (usdtEl) usdtEl.textContent = usdt.toFixed(2);
    if (kaiaEl) kaiaEl.textContent = kaia.toFixed(2);
}

// ========================================
// 토큰 클레임 (트랜잭션)
// ========================================

// 클레임 실행 (향후 스마트 컨트랙트 연동)
async function claimTokenOnChain(tokenType) {
    if (!connectedAddress) {
        showToast('먼저 지갑을 연결해주세요');
        return false;
    }

    // 개발 모드: 목업 클레임
    if (!isKaiaInitialized) {
        console.log('[Kaia] 개발 모드 → 목업 클레임:', tokenType);
        return true;  // 성공으로 처리 → ui.js의 claimToken()에서 UI 업데이트
    }

    try {
        showToast(tokenType.toUpperCase() + ' 클레임 처리 중...');

        // TODO: 실제 스마트 컨트랙트 클레임 함수 호출
        // 아래는 예시 구조 — 실제 클레임 컨트랙트 배포 후 주소와 ABI 교체 필요
        //
        // const claimContractAddress = '0x...'; // 클레임 컨트랙트 주소
        // const claimFunctionSelector = '0x4e71d92d'; // claim() 함수 시그니처
        //
        // const txHash = await walletProvider.request({
        //     method: 'kaia_sendTransaction',
        //     params: [{
        //         from: connectedAddress,
        //         to: claimContractAddress,
        //         value: '0x0',
        //         gas: '0xF4240',
        //         data: claimFunctionSelector
        //     }]
        // });
        //
        // console.log('[Kaia] 클레임 TX:', txHash);
        // await waitForReceipt(txHash);

        // 임시: 클레임 성공 처리
        console.log('[Kaia] 클레임 요청 (컨트랙트 미배포 → 목업 성공)');
        return true;

    } catch (error) {
        console.error('[Kaia] 클레임 실패:', error);
        if (error.code === 4001) {
            showToast('클레임을 취소했습니다');
        } else {
            showToast('클레임에 실패했습니다');
        }
        return false;
    }
}

// 트랜잭션 영수증 대기 (유틸리티)
async function waitForReceipt(txHash, maxAttempts) {
    maxAttempts = maxAttempts || 30;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const receipt = await walletProvider.request({
                method: 'kaia_getTransactionReceipt',
                params: [txHash]
            });
            if (receipt) {
                return receipt;
            }
        } catch (e) {
            // 아직 마이닝 중
        }
        await new Promise(function(resolve) { setTimeout(resolve, 2000); });
    }
    throw new Error('트랜잭션 확인 시간 초과');
}

// ========================================
// 유틸리티
// ========================================

// 주소 축약 표시 (0x1234...abcd)
function shortenAddress(address) {
    if (!address) return '-';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

// 지갑 연결 상태 확인
function isWalletConnected() {
    return !!connectedAddress;
}

// 연결된 지갑 주소 가져오기
function getConnectedAddress() {
    return connectedAddress;
}
