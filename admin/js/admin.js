// ========================================
// 인간실험 관리자 페이지 – 이벤트 CRUD
// 서버 연동 시 AdminAPI.* 호출을 실제 fetch로 교체하면 됨.
// ========================================

// 관리자 비밀번호 (프로토타입용). 서버 연동 시 로그인 API로 대체.
const ADMIN_PASSWORD = 'admin123';

const STATUS_LABELS = {
    draft: '초안',
    scheduled: '예정',
    live: '진행 중',
    ended: '종료',
    cancelled: '취소'
};

// ----------------------------------------
// API 레이어 (목업 ↔ 실제 서버 전환용)
// ----------------------------------------
const AdminAPI = {
    baseURL: 'https://api.popularhuman.com',

    async getEvents(filters = {}) {
        // TODO: 서버 연동 시
        // const q = new URLSearchParams(filters).toString();
        // const res = await fetch(`${this.baseURL}/admin/events?${q}`, { credentials: 'include' });
        // return res.json();
        return getMockEvents();
    },

    async getEvent(id) {
        // const res = await fetch(`${this.baseURL}/admin/events/${id}`, { credentials: 'include' });
        // return res.json();
        const list = getMockEvents();
        return list.find(e => e.id === id) || null;
    },

    async createEvent(body) {
        // const res = await fetch(`${this.baseURL}/admin/events`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     credentials: 'include',
        //     body: JSON.stringify(body)
        // });
        // return res.json();
        return addMockEvent(body);
    },

    async updateEvent(id, body) {
        // const res = await fetch(`${this.baseURL}/admin/events/${id}`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     credentials: 'include',
        //     body: JSON.stringify(body)
        // });
        // return res.json();
        return updateMockEvent(id, body);
    },

    async deleteEvent(id) {
        // await fetch(`${this.baseURL}/admin/events/${id}`, { method: 'DELETE', credentials: 'include' });
        return deleteMockEvent(id);
    }
};

// ----------------------------------------
// 목업 저장소 (localStorage 사용, 서버 연동 전까지)
// ----------------------------------------
const STORAGE_KEY = 'ph_admin_events';

function getMockEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return getDefaultMockEvents();
}

function getDefaultMockEvents() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [
        {
            id: 'evt_mock1',
            scenarioId: 'sample-1',
            title: '샘플 이벤트 1',
            startAt: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
            rewardUsdt: 50,
            playTimeMinutes: 10,
            requiredTickets: 1,
            questionCount: 10,
            status: 'scheduled',
            bannerImageUrl: '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        },
        {
            id: 'evt_mock2',
            scenarioId: 'sample-2',
            title: '샘플 이벤트 2',
            startAt: new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(today.getTime() + 21 * 60 * 60 * 1000).toISOString(),
            rewardUsdt: 50,
            playTimeMinutes: 10,
            requiredTickets: 1,
            questionCount: 10,
            status: 'scheduled',
            bannerImageUrl: '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        }
    ];
}

function saveMockEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function addMockEvent(body) {
    const events = getMockEvents();
    const newEvent = {
        id: 'evt_' + Date.now(),
        scenarioId: (body.scenarioId || '').trim(),
        title: (body.title || '').trim(),
        startAt: body.startAt,
        endAt: body.endAt,
        rewardUsdt: Number(body.rewardUsdt),
        playTimeMinutes: Number(body.playTimeMinutes),
        requiredTickets: Number(body.requiredTickets),
        questionCount: Number(body.questionCount),
        status: body.status || 'scheduled',
        bannerImageUrl: body.bannerImageUrl || '',
        questions: Array.isArray(body.questions) ? body.questions : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    events.push(newEvent);
    saveMockEvents(events);
    return newEvent;
}

function updateMockEvent(id, body) {
    const events = getMockEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    events[idx] = {
        ...events[idx],
        scenarioId: (body.scenarioId || '').trim(),
        title: (body.title || '').trim(),
        startAt: body.startAt,
        endAt: body.endAt,
        rewardUsdt: Number(body.rewardUsdt),
        playTimeMinutes: Number(body.playTimeMinutes),
        requiredTickets: Number(body.requiredTickets),
        questionCount: Number(body.questionCount),
        status: body.status || 'scheduled',
        bannerImageUrl: body.bannerImageUrl !== undefined ? body.bannerImageUrl : events[idx].bannerImageUrl,
        questions: Array.isArray(body.questions) ? body.questions : (events[idx].questions || []),
        updatedAt: new Date().toISOString()
    };
    saveMockEvents(events);
    return events[idx];
}

function deleteMockEvent(id) {
    const events = getMockEvents().filter(e => e.id !== id);
    saveMockEvents(events);
    return { success: true };
}

// ----------------------------------------
// 로그인
// ----------------------------------------
const SESSION_KEY = 'ph_admin_session';

function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('adminPassword');
    const hint = document.getElementById('loginHint');
    const pwd = (input && input.value) || '';
    if (pwd === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminMain').classList.remove('hidden');
        if (hint) hint.textContent = '';
        refreshEventList();
        return false;
    }
    if (hint) hint.textContent = '비밀번호가 올바르지 않습니다.';
    return false;
}

function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('adminMain').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginHint').textContent = '';
}

