/* Page publique (cible du QR). Lit published.json et affiche les cartes publiées. */
(function () {
  const OWNER = 'Viktor-Guignard', REPO = 'La-galette', BRANCH = 'main';
  // raw.githubusercontent : pas de limite de débit par IP (CDN, cache ~5 min).
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/published.json`;
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/published.json?ref=${BRANCH}`;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  /* Langue du visiteur : celle du téléphone par défaut, choix mémorisé */
  const I18N = window.CarteI18n;
  let LANG = I18N ? I18N.preferred() : 'fr';
  if (I18N && new URLSearchParams(location.search).get('lang')) I18N.remember(LANG);   // lien « ?lang=de » : mémorisé aussi
  const T = k => I18N ? I18N.ui(LANG, k) : k;
  let lastPub = null, activeKey = null;

  const TAG_ICONS = {
    veg:   { src:'assets/icon-veg.svg' },
    gf:    { src:'assets/icon-gf.svg' },
    new:   { src:'assets/icon-new.svg' },
    coeur: { src:'assets/icon-coeur.svg' },
  };
  const tagsHtml = b => (b.tags||[]).map(t => TAG_ICONS[t] ? `<img class="item-tag tag-${t}" src="${TAG_ICONS[t].src}" alt="${T(t)}" title="${T(t)}">` : '').join('');
  let wineCols = ['37,5cl','50cl','75cl','150cl'];

  function renderMenu(menu) {
    const wrap = document.createElement('div');
    wrap.className = 'm-cols' + ((menu.style && menu.style.theme === 'vigne') ? ' vigne' : '');
    let sec = null;
    const ensure = () => { if (!sec) { sec = document.createElement('div'); sec.className = 'm-section'; wrap.appendChild(sec); } return sec; };

    wineCols = ['37,5cl','50cl','75cl','150cl'];
    const usedTags = new Set();
    const blocks = (menu.blocks || []).filter(b => !(b.type === 'note' && /^prix nets/i.test(b.text || '')));   // déjà en pied de page
    blocks.forEach(b0 => {
      if (b0.hidden) return;   // plat masqué temporairement : jamais côté client
      const b = I18N ? I18N.view(b0, LANG) : b0;
      if (b.__skip) return;    // ligne de traduction anglaise : inutile hors français
      switch (b.type) {
        case 'section': {
          sec = document.createElement('div'); sec.className = 'm-section';
          sec.innerHTML = `<h2>${esc(b.fr)}${b.en != null && b.en !== '' ? ' <span class="en">/ ' + esc(b.en) + '</span>' : ''}${tagsHtml(b)}</h2>`;
          if (b.sub) sec.classList.add('sub');
          wrap.appendChild(sec);
          break;
        }
        case 'formule': {
          const el = document.createElement('div');
          el.className = 'm-formule' + (b.heading ? ' heading' : '');
          // "heading" = sous-titre de groupe (ex. Les Spritz)
          if (b.heading) el.className = 'm-head';
          el.textContent = b.text;
          if (b.color) el.style.color = b.color;
          ensure().appendChild(el);
          break;
        }
        case 'note': {
          const el = document.createElement('div'); el.className = 'm-note'; el.textContent = b.text;
          ensure().appendChild(el);
          break;
        }
        case 'item': {
          const el = document.createElement('div'); el.className = 'm-item';
          /* nom, puis description sur sa ligne, puis traduction en italique */
          const desc = b.desc ? `<div class="desc">${esc(b.desc)}</div>` : '';
          const sub = b.sub ? `<div class="sub">${esc(b.sub)}</div>` : '';
          const en = b.en ? `<div class="en">${esc(b.en)}</div>` : '';
          const p = b.price ? `<div class="p">${esc(PRICE(b.price))}</div>` : '';
          (b0.tags || []).forEach(t => usedTags.add(t));
          el.innerHTML = `<div class="n"><div class="fr">${esc(b.fr)}${tagsHtml(b)}</div>${desc}${sub}${en}</div>${p}`;
          ensure().appendChild(el);
          break;
        }
        case 'image': {
          /* logo répété en tête de chaque page imprimée, QR de l'affiche : inutiles sur le téléphone */
          if (/logo-(noir|blanc)|qr-/.test(b.src || '')) break;
          const el = document.createElement('div'); el.className = 'm-image';
          el.innerHTML = `<img src="${esc(b.src||'')}" style="width:${b.widthPct||45}%" alt="">`;
          ensure().appendChild(el);
          break;
        }
        case 'winehead': {
          wineCols = [b.c1, b.c2, b.c3, b.c4];
          /* « voir dernière page » : renvoi propre au papier, inutile en ligne */
          if (b.text && !/(dernière page|last page|ultima pagina|letzte seite)/i.test(b.text)) { const el = document.createElement('div'); el.className = 'm-note'; el.textContent = b.text; ensure().appendChild(el); }
          break;
        }
        case 'wine': {
          const el = document.createElement('div'); el.className = 'm-item';
          const desc = b.desc ? ` <span class="desc">${esc(b.desc)}</span>` : '';
          const prices = ['p1','p2','p3','p4'].map((f, i) => b[f] ? `<span class="wp">${wineCols[i] ? '<small>' + esc(wineCols[i]) + '</small> ' : ''}${esc(PRICE(b[f]))}</span>` : '').filter(Boolean).join('');
          el.innerHTML = `<div class="n"><div class="fr">${esc(b.fr)}${tagsHtml(b)}</div>${b.desc ? `<div class="desc">${esc(b.desc)}</div>` : ''}</div><div class="p wps">${prices}</div>`;
          ensure().appendChild(el);
          break;
        }
        case 'line': {
          const el = document.createElement('div'); el.className = 'm-line v-' + (b.variant || 'main');
          el.innerHTML = esc(b.text) + (b.price ? ' <em>' + esc(PRICE(b.price)) + '</em>' : '');
          if (b.variant === 'title') { sec = document.createElement('div'); sec.className = 'm-section m-menu'; wrap.appendChild(sec); }
          ensure().appendChild(el);
          break;
        }
        case 'emp-header': {
          /* affiche à emporter : le téléphone, seul moyen de commander */
          const tel = (b.box2 || '').replace(/<[^>]+>/g, '');
          const el = document.createElement('div'); el.className = 'm-order';
          el.innerHTML = `<div class="t">${esc((b.title || '').replace(/<br\s*\/?>/gi, ' '))}</div><div class="s">${esc(b.box1 || '')}</div>${tel ? `<a class="tel" href="tel:${tel.replace(/[^+\d]/g, '').replace(/^\+330/, '+33')}">📞 ${esc(tel)}</a>` : ''}`;
          wrap.appendChild(el);
          break;
        }
        case 'banner': {
          const el = document.createElement('div'); el.className = 'm-head m-banner-web'; el.textContent = b.text;
          ensure().appendChild(el);
          break;
        }
        /* header / emp-header / colonnes / divider / pagebreak : ignorés sur le web */
      }
    });
    /* légende des pictogrammes utilisés */
    const lg = ['veg', 'gf'].filter(t => usedTags.has(t));
    if (lg.length) {
      const el = document.createElement('div'); el.className = 'm-legend';
      el.innerHTML = lg.map(t => `<span><img src="${TAG_ICONS[t].src}" alt=""> ${T(t)}</span>`).join('');
      wrap.insertBefore(el, wrap.firstChild);
    }
    return wrap;
  }
  const PRICE = p => I18N ? I18N.price(p) : p;

  function build(pub) {
    lastPub = pub;
    document.documentElement.lang = LANG;
    const tg = document.querySelector('.pub-head .sub'); if (tg) tg.textContent = T('tagline');
    buildLangs();
    let menus = (pub.menus || []).filter(m => (m.blocks || []).length);
    /* la carte « Pizzas (EN) » est faite pour l'impression : en ligne, l'onglet
       Pizzas se lit déjà dans la langue choisie */
    if (menus.some(m => m.key === 'pizzas')) menus = menus.filter(m => m.key !== 'pizzas-en');
    const tabsEl = document.getElementById('tabs');
    const root = document.getElementById('menuRoot');
    tabsEl.innerHTML = ''; root.innerHTML = '';
    if (!menus.length) { root.innerHTML = `<div class="err">${T('soon')}</div>`; return; }
    if (!menus.some(m => m.key === activeKey)) activeKey = menus[0].key;

    const panels = [];
    menus.forEach((m, i) => {
      const tab = document.createElement('button');
      tab.className = 'tab' + (m.key === activeKey ? ' active' : '');
      tab.textContent = I18N ? I18N.menuLabel(m.key, LANG, m.label) : (m.label || m.key);
      tabsEl.appendChild(tab);

      const panel = renderMenu(m);
      panel.style.display = m.key === activeKey ? '' : 'none';
      root.appendChild(panel);
      panels.push(panel);

      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach((p, j) => p.style.display = j === i ? '' : 'none');
        activeKey = m.key;
        buildJump(panel);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    buildJump(panels[Math.max(0, menus.findIndex(m => m.key === activeKey))]);
    const foot = document.getElementById('footNote'); if (foot) foot.textContent = T('foot');
    const tb = document.getElementById('topBtn'); if (tb) tb.setAttribute('aria-label', T('top'));

    if (pub.updatedAt) {
      const d = new Date(pub.updatedAt);
      const loc = { fr: 'fr-FR', en: 'en-GB', it: 'it-IT', de: 'de-DE' }[LANG] || 'fr-FR';
      if (!isNaN(d)) document.getElementById('updated').textContent = T('updated') + ' ' + d.toLocaleDateString(loc);
    }
  }

  /* Chips d'accès rapide aux sections du menu affiché (si ≥ 4 sections) */
  function buildJump(panel) {
    const jump = document.getElementById('jump');
    jump.innerHTML = '';
    const sections = panel.querySelectorAll('.m-section > h2');
    if (sections.length < 4) return;
    sections.forEach(h2 => {
      const b = document.createElement('button');
      b.textContent = (h2.childNodes[0].textContent || '').trim().toLowerCase();
      b.addEventListener('click', () => {
        const y = h2.getBoundingClientRect().top + window.scrollY - document.querySelector('.tabs-zone').offsetHeight - 8;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
      jump.appendChild(b);
    });
  }

  /* Retour en haut */
  const topBtn = document.getElementById('topBtn');
  window.addEventListener('scroll', () => {
    topBtn.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  async function load() {
    // 1) raw (rapide, sans quota) ; 2) repli API si raw indisponible
    try {
      const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { build(await r.json()); return; }
    } catch (e) { /* essai suivant */ }
    try {
      const r = await fetch(API + '&t=' + Date.now(), { headers: { Accept: 'application/vnd.github+json' } });
      if (r.ok) {
        const j = await r.json();
        const txt = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
        build(JSON.parse(txt)); return;
      }
    } catch (e) { /* essai suivant */ }
    // 3) dev local : fichier servi à côté
    try {
      const r = await fetch('published.json?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { build(await r.json()); return; }
    } catch (e) { /* échec */ }
    document.getElementById('menuRoot').innerHTML = `<div class="err">${T('error')}</div>`;
  }

  /* Sélecteur de langue (drapeaux) */
  function buildLangs() {
    const el = document.getElementById('langs');
    if (!el || !I18N) return;
    el.innerHTML = '';
    el.setAttribute('aria-label', T('lang'));
    I18N.LANGS.forEach(l => {
      const b = document.createElement('button');
      b.className = 'lang' + (l.code === LANG ? ' active' : '');
      b.innerHTML = `<span class="flag">${l.flag}</span><span>${l.short}</span>`;
      b.title = l.label;
      b.setAttribute('aria-pressed', l.code === LANG ? 'true' : 'false');
      b.onclick = () => setLang(l.code, true);
      el.appendChild(b);
    });
    updateFab();
  }

  /* Changer de langue (drapeaux du haut, bouton 🌐, écran d'accueil) */
  function setLang(code, keepScroll) {
    try { localStorage.setItem('carte_lang_chosen', '1'); } catch (e) { }
    if (code === LANG) { updateFab(); return; }
    LANG = code; I18N.remember(LANG);
    const y = window.scrollY;
    if (lastPub) build(lastPub);
    window.scrollTo(0, keepScroll ? Math.min(y, document.body.scrollHeight) : 0);
  }

  /* Écran de choix de la langue : à la première visite (scan du QR code),
     puis à chaque appui sur le bouton 🌐 flottant. */
  const gate = document.getElementById('langGate');
  const fab = document.getElementById('langFab');
  function updateFab() {
    if (!fab || !I18N) return;
    const L = I18N.LANGS.find(l => l.code === LANG);
    fab.innerHTML = `🌐 <span>${L.flag} ${L.short}</span>`;
    fab.hidden = false;
  }
  function openGate() {
    if (!gate || !I18N) return;
    const box = document.getElementById('langGateBtns');
    box.innerHTML = '';
    I18N.LANGS.forEach(l => {
      const b = document.createElement('button');
      b.className = 'lg-btn' + (l.code === LANG ? ' current' : '');
      b.innerHTML = `<span class="flag">${l.flag}</span><span>${l.label}</span>`;
      b.onclick = () => { gate.hidden = true; document.body.classList.remove('gate-open'); setLang(l.code, false); };
      box.appendChild(b);
    });
    gate.hidden = false;
    document.body.classList.add('gate-open');
    const first = box.querySelector('.current') || box.firstChild;
    if (first) first.focus();
  }
  if (fab) fab.onclick = openGate;
  if (gate) gate.addEventListener('click', e => { if (e.target === gate && localStorage.getItem('carte_lang_chosen')) { gate.hidden = true; document.body.classList.remove('gate-open'); } });
  let chosen = false;
  try { chosen = !!localStorage.getItem('carte_lang_chosen'); } catch (e) { chosen = true; }   // stockage bloqué : pas d'écran à chaque visite
  if (I18N && !chosen && !new URLSearchParams(location.search).get('lang')) openGate();

  const ld = document.querySelector('#menuRoot .loading'); if (ld) ld.textContent = T('loading');
  load();
})();
