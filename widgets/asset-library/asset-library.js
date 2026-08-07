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
 * Builds one asset card: image (or typed placeholder) on top, then title,
 * description and a Download button. Every value is written via textContent /
 * element properties (never innerHTML) so authored data cannot inject markup.
 * @param {object} item asset row
 * @returns {HTMLLIElement}
 */
function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'asset-library-item';

  const card = document.createElement('article');
  card.className = 'asset-library-card';

  const thumb = document.createElement('div');
  thumb.className = 'asset-library-thumb';
  if (item.thumbnail) {
    const img = document.createElement('img');
    img.src = item.thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    thumb.append(img);
  } else {
    thumb.classList.add('asset-library-thumb-placeholder');
    const label = document.createElement('span');
    label.textContent = item.type || 'FILE';
    thumb.append(label);
  }
  card.append(thumb);

  const body = document.createElement('div');
  body.className = 'asset-library-body';

  const title = document.createElement('h3');
  title.className = 'asset-library-title';
  title.textContent = item.title || item.name || 'Untitled';
  body.append(title);

  const desc = document.createElement('p');
  desc.className = 'asset-library-desc';
  desc.textContent = item.description || [item.type, item.size].filter(Boolean).join(' · ');
  body.append(desc);

  const btnText = (item.buttonText || item.cta || '').trim() || 'Download';
  const download = document.createElement('a');
  download.className = 'asset-library-download';
  download.href = item.url || item.link;
  download.setAttribute('download', '');
  download.textContent = btnText;
  download.setAttribute('aria-label', `${btnText}: ${item.title || item.name || 'file'}`);
  body.append(download);

  card.append(body);
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

  const searchInput = widget.querySelector('.asset-library-search-input');
  const filtersEl = widget.querySelector('.asset-library-filters');
  const statusEl = widget.querySelector('.asset-library-status');
  const resultsEl = widget.querySelector('.asset-library-results');
  const emptyEl = widget.querySelector('.asset-library-empty');

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

  // optional `?ids=a,b,c` restricts the list to those asset ids, in that order
  const idsParam = params.get('ids');
  if (idsParam) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const byId = new Map(assets.map((a) => [String(a.id || '').trim(), a]));
    assets = ids.map((id) => byId.get(id)).filter(Boolean);
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
