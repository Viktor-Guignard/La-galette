/* ===================== Modèle de données ===================== */

let uidCounter = 1;
function newId(){ return 'b' + (uidCounter++) + '_' + Math.random().toString(36).slice(2,7); }

/* Le contenu réel de chaque carte est chargé depuis le cloud (versions/<clé>/).
   En attendant, on part d'un document vide. */
function defaultDoc(){ return []; }

/* Tous les blocs possibles. Le sélecteur n'en propose qu'un sous-ensemble par
   carte (voir MENU_BLOCK_PRESETS dans menus-config.js), adapté à sa DA réelle. */
const BLOCK_DEFS = {
  section:          {type:'section', ttl:'Titre de section', desc:'Ex : « LES ENTRÉES »', make:()=>({fr:'NOUVELLE SECTION'})},
  item:             {type:'item', ttl:'Plat', desc:'Nom, description, traduction, prix', make:()=>({fr:'NOUVEAU PLAT', desc:'DESCRIPTION', en:'ENGLISH DESCRIPTION', price:'0.00€'})},
  'item-simple':    {type:'item', ttl:'Plat simple', desc:'Nom + description sur une ligne, prix', make:()=>({fr:'NOUVEAU PLAT', desc:'description', price:'0,00€'})},
  wine:             {type:'wine', ttl:'Vin (4 contenances)', desc:'Nom, domaine, prix 37,5 / 50 / 75 / 150 cl', make:()=>({fr:'NOUVEAU VIN', desc:'DOMAINE', p1:'', p2:'', p3:'0.00€', p4:''})},
  winehead:         {type:'winehead', ttl:'En-tête contenances', desc:'Texte à gauche + « 37,5cl 50cl 75cl 150cl »', make:()=>({text:'', c1:'37,5cl', c2:'50cl', c3:'75cl', c4:'150cl'})},
  line:             {type:'line', ttl:'Ligne de menu (centrée)', desc:'Titre de menu, plat, « ou », traduction, étoiles…', make:()=>({text:'NOUVELLE LIGNE', variant:'main'})},
  legend:           {type:'legend', ttl:'Légende des pictos', desc:'Végétarien · Sans gluten (+ mention des prix)', make:()=>({text:'Prix nets en euros, service compris'})},
  banner:           {type:'banner', ttl:'Bandeau couleur', desc:'Texte blanc sur bande de couleur', make:()=>({text:'NOUVEAU BANDEAU'})},
  cols:             {type:'cols', ttl:'Début de colonnes', desc:'Les blocs suivants se rangent en colonnes', make:()=>({ratio:'50/50'})},
  colbreak:         {type:'colbreak', ttl:'Colonne suivante', desc:'Passe à la colonne de droite', make:()=>({})},
  colsend:          {type:'colsend', ttl:'Fin des colonnes', desc:'Retour à la pleine largeur', make:()=>({})},
  formule:          {type:'formule', ttl:'Ligne formule', desc:'Texte en couleur (accent de la carte)', make:()=>({text:'NOUVELLE FORMULE'})},
  'formule-heading':{type:'formule', ttl:'Sous-titre', desc:'Ex : « LES SPRITZ », « BULLES »', make:()=>({text:'NOUVEAU SOUS-TITRE', heading:true})},
  note:             {type:'note', ttl:'Note / mention', desc:'Petit texte italique gris', make:()=>({text:'Note...'})},
  image:            {type:'image', ttl:'Image / photo', desc:'Logo ou photo centrée (cliquer pour remplacer)', make:()=>({src:'assets/logo-noir.png', widthPct:30})},
  divider:          {type:'divider', ttl:'Séparateur', desc:'Ligne fine de séparation', make:()=>({})},
  pagebreak:        {type:'pagebreak', ttl:'Saut de page', desc:'Démarre une nouvelle page PDF', make:()=>({})},
};

function currentBlockLibrary(){
  const keys = (window.MENU_BLOCK_PRESETS && window.MENU_BLOCK_PRESETS[window.currentMenuKey()]) || Object.keys(BLOCK_DEFS);
  return keys.map(k => BLOCK_DEFS[k]).filter(Boolean);
}

/* Champs mono-lignes : Entrée = valider, pas de retour à la ligne */
const MULTILINE_FIELDS = new Set(['insta','wifi','title','box2']);

/* ===================== Apparence (polices & couleurs) ===================== */

const FONT_CHOICES = {
  title: [
    {name:'Jost', gq:'Jost:ital,wght@0,400;0,500;0,600;1,400'},
    {name:'Arimo', gq:'Arimo:ital,wght@0,400;0,700;1,400'},
    {name:'Montserrat', gq:'Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400'},
    {name:'Playfair Display', gq:'Playfair+Display:wght@700;800'},
    {name:'Cormorant Garamond', gq:'Cormorant+Garamond:wght@600;700'},
    {name:'Fraunces', gq:''},          // fichiers locaux (assets/fonts), mêmes que dans le PDF
    {name:'DM Serif Display', gq:'DM+Serif+Display'},
    {name:'Libre Baskerville', gq:'Libre+Baskerville:wght@400;700'},
    {name:'Oswald', gq:'Oswald:wght@500;600'},
    {name:'Marcellus', gq:'Marcellus'},
  ],
  body: [
    {name:'Jost', gq:'Jost:ital,wght@0,400;0,500;0,600;1,400'},
    {name:'Arimo', gq:'Arimo:ital,wght@0,400;0,700;1,400'},
    {name:'Montserrat', gq:'Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400'},
    {name:'Poppins', gq:'Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500'},
    {name:'Jost', gq:'Jost:ital,wght@0,400;0,500;0,600;1,400'},
    {name:'Lato', gq:'Lato:ital,wght@0,400;0,700;1,400'},
    {name:'Montserrat', gq:'Montserrat:ital,wght@0,400;0,600;0,700;1,400'},
    {name:'Source Sans 3', gq:'Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400'},
    {name:'EB Garamond', gq:'EB+Garamond:ital,wght@0,400;0,600;1,400'},
  ],
};

