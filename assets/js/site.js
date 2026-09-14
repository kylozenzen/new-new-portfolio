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

  document.querySelectorAll('[data-instagram]').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.loaded) return;
      let url;
      try { url = new URL(details.dataset.instagram); } catch { return; }
      if (url.protocol !== 'https:' || url.hostname !== 'www.instagram.com' || !/^\/(p|reel)\/[\w-]+\/$/.test(url.pathname)) return;
      const frame = document.createElement('iframe');
      frame.src = `${url.origin}${url.pathname}embed/`;
      frame.title = details.dataset.title || 'Instagram portfolio sample';
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      details.querySelector('.embed-slot').append(frame);
      details.dataset.loaded = 'true';
    });
  });
})();
