# ContentHub

An AEM Edge Delivery Services site for **event content downloads**, branded to match the
[AI Forum Event Series](https://event.adobe.com/aiforumeventseries). It presents a post-event hub
where attendees get a role-based call to action, find and download their event assets, and browse
the full event content library — all driven by a URL that an external application generates.

## Environments

- **Preview:** https://main--contenthub--adobeaiforum2026.aem.page/
- **Live:** https://main--contenthub--adobeaiforum2026.aem.live/
- **Downloads page:** https://main--contenthub--adobeaiforum2026.aem.live/downloads
- **Content (DA):** https://da.live/#/adobeaiforum2026/contenthub

## Page structure

The download page is assembled in DA from these sections, top to bottom:

1. **Teaser** — short dark banner: "Adobe AI Forum" + tagline over the neon-"A" marquee.
2. **Role CTA** (`role-cta` widget) — a per-role heading/body/button, personalized by name.
3. **Personalized Content** (`asset-library` widget) — searchable / filterable / downloadable assets.
4. **All Event Content** (`cards` block) — static cards of Adobe resources (blogs, reports, webinars).
5. **Footer** — Adobe bug + social links + legal.

## What's here

| Piece | Location | Purpose |
|-------|----------|---------|
| **Teaser block** | `blocks/teaser/` | Short dark hero: marquee background (`object-fit: contain`, right-anchored) + overlaid heading/tagline |
| **Role-CTA widget** | `widgets/role-cta/` | Reads `?role=`, looks up copy in the roles sheet, personalizes the heading with `?name=` |
| **Asset-library widget** | `widgets/asset-library/` | Reads the URL query string, fetches the assets sheet, renders search + category filters + download cards |
| **Cards block** | `blocks/cards/` | Static "All Event Content" cards (image, title, description, outline CTA) authored in DA |
| **`getPageParams()`** | `scripts/scripts.js` | Shared helper that reads the page URL query string |
| **Branding** | `styles/`, `fonts/`, `icons/`, `blocks/header/`, `blocks/footer/` | Adobe Clean font, Adobe red accents, Adobe logo, social icons |

## The URL contract

The external app links attendees to the downloads page with any of these **optional** query params:

```
/downloads?role=Developer&name=Jane%20Doe&category=Slides&q=keynote&ids=opening-keynote-slides,attendee-guide
```

| Param | Consumed by | Effect |
|-------|-------------|--------|
| `role` | role-cta | Selects the matching row in the roles sheet (falls back to the `default` row) |
| `name` | role-cta | Personalizes the CTA heading (`{name}` token). Rendered via `textContent` only — never `innerHTML` — so a hostile value cannot inject markup |
| `category` | asset-library | Pre-selects a category filter (matched against the sheet's `category` values) |
| `q` | asset-library | Seeds the search box on load |
| `ids` | asset-library | Comma-separated asset `id`s; restricts the list to those assets, in that order |

The page works with none, some, or all of these.

## Data sheets (DA → JSON)

Both widgets read DA-authored sheets published as JSON. A sheet's JSON **must** include
`":type": "sheet"` or preview fails with "error from content-bus".

### Assets — `/data/assets.json`

| Column | Example |
|--------|---------|
| `id` | `opening-keynote-slides` (matched by `?ids=`) |
| `title` | `Opening Keynote — The State of AI` |
| `description` | shown under the title on the card |
| `category` | `Slides` \| `Recordings` \| `Documents` (facets are derived automatically) |
| `tags` | `keynote, ai, 2026` (searched alongside `title`) |
| `type` | `PDF`, `MP4`, … (shown on the card placeholder) |
| `size` | `4.2 MB` |
| `date` | `2026-06-01` |
| `url` | download URL (a DA Media Bus URL, or any absolute URL) |
| `thumbnail` | *(optional)* image URL; a branded gradient placeholder is used if absent |

Edit at https://da.live/#/adobeaiforum2026/contenthub/data/assets

### Roles — `/data/roles.json`

| Column | Example |
|--------|---------|
| `role` | `Developer` (matched by `?role=`; use `default` for the fallback row) |
| `heading` | `Thanks for being part of Adobe AI Forum, {name}.` |
| `body` | intro paragraph |
| `ctalabel` | `Talk through next steps` |
| `ctalink` | the button destination URL |

Edit at https://da.live/#/adobeaiforum2026/contenthub/data/roles

## The widget framework

`role-cta` and `asset-library` load through the repo's widget micro-frontend framework
(`blocks/widget/widget.js` + `buildWidgetAutoBlocks` in `scripts/scripts.js`). Authors drop a plain
link and it becomes the widget; the framework fetches the widget's `.html`, `.css`, and `.js` and
calls its default `decorate(el)`:

```
/widgets/asset-library/asset-library?src=/data/assets.json
/widgets/role-cta/role-cta?src=/data/roles.json
```

## Deploying

Code and content deploy **separately** — there is no local server in the delivery path.

### Code → GitHub (`main`)

Block/widget JS/CSS lives in this repo. Push to `main`; **AEM Code Sync** deploys automatically.

```sh
npm run lint        # required before pushing
git push origin main
```

### Content → DA (da.live)

Nav, footer, the download page, and the data sheets live in DA, pushed via the DA Source API then
previewed + published. Authenticate first for an IMS token (cached at `~/.aem/da-token.json`):

```sh
npx -y github:adobe-rnd/da-auth-helper token
```

Then `PUT` each document to `https://admin.da.live/source/adobeaiforum2026/contenthub/<path>`
and `POST` `https://admin.hlx.page/{preview,live}/adobeaiforum2026/contenthub/main/<path>`.
Images referenced by absolute URL (Adobe CDN, `content.da.live`) are ingested into Media Bus on
preview — they need no separate upload.

## Branding

- **Font:** Adobe Clean, self-hosted as `fonts/adobe-clean-{regular,bold}.woff`.
- **Logo:** Adobe red wordmark, stored in DA at `/media/adobe-logo.png`, referenced by the `/nav`.
- **Hero:** the AI Forum neon-"A" marquee (`/media/ai-forum-hero.png`) as a dark teaser background.
- **Footer:** Adobe bug + Facebook / X / LinkedIn / Instagram icons (`icons/*.svg`) + legal links.
- **Colors:** Adobe red `#eb1000` accents, `#000` hero — see `styles/styles.css` `:root`.

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
