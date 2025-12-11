/* Unblocked Games 9x — vanilla JS app */
const state = {
  games: [],
  categories: [],
  selectedCategory: 'All',
  search: '',
  favorites: new Set(JSON.parse(localStorage.getItem('favorites') || '[]')),
  favOnly: false
};

const els = {
  grid: document.getElementById('gamesGrid'),
  empty: document.getElementById('emptyState'),
  chips: document.getElementById('categoryChips'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  favOnly: document.getElementById('favOnly'),
  year: document.getElementById('year'),
  featured: document.getElementById('featuredCarousel'),
  aboutBtn: document.getElementById('aboutBtn'),
  aboutDialog: document.getElementById('aboutDialog'),
  reportBtn: document.getElementById('reportBtn'),
  reportDialog: document.getElementById('reportDialog'),
  sendReport: document.getElementById('sendReport'),
  themeToggle: document.getElementById('themeToggle'),
  installBtn: document.getElementById('installBtn')
};

els.year.textContent = new Date().getFullYear();

/* PWA install prompt */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.hidden = false;
});
els.installBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  els.installBtn.hidden = true;
});

/* Theme toggle (persist) */
const themeKey = 'theme';
const applyTheme = (mode) => {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(themeKey, mode);
};
applyTheme(localStorage.getItem(themeKey) || 'auto');
els.themeToggle.addEventListener('click', () => {
  const current = localStorage.getItem(themeKey) || 'auto';
  const next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
  applyTheme(next);
});

/* Dialogs */
els.aboutBtn.addEventListener('click', (e) => { e.preventDefault(); els.aboutDialog.showModal(); });
els.reportBtn.addEventListener('click', (e) => { e.preventDefault(); els.reportDialog.showModal(); });
els.sendReport.addEventListener('click', () => {
  const text = document.getElementById('reportText').value.trim();
  if (!text) return;
  alert('Thanks! Your report was saved locally.');
  localStorage.setItem('lastReport', JSON.stringify({ text, date: Date.now() }));
  els.reportDialog.close();
});

/* Search and filters */
els.searchInput.addEventListener('input', (e) => { state.search = e.target.value.toLowerCase(); render(); });
els.clearSearch.addEventListener('click', () => { els.searchInput.value = ''; state.search = ''; render(); });
els.favOnly.addEventListener('change', (e) => { state.favOnly = e.target.checked; render(); });

/* Fetch catalog */
async function loadGames() {
  const res = await fetch('games.json', { cache: 'no-store' });
  const data = await res.json();
  state.games = data;
  const cats = new Set(['All', ...data.map(g => g.category)]);
  state.categories = Array.from(cats);
  renderCategories();
  renderFeatured();
  render();
}
loadGames();

/* Render categories */
function renderCategories() {
  els.chips.innerHTML = '';
  state.categories.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === state.selectedCategory ? ' active' : '');
    b.textContent = cat;
    b.addEventListener('click', () => {
      state.selectedCategory = cat;
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      render();
    });
    els.chips.appendChild(b);
  });
}

/* Filter + sort */
function getFilteredGames() {
  let list = state.games.slice();

  if (state.selectedCategory !== 'All') {
    list = list.filter(g => g.category === state.selectedCategory);
  }
  if (state.search) {
    list = list.filter(g =>
      g.title.toLowerCase().includes(state.search) ||
      (g.tags || []).some(t => t.toLowerCase().includes(state.search))
    );
  }
  if (state.favOnly) {
    list = list.filter(g => state.favorites.has(g.slug));
  }

  // Sort: favorites first, then featured, then A–Z
  list.sort((a, b) => {
    const favA = state.favorites.has(a.slug) ? 1 : 0;
    const favB = state.favorites.has(b.slug) ? 1 : 0;
    if (favA !== favB) return favB - favA;
    if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    return a.title.localeCompare(b.title);
  });

  return list;
}

/* Render featured carousel */
function renderFeatured() {
  const featured = state.games.filter(g => g.featured).slice(0, 10);
  els.featured.innerHTML = featured.map(g => `
    <article class="card" style="scroll-snap-align: start;">
      <img class="card-thumb" src="${g.thumb}" alt="${g.title}" loading="lazy">
      <div class="card-body">
        <div class="card-title">${g.title}</div>
        <div class="card-meta">
          <span class="meta-chip">${g.category}</span>
          <span>${(g.tags || []).slice(0,2).join(' • ')}</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" href="game.html?slug=${encodeURIComponent(g.slug)}">Play</a>
          <button class="btn btn-fav" aria-pressed="${state.favorites.has(g.slug)}" data-slug="${g.slug}">
            ${state.favorites.has(g.slug) ? '★ Favorited' : '☆ Favorite'}
          </button>
        </div>
      </div>
    </article>
  `).join('');
  els.featured.querySelectorAll('.btn-fav').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.slug, btn));
  });
}

/* Render grid */
function render() {
  const list = getFilteredGames();
  els.grid.innerHTML = list.map(g => `
    <article class="card">
      <img class="card-thumb" src="${g.thumb}" alt="${g.title}" loading="lazy">
      <div class="card-body">
        <div class="card-title">${g.title}</div>
        <div class="card-meta">
          <span class="meta-chip">${g.category}</span>
          <span>${(g.tags || []).slice(0,2).join(' • ')}</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" href="game.html?slug=${encodeURIComponent(g.slug)}">Play</a>
          <button class="btn btn-fav" aria-pressed="${state.favorites.has(g.slug)}" data-slug="${g.slug}">
            ${state.favorites.has(g.slug) ? '★ Favorited' : '☆ Favorite'}
          </button>
        </div>
      </div>
    </article>
  `).join('');

  els.grid.querySelectorAll('.btn-fav').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.slug, btn));
  });

  els.empty.hidden = list.length > 0;
}

/* Favorites */
function toggleFavorite(slug, btn) {
  if (state.favorites.has(slug)) state.favorites.delete(slug);
  else state.favorites.add(slug);
  localStorage.setItem('favorites', JSON.stringify(Array.from(state.favorites)));
  btn.setAttribute('aria-pressed', state.favorites.has(slug));
  btn.textContent = state.favorites.has(slug) ? '★ Favorited' : '☆ Favorite';
  render();
}

/* Register SW */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