function checkSession() {
    if (sessionStorage.getItem(SESSION_KEY)) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminMain').classList.remove('hidden');
        refreshEventList();
    }
}

// ----------------------------------------
// 패널 전환
// ----------------------------------------
function switchPanel(panel) {
    document.querySelectorAll('.admin-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === panel);
    });
    var navPanel = panel;
    if (panel === 'eventForm') navPanel = 'eventList';
    if (panel === 'bannerForm') navPanel = 'bannerList';
    document.querySelectorAll('.admin-nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.panel === navPanel);
    });
    if (panel === 'eventList') refreshEventList();
    if (panel === 'members') refreshMemberList();
    if (panel === 'bannerList') refreshBannerList();
    if (panel === 'settings') loadSettings();
}

// ----------------------------------------
// 목록
// ----------------------------------------
function refreshEventList() {
    const statusFilter = document.getElementById('filterStatus').value;
    const scenarioFilter = (document.getElementById('filterScenario').value || '').trim();

    AdminAPI.getEvents().then(events => {
        let list = events;
        if (statusFilter) list = list.filter(e => e.status === statusFilter);
        if (scenarioFilter) list = list.filter(e => (e.scenarioId || '').toLowerCase().includes(scenarioFilter.toLowerCase()));
        renderEventList(list);
    }).catch(() => renderEventList([]));
}

