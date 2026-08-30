// Header scroll state
const header = document.getElementById('header');
function updateHeader() {
  if (window.scrollY > 40) header.classList.add('is-scrolled');
  else header.classList.remove('is-scrolled');
}
window.addEventListener('scroll', updateHeader);
updateHeader();

// Mobile nav
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');

hamburgerBtn.addEventListener('click', () => mobileNav.classList.add('is-open'));
mobileNavClose.addEventListener('click', () => mobileNav.classList.remove('is-open'));
mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('is-open'));
});

// Hero slider
const slides = document.querySelectorAll('.hero-slide');
const pagerCurrent = document.getElementById('pagerCurrent');
const pagerBar = document.getElementById('pagerBar');
let current = 0;
const total = slides.length;

function showSlide(index) {
  slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
  pagerCurrent.textContent = String(index + 1).padStart(1, '0');
  pagerBar.style.width = `${((index + 1) / total) * 100}%`;
}
showSlide(0);
setInterval(() => {
  current = (current + 1) % total;
  showSlide(current);
}, 5000);

// Scroll down button
document.getElementById('scrollDown').addEventListener('click', () => {
  document.querySelector('.notice').scrollIntoView({ behavior: 'smooth' });
});

/* =========================================================
   예약 시스템 (요구사항 명세서 FR-01 ~ FR-07 기준)
   ========================================================= */

// ---- 비즈니스 규칙 (명세서 2.2 / 6장) ----
const STORAGE_KEY = 'par3_reservations';
const START_HOUR = 6;    // 영업 시작 06:00
const END_HOUR = 18;     // 영업 종료 18:00
const INTERVAL_MIN = 20; // 슬롯 간격 20분

// ---- 유틸 ----
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

// 06:00 ~ 17:40, 20분 간격 슬롯 목록 생성 (BR-04)
function generateSlots() {
  const slots = [];
  const totalMin = (END_HOUR - START_HOUR) * 60;
  for (let m = 0; m < totalMin; m += INTERVAL_MIN) {
    const h = START_HOUR + Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

// ---- 데이터 레이어 (localStorage) ----
function getReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('예약 데이터를 불러오지 못했습니다.', e);
    return [];
  }
}

function saveReservations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function isSlotBooked(date, time, list) {
  return list.some(r => r.date === date && r.time === time);
}

function sortReservations(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  });
}

function createReservationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- FR-01 / FR-02: 예약 폼 ----
const reserveForm = document.getElementById('reserveForm');
const reserveConfirm = document.getElementById('reserveConfirm');
const confirmSummary = document.getElementById('confirmSummary');
const confirmClose = document.getElementById('confirmClose');
const formMessage = document.getElementById('formMessage');

const dateInput = document.getElementById('rDate');
const timeSelect = document.getElementById('rTime');
const phoneInput = document.getElementById('rPhone');

dateInput.setAttribute('min', todayStr());
dateInput.value = todayStr();

function showFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message is-visible is-${type}`;
}
function clearFormMessage() {
  formMessage.textContent = '';
  formMessage.className = 'form-message';
}

// FR-02: 날짜별 슬롯 예약 가능/마감 상태를 시간 select에 반영
function renderTimeOptions() {
  const date = dateInput.value || todayStr();
  const list = getReservations();
  const prevValue = timeSelect.value;

  timeSelect.innerHTML = '<option value="">시간 선택</option>';
  ALL_SLOTS.forEach(slot => {
    const booked = isSlotBooked(date, slot, list);
    const opt = document.createElement('option');
    opt.value = slot;
    opt.textContent = booked ? `${slot} (마감)` : slot;
    if (booked) opt.disabled = true;
    timeSelect.appendChild(opt);
  });

  if (prevValue && !isSlotBooked(date, prevValue, list)) {
    timeSelect.value = prevValue;
  }
}
dateInput.addEventListener('change', renderTimeOptions);
renderTimeOptions();

phoneInput.addEventListener('input', () => {
  let v = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 11);
  if (v.length > 3 && v.length <= 7) v = `${v.slice(0,3)}-${v.slice(3)}`;
  else if (v.length > 7) v = `${v.slice(0,3)}-${v.slice(3,7)}-${v.slice(7)}`;
  phoneInput.value = v;
});

reserveForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearFormMessage();
  reserveForm.querySelectorAll('.form-field').forEach(f => f.classList.remove('error'));

  const data = new FormData(reserveForm);
  const date = data.get('date');
  const time = data.get('time');
  const players = data.get('people');
  const name = (data.get('name') || '').trim();
  const phone = (data.get('phone') || '').trim();
  const memo = (data.get('request') || '').trim();

  // 1. 필수 항목 검증
  const requiredMap = { rDate: date, rTime: time, rPeople: players, rName: name, rPhone: phone };
  let missing = false;
  Object.entries(requiredMap).forEach(([id, val]) => {
    if (!val) {
      document.getElementById(id).closest('.form-field').classList.add('error');
      missing = true;
    }
  });
  if (missing) {
    showFormMessage('모든 필수 항목을 입력해주세요.', 'error');
    return;
  }

  if (!/^01[0-9]-\d{3,4}-\d{4}$/.test(phone)) {
    phoneInput.closest('.form-field').classList.add('error');
    showFormMessage('연락처 형식을 확인해주세요. (예: 010-0000-0000)', 'error');
    return;
  }

  // 2. 슬롯 중복 검증
  const list = getReservations();
  if (isSlotBooked(date, time, list)) {
    timeSelect.closest('.form-field').classList.add('error');
    showFormMessage('이미 예약된 시간대입니다.', 'error');
    renderTimeOptions();
    return;
  }

  // 3. 저장
  const reservation = {
    id: createReservationId(),
    date, time, name, phone,
    players: Number(players),
    memo,
    createdAt: new Date().toISOString()
  };
  list.push(reservation);
  saveReservations(list);

  // 4. 성공 메시지 + 폼 초기화 (날짜·인원수는 유지)
  const successText = `${date} ${time} 예약이 완료되었습니다.`;
  showFormMessage(successText, 'success');

  const keepDate = date;
  const keepPlayers = players;
  reserveForm.reset();
  dateInput.value = keepDate;
  document.getElementById('rPeople').value = keepPlayers;

  confirmSummary.textContent =
    `${name}님, ${date} ${time}\n${players}인 라운딩 예약이 접수되었습니다.\n담당자 확인 후 SMS로 안내드리겠습니다.`;
  reserveConfirm.classList.add('is-open');

  // 5. 타임테이블 / 목록 / 시간옵션 즉시 갱신
  renderTimeOptions();
  renderTimetable();
  renderList();
});

confirmClose.addEventListener('click', () => reserveConfirm.classList.remove('is-open'));
reserveConfirm.addEventListener('click', (e) => {
  if (e.target === reserveConfirm) reserveConfirm.classList.remove('is-open');
});

// ---- FR-03: 일자별 타임테이블 조회 ----
const ttDateInput = document.getElementById('ttDate');
const timetableGrid = document.getElementById('timetableGrid');

ttDateInput.setAttribute('min', todayStr());
ttDateInput.value = todayStr();

function renderTimetable() {
  const date = ttDateInput.value || todayStr();
  const list = getReservations().filter(r => r.date === date);
  const byTime = {};
  list.forEach(r => { byTime[r.time] = r; });

  timetableGrid.innerHTML = '';
  ALL_SLOTS.forEach(slot => {
    const booked = byTime[slot];
    const cell = document.createElement('div');
    cell.className = `tt-slot ${booked ? 'is-booked' : 'is-available'}`;
    cell.innerHTML = `
      <div class="tt-slot-time">${slot}</div>
      <div class="tt-slot-status">${booked ? escapeHtml(booked.name) : '예약 가능'}</div>
    `;
    timetableGrid.appendChild(cell);
  });
}
ttDateInput.addEventListener('change', renderTimetable);
renderTimetable();

// ---- FR-04 / FR-05 / FR-06: 전체 예약 목록, 검색, 취소 ----
const reserveTableBody = document.getElementById('reserveTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const reserveTable = document.getElementById('reserveTable');

function renderList() {
  const keyword = (searchInput.value || '').trim().toLowerCase();
  let list = sortReservations(getReservations());

  if (keyword) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(keyword) ||
      r.phone.toLowerCase().includes(keyword)
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
  renderTimeOptions();
  renderTimetable();
  renderList();
});

renderList();

// ---- 타임테이블 / 목록 탭 전환 ----
const tabTimetableBtn = document.getElementById('tabTimetableBtn');
const tabListBtn = document.getElementById('tabListBtn');
const timetablePanel = document.getElementById('timetablePanel');
const listPanel = document.getElementById('listPanel');

function switchTab(tab) {
  const showTimetable = tab === 'timetable';
  timetablePanel.hidden = !showTimetable;
  listPanel.hidden = showTimetable;
  tabTimetableBtn.classList.toggle('is-active', showTimetable);
  tabListBtn.classList.toggle('is-active', !showTimetable);
  tabTimetableBtn.setAttribute('aria-selected', String(showTimetable));
  tabListBtn.setAttribute('aria-selected', String(!showTimetable));
}
tabTimetableBtn.addEventListener('click', () => switchTab('timetable'));
tabListBtn.addEventListener('click', () => switchTab('list'));