/* Formats de page réels (px @96dpi + mm pour le PDF) */
const PAGE_FORMATS = {
  a4:      { label:'A4 portrait (21 × 29,7 cm)',  w:794,  h:1123, mm:[210,297] },
  a4l:     { label:'A4 paysage (29,7 × 21 cm)',   w:1123, h:794,  mm:[297,210] },
  carte34: { label:'Carte haute (14 × 34 cm)',    w:529,  h:1285, mm:[140,340] },
  a5:      { label:'Demi-A4 / A5 (14,85 × 21 cm)', w:561,  h:794,  mm:[148.5,210] },
  /* Grand format : la page est dessinée à échelle réduite à l'écran
     (870 px de large) ; le PDF sort, lui, aux dimensions réelles. */
  affiche: { label:'Affiche porte-menu (46 × 66 cm)', w:870, h:1248, mm:[460,660] },
};
/* px d'écran par mm de papier pour un format donné */
function pxPerMm(fmt){ return fmt.w / fmt.mm[0]; }
/* Anciens presets (rétro-compatibilité) -> valeurs en mm */
const LEGACY_MARGINS = {
  compacte: {t:7,  r:8,  b:8,  l:8},
  normale:  {t:12, r:14, b:14, l:14},
  large:    {t:16, r:18, b:18, l:18},
};
const MM2PX = 96/25.4;
function normMargins(st){
  if(st.marginMm && typeof st.marginMm.t === 'number') return st.marginMm;
  return LEGACY_MARGINS[st.margin] || LEGACY_MARGINS.normale;
}
const PAGE_THEMES = {
  alpage:    { label:'La Galette — proposition « alpage »' },
  nuit:      { label:'La Galette — affiche « alpage » noir & or' },
  moderne:   { label:'La Galette — proposition moderne' },
  galette:   { label:'La Galette — carte (filets bruns)' },
  pizza:     { label:'La Galette — pizzas (noms bruns)' },
  emporter:  { label:'La Galette — affiche noir & or' },
  classique: { label:'Classique' },
};

function defaultStyle(){
  return {
    titleFont:'Arimo',
    bodyFont:'Arimo',
    titleColor:'#886c4e',    // brun La Galette (titres, filets)
    accent:'#be4344',        // rouge des descriptions / traductions
    pageBg:'#ffffff',
    leaders:true,           // pointillés entre plat et prix
    format:'a4',
    marginMm:{t:8, r:20, b:10, l:24},
    mirror:false,
    theme:'galette',
    sectionUnderline:true,
    itemSpacing:3,           // padding vertical (px) de chaque ligne plat/boisson
  };
}

function applyStyle(){
  const st = state.style;
  const fmt = PAGE_FORMATS[st.format] || PAGE_FORMATS.a4;
  const m = normMargins(st);
  const k = pxPerMm(fmt);
  const px = mm => Math.round(mm * k) + 'px';
  const root = document.documentElement;
  root.style.setProperty('--font-title', `'${st.titleFont}', serif`);
  root.style.setProperty('--font-body', `'${st.bodyFont}', sans-serif`);
  root.style.setProperty('--title-color', st.titleColor);
  root.style.setProperty('--accent', st.accent);
  root.style.setProperty('--page-bg', st.pageBg);
  root.style.setProperty('--page-w', fmt.w + 'px');
  root.style.setProperty('--page-h', fmt.h + 'px');
  root.style.setProperty('--page-pad', `${px(m.t)} ${px(m.r)} ${px(m.b)} ${px(m.l)}`);
  root.style.setProperty('--name-color', st.nameColor || '#2b2523');
  root.style.setProperty('--bleed-l', px(m.l));
  root.style.setProperty('--crest-top', px(m.t));      // en-tête du thème alpage, aligné sur le logo
  root.style.setProperty('--bleed-r', px(m.r));
  // pages paires : marges en miroir (reliure) si demandé
  const me = st.mirror ? {t:m.t, r:m.l, b:m.b, l:m.r} : m;
  root.style.setProperty('--page-pad-even', `${px(me.t)} ${px(me.r)} ${px(me.b)} ${px(me.l)}`);
  document.body.classList.toggle('leaders-off', !st.leaders);
  Object.keys(PAGE_THEMES).concat(['vigne']).forEach(t => document.body.classList.toggle('theme-' + t, st.theme === t));
  /* « alpage » prolonge la proposition moderne (mêmes niveaux de texte) */
  if(st.theme === 'alpage') document.body.classList.add('theme-moderne');
  /* « nuit » : l'affiche noir & or, retravaillée dans l'esprit alpage */
  if(st.theme === 'nuit') document.body.classList.add('theme-emporter');
  document.body.classList.toggle('no-section-underline', st.sectionUnderline === false);
  root.style.setProperty('--item-pad-v', (st.itemSpacing != null ? st.itemSpacing : 2) + 'px');
  loadFonts(st);
}

function currentPageH(){
  return (PAGE_FORMATS[state.style.format] || PAGE_FORMATS.a4).h;
}

function loadFonts(st){
  const t = FONT_CHOICES.title.find(f => f.name === st.titleFont);
  const b = FONT_CHOICES.body.find(f => f.name === st.bodyFont);
  const parts = [];
  if(t && t.gq) parts.push('family=' + t.gq);
  if(b && b.gq) parts.push('family=' + b.gq);
  if(!parts.length) return;
  const href = 'https://fonts.googleapis.com/css2?' + parts.join('&') + '&display=swap';
  let link = document.getElementById('dynFonts');
  if(!link){
    link = document.createElement('link');
    link.id = 'dynFonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if(link.href !== href) link.href = href;
}

/* ===================== État ===================== */

const state = {
  doc: defaultDoc(),
  style: defaultStyle(),
  selectedId: null,
  lang: (function(){ const q = new URLSearchParams(location.search).get('lang'); return ['en','it','de'].includes(q) ? q : 'fr'; })(),
  dirty: false,           // modifications non enregistrées dans le cloud
  baseVersion: null,      // nom de la version cloud dont on est parti (détection de conflit)
};

/* ===================== Historique (annuler / rétablir) ===================== */

let history = [], hIndex = -1;

function pushHistory(){
  history = history.slice(0, hIndex + 1);
  history.push(JSON.stringify({doc: state.doc, style: state.style}));
  if(history.length > 80) history.shift();
  hIndex = history.length - 1;
  updateHistoryButtons();
}

function resetHistory(){
  history = [JSON.stringify({doc: state.doc, style: state.style})];
  hIndex = 0;
  updateHistoryButtons();
}

function restoreFromHistory(){
  const snap = JSON.parse(history[hIndex]);
  state.doc = snap.doc;
  state.style = snap.style || defaultStyle();
  state.selectedId = null;
  applyStyle();
  render();
  // sauvegarde du brouillon sans nouvel élément d'historique
  state.dirty = true;
  updateSyncStatus();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 800);
  updateHistoryButtons();
}

function undo(){ if(hIndex > 0){ hIndex--; restoreFromHistory(); } }
function redo(){ if(hIndex < history.length - 1){ hIndex++; restoreFromHistory(); } }

function updateHistoryButtons(){
  const u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
  if(u) u.disabled = hIndex <= 0;
  if(r) r.disabled = hIndex >= history.length - 1;
}

/* ===================== Brouillon local (sécurité) ===================== */

const DRAFT_KEY = 'galette_draft_' + window.currentMenuKey();

