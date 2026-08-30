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
   예약 등록 폼 (요구사항 명세서 FR-01 / FR-02)
   데이터 레이어(STORAGE_KEY, ALL_SLOTS, getReservations 등)는 js/data.js
   ========================================================= */
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

  // 5. 시간옵션 즉시 갱신 (타임테이블/목록은 관리자 페이지에서 확인)
  renderTimeOptions();
});

confirmClose.addEventListener('click', () => reserveConfirm.classList.remove('is-open'));
reserveConfirm.addEventListener('click', (e) => {
  if (e.target === reserveConfirm) reserveConfirm.classList.remove('is-open');
});
