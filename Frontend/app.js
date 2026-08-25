const API_BASE = 'https://smart-travel-weather-planner.onrender.com';
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

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('Message received — thanks for reaching out.');
  contactForm.reset();
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
    bolt.className = 'bolt-flash';
    skyStage.appendChild(bolt);
    return;
  }

  if (key.includes('rain') || key.includes('drizzle')) {
    skyStage.classList.add('sky--rain');
    for (let i = 0; i < 90; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-line';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.height = `${Math.random() * 26 + 16}px`;
      drop.style.animationDuration = `${Math.random() * 0.4 + 0.55}s`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      skyStage.appendChild(drop);
    }
    return;
  }

  if (key.includes('snow')) {
    skyStage.classList.add('sky--snow');
    for (let i = 0; i < 60; i++) {
      const flake = document.createElement('div');
      flake.className = 'snow-dot';
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.width = flake.style.height = `${Math.random() * 4 + 4}px`;
      flake.style.animationDuration = `${Math.random() * 6 + 6}s`;
      flake.style.animationDelay = `${Math.random() * 5}s`;
      skyStage.appendChild(flake);
    }
    return;
  }

  if (key.includes('mist') || key.includes('fog') || key.includes('haze')) {
    skyStage.classList.add('sky--mist');
    for (let i = 0; i < 4; i++) {
      const band = document.createElement('div');
      band.className = 'mist-band';
      band.style.top = `${20 + i * 18}%`;
      band.style.animationDuration = `${18 + i * 4}s`;
      skyStage.appendChild(band);
    }
    return;
  }

  skyStage.classList.add(night ? 'sky--clear-night' : 'sky--clear-day');
}

const PACK_RULES = [
  { group: 'Wear', icon: 'shirt', words: ['jacket', 'coat', 'sweater', 'layer', 'shirt', 'trousers', 'pants', 'shorts', 'dress'] },
  { group: 'Wear', icon: 'footprints', words: ['shoes', 'boots', 'sandals', 'sneakers', 'trainers'] },
  { group: 'Carry', icon: 'umbrella', words: ['umbrella', 'raincoat', 'poncho'] },
  { group: 'Carry', icon: 'glasses', words: ['sunglasses', 'sunscreen', 'hat', 'cap'] },
  { group: 'Extras', icon: 'backpack', words: [] },
];

function categorize(item) {
  const lower = item.toLowerCase();
  for (const rule of PACK_RULES) {
    if (rule.words.some((w) => lower.includes(w))) return rule;
  }
  return PACK_RULES[PACK_RULES.length - 1];
}

