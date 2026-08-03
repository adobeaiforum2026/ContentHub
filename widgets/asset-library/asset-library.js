import { getPageParams } from '../../scripts/scripts.js';

const DEFAULT_SRC = '/data/assets.json';

const lower = (value) => (value || '').toString().trim().toLowerCase();

/**
 * Fetches and normalizes the asset catalog (a DA sheet published as JSON).
 * Accepts either a bare array or the standard `{ data: [...] }` sheet shape.
 * @param {string} src JSON URL
 * @returns {Promise<Array>} rows that have a downloadable url
 */
async function fetchAssets(src) {
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Failed to load assets: ${resp.status}`);
  const json = await resp.json();
  const data = Array.isArray(json) ? json : json.data || [];
  return data.filter((row) => row && (row.url || row.link));
}

/**
 * Builds one result card. Every value is written via textContent / element
 * properties (never innerHTML) so authored data cannot inject markup.
 * @param {object} item asset row
 * @returns {HTMLLIElement}
 */
function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'asset-library-item';

  const card = document.createElement('a');
  card.className = 'asset-library-card';
  card.href = item.url || item.link;
  card.setAttribute('download', '');

  if (item.thumbnail) {
    const img = document.createElement('img');
    img.className = 'asset-library-thumb';
    img.src = item.thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    card.append(img);
  }

  const meta = document.createElement('div');
  meta.className = 'asset-library-meta';

  const title = document.createElement('span');
  title.className = 'asset-library-title';
  title.textContent = item.title || item.name || 'Untitled';
  meta.append(title);

  const parts = [item.type, item.size, item.date].filter(Boolean);
  if (parts.length) {
    const sub = document.createElement('span');
    sub.className = 'asset-library-sub';
    sub.textContent = parts.join(' · ');
    meta.append(sub);
  }
  card.append(meta);

  const icon = document.createElement('span');
  icon.className = 'asset-library-download';
  icon.setAttribute('aria-hidden', 'true');
  card.append(icon);

  li.append(card);
  return li;
}

/**
 * Loads and decorates the asset-library widget.
 * Reads `category`, `q` and `name` from the page URL (produced by an external
 * app), fetches the catalog referenced by the authored `?src=` param, and
 * renders a searchable, filterable, downloadable list.
 * @param {Element} widget The widget element
 */
export default async function decorate(widget) {
  const src = widget.dataset.src || DEFAULT_SRC;
  const params = getPageParams();

  const greetingEl = widget.querySelector('.asset-library-greeting');
  const searchInput = widget.querySelector('.asset-library-search-input');
  const filtersEl = widget.querySelector('.asset-library-filters');
  const statusEl = widget.querySelector('.asset-library-status');
  const resultsEl = widget.querySelector('.asset-library-results');
  const emptyEl = widget.querySelector('.asset-library-empty');

  // personalized greeting (textContent-safe)
  const name = (params.get('name') || '').trim();
  if (name && greetingEl) {
    greetingEl.textContent = `Welcome, ${name}`;
    greetingEl.hidden = false;
  }

  // seed initial state from the URL
  let activeCategory = lower(params.get('category'));
  if (searchInput) searchInput.value = params.get('q') || '';

  statusEl.textContent = 'Loading downloads…';

  let assets = [];
  try {
    assets = await fetchAssets(src);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('asset-library', error);
    statusEl.textContent = 'Sorry, downloads are unavailable right now.';
    return;
  }

  const categories = [...new Set(assets.map((a) => (a.category || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  // ignore a URL category that isn't present in the data
  if (activeCategory && !categories.some((c) => lower(c) === activeCategory)) {
    activeCategory = '';
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    const q = searchInput ? searchInput.value.trim() : '';
    if (activeCategory) {
      url.searchParams.set('category', activeCategory);
    } else {
      url.searchParams.delete('category');
    }
    if (q) {
      url.searchParams.set('q', q);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);
  }

  function apply() {
    const q = lower(searchInput ? searchInput.value : '');
    const filtered = assets.filter((a) => {
      const matchesCat = !activeCategory || lower(a.category) === activeCategory;
      const haystack = `${lower(a.title || a.name)} ${lower(a.tags)}`;
      return matchesCat && (!q || haystack.includes(q));
    });

    resultsEl.textContent = '';
    filtered.forEach((item) => resultsEl.append(renderItem(item)));
    emptyEl.hidden = filtered.length > 0;
    statusEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'file' : 'files'}`;

    filtersEl.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(lower(btn.dataset.category) === activeCategory));
    });
  }

  function makeChip(label, value) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asset-library-chip';
    btn.textContent = label;
    btn.dataset.category = value;
    btn.setAttribute('aria-pressed', String(lower(value) === activeCategory));
    btn.addEventListener('click', () => {
      activeCategory = lower(value);
      syncUrl();
      apply();
    });
    return btn;
  }

  if (categories.length) {
    filtersEl.append(makeChip('All', ''));
    categories.forEach((cat) => filtersEl.append(makeChip(cat, cat)));
  }

  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        syncUrl();
        apply();
      }, 200);
    });
  }

  apply();
}
