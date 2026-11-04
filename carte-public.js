/* Page publique (cible du QR). Lit published.json et affiche les cartes publiées. */
(function () {
  const OWNER = 'Viktor-Guignard', REPO = 'La-galette', BRANCH = 'main';
  // raw.githubusercontent : pas de limite de débit par IP (CDN, cache ~5 min).
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/published.json`;
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/published.json?ref=${BRANCH}`;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  const TAG_ICONS = {
    veg:   { src:'assets/icon-veg.svg',   label:'Végétarien' },
    gf:    { src:'assets/icon-gf.svg',    label:'Sans gluten' },
    new:   { src:'assets/icon-new.svg',   label:'Nouveauté' },
    coeur: { src:'assets/icon-coeur.svg', label:'Coup de cœur' },
  };
  const tagsHtml = b => (b.tags||[]).map(t => TAG_ICONS[t] ? `<img class="item-tag tag-${t}" src="${TAG_ICONS[t].src}" alt="${TAG_ICONS[t].label}" title="${TAG_ICONS[t].label}">` : '').join('');
  let wineCols = ['37,5cl','50cl','75cl','150cl'];

  function renderMenu(menu) {
    const wrap = document.createElement('div');
    wrap.className = 'm-cols' + ((menu.style && menu.style.theme === 'vigne') ? ' vigne' : '');
    let sec = null;
    const ensure = () => { if (!sec) { sec = document.createElement('div'); sec.className = 'm-section'; wrap.appendChild(sec); } return sec; };

    wineCols = ['37,5cl','50cl','75cl','150cl'];
    (menu.blocks || []).forEach(b => {
      if (b.hidden) return;   // plat masqué temporairement : jamais côté client
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
          const desc = b.desc ? ` <span class="desc">${esc(b.desc)}</span>` : '';
          const sub = b.sub ? `<div class="sub">${esc(b.sub)}</div>` : '';
          const en = b.en ? `<div class="en">${esc(b.en)}</div>` : '';
          const p = b.price ? `<div class="p">${esc(b.price)}</div>` : '';
          el.innerHTML = `<div class="n"><div class="fr">${esc(b.fr)}${tagsHtml(b)}${desc}</div>${sub}${en}</div><div class="dots"></div>${p}`;
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
          if (b.text) { const el = document.createElement('div'); el.className = 'm-note'; el.textContent = b.text; ensure().appendChild(el); }
          break;
        }
        case 'wine': {
          const el = document.createElement('div'); el.className = 'm-item';
          const desc = b.desc ? ` <span class="desc">${esc(b.desc)}</span>` : '';
          const prices = ['p1','p2','p3','p4'].map((f, i) => b[f] ? `<span class="wp">${wineCols[i] ? '<small>' + esc(wineCols[i]) + '</small> ' : ''}${esc(b[f])}</span>` : '').filter(Boolean).join('');
          el.innerHTML = `<div class="n"><div class="fr">${esc(b.fr)}${tagsHtml(b)}${desc}</div></div><div class="dots"></div><div class="p wps">${prices}</div>`;
          ensure().appendChild(el);
          break;
        }
        case 'line': {
          const el = document.createElement('div'); el.className = 'm-line v-' + (b.variant || 'main');
          el.innerHTML = esc(b.text) + (b.price ? ' <em>' + esc(b.price) + '</em>' : '');
          if (b.variant === 'title') { sec = document.createElement('div'); sec.className = 'm-section m-menu'; wrap.appendChild(sec); }
          ensure().appendChild(el);
          break;
        }
        case 'banner': {
          const el = document.createElement('div'); el.className = 'm-banner'; el.textContent = b.text;
          ensure().appendChild(el);
          break;
        }
        /* header / emp-header / colonnes / divider / pagebreak : ignorés sur le web */
      }
    });
    return wrap;
  }

  function build(pub) {
    const menus = (pub.menus || []).filter(m => (m.blocks || []).length);
    const tabsEl = document.getElementById('tabs');
    const root = document.getElementById('menuRoot');
    tabsEl.innerHTML = ''; root.innerHTML = '';
    if (!menus.length) { root.innerHTML = '<div class="err">La carte sera bientôt disponible.</div>'; return; }

    const panels = [];
    menus.forEach((m, i) => {
      const tab = document.createElement('button');
      tab.className = 'tab' + (i === 0 ? ' active' : '');
      tab.textContent = m.label || m.key;
      tabsEl.appendChild(tab);

      const panel = renderMenu(m);
      panel.style.display = i === 0 ? '' : 'none';
      root.appendChild(panel);
      panels.push(panel);

      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach((p, j) => p.style.display = j === i ? '' : 'none');
        buildJump(panel);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    buildJump(panels[0]);

    if (pub.updatedAt) {
      const d = new Date(pub.updatedAt);
      if (!isNaN(d)) document.getElementById('updated').textContent = 'Carte mise à jour le ' + d.toLocaleDateString('fr-FR');
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
    document.getElementById('menuRoot').innerHTML = '<div class="err">La carte n\'a pas pu être chargée. Vérifiez votre connexion et réessayez.</div>';
  }

  load();
})();
