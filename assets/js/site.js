/* Progressive enhancements only: all portfolio content and links are in the HTML. */
(() => {
  const legacyPages = new Set(['/', '/index.html', '/work-samples', '/work-samples.html']);
  const legacyRoutes = { '#social': '/social/', '#writing': '/writing/', '#video': '/video/', '#builder': '/builder/' };
  if (legacyPages.has(location.pathname) && legacyRoutes[location.hash]) {
    location.replace(legacyRoutes[location.hash]);
    return;
  }

  document.querySelectorAll('[data-video]').forEach(button => {
    const id = button.dataset.video;
    if (!/^[\w-]{11}$/.test(id)) return;
    button.hidden = false;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = button.dataset.title || 'Video portfolio sample';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      button.closest('.video-media').replaceChildren(frame);
      frame.focus();
    }, { once: true });
  });

  document.querySelectorAll('details[data-instagram]').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const src = embedUrl(details.dataset.instagram);
      if (src) mountEmbed(details, src, details.dataset.title);
    });
  });

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared validator — an Instagram permalink, or nothing.
  const embedUrl = value => {
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || url.hostname !== 'www.instagram.com') return null;
    if (!/^\/(p|reel)\/[\w-]+\/$/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}embed/`;
  };

  const mountEmbed = (host, src, title) => {
    if (host.dataset.loaded) return;
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = title || 'Instagram portfolio sample';
    frame.loading = 'lazy';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    host.querySelector('.embed-slot').append(frame);
    host.dataset.loaded = 'true';
  };

  // One post per group renders itself as the group comes into view. Nothing
  // loads on first paint, so the page is readable immediately on a phone.
  const autos = document.querySelectorAll('.embed-auto');
  if (autos.length) {
    const load = host => {
      const src = embedUrl(host.dataset.instagram);
      if (src) mountEmbed(host, src, host.dataset.title);
    };
    if ('IntersectionObserver' in window) {
      const watcher = new IntersectionObserver((entries, self) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          load(entry.target);
          self.unobserve(entry.target);
        });
      }, { rootMargin: '300px 0px' });
      autos.forEach(host => watcher.observe(host));
    } else {
      autos.forEach(load);
    }
  }

  // Reveal sections on scroll, from a visible resting state — if this script
  // never runs, everything is already on screen.
  const reveals = document.querySelectorAll('.work-card, .now-item, .stat, .case-row');
  if (reveals.length && !calm && 'IntersectionObserver' in window) {
    // Only hide what is genuinely below the fold — anything already on screen
    // stays put, so the first paint is never blank.
    const pending = [];
    reveals.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      el.classList.add('will-reveal');
      pending.push(el);
    });
    const show = el => el.classList.add('revealed');
    const watcher = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        self.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8%' });
    pending.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`);
      watcher.observe(el);
    });
    // Safety net: nothing on this page is allowed to stay invisible. If the
    // observer never fires — bfcache restore, printing, an odd browser — show
    // everything anyway.
    const showAll = () => pending.forEach(show);
    setTimeout(showAll, 2500);
    window.addEventListener('beforeprint', showAll);
    window.addEventListener('pageshow', event => { if (event.persisted) showAll(); });
  }

  // Count the headline figures up once, when they arrive.
  const stats = document.querySelectorAll('.stat b[data-count]');
  if (stats.length && !calm && 'IntersectionObserver' in window) {
    const parse = text => {
      const match = /^([^\d]*)([\d.]+)(.*)$/.exec(text);
      return match ? { prefix: match[1], value: parseFloat(match[2]), suffix: match[3] } : null;
    };
    const run = el => {
      const parts = parse(el.dataset.count);
      if (!parts) return;
      const decimals = (String(parts.value).split('.')[1] || '').length;
      const start = performance.now();
      const tick = now => {
        const t = Math.min((now - start) / 900, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = parts.prefix + (parts.value * eased).toFixed(decimals) + parts.suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = el.dataset.count;
      };
      requestAnimationFrame(tick);
    };
    const watcher = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        self.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    stats.forEach(el => watcher.observe(el));
  }

  // The old site had a Konami easter egg. Same joke, better payoff.
  const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let step = 0;
  document.addEventListener('keydown', event => {
    step = event.key === code[step] ? step + 1 : (event.key === code[0] ? 1 : 0);
    if (step !== code.length) return;
    step = 0;
    window.open('https://nobodycreative-arcade.netlify.app/', '_blank', 'noopener');
  });
})();
