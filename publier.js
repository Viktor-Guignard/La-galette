/* Page Publier : choisir les cartes et pousser published.json (le QR reste fixe). */

const PUBLIC_URL = window.CARTE_PUBLIC_URL;
let latestByKey = {};   // key -> {name, path, sha} (dernière version enregistrée)

/* Garde-fou : on ne publie QUE ce qui a été enregistré. Si un brouillon
   non enregistré traîne sur cet ordinateur, on le dit clairement — sinon
   on croit publier ses dernières retouches alors qu'elles restent en
   local. */
function draftWarning(menu) {
  try {
    const raw = localStorage.getItem('carte_draft_' + menu.key);
    if (!raw) return '';
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.doc) || !d.doc.length) return '';
    const when = d.ts ? new Date(d.ts).toLocaleString('fr-FR') : '';
    return `<div class="pub-row-warn">⚠️ Modifications non enregistrées sur cet ordinateur${when ? ' (' + when + ')' : ''} —
      elles <b>ne seront pas publiées</b>. Ouvrez la carte et cliquez 💾 Enregistrer d'abord.</div>`;
  } catch (e) { return ''; }
}
let publishedKeys = new Set();
let publishedAt = null;
let publishedVersion = {};   // key -> nom de la version publiée

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3000);
}

function updateSyncStatus() {
  const el = document.getElementById('syncStatus');
  const txt = el.querySelector('.txt');
  el.classList.remove('ok', 'warn');
  if (GHUB.hasToken()) { el.classList.add('ok'); txt.textContent = 'Publication activée'; }
  else txt.textContent = 'Jeton requis pour publier (⚙️)';
}

/* ---------- Lien magique + réglages ---------- */
GHUB.consumeMagicLink(() => { updateSyncStatus(); refreshMagicLinkUi(); toast('Lien magique reconnu.'); });
window.addEventListener('hashchange', () => GHUB.consumeMagicLink(() => { updateSyncStatus(); toast('Activé.'); }));

const settingsBackdrop = document.getElementById('settingsBackdrop');
function refreshMagicLinkUi() { const b = document.getElementById('magicLinkBox'); if (b) b.style.display = GHUB.hasToken() ? 'block' : 'none'; }
document.getElementById('settingsBtn').addEventListener('click', () => { document.getElementById('tokenInput').value = GHUB.getToken(); refreshMagicLinkUi(); settingsBackdrop.classList.add('open'); });
document.getElementById('settingsClose').addEventListener('click', () => settingsBackdrop.classList.remove('open'));
settingsBackdrop.addEventListener('click', (e) => { if (e.target === settingsBackdrop) settingsBackdrop.classList.remove('open'); });
document.getElementById('tokenForm').addEventListener('submit', (e) => {
  e.preventDefault(); GHUB.setToken(document.getElementById('tokenInput').value.trim());
  refreshMagicLinkUi(); updateSyncStatus(); toast(GHUB.hasToken() ? 'Jeton enregistré.' : 'Jeton effacé.');
});
document.getElementById('copyMagicLink').addEventListener('click', async () => {
  const url = GHUB.magicUrl(location.origin + location.pathname.replace(/publier\.html$/, 'index.html'));
  try { await navigator.clipboard.writeText(url); toast('Lien magique copié.'); }
  catch (e) { const i = document.getElementById('magicLinkText'); i.style.display = 'block'; i.value = url; i.select(); }
});

/* ---------- QR / lien public ---------- */
document.getElementById('publicUrl').textContent = PUBLIC_URL;
document.getElementById('openPublic').href = PUBLIC_URL;
document.getElementById('copyPublic').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(PUBLIC_URL); toast('Lien de la carte copié.'); }
  catch (e) { toast(PUBLIC_URL); }
});

/* ---------- Liste des cartes ---------- */
/* date ISO -> « 04/11/2026 à 16h00 » et clé triable comme les noms de version */
function fmtStamp(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const p = n => (n < 10 ? '0' : '') + n;
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}h${p(d.getMinutes())}`;
}
function stamp(iso) {
  const d = new Date(iso); const p = n => (n < 10 ? '0' : '') + n;
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function fmtDate(name) {
  const m = (name || '').match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})h(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} à ${m[4]}h${m[5]}` : '';
}

async function loadState() {
  const list = document.getElementById('pubList');
  try {
    // dernières versions de chaque carte (en parallèle)
    const entries = await Promise.all(window.CARTE_MENUS.map(async m => {
      try { const v = await GHUB.listDir('versions/' + m.key); return [m.key, v[0] || null]; }
      catch (e) { return [m.key, null]; }
    }));
    latestByKey = Object.fromEntries(entries);

    // état publié
    try {
      const pub = await GHUB.getFile('published.json');
      if (pub && pub.data && Array.isArray(pub.data.menus)) {
        publishedKeys = new Set(pub.data.menus.map(x => x.key));
        publishedAt = pub.data.updatedAt || null;
        pub.data.menus.forEach(x => { publishedVersion[x.key] = x.version || null; });
      }
    } catch (e) { /* pas encore publié */ }

    render();
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="empty-state">Erreur de chargement (connexion internet ?).</div>';
  }
}

