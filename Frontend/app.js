const API_BASE = 'https://onrender.com';

const navHome = document.getElementById('nav-home');
const navAbout = document.getElementById('nav-about');
const navContact = document.getElementById('nav-contact');
const brandHome = document.getElementById('brand-home');

const pageHome = document.getElementById('page-home');
const pageAbout = document.getElementById('page-about');
const pageContact = document.getElementById('page-contact');

const cityInput = document.getElementById('city-input');
const activityInput = document.getElementById('activity-input');
const searchBtn = document.getElementById('search-btn');
const locateBtn = document.getElementById('locate-btn');
const recentChipsEl = document.getElementById('recent-chips');

const board = document.getElementById('board');
const boardPanel = document.getElementById('board-panel');
const resultCity = document.getElementById('result-city');
const resultTemp = document.getElementById('result-temp');
const resultDesc = document.getElementById('result-desc');
const resultIcon = document.getElementById('result-icon');
const boardStats = document.getElementById('board-stats');
const dayStrip = document.getElementById('day-strip');
const manifestGroups = document.getElementById('manifest-groups');

const themeToggleBtn = document.getElementById('theme-toggle');
const unitToggleBtn = document.getElementById('unit-toggle');
const contactForm = document.getElementById('contact-form');
const skyStage = document.getElementById('sky-stage');
const toastEl = document.getElementById('toast');

let unit = 'C';
let lastForecast = null;
let activeDayIndex = 0;
const recentSearches = [];

function initIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function resetActiveViews() {
  navHome.classList.remove('active');
  navAbout.classList.remove('active');
  navContact.classList.remove('active');
  pageHome.classList.add('hidden');
  pageAbout.classList.add('hidden');
  pageContact.classList.add('hidden');
}

function goHome(e) { if (e) e.preventDefault(); resetActiveViews(); navHome.classList.add('active'); pageHome.classList.remove('hidden'); }

navHome.addEventListener('click', goHome);
brandHome.addEventListener('click', goHome);
navAbout.addEventListener('click', (e) => { e.preventDefault(); resetActiveViews(); navAbout.classList.add('active'); pageAbout.classList.remove('hidden'); });
navContact.addEventListener('click', (e) => { e.preventDefault(); resetActiveViews(); navContact.classList.add('active'); pageContact.classList.remove('hidden'); });

// Handle contact form submission via Formspree API
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevents the browser from reloading the page
    
    const submitBtn = document.getElementById('contact-submit-btn');
    const formData = new FormData(contactForm);
    
    // Smooth loading visual states
    submitBtn.querySelector('span').innerText = "Sending...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(contactForm.action, {
            method: contactForm.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            alert('Thank you! Your message has been sent directly to Sboniso.');
            contactForm.reset(); // Clears text fields cleanly
        } else {
            const data = await response.json();
            throw new Error(data.errors ? data.errors.map(err => err.message).join(', ') : 'Submission failed.');
        }
    } catch (error) {
        console.error("Formspree Submission Error:", error);
        alert(`Oops! Problem submitting form: ${error.message}`);
    } finally {
        // Reset buttons back to pristine state
        submitBtn.querySelector('span').innerText = "Send message";
        submitBtn.disabled = false;
    }
});


const savedTheme = localStorage.getItem('wp-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

function syncThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  themeToggleBtn.innerHTML = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
  initIcons();
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wp-theme', next);
  syncThemeIcon();
});

unitToggleBtn.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  unitToggleBtn.textContent = `°${unit}`;
  if (lastForecast) renderDay(activeDayIndex);
});

function cToF(c) { return Math.round((c * 9) / 5 + 32); }
function displayTemp(celsius) { return unit === 'C' ? `${Math.round(celsius)}°C` : `${cToF(celsius)}°F`; }

function addRecentChip(place) {
  const existing = recentSearches.indexOf(place);
  if (existing !== -1) recentSearches.splice(existing, 1);
  recentSearches.unshift(place);
  if (recentSearches.length > 5) recentSearches.pop();
  renderRecentChips();
}

function renderRecentChips() {
  recentChipsEl.innerHTML = '';
  recentSearches.forEach((place) => {
    const chip = document.createElement('button');
    chip.className = 'recent-chip';
    chip.textContent = place;
    chip.addEventListener('click', () => {
      cityInput.value = place;
      runSearch();
    });
    recentChipsEl.appendChild(chip);
  });
}

function conditionToIcon(main) {
  const key = (main || '').toLowerCase();
  if (key.includes('clear')) return 'sun';
  if (key.includes('cloud')) return 'cloud';
  if (key.includes('thunder')) return 'cloud-lightning';
  if (key.includes('snow')) return 'cloud-snow';
  if (key.includes('rain') || key.includes('drizzle')) return 'cloud-rain';
  if (key.includes('mist') || key.includes('fog') || key.includes('haze')) return 'cloud-fog';
  return 'cloud-sun';
}

function isNightNow() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 19;
}

function clearSky() { skyStage.innerHTML = ''; skyStage.className = 'sky'; }

function renderSky(main) {
  clearSky();
  const key = (main || 'clear').toLowerCase();
  const night = isNightNow();

  if (key.includes('clear')) {
    skyStage.classList.add(night ? 'sky--clear-night' : 'sky--clear-day');
    if (night) {
      for (let i = 0; i < 60; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 70}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        skyStage.appendChild(star);
      }
    } else {
      const sun = document.createElement('div');
      sun.className = 'sun-disc';
      skyStage.appendChild(sun);
    }
    return;
  }

  if (key.includes('cloud')) {
    skyStage.classList.add('sky--clouds');
    for (let i = 0; i < 6; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud-shape';
      cloud.style.width = `${Math.random() * 100 + 90}px`;
      cloud.style.height = `${Math.random() * 34 + 22}px`;
      cloud.style.top = `${Math.random() * 45 + 5}%`;
      cloud.style.animationDuration = `${Math.random() * 25 + 35}s`;
      cloud.style.animationDelay = `${Math.random() * -30}s`;
      skyStage.appendChild(cloud);
    }
    return;
  }

  if (key.includes('thunder')) {
    skyStage.classList.add('sky--thunderstorm');
    for (let i = 0; i < 70; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-line';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.height = `${Math.random() * 30 + 18}px`;
      drop.style.animationDuration = `${Math.random() * 0.4 + 0.5}s`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      skyStage.appendChild(drop);
    }
    const bolt = document.createElement('div');
    bolt.className = 'lightning-bolt';
    skyStage.appendChild(bolt);
    return;
  }
}

// Initialise core visuals on load
syncThemeIcon();
