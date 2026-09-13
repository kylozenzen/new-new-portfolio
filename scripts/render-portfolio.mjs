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
  const nav = home ? [['#work', 'Work'], ['#case-studies', 'Case studies'], ['#about', 'About']] : directory ? [['/#work', 'Home'], ['/case-studies.html', 'Case studies']] : [['#work', `${labels[lens]} work`], [lens === 'builder' ? '#approach' : '#case-study', lens === 'builder' ? 'Approach' : 'Case study']];
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header"><div class="wrap header-inner">
  <a class="wordmark" href="/" aria-label="Ben Campbell — home"><span aria-hidden="true">BC.</span> BEN CAMPBELL.</a>
  <nav class="primary-nav" aria-label="Primary">${nav.map(([url, text]) => `<a href="${url}">${e(text)}</a>`).join('')}<a class="nav-contact" href="${directory ? '/#contact' : '#contact'}">Let’s talk <span aria-hidden="true">↗</span></a></nav>
</div></header>`;
}

function footer(lens = 'home') {
  return `<footer class="site-footer"><div class="wrap footer-inner"><p>Ben Campbell © 2026 · San Antonio, TX</p><nav aria-label="Explore portfolios">${Object.entries(labels).map(([key, label]) => `<a href="/${key}/"${lens === key ? ' aria-current="page"' : ''}>${e(label)}</a>`).join('')}<a href="/">Home</a></nav></div></footer>`;
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
<link rel="stylesheet" href="/assets/css/site.css"><script src="/assets/js/site.js" defer></script>
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
</head><body data-lens="${key}">${header(key)}<main id="main-content">${content}</main>${footer(key)}</body></html>\n`;
}

