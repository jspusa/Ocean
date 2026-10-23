/* Mobile HUD + explicit render-quality mode. No new save format or scene changes. */
const oceanMobileUI = (() => {
  'use strict';
  const touch = () => matchMedia('(pointer:coarse)').matches;
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode:standalone)').matches;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const names = ['省電', '均衡', '高畫質'];
  let initialized = false, fullscreenBusy = false, wasFullscreen = false, resizeFrame = 0;
  let lastBoost = null, textureRequest = null;

  function resize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resetInput();
      if (renderer) { renderer.resize(); renderer.dirty = true; }
    });
  }
  function paintBoost() {
    const button = $('boostBtn');
    if (!button) return;
    const enabled = !!voyage.state.cruise;
    if (lastBoost === enabled) return;
    lastBoost = enabled;
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '關閉加速' : '開啟加速');
    button.title = enabled ? '加速中 · 再按一次恢復正常速度（C）' : '加速 · 仍由你控制方向（C）';
    button.querySelector('span').textContent = enabled ? '加速中' : '加速';
  }
  function resetBoost() {
    voyage.state.cruise = false;
    $('cruiseBtn')?.classList.remove('active');
    paintBoost();
  }
  function toggleBoost() {
    if (!active || modal || photoOpen) return;
    if (typeof oceanMicrocosm !== 'undefined' && oceanMicrocosm.isViewing()) oceanMicrocosm.exit('cruise');
    voyage.state.cruise = !voyage.state.cruise;
    stopAuto();
    $('cruiseBtn')?.classList.toggle('active', voyage.state.cruise);
    paintBoost();
  }
  // The existing cruise physics is a 1.9x speed multiplier, not auto-forward.
  // Reuse it so collision, gamepad, diving and submersible logic remain intact.
  toggleCruise = toggleBoost;

  function paintFullscreen() {
    const native = !!fullscreenElement();
    const label = native ? '退出全螢幕' : standalone() ? '橫向顯示' : '全螢幕';
    for (const id of ['fullscreenBtn', 'settingsFullscreenBtn']) {
      const button = $(id);
      if (!button) continue;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(native));
      button.title = label;
      const text = button.querySelector('span');
      if (text) text.textContent = label;
    }
  }
  async function lockLandscape() {
    if (!touch()) return;
    let locked = false;
    try {
      if (typeof screen.orientation?.lock === 'function') {
        await screen.orientation.lock('landscape');
        locked = true;
      }
    } catch (_) { /* Some browsers expose the method but reject the request. */ }
    if (!locked && matchMedia('(orientation:portrait)').matches) {
      toast('此瀏覽器無法自動轉向；請關閉手機直向鎖定，再把手機橫放。');
    }
    resize();
  }
  function fullscreenChanged() {
    const native = !!fullscreenElement();
    paintFullscreen();
    if (native && !wasFullscreen) void lockLandscape();
    if (!native && wasFullscreen) {
      try { screen.orientation?.unlock?.(); } catch (_) {}
    }
    wasFullscreen = native;
    resize();
  }
  async function toggleFullscreen() {
    if (fullscreenBusy) return;
    fullscreenBusy = true;
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        fullscreenChanged();
      } else if (standalone()) {
        closePanel();
        await lockLandscape();
        paintFullscreen();
      } else {
        const root = document.documentElement;
        const enter = root.requestFullscreen || root.webkitRequestFullscreen;
        if (enter) {
          // Invoke in the button's user gesture, before any asynchronous work.
          const pending = enter.call(root, { navigationUI: 'hide' });
          await pending;
          closePanel();
          fullscreenChanged();
        } else {
          openPanel('mobileDisplay');
        }
      }
    } catch (_) {
      // A visible explanation, never fake fullscreen that leaves the URL bar up.
      openPanel('mobileDisplay');
    } finally {
      fullscreenBusy = false;
    }
  }
  function renderDisplayHelp() {
    panelTitle('全螢幕與橫向顯示', '把瀏覽器介面留在海面上');
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    $('panelBody').innerHTML = `<section class="settings-section"><p class="panel-note">${ios
      ? '目前這個 iPhone／iPad 瀏覽器不允許網頁直接進入全螢幕。請用 Safari 開啟本遊戲，選擇「分享」→「加入主畫面」，再從主畫面的 Ocean 圖示啟動，即可使用沒有 Safari 網址列的獨立視窗。若有「作為網頁 App 開啟」選項，請保持開啟。'
      : '此視窗不支援全螢幕，或請求被瀏覽器拒絕。請改用一般瀏覽器開啟，而不是 App 內嵌視窗；也可以使用瀏覽器的「安裝應用程式／加入主畫面」。'}</p><p class="panel-note">支援方向鎖定的裝置會自動切換橫向。不支援時，請關閉系統直向鎖定並將手機橫放；網頁無法強制改變系統設定。</p><button id="displayDismiss" class="primary">返回遊戲 <span>↗</span></button></section>`;
    $('displayDismiss').onclick = closePanel;
  }

  function paintQuality() {
    const select = $('qualityPreset'), status = $('qualityStatus');
    if (!select || !status) return;
    select.value = settings.adaptive ? 'auto' : String(Math.round(settings.quality));
    status.textContent = settings.adaptive
      ? '自動模式：依流暢度調整解析度與特效，負載降低後逐步恢復。'
      : `${names[Math.round(settings.quality)]}：固定所選畫質，${settings.quality===0?'最多 30 FPS，降低耗電與發熱':'最多 60 FPS；較高畫質會增加耗電與發熱'}。`;
    if (renderer?.canvas) status.textContent += ` 目前渲染 ${renderer.canvas.width} × ${renderer.canvas.height}。`;
  }
  function applyQuality(value) {
    if (!['auto', '0', '1', '2'].includes(value) || !renderer) return;
    settings.adaptive = value === 'auto';
    settings.quality = value === 'auto' ? (touch() ? 1 : 2) : Number(value);
    renderer.quality = settings.quality;
    renderer.dynamicScale = 1;
    renderer.dirty = true;
    renderer.forceShadow = true;
    if (oceanPerf.benchmark) {
      oceanPerf.benchmark = null;
      toast('畫質已變更，原效能量測已取消。');
    }
    oceanPerf.resetSamples();
    renderer.resize();
    persist();
    paintQuality();
    if (settings.quality === 2 && !renderer.textureFull && !textureRequest && typeof renderer.upgradeTextures === 'function') {
      textureRequest = Promise.resolve().then(() => renderer.upgradeTextures())
        .then(() => { if (settings.quality === 2) toast('高解析材質已載入。'); })
        .catch(() => toast('高解析材質暫時無法載入；保留原材質與所選畫質。'))
        .finally(() => { textureRequest = null; paintQuality(); });
    }
  }
  function enhanceSettings() {
    const oldRender = renderSettings;
    renderSettings = function (...args) {
      oldRender.apply(this, args);
      const section = document.querySelector('#panelBody [data-quality]')?.closest('.settings-section');
      if (!section) return;
      section.id = 'manualQualitySection';
      section.innerHTML = `<h3>畫面品質</h3><label class="quality-picker" for="qualityPreset">選擇畫質<select id="qualityPreset" aria-describedby="qualityStatus"><option value="auto">自動 · 依裝置效能調整</option><option value="0">省電 · 低畫質</option><option value="1">均衡 · 中畫質</option><option value="2">細緻 · 高畫質</option></select></label><p id="qualityStatus" class="panel-note inset-note" role="status"></p><button class="muted-btn" id="benchSettings">實際裝置效能測試 · 20 秒</button>`;
      $('panelBody').prepend(section);
      $('qualityPreset').onchange = event => applyQuality(event.target.value);
      $('benchSettings').onclick = () => oceanPerf.start();
      const display = document.createElement('section');
      display.className = 'settings-section mobile-display-settings';
      display.innerHTML = '<h3>顯示方式</h3><button id="settingsFullscreenBtn" class="muted-btn"><span>全螢幕</span></button><p class="panel-note inset-note">支援的裝置會自動橫向。iPhone 可從 Safari「加入主畫面」，使用沒有網址列的獨立視窗。</p>';
      section.after(display);
      $('settingsFullscreenBtn').onclick = toggleFullscreen;
      paintQuality();
      paintFullscreen();
    };
  }
  function updateInstructions() {
    if ($('introControls')) $('introControls').textContent = touch()
      ? '左搖桿游動 · 拖曳環視 · ↑↓ 浮潛'
      : 'WASD 游動 · 拖曳環視 · E／Q 浮潛';
    const help = document.querySelector('#panelBody .menu-help');
    if (help) help.textContent = touch()
      ? '左搖桿游動 · 拖曳環視 · ↑↓ 浮潛 · 右下拍照／加速'
      : 'WASD 游動 · 拖曳環視 · E／Q 浮潛 · C 加速';
  }
  function init() {
    if (initialized) return;
    initialized = true;
    document.body.classList.add('mobile-controls-v1');
    $('lookpad')?.setAttribute('aria-hidden', 'true');
    $('cruiseBtn')?.setAttribute('aria-hidden', 'true');
    const boost = document.createElement('button');
    boost.id = 'boostBtn';
    boost.type = 'button';
    boost.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 7 7-7 7m7-14 7 7-7 7"/></svg><span>加速</span>';
    boost.onclick = toggleBoost;
    $('photoBtn').parentElement.prepend(boost);
    paintBoost();
    const full = document.createElement('button');
    full.id = 'fullscreenBtn';
    full.type = 'button';
    full.className = 'hud-button';
    full.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></svg><span class="sr">全螢幕</span>';
    full.onclick = toggleFullscreen;
    document.querySelector('#hud .topbar nav').append(full);
    $('playInstructions').textContent = 'WASD 游動，E 上浮，Q 下潛，拖曳環視，空白鍵拍照，C 加速，Esc 暫停。觸控使用左下搖桿移動，直接滑動畫面環視；右下角拍照與加速，右上角全螢幕。';
    enhanceSettings();
    const oldAbout = renderAbout;
    renderAbout = function (...args) {
      oldAbout.apply(this, args);
      for (const paragraph of document.querySelectorAll('#panelBody p')) {
        if (paragraph.textContent.startsWith('手機：')) paragraph.textContent = '手機：左下搖桿移動，直接滑動畫面環視；↑ ↓ 改變深度。右下角小按鈕拍照與開關加速，右上角進入全螢幕。支援橫向與多點觸控；方向鎖定依瀏覽器支援。';
        else if (paragraph.textContent.startsWith('電腦：')) paragraph.textContent = paragraph.textContent.replace('C 巡航', 'C 加速');
      }
    };
    // Central panel lifecycle preserves all original tool handlers and focus traps.
    const oldOpen = openPanel;
    openPanel = function (...args) { const result = oldOpen.apply(this, args); updateInstructions(); return result; };
    window.addEventListener('blur', resetBoost);
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetBoost(); });
    for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, fullscreenChanged);
    window.addEventListener('orientationchange', resize);
    screen.orientation?.addEventListener?.('change', resize);
    paintFullscreen();
    // boot() writes the legacy introduction once more after module initialization.
    setTimeout(updateInstructions, 0);
    window.__oceanMobile = Object.freeze({
      revision: '2026-10-15.1',
      get qualityMode() { return settings.adaptive ? 'auto' : String(settings.quality); },
      get boost() { return !!voyage.state.cruise; },
      get fullscreen() { return !!fullscreenElement(); },
      get standalone() { return standalone(); }
    });
  }
  oceanFeatures.register({
    id: 'mobileControls', initial: () => ({}), sanitize: () => ({}), init,
    renderPanel(type) { if (type !== 'mobileDisplay') return false; renderDisplayHelp(); return true; },
    startDive() { resetBoost(); updateInstructions(); if (standalone()) void lockLandscape(); },
    endDive: resetBoost, panelChanged: resetBoost, photoOpened: resetBoost,
    reset: resetBoost, afterCamera: paintBoost
  });
  return { init };
})();
