/* =========================================================
   예약 데이터 레이어 (index.html / admin.html 공통)
   요구사항 명세서 2.2 / 5장 / 6장 기준
   ========================================================= */

const STORAGE_KEY = 'par3_reservations';
const START_HOUR = 9;    // 영업 시작 06:00
const END_HOUR = 17;     // 영업 종료 17:00
const INTERVAL_MIN = 10; // 슬롯 간격 10분

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

// 09:00 ~ 16:30, 10분 간격 슬롯 목록 생성 (BR-04)
function generateSlots() {
  const slots = [];
  const totalMin = (END_HOUR - START_HOUR) * 60-20;
  for (let m = 0; m < totalMin; m += INTERVAL_MIN) {
    const h = START_HOUR + Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

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

/* ---- 예약 히스토리 (생성/취소 이력, 명세서 9장 FE-10 감사 로그) ---- */
const HISTORY_KEY = 'par3_reservation_history';

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('예약 히스토리를 불러오지 못했습니다.', e);
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

// action: 'created' | 'cancelled'
function addHistoryEntry(reservation, action) {
  const history = getHistory();
  history.push({
    ...reservation,
    action,
    actionAt: new Date().toISOString()
  });
  saveHistory(history);
}

function sortHistory(list) {
  return [...list].sort((a, b) => (a.actionAt < b.actionAt ? 1 : -1)); // 최신순
}