function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderEventList(events) {
    const tbody = document.getElementById('eventListBody');
    const emptyEl = document.getElementById('listEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (events.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    events.forEach(evt => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(evt.title) + '</td>' +
            '<td>' + escapeHtml(evt.scenarioId) + '</td>' +
            '<td>' + formatDateTime(evt.startAt) + '</td>' +
            '<td>' + formatDateTime(evt.endAt) + '</td>' +
            '<td>' + evt.rewardUsdt + '</td>' +
            '<td><span class="status-badge status-' + evt.status + '">' + (STATUS_LABELS[evt.status] || evt.status) + '</span></td>' +
            '<td>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="editEvent(\'' + evt.id + '\')">수정</button> ' +
            '<button type="button" class="btn btn-danger btn-sm" onclick="openDeleteModal(\'' + evt.id + '\', \'' + escapeHtml(evt.title).replace(/'/g, "\\'") + '\')">삭제</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ----------------------------------------
// 폼 (추가/수정)
// ----------------------------------------
function setFormMode(mode, eventId) {
    const form = document.getElementById('eventForm');
    const titleEl = document.getElementById('formPanelTitle');
    const idEl = document.getElementById('eventId');
    const submitBtn = document.getElementById('formSubmitBtn');
    if (!form) return;

    form.reset();
    idEl.value = '';

    if (mode === 'add') {
        titleEl.textContent = '이벤트 추가';
        submitBtn.textContent = '저장';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventScenarioId').value = '';
        var bannerDataEl = document.getElementById('eventBannerImageData');
        var bannerPreview = document.getElementById('eventBannerPreview');
        var bannerFileEl = document.getElementById('eventBannerImageFile');
        if (bannerDataEl) bannerDataEl.value = '';
        if (bannerPreview) { bannerPreview.style.backgroundImage = ''; bannerPreview.classList.remove('has-image'); }
        if (bannerFileEl) bannerFileEl.value = '';
        document.getElementById('eventRewardUsdt').value = 50;
        document.getElementById('eventPlayTimeMinutes').value = 10;
        document.getElementById('eventRequiredTickets').value = 1;
        document.getElementById('eventQuestionCount').value = 10;
        document.getElementById('eventStatus').value = 'scheduled';
        clearEventQuestions();
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000);
        const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        document.getElementById('eventStartAt').value = formatDateTimeLocal(start);
        document.getElementById('eventEndAt').value = formatDateTimeLocal(end);
        return;
    }

    if (mode === 'edit' && eventId) {
        titleEl.textContent = '이벤트 수정';
        submitBtn.textContent = '수정 저장';
        idEl.value = eventId;
        AdminAPI.getEvent(eventId).then(evt => {
            if (!evt) return;
            document.getElementById('eventTitle').value = evt.title || '';
            document.getElementById('eventScenarioId').value = evt.scenarioId || '';
            var bannerDataEl = document.getElementById('eventBannerImageData');
            var bannerPreview = document.getElementById('eventBannerPreview');
            var bannerFileEl = document.getElementById('eventBannerImageFile');
            if (bannerFileEl) bannerFileEl.value = '';
            if (evt.bannerImageUrl && evt.bannerImageUrl.indexOf('data:') === 0) {
                if (bannerDataEl) bannerDataEl.value = evt.bannerImageUrl;
                if (bannerPreview) {
                    bannerPreview.style.backgroundImage = 'url(' + evt.bannerImageUrl + ')';
                    bannerPreview.classList.add('has-image');
                }
            } else {
                if (bannerDataEl) bannerDataEl.value = '';
                if (bannerPreview) { bannerPreview.style.backgroundImage = ''; bannerPreview.classList.remove('has-image'); }
            }
            document.getElementById('eventStartAt').value = formatDateTimeLocal(evt.startAt);
            document.getElementById('eventEndAt').value = formatDateTimeLocal(evt.endAt);
            document.getElementById('eventRewardUsdt').value = evt.rewardUsdt;
            document.getElementById('eventPlayTimeMinutes').value = evt.playTimeMinutes;
            document.getElementById('eventRequiredTickets').value = evt.requiredTickets;
            document.getElementById('eventQuestionCount').value = evt.questionCount;
            document.getElementById('eventStatus').value = evt.status;
            fillEventQuestions(evt.questions);
        });
    }
}

function formatDateTimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + 'T' + h + ':' + min;
}

function editEvent(id) {
    setFormMode('edit', id);
    switchPanel('eventForm');
}

function collectEventQuestions() {
    const questions = [];
    for (let i = 1; i <= 10; i++) {
        const textEl = document.getElementById('eventQ' + i);
        const choices = [
            (document.getElementById('eventQ' + i + 'A1') || {}).value || '',
            (document.getElementById('eventQ' + i + 'A2') || {}).value || '',
            (document.getElementById('eventQ' + i + 'A3') || {}).value || '',
            (document.getElementById('eventQ' + i + 'A4') || {}).value || ''
        ];
        const text = (textEl && textEl.value) ? textEl.value.trim() : '';
        questions.push({ text: text, choices: choices });
    }
    return questions;
}

function fillEventQuestions(questions) {
    if (!Array.isArray(questions)) return;
    for (let i = 0; i < Math.min(10, questions.length); i++) {
        const q = questions[i];
        const textEl = document.getElementById('eventQ' + (i + 1));
        if (textEl) textEl.value = (q.text || '');
        for (let c = 0; c < 4; c++) {
            const choiceEl = document.getElementById('eventQ' + (i + 1) + 'A' + (c + 1));
            if (choiceEl) choiceEl.value = (q.choices && q.choices[c]) ? q.choices[c] : '';
        }
    }
}

function clearEventQuestions() {
    for (let i = 1; i <= 10; i++) {
        const textEl = document.getElementById('eventQ' + i);
        if (textEl) textEl.value = '';
        for (let c = 1; c <= 4; c++) {
            const choiceEl = document.getElementById('eventQ' + i + 'A' + c);
            if (choiceEl) choiceEl.value = '';
        }
    }
}

function saveEvent(e) {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const bannerDataEl = document.getElementById('eventBannerImageData');
    const bannerImageUrl = (bannerDataEl && bannerDataEl.value) ? bannerDataEl.value.trim() : '';
    const body = {
        title: document.getElementById('eventTitle').value,
        scenarioId: document.getElementById('eventScenarioId').value,
        bannerImageUrl: bannerImageUrl,
        startAt: new Date(document.getElementById('eventStartAt').value).toISOString(),
        endAt: new Date(document.getElementById('eventEndAt').value).toISOString(),
        rewardUsdt: document.getElementById('eventRewardUsdt').value,
        playTimeMinutes: document.getElementById('eventPlayTimeMinutes').value,
        requiredTickets: document.getElementById('eventRequiredTickets').value,
        questionCount: document.getElementById('eventQuestionCount').value,
        status: document.getElementById('eventStatus').value,
        questions: collectEventQuestions()
    };

    const promise = id ? AdminAPI.updateEvent(id, body) : AdminAPI.createEvent(body);
    promise.then(() => {
        switchPanel('eventList');
        refreshEventList();
    }).catch(err => {
        alert('저장 실패: ' + (err && err.message ? err.message : '알 수 없음'));
    });
    return false;
}

// ----------------------------------------
// 삭제 모달
// ----------------------------------------
let deleteTargetId = null;

function openDeleteModal(id, title) {
    deleteTargetId = id;
    const msg = document.getElementById('deleteModalMessage');
    if (msg) msg.textContent = '「' + (title || id) + '」 이벤트를 삭제하시겠습니까?';
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteConfirmBtn').onclick = confirmDelete;
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDelete() {
    if (!deleteTargetId) return;
    AdminAPI.deleteEvent(deleteTargetId).then(() => {
        closeDeleteModal();
        refreshEventList();
    }).catch(() => alert('삭제 실패'));
}

// ----------------------------------------
// 회원 관리 (목업 localStorage)
// ----------------------------------------
var STORAGE_KEY_MEMBERS = 'ph_admin_members';

function getMockMembers() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    var defaultList = [
        { id: 'user_1', userId: 'U1111', nickname: '테스트유저1', joinedAt: '2025-02-01T10:00:00Z', cash: 1250, tickets: 5, rewardPoints: 850, blocked: false },
        { id: 'user_2', userId: 'U2222', nickname: '실험러버', joinedAt: '2025-02-05T14:30:00Z', cash: 3200, tickets: 12, rewardPoints: 1200, blocked: false },
        { id: 'user_3', userId: 'U3333', nickname: '퀴즈왕', joinedAt: '2025-02-10T09:15:00Z', cash: 500, tickets: 2, rewardPoints: 400, blocked: false }
    ];
    saveMockMembers(defaultList);
    return defaultList;
}

function saveMockMembers(list) {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(list));
}