function render() {
  const list = document.getElementById('pubList');
  list.innerHTML = '';
  const anyPublished = publishedKeys.size > 0;
  window.CARTE_MENUS.forEach(m => {
    const latest = latestByKey[m.key];
    const row = document.createElement('label');
    row.dataset.key = m.key;
    row.className = 'pub-row';
    // par défaut : coché si déjà publié, sinon coché si une version existe
    const checked = anyPublished ? publishedKeys.has(m.key) : !!latest;
    /* à jour seulement si la version en ligne EST la dernière enregistrée */
    const live = publishedKeys.has(m.key);
    const pv = publishedVersion[m.key];
    const upToDate = live && latest && (pv ? pv === latest.name : (publishedAt && GHUB.dateKey(latest.name) <= stamp(publishedAt)));
    const tag = !live ? '<span class="tag off">pas en ligne</span>'
      : upToDate ? '<span class="tag live">en ligne ✓ à jour</span>'
      : '<span class="tag todo">modifiée — à publier</span>';
    row.innerHTML = `
      <input type="checkbox" class="pub-chk" data-key="${m.key}" data-live="${live ? 1 : 0}" ${checked ? 'checked' : ''} ${latest ? '' : 'disabled'}>
      <div class="pub-row-main">
        <div class="pub-row-title">${m.label}${tag}</div>
        <div class="pub-row-meta">${latest ? 'Dernière version enregistrée : ' + fmtDate(latest.name) : 'Aucune version enregistrée — rien à publier'}</div>
        ${draftWarning(m)}
      </div>
      <a class="pub-row-edit" href="index.html?menu=${m.key}">Éditer ↗</a>`;
    list.appendChild(row);
  });

  const status = document.getElementById('pubStatus');
  status.textContent = publishedAt
    ? 'Dernière mise en ligne : ' + fmtStamp(publishedAt)
    : 'Aucune mise en ligne pour l\'instant.';
  document.getElementById('publishBtn').disabled = false;
}

/* ---------- Publier ---------- */
document.getElementById('publishBtn').addEventListener('click', async () => {
  if (!GHUB.hasToken()) { settingsBackdrop.classList.add('open'); refreshMagicLinkUi(); toast('Collez d\'abord votre jeton (⚙️).'); return; }
  const keys = Array.from(document.querySelectorAll('.pub-chk:checked')).map(c => c.dataset.key);
  if (!keys.length) { toast('Cochez au moins une carte à publier.'); return; }
  const removed = Array.from(document.querySelectorAll('.pub-chk:not(:checked)')).filter(c => c.dataset.live === '1')
    .map(c => (window.CARTE_MENUS.find(m => m.key === c.dataset.key) || {}).label || c.dataset.key);
  if (removed.length && !confirm('« ' + removed.join(' », « ') + ' » va disparaître de la page du QR code et du site. Continuer ?')) return;

  const btn = document.getElementById('publishBtn');
  btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Publication…';
  try {
    const menus = [];
    for (const key of keys) {
      const latest = latestByKey[key];
      if (!latest) continue;
      const f = await GHUB.getFile(latest.path);
      const data = f ? f.data : { blocks: [] };
      const norm = Array.isArray(data) ? { style: null, blocks: data } : { style: data.style || null, blocks: data.blocks || [] };
      const label = (window.CARTE_MENUS.find(m => m.key === key) || {}).label || key;
      menus.push({ key, label, version: latest.name, style: norm.style, blocks: norm.blocks });
    }
    const payload = { updatedAt: new Date().toISOString(), menus };
    await GHUB.putJson('published.json', payload, 'Publication du QR (' + keys.join(', ') + ')');
    publishedKeys = new Set(keys);
    publishedAt = payload.updatedAt;
    keys.forEach(k => { publishedVersion[k] = latestByKey[k] && latestByKey[k].name; try { localStorage.removeItem('carte_a_publier_' + k); } catch (e) { } });
    render();
    toast('✓ En ligne ! Le QR code et le site affichent la nouvelle carte (jusqu\'à 5 min).');
  } catch (err) {
    console.error(err);
    if (err.message === 'BAD_TOKEN') { toast('Jeton refusé — vérifiez ⚙️.'); settingsBackdrop.classList.add('open'); }
    else if (err.message === 'NO_TOKEN') { settingsBackdrop.classList.add('open'); }
    else toast('Erreur de publication — réessayez.');
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
});

updateSyncStatus();
loadState();
