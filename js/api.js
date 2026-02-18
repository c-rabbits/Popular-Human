// ========================================
// API 모듈 (api.js)
// ========================================
// Supabase 분기: config.js + supabase-client.js 로드 후, CONFIG.USE_SUPABASE === true 이고
// getSupabase() 가 null 이 아닐 때만 Supabase 호출. 그 외에는 기존 목업 실행.

function useSupabase() {
    return typeof CONFIG !== 'undefined' && CONFIG.USE_SUPABASE && typeof getSupabase === 'function' && getSupabase() !== null;
}

const API = {
    // 베이스 URL (실제 서버 주소로 변경 필요)
    baseURL: 'https://api.popularhuman.com',

    // 유저 정보 가져오기
    async getUserInfo() {
        try {
            // ----- Supabase 분기 (로드 순서: config.js → supabase-js → supabase-client.js → api.js) -----
            if (useSupabase()) {
                const sb = getSupabase();
                const lineUserId = (liffProfile && liffProfile.userId) || (typeof getSupabaseUserId === 'function' ? await getSupabaseUserId() : null);
                if (sb && lineUserId) {
                    const { data: profile, error } = await sb.from('profiles').select('*').eq('line_user_id', lineUserId).maybeSingle();
                    if (!error && profile) {
                        console.log('[API] getUserInfo: Supabase profiles에서 로드');
                        const uidSuffix = (profile.line_user_id || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                        return {
                            userId: lineUserId,
                            displayName: profile.display_name || (liffProfile && liffProfile.displayName) || '',
                            pictureUrl: profile.picture_url || (liffProfile && liffProfile.pictureUrl) || '',
                            statusMessage: (liffProfile && liffProfile.statusMessage) || '',
                            characterName: profile.display_name || (liffProfile && liffProfile.displayName) || '실험러버',
                            nickname: profile.nickname || undefined,
                            cash: profile.cash != null ? profile.cash : 0,
                            rewardPoints: profile.reward_points != null ? profile.reward_points : 0,
                            tickets: profile.tickets != null ? profile.tickets : 0,
                            uid: 'PH-' + (uidSuffix || 'USER'),
                            walletAddress: typeof getConnectedAddress === 'function' ? (getConnectedAddress() || '') : '',
                            tokenBalance: { usdt: 0, kaia: 0 },
                            claimable: { usdt: 0, kaia: 0 }
                        };
                    }
                    if (error) console.error('[API] getUserInfo Supabase error', error);
                }
            }

            // ----- 기존 목업 -----
            const userId = liffProfile ? liffProfile.userId : 'user123';
            const uidSuffix = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
            const uid = 'PH-' + uidSuffix;
            const walletAddress = typeof getConnectedAddress === 'function' ? (getConnectedAddress() || '') : '';
            const nickname = (typeof localStorage !== 'undefined' && localStorage.getItem('ph_nickname')) || undefined;
            return {
                userId: userId,
                displayName: liffProfile ? liffProfile.displayName : '실험러버',
                pictureUrl: liffProfile ? liffProfile.pictureUrl : '',
                statusMessage: liffProfile ? (liffProfile.statusMessage || '') : '',
                characterName: liffProfile ? liffProfile.displayName : '실험러버',
                nickname: nickname,
                cash: 1250,
                rewardPoints: 850,
                tickets: 5,
                uid: uid,
                walletAddress: walletAddress,
                tokenBalance: { usdt: 0.00, kaia: 0.00 },
                claimable: { usdt: 12.50, kaia: 150.00 }
            };
        } catch (error) {
            console.error('유저 정보 로드 실패:', error);
            return null;
        }
    },

    // 시나리오 목록 가져오기
    async getScenarios() {
        try {
            // const response = await fetch(`${this.baseURL}/scenarios`);
            // return await response.json();

            // 임시 데이터는 하단 scenarios 객체 사용
            return scenarios;
        } catch (error) {
            console.error('시나리오 로드 실패:', error);
            return null;
        }
    },

    // 게임 시작 (티켓 차감)
    async startGame(scenarioId) {
        try {
            // const response = await fetch(`${this.baseURL}/game/start`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${getLIFFToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ scenarioId })
            // });
            // return await response.json();

            // 임시: 티켓 차감
            const currentTickets = parseInt(document.getElementById('ticketCount').textContent);
            if (currentTickets > 0) {
                updateUserStats({ tickets: currentTickets - 1 });
                return { success: true, gameId: 'game_' + Date.now() };
            }
            return { success: false, message: '티켓이 부족합니다' };
        } catch (error) {
            console.error('게임 시작 실패:', error);
            return { success: false };
        }
    },

    // 답변 제출
    async submitAnswer(gameId, questionId, answer) {
        try {
            // const response = await fetch(`${this.baseURL}/game/answer`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${getLIFFToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ gameId, questionId, answer })
            // });
            // return await response.json();

            // 임시: 로컬 처리
            return { success: true };
        } catch (error) {
            console.error('답변 제출 실패:', error);
            return { success: false };
        }
    },

    // 게임 완료 및 결과 받기
    async completeGame(gameId, answers) {
        try {
            // const response = await fetch(`${this.baseURL}/game/complete`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${getLIFFToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ gameId, answers })
            // });
            // return await response.json();

            // 임시: 로컬 계산
            return {
                status: 'pending', // 'pending' | 'complete'
                correctCount: correctCount,
                totalQuestions: currentScenario.questions.length,
                totalParticipants: 128492,
                eventTimeLeft: 6138, // 초 단위
                // 이벤트 종료 후 추가 데이터
                isWinner: false,
                earnedCash: 0,
                earnedPoints: 0,
                rewardAmount: 0,
                totalWinners: 0,
                questionResults: [] // 문제별 상세 결과
            };
        } catch (error) {
            console.error('게임 완료 처리 실패:', error);
            return null;
        }
    },

    // 알림 설정 (푸시 허용 + 알림 받을 시간대 전달)
    async setNotification(enabled, options = {}) {
        try {
            const settings = typeof getSettings === 'function' ? getSettings() : {};
            const start = options.notificationStartTime ?? settings.notificationStartTime ?? '09:00';
            const end = options.notificationEndTime ?? settings.notificationEndTime ?? '21:00';
            // const response = await fetch(`${this.baseURL}/user/notification`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${getLIFFToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ enabled, notificationStartTime: start, notificationEndTime: end })
            // });
            // return await response.json();
            console.log('[API] setNotification', { enabled, notificationStartTime: start, notificationEndTime: end });
            return { success: true };
        } catch (error) {
            console.error('알림 설정 실패:', error);
            return { success: false };
        }
    },

    // 이벤트 종료 후 결과 조회
    async getEventResult(gameId) {
        try {
            // const response = await fetch(`${this.baseURL}/game/result/${gameId}`, {
            //     headers: { 'Authorization': `Bearer ${getLIFFToken()}` }
            // });
            // return await response.json();

            // 임시: 승자 데이터
            const isWinner = Math.random() > 0.5;

            // 임시: 최종 승자 리스트 목업 (실서버에서는 /game/result 응답에 winners 포함)
            const mockWinners = [
                { profileImageUrl: liffProfile && liffProfile.pictureUrl ? liffProfile.pictureUrl : '', nickname: 'HE1등' },
                { profileImageUrl: '', nickname: '트렌드마스터' },
                { profileImageUrl: '', nickname: '선택왕' },
                { profileImageUrl: '', nickname: '인간독해기' },
                { profileImageUrl: '', nickname: '맞춤왕' }
            ];

            return {
                status: 'complete',
                isWinner: isWinner,
                correctCount: isWinner ? 10 : 7,
                totalQuestions: 10,
                rewardAmount: isWinner ? 32.4 : 0,
                totalWinners: 124,
                winners: mockWinners,
                topPercentile: 38,
                questionResults: currentScenario.questions.map((q, idx) => {
                    const userAnswer = userAnswers[idx];
                    const correctAnswer = q.correct;
                    const isCorrect = userAnswer === correctAnswer;

                    return {
                        questionNumber: idx + 1,
                        question: q.q,
                        userAnswer: q.options[userAnswer],
                        correctAnswer: q.options[correctAnswer],
                        isCorrect: isCorrect,
                        userPercentage: Math.floor(Math.random() * 30) + 20,
                        correctPercentage: Math.floor(Math.random() * 30) + 40
                    };
                })
            };
        } catch (error) {
            console.error('결과 조회 실패:', error);
            return null;
        }
    }
};