function saveDraft(){
  try{
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ts: new Date().toISOString(), doc: state.doc, style: state.style, base: state.baseVersion || null}));
  }catch(e){ /* stockage plein : tant pis, le brouillon est un filet de sécurité */ }
}
function clearDraft(){ localStorage.removeItem(DRAFT_KEY); state.dirty = false; updateSyncStatus(); }
function getDraft(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? JSON.parse(raw) : null;
    // un brouillon vide (tout supprimé) ne vaut rien : on l'ignore et on le purge
    if(d && (!Array.isArray(d.doc) || d.doc.length === 0)){ localStorage.removeItem(DRAFT_KEY); return null; }
    return d;
  }catch(e){ return null; }
}

let draftTimer = null;
function markDirty(){
  state.dirty = true;
  updateSyncStatus();
  pushHistory();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 800);
  scheduleTranslate();
}

/* ===================== Traductions automatiques (EN · IT · DE) ===================== */

const I18N = window.CarteI18n;
let trTimer = null, trRunning = null, trFailed = 0;
function scheduleTranslate(delay){
  if(!I18N) return;
  clearTimeout(trTimer);
  trTimer = setTimeout(runTranslate, delay == null ? 1200 : delay);
  updateTrStatus();
}
async function runTranslate(){
  if(!I18N) return;
  if(trRunning) return trRunning;
  const before = I18N.pending(state.doc).length;
  if(!before){ trFailed = 0; updateTrStatus(); return; }
  trRunning = (async () => {
    updateTrStatus('run', 0, before);
    const res = await I18N.translateBlocks(state.doc, (d, t) => updateTrStatus('run', d, t));
    trFailed = res.failed;
    if(window.__refreshLangBanner) window.__refreshLangBanner();
    state.doc.forEach(b => {
      if(b.type !== 'item' || !b.enAuto || !b.tr || !b.tr.en) return;
      if(I18N.isStale(b, 'en', 'desc') || I18N.isStale(b, 'en', 'sub')) return;
      const en = [b.desc && b.tr.en.desc, b.sub && b.tr.en.sub].filter(Boolean).join(' — ');
      if(en && en !== b.en){ b.en = en; if(state.lang === 'fr') render(); }
    });
    if(res.total - res.failed > 0){
      /* des traductions ont été ajoutées : elles partiront avec le prochain enregistrement */
      state.dirty = true; updateSyncStatus();
      clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300);
      if(state.lang !== 'fr') render();
    }
  })();
  try { await trRunning; } finally { trRunning = null; updateTrStatus(); }
  /* le texte a pu changer pendant la passe */
  if(I18N.pending(state.doc).length && !trFailed) scheduleTranslate(400);
}
/* Avant d'enregistrer : on attend que tout soit traduit (15 s maximum) */
async function ensureTranslations(){
  if(!I18N) return true;
  clearTimeout(trTimer);
  await Promise.race([runTranslate(), new Promise(r => setTimeout(r, 15000))]);
  return I18N.pending(state.doc).length === 0;
}
function updateTrStatus(mode, d, t){
  const el = document.getElementById('trStatus');
  if(!el || !I18N) return;
  const left = I18N.pending(state.doc).length;
  el.classList.remove('ok','warn','run');
  if(mode === 'run'){ el.classList.add('run'); el.textContent = `🌐 Traduction… ${d}/${t}`; el.title = 'Traduction automatique en anglais, italien et allemand'; }
  else if(left === 0){
    const rv = I18N.toReview(state.doc).length;
    el.classList.add(rv ? 'run' : 'ok');
    el.textContent = rv ? `🌐 Traduit · ${rv} à relire` : '🌐 Traductions à jour';
    el.title = rv ? 'Des textes ont été traduits par un service en ligne : vérifiez-les dans la vue de chaque langue (soulignés en orange)' : 'Toute la carte est traduite en anglais, italien et allemand';
  }
  else if(trFailed){ el.classList.add('warn'); el.textContent = `🌐 ${left} à traduire`; el.title = 'Traduction automatique indisponible (connexion ?) — réessai au prochain changement, ou corrigez à la main dans la vue de la langue'; }
  else { el.classList.add('run'); el.textContent = `🌐 ${left} à traduire`; el.title = 'La traduction démarre dans un instant'; }
}

function updateSyncStatus(){
  const el = document.getElementById('syncStatus');
  const txt = el.querySelector('.txt');
  const hasToken = !!window.CarteStorage && window.CarteStorage.hasToken();
  el.classList.remove('ok','warn');
  setTimeout(() => { el.title = txt.textContent; }, 0);
  try {
    const d = document.querySelector('#publishLink .pub-dot');
    if(d) d.hidden = localStorage.getItem('galette_a_publier_' + window.currentMenuKey()) !== '1';
  } catch(e){}
  if(state.dirty){
    el.classList.add('warn');
    txt.textContent = 'Modifications non enregistrées';
  } else if(hasToken){
    el.classList.add('ok');
    txt.textContent = 'Tout est enregistré';
  } else {
    txt.textContent = 'Consultation seule — cet appareil n\'est pas encore autorisé (⚙️)';
  }
}

/* Pictogrammes de plat (extraits des PDF sources) */
const TAG_ICONS = {
  veg:   { src:'assets/icon-veg.svg',   label:'Végétarien' },
  gf:    { src:'assets/icon-gf.svg',    label:'Sans gluten' },
  new:   { src:'assets/icon-new.svg',   label:'Nouveauté' },
  coeur: { src:'assets/icon-coeur.svg', label:'Coup de cœur' },
};
/* Le bouton 🏷 fait défiler ces combinaisons */
const TAG_CYCLE = ['', 'veg', 'gf', 'veg+gf', 'new', 'coeur'];
const tagKey = blk => (blk.tags || []).join('+');
function tagsHtml(blk){
  const t = (blk.tags||[]).filter(x => TAG_ICONS[x]);
  if(!t.length) return '';
  return `<span class="item-tags">${t.map(x => `<img class="item-tag tag-${x}" src="${TAG_ICONS[x].src}" title="${TAG_ICONS[x].label}" alt="${TAG_ICONS[x].label}">`).join('')}</span>`;
}
const TAGGABLE = new Set(['item','wine','section']);
const LINE_VARIANTS = ['title','main','sub','or','stars','small'];
const LINE_LABELS = {title:'Titre de menu', main:'Plat (gras)', sub:'Traduction (rouge)', or:'« ou »', stars:'Étoiles', small:'Petit texte'};
const COL_RATIOS = ['50/50','55/45','45/55','60/40','40/60','20/60/20','33/34/33'];

/* ===================== Rendu ===================== */

const canvasWrap = document.getElementById('canvasWrap');

