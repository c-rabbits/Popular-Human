-- ========================================
-- Human Experiment – Supabase 초기 스키마
-- ========================================

-- 확장 (uuid 등)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------
-- 1. 프로필 (LINE 유저)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_user_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    picture_url TEXT,
    nickname TEXT,
    use_default_name BOOLEAN DEFAULT true,
    cash INTEGER NOT NULL DEFAULT 0,
    reward_points INTEGER NOT NULL DEFAULT 0,
    tickets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);

-- ----------------------------------------
-- 2. 이벤트 (시나리오)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id TEXT NOT NULL,
    title TEXT NOT NULL,
    banner_image_url TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reward_usdt NUMERIC(10,2) NOT NULL DEFAULT 0,
    play_time_minutes INTEGER NOT NULL DEFAULT 10,
    required_tickets INTEGER NOT NULL DEFAULT 1,
    question_count INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','live','ended','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- ----------------------------------------
-- 3. 이벤트 문제 (4지선다, 정답은 이벤트 종료 후 저장)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS event_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    text TEXT NOT NULL,
    choices JSONB NOT NULL DEFAULT '[]',  -- ["보기1","보기2","보기3","보기4"]
    correct_index INTEGER,                 -- 이벤트 종료 후 채움 (0~3)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_questions_event_id ON event_questions(event_id);

-- ----------------------------------------
-- 4. 게임 참여
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    line_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing','completed','abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_event_id ON games(event_id);
CREATE INDEX IF NOT EXISTS idx_games_line_user_id ON games(line_user_id);

-- ----------------------------------------
-- 5. 게임 답안
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS game_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,  -- 0-based
    selected_index INTEGER NOT NULL,  -- 0~3
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_answers_game_id ON game_answers(game_id);

-- ----------------------------------------
-- 6. 배너
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT,
    image_data TEXT,           -- data URL 등 (업로드 시)
    link_type TEXT NOT NULL DEFAULT 'none' CHECK (link_type IN ('internal','external','none')),
    link_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- 7. 친구 초대
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_line_user_id TEXT NOT NULL,
    invited_line_user_id TEXT NOT NULL,
    reward_claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(inviter_line_user_id, invited_line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_line_user_id);

-- ----------------------------------------
-- RLS (Row Level Security)
-- ----------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- JWT의 sub에 line_user_id가 들어온다고 가정 (Edge Function에서 발급한 커스텀 JWT)
-- auth.jwt()->>'sub' = line_user_id

-- profiles: 본인만 읽기/쓰기
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (line_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (line_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (line_user_id = (auth.jwt()->>'sub'));

-- events: 공개 읽기 (live/scheduled 등)
CREATE POLICY "events_select_all" ON events
    FOR SELECT USING (true);

-- event_questions: 공개 읽기
CREATE POLICY "event_questions_select_all" ON event_questions
    FOR SELECT USING (true);

-- games: 본인만 읽기/쓰기
CREATE POLICY "games_select_own" ON games
    FOR SELECT USING (line_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "games_insert_own" ON games
    FOR INSERT WITH CHECK (line_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "games_update_own" ON games
    FOR UPDATE USING (line_user_id = (auth.jwt()->>'sub'));

-- game_answers: 본인 게임만 (game_id가 본인 games에 속할 때)
CREATE POLICY "game_answers_select_own" ON game_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM games g WHERE g.id = game_answers.game_id AND g.line_user_id = (auth.jwt()->>'sub'))
    );

CREATE POLICY "game_answers_insert_own" ON game_answers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM games g WHERE g.id = game_answers.game_id AND g.line_user_id = (auth.jwt()->>'sub'))
    );

-- banners: 공개 읽기
CREATE POLICY "banners_select_all" ON banners
    FOR SELECT USING (true);

-- invites: 본인 관련만 읽기/쓰기
CREATE POLICY "invites_select_own" ON invites
    FOR SELECT USING (
        inviter_line_user_id = (auth.jwt()->>'sub') OR invited_line_user_id = (auth.jwt()->>'sub')
    );

CREATE POLICY "invites_insert_own" ON invites
    FOR INSERT WITH CHECK (inviter_line_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "invites_update_own" ON invites
    FOR UPDATE USING (inviter_line_user_id = (auth.jwt()->>'sub'));

-- 관리자(events/banners insert/update/delete)는 service_role로만 수행.
-- anon 키로는 위 정책만 적용되므로 관리자 테이블 쓰기는 막혀 있음.

-- updated_at 자동 갱신 (profiles, events, banners)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
