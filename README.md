# ContentHub

An AEM Edge Delivery Services site for **event content downloads**, branded to match the
[AI Forum Event Series](https://event.adobe.com/aiforumeventseries). It presents a landing page
where attendees find and download event assets (slides, recordings, documents) — filtered and
personalized by a URL that an external application generates.

## Environments

- **Preview:** https://main--contenthub--adobeaiforum2026.aem.page/
- **Live:** https://main--contenthub--adobeaiforum2026.aem.live/
- **Downloads page:** https://main--contenthub--adobeaiforum2026.aem.live/downloads
- **Content (DA):** https://da.live/#/adobeaiforum2026/contenthub

## What's here

| Piece | Location | Purpose |
|-------|----------|---------|
| **Teaser block** | `blocks/teaser/` | Dark hero: background image + overlaid heading/body/CTA, with optional `{name}` personalization |
| **Asset-library widget** | `widgets/asset-library/` | Reads the URL query string, fetches a data sheet, renders searchable / filterable / downloadable assets |
| **`getPageParams()`** | `scripts/scripts.js` | Shared helper that reads the page URL query string (used by teaser + widget) |
| **Branding** | `styles/`, `fonts/`, `blocks/header/`, `blocks/footer/` | Adobe Clean font, Adobe red accents, Adobe logo, dark hero/footer |

### The download URL contract

The external app links attendees to the downloads page with any of these **optional** query params:

```
/downloads?category=slides&q=keynote&name=Jane%20Doe
```

| Param | Effect |
|-------|--------|
| `category` | Pre-selects a category filter (matched against the sheet's `category` values) |
| `q` | Seeds the search box on load |
| `name` | Personalized greeting ("Welcome, Jane Doe"). Rendered via `textContent` only — never `innerHTML` — so a hostile value cannot inject markup |

The page works with none, some, or all of these. When `name` is absent, the teaser drops the greeting line.

### The asset catalog (data sheet)

The widget fetches a DA-authored sheet published as JSON at **`/data/assets.json`**
(the path is configurable via the authored widget link's `?src=` param). Expected columns:

| Column | Example |
|--------|---------|
| `title` | `Opening Keynote — The State of AI` |
| `category` | `Slides` \| `Recordings` \| `Documents` |
| `tags` | `keynote, ai, 2026` (searched alongside `title`) |
| `type` | `PDF`, `MP4`, … |
| `size` | `4.2 MB` |
| `date` | `2026-06-01` |
| `url` | download URL (a DA Media Bus URL, or any absolute URL) |
| `thumbnail` | *(optional)* image URL |

Edit it at https://da.live/#/adobeaiforum2026/contenthub/data/assets and re-publish. Category facets
are derived from the data automatically — no code change needed to add a category.

### The widget framework

`widgets/asset-library/` is loaded through the repo's widget micro-frontend framework
(`blocks/widget/widget.js` + `buildWidgetAutoBlocks` in `scripts/scripts.js`). Authors drop a plain
link and it becomes the widget:

```
/widgets/asset-library/asset-library?src=/data/assets.json
```

The framework fetches the widget's `.html`, `.css`, and `.js` and calls its default `decorate(el)`.

## Deploying

Code and content deploy **separately** — there is no local server in the delivery path.

### Code → GitHub (`main`)

Block/widget JS/CSS lives in this repo. Push to `main`; **AEM Code Sync** deploys automatically.

```sh
npm run lint        # required before pushing
git push origin main
```

### Content → DA (da.live)

Nav, footer, the download page, and the data sheet live in DA and are pushed via the
DA Source API, then previewed + published. Authenticate first to get an IMS token
(cached at `~/.aem/da-token.json`):

```sh
npx -y github:adobe-rnd/da-auth-helper token
```

Then `PUT` each document to `https://admin.da.live/source/adobeaiforum2026/contenthub/<path>`
and `POST` `https://admin.hlx.page/{preview,live}/adobeaiforum2026/contenthub/main/<path>`.
A data sheet's JSON must include `":type": "sheet"` or preview fails with "error from content-bus".

## Branding

- **Font:** Adobe Clean, self-hosted as `fonts/adobe-clean-{regular,bold}.woff`.
- **Logo:** Adobe red wordmark, stored in DA at `/media/adobe-logo.png`, referenced by the `/nav`.
- **Hero:** the AI Forum neon-"A" marquee (`/media/ai-forum-hero.png`) as a dark teaser background.
- **Colors:** Adobe red `#eb1000` accents, `#000` hero, dark footer — see `styles/styles.css` `:root`.

## Local development (optional)

The project deploys without a local server, but you can run one for development:

```sh
npm i
npm install -g @adobe/aem-cli
aem up          # serves at http://localhost:3000 against previewed DA content
```

## Documentation

- [AEM Edge Delivery docs](https://www.aem.live/docs/)
- [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)
- [Web Performance](https://www.aem.live/developer/keeping-it-100)
- Project conventions: see [`AGENTS.md`](./AGENTS.md)
