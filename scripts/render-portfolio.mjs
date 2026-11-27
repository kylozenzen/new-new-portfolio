/**
 * Render crawlable portfolio pages from the existing sample data.
 * No dependencies. Run after update-medium-writing.mjs during Netlify builds.
 * Curation and sample context live in portfolio-curation.json; page copy lives here.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const [writing, social, video, builders, curation] = await Promise.all([
  'writing.json', 'social.json', 'video.json', 'builders.json', 'portfolio-curation.json'
].map(read));
const origin = 'https://bencampbell.netlify.app';
const resume = 'https://drive.google.com/file/d/1UCN5ni_gwb2K2jXjWVzgLvumo0GQTx6N/view?usp=sharing';
const email = 'mailto:hirebencampbell@gmail.com';
const linkedin = 'https://linkedin.com/in/bencampbell8';
const bufferStory = 'https://buffer.com/resources/postiq-case-study/';
const openTabs = 'https://theweeklyscrollbybuffer.substack.com/p/open-tabs-with-ben-campbell';
const studio = 'https://nobodycreative.netlify.app';
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const href = value => {
  if (typeof value !== 'string' || !/^(https:\/\/|mailto:|\/(?!\/)|#\w)/.test(value)) throw new Error(`Invalid portfolio URL: ${value}`);
  return e(value);
};
const ext = (url, label, cls = 'text-link') => `<a class="${e(cls)}" href="${href(url)}" target="_blank" rel="noopener noreferrer">${e(label)} <span aria-hidden="true">↗</span></a>`;
const sources = { writing: writing.items, social: social.posts, video: video.videos, builder: builders.projects };
const item = (lens, id) => {
  const found = sources[lens].find(entry => entry.id === id);
  if (!found) throw new Error(`Missing curated ${lens} sample: ${id}`);
  return found;
};
for (const lens of Object.keys(sources)) {
  const ids = curation[lens].groups.flatMap(group => group.items);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate curation in ${lens}`);
  for (const id of ids) {
    item(lens, id);
    if (!curation[lens].context[id]) throw new Error(`Missing context for ${lens}/${id}`);
  }
}

const labels = { social: 'Social', writing: 'Writing', video: 'Video', builder: 'Builder / AI' };
const meta = {
  home: { path: '/', title: 'Ben Campbell | Social Media & Content Marketing', description: 'Social media strategy, copywriting, video, and useful marketing tools. Explore Ben Campbell’s work, case studies, and experience. Open to full-time, freelance, fractional, and part-time opportunities.' },
  writing: { path: '/writing/', title: 'Copywriting & Content Portfolio | Ben Campbell', description: 'Published writing by Ben Campbell: press releases, brand stories, recruiting copy, and product documentation for San Antonio Zoo, Overland Partners, and SaaS.' },
  social: { path: '/social/', title: 'Social Media Portfolio | Ben Campbell', description: 'Social media work by Ben Campbell: campaigns, brand personality, and community content for San Antonio Zoo, with the strategy and case studies behind the posts.' },
  video: { path: '/video/', title: 'Video & Content Production Portfolio | Ben Campbell', description: 'Video work by Ben Campbell for San Antonio Zoo and Codeup: destination stories, fundraising, explainers, and social content, with production capabilities and context.' },
  builder: { path: '/builder/', title: 'Builder & AI Portfolio | Ben Campbell', description: 'Marketing tools and creative products built by Ben Campbell: PostIQ, Receipts, and Plot Twisted. Product thinking, workflow design, and AI-assisted development, featured by Buffer.' },
  work: { path: '/work-samples.html', title: 'Work Samples | Ben Campbell', description: 'Choose a focused portfolio: social media, copywriting, video, or builder and AI work by Ben Campbell. Published examples, context, and ways to get in touch.' }
};

function header(lens = 'home') {
  const home = lens === 'home';
  const directory = lens === 'work';
  const nav = home ? [['#tv', 'New releases']] : directory ? [['/#work', 'Home'], ['/case-studies.html', 'Case studies']] : [['#work', `${labels[lens]} work`], [lens === 'builder' ? '#approach' : '#case-study', lens === 'builder' ? 'Approach' : 'Case study']];
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header"><div class="wrap header-inner">
  <a class="wordmark" href="/" aria-label="Ben Campbell — home"><span aria-hidden="true">BC.</span> BEN CAMPBELL.</a>
  <nav class="primary-nav" aria-label="Primary">${nav.map(([url, text]) => `<a href="${url}">${e(text)}</a>`).join('')}<a class="nav-contact" href="${directory ? '/#contact' : '#contact'}">Let’s talk <span aria-hidden="true">↗</span></a></nav>
</div></header>`;
}

// Profile links — persistent identity, every page. Separate job from the links
// on individual work samples, which stay on the work.
const SOCIALS = [
  ['LinkedIn', 'https://linkedin.com/in/bencampbell8'],
  ['X', 'https://x.com/Ben_Soup'],
  ['Instagram', 'https://instagram.com/bensoup'],
  ['Threads', 'https://www.threads.net/@bensoup'],
  ['Medium', 'https://medium.com/@hirebencampbell'],
  ['GitHub', 'https://github.com/kylozenzen'],
];

function footer(lens = 'home') {
  return `<footer class="site-footer"><div class="wrap">
  <div class="footer-top">
    <nav class="footer-socials" aria-label="Find Ben elsewhere">${SOCIALS.map(([name, url]) => `<a href="${href(url)}" target="_blank" rel="noopener noreferrer">${e(name)}</a>`).join('')}</nav>
    <p class="signoff">This site was built by a marketer, not a developer. If you find a bug, that tracks — tell me and I’ll fix it.</p>
  </div>
  <div class="footer-inner"><p>Ben Campbell © 2026 · San Antonio, TX</p><nav aria-label="Explore portfolios">${Object.entries(labels).map(([key, label]) => `<a href="/${key}/"${lens === key ? ' aria-current="page"' : ''}>${e(label)}</a>`).join('')}<a href="/">Home</a></nav></div>
</div></footer>`;
}

function page(key, content) {
  const m = meta[key];
  const structured = { '@context': 'https://schema.org', '@type': key === 'home' ? 'ProfilePage' : 'CollectionPage', name: m.title, url: origin + m.path, description: m.description, mainEntity: { '@type': 'Person', name: 'Ben Campbell', url: origin, jobTitle: 'Social Media & Content Marketing Professional', sameAs: [linkedin, 'https://github.com/kylozenzen'] } };
  return `<!DOCTYPE html>
<!-- Generated by scripts/render-portfolio.mjs. Edit that file or portfolio-curation.json, then rerun the script. -->
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(m.title)}</title><meta name="description" content="${e(m.description)}"><meta name="author" content="Ben Campbell">
<link rel="canonical" href="${origin}${m.path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ben Campbell Creative">
<meta property="og:title" content="${e(m.title)}"><meta property="og:description" content="${e(m.description)}"><meta property="og:url" content="${origin}${m.path}">
<meta property="og:image" content="${origin}/assets/images/portfolio-share-card.png?v=2"><meta property="og:image:alt" content="Ben Campbell Creative portfolio">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:url" content="${origin}${m.path}"><meta name="twitter:title" content="${e(m.title)}"><meta name="twitter:description" content="${e(m.description)}">
<meta name="twitter:image" content="${origin}/assets/images/portfolio-share-card.png?v=2"><meta name="twitter:image:alt" content="Ben Campbell Creative portfolio">
<meta name="theme-color" content="#fffdf8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css"><link rel="stylesheet" href="/assets/css/charm.css">${key === 'home' ? HOME_HEAD : ''}<script>addEventListener('pagereveal',e=>{const t=e.viewTransition;if(t){t.ready.catch(()=>{});t.finished.catch(()=>{})}})</script><script src="/assets/js/site.js" defer></script>
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
</head><body data-lens="${key}">${header(key)}<main id="main-content">${content}</main>${footer(key)}</body></html>\n`;
}


// Original line icons drawn in SVG. Paths are dashed so CSS can draw them in on
// reveal and redraw on hover. currentColor keeps each on its card accent.
const ICONS = {
  social: '<path pathLength="1" d="M4 6h24v15H15l-6 5v-5H4z"/><circle pathLength="1" cx="12" cy="13.5" r="1.4"/><circle pathLength="1" cx="16.5" cy="13.5" r="1.4"/><circle pathLength="1" cx="21" cy="13.5" r="1.4"/>',
  writing: '<path pathLength="1" d="M6 24 24 6l4 4L12 28l-7 2z"/><path pathLength="1" d="M20 10l4 4"/><path pathLength="1" d="M4 32h26"/>',
  video: '<rect pathLength="1" x="3" y="8" width="19" height="17" rx="2"/><path pathLength="1" d="M22 14l8-4v14l-8-4z"/><path pathLength="1" d="M9.5 13l6.5 3.5-6.5 3.5z"/>',
  builder: '<path pathLength="1" d="M11 10 4 17l7 7"/><path pathLength="1" d="M21 10l7 7-7 7"/><path pathLength="1" d="M18.5 7l-5 20"/>',
};

function icon(key) {
  return `<span class="card-icon" aria-hidden="true"><svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || ''}</svg></span>`;
}

function workCards() {
  const cards = [
    { key: 'social', kicker: 'Campaigns + community', description: 'Brand personality, timely campaigns, and conversations worth joining.', client: 'San Antonio Zoo · Instagram', sample: item('social', 'poop-candle').title, url: item('social', 'poop-candle').permalink },
    { key: 'writing', kicker: 'Copy + brand storytelling', description: 'Press, brand stories, web copy, and product guidance with a clear purpose.', client: 'San Antonio Zoo · Brand story', sample: 'Love is Wild: Valentine’s Day', url: item('writing', 'love-is-wild').url },
    { key: 'video', kicker: 'Concept through the cut', description: 'Destination stories, explainers, and content made to be watched.', client: 'San Antonio Zoo · Video', sample: 'End of Year Recap', url: `https://www.youtube.com/watch?v=${item('video', 'end-of-year').youtubeId}` },
    { key: 'builder', kicker: 'Tools + experiments', description: 'Marketing problems turned into working tools and creative products.', client: 'Nobody Creative · Buffer companion', sample: 'PostIQ', url: item('builder', 'postiq').url }
  ];
  return `<div class="work-grid">${cards.map(card => `<article class="work-card ${card.key}" id="${card.key}">
  <div class="work-card-top">${icon(card.key)}<div class="work-card-title"><p class="eyebrow">${e(card.kicker)}</p><h3><a href="/${card.key}/">${e(labels[card.key])}</a></h3></div></div>
  <div class="work-card-body"><p>${e(card.description)}</p><div class="sample-peek"><span>${e(card.client)}</span>${ext(card.url, card.sample, '')}</div>
  <a class="portfolio-link" href="/${card.key}/">Explore ${card.key === 'builder' ? 'builder / AI' : card.key} work <span aria-hidden="true">→</span></a></div></article>`).join('')}</div>`;
}

function contact({ home = false, title = 'Like what you see?', description = 'Open to full-time roles, freelance projects, and fractional or part-time support in social media, content marketing, and branding.' } = {}) {
  return `<section class="section contact" id="contact" aria-labelledby="contact-heading"><div class="wrap contact-grid">
  <div><p class="eyebrow">Let’s talk</p><h2 id="contact-heading">${title}</h2></div><div><p>${e(description)}</p><div class="actions"><a class="button" href="${email}">Email Ben <span aria-hidden="true">↗</span></a>${ext(linkedin, 'LinkedIn')}</div>
  ${home ? `<details class="contact-details"><summary>Prefer a form? Send a note.</summary>
    <form class="contact-form" name="portfolio-contact" method="POST" action="/success" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="portfolio-contact"><p hidden><label>Leave this empty: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <div class="form-row"><div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div></div>
    <div class="field"><label for="inquiry-type">What kind of help?</label><select id="inquiry-type" name="inquiry-type" required><option value="">Choose an option</option><option>Full-time role</option><option>Freelance project</option><option>Fractional support</option><option>Part-time support</option></select></div>
    <div class="field"><label for="message">What do you have in mind?</label><textarea id="message" name="message" rows="4" placeholder="The role, project, or creative problem you need help with." required></textarea></div><button class="button" type="submit">Send a note <span aria-hidden="true">→</span></button></form></details>` : `<p class="location">${ext(resume, 'View resume')} · <a href="/#contact">Contact form</a></p>`}
  </div></div></section>`;
}

const TICKER_WORDS = '/// NOW SHOWING /// SOCIAL STRATEGY /// CONTENT SYSTEMS /// CAMPAIGNS /// COMMUNITY /// COPYWRITING /// VIDEO /// BUILT TOOLS ///&nbsp;';

// Repeated four times so the -50% translate loops seamlessly at any width.
function ticker() {
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${`<span>${TICKER_WORDS}</span>`.repeat(4)}</div></div>`;
}

function stats() {
  const figures = [
    ['6M+', 'Audience footprint', 'Across every channel I have helped run'],
    ['470M+', 'Organic impressions', 'Not one dollar of that was paid'],
    ['15M+', 'Interactions', 'Comments I read. Most of them, anyway'],
    ['$75K+', 'Attributed revenue', 'Tickets, memberships, and merch'],
  ];
  return `<section class="stats" aria-labelledby="stats-heading"><div class="wrap"><p class="eyebrow">A few useful receipts</p><h2 id="stats-heading">The numbers behind the work.</h2><p class="stats-note">Career totals across destination brands, tech education, architecture, and SaaS. The case studies explain the context and my role.</p><div class="stat-grid">${figures.map(([figure, label, note]) => `<div class="stat"><b data-count="${figure}">${figure}</b><span>${e(label)}</span><small>${e(note)}</small></div>`).join('')}</div></div></section>`;
}

const medium = 'https://medium.com/@hirebencampbell';

function currently() {
  // The summary carries the whole fact on its own — collapsed must never mean
  // hidden. Opening it only adds detail.
  return `<details class="currently">
  <summary><span class="dot" aria-hidden="true"></span><span>Currently part-time at SeaWorld and building under Nobody Creative, while I look for full-time, freelance, or fractional marketing work.</span></summary>
  <div class="currently-body">
    <p><b>SeaWorld San Antonio</b> — Assistant Supervisor, Education. On the leadership team for 30+ tour guides: training and development, supporting guides during tours and programs, and the operational prep that makes the next day run.</p>
    <p><b>Nobody Creative</b> — my independent studio. Two content apps built on Buffer’s API, PostIQ and Receipts, plus The Feed, a weekly newsletter. Buffer’s product marketing team wrote up the apps in May 2026.</p>
  </div>
</details>`;
}

// Photo is optional until Ben adds one — set this to the image path and the
// placeholder disappears. Landscape or square reads best in this layout.
const ethosPhoto = '/assets/images/IMG_7920.jpeg';
function statement() {
  const media = ethosPhoto
    ? `<img src="${href(ethosPhoto)}" alt="Ben Campbell at work" width="720" height="720" loading="lazy">`
    : `<div class="ethos-placeholder" role="img" aria-label="Photo of Ben Campbell, coming soon"><span>Photo goes here</span><small>assets/images/ben-campbell-ethos.jpg</small></div>`;
  return `<section class="ethos" aria-labelledby="ethos-heading"><div class="wrap ethos-grid">
  <figure class="ethos-photo">${media}</figure>
  <div class="ethos-copy">
    <p class="eyebrow" id="ethos-heading">How I work</p>
    <blockquote>If you’re not prepared to be wrong, you’ll never come up with anything original.</blockquote>
    <p class="attrib">Sir Ken Robinson</p>
  </div>
</div></section>`;
}

// ---------------------------------------------------------------------------
// Home: a video-store wall. Every cover is a real link to a portfolio page or
// case study. assets/js/vcr.js adds the show (the case opens, a VCR slides up,
// the tape goes in, the screen plays) and the Eject on the way back.
const HOME_HEAD = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap"><link rel="stylesheet" href="/assets/css/vcr.css"><script src="/assets/js/vcr.js" defer></script>';

const RELEASES = [
  { id: 'social', url: '/social/', title: 'Social', tagline: 'Give people a reason to stop. And stay.', proof: '6M+ audience · 470M+ organic impressions', credits: 'San Antonio Zoo · Codeup · Overland Partners', runtime: '11 posts', color: '#f5a9dc', hot: '#d946ef' },
  { id: 'writing', url: '/writing/', title: 'Writing', tagline: 'The right words. For the right people.', proof: 'Press, brand stories, web and product copy', credits: 'San Antonio Zoo · Overland Partners · SaaS', runtime: '10 pieces', color: '#d5ef89', hot: '#65a30d' },
  { id: 'video', url: '/video/', title: 'Video', tagline: 'A reason to watch. A story worth the time.', proof: 'Destination stories, explainers, fundraising', credits: 'San Antonio Zoo · Codeup', runtime: '7 videos', color: '#a5dfe8', hot: '#0891b2' },
  { id: 'builder', url: '/builder/', title: 'Builder / AI', tagline: 'Marketing instincts. Working ideas.', proof: 'Featured by Buffer · May 2026', credits: 'Nobody Creative', runtime: '3 projects', color: '#f8db77', hot: '#ca8a04' },
];
const PICKS = [
  { id: 'zoo', url: '/case-studies/san-antonio-zoo.html', title: 'San Antonio Zoo', genre: 'Social strategy + content operations', tagline: 'A repeatable planning system with room for the moments nobody could schedule.', proof: '6M+ audience supported · +15% comments and shares', color: '#f5a9dc', hot: '#d946ef' },
  { id: 'codeup', url: '/case-studies/codeup.html', title: 'Codeup', genre: 'Growth + community marketing', tagline: 'Connecting content, community, events, and the path from curiosity to application.', proof: '+25% student applications · shared marketing outcome', color: '#a5dfe8', hot: '#0891b2' },
  { id: 'overland', url: '/case-studies/overland-partners.html', title: 'Overland Partners', genre: 'Brand storytelling + content', tagline: 'Making complex architecture and firm news clear, human, and useful.', proof: 'One brand voice across web, press, and recruiting', color: '#d5ef89', hot: '#65a30d' },
  { id: 'nobody', url: '/case-studies/nobody-creative.html', title: 'Nobody Creative', genre: 'Brand + product + creative direction', tagline: 'A growing collection of apps, games, and experiments turned into one studio brand.', proof: 'Built from zero: name, identity, products, audience', color: '#f8db77', hot: '#ca8a04' },
];
const QUOTE = 'If you’re not prepared to be wrong, you’ll never come up with anything original.';

// The four lens covers get original art built from the site's line icons.
const coverArt = key => `<svg class="vhs-art" viewBox="0 0 120 120" aria-hidden="true"><g class="burst">${Array.from({ length: 12 }, (_, i) => `<path d="M60 60 L${60 + 64 * Math.cos(i * Math.PI / 6 - 0.13)} ${60 + 64 * Math.sin(i * Math.PI / 6 - 0.13)} L${60 + 64 * Math.cos(i * Math.PI / 6 + 0.13)} ${60 + 64 * Math.sin(i * Math.PI / 6 + 0.13)}Z"/>`).join('')}</g><circle cx="60" cy="60" r="34" class="disc"/><g transform="translate(37 37) scale(1.36)" fill="none" stroke="#151515" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</g></svg>`;

const tape = label => `<span class="vhs-inside" aria-hidden="true"><span class="vhs-tape"><span class="vhs-reel"></span><span class="vhs-reel"></span><span class="vhs-tape-label">${e(label)}</span></span></span>`;

function releaseCover(r) {
  return `<li><a class="vhs release" href="${href(r.url)}" data-tape="${e(r.id)}" data-title="${e(r.title)}" data-tagline="${e(r.tagline)}" style="--c:${e(r.color)};--hot:${e(r.hot)}">
  <span class="vhs-box">${tape(r.title)}<span class="vhs-front">
    <span class="vhs-top"><span>Ben Campbell</span><span class="vhs-new">New release</span></span>
    ${coverArt(r.id)}
    <span class="vhs-title">${e(r.title)}</span>
    <span class="vhs-tagline">${e(r.tagline)}</span>
    <span class="vhs-proof">${e(r.proof)}</span>
    <span class="vhs-foot"><span class="vhs-rating"><b>PG</b>Professional<br>grade</span><span class="vhs-credits">${e(r.credits)}<br>${e(r.runtime)}</span></span>
  </span><span class="vhs-edge" aria-hidden="true"></span></span></a></li>`;
}
function pickCover(p) {
  return `<li><a class="vhs pick" href="${href(p.url)}" data-tape="${e(p.id)}" data-title="${e(p.title)}" data-tagline="${e(p.tagline)}" style="--c:${e(p.color)};--hot:${e(p.hot)}">
  <span class="vhs-box">${tape(p.title)}<span class="vhs-front">
    <span class="vhs-sticker" aria-hidden="true">Staff<br>pick</span>
    <span class="vhs-genre"><span>${e(p.genre)}</span></span>
    <span class="vhs-title">${e(p.title)}</span>
    <span class="vhs-tagline">${e(p.tagline)}</span>
    <span class="vhs-proof">${e(p.proof)}</span>
    <span class="vhs-rewind" aria-hidden="true">Be kind, rewind</span>
  </span><span class="vhs-edge" aria-hidden="true"></span></span></a></li>`;
}

function wallSection() {
  return `<section class="wall" id="tv" aria-labelledby="tv-heading"><div class="wrap">
  <div class="wall-head"><h2 id="tv-heading" class="neon">New releases</h2><p>Pick a tape. Each one plays a portfolio.</p></div>
  <ul class="rack releases" role="list">${RELEASES.map(releaseCover).join('')}</ul>
  <div class="wall-head picks-head"><h2 class="neon small">Staff picks</h2><p>The case studies: the thinking behind the work.</p></div>
  <ul class="rack picks" role="list">${PICKS.map(pickCover).join('')}
    <li><button class="vhs blank" type="button" data-quote="${e(QUOTE)}" style="--c:#fffdf3;--hot:#151515" aria-label="A blank tape labeled Be Wrong. ${e(QUOTE)} Sir Ken Robinson.">
      <span class="vhs-box">${tape('Be wrong')}<span class="vhs-front">
        <span class="vhs-handwritten">Be wrong</span>
        <span class="vhs-note">${e(QUOTE)}<br>— Sir Ken Robinson</span>
        <span class="vhs-rewind" aria-hidden="true">Do not tape over</span>
      </span><span class="vhs-edge" aria-hidden="true"></span></span></button></li>
  </ul>
</div></section>`;
}

function frontDesk() {
  return `<section class="section contact front-desk" id="contact" aria-labelledby="contact-heading"><div class="wrap contact-grid">
  <div><p class="eyebrow">The front desk</p><h2 id="contact-heading">Good work starts<br>with a conversation.</h2>
    <div class="member-card" aria-hidden="true"><span class="mc-top">Membership</span><b>Ben Campbell</b><span>San Antonio, TX · No late fees</span><span class="mc-bars"></span></div></div>
  <div><p>Open to full-time roles, freelance projects, and fractional or part-time support in social media, content marketing, and branding.</p><div class="actions"><a class="button" href="${email}">Email Ben <span aria-hidden="true">↗</span></a>${ext(linkedin, 'LinkedIn')}${ext(resume, 'Résumé')}</div>
  ${currently()}
  <p class="personal">Girl dad. Husband to a zookeeper. Movie and theme-park person. Firm believer that “professional” doesn’t have to mean “written by a committee of beige cardigans.”</p>
  <details class="contact-details"><summary>Prefer a form? Send a note.</summary>
    <form class="contact-form" name="portfolio-contact" method="POST" action="/success" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="portfolio-contact"><p hidden><label>Leave this empty: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <div class="form-row"><div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div></div>
    <div class="field"><label for="inquiry-type">What kind of help?</label><select id="inquiry-type" name="inquiry-type" required><option value="">Choose an option</option><option>Full-time role</option><option>Freelance project</option><option>Fractional support</option><option>Part-time support</option></select></div>
    <div class="field"><label for="message">What do you have in mind?</label><textarea id="message" name="message" rows="4" placeholder="The role, project, or creative problem you need help with." required></textarea></div><button class="button" type="submit">Send a note <span aria-hidden="true">→</span></button></form></details>
  </div></div></section>`;
}

function homePage() {
  return page('home', `
<section class="hero home-hero" aria-labelledby="hero-heading"><div class="wrap">
  <div class="hero-grid"><div class="hero-content"><p class="eyebrow">Social media + content marketing</p>
  <h1 id="hero-heading">Social strategy.<br>Stories that <span>stick.</span></h1>
  <p class="hero-copy">I’m Ben. I turn brand goals into campaigns, copy, and content people care about — with the strategy to shape the plan and the hands-on skills to make it happen.</p>
  <div class="actions"><a class="button" href="#tv">Pick a tape <span aria-hidden="true">↓</span></a>${ext(resume, 'View resume')}</div></div>
  <figure class="portrait"><img src="/assets/images/ben-campbell-headshot.jpg" width="400" height="500" alt="Ben Campbell" fetchpriority="high"><figcaption><span>Strategy + sleeves rolled up</span><span aria-hidden="true">↗</span></figcaption></figure></div>
  ${statStrip()}
  <div class="experience-line"><span class="muted">Experience with</span><strong>San Antonio Zoo</strong><strong>Overland Partners</strong><strong>Codeup</strong><strong>SeaWorld</strong><span class="exp-split" aria-hidden="true"></span>${ext(bufferStory, 'Featured by Buffer · May 2026', 'exp-credit')}</div>
</div></section>
${ticker()}
${wallSection()}
${frontDesk()}`);
}

// A lens page is often someone's FIRST page, not their second — Ben sends the
// URL that matches the role. So each one has to carry the proof, the face, and
// the range on its own.
const FIGURES = [['6M+', 'Audience'], ['470M+', 'Impressions'], ['15M+', 'Interactions'], ['$75K+', 'Attributed revenue']];

function statStrip() {
  return `<div class="stat-strip">${FIGURES.map(([figure, label]) => `<div><b>${figure}</b><span>${e(label)}</span></div>`).join('')}<p class="stat-strip-note">Career totals across destination brands, tech education, architecture, and SaaS.</p></div>`;
}

function otherLenses(current) {
  const blurbs = {
    social: 'Campaigns, brand personality, and community',
    writing: 'Press, brand stories, web and product copy',
    video: 'Concept, production, and the final cut',
    builder: 'Marketing tools and creative products',
  };
  const rest = Object.keys(labels).filter(key => key !== current);
  return `<section class="lens-section range" aria-labelledby="range-heading"><div class="wrap">
  <div class="section-head"><div><p class="eyebrow">The rest of the wheelhouse</p><h2 id="range-heading">I also work in.</h2></div><p>Same person, different brief. Each portfolio stands on its own.</p></div>
  <div class="range-grid">${rest.map(key => `<a class="range-card ${key}" href="/${key}/"><span class="range-icon">${icon(key)}</span><span class="range-body"><b>${e(labels[key])}</b><span>${e(blurbs[key])}</span></span><span class="range-go" aria-hidden="true">→</span></a>`).join('')}</div>
</div></section>`;
}

function lensHero(lens, { eyebrow, title, intro, byline, cta }) {
  const credit = lens === 'video' ? '' : `<p class="lens-credit">${ext(bufferStory, 'Featured by Buffer · May 2026', 'exp-credit')}</p>`;
  return `<section class="lens-hero" aria-labelledby="hero-heading"><div class="wrap"><a class="back-link eject-link" href="/#tv" data-eject="${lens}"><span aria-hidden="true">⏏</span> Eject · full portfolio</a>
  <div class="lens-hero-grid">
    <div class="hero-panel"><p class="eyebrow">Ben Campbell / ${e(eyebrow)}</p><h1 id="hero-heading">${title}</h1><p class="intro">${e(intro)}</p><p class="byline">${e(byline)}</p>${credit}<div class="actions"><a class="button" href="#work">${e(cta)} <span aria-hidden="true">↓</span></a>${ext(resume, 'View resume')}</div></div>
    <figure class="lens-portrait"><img src="/assets/images/ben-campbell-headshot.jpg" width="400" height="500" alt="Ben Campbell" loading="lazy"><figcaption>Ben Campbell · San Antonio, TX</figcaption></figure>
  </div>
  ${statStrip()}
</div></section>`;
}

const jumps = lens => `<nav class="jump-nav" aria-label="${e(labels[lens])} sample categories">${curation[lens].groups.map(group => `<a href="#${e(group.id)}">${e(group.title)}</a>`).join('')}</nav>`;
const groupHeading = (group, count) => `<div class="group-head"><p class="eyebrow">${count} ${count === 1 ? 'sample' : 'samples'}</p><h2>${e(group.title)}</h2></div>`;

function relatedCase({ title, description, url, roleTitle, role }) {
  return `<section class="lens-section related-case" id="case-study" aria-labelledby="related-heading"><div class="wrap related-grid"><div><p class="eyebrow">The context behind the work</p><h2 id="related-heading">${e(title)}</h2><p>${e(description)}</p><div class="actions"><a class="button" href="${href(url)}">Read the case study <span aria-hidden="true">→</span></a></div></div><div class="role-note"><h3>${e(roleTitle)}</h3><p>${e(role)}</p></div></div></section>`;
}

function writingItem(entry) {
  const context = curation.writing.context[entry.id] || { format: 'Independent writing', description: entry.id === 'medium-profile' ? 'More writing on marketing, creativity, and building.' : 'A first-person perspective on marketing, work, and building useful things.' };
  const box = new URL(entry.url).hostname.endsWith('box.com');
  return `<article class="writing-item" id="${e(entry.id)}"><p class="sample-meta">${e(entry.client)} · ${e(context.format)}</p><h3>${ext(entry.url, entry.title, '')}</h3><p>${e(context.description)}</p>${ext(entry.url, box ? 'Read release on Box' : 'Read the piece', 'sample-link')}</article>`;
}

function writingPage() {
  const selectedIds = new Set(curation.writing.groups.flatMap(group => group.items));
  const more = writing.items.filter(entry => !selectedIds.has(entry.id));
  return page('writing', `${lensHero('writing', { eyebrow: 'Copywriting + content', title: 'The right words.<br>For the right people.', intro: 'I write brand stories, announcements, web copy, and product documentation that make complex ideas clear and give people a reason to act.', byline: 'Writing and content work for San Antonio Zoo, Overland Partners, and SaaS — shaped for different audiences, brand voices, and stakeholder needs.', cta: 'Read the work' })}
  <section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Selected writing</p><h2 id="work-heading">A brief. An audience. A purpose.</h2></div><p>Ten selected pieces, grouped by the job the writing needed to do. Open any title to read the published work.</p></div>${jumps('writing')}
  ${curation.writing.groups.map(group => `<div class="sample-group" id="${group.id}">${groupHeading(group, group.items.length)}<div class="writing-list">${group.items.map(id => writingItem(item('writing', id))).join('')}</div></div>`).join('')}
  ${more.length ? `<details class="more-writing" open><summary>Independent writing on Medium, most recent first (${more.length})</summary><div class="writing-list">${more.map(writingItem).join('')}</div></details>` : ''}
  </div></section>
  ${relatedCase({ title: 'Overland Partners', description: 'Turning complex architecture, firm news, and culture into clearer press, web, and recruiting stories.', url: '/case-studies/overland-partners.html', roleTitle: 'What I brought to the work', role: 'Writing and editing across announcements, thought leadership, and careers content, with input from project teams, leadership, HR, and business development. The work needed a consistent voice across very different briefs.' })}
  ${otherLenses('writing')}
  ${contact({ title: 'Have a story<br>that needs the right words?', description: 'Available for full-time copywriting and content roles, freelance writing projects, and fractional or part-time content marketing support.' })}`);
}

function socialPage() {
  return page('social', `${lensHero('social', { eyebrow: 'Social strategy + content', title: 'Give people a reason<br>to stop. And stay.', intro: 'I connect brand goals with the way people actually use social: timely campaigns, a recognizable voice, and a community worth showing up for.', byline: 'Selected San Antonio Zoo work from my social and PR role. Planning and execution happened in partnership with the broader marketing team and zoo departments.', cta: 'See the posts' })}
  <section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Selected social work</p><h2 id="work-heading">Different posts. A clear purpose.</h2></div><p>Campaigns, playful brand moments, and community participation. Open an original or preview a post here.</p></div>${jumps('social')}
  ${curation.social.groups.map(group => `<div class="sample-group" id="${group.id}">${groupHeading(group, group.items.length)}${group.items.map((id, index) => {
    const entry = item('social', id), context = curation.social.context[id];
    // One post per group embeds itself when the group scrolls into view; the
    // rest stay one click away, so the page still loads on a phone.
    const lead = index === 0;
    const body = `<div class="sample-body"><p class="sample-meta">San Antonio Zoo · ${e(context.format)}</p><h3>${e(entry.title)}</h3><p>${e(context.description)}</p>${ext(entry.permalink, 'View on Instagram', 'sample-link')}</div>`;
    const preview = lead
      ? `<div class="embed-auto" data-instagram="${href(entry.permalink)}" data-title="${e(entry.title)}"><div class="embed-slot"></div><noscript><p class="embed-fallback">Open the Instagram link to see this post.</p></noscript></div>`
      : `<details class="embed-details" data-instagram="${href(entry.permalink)}" data-title="${e(entry.title)}"><summary>Preview post</summary><div class="embed-slot"></div><noscript><p>Open the Instagram link above to see this post.</p></noscript></details>`;
    return lead
      ? `<article class="sample-lead" id="${e(id)}"><div class="lead-media">${preview}</div><div class="lead-copy"><p class="lead-flag">Featured in this group</p>${body}</div></article>`
      : `<article class="sample-article" id="${e(id)}">${body}${preview}</article>`;
  }).map((html, index) => index === 0 ? html : html).reduce((out, html, index) => {
    // lead sits on its own row; everything after it shares the grid
    if (index === 0) return html + '<div class="sample-grid">';
    return out + html;
  }, '')}</div></div>`).join('')}
  <p class="embed-hint">If Instagram doesn’t display a preview, the original post is one click away.</p></div></section>
  ${relatedCase({ title: 'San Antonio Zoo', description: 'The planning system behind a brand with a 6M+ audience: repeatable formats, room for timely ideas, and closer collaboration across the zoo.', url: '/case-studies/san-antonio-zoo.html', roleTitle: 'The work beyond the post', role: 'I led the planning system and social/PR execution with a broader team. That included calendar strategy, community management, campaign support, and coordination with animal care and other departments.' })}
  ${otherLenses('social')}
  ${contact({ title: 'Let’s give your brand<br>something to say.', description: 'Open to full-time social media roles, freelance campaigns, and fractional or part-time help with strategy, content, and community.' })}`);
}

function videoPage() {
  return page('video', `${lensHero('video', { eyebrow: 'Video + content production', title: 'A reason to watch.<br>A story worth the time.', intro: 'Video for destination brands and tech education, from clear explainers to stories that bring a mission or experience to life.', byline: 'My work spans strategy, scripting, filming, editing, and production support. These are selected team projects from San Antonio Zoo and Codeup; the case studies explain the broader roles.', cta: 'Watch the work' })}
  <section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Selected video</p><h2 id="work-heading">Made for the story.</h2></div><p>Seven examples across destination marketing, nonprofit storytelling, and student recruitment.</p></div>${jumps('video')}
  ${curation.video.groups.map(group => `<div class="sample-group" id="${group.id}">${groupHeading(group, group.items.length)}<div class="sample-grid video-grid">${group.items.map(id => {
    const entry = item('video', id), context = curation.video.context[id];
    if (!/^[\w-]{11}$/.test(entry.youtubeId)) throw new Error(`Invalid YouTube ID: ${id}`);
    const url = `https://www.youtube.com/watch?v=${entry.youtubeId}`;
    return `<article class="sample-article" id="${e(id)}"><div class="video-media"><img src="https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy"><button class="video-play" data-video="${entry.youtubeId}" data-title="${e(entry.title)}" type="button" aria-label="Play ${e(entry.title)}" hidden><span aria-hidden="true">▶</span></button></div><div class="sample-body"><p class="sample-meta">${entry.category === 'Zoo' ? 'San Antonio Zoo' : 'Codeup'} · ${e(context.format)}</p><h3>${e(entry.title)}</h3><p>${e(context.description)}</p>${ext(url, 'Watch on YouTube', 'sample-link')}</div></article>`;
  }).join('')}</div></div>`).join('')}</div></section>
  <section class="lens-section" id="skills" aria-labelledby="skills-heading"><div class="wrap"><p class="eyebrow">Production capabilities</p><h2 id="skills-heading">From the brief to the final cut.</h2><div class="skills"><div><h3>How I contribute</h3><p>${e(video.skills.production)}</p></div><div><h3>Tools I work with</h3><p>${e(video.skills.software)}</p></div></div></div></section>
  ${relatedCase({ title: 'Codeup', description: 'How video, long-form content, events, and community supported prospective students and the people helping them make a career change.', url: '/case-studies/codeup.html', roleTitle: 'Content production inside a larger plan', role: 'I helped create marketing videos and promotional content, supported production and digital events, and connected that work to the student journey. Each piece had a job beyond filling a content slot.' })}
  ${otherLenses('video')}
  ${contact({ title: 'Have something<br>worth showing?', description: 'Available for full-time video and content roles, freelance production projects, and fractional or part-time support for your content team.' })}`);
}

function builderPage() {
  return page('builder', `${lensHero('builder', { eyebrow: 'Builder + AI', title: 'Marketing instincts.<br>Working ideas.', intro: 'I turn workflow problems into tools people can try. I define the audience, shape the experience, and use AI to help prototype, debug, and iterate.', byline: 'Founder of Nobody Creative. Two years working at Codeup gave me a grounding in development; real marketing work gives me the problems worth solving.', cta: 'Explore the projects' })}
  <section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Selected builds</p><h2 id="work-heading">Useful enough to leave the notes app.</h2></div><p>Three projects you can explore, with the problem, my contribution, and a working example.</p></div>${jumps('builder')}
  ${curation.builder.groups.map(group => `<div class="sample-group" id="${group.id}">${groupHeading(group, group.items.length)}<div class="project-grid">${group.items.map(id => {
    const entry = item('builder', id), context = curation.builder.context[id];
    return `<article class="project-card" id="${e(id)}"><div class="project-title"><p class="eyebrow">${e(context.format)}</p><h3>${e(entry.title)}</h3></div><div class="project-body"><p>${e(entry.tagline)}</p><dl><dt>The problem</dt><dd>${e(context.problem)}</dd><dt>My contribution</dt><dd>${e(context.contribution)}</dd><dt>The evidence</dt><dd>${e(context.evidence)}</dd></dl><div class="actions">${ext(entry.url, id === 'receipts-demo' ? 'Explore the demo' : id === 'plot-twisted' ? 'Play Plot Twisted' : 'Open PostIQ', 'button')}${id !== 'plot-twisted' ? ext(bufferStory, 'Buffer feature', 'sample-link') : ''}</div></div></article>`;
  }).join('')}</div></div>`).join('')}</div></section>
  <section class="lens-section related-case" id="approach" aria-labelledby="approach-heading"><div class="wrap"><p class="eyebrow">How I work with AI</p><h2 id="approach-heading">The judgment is part of the job.</h2><div class="process-grid"><div><h3>01 / Find the friction</h3><p>Start with the audience, the task, and the part of the workflow that keeps getting in the way. Give the product a clear job.</p></div><div><h3>02 / Make it work</h3><p>Use AI for research, prototyping, and debugging while I shape the flow, inspect the output, and make the product decisions.</p></div><div><h3>03 / Try it. Improve it.</h3><p>Walk through the experience, check the rough edges, and use feedback to make the next version more useful.</p></div></div><div class="skills"><div><h3>Technical toolkit</h3><p>${e(builders.skills.technical)}</p></div><div><h3>AI practice</h3><p>${e(builders.skills.ai)}</p></div></div><div class="actions"><a class="button" href="/case-studies/nobody-creative.html">Read the Nobody Creative case study <span aria-hidden="true">→</span></a></div></div></section>
  ${otherLenses('builder')}
  ${contact({ title: 'A clunky workflow?<br>A promising idea?', description: 'Open to full-time opportunities and freelance, fractional, or part-time work connecting marketing, content, brand, and useful AI-assisted tools.' })}`);
}

const outputs = new Map([
  ['index.html', homePage()],
  ['writing/index.html', writingPage()],
  ['social/index.html', socialPage()],
  ['video/index.html', videoPage()],
  ['builder/index.html', builderPage()],
  ['work-samples.html', page('work', `<section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><a class="back-link" href="/">← Full creative portfolio</a><div class="section-head" style="margin-top:32px"><div><p class="eyebrow">Work samples</p><h1 id="work-heading">Find the work<br>you came for.</h1></div><p>Each portfolio includes the work, its context, and a way to get in touch.</p></div>${workCards()}</div></section>`)]
]);
const sitemapPaths = [...Object.values(meta).map(entry => entry.path), '/case-studies.html', '/case-studies/san-antonio-zoo.html', '/case-studies/codeup.html', '/case-studies/overland-partners.html', '/case-studies/nobody-creative.html'];
outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(path => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`);
// Generate everything before writing, so invalid curation cannot leave a partial build.
for (const [path, content] of outputs) {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), content, 'utf8');
}
console.log(`Rendered ${outputs.size - 1} portfolio pages and sitemap.xml.`);
