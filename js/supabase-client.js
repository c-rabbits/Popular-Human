// ========================================
// Supabase 클라이언트 (supabase-client.js)
// config.js 로드 후, CONFIG.USE_SUPABASE === true 일 때만 사용합니다.
// ========================================

let supabase = null;

function getSupabase() {
    if (supabase !== null) return supabase;
    if (typeof CONFIG === 'undefined' || !CONFIG.USE_SUPABASE || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
        return null;
    }
    if (typeof window.supabase === 'undefined') {
        console.warn('[Supabase] supabase-js 미로드. index.html에 추가: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
        return null;
    }
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return supabase;
}

// 세션 설정 (Edge Function에서 받은 JWT로 로그인한 뒤 호출)
function setSupabaseSession(accessToken, refreshToken) {
    const sb = getSupabase();
    if (!sb) return Promise.resolve();
    return sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' });
}

// 현재 로그인된 사용자 ID (JWT sub = line_user_id 로 가정). 비동기.
async function getSupabaseUserId() {
    const sb = getSupabase();
    if (!sb) return null;
    try {
        const { data } = await sb.auth.getSession();
        const jwt = data?.session?.access_token;
        if (!jwt) return null;
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.sub || null;
    } catch (e) {
        return null;
    }
}
