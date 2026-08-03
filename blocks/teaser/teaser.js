import { getPageParams } from '../../scripts/scripts.js';

const NAME_TOKEN = '{name}';

/**
 * Replaces `{name}` placeholders with the visitor's name from the page URL
 * (`?name=Jane`). When no name is provided, the element holding the token is
 * removed so no dangling "Welcome," greeting is shown. Uses text nodes only
 * (never innerHTML) so a hostile `name` value cannot inject markup.
 * @param {Element} block The teaser block element
 */
function personalize(block) {
  const name = (getPageParams().get('name') || '').trim();
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const tokenNodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes(NAME_TOKEN)) {
      tokenNodes.push(walker.currentNode);
    }
  }
  tokenNodes.forEach((node) => {
    if (name) {
      node.nodeValue = node.nodeValue.split(NAME_TOKEN).join(name);
    } else {
      const holder = node.parentElement.closest('h1, h2, h3, h4, h5, h6, p') || node.parentElement;
      holder.remove();
    }
  });
}

/**
 * Loads and decorates the teaser block.
 * Content model: any row containing only an image becomes the background;
 * remaining rows become the overlaid text content (heading, body, CTA).
 * @param {Element} block The teaser block element
 */
export default function decorate(block) {
  const bg = document.createElement('div');
  bg.className = 'teaser-bg';
  const content = document.createElement('div');
  content.className = 'teaser-content';

  [...block.children].forEach((row) => {
    const picture = row.querySelector('picture');
    const imageOnly = picture && !row.textContent.trim();
    if (imageOnly) {
      bg.append(picture);
    } else {
      [...row.children].forEach((cell) => {
        while (cell.firstChild) content.append(cell.firstChild);
      });
    }
  });

  block.textContent = '';
  if (bg.children.length) block.append(bg);
  block.append(content);

  personalize(block);
}