function esc(s){
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

function ed(id, field, value, extraClass, tag){
  tag = tag || 'span';
  return `<${tag} class="${extraClass||''}" contenteditable="true" data-id="${id}" data-field="${field}">${value||''}</${tag}>`;
}

function renderBlockInner(blk){
  switch(blk.type){
    case 'header':
      return `
        <div class="titles">
          <h1>${ed(blk.id,'line1',esc(blk.line1))}<br>${ed(blk.id,'line2',esc(blk.line2))}</h1>
        </div>
        <div class="badgeRow img-slot" data-id="${blk.id}" data-field="logoImg" title="Cliquer pour remplacer le logo">
          <img src="${blk.logoImg || 'assets/logo.png'}" class="logo-badge" alt="logo">
        </div>
        <div class="side">
          <div class="chef">${ed(blk.id,'chef',esc(blk.chef))}</div>
          <div class="insta">${ed(blk.id,'insta',blk.insta)}</div>
          <div class="qr-box img-slot" data-id="${blk.id}" data-field="qrImg" title="Cliquer pour remplacer le QR code">
            <img src="${blk.qrImg || 'assets/qr.png'}" alt="QR code">
          </div>
          <div class="wifi" style="margin-top:8px;">${ed(blk.id,'wifi',blk.wifi)}</div>
        </div>`;
    case 'emp-header':
      return `
        <div class="emp-logo img-slot" data-id="${blk.id}" data-field="logoImg" title="Cliquer pour remplacer le logo">
          <img src="${blk.logoImg || 'assets/logo-blanc.png'}" alt="logo">
        </div>
        <div class="emp-side">
          ${ed(blk.id,'title',blk.title,'emp-title','div')}
          <div class="emp-box">
            ${ed(blk.id,'box1',esc(blk.box1),'emp-box1','div')}
            ${ed(blk.id,'box2',blk.box2,'emp-box2','div')}
          </div>
        </div>`;
    case 'section':
      return `<h2>${ed(blk.id,'fr',esc(blk.fr))}${blk.en != null && blk.en !== '' ? ' <span class="en"><span class="sl">/ </span>'+ed(blk.id,'en',esc(blk.en))+'</span>' : ''}${tagsHtml(blk)}</h2>`;
    case 'item': {
      const hasEn = blk.en != null && blk.en !== '';
      const hasSub = blk.sub != null && blk.sub !== '';
      return `${tagsHtml(blk)}
        <div class="txt">
          <div class="fr"><span class="nm">${ed(blk.id,'fr',esc(blk.fr))}</span>${blk.desc != null ? ' '+ed(blk.id,'desc',esc(blk.desc),'desc') : ''}</div>
          ${hasSub ? `<div class="sub">${ed(blk.id,'sub',esc(blk.sub))}</div>` : ''}
          ${hasEn ? `<div class="en">${ed(blk.id,'en',esc(blk.en))}</div>` : ''}
        </div>
        <div class="leader"></div>
        <div class="price">${ed(blk.id,'price',esc(blk.price))}</div>`;
    }
    case 'wine':
      return `${tagsHtml(blk)}
        <div class="txt"><div class="fr"><span class="nm">${ed(blk.id,'fr',esc(blk.fr))}</span>${blk.desc != null ? ' '+ed(blk.id,'desc',esc(blk.desc),'desc') : ''}</div></div>
        <div class="leader"></div>
        <div class="wprices">${['p1','p2','p3','p4'].map(f => `<div class="wp">${ed(blk.id,f,esc(blk[f]||''))}</div>`).join('')}</div>`;
    case 'winehead':
      return `<div class="txt">${ed(blk.id,'text',esc(blk.text))}</div>
        <div class="wprices">${['c1','c2','c3','c4'].map(f => `<div class="wp">${ed(blk.id,f,esc(blk[f]||''))}</div>`).join('')}</div>`;
    case 'line':
      return `${ed(blk.id,'text',esc(blk.text),'ln')}${blk.price != null ? ' '+ed(blk.id,'price',esc(blk.price),'ln-price') : ''}`;
    case 'banner':
      return ed(blk.id,'text',esc(blk.text),'', 'div');
    case 'legend':
      if(blk.onlyNote) return `<span class="lg-note">${ed(blk.id,'text',esc(blk.text || ''))}</span>`;
      if(state.lang !== 'fr' && I18N) return `<span class="lg"><img src="${TAG_ICONS.veg.src}" alt=""> ${I18N.ui(state.lang,'veg')}</span>
        <span class="lg"><img src="${TAG_ICONS.gf.src}" alt=""> ${I18N.ui(state.lang,'gf')}</span>
        ${blk.text != null ? `<span class="lg-note">${ed(blk.id,'text',esc(blk.text))}</span>` : ''}`;
      return `<span class="lg"><img src="${TAG_ICONS.veg.src}" alt=""> Végétarien · <i>Vegetarian</i></span>
        <span class="lg"><img src="${TAG_ICONS.gf.src}" alt=""> Sans gluten · <i>Gluten free</i></span>
        ${blk.text != null ? `<span class="lg-note">${ed(blk.id,'text',esc(blk.text))}</span>` : ''}`;
    case 'cols':
      return `<span class="mk">⫴ Colonnes ${esc(blk.ratio || '50/50')}</span>`;
    case 'colbreak':
      return '<span class="mk">→ Colonne suivante</span>';
    case 'colsend':
      return '<span class="mk">⫴ Fin des colonnes</span>';
    case 'formule':
      return ed(blk.id,'text',esc(blk.text),'', 'div');
    case 'note':
      return ed(blk.id,'text',esc(blk.text),'', 'div');
    case 'image':
      return `<div class="img-slot img-block-slot" data-id="${blk.id}" data-field="src" title="Cliquer pour remplacer l'image">
        <img src="${blk.src || 'assets/logo-noir.png'}" style="width:${blk.widthPct || 45}%${blk.heightPx ? ';height:' + blk.heightPx + 'px;object-fit:cover' : ''}" alt="">
      </div>`;
    case 'divider':
      return '';
    case 'pagebreak':
      return '<span class="mk">↴ Nouvelle page (PDF)</span>';
    default:
      return '';
  }
}

function blockClass(blk){
  const map = {header:'blk-header', 'emp-header':'blk-emp-header', section:'blk-section', item:'blk-item', wine:'blk-item blk-wine', winehead:'blk-winehead', line:'blk-line', banner:'blk-banner', legend:'blk-legend', cols:'blk-marker blk-cols', colbreak:'blk-marker blk-colbreak', colsend:'blk-marker blk-colsend', formule:'blk-formule', note:'blk-note', divider:'blk-divider', pagebreak:'blk-pagebreak', image:'blk-image'};
  let c = map[blk.type] || '';
  if(blk.type==='line') c += ' v-' + (blk.variant || 'main');
  if(blk.type==='item' && !blk.en && !blk.sub) c += ' one-line';
  if(blk.type==='section' && blk.sub) c += ' sub';
  if(blk.type==='banner' && blk.ink === 'dark') c += ' ink-dark';
  if(blk.type==='note' && blk.italic) c += ' italic';
  if(blk.type==='note' && blk.bold) c += ' bold';
  if(blk.align) c += ' align-' + blk.align;
  if(blk.type==='formule' && blk.italic) c += ' italic';
  if(blk.type==='formule' && blk.heading) c += ' heading';
  if(blk.hidden) c += ' is-hidden';
  return c;
}

/* Blocs qu'on peut masquer temporairement (pas le saut de page) */
const HIDEABLE = new Set(['legend','item','wine','winehead','line','banner','section','formule','note','image','divider']);
/* Repères d'édition (jamais imprimés) */
const MARKERS = new Set(['pagebreak','cols','colbreak','colsend']);

function render(){
  canvasWrap.innerHTML = '';
  let pageBlocks = [];
  let pageNum = 1;

  const flushPage = () => {
    const pageEl = document.createElement('div');
    pageEl.className = 'pdf-page' + (pageNum % 2 === 0 ? ' page-even' : '');
    const fmt = PAGE_FORMATS[state.style.format] || PAGE_FORMATS.a4;
    const [wMm, hMm] = fmt.mm;
    const label = document.createElement('div');
    label.className = 'page-label';
    const lg = I18N && state.lang !== 'fr' ? ` <span class="page-lang">${I18N.LANGS.find(l=>l.code===state.lang).flag} ${I18N.LANGS.find(l=>l.code===state.lang).label}</span>` : '';
    label.innerHTML = `Page ${pageNum} <span class="page-fmt">— ${wMm} × ${hMm} mm (${fmt.label.replace(/ \(.*\)/,'')})</span>${lg}`;
    pageEl.appendChild(label);
    if(pageBlocks.length === 0){
      const hint = document.createElement('div');
      hint.className = 'page-empty-hint';
      hint.textContent = 'Page vide — ajoutez un bloc';
      pageEl.appendChild(hint);
    }
    /* Les blocs « colonnes » rangent la suite en colonnes côte à côte,
       jusqu'à « Fin des colonnes » ou la fin de la page. */
    let target = pageEl, row = null, colIdx = 0, ratios = [];
    const newCol = () => {
      const col = document.createElement('div');
      col.className = 'page-col';
      col.style.flex = `${ratios[colIdx] || ratios[ratios.length-1] || 50} 1 0`;
      row.appendChild(col);
      target = col;
    };
    pageBlocks.forEach(blk => {
      const i = state.doc.indexOf(blk);
      if(blk.type === 'cols'){
        pageEl.appendChild(buildInsertBar(i - 1));
        pageEl.appendChild(buildBlockEl(blk));
        row = document.createElement('div');
        row.className = 'page-cols' + (blk.boxed ? ' boxed' : '');
        if(blk.gap != null) row.style.gap = blk.gap + 'px';
        if(blk.valign) row.style.alignItems = blk.valign;
        pageEl.appendChild(row);
        ratios = String(blk.ratio || '50/50').split('/').map(Number);
        colIdx = 0; newCol();
        return;
      }
      if(blk.type === 'colbreak' && row){
        target.appendChild(buildInsertBar(i - 1));
        target.appendChild(buildBlockEl(blk));
        colIdx++; newCol();
        return;
      }
      if((blk.type === 'colsend' || blk.type === 'pagebreak') && row){
        target.appendChild(buildInsertBar(i - 1));
        row = null; target = pageEl;
      } else {
        target.appendChild(buildInsertBar(i - 1));
      }
      target.appendChild(buildBlockEl(blk));
    });
    if(pageBlocks.length > 0){
      target.appendChild(buildInsertBar(state.doc.indexOf(pageBlocks[pageBlocks.length-1])));
    }
    const hd = state.style.holderMm;
    if(hd && (hd.t || hd.r || hd.b || hd.l)){
      const k = pxPerMm(fmt);
      const g = document.createElement('div');
      g.className = 'holder-guide';
      g.style.inset = `${hd.t*k}px ${hd.r*k}px ${hd.b*k}px ${hd.l*k}px`;
      g.title = 'Zone visible dans le porte-menu';
      pageEl.appendChild(g);
    }
    const warn = document.createElement('div');
    warn.className = 'page-overflow-warning';
    warn.textContent = '⚠️ Le contenu dépasse la page — déplacez des blocs ou ajoutez un saut de page';
    pageEl.appendChild(warn);
    canvasWrap.appendChild(pageEl);
    pageNum++;
    pageBlocks = [];
  };

  state.doc.forEach(blk => {
    pageBlocks.push(blk);
    if(blk.type === 'pagebreak') flushPage();
  });
  flushPage();

  requestAnimationFrame(checkOverflow);
}

function checkOverflow(){
  // Mesure valable uniquement en mise en page A4 (pas en vue mobile,
  // ni quand la fenêtre n'est pas encore dimensionnée)
  if(!window.innerWidth || matchMedia('(max-width:900px)').matches){
    document.querySelectorAll('.pdf-page').forEach(p => p.classList.remove('overflowing'));
    return;
  }
  const pageH = currentPageH();
  document.querySelectorAll('.pdf-page').forEach(page => {
    // retirer d'abord la classe : le bandeau d'avertissement (30px sous la page)
    // gonflerait scrollHeight et rendrait l'état collant
    page.classList.remove('overflowing');
    page.classList.toggle('overflowing', page.scrollHeight > pageH + 2);
    /* porte-menu : un texte sous le cadre (hors zone visible) est signalé */
    const g = page.querySelector('.holder-guide');
    page.classList.remove('under-holder');
    page.querySelectorAll('.block.under-holder').forEach(b => b.classList.remove('under-holder'));
    if(g){
      const gr = g.getBoundingClientRect();
      page.querySelectorAll('.block:not(.blk-marker):not(.blk-pagebreak):not(.i18n-skip)').forEach(b => {
        const r = b.getBoundingClientRect();
        if(!r.width || !r.height) return;
        if(r.top < gr.top - 1 || r.bottom > gr.bottom + 1 || r.left < gr.left - 1 || r.right > gr.right + 1){ b.classList.add('under-holder'); page.classList.add('under-holder'); }
      });
    }
  });
}

function buildInsertBar(afterIndex){
  const bar = document.createElement('div');
  bar.className = 'insert-bar';
  const btn = document.createElement('button');
  btn.textContent = '+ ajouter ici';
  btn.onclick = () => openBlockPicker(afterIndex);
  bar.appendChild(btn);
  return bar;
}

function buildBlockEl(blk){
  const wrap = document.createElement('div');
  const vb = I18N ? I18N.view(blk, state.lang) : blk;
  wrap.className = 'block ' + blockClass(vb) + (state.selectedId===blk.id ? ' selected' : '') + (vb.__skip ? ' i18n-skip' : '');
  wrap.dataset.blockId = blk.id;
  wrap.innerHTML = renderBlockInner(vb);
  if(state.lang !== 'fr' && I18N){
    wrap.querySelectorAll('[contenteditable]').forEach(el => {
      const f = el.dataset.field;
      if(!I18N.isTranslatable(blk, f)){ el.setAttribute('contenteditable', 'false'); el.classList.add('locked'); }
      else if(I18N.isAuto(blk, state.lang, f)){ el.classList.add('tr-auto'); el.title = 'Traduction automatique à relire — cliquez pour corriger'; }
    });
  }
  if(blk.type === 'formule' && blk.color) wrap.style.setProperty('--formule-color-override', blk.color);
  if(blk.size) wrap.style.fontSize = blk.size + 'px';
  if(blk.mt != null) wrap.style.marginTop = blk.mt + 'px';
  if(blk.mb != null) wrap.style.marginBottom = blk.mb + 'px';
  if(blk.hidden){
    const badge = document.createElement('span');
    badge.className = 'hidden-badge';
    badge.textContent = '👁 Masqué du site';
    wrap.appendChild(badge);
  }

  const controls = document.createElement('div');
  controls.className = 'row-controls';
  const tagBtn = TAGGABLE.has(blk.type)
    ? `<button class="rctrl" data-act="tag" title="Pictogramme (végétarien / sans gluten / nouveauté / coup de cœur)">${blk.tags && blk.tags[0] && TAG_ICONS[blk.tags[0]] ? `<img src="${TAG_ICONS[blk.tags[0]].src}" alt="">` : '🏷'}</button>`
    : '';
  const variantBtn = blk.type === 'line'
    ? `<button class="rctrl" data-act="variant" title="Style de la ligne : ${LINE_LABELS[blk.variant||'main']} (cliquer pour changer)">Aa</button>`
    : blk.type === 'cols'
    ? `<button class="rctrl" data-act="ratio" title="Largeur des colonnes : ${esc(blk.ratio||'50/50')} (cliquer pour changer)">⇔</button>`
    : blk.type === 'image'
    ? `<button class="rctrl" data-act="smaller" title="Image plus petite">−</button><button class="rctrl" data-act="bigger" title="Image plus grande">+</button>`
    : '';
  const hideBtn = HIDEABLE.has(blk.type)
    ? `<button class="rctrl${blk.hidden ? ' is-off' : ''}" data-act="hide" title="${blk.hidden ? 'Réafficher sur le site' : 'Masquer temporairement (rupture…)'}">${blk.hidden ? '🚫' : '👁'}</button>`
    : '';
  controls.innerHTML = `
    <button class="rctrl del" data-act="del" title="Supprimer">✕</button>
    <button class="rctrl" data-act="dup" title="Dupliquer">⧉</button>
    <button class="rctrl" data-act="up" title="Monter">↑</button>
    <button class="rctrl" data-act="down" title="Descendre">↓</button>${hideBtn}${tagBtn}${variantBtn}`;
  wrap.appendChild(controls);

  wrap.addEventListener('click', (e) => {
    if(e.target.closest('.rctrl')) return;
    if(e.target.closest('.img-slot')) return;
    state.selectedId = blk.id;
    /* au toucher (pas de survol) : la ligne choisie montre ses boutons */
    canvasWrap.querySelectorAll('.block.selected').forEach(x => { if(x !== wrap) x.classList.remove('selected'); });
    wrap.classList.add('selected');
  });

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const act = btn && btn.dataset.act;
    if(!act) return;
    const idx = state.doc.findIndex(x=>x.id===blk.id);
    if(idx < 0) return;
    if(act==='tag'){
      const cur = tagKey(blk);
      const next = TAG_CYCLE[(Math.max(0, TAG_CYCLE.indexOf(cur)) + 1) % TAG_CYCLE.length];
      blk.tags = next ? next.split('+') : [];
      markDirty(); render();
      toast(next ? 'Pictogramme : ' + blk.tags.map(t => TAG_ICONS[t].label).join(' + ') : 'Pictogramme retiré');
      return;
    }
    if(act==='variant'){
      const cur = blk.variant || 'main';
      blk.variant = LINE_VARIANTS[(LINE_VARIANTS.indexOf(cur) + 1) % LINE_VARIANTS.length];
      markDirty(); render();
      toast('Style : ' + LINE_LABELS[blk.variant]);
      return;
    }
    if(act==='ratio'){
      const cur = blk.ratio || '50/50';
      blk.ratio = COL_RATIOS[(Math.max(0, COL_RATIOS.indexOf(cur)) + 1) % COL_RATIOS.length];
      markDirty(); render();
      toast('Colonnes : ' + blk.ratio + (blk.ratio.split('/').length === 3 ? ' (3 colonnes : ajoutez 2 « Colonne suivante »)' : ''));
      return;
    }
    if(act==='smaller' || act==='bigger'){
      const w = blk.widthPct || 45;
      blk.widthPct = Math.max(5, Math.min(100, w + (act==='bigger' ? 5 : -5)));
      markDirty(); render();
      return;
    }
    if(act==='hide'){
      blk.hidden = !blk.hidden;
      markDirty(); render();
      toast(blk.hidden ? 'Masqué du site (pensez à Enregistrer + Publier)' : 'Réaffiché sur le site');
      return;
    }
    if(act==='up' && idx>0){
      [state.doc[idx-1],state.doc[idx]]=[state.doc[idx],state.doc[idx-1]];
      markDirty(); render();
    }
    if(act==='down' && idx<state.doc.length-1){
      [state.doc[idx+1],state.doc[idx]]=[state.doc[idx],state.doc[idx+1]];
      markDirty(); render();
    }
    if(act==='dup'){
      const copy = JSON.parse(JSON.stringify(state.doc[idx]));
      copy.id = newId();
      state.doc.splice(idx+1, 0, copy);
      state.selectedId = copy.id;
      markDirty(); render();
    }
    if(act==='del'){
      if(state.selectedId === blk.id) state.selectedId = null;
      state.doc.splice(idx,1);
      markDirty(); render();
      toast('Bloc supprimé', 'Annuler', undo);
    }
  });

  wrap.querySelectorAll('.img-slot').forEach(slot=>{
    slot.addEventListener('click', ()=> triggerImageUpload(slot.dataset.id, slot.dataset.field));
  });

  return wrap;
}

