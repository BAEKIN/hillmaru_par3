/* =========================================================
   관리자 페이지: 로그인 게이트 + 예약 현황 (FR-03 ~ FR-06)
   ※ 주의: 정적 사이트 특성상 이 비밀번호 체크는 클라이언트에서만
   동작하는 접근 제어이며, 실제 보안 인증이 아닙니다.
   (명세서 9장 FE-02/FE-03 서버 인증 도입 전까지의 임시 조치)
   ========================================================= */

const ADMIN_PASSWORD = 'hillmaru2026!'; // 필요 시 이 값을 변경하세요
const ADMIN_SESSION_KEY = 'par3_admin_authed';

const adminGate = document.getElementById('adminGate');
const adminContent = document.getElementById('adminContent');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPassword = document.getElementById('adminPassword');
const adminGateError = document.getElementById('adminGateError');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

/* ---- FR-03: 일자별 타임테이블 조회 (예약시트 형태: NO/시간/예약자명/비고) ---- */
const ttDateInput = document.getElementById('ttDate');
const timetableTableBody = document.getElementById('timetableTableBody');
const timetableSubtotal = document.getElementById('timetableSubtotal');

ttDateInput.setAttribute('min', todayStr());
ttDateInput.value = todayStr();

function renderTimetable() {
  const date = ttDateInput.value || todayStr();
  const list = getReservations().filter(r => r.date === date);
  const byTime = {};
  list.forEach(r => { byTime[r.time] = r; });

  let bookedCount = 0;

  timetableTableBody.innerHTML = ALL_SLOTS.map((slot, i) => {
    const booked = byTime[slot];
    if (booked) bookedCount++;

    const note = booked
      ? `${escapeHtml(booked.players)}인${booked.memo ? ' · ' + escapeHtml(booked.memo) : ''}`
      : '';

    return `
      <tr class="${booked ? 'is-booked' : 'is-available'}">
        <td class="tt-sheet-no">${i + 1}</td>
        <td>${slot}</td>
        <td>${booked ? escapeHtml(booked.name) : ''}</td>
        <td class="memo-cell">${note}</td>
        <td>${booked ? `<button type="button" class="cancel-btn" data-id="${escapeHtml(booked.id)}">취소</button>` : ''}</td>
      </tr>
    `;
  }).join('');

  timetableSubtotal.textContent = `소계 : ${bookedCount}팀`;
}
ttDateInput.addEventListener('change', renderTimetable);

// 타임테이블에서 바로 취소 (예약된 행의 "취소" 버튼)
timetableTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;

  const id = btn.dataset.id;
  const list = getReservations();
  const target = list.find(r => r.id === id);
  if (!target) return;

  const ok = confirm(`${target.date} ${target.time} / ${target.name}님의 예약을 취소하시겠습니까?`);
  if (!ok) return;

  saveReservations(list.filter(r => r.id !== id));
  addHistoryEntry(target, 'cancelled');
  renderTimetable();
  renderList();
  renderHistory();
});

/* ---- FR-04 / FR-05 / FR-06: 전체 예약 목록, 날짜 조회, 검색, 취소 ---- */
const reserveTableBody = document.getElementById('reserveTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const reserveTable = document.getElementById('reserveTable');
const listDateFilter = document.getElementById('listDateFilter');
listDateFilter.value = todayStr();

function renderList() {
  const keyword = (searchInput.value || '').trim().toLowerCase();
  const dateFilter = listDateFilter.value;
  let list = sortReservations(getReservations());

  if (dateFilter) {
    list = list.filter(r => r.date === dateFilter);
  }

  if (keyword) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(keyword) ||
      r.phone.toLowerCase().includes(keyword) ||
      (r.memo || '').toLowerCase().includes(keyword)
    );
  }

  if (list.length === 0) {
    reserveTable.hidden = true;
    emptyState.hidden = false;
    reserveTableBody.innerHTML = '';
    return;
  }

  reserveTable.hidden = false;
  emptyState.hidden = true;

  reserveTableBody.innerHTML = list.map(r => `
    <tr data-id="${escapeHtml(r.id)}">
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.time)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.phone)}</td>
      <td>${escapeHtml(r.players)}인</td>
      <td class="memo-cell">${r.memo ? escapeHtml(r.memo) : '-'}</td>
      <td><button type="button" class="cancel-btn" data-id="${escapeHtml(r.id)}">취소</button></td>
    </tr>
  `).join('');
}
searchInput.addEventListener('input', renderList);
listDateFilter.addEventListener('change', renderList);

reserveTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;

  const id = btn.dataset.id;
  const list = getReservations();
  const target = list.find(r => r.id === id);
  if (!target) return;

  const ok = confirm(`${target.date} ${target.time} / ${target.name}님의 예약을 취소하시겠습니까?`);
  if (!ok) return;

  saveReservations(list.filter(r => r.id !== id));
  addHistoryEntry(target, 'cancelled');
  renderTimetable();
  renderList();
  renderHistory();
});

/* ---- 예약 히스토리 조회 (생성/취소 이력, 명세서 9장 FE-10) ---- */
const historyTableBody = document.getElementById('historyTableBody');
const historyEmptyState = document.getElementById('historyEmptyState');
const historyTable = document.getElementById('historyTable');
const historySearchInput = document.getElementById('historySearchInput');

const ACTION_LABEL = { created: '생성', cancelled: '취소' };

function renderHistory() {
  const keyword = (historySearchInput.value || '').trim().toLowerCase();
  let list = sortHistory(getHistory());

  if (keyword) {
    list = list.filter(h =>
      h.name.toLowerCase().includes(keyword) ||
      h.phone.toLowerCase().includes(keyword)
    );
  }

  if (list.length === 0) {
    historyTable.hidden = true;
    historyEmptyState.hidden = false;
    historyTableBody.innerHTML = '';
    return;
  }

  historyTable.hidden = false;
  historyEmptyState.hidden = true;

  historyTableBody.innerHTML = list.map(h => `
    <tr>
      <td>${escapeHtml(h.actionAt.replace('T', ' ').slice(0, 16))}</td>
      <td><span class="history-badge is-${h.action}">${ACTION_LABEL[h.action] || h.action}</span></td>
      <td>${escapeHtml(h.date)}</td>
      <td>${escapeHtml(h.time)}</td>
      <td>${escapeHtml(h.name)}</td>
      <td>${escapeHtml(h.phone)}</td>
      <td>${escapeHtml(h.players)}인</td>
    </tr>
  `).join('');
}
historySearchInput.addEventListener('input', renderHistory);

/* ---- 타임테이블 / 목록 / 히스토리 탭 전환 ---- */
const tabTimetableBtn = document.getElementById('tabTimetableBtn');
const tabListBtn = document.getElementById('tabListBtn');
const tabHistoryBtn = document.getElementById('tabHistoryBtn');
const timetablePanel = document.getElementById('timetablePanel');
const listPanel = document.getElementById('listPanel');
const historyPanel = document.getElementById('historyPanel');

const TAB_BUTTONS = { timetable: tabTimetableBtn, list: tabListBtn, history: tabHistoryBtn };
const TAB_PANELS = { timetable: timetablePanel, list: listPanel, history: historyPanel };

function switchTab(tab) {
  Object.keys(TAB_PANELS).forEach(key => {
    const isActive = key === tab;
    TAB_PANELS[key].hidden = !isActive;
    TAB_BUTTONS[key].classList.toggle('is-active', isActive);
    TAB_BUTTONS[key].setAttribute('aria-selected', String(isActive));
  });
}
tabTimetableBtn.addEventListener('click', () => switchTab('timetable'));
tabListBtn.addEventListener('click', () => switchTab('list'));
tabHistoryBtn.addEventListener('click', () => switchTab('history'));

/* ---- 로그인 게이트 ----
   주의: showAdminContent()가 renderTimetable()/renderList()를 호출하므로,
   이 함수와 그 아래 자동 로그인 체크는 반드시 위의 모든 DOM 참조/함수
   선언 이후에 와야 한다 (그렇지 않으면 TDZ 오류로 렌더링이 조용히 실패한다). */
function showAdminContent() {
  adminGate.hidden = true;
  adminContent.hidden = false;
  renderTimetable();
  renderList();
  renderHistory();
}

function showGate() {
  adminContent.hidden = true;
  adminGate.hidden = false;
  adminPassword.value = '';
  adminPassword.focus();
}

adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (adminPassword.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    adminGateError.hidden = true;
    showAdminContent();
  } else {
    adminGateError.hidden = false;
    adminPassword.value = '';
    adminPassword.focus();
  }
});

adminLogoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  showGate();
});

// 뒤로가기/앞으로가기로 페이지가 캐시(bfcache)에서 복원될 때도
// 최신 예약 데이터로 다시 그린다.
window.addEventListener('pageshow', () => {
  if (!adminContent.hidden) {
    renderTimetable();
    renderList();
    renderHistory();
  }
});

// 이미 로그인된 세션이면(같은 탭에서 새로고침 등) 바로 콘텐츠 표시
if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
  showAdminContent();
}
