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

// Reservation form
const reserveForm = document.getElementById('reserveForm');
const reserveConfirm = document.getElementById('reserveConfirm');
const confirmSummary = document.getElementById('confirmSummary');
const confirmClose = document.getElementById('confirmClose');

const phoneInput = document.getElementById('rPhone');
phoneInput.addEventListener('input', () => {
  let v = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 11);
  if (v.length > 3 && v.length <= 7) v = `${v.slice(0,3)}-${v.slice(3)}`;
  else if (v.length > 7) v = `${v.slice(0,3)}-${v.slice(3,7)}-${v.slice(7)}`;
  phoneInput.value = v;
});

const dateInput = document.getElementById('rDate');
const todayStr = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', todayStr);

reserveForm.addEventListener('submit', (e) => {
  e.preventDefault();
  let valid = true;

  reserveForm.querySelectorAll('.form-field').forEach(f => f.classList.remove('error'));

  const requiredFields = ['rDate', 'rTime', 'rPeople', 'rName', 'rPhone'];
  requiredFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.closest('.form-field').classList.add('error');
      valid = false;
    }
  });

  const phoneVal = phoneInput.value.trim();
  if (phoneVal && !/^01[0-9]-\d{3,4}-\d{4}$/.test(phoneVal)) {
    phoneInput.closest('.form-field').classList.add('error');
    valid = false;
  }

  if (!valid) return;

  const data = new FormData(reserveForm);
  const date = data.get('date');
  const time = data.get('time');
  const people = data.get('people');
  const name = data.get('name');

  confirmSummary.textContent =
    `${name}님, ${date} ${time}\n${people}인 라운딩 예약이 접수되었습니다.\n담당자 확인 후 SMS로 안내드리겠습니다.`;

  reserveConfirm.classList.add('is-open');
});

confirmClose.addEventListener('click', () => {
  reserveConfirm.classList.remove('is-open');
  reserveForm.reset();
});

reserveConfirm.addEventListener('click', (e) => {
  if (e.target === reserveConfirm) {
    reserveConfirm.classList.remove('is-open');
    reserveForm.reset();
  }
});