function triggerImageUpload(blockId, field){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const blk = state.doc.find(b=>b.id===blockId);
      if(!blk) return;
      blk[field] = reader.result;
      markDirty(); render();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

/* ===================== Édition inline ===================== */

/* Validation à la sortie du champ */
canvasWrap.addEventListener('blur', (e) => {
  const el = e.target;
  if(!el.matches || !el.matches('[contenteditable="true"]')) return;
  const id = el.dataset.id, field = el.dataset.field;
  const blk = state.doc.find(b=>b.id===id);
  if(!blk) return;
  const newVal = MULTILINE_FIELDS.has(field)
    ? el.innerHTML.replace(/<div><br><\/div>/g,'<br>').replace(/<div>/g,'<br>').replace(/<\/div>/g,'')
    : el.textContent;
  if(state.lang !== 'fr' && I18N){
    /* vue étrangère : on ne corrige que la traduction ; le reste se modifie en français */
    if(!I18N.isTranslatable(blk, field)) return;
    const cur = I18N.view(blk, state.lang)[field];
    if(cur !== newVal){ I18N.setManual(blk, state.lang, I18N.sourceField(blk, field), newVal); markDirty(); render(); }
    return;
  }
  if(blk[field] !== newVal){
    blk[field] = newVal;
    /* description française modifiée : la ligne anglaise imprimée suivra la traduction */
    if(blk.type === 'item' && (field === 'desc' || field === 'sub') && blk.en != null) blk.enAuto = true;
    if(blk.type === 'item' && field === 'en') delete blk.enAuto;
    markDirty();
  }
}, true);

/* Entrée = valider (sauf champs multilignes) ; Échap = valider aussi */
canvasWrap.addEventListener('keydown', (e) => {
  const el = e.target;
  if(!el.matches || !el.matches('[contenteditable="true"]')) return;
  if(e.key === 'Escape'){ e.preventDefault(); el.blur(); return; }
  if(e.key === 'Enter' && !MULTILINE_FIELDS.has(el.dataset.field)){
    e.preventDefault();
    el.blur();
  }
});

/* Coller en texte brut (évite d'importer du gras/couleurs de Word etc.) */
canvasWrap.addEventListener('paste', (e) => {
  const el = e.target;
  if(!el.matches || !el.closest('[contenteditable="true"]')) return;
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
});

/* ===================== Ajout de bloc ===================== */

const pickerBackdrop = document.getElementById('pickerBackdrop');
const blockGrid = document.getElementById('blockGrid');
let pendingInsertIndex = null;

function openBlockPicker(afterIndex){
  pendingInsertIndex = afterIndex;
  const sub = document.getElementById('pickerSub');
  if(sub) sub.textContent = `Blocs adaptés à la carte « ${window.currentMenuLabel()} ». Inséré juste après le bloc sélectionné (ou à la fin).`;
  pickerBackdrop.classList.add('open');
}
document.getElementById('addBlockBtn').addEventListener('click', ()=>{
  const idx = state.selectedId ? state.doc.findIndex(b=>b.id===state.selectedId) : state.doc.length-1;
  openBlockPicker(idx);
});
document.getElementById('pickerClose').addEventListener('click', ()=> pickerBackdrop.classList.remove('open'));
pickerBackdrop.addEventListener('click', (e)=>{ if(e.target===pickerBackdrop) pickerBackdrop.classList.remove('open'); });

currentBlockLibrary().forEach(opt=>{
  const el = document.createElement('button');
  el.className = 'block-opt';
  el.innerHTML = `<div class="ttl">${opt.ttl}</div><div class="desc">${opt.desc}</div>`;
  el.onclick = () => {
    const newBlk = { id:newId(), type:opt.type, ...opt.make() };
    const insertAt = (pendingInsertIndex==null ? state.doc.length-1 : pendingInsertIndex) + 1;
    state.doc.splice(insertAt, 0, newBlk);
    state.selectedId = newBlk.id;
    pickerBackdrop.classList.remove('open');
    markDirty(); render();
  };
  blockGrid.appendChild(el);
});

/* ===================== Toast (avec action optionnelle) ===================== */

function toast(msg, actionLabel, actionFn){
  const t = document.getElementById('toast');
  t.innerHTML = '';
  t.appendChild(document.createTextNode(msg));
  if(actionLabel && actionFn){
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
    btn.onclick = () => { actionFn(); t.classList.remove('show'); };
    t.appendChild(btn);
  }
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove('show'), actionLabel ? 6000 : 2600);
}

