/* Immersive UI 1 — UI-only patch for the 0.13.x game.
 * Keep this in the final bootstrap so build.py includes it in both distributions.
 * Existing controls are moved, not cloned: pointer capture and photography hooks survive.
 */
const oceanImmersiveUI = (() => {
  const PREF_KEY = 'return-blue.ui.v1';
  let captions = false, guidance = false, teaching = false, guideTimer = 0;
  let chrome, menuButton, guide, installed = false, wasDiving = false;
  const heldPointers = new Set();
  const touch = () => matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    captions = saved.captions === true;
    guidance = saved.guidance === true;
    teaching = saved.taught === true;
  } catch (_) { /* Private windows still get a usable interface. */ }
  const save = () => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({captions, guidance, taught: teaching})); }
    catch (_) { /* UI preferences must never prevent a dive. */ }
  };
  const CSS = `
body.imm-ui { --imm-top:max(12px,env(safe-area-inset-top)); --imm-left:max(16px,env(safe-area-inset-left)); --imm-right:max(16px,env(safe-area-inset-right)); --imm-bottom:max(20px,env(safe-area-inset-bottom)); }
/* No dashboard, central names, score cards or duplicate buttons during a dive. */
body.imm-ui #hud .topbar, body.imm-ui #hud .view-tools,
body.imm-ui #hud .observation-mode, body.imm-ui #hud .stats,
body.imm-ui #hud .desktop-controls, body.imm-ui #hud .bottom-actions,
body.imm-ui #hud .depth-meter, body.imm-ui #hud .prototype-note,
body.imm-ui #hud #musicPill, body.imm-ui #hud #lampBtn,
body.imm-ui #hud #objectiveCard, body.imm-ui #hud #cruiseBtn,
body.imm-ui #hud #photoModeBtn, body.imm-ui #hud #companionBtn,
body.imm-ui #hud #lookpad, body.imm-ui #hud #touchLookHint,
body.imm-ui #hud #focusCard, body.imm-ui #hud #landmarkBanner,
body.imm-ui #hud #individualCard { display:none!important; }
body.imm-ui:not(.imm-captions) #radioBox,
body.imm-ui.imm-diving #photoResult, body.imm-ui.imm-diving #fpsChip,
body.imm-ui:not(.imm-guidance) #waypointHUD { display:none!important; }
body.imm-ui #reticle { opacity:0; width:26px; height:26px; transition:opacity .25s; }
body.imm-ui #reticle.focusing { opacity:.42; }
body.imm-ui #reticle svg { width:26px; height:26px; }
#immChrome { position:absolute; inset:0; pointer-events:none; }
body.imm-ui #immMenu { position:fixed; top:var(--imm-top); right:var(--imm-right); width:44px; height:44px; min-width:44px; padding:0; display:grid; place-items:center; border:1px solid #d9eeec40; border-radius:50%; background:#03192355; color:#f1f8f5; opacity:.68; backdrop-filter:none; pointer-events:auto; }
#immMenu svg { width:21px; height:21px; }
#immMenu:hover, #immMenu:focus-visible { opacity:1; background:#092a37d9; }
#immDock { position:fixed; right:var(--imm-right); bottom:var(--imm-bottom); display:flex; align-items:flex-end; gap:12px; pointer-events:none; }
body.imm-ui #immDock #photoBtn { position:relative; inset:auto; width:48px; height:48px; min-width:48px; margin:0; padding:0; border:1px solid #e8f1e655; border-radius:50%; background:#041c2945; backdrop-filter:none; opacity:.48; box-shadow:none; transform:none; pointer-events:auto; }
body.imm-ui #immDock #photoBtn:before { display:none; }
body.imm-ui #immDock #photoBtn svg { width:21px; height:21px; }
body.imm-ui #immDock #vertical { position:static; inset:auto; display:none; width:44px; height:auto; gap:8px; padding:0; margin:0; background:none; border:0; transform:none; pointer-events:none; }
body.imm-ui #immDock #vertical span { display:none; }
body.imm-ui #immDock #vertical button { width:44px; height:44px; min-width:44px; min-height:44px; padding:0; display:grid; place-items:center; border:1px solid #d9eceb40; border-radius:50%; background:#041c2938; font:22px var(--sans,system-ui); opacity:.48; backdrop-filter:none; pointer-events:auto; touch-action:none; }
body.imm-ui #hud #joystick { display:none; position:fixed; left:var(--imm-left); bottom:var(--imm-bottom); top:auto; right:auto; width:104px; height:104px; padding:0; margin:0; border:1px solid #d8e8e744; border-radius:50%; background:transparent; box-shadow:none; backdrop-filter:none; opacity:.22; pointer-events:auto; touch-action:none; transform:none; transition:opacity .2s; }
body.imm-ui #joystick .stick-label { display:none; }
body.imm-ui #joystick #stickKnob { position:absolute; left:calc(50% - 14px); top:calc(50% - 14px); width:28px; height:28px; margin:0; border-radius:50%; border:1px solid #dcefed77; background:#e5f1ed26; box-shadow:none; pointer-events:none; }
body.imm-ui.imm-touch #hud #joystick { display:block; }
body.imm-ui.imm-touch #immDock #vertical { display:flex; flex-direction:column; }
body.imm-ui #joystick.imm-held { opacity:.64!important; }
body.imm-ui #immDock button:active, body.imm-ui #immDock button:focus-visible { opacity:1!important; background:#0a3543cc!important; }
body.imm-ui.imm-panel #immChrome, body.imm-ui.imm-panel #joystick { visibility:hidden; pointer-events:none!important; }
body.imm-ui.imm-panel #immChrome button { pointer-events:none!important; }
body.imm-ui.cinematic #immChrome, body.imm-ui.cinematic #joystick { visibility:hidden; pointer-events:none!important; }
body.imm-ui.cinematic #immChrome button { pointer-events:none!important; }
/* Only explicit interactions can surface an action. It stays below the focal area. */
body.imm-ui #hud #interactBtn { top:auto; left:50%; right:auto; bottom:calc(var(--imm-bottom) + 118px); transform:translateX(-50%); width:max-content; min-width:0; max-width:calc(100vw - 32px); min-height:44px; padding:9px 16px; font-size:12px; border-radius:24px; box-shadow:none; }
body.imm-ui #hud #waypointHUD { top:calc(var(--imm-top) + 8px); bottom:auto; left:50%; right:auto; max-width:calc(100vw - 144px); transform:translateX(-50%); font-size:11px; }
body.imm-ui #hud #waypointHUD i { display:none; }
body.imm-ui #hud #waypointHUD small { font-size:10px; }
body.imm-ui #cameraFrame { inset:14% 14% 22%; }
body.imm-ui #cameraFrame small { font-size:10px; }
body.imm-ui.imm-diving #toast { top:calc(var(--imm-top) + 54px); bottom:auto; width:max-content; max-width:min(430px,calc(100vw - 40px)); padding:7px 13px; font-size:11px; line-height:1.65; border-radius:16px; border:0; background:#05212dd9; backdrop-filter:none; }
body.imm-ui.imm-captions #radioBox { bottom:calc(var(--imm-bottom) + 128px); width:min(520px,calc(100vw - 40px)); max-width:none; }
body.imm-ui.imm-captions #radioBox p { font-size:12px; line-height:1.65; margin:3px 0; }
body.imm-ui #immGuide { position:fixed; top:calc(var(--imm-top) + 55px); left:50%; transform:translateX(-50%); width:max-content; max-width:calc(100vw - 32px); min-height:44px; padding:8px 14px; border:0; border-radius:22px; background:#041e29d9; color:#dcebea; font-size:11px; line-height:1.7; text-align:center; pointer-events:auto; }
#immGuide span { margin-left:10px; opacity:.7; }
/* Reuse the game's pause panel: opening it already stops swimming and traps focus. */
body.imm-menu #panel { width:min(440px,100vw); }
body.imm-menu .panel-head { padding:18px 22px; }
body.imm-menu .panel-head h2 { font:400 23px var(--sans,system-ui); letter-spacing:.04em; margin:5px 0 0; }
body.imm-menu #panelBody { padding:18px 22px max(24px,env(safe-area-inset-bottom)); }
.imm-summary { color:#bbd0cf; font-size:12px; line-height:1.8; margin:0 0 14px; }
.imm-summary strong { color:#e8f1eb; font-weight:500; }
.imm-resume { width:100%; margin:0 0 20px; min-height:48px; }
.imm-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin:0 0 20px; }
.imm-grid button { min-height:48px; padding:11px 12px; border:1px solid #b9d4ce38; border-radius:10px; background:#beddd00a; color:#e0eddf; font-size:12px; line-height:1.6; text-align:left; }
.imm-grid button:disabled { opacity:.4; cursor:default; }
.imm-section { font:500 12px var(--sans,system-ui); color:#a3c1bd; margin:22px 0 10px; }
.imm-toggle { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:48px; font-size:12px; color:#d0e0d8; border-bottom:1px solid #b9d4ce25; }
.imm-toggle input { width:22px; height:22px; accent-color:#d9e6cb; flex-shrink:0; }
.imm-help { font-size:12px; line-height:1.9; color:#a8c5c1; margin:14px 0; }
.imm-home { width:100%; min-height:48px; margin:16px 0 0; border:1px solid #b9d4ce38; border-radius:10px; font-size:12px; color:#d2e1dc; }
@media (max-height:500px) and (orientation:landscape) {
 body.imm-ui { --imm-bottom:max(12px,env(safe-area-inset-bottom)); --imm-top:max(8px,env(safe-area-inset-top)); }
 body.imm-ui #hud #joystick { width:92px; height:92px; }
 body.imm-ui #immDock { gap:10px; }
 body.imm-ui #immDock #vertical { gap:4px; }
 body.imm-ui #hud #interactBtn { bottom:calc(var(--imm-bottom) + 100px); }
 body.imm-ui #immGuide { top:var(--imm-top); max-width:calc(100vw - 160px); }
 body.imm-menu .panel-head { padding:12px 20px; }
 body.imm-menu #panelBody { padding:12px 20px max(16px,env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion:reduce) {
 body.imm-ui #reticle, body.imm-ui #joystick, body.imm-ui #immChrome button { transition:none; }
}
`;

  function hideGuide() {
    clearTimeout(guideTimer);
    guide?.classList.add('hidden');
  }
  function sync() {
    if (!installed) return;
    const diving = active && !$('hud').classList.contains('hidden');
    const blocked = !!modal || photoOpen || !$('debrief')?.classList.contains('hidden');
    document.body.classList.toggle('imm-diving', diving);
    document.body.classList.toggle('imm-panel', blocked);
    document.body.classList.toggle('imm-touch', touch());
    menuButton.setAttribute('aria-expanded', String(modal === 'diveMenu'));
    if (blocked || !diving) hideGuide();
    if (diving && !wasDiving && !teaching) {
      teaching = true; save();
      guide.textContent = touch() ? '左下移動 · 拖曳海景環視 · ↑↓ 深度' : 'WASD 游動 · 拖曳環視 · E / Q 深度';
      const dismiss = document.createElement('span'); dismiss.textContent = '×'; guide.append(dismiss);
      guide.classList.remove('hidden'); guideTimer = setTimeout(hideGuide, 5500);
    }
    wasDiving = diving;
    $('introControls').textContent = touch() ? '左下移動 · 拖曳海景環視 · ↑↓ 上下浮動' : 'WASD 游動 · 拖曳環視 · Esc 選單';
  }
  function preferenceClasses() {
    document.body.classList.toggle('imm-captions', captions);
    document.body.classList.toggle('imm-guidance', guidance);
  }
  function install() {
    if (installed) return;
    const style = document.createElement('style'); style.id = 'immersiveUIStyle'; style.textContent = CSS; document.head.append(style);
    document.body.classList.add('imm-ui'); preferenceClasses();
    chrome = document.createElement('div'); chrome.id = 'immChrome';
    chrome.innerHTML = '<button id="immMenu" type="button" title="暫停與選單（Esc）" aria-label="暫停與選單" aria-haspopup="dialog" aria-controls="panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg></button><div id="immDock"></div><button id="immGuide" class="hidden" type="button" aria-label="關閉操作提示"></button>';
    $('hud').append(chrome); menuButton = $('immMenu'); guide = $('immGuide');
    $('immDock').append($('photoBtn'), $('vertical'));
    menuButton.onclick = () => { hideGuide(); openPanel('diveMenu'); };
    guide.onclick = hideGuide;
    $('playInstructions').textContent = '手機：左下搖桿移動，拖曳海景環視，右下箭頭控制深度，相機拍照。右上選單查看地圖、圖鑑與航程。電腦：WASD 游動，E 上浮，Q 下潛，拖曳環視，空白鍵拍照，Esc 選單。';
    const joystick = $('joystick');
    joystick.addEventListener('pointerdown', event => { heldPointers.add(event.pointerId); joystick.classList.add('imm-held'); hideGuide(); });
    const release = event => { heldPointers.delete(event.pointerId); if (!heldPointers.size) joystick.classList.remove('imm-held'); };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(name, release);
    inputCleanup.push(() => { heldPointers.clear(); joystick.classList.remove('imm-held'); });
    // Keep meaningful confirmations and errors; suppress repeated ambient popups only.
    const originalToast = toast;
    toast = function(message) {
      if (active && /^(雙搖桿|WASD 移動|自動漫遊中；|圖鑑新增 ·)/.test(String(message))) return;
      originalToast(message);
    };
    const originalAbout = renderAbout;
    renderAbout = function() {
      originalAbout();
      for (const p of $('panelBody').querySelectorAll('p')) if (p.textContent.startsWith('手機：')) {
        p.textContent = '手機：左下搖桿移動，直接拖曳海景環視；右下 ↑ ↓ 上浮與下潛，相機按鈕拍照。可同時移動、環視與調整深度。右上選單集中地圖、圖鑑、航程、潛水工具、視角和聲音設定。';
      }
    };
    window.addEventListener('keydown', event => {
      if (event.code !== 'Escape' || !active || photoOpen || oceanFeatures.pointerCaptured() || (modal && modal !== 'diveMenu')) return;
      if (event.repeat) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (modal === 'diveMenu') closePanel(); else openPanel('diveMenu');
    }, true);
    const observer = new MutationObserver(sync);
    for (const id of ['hud', 'panel', 'photoViewer', 'debrief', 'welcome']) {
      const el = $(id); if (el) observer.observe(el, {attributes:true, attributeFilter:['class']});
    }
    window.addEventListener('resize', sync);
    installed = true; sync();
    window.__oceanUI = Object.freeze({revision:'immersive-1', get mode(){return 'minimal';}, get touch(){return touch();}});
  }
  function route(id) {
    const target = $(id); if (!target || target.disabled) return;
    closePanel(); menuButton.focus({preventScroll:true}); target.click();
  }
  function render(type) {
    if (type !== 'diveMenu') return false;
    panelTitle('DIVE MENU', '留在海裡');
    const area = $('areaName')?.textContent || '歸潮海域';
    const depth = $('depth')?.textContent || '—';
    const elapsed = $('diveTime')?.textContent || '00:00';
    const count = $('seenCount')?.textContent || '0';
    const primary = [['mapBtn','海域地圖'],['journalBtn','圖鑑與照片'],['voyageBtn','航程與存檔'],['fieldToolsBtn','潛水工具'],['settingsBtn','畫面與聲音']];
    const actions = [['autoBtn',auto?'停止自動漫遊':'自動漫遊'],['viewBtn',settings.third?'切回第一人稱':'切換第三人稱'],['observeBtn',follow?'結束近距觀察':'近距觀察'],['cruiseBtn','切換巡航速度'],['photoModeBtn',$('cameraFrame').classList.contains('hidden')?'攝影取景':'退出攝影取景'],['lampBtn',settings.lamp?'關閉常亮潛水燈':'常亮潛水燈']];
    if (follow && $('nextIndividual')) actions.push(['nextIndividual','觀察同種下一隻']);
    if ($('companionBtn') && !$('companionBtn').classList.contains('hidden')) actions.push(['companionBtn','海豚伴游']);
    const buttons = (items, disable = false) => items.filter(([id]) => $(id)).map(([id,label]) => `<button type="button" data-imm-route="${id}" ${disable?'disabled':''}>${safe(label)}</button>`).join('');
    $('panelBody').innerHTML = `<p class="imm-summary"><strong>${safe(area)}</strong> · ${safe(depth)} m · ${safe(elapsed)}<br>圖鑑 ${safe(count)} · 潛水已暫停</p><button type="button" id="immResume" class="primary imm-resume">繼續潛水 <span>↗</span></button><div class="imm-grid">${buttons(primary)}</div><h3 class="imm-section">游動與拍攝</h3><div class="imm-grid">${buttons(actions,!active)}</div><h3 class="imm-section">畫面只留下必要的資訊</h3><label class="imm-toggle">故事字幕<input id="immCaptions" type="checkbox" ${captions?'checked':''}></label><label class="imm-toggle">目的地方向提示<input id="immGuidance" type="checkbox" ${guidance?'checked':''}></label><p class="imm-help">${touch()?'左下搖桿移動；拖曳海景環視。右下 ↑ ↓ 調整深度，可同時使用多根手指。':'WASD 移動；拖曳環視；E 上浮、Q 下潛；空白鍵拍照；Esc 開關選單。'}<br>探索時不顯示任務卡與生物資料卡；圖鑑仍會正常記錄。</p><button type="button" id="immHome" class="imm-home">結束潛水，返回研究船</button>`;
    $('immResume').onclick = closePanel;
    for (const button of $('panelBody').querySelectorAll('[data-imm-route]')) button.onclick = () => route(button.dataset.immRoute);
    $('immCaptions').onchange = event => { captions = event.target.checked; preferenceClasses(); save(); };
    $('immGuidance').onchange = event => { guidance = event.target.checked; preferenceClasses(); save(); };
    $('immHome').onclick = () => route('homeBtn');
    return true;
  }
  return {id:'immersiveUI', initial:()=>({}), sanitize:()=>({}), init:install, renderPanel:render,
    panelChanged(type) { document.body.classList.toggle('imm-menu',type === 'diveMenu'); hideGuide(); sync(); },
    panelClosed() { document.body.classList.remove('imm-menu'); sync(); },
    photoOpened() { hideGuide(); sync(); },
    afterCamera() { if (installed && active !== wasDiving) sync(); }
  };
})();
oceanFeatures.register(oceanImmersiveUI);
// Start only after every module is registered, including cached/offline scripts.
boot();
