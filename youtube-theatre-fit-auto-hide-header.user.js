// ==UserScript==
// @name         YouTube Theatre Fit + Auto-hide Header
// @namespace    kymotsujason.ytfit
// @version      2.3.0
// @description  Theatre player fills the viewport, top nav auto-hides, plus a rotate button, an in-player title, and a slim progress bar that stays visible when the controls hide.
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // Config
  const FORCE_THEATER = true; // false: leave the theatre/default toggle to YouTube (it remembers your choice)
  const DEBUG = false;        // true: log theatre attributes, player location, and thumbnail size

  // Shared selector prefix for the active theatre/full-bleed player.
  const FB = 'html.ytfit-watch :is(ytd-watch-flexy[theater], ytd-watch-flexy[full-bleed-player]):not([fullscreen])';

  const css = `
    html.ytfit-watch ytd-app {
      --ytd-masthead-height: 0px !important;
    }
    html.ytfit-watch #page-manager.ytd-app {
      padding-top: 0 !important;
    }

    /* Theatre/full-bleed container fills the viewport. */
    ${FB} :is(#full-bleed-container, #player-full-bleed-container, #player-theater-container).ytd-watch-flexy {
      height: 100vh !important;
      max-height: 100vh !important;
      min-height: 0 !important;
    }

    /* Make every wrapper between the container and the player fill its parent. */
    ${FB} #full-bleed-container :is(
      #player-full-bleed-container,
      #player-theater-container,
      #player-container-outer,
      #player-container,
      #player-container-inner,
      ytd-player,
      #player,
      #container.ytd-player,
      #movie_player,
      .html5-video-player,
      .html5-video-container
    ) {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
    }
    /* Letterbox the video to fit the full-height player box. */
    ${FB} #full-bleed-container video.html5-main-video {
      width: 100% !important;
      height: 100% !important;
      left: 0 !important;
      top: 0 !important;
      object-fit: contain !important;
    }
    ${FB} #full-bleed-container .ytp-cued-thumbnail-overlay,
    ${FB} #full-bleed-container .ytp-cued-thumbnail-overlay-image {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-size: contain !important;
      background-position: center center !important;
      background-repeat: no-repeat !important;
    }

    /* Hide the player until it lands in the full-bleed container, so it appears once at full size
       instead of expanding from the temporary mount YouTube uses during initial load. */
    html.ytfit-watch #movie_player {
      transition: opacity 0.15s ease;
    }
    html.ytfit-watch.ytfit-loading #movie_player {
      opacity: 0 !important;
    }

    /* Hide player controls we do not want. */
    html.ytfit-watch .ytp-subtitles-button,
    html.ytfit-watch .ytp-size-button,
    html.ytfit-watch .ytp-fullscreen-button,
    html.ytfit-watch .ytp-prev-button,
    html.ytfit-watch .ytp-next-button,
    html.ytfit-watch .ytp-autonav-toggle-button-container,
    html.ytfit-watch button[data-tooltip-target-id="ytp-autonav-toggle-button"] {
      display: none !important;
    }

    /* Self-styled rotate button so YouTube's per-button svg positioning cannot offset the icon.
       The svg fills the button and the viewBox is cropped close to the icon, so it renders at the
       same size and centering as the native controls. */
    html.ytfit-watch .ytfit-rotate-btn {
      display: inline-block !important;
      width: 48px !important;
      height: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      background: transparent !important;
      cursor: pointer !important;
      vertical-align: top !important;
      opacity: 0.9;
      transition: opacity 0.1s ease;
    }
    html.ytfit-watch .ytfit-rotate-btn:hover {
      opacity: 1;
    }
    html.ytfit-watch .ytfit-rotate-btn svg {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      fill: #fff !important;
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    }

    /* Auto-hide the top nav with opacity only. */
    html.ytfit-watch #masthead-container.ytd-app {
      position: fixed !important;
      top: 0 !important;
      left: 0; right: 0;
      z-index: 9999 !important;
      opacity: 0 !important;
      transition: opacity 0.18s ease;
    }
    html.ytfit-watch #masthead-container.ytd-app:hover,
    html.ytfit-watch #masthead-container.ytd-app:focus-within {
      opacity: 1 !important;
    }

    /* In-player title, centered in the bottom control row, shown when the real title is scrolled
       out of view and the controls are up. Hidden by default so it never appears in the miniplayer,
       where #movie_player is reparented out of the full-bleed container. */
    html.ytfit-watch .ytfit-title {
      display: none;
    }
    html.ytfit-watch #full-bleed-container #movie_player .ytfit-title {
      display: block;
      position: absolute;
      left: 0; right: 0;
      bottom: 0;
      height: 49px;
      line-height: 49px;
      box-sizing: border-box;
      padding: 0 320px;
      text-align: center;
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: #fff;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
      z-index: 30;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    html.ytfit-watch.ytfit-titleout #full-bleed-container #movie_player:not(.ytp-autohide) .ytfit-title {
      opacity: 1;
    }

    /* Slim progress bar pinned to the bottom of the player, shown only once the controls have
       auto-hidden, so you can still see how far along the video is without moving the mouse.
       Hidden by default so it does not leak into the miniplayer. */
    html.ytfit-watch .ytfit-progress {
      display: none;
    }
    html.ytfit-watch #full-bleed-container #movie_player .ytfit-progress {
      display: block;
      position: absolute;
      left: 0; right: 0;
      bottom: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      z-index: 29;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    html.ytfit-watch #full-bleed-container #movie_player.ytp-autohide .ytfit-progress {
      opacity: 1;
    }
    html.ytfit-watch .ytfit-progress-fill {
      height: 100%;
      width: 0;
      background: #f00;
    }
  `;

  const style = document.createElement('style');
  style.id = 'ytfit-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const isWatch = () => location.pathname === '/watch';
  const html = document.documentElement;
  const settled = () => !!document.querySelector('#full-bleed-container #movie_player');

  // The loading mask is only for the initial mount. Once the player has settled into the full-bleed
  // container once, never re-apply it, otherwise it would hide the player in the miniplayer (where
  // #movie_player is reparented out of the full-bleed container).
  let everSettled = false;
  function refreshState() {
    html.classList.toggle('ytfit-watch', isWatch());
    if (settled()) everSettled = true;
    html.classList.toggle('ytfit-loading', isWatch() && !everSettled);
  }
  refreshState();

  const poll = setInterval(() => {
    refreshState();
    if (everSettled) clearInterval(poll);
  }, 150);
  setTimeout(() => { clearInterval(poll); html.classList.remove('ytfit-loading'); }, 8000);

  // Theatre fit
  let forcedForHref = null;
  function inTheater(flexy) {
    return flexy.hasAttribute('theater') || flexy.hasAttribute('full-bleed-player');
  }
  function ensureTheater() {
    if (!FORCE_THEATER || !isWatch()) return;
    if (forcedForHref === location.href) return;
    const flexy = document.querySelector('ytd-watch-flexy');
    const sizeBtn = document.querySelector('.ytp-size-button');
    if (!flexy || !sizeBtn) return;
    forcedForHref = location.href;
    if (!inTheater(flexy)) sizeBtn.click();
  }

  // Rotate. Path centered at 18,18; the cropped viewBox (4 4 28 28) makes the icon fill about the
  // same fraction of the button as YouTube's own icons. Color, size, and outline come from our CSS.
  const ROTATE_SVG = '<svg viewBox="4 4 28 28"><path d="M23.65 12.35C22.2 10.9 20.21 10 18 10c-4.42 0-7.99 3.58'
    + '-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6'
    + 'c1.66 0 3.14.69 4.22 1.78L19 17h7V10l-2.35 2.35z"/></svg>';
  let rotation = 0;

  function applyRotation() {
    const video = document.querySelector('#movie_player video.html5-main-video');
    if (!video) return;
    const s = video.style;
    const clear = ['position', 'left', 'top', 'width', 'height', 'transform', 'object-fit'];
    if (rotation === 0) {
      clear.forEach((p) => s.removeProperty(p));
      return;
    }
    s.setProperty('object-fit', 'contain', 'important');
    if (rotation === 180) {
      ['position', 'left', 'top', 'width', 'height'].forEach((p) => s.removeProperty(p));
      s.setProperty('transform', 'rotate(180deg)', 'important');
      return;
    }
    const player = video.closest('#movie_player');
    const w = player ? player.clientWidth : window.innerWidth;
    const h = player ? player.clientHeight : window.innerHeight;
    s.setProperty('position', 'absolute', 'important');
    s.setProperty('left', '50%', 'important');
    s.setProperty('top', '50%', 'important');
    s.setProperty('width', h + 'px', 'important');
    s.setProperty('height', w + 'px', 'important');
    s.setProperty('transform', 'translate(-50%, -50%) rotate(' + rotation + 'deg)', 'important');
  }

  function ensureRotateButton() {
    const controls = document.querySelector('#full-bleed-container .ytp-right-controls');
    if (!controls || controls.querySelector('.ytfit-rotate-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ytfit-rotate-btn';
    btn.title = 'Rotate video 90 clockwise';
    btn.setAttribute('aria-label', 'Rotate video 90 degrees clockwise');
    btn.innerHTML = ROTATE_SVG;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      rotation = (rotation + 90) % 360;
      applyRotation();
    });
    controls.appendChild(btn);
  }

  // In-player title
  function ensureTitleOverlay() {
    const player = document.querySelector('#full-bleed-container #movie_player');
    if (!player || player.querySelector('.ytfit-title')) return;
    const el = document.createElement('div');
    el.className = 'ytfit-title';
    player.appendChild(el);
  }
  function refreshTitleText() {
    const el = document.querySelector('#movie_player .ytfit-title');
    if (!el) return;
    const h1 = document.querySelector('ytd-watch-metadata #title h1, ytd-watch-metadata h1.ytd-watch-metadata');
    let text = h1 && h1.textContent.trim();
    if (!text) text = document.title.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '');
    if (text && el.textContent !== text) el.textContent = text;
  }
  let titleObserver = null;
  let observedTitle = null;
  function observeTitle() {
    const target = document.querySelector('ytd-watch-metadata #title') || document.querySelector('ytd-watch-metadata');
    if (!target || target === observedTitle) return;
    if (titleObserver) titleObserver.disconnect();
    observedTitle = target;
    titleObserver = new IntersectionObserver((entries) => {
      html.classList.toggle('ytfit-titleout', !entries[0].isIntersecting);
    }, { threshold: 0 });
    titleObserver.observe(target);
  }

  // Re-fit a rotated video whenever the player box changes size (window resize, fullscreen,
  // theatre, or the miniplayer), so it stays correctly letterboxed in every mode.
  let playerSizeObs = null;
  let observedPlayer = null;
  function observePlayerSize() {
    const p = document.querySelector('#movie_player');
    if (!p || p === observedPlayer) return;
    if (playerSizeObs) playerSizeObs.disconnect();
    observedPlayer = p;
    playerSizeObs = new ResizeObserver(() => { if (rotation !== 0) applyRotation(); });
    playerSizeObs.observe(p);
  }

  // Persistent progress bar. Width is driven by the video's timeupdate event, which only fires
  // during playback, so there is no idle cost. Visibility is handled purely in CSS.
  function updateProgress() {
    const player = document.querySelector('#movie_player');
    if (!player) return;
    const video = player.querySelector('video.html5-main-video');
    const fill = player.querySelector('.ytfit-progress-fill');
    if (!video || !fill) return;
    const d = video.duration;
    if (!isFinite(d) || d <= 0) { fill.style.width = '0%'; return; }
    fill.style.width = Math.min(100, (video.currentTime / d) * 100) + '%';
  }
  function ensureProgressBar() {
    const player = document.querySelector('#full-bleed-container #movie_player');
    if (!player) return;
    if (!player.querySelector('.ytfit-progress')) {
      const bar = document.createElement('div');
      bar.className = 'ytfit-progress';
      const fill = document.createElement('div');
      fill.className = 'ytfit-progress-fill';
      bar.appendChild(fill);
      player.appendChild(bar);
    }
    const video = player.querySelector('video.html5-main-video');
    if (video && !video.__ytfitProgress) {
      video.__ytfitProgress = true;
      ['timeupdate', 'seeking', 'seeked', 'loadedmetadata', 'durationchange'].forEach(
        (ev) => video.addEventListener(ev, updateProgress));
      updateProgress();
    }
  }

  function ensureWidgets() {
    if (!isWatch()) return;
    ensureRotateButton();
    ensureTitleOverlay();
    refreshTitleText();
    observeTitle();
    observePlayerSize();
    ensureProgressBar();
  }

  let timer = null;
  function apply() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refreshState();
      if (!isWatch()) return;
      ensureTheater();
      ensureWidgets();
    }, 50);
  }

  window.addEventListener('yt-navigate-finish', () => { rotation = 0; applyRotation(); apply(); }, true);
  window.addEventListener('yt-page-data-updated', apply, true);
  window.addEventListener('popstate', apply, true);

  // The player controls and metadata get rebuilt at times YouTube does not always signal, so
  // re-check the button and title on a light interval while on a watch page.
  setInterval(ensureWidgets, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  // Debug: logs theatre attributes, where #movie_player is, and any large thumbnail placeholder.
  if (DEBUG) {
    const t0 = performance.now();
    const big = () => {
      const hits = [];
      for (const e of document.querySelectorAll('img, [style*="background-image"]')) {
        const b = e.getBoundingClientRect();
        if (b.width < 600 || b.height < 300) continue;
        const src = e.tagName === 'IMG' ? (e.currentSrc || e.src || '') : getComputedStyle(e).backgroundImage;
        if (!/ytimg|ggpht/.test(src)) continue;
        const cls = (e.className && e.className.toString)
          ? e.className.toString().split(' ').filter((c) => c && c !== 'style-scope').slice(0, 3).join('.') : '';
        hits.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (cls ? '.' + cls : '')
          + '=' + Math.round(b.width) + 'x' + Math.round(b.height) + '@top' + Math.round(b.top));
      }
      return hits.length ? hits.join(' | ') : 'none';
    };
    const tick = () => {
      const flexy = document.querySelector('ytd-watch-flexy');
      const attrs = flexy
        ? (flexy.getAttributeNames().filter((a) => ['theater', 'full-bleed-player', 'fullscreen'].includes(a)).join('+') || 'default')
        : 'no-flexy';
      const mp = document.querySelector('#movie_player');
      let mpInfo = 'no-mp';
      if (mp) {
        const where = mp.closest('#full-bleed-container') ? 'fullbleed' : (mp.closest('#primary') ? 'primary' : 'other');
        const b = mp.getBoundingClientRect();
        mpInfo = 'mp@' + where + '=' + Math.round(b.width) + 'x' + Math.round(b.height);
      }
      console.log('[ytfit]', Math.round(performance.now() - t0) + 'ms', '[' + attrs + ']', mpInfo, '| big:', big());
    };
    const iv = setInterval(tick, 250);
    setTimeout(() => clearInterval(iv), 12000);
  }
})();