function workCards() {
  const cards = [
    { key: 'social', kicker: 'Campaigns + community', description: 'Brand personality, timely campaigns, and conversations worth joining.', client: 'San Antonio Zoo · Instagram', sample: item('social', 'poop-candle').title, url: item('social', 'poop-candle').permalink },
    { key: 'writing', kicker: 'Copy + brand storytelling', description: 'Press, brand stories, web copy, and product guidance with a clear purpose.', client: 'San Antonio Zoo · Brand story', sample: 'Love is Wild: Valentine’s Day', url: item('writing', 'love-is-wild').url },
    { key: 'video', kicker: 'Concept through the cut', description: 'Destination stories, explainers, and content made to be watched.', client: 'San Antonio Zoo · Video', sample: 'End of Year Recap', url: `https://www.youtube.com/watch?v=${item('video', 'end-of-year').youtubeId}` },
    { key: 'builder', kicker: 'Useful tools + experiments', description: 'Marketing problems turned into working tools and creative products.', client: 'Nobody Creative · Buffer companion', sample: 'PostIQ', url: item('builder', 'postiq').url }
  ];
  return `<div class="work-grid">${cards.map(card => `<article class="work-card ${card.key}" id="${card.key}">
  <div class="work-card-top"><p class="eyebrow">${e(card.kicker)}</p><h3><a href="/${card.key}/">${e(labels[card.key])}</a></h3></div>
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

function homePage() {
  return page('home', `
<section class="hero" aria-labelledby="hero-heading"><div class="wrap">
  <div class="hero-grid"><div class="hero-content"><p class="eyebrow">Social media + content marketing</p>
  <h1 id="hero-heading">Social strategy.<br>Stories that <span>stick.</span></h1>
  <p class="hero-copy">I’m Ben. I turn brand goals into campaigns, copy, and content people care about — with the strategy to shape the plan and the hands-on skills to make it happen.</p>
  <p class="location">San Antonio, TX · Open to remote opportunities</p>
  <div class="actions"><a class="button" href="#work">See my work <span aria-hidden="true">↓</span></a>${ext(resume, 'View resume')}</div></div>
  <figure class="portrait"><img src="/assets/images/ben-campbell-headshot.jpg" width="400" height="500" alt="Ben Campbell" fetchpriority="high"><figcaption><span>Strategy + sleeves rolled up</span><span aria-hidden="true">↗</span></figcaption></figure></div>
  <div class="experience-line"><span class="muted">Experience with</span><strong>San Antonio Zoo</strong><strong>Overland Partners</strong><strong>Codeup</strong></div>
</div></section>
<section class="section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">01 / Work examples</p><h2 id="work-heading">Start with the work.</h2></div><p>A few things I’ve made. Explore the portfolio that fits what you’re looking for.</p></div>${workCards()}</div></section>
<section class="section cases" id="case-studies" aria-labelledby="cases-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">02 / Case studies</p><h2 id="cases-heading">The thinking behind it.</h2></div><a class="text-link" href="/case-studies.html">All four case studies <span aria-hidden="true">→</span></a></div>
  <div class="case-list"><a class="case-row" href="/case-studies/san-antonio-zoo.html"><div><p class="eyebrow">Social strategy + content operations</p><h3>San Antonio Zoo</h3></div><p>A repeatable planning system with room for the moments nobody could schedule.<strong>6M+ audience supported · +15% comments and shares</strong></p><span class="case-arrow" aria-hidden="true">↗</span></a>
  <a class="case-row" href="/case-studies/codeup.html"><div><p class="eyebrow">Growth + community marketing</p><h3>Codeup</h3></div><p>Connecting content, community, events, and the path from curiosity to application.<strong>+25% student applications · shared marketing outcome</strong></p><span class="case-arrow" aria-hidden="true">↗</span></a>
  <a class="case-row" href="/case-studies/overland-partners.html"><div><p class="eyebrow">Brand storytelling + content</p><h3>Overland Partners</h3></div><p>Making complex architecture and firm news clear, human, and useful.<strong>One brand voice across web, press, and recruiting</strong></p><span class="case-arrow" aria-hidden="true">↗</span></a></div>
  <p class="case-note">Results reflect work with broader teams. Each case study explains my contribution and the context.</p>
</div></section>
<section class="section" id="about" aria-labelledby="about-heading"><div class="wrap about-grid"><div class="about-copy"><p class="eyebrow">03 / About Ben</p><h2 id="about-heading">Strategic brain.<br>Sleeves rolled up.</h2>
  <p>I’ve worked across destination brands, architecture, tech education, and SaaS. I can shape the campaign, write the copy, work the comments, and keep the content calendar moving.</p>
  <p>That same curiosity led me to start ${ext(studio, 'Nobody Creative')}, where I build marketing tools and creative experiments. Sometimes the answer is a better story. Sometimes it’s a small tool that makes the work easier.</p>
  <p class="personal">Girl dad. Husband to a zookeeper. Movie and theme-park person. Firm believer that professional work can still have a personality.</p></div>
  <aside class="recognition" aria-labelledby="buffer-heading"><p class="eyebrow">Featured by Buffer</p><h3 id="buffer-heading">From my workflow<br>to their case study.</h3><p>I started building tools to untangle my own content workflow. When Buffer opened its API, those experiments grew into PostIQ and Receipts — and Buffer told the story.</p><div class="recognition-links">${ext(bufferStory, 'Read the PostIQ + Receipts feature')}${ext(openTabs, 'Open Tabs with Ben Campbell')}</div></aside>
</div></section>
${contact({ home: true, title: 'Good work starts<br>with a conversation.' })}`);
}

function lensHero(lens, { eyebrow, title, intro, byline, cta }) {
  return `<section class="lens-hero" aria-labelledby="hero-heading"><div class="wrap"><a class="back-link" href="/">← Full creative portfolio</a><div class="hero-panel"><p class="eyebrow">Ben Campbell / ${e(eyebrow)}</p><h1 id="hero-heading">${title}</h1><p class="intro">${e(intro)}</p><p class="byline">${e(byline)}</p><div class="actions"><a class="button" href="#work">${e(cta)} <span aria-hidden="true">↓</span></a>${ext(resume, 'View resume')}</div></div></div></section>`;
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
  ${more.length ? `<details class="more-writing"><summary>More brand stories & independent writing (${more.length})</summary><div class="writing-list">${more.map(writingItem).join('')}</div></details>` : ''}
  </div></section>
  ${relatedCase({ title: 'Overland Partners', description: 'Turning complex architecture, firm news, and culture into clearer press, web, and recruiting stories.', url: '/case-studies/overland-partners.html', roleTitle: 'What I brought to the work', role: 'Writing and editing across announcements, thought leadership, and careers content, with input from project teams, leadership, HR, and business development. The work needed a consistent voice across very different briefs.' })}
  ${contact({ title: 'Have a story<br>that needs the right words?', description: 'Available for full-time copywriting and content roles, freelance writing projects, and fractional or part-time content marketing support.' })}`);
}

function socialPage() {
  return page('social', `${lensHero('social', { eyebrow: 'Social strategy + content', title: 'Give people a reason<br>to stop. And stay.', intro: 'I connect brand goals with the way people actually use social: timely campaigns, a recognizable voice, and a community worth showing up for.', byline: 'Selected San Antonio Zoo work from my social and PR role. Planning and execution happened in partnership with the broader marketing team and zoo departments.', cta: 'See the posts' })}
  <section class="lens-section" id="work" aria-labelledby="work-heading"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Selected social work</p><h2 id="work-heading">Different posts. A clear purpose.</h2></div><p>Campaigns, playful brand moments, and community participation. Open an original or preview a post here.</p></div>${jumps('social')}
  ${curation.social.groups.map(group => `<div class="sample-group" id="${group.id}">${groupHeading(group, group.items.length)}<div class="sample-grid">${group.items.map(id => {
    const entry = item('social', id), context = curation.social.context[id];
    return `<article class="sample-article" id="${e(id)}"><div class="sample-body"><p class="sample-meta">San Antonio Zoo · ${e(context.format)}</p><h3>${e(entry.title)}</h3><p>${e(context.description)}</p>${ext(entry.permalink, 'View on Instagram', 'sample-link')}<details class="embed-details" data-instagram="${href(entry.permalink)}" data-title="${e(entry.title)}"><summary>Preview post</summary><div class="embed-slot"></div><noscript><p>Open the Instagram link above to see this post.</p></noscript></details></div></article>`;
  }).join('')}</div></div>`).join('')}
  <p class="embed-hint">If Instagram doesn’t display a preview, the original post is one click away.</p></div></section>
  ${relatedCase({ title: 'San Antonio Zoo', description: 'The planning system behind a brand with a 6M+ audience: repeatable formats, room for timely ideas, and closer collaboration across the zoo.', url: '/case-studies/san-antonio-zoo.html', roleTitle: 'The work beyond the post', role: 'I led the planning system and social/PR execution with a broader team. That included calendar strategy, community management, campaign support, and coordination with animal care and other departments.' })}
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
