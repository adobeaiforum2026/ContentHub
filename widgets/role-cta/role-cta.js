import { getPageParams } from '../../scripts/scripts.js';

const DEFAULT_SRC = '/data/roles.json';

const norm = (value) => (value || '').toString().trim().toLowerCase();

/**
 * Substitutes `{name}` with the visitor's name. When no name is present the
 * placeholder (and any leading comma/space) is removed so the sentence still
 * reads cleanly. Text is set via textContent by the caller, never innerHTML.
 * @param {string} text authored copy
 * @param {string} name visitor name from the URL
 * @returns {string}
 */
function fillName(text, name) {
  if (!text) return '';
  if (name) return text.split('{name}').join(name);
  return text.replace(/,?\s*\{name\}/g, '');
}

/**
 * Fetches the roles sheet (DA sheet published as JSON).
 * @param {string} src JSON URL
 * @returns {Promise<Array>}
 */
async function fetchRoles(src) {
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Failed to load roles: ${resp.status}`);
  const json = await resp.json();
  return Array.isArray(json) ? json : json.data || [];
}

/**
 * Loads and decorates the role-based call-to-action.
 * Reads `role` and `name` from the page URL, looks up the matching row in the
 * roles sheet (falling back to the `default` row), and renders a heading, body
 * and button.
 * @param {Element} widget The widget element
 */
export default async function decorate(widget) {
  const src = widget.dataset.src || DEFAULT_SRC;
  const params = getPageParams();
  const role = norm(params.get('role'));
  const name = (params.get('name') || '').trim();

  let rows = [];
  try {
    rows = await fetchRoles(src);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('role-cta', error);
    widget.hidden = true;
    return;
  }

  const match = (role && rows.find((r) => norm(r.role) === role))
    || rows.find((r) => norm(r.role) === 'default')
    || rows[0];
  if (!match) {
    widget.hidden = true;
    return;
  }

  widget.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'role-cta-heading';
  heading.textContent = fillName(match.heading, name);
  widget.append(heading);

  const bodyText = fillName(match.body, name);
  if (bodyText) {
    const body = document.createElement('p');
    body.className = 'role-cta-body';
    body.textContent = bodyText;
    widget.append(body);
  }

  const label = match.ctalabel || match.ctaLabel;
  const link = match.ctalink || match.ctaLink;
  if (label && link) {
    const actions = document.createElement('p');
    actions.className = 'role-cta-actions';
    const button = document.createElement('a');
    button.className = 'role-cta-button';
    button.href = link;
    button.textContent = label;
    actions.append(button);
    widget.append(actions);
  }
}
