# Portfolio pages

This branch combines the focused pages proposed in PR #4 with the shorter home
direction from PR #5. It is based on `main` and does not require either PR to merge.

- `/`: introduction with the headline numbers up front, then the VCR (see below),
  the Ken Robinson quote, About/Buffer recognition, and contact.
- `/social/`: posts grouped by personality, campaigns, and community.
- `/writing/`: the ten curated pieces from PR #4, grouped by writing purpose;
  additional brand and Medium writing remains available in an expandable list.
- `/video/`: seven videos grouped by audience, with production capabilities.
- `/builder/`: three accessible projects, contribution notes, and AI practice.
- `/work-samples.html`: a small directory linking to the four portfolios.

Each specialty page has its own introduction, metadata, work, relevant experience,
contact options, resume link, and navigation back to the rest of the portfolio.
Existing case-study URLs and their full content are preserved.

## Editing

The original `writing.json`, `social.json`, `video.json`, and `builders.json` remain
the sources for sample titles and destinations. `portfolio-curation.json` selects
and orders IDs, groups them, and adds brief format/context notes. These notes
describe the samples; they do not assert individual performance or sole authorship.

Edit homepage copy, page introductions, shared navigation, and contact copy in
`scripts/render-portfolio.mjs`. Edit appearance in `assets/css/site.css` and media
enhancements in `assets/js/site.js`. Regenerate and commit the resulting HTML:

```sh
node scripts/render-portfolio.mjs
python3 -m http.server 8765
```

The generated HTML is committed so sample links, content, and metadata work on a
plain static server and without JavaScript. Don't edit generated HTML directly.
The generator rejects missing sample IDs and context before writing any pages.
It also produces `sitemap.xml`.

Netlify still runs the existing Medium sync, then regenerates the pages. The
scheduled GitHub workflow commits both updated writing data and its rendered page.
No npm packages, framework, or runtime CSS service is needed. Space Grotesk is an
optional web font with a system fallback; older case-study pages retain their
existing styles and CDN dependencies.

Instagram previews load only when opened. YouTube players load only when played;
thumbnails are lazy-loaded. Original-source links remain visible if embeds fail or
JavaScript is disabled. Old homepage/archive fragments (`#writing`, `#social`,
`#video`, `#builder`) forward to the corresponding portfolio when JavaScript runs.

The existing `portfolio-contact` Netlify form and `/success` route are preserved.
The form now includes full-time, freelance, fractional, and part-time inquiry types.
Check delivery in Netlify after deployment; local testing must not submit a real inquiry.

## The home page video wall

The home page is a short intro (with the headline numbers), then a video-store
wall: **New releases** are the four portfolio pages, **Staff picks** are the case
studies, plus a blank "Be Wrong" tape that plays the Ken Robinson quote. Contact
lives at **the front desk** below it.

- **Covers are the links.** Each cover is a plain link to `/social/`, `/writing/`,
  `/video/`, `/builder/` or a case study, so those URLs still stand alone and are
  what you send people. No JavaScript needed to use the site.
- **The show.** `assets/js/vcr.js` turns a tap into: the case opens, a VCR slides
  up from the bottom of the screen, the tape goes in, the whole screen plays static
  and a title card, then the page loads. Repeat plays speed up; reduced-motion
  visitors and modifier-clicks just follow the link.
- **Eject.** The back link on each portfolio page is "⏏ Eject". It returns to
  `/#tv` and the tape pops out of the VCR back into its case. The browser back
  button does the same.
- **Editing.** Covers come from `RELEASES` and `PICKS` in
  `scripts/render-portfolio.mjs` (title, tagline, proof line, credits, colors,
  link). Styles are in `assets/css/vcr.css`. Everything is HTML/CSS; only
  transforms and opacity animate, so it stays light on phones.
