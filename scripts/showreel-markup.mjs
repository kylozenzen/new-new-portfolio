/**
 * Markup for the 30-second showreel. Content comes from showreel.json; timing and
 * choreography live in assets/js/showreel.js; the look lives in assets/css/showreel.css.
 *
 * Without JavaScript only the final frame shows (name, availability, contact), so
 * the reel never hides the one thing a visitor needs.
 */

const COLORS = new Set(['pink', 'lime', 'cyan', 'yellow', 'ink']);

export function renderShowreel(data, { e, href, secondaryHref, headingLevel = 'h2', standalone = false }) {
  const { person, metrics, skills, projects, positioning, cta } = data;
  const H = headingLevel;
  const upper = text => e(String(text).toUpperCase());
  const color = value => (COLORS.has(value) ? value : 'ink');
  const letters = (word, prefix) => [...String(word).toUpperCase()]
    .map((char, i) => `<span class="sr-f-letter" data-el="${prefix}${i}">${char === ' ' ? '&nbsp;' : e(char)}</span>`).join('');

  // ---- 01 WHO -----------------------------------------------------------------
  const who = `<div class="sr-scene sr-a" data-scene="who" aria-hidden="true">
    <div class="sr-paper sr-gridded"></div>
    <div class="sr-a-ink" data-el="a-ink"></div>
    <div class="sr-a-chip" data-el="a-chip"><span>BC.</span></div>
    <div class="sr-a-name" data-el="a-name">
      <div class="sr-mask"><span class="sr-a-first" data-el="a-first">${upper(person.first)}</span></div>
      <div class="sr-mask sr-mask-wide"><span class="sr-a-last" data-el="a-last">${upper(person.last)}</span></div>
    </div>
    <div class="sr-a-tags">${data.tagline.map((tag, i) => `${i ? `<i class="sr-a-x" data-el="a-x${i}">×</i>` : ''}<span class="sr-a-tag sr-c-${['pink', 'lime', 'cyan'][i % 3]}" data-el="a-tag${i}"><b data-el="a-tag${i}-t">${upper(tag)}</b></span>`).join('')}</div>
  </div>`;

  // ---- 02 SCALE ---------------------------------------------------------------
  const value = (figure, m) => [...figure].map((char, j) => /\d/.test(char)
    ? `<span class="sr-reel"><span class="sr-reel-col" data-el="m${m}-d${j}" data-digit="${char}">${'0123456789'.repeat(2).split('').map(d => `<span>${d}</span>`).join('')}</span></span>`
    : `<span class="sr-glyph" data-el="m${m}-g${j}">${e(char)}</span>`).join('');

  const motif = (metric, m) => {
    if (metric.motif === 'audience') return `<div class="sr-dots" aria-hidden="true">${Array.from({ length: 60 }, (_, k) => `<i data-el="m${m}-dot${k}"></i>`).join('')}</div>`;
    if (metric.motif === 'reactions') return `<div class="sr-reacts">${(metric.reactions || []).map((label, k) => `<span class="sr-react" data-el="m${m}-r${k}"><i>${['♥', '↗', '✦', '↩', '@'][k % 5]}</i>${e(label)}</span>`).join('')}</div>`;
    if (metric.motif === 'bars') return `<div class="sr-bars">${[22, 31, 27, 43, 52, 66, 86].map((h, k) => `<i data-el="m${m}-bar${k}" style="--h:${h}%"></i>`).join('')}</div>`;
    return '';
  };

  const metric = (item, m) => {
    const head = `<p class="sr-m-index"><b>0${m + 1}</b> / 0${metrics.length}</p>`;
    const caption = `<div class="sr-m-caption"><div class="sr-mask"><span class="sr-m-label" data-el="m${m}-label">${upper(item.label)}</span></div><p class="sr-m-note" data-el="m${m}-note">${e(item.note)}</p></div>`;
    if (item.motif === 'photo') {
      return `<div class="sr-m sr-m-photo sr-c-${color(item.color)}" data-el="m${m}">
        <div class="sr-m-zoom" data-el="m${m}-zoom">
          <img src="${href(item.image)}" alt="" loading="lazy" decoding="async" data-el="m${m}-img">
          <div class="sr-m-knock"><div class="sr-m-value sr-m-value-photo">${[...item.value].map((char, j) => `<span class="sr-mask sr-mask-tight"><span class="sr-m-char${char === '0' ? ' sr-zero' : ''}" data-el="m${m}-c${j}">${e(char)}</span></span>`).join('')}</div></div>
        </div>
        ${head}${caption}
      </div>`;
    }
    return `<div class="sr-m sr-m-${item.motif} sr-c-${color(item.color)}" data-el="m${m}">
      <div class="sr-m-motif">${motif(item, m)}</div>
      ${head}
      <div class="sr-m-value" data-el="m${m}-value">${value(item.value, m)}</div>
      ${caption}
    </div>`;
  };

  const scale = `<div class="sr-scene sr-b" data-scene="scale" aria-hidden="true">
    ${metrics.map(metric).join('')}
    <p class="sr-b-foot" data-el="b-foot">${e(data.metricsNote)}</p>
  </div>`;

  // ---- 03 CRAFT ---------------------------------------------------------------
  const craft = `<div class="sr-scene sr-c" data-scene="craft" aria-hidden="true">
    <div class="sr-c-fill sr-gridded"></div>
    ${skills.map((skill, i) => `<div class="sr-cw" data-el="c${i}">
      <span class="sr-cw-tag" data-el="c${i}-tag">0${i + 1} / ${upper(skill.tag)}</span>
      <div class="sr-cw-box" data-el="c${i}-box">
        <div class="sr-mask sr-cw-mask"><span class="sr-cw-word" data-el="c${i}-t"><span class="sr-cw-half sr-top" data-el="c${i}-top">${upper(skill.word)}</span><span class="sr-cw-half sr-bot" data-el="c${i}-bot">${upper(skill.word)}</span></span></div>
      </div>
    </div>`).join('')}
    <div class="sr-c-band" data-el="c-band"><div class="sr-c-track" data-el="c-track">${`<span>/// ${skills.map(skill => upper(skill.word)).join(' /// ')}&nbsp;</span>`.repeat(3)}</div></div>
  </div>`;

  // ---- 04 WORK ----------------------------------------------------------------
  const frame = (project, i) => {
    if (project.frame === 'phone') {
      const [first, second] = project.images;
      return `<div class="sr-frame-phone" data-el="d${i}"><div class="sr-phone-screen"><div class="sr-feed" data-el="d${i}-feed">
        <div class="sr-feed-head"><i></i><b>${e(project.handle)}</b><span>•••</span></div>
        <img src="${href(first.src)}" alt="" loading="lazy" decoding="async">
        <div class="sr-feed-actions"><span>♥</span><span>↩</span><span>↗</span></div>
        <div class="sr-feed-posts">${project.posts.map(post => `<span>${e(post)}</span>`).join('')}</div>
        ${second ? `<img src="${href(second.src)}" alt="" loading="lazy" decoding="async">` : ''}
      </div></div></div>`;
    }
    if (project.frame === 'viewfinder') {
      return `<div class="sr-frame-vf" data-el="d${i}"><img src="${href(project.images[0].src)}" alt="" loading="lazy" decoding="async">
        <span class="sr-vf-corner tl"></span><span class="sr-vf-corner tr"></span><span class="sr-vf-corner bl"></span><span class="sr-vf-corner br"></span>
        <span class="sr-vf-rec" data-el="d${i}-rec">● REC</span><span class="sr-vf-tc" data-timecode></span></div>`;
    }
    if (project.frame === 'browser') {
      return `<div class="sr-frame-browser" data-el="d${i}">
        <div class="sr-browser-bar"><i></i><i></i><i></i><span>${e(project.url)}</span></div>
        <div class="sr-browser-body"><p class="sr-browser-kicker">${e(project.client)}</p><p class="sr-browser-title">${e(project.title)}</p><p class="sr-browser-copy">${e(project.body)}</p>
          <div class="sr-skeleton"><i></i><i></i><i></i></div></div>
        <span class="sr-stamp" data-el="d${i}-stamp">${e(project.stamp)}</span>
        <svg class="sr-cursor" data-el="d${i}-cursor" viewBox="0 0 24 24"><path d="M3 2l17 10-7.5 1.6L9 21z"/></svg>
      </div>`;
    }
    return `<div class="sr-frame-doc" data-el="d${i}"><div class="sr-doc-inner" data-el="d${i}-inner"><p class="sr-doc-kicker">${e(project.kicker)}</p><p class="sr-doc-head">${e(project.headline)}</p><div class="sr-skeleton sr-skeleton-long"><i></i><i></i><i></i><i></i><i></i></div><p class="sr-doc-sign">${e(project.client)}</p></div></div>`;
  };

  const work = `<div class="sr-scene sr-d" data-scene="work" aria-hidden="true">
    <div class="sr-d-bg" data-el="d-bg"></div>
    <div class="sr-d-caps">${projects.map((project, i) => `<div class="sr-d-cap">
      <div class="sr-mask"><span class="sr-d-disc" data-el="d${i}-disc">${upper(project.discipline)}</span></div>
      <div class="sr-mask"><span class="sr-d-client" data-el="d${i}-client">${upper(project.client)}</span></div>
    </div>`).join('')}</div>
    <div class="sr-d-frames">${projects.map(frame).join('')}</div>
  </div>`;

  // ---- 05 WHY -----------------------------------------------------------------
  const why = `<div class="sr-scene sr-e" data-scene="why" aria-hidden="true">
    <div class="sr-paper sr-gridded"></div>
    <div class="sr-e-lines">
      ${positioning.lines.map((line, i) => `<div class="sr-mask"><span class="sr-e-line${i === positioning.lines.length - 1 ? ' sr-e-stop' : ''}" data-el="e${i}">${upper(line)}</span></div>`).join('')}
      <div class="sr-e-pay"><span class="sr-e-hl" data-el="e-hl"></span><div class="sr-mask"><span class="sr-e-line" data-el="e-pay">${upper(positioning.payoff)}</span></div></div>
    </div>
  </div>`;

  // ---- 06 NEXT (the only layer that is real, focusable content) --------------
  const next = `<div class="sr-scene sr-f" data-scene="next">
    <div class="sr-f-copy">
      <p class="sr-f-eyebrow" data-el="f-eyebrow">${e(cta.eyebrow)}</p>
      <${H} class="sr-f-name" aria-label="${e(`${person.first} ${person.last}`)}"><span class="sr-f-row" aria-hidden="true">${letters(person.first, 'f-a')}</span><span class="sr-f-row sr-f-last" aria-hidden="true"><span class="sr-f-hl" data-el="f-hl"></span>${letters(person.last, 'f-b')}</span></${H}>
      <p class="sr-f-status" data-el="f-status"><span class="sr-f-dot" data-el="f-dot" aria-hidden="true"></span>${e(cta.status)}</p>
      <p class="sr-f-head" data-el="f-head">${e(cta.headline)}</p>
      <div class="sr-f-actions">
        <a class="button sr-f-primary" data-el="f-primary" href="${href(cta.primary.href)}">${e(cta.primary.label)} <span aria-hidden="true" class="sr-f-arrow" data-el="f-arrow">↗</span></a>
        <a class="text-link sr-f-secondary" data-el="f-secondary" href="${href(secondaryHref || cta.secondary.href)}">${e(cta.secondary.label)} <span aria-hidden="true">${(secondaryHref || cta.secondary.href).startsWith('#') ? '↓' : '→'}</span></a>
      </div>
    </div>
    <figure class="sr-f-portrait" data-el="f-portrait"><img src="${href(person.headshot)}" width="400" height="500" alt="" loading="lazy" decoding="async"></figure>
  </div>`;

  const transcript = [
    `${person.first} ${person.last}. ${data.tagline.join(', ')}.`,
    ...metrics.map(m => `${m.value} ${m.label.toLowerCase()}.`),
    data.metricsNote,
    `What I do: ${skills.map(s => s.word).join(', ')}.`,
    `Work: ${projects.map(p => `${p.client} (${p.discipline})`).join('; ')}.`,
    `${positioning.lines.join(' ')} ${positioning.payoff}`,
    `${cta.status}. ${cta.headline}`,
  ].join(' ');

  return `<section class="sr${standalone ? ' sr-standalone' : ''}" id="reel" aria-labelledby="reel-title" data-reel>
  <div class="wrap sr-wrap">
    <div class="sr-head"><p class="eyebrow" id="reel-title">The 30-second version</p><p class="sr-head-note">Or the long version, below.</p></div>
    <div class="sr-shell">
      <div class="sr-stage" data-stage aria-describedby="reel-transcript">
        <div class="sr-cam" data-el="cam">${who}${scale}${craft}${work}${why}${next}</div>
        <div class="sr-hud" aria-hidden="true" data-el="hud"><span>BC. / Showreel</span><span data-timecode>00:00:00:00</span></div>
        <div class="sr-grain" aria-hidden="true" data-el="grain"></div>
        <div class="sr-flash" aria-hidden="true" data-el="flash"></div>
      </div>
      <div class="sr-controls" data-controls hidden></div>
    </div>
    <p class="sr-only" id="reel-transcript">Showreel transcript: ${e(transcript)}</p>
  </div>
</section>`;
}