/* ===================== Annuler / Rétablir : boutons & clavier ===================== */

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  // dans un champ en cours d'édition, laisser l'annulation native du texte
  const el = document.activeElement;
  if(el && el.isContentEditable) return;
  const mod = e.metaKey || e.ctrlKey;
  if(!mod) return;
  if(e.key === 'z' || e.key === 'Z'){
    e.preventDefault();
    if(e.shiftKey) redo(); else undo();
  } else if(e.key === 'y' || e.key === 'Y'){
    e.preventDefault();
    redo();
  }
});

/* ===================== Modale Apparence ===================== */

const appearanceBackdrop = document.getElementById('appearanceBackdrop');

function fillAppearanceForm(){
  const st = state.style;
  const selT = document.getElementById('titleFontSel');
  const selB = document.getElementById('bodyFontSel');
  selT.innerHTML = FONT_CHOICES.title.map(f => `<option${f.name===st.titleFont?' selected':''}>${f.name}</option>`).join('');
  selB.innerHTML = FONT_CHOICES.body.map(f => `<option${f.name===st.bodyFont?' selected':''}>${f.name}</option>`).join('');
  document.getElementById('formatSel').innerHTML = Object.entries(PAGE_FORMATS)
    .map(([k,f]) => `<option value="${k}"${k===(st.format||'a4')?' selected':''}>${f.label}</option>`).join('');
  const m = normMargins(st);
  document.getElementById('marginT').value = m.t;
  document.getElementById('marginR').value = m.r;
  document.getElementById('marginB').value = m.b;
  document.getElementById('marginL').value = m.l;
  document.getElementById('mirrorChk').checked = !!st.mirror;
  const hd = st.holderMm || {t:0,r:0,b:0,l:0};
  ['T','R','B','L'].forEach(k => { document.getElementById('holder'+k).value = hd[k.toLowerCase()] || 0; });
  document.getElementById('themeSel').innerHTML = Object.entries(PAGE_THEMES)
    .map(([k,t]) => `<option value="${k}"${k===(st.theme||'classique')?' selected':''}>${t.label}</option>`).join('');
  document.getElementById('titleColorInp').value = st.titleColor;
  document.getElementById('accentColorInp').value = st.accent;
  document.getElementById('pageBgSel').value = st.pageBg;
  document.getElementById('leadersChk').checked = !!st.leaders;
  document.getElementById('underlineChk').checked = st.sectionUnderline !== false;
  document.getElementById('itemSpacingInp').value = st.itemSpacing != null ? st.itemSpacing : 2;
}