function updateMember(id, patch) {
    var list = getMockMembers();
    var idx = list.findIndex(function (m) { return m.id === id; });
    if (idx < 0) return null;
    if (patch.blocked !== undefined) list[idx].blocked = !!patch.blocked;
    if (patch.cash !== undefined) list[idx].cash = Math.max(0, (list[idx].cash || 0) + patch.cash);
    if (patch.tickets !== undefined) list[idx].tickets = Math.max(0, (list[idx].tickets || 0) + patch.tickets);
    if (patch.rewardPoints !== undefined) list[idx].rewardPoints = Math.max(0, (list[idx].rewardPoints || 0) + patch.rewardPoints);
    saveMockMembers(list);
    return list[idx];
}

function refreshMemberList() {
    var q = (document.getElementById('memberSearch') && document.getElementById('memberSearch').value) || '';
    q = q.trim().toLowerCase();
    var list = getMockMembers();
    if (q) list = list.filter(function (m) {
        return (m.nickname || '').toLowerCase().includes(q) || (m.userId || '').toLowerCase().includes(q);
    });
    renderMemberList(list);
}

function renderMemberList(members) {
    var tbody = document.getElementById('memberListBody');
    var emptyEl = document.getElementById('memberListEmpty');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (members.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    members.forEach(function (m) {
        var tr = document.createElement('tr');
        var status = m.blocked ? '<span class="status-badge status-cancelled">차단</span>' : '<span class="status-badge status-live">정상</span>';
        tr.innerHTML = '<td>' + escapeHtml(m.userId) + '</td><td>' + escapeHtml(m.nickname) + '</td><td>' + formatDateTime(m.joinedAt) + '</td><td>' + (m.cash || 0) + '</td><td>' + (m.tickets || 0) + '</td><td>' + (m.rewardPoints || 0) + '</td><td>' + status + '</td><td><button type="button" class="btn btn-outline btn-sm" onclick="openMemberModal(\'' + m.id + '\')">관리</button></td>';
        tbody.appendChild(tr);
    });
}

function openMemberModal(memberId) {
    var list = getMockMembers();
    var m = list.find(function (x) { return x.id === memberId; });
    if (!m) return;
    document.getElementById('memberModalId').value = m.id;
    document.getElementById('memberModalInfo').textContent = m.nickname + ' (' + m.userId + ')';
    document.getElementById('memberModalBlocked').checked = !!m.blocked;
    document.getElementById('memberModalCashCurrent').textContent = m.cash || 0;
    document.getElementById('memberModalTicketCurrent').textContent = m.tickets || 0;
    document.getElementById('memberModalRewardCurrent').textContent = m.rewardPoints || 0;
    document.getElementById('memberModalCashDelta').value = 0;
    document.getElementById('memberModalTicketDelta').value = 0;
    document.getElementById('memberModalRewardDelta').value = 0;
    document.getElementById('memberModal').classList.remove('hidden');
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.add('hidden');
}

function applyMemberDelta(field, sign) {
    var id = field === 'cash' ? 'memberModalCashDelta' : field === 'tickets' ? 'memberModalTicketDelta' : 'memberModalRewardDelta';
    var el = document.getElementById(id);
    var amount = (parseInt(el.value, 10) || 0) * sign;
    if (amount === 0) return;
    var memberId = document.getElementById('memberModalId').value;
    var patch = {};
    patch[field] = amount;
    updateMember(memberId, patch);
    var m = getMockMembers().find(function (x) { return x.id === memberId; });
    if (m) {
        document.getElementById('memberModalCashCurrent').textContent = m.cash || 0;
        document.getElementById('memberModalTicketCurrent').textContent = m.tickets || 0;
        document.getElementById('memberModalRewardCurrent').textContent = m.rewardPoints || 0;
    }
    el.value = 0;
    refreshMemberList();
}

function applyMemberAction() {
    var id = document.getElementById('memberModalId').value;
    var blocked = document.getElementById('memberModalBlocked').checked;
    updateMember(id, { blocked: blocked });
    closeMemberModal();
    refreshMemberList();
    alert('적용되었습니다.');
}

// ----------------------------------------
// 배너 관리 (목업 localStorage)
// ----------------------------------------
var STORAGE_KEY_BANNERS = 'ph_admin_banners';

function getMockBanners() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY_BANNERS);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
        { id: 'banner_1', imageUrl: 'Main_Banner_001.png', linkType: 'none', linkUrl: '', order: 0 },
        { id: 'banner_2', imageUrl: 'Main_Banner_002.png', linkType: 'external', linkUrl: 'https://example.com', order: 1 }
    ];
}

