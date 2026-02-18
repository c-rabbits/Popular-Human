// ========================================
// 앱 설정 (config.js)
// Supabase 연동 시 여기에 URL과 anon key를 설정하세요.
// 실제 값은 환경 변수 또는 빌드 시 치환하는 것을 권장합니다.
// ========================================

const CONFIG = {
    // Supabase 사용 여부 (true 시 api.js에서 Supabase 호출 사용)
    // USE_SUPABASE는 앱(유저) 전용. 관리자 화면에는 Supabase 키를 두지 말고, 추후 관리자 API(서버에서 service_role)에서만 사용.
    USE_SUPABASE: true,

    // Supabase Project URL (예: https://xxxxx.supabase.co)
    SUPABASE_URL: 'https://iqkkbulxmjpjrbyuyjqp.supabase.co',

    // line-auth Edge Function URL (LIFF 토큰 → JWT 교환)
    LINE_AUTH_URL: 'https://iqkkbulxmjpjrbyuyjqp.supabase.co/functions/v1/line-auth',

    // Supabase anon public key
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxa2tidWx4bWpwanJieXV5anFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTQ1NTksImV4cCI6MjA4Njk3MDU1OX0.snrLD81NXrIyGdyNOEJlIA1ktvDE_2Sy43_895U_p4w'
};