function readAppearanceForm(){
  state.style = {
    titleFont: document.getElementById('titleFontSel').value,
    bodyFont: document.getElementById('bodyFontSel').value,
    titleColor: document.getElementById('titleColorInp').value,
    accent: document.getElementById('accentColorInp').value,
    pageBg: document.getElementById('pageBgSel').value,
    leaders: document.getElementById('leadersChk').checked,
    sectionUnderline: document.getElementById('underlineChk').checked,
    itemSpacing: parseFloat(document.getElementById('itemSpacingInp').value) || 0,
    format: document.getElementById('formatSel').value,
    marginMm: {
      t: parseFloat(document.getElementById('marginT').value) || 0,
      r: parseFloat(document.getElementById('marginR').value) || 0,
      b: parseFloat(document.getElementById('marginB').value) || 0,
      l: parseFloat(document.getElementById('marginL').value) || 0,
    },
    mirror: document.getElementById('mirrorChk').checked,
    holderMm: {
      t: parseFloat(document.getElementById('holderT').value) || 0,
      r: parseFloat(document.getElementById('holderR').value) || 0,
      b: parseFloat(document.getElementById('holderB').value) || 0,
      l: parseFloat(document.getElementById('holderL').value) || 0,
    },
    theme: document.getElementById('themeSel').value,
  };
  applyStyle();
  render();                       // repère du porte-menu, formats…
  markDirty();
  requestAnimationFrame(checkOverflow);
}