function saveMockBanners(banners) {
    localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(banners));
}

function refreshBannerList() {
    var list = getMockBanners().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    renderBannerList(list);
}

function renderBannerList(banners) {
    var tbody = document.getElementById('bannerListBody');
    var emptyEl = document.getElementById('bannerListEmpty');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (banners.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    var linkTypeLabel = { internal: '내부', external: '외부', none: '없음' };
    banners.forEach(function (b) {
        var tr = document.createElement('tr');
        var img = b.imageUrl ? '<div class="banner-thumb" style="background-image:url(\'' + escapeHtml(b.imageUrl) + '\')"></div>' : '-';
        tr.innerHTML = '<td>' + (b.order ?? 0) + '</td><td>' + img + '</td><td>' + (linkTypeLabel[b.linkType] || b.linkType) + '</td><td>' + escapeHtml(b.linkUrl || '-') + '</td><td><button type="button" class="btn btn-outline btn-sm" onclick="editBanner(\'' + b.id + '\')">수정</button> <button type="button" class="btn btn-danger btn-sm" onclick="openDeleteBannerModal(\'' + b.id + '\')">삭제</button></td>';
        tbody.appendChild(tr);
    });
}

function onEventBannerFileSelect(input) {
    var file = input && input.files && input.files[0];
    var dataEl = document.getElementById('eventBannerImageData');
    var preview = document.getElementById('eventBannerPreview');
    if (!preview || !dataEl) return;
    if (!file || !file.type.match(/^image\//)) {
        dataEl.value = '';
        preview.style.backgroundImage = '';
        preview.classList.remove('has-image');
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        dataEl.value = reader.result;
        preview.style.backgroundImage = 'url(' + reader.result + ')';
        preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function onBannerFileSelect(input) {
    var file = input && input.files && input.files[0];
    var dataEl = document.getElementById('bannerImageData');
    var urlEl = document.getElementById('bannerImageUrl');
    var preview = document.getElementById('bannerPreview');
    if (!preview || !dataEl) return;
    if (!file || !file.type.match(/^image\//)) {
        dataEl.value = '';
        preview.style.backgroundImage = '';
        preview.classList.remove('has-image');
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        dataEl.value = reader.result;
        preview.style.backgroundImage = 'url(' + reader.result + ')';
        preview.classList.add('has-image');
        urlEl.value = '';
    };
    reader.readAsDataURL(file);
}

function setBannerFormMode(mode, bannerId) {
    var form = document.getElementById('bannerForm');
    var titleEl = document.getElementById('bannerFormPanelTitle');
    var idEl = document.getElementById('bannerId');
    var dataEl = document.getElementById('bannerImageData');
    var fileEl = document.getElementById('bannerImageFile');
    var preview = document.getElementById('bannerPreview');
    if (!form) return;
    form.reset();
    idEl.value = '';
    if (dataEl) dataEl.value = '';
    if (fileEl) fileEl.value = '';
    if (preview) { preview.style.backgroundImage = ''; preview.classList.remove('has-image'); }
    if (mode === 'add') {
        titleEl.textContent = '배너 추가';
        document.getElementById('bannerOrder').value = 0;
        return;
    }
    if (mode === 'edit' && bannerId) {
        titleEl.textContent = '배너 수정';
        idEl.value = bannerId;
        var list = getMockBanners();
        var b = list.find(function (x) { return x.id === bannerId; });
        if (b) {
            var img = b.imageUrl || '';
            if (img && img.indexOf('data:') === 0) {
                dataEl.value = img;
                preview.style.backgroundImage = 'url(' + img + ')';
                preview.classList.add('has-image');
            } else {
                document.getElementById('bannerImageUrl').value = img;
                if (img) { preview.style.backgroundImage = 'url(' + escapeHtml(img) + ')'; preview.classList.add('has-image'); }
            }
            document.getElementById('bannerLinkType').value = b.linkType || 'none';
            document.getElementById('bannerLinkUrl').value = b.linkUrl || '';
            document.getElementById('bannerOrder').value = b.order ?? 0;
        }
    }
}

function editBanner(id) {
    setBannerFormMode('edit', id);
    switchPanel('bannerForm');
}

function saveBanner(e) {
    e.preventDefault();
    var id = document.getElementById('bannerId').value;
    var imageData = (document.getElementById('bannerImageData') && document.getElementById('bannerImageData').value) || '';
    var imageUrl = (document.getElementById('bannerImageUrl') && document.getElementById('bannerImageUrl').value) || '';
    var finalImage = imageData.trim() || imageUrl.trim();
    if (!finalImage) {
        alert('이미지를 업로드하거나 URL을 입력하세요.');
        return false;
    }
    var linkType = document.getElementById('bannerLinkType').value;
    var linkUrl = document.getElementById('bannerLinkUrl').value.trim();
    var order = parseInt(document.getElementById('bannerOrder').value, 10) || 0;
    var list = getMockBanners();
    if (id) {
        var idx = list.findIndex(function (x) { return x.id === id; });
        if (idx >= 0) {
            list[idx] = { ...list[idx], imageUrl: finalImage, linkType: linkType, linkUrl: linkUrl, order: order };
            saveMockBanners(list);
        }
    } else {
        list.push({ id: 'banner_' + Date.now(), imageUrl: finalImage, linkType: linkType, linkUrl: linkUrl, order: order });
        saveMockBanners(list);
    }
    switchPanel('bannerList');
    refreshBannerList();
    return false;
}

var deleteBannerTargetId = null;

function openDeleteBannerModal(id) {
    deleteBannerTargetId = id;
    document.getElementById('deleteBannerModalMessage').textContent = '이 배너를 삭제하시겠습니까?';
    document.getElementById('deleteBannerModal').classList.remove('hidden');
    document.getElementById('deleteBannerConfirmBtn').onclick = confirmDeleteBanner;
}

function closeDeleteBannerModal() {
    deleteBannerTargetId = null;
    document.getElementById('deleteBannerModal').classList.add('hidden');
}

function confirmDeleteBanner() {
    if (!deleteBannerTargetId) return;
    var list = getMockBanners().filter(function (b) { return b.id !== deleteBannerTargetId; });
    saveMockBanners(list);
    closeDeleteBannerModal();
    refreshBannerList();
}

// ----------------------------------------
// 설정 (localStorage)
// ----------------------------------------
var STORAGE_KEY_TERMS = 'ph_admin_terms';
var STORAGE_KEY_PRIVACY = 'ph_admin_privacy';
var STORAGE_KEY_NOTIFICATION = 'ph_admin_notification';

function loadSettings() {
    document.getElementById('settingTerms').value = localStorage.getItem(STORAGE_KEY_TERMS) || '';
    document.getElementById('settingPrivacy').value = localStorage.getItem(STORAGE_KEY_PRIVACY) || '';
    var notif = {};
    try {
        var raw = localStorage.getItem(STORAGE_KEY_NOTIFICATION);
        if (raw) notif = JSON.parse(raw);
    } catch (e) {}
    document.getElementById('settingNotificationStart').value = notif.start || '09:00';
    document.getElementById('settingNotificationEnd').value = notif.end || '21:00';
    refreshPushScheduledList();
}

// ----------------------------------------
// 푸시 발송 (즉시/예약)
// ----------------------------------------
var STORAGE_KEY_SCHEDULED_PUSHES = 'ph_admin_scheduled_pushes';

function getScheduledPushes() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY_SCHEDULED_PUSHES);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function saveScheduledPushes(list) {
    localStorage.setItem(STORAGE_KEY_SCHEDULED_PUSHES, JSON.stringify(list));
}

function refreshPushScheduledList() {
    var list = getScheduledPushes();
    var ul = document.getElementById('pushScheduledList');
    var wrap = document.getElementById('pushScheduledListWrap');
    if (!ul) return;
    ul.innerHTML = '';
    if (list.length === 0) {
        ul.innerHTML = '<li class="empty">예약된 푸시가 없습니다.</li>';
        return;
    }
    list.forEach(function (p, i) {
        var li = document.createElement('li');
        var at = p.scheduledAt ? formatDateTime(p.scheduledAt) : '즉시';
        li.innerHTML = '<strong>' + escapeHtml(p.title || '(제목 없음)') + '</strong> – ' + at + ' <button type="button" class="btn btn-outline btn-sm" onclick="removeScheduledPush(' + i + ')">삭제</button>';
        ul.appendChild(li);
    });
}

function removeScheduledPush(index) {
    var list = getScheduledPushes();
    list.splice(index, 1);
    saveScheduledPushes(list);
    refreshPushScheduledList();
}

function sendPushNow() {
    var title = (document.getElementById('pushTitle') && document.getElementById('pushTitle').value) || '';
    var body = (document.getElementById('pushBody') && document.getElementById('pushBody').value) || '';
    if (!title && !body) {
        alert('제목 또는 내용을 입력하세요.');
        return;
    }
    alert('즉시 발송은 서버/Firebase 연동 후 적용됩니다. 현재는 등록만 됩니다.');
    var list = getScheduledPushes();
    list.unshift({ title: title, body: body, scheduledAt: null, createdAt: new Date().toISOString() });
    saveScheduledPushes(list);
    refreshPushScheduledList();
}

function schedulePush() {
    var title = (document.getElementById('pushTitle') && document.getElementById('pushTitle').value) || '';
    var body = (document.getElementById('pushBody') && document.getElementById('pushBody').value) || '';
    var scheduledAt = (document.getElementById('pushScheduledAt') && document.getElementById('pushScheduledAt').value) || '';
    if (!title && !body) {
        alert('제목 또는 내용을 입력하세요.');
        return;
    }
    if (!scheduledAt) {
        alert('예약 일시를 선택하세요.');
        return;
    }
    var list = getScheduledPushes();
    list.push({ title: title, body: body, scheduledAt: new Date(scheduledAt).toISOString(), createdAt: new Date().toISOString() });
    saveScheduledPushes(list);
    refreshPushScheduledList();
    document.getElementById('pushTitle').value = '';
    document.getElementById('pushBody').value = '';
    document.getElementById('pushScheduledAt').value = '';
    alert('예약 발송이 등록되었습니다. 실제 발송은 서버/Firebase 연동 후 적용됩니다.');
}

function saveTerms() {
    localStorage.setItem(STORAGE_KEY_TERMS, document.getElementById('settingTerms').value);
    alert('이용약관이 저장되었습니다. 앱에서는 서버/API 연동 후 동일 내용이 노출됩니다.');
}

function savePrivacy() {
    localStorage.setItem(STORAGE_KEY_PRIVACY, document.getElementById('settingPrivacy').value);
    alert('개인정보처리방침이 저장되었습니다. 앱에서는 서버/API 연동 후 동일 내용이 노출됩니다.');
}

function saveNotificationSettings() {
    var start = document.getElementById('settingNotificationStart').value || '09:00';
    var end = document.getElementById('settingNotificationEnd').value || '21:00';
    localStorage.setItem(STORAGE_KEY_NOTIFICATION, JSON.stringify({ start: start, end: end }));
    alert('푸시 알림 시간대 기본값이 저장되었습니다. 실제 발송은 서버 연동 후 적용됩니다.');
}

// ----------------------------------------
// 초기화
// ----------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    checkSession();
});