function renderManifest(list) {
  manifestGroups.innerHTML = '';
  const groups = {};
  list.forEach((item) => {
    const rule = categorize(item);
    if (!groups[rule.group]) groups[rule.group] = { icon: rule.icon, items: [] };
    groups[rule.group].items.push(item);
  });

  Object.entries(groups).forEach(([groupName, data]) => {
    const wrap = document.createElement('div');
    wrap.className = 'manifest-group';
    const h4 = document.createElement('h4');
    h4.textContent = groupName;
    const ul = document.createElement('ul');
    data.items.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<i data-lucide="${data.icon}"></i><span>${item}</span>`;
      ul.appendChild(li);
    });
    wrap.appendChild(h4);
    wrap.appendChild(ul);
    manifestGroups.appendChild(wrap);
  });
  initIcons();
}

function buildDemoForecast(base) {
  const conditionsCycle = [base.main, 'Clouds', base.main, 'Clear', 'Clouds'];
  const days = [];
  for (let i = 0; i < 5; i++) {
    const drift = Math.round(Math.sin(i * 1.7) * 3);
    days.push({
      label: i === 0 ? 'Today' : dayLabel(i),
      tempC: base.tempC + (i === 0 ? 0 : drift),
      main: i === 0 ? base.main : conditionsCycle[i],
      condition: i === 0 ? base.condition : conditionsCycle[i],
      estimated: i !== 0,
    });
  }
  return days;
}

function dayLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

async function fetchForecast(place, activity, base) {
  try {
    const url = `${API_BASE}/api/forecast?place=${encodeURIComponent(place)}&activity=${activity}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('no forecast endpoint');
    const data = await res.json();
    if (!Array.isArray(data.forecast) || !data.forecast.length) throw new Error('empty forecast');
    return data.forecast.map((entry, i) => ({
      label: i === 0 ? 'Today' : dayLabel(i),
      tempC: entry.temperature,
      main: entry.main_condition,
      condition: entry.condition,
      estimated: false,
    }));
  } catch (err) {
    return buildDemoForecast(base);
  }
}

function renderDayStrip(forecast) {
  dayStrip.innerHTML = '';
  forecast.forEach((day, i) => {
    const tab = document.createElement('button');
    tab.className = 'day-tab' + (i === activeDayIndex ? ' active' : '');
    tab.innerHTML = `
      <span class="day-label">${day.label}</span>
      <span class="day-temp">${displayTemp(day.tempC)}</span>
      ${day.estimated ? '<span class="day-sample" title="Estimated"></span>' : ''}
    `;
    tab.addEventListener('click', () => { activeDayIndex = i; renderDay(i); });
    dayStrip.appendChild(tab);
  });
}

function renderDay(index) {
  const day = lastForecast[index];
  Array.from(dayStrip.children).forEach((el, i) => el.classList.toggle('active', i === index));
  resultTemp.textContent = displayTemp(day.tempC);
  resultDesc.textContent = day.condition;
  resultIcon.setAttribute('data-lucide', conditionToIcon(day.main));
  initIcons();
  renderSky(day.main);
  Array.from(dayStrip.querySelectorAll('.day-tab')).forEach((tab, i) => {
    tab.querySelector('.day-temp').textContent = displayTemp(lastForecast[i].tempC);
  });
}

function renderStats(data) {
  boardStats.innerHTML = '';
  const stats = [
    { key: 'wind_speed', icon: 'wind', suffix: ' km/h', label: 'Wind' },
    { key: 'humidity', icon: 'droplets', suffix: '%', label: 'Humidity' },
    { key: 'feels_like', icon: 'thermometer', suffix: '°', label: 'Feels like' },
  ];
  stats.forEach((stat) => {
    if (data[stat.key] === undefined || data[stat.key] === null) return;
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.innerHTML = `<i data-lucide="${stat.icon}"></i><span>${data[stat.key]}${stat.suffix}</span>`;
    boardStats.appendChild(chip);
  });
  initIcons();
}

boardPanel.addEventListener('mousemove', (e) => {
  const rect = boardPanel.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  boardPanel.style.transform = `rotateX(${y * -4}deg) rotateY(${x * 4}deg)`;
});
boardPanel.addEventListener('mouseleave', () => { boardPanel.style.transform = 'rotateX(0) rotateY(0)'; });

async function runSearch() {
  const place = cityInput.value.trim();
  const activity = activityInput.value;

  if (!place) {
    showToast('Enter a city or place first.');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.querySelector('span').textContent = 'Reading the sky…';

  try {
    const url = `${API_BASE}/api/weather?place=${encodeURIComponent(place)}&activity=${activity}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Could not fetch that location.');

    resultCity.textContent = data.place;
    resultDesc.textContent = data.condition;
    resultIcon.setAttribute('data-lucide', conditionToIcon(data.main_condition));
    resultTemp.textContent = displayTemp(data.temperature);
    renderStats(data);
    renderManifest(data.packing_list || []);
    renderSky(data.main_condition);

    activeDayIndex = 0;
    lastForecast = await fetchForecast(place, activity, {
      tempC: data.temperature,
      main: data.main_condition,
      condition: data.condition,
    });
    renderDayStrip(lastForecast);

    board.classList.remove('hidden');
    addRecentChip(data.place || place);
    initIcons();
  } catch (err) {
    showToast(err.message || 'Something went wrong fetching that forecast.');
  } finally {
    searchBtn.disabled = false;
    searchBtn.querySelector('span').textContent = 'Check the sky';
  }
}

searchBtn.addEventListener('click', runSearch);
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Location isn\u2019t available in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const url = `${API_BASE}/api/weather?lat=${latitude}&lon=${longitude}&activity=${activityInput.value}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error('not supported yet');
        cityInput.value = data.place;
        runSearch();
      } catch (err) {
        showToast('Your backend doesn\u2019t support location lookup yet — add lat/lon handling to enable this.');
      }
    },
    () => showToast('Location access was denied.')
  );
});

syncThemeIcon();
renderSky('clear');
initIcons();