document.getElementById('appearanceBtn').addEventListener('click', () => {
  fillAppearanceForm();
  appearanceBackdrop.classList.add('open');
});
document.getElementById('appearanceClose').addEventListener('click', ()=> appearanceBackdrop.classList.remove('open'));
appearanceBackdrop.addEventListener('click', (e)=>{ if(e.target===appearanceBackdrop) appearanceBackdrop.classList.remove('open'); });
['titleFontSel','bodyFontSel','titleColorInp','accentColorInp','pageBgSel','leadersChk','underlineChk','itemSpacingInp','formatSel','marginT','marginR','marginB','marginL','mirrorChk','themeSel','holderT','holderR','holderB','holderL'].forEach(id => {
  document.getElementById(id).addEventListener('change', readAppearanceForm);
});
document.getElementById('appearanceReset').addEventListener('click', () => {
  state.style = defaultStyle();
  applyStyle();
  fillAppearanceForm();
  markDirty();
});

/* ===================== Onglets des cartes ===================== */

function buildMenuTabs(){
  const bar = document.getElementById('menuTabs');
  if(!bar) return;
  const active = window.currentMenuKey();
  bar.innerHTML = '';
  window.CARTE_MENUS.forEach(m => {
    const a = document.createElement('a');
    a.href = '?menu=' + m.key;
    a.className = 'menu-tab' + (m.key === active ? ' active' : '');
    a.innerHTML = `<span class="lbl">${m.label}</span>${m.hint ? `<span class="hint">${m.hint}</span>` : ''}`;
    bar.appendChild(a);
  });
  const pub = document.createElement('a');
  pub.href = 'publier.html';
  pub.className = 'menu-tab publish-tab';
  pub.innerHTML = '<span class="lbl">📱 Publier / QR</span>';
  bar.appendChild(pub);

  const badge = document.getElementById('menuBadge');
  if(badge) badge.textContent = window.currentMenuLabel();
}

/* ===================== Boot ===================== */

buildMenuTabs();
applyStyle();
render();
resetHistory();

/* Sélecteur de langue : FR = la carte (source) ; EN/IT/DE = vue traduite,
   corrigeable au clic. Le PDF sort dans la langue affichée. */
(function setupLang(){
  const sel = document.getElementById('langSel');
  if(!sel || !I18N) return;
  sel.innerHTML = I18N.LANGS.map(l => `<option value="${l.code}"${l.code===state.lang?' selected':''}>${l.flag} ${l.short}</option>`).join('');
  const banner = document.getElementById('langBanner');
  const apply = () => {
    document.body.classList.toggle('lang-foreign', state.lang !== 'fr');
    if(banner){
      const L = I18N.LANGS.find(l => l.code === state.lang);
      const NOM = {en:'anglais', it:'italien', de:'allemand'};
      const rv = state.lang === 'fr' ? 0 : I18N.toReview(state.doc, state.lang).length;
      banner.innerHTML = state.lang === 'fr' ? '' :
        `${L.flag} Carte en <b>${NOM[state.lang]}</b>. Touchez un texte pour corriger sa traduction. Les prix, les plats et leur ordre se modifient dans la carte en <a href="#" data-lang="fr">🇫🇷 français</a>.`
        + (rv ? ` <span class="rv">${rv} traduction${rv>1?'s':''} automatique${rv>1?'s':''} à relire (soulignée${rv>1?'s':''} en orange)</span> <button type="button" data-ok>✓ Tout est bon</button>` : '');
      const a = banner.querySelector('[data-lang]');
      if(a) a.onclick = (e) => { e.preventDefault(); sel.value = 'fr'; sel.onchange(); };
      const ok = banner.querySelector('[data-ok]');
      if(ok) ok.onclick = () => { I18N.markReviewed(state.doc, state.lang); markDirty(); apply(); render(); };
      const pdfL = document.querySelector('#exportPdfBtn .lbl');
      if(pdfL) pdfL.textContent = 'PDF ' + L.short;
    }
    try { const u = new URL(location.href); if(state.lang === 'fr') u.searchParams.delete('lang'); else u.searchParams.set('lang', state.lang); history.replaceState(null, '', u); } catch(e){}
  };
  sel.onchange = () => { state.lang = sel.value; state.selectedId = null; apply(); render(); };
  window.__refreshLangBanner = apply;
  apply();
  updateTrStatus();
})();

/* La mesure de débordement n'est fiable qu'une fois styles + polices chargés */
window.addEventListener('load', checkOverflow);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(checkOverflow);
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(checkOverflow, 200);
});

/* Exposé pour storage.js et pdf-export.js */
window.__CARTE_STATE__ = state;
window.__CARTE_RENDER__ = render;
window.__CARTE_HELPERS__ = {
  toast, markDirty, clearDraft, getDraft, updateSyncStatus,
  applyStyle, resetHistory, defaultStyle, checkOverflow,
  PAGE_FORMATS, pxPerMm, ensureTranslations, scheduleTranslate, updateTrStatus,
};
