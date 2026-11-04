/* Éditeur — sauvegarde/versions d'UNE carte (déterminée par ?menu=…).
   S'appuie sur gh.js (GHUB) pour toute la partie GitHub. */

const MENU_KEY = window.currentMenuKey();
const MENU_DIR = 'versions/' + MENU_KEY;

const S = () => window.__CARTE_STATE__;
const H = () => window.__CARTE_HELPERS__;

/* Charge une version {style, blocks} (ou tableau nu hérité). */
function normalizeVersion(data) {
  if (Array.isArray(data)) return { style: null, blocks: data };
  return { style: data.style || null, blocks: data.blocks || [] };
}

async function listVersions() { return GHUB.listDir(MENU_DIR); }
async function loadVersion(path) {
  const f = await GHUB.getFile(path);
  return normalizeVersion(f ? f.data : []);
}
async function saveVersion(doc, style) {
  const name = GHUB.timestampName(window.currentMenuSlug());
  const body = { style, blocks: doc };
  let res = await GHUB.createJson(`${MENU_DIR}/${name}.json`, body, 'Version ' + name);
  if (res.status === 422) {
    const name2 = name + 's' + GHUB.pad(new Date().getSeconds());
    res = await GHUB.createJson(`${MENU_DIR}/${name2}.json`, body, 'Version ' + name2);
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    return name2;
  }
  if (!res.ok) throw new Error('GitHub API ' + res.status);
  return name;
}

window.CarteStorage = { hasToken: GHUB.hasToken, listVersions, loadVersion, saveVersion };

/* ===================== UI ===================== */

const saveBtn = document.getElementById('saveVersionBtn');
const versionsBtn = document.getElementById('versionsBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const versionsBackdrop = document.getElementById('versionsBackdrop');
const versionList = document.getElementById('versionList');

function applyLoaded(data, versionName) {
  S().doc = data.blocks;
  S().style = data.style || H().defaultStyle();
  S().selectedId = null;
  S().baseVersion = versionName || null;
  H().applyStyle();
  window.__CARTE_RENDER__();
  H().resetHistory();
}

/* ---------- Lien magique ---------- */
GHUB.consumeMagicLink(() => {
  H().updateSyncStatus();
  H().toast('Lien magique reconnu — la sauvegarde est activée sur cet ordinateur.');
});
window.addEventListener('hashchange', () => GHUB.consumeMagicLink(() => {
  H().updateSyncStatus();
  H().toast('Sauvegarde activée sur cet ordinateur.');
}));

function refreshMagicLinkUi() {
  const box = document.getElementById('magicLinkBox');
  if (box) box.style.display = GHUB.hasToken() ? 'block' : 'none';
}

/* ---------- Réglages (jeton) ---------- */
settingsBtn.addEventListener('click', () => {
  document.getElementById('tokenInput').value = GHUB.getToken();
  refreshMagicLinkUi();
  settingsBackdrop.classList.add('open');
});
document.getElementById('settingsClose').addEventListener('click', () => settingsBackdrop.classList.remove('open'));
settingsBackdrop.addEventListener('click', (e) => { if (e.target === settingsBackdrop) settingsBackdrop.classList.remove('open'); });

document.getElementById('tokenForm').addEventListener('submit', (e) => {
  e.preventDefault();
  GHUB.setToken(document.getElementById('tokenInput').value.trim());
  refreshMagicLinkUi();
  H().updateSyncStatus();
  H().toast(GHUB.hasToken() ? 'Jeton enregistré sur cet ordinateur.' : 'Jeton effacé.');
});

document.getElementById('copyMagicLink').addEventListener('click', async () => {
  const url = GHUB.magicUrl(location.origin + location.pathname);
  try {
    await navigator.clipboard.writeText(url);
    H().toast('Lien magique copié — mettez-le en favori sur vos autres ordinateurs.');
  } catch (e) {
    const inp = document.getElementById('magicLinkText');
    inp.style.display = 'block'; inp.value = url; inp.select();
    H().toast('Copiez le lien affiché ci-dessous (Ctrl/Cmd+C).');
  }
});

/* ---------- Enregistrer ---------- */
saveBtn.addEventListener('click', async () => {
  if (!GHUB.hasToken()) {
    settingsBackdrop.classList.add('open'); refreshMagicLinkUi();
    H().toast('Collez d\'abord votre jeton GitHub (une fois par ordinateur).');
    return;
  }
  saveBtn.disabled = true;
  const original = saveBtn.textContent;
  saveBtn.textContent = 'Enregistrement…';
  try {
    try {
      const latest = (await listVersions())[0];
      if (latest && latest.name !== S().baseVersion) {
        const ok = confirm(
          'Attention : une version plus récente (« ' + latest.name + ' ») de cette carte a été enregistrée depuis votre point de départ — probablement depuis un autre ordinateur.\n\n' +
          'Si vous continuez, VOTRE version deviendra la version courante ; l\'autre restera consultable dans 🕑 Versions.\n\nEnregistrer quand même ?');
        if (!ok) { return; }
      }
    } catch (e) { /* hors-ligne : on tente quand même */ }
    const name = await saveVersion(S().doc, S().style);
    S().baseVersion = name;
    H().clearDraft();
    H().toast('Version enregistrée : ' + name);
  } catch (err) {
    console.error(err);
    if (err.message === 'BAD_TOKEN') { H().toast('Jeton refusé par GitHub — vérifiez ⚙️ Réglages.'); settingsBackdrop.classList.add('open'); }
    else if (err.message === 'NO_TOKEN') { settingsBackdrop.classList.add('open'); }
    else H().toast('Erreur d\'enregistrement — réessayez.');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = original;
  }
});

/* ---------- Versions ---------- */
versionsBtn.addEventListener('click', async () => {
  versionsBackdrop.classList.add('open');
  versionList.innerHTML = '<div class="empty-state">Chargement…</div>';
  try {
    const versions = await listVersions();
    if (!versions.length) { versionList.innerHTML = '<div class="empty-state">Aucune version enregistrée pour cette carte.</div>'; return; }
    versionList.innerHTML = '';
    versions.forEach((v, i) => {
      const row = document.createElement('div');
      row.className = 'version-row';
      const m = v.name.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})h(\d{2})/);
      const dateStr = m ? `${m[3]}/${m[2]}/${m[1]} à ${m[4]}h${m[5]}` : '';
      row.innerHTML = `
        <div>
          <div class="vname">${v.name}${i === 0 ? '<span class="tag">plus récente</span>' : ''}</div>
          <div class="vmeta">${dateStr}</div>
        </div>
        <div class="vactions">
          <button class="load">Charger</button>
          ${GHUB.hasToken() ? '<button class="delete" title="Supprimer définitivement">🗑</button>' : ''}
        </div>`;
      const del = row.querySelector('.delete');
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Supprimer définitivement « ' + v.name + ' » ?\n\nCette action ne peut PAS être annulée.')) return;
        del.disabled = true;
        try { await GHUB.deleteFile(v.path, v.sha, 'Suppression ' + v.path); row.remove(); H().toast('Version supprimée.'); if (i === 0) versionsBtn.click(); }
        catch (err) { console.error(err); del.disabled = false; H().toast(err.message === 'BAD_TOKEN' ? 'Jeton refusé — voir ⚙️.' : 'Erreur de suppression.'); }
      });
      row.querySelector('.load').addEventListener('click', async () => {
        if (S().dirty && !confirm('Des modifications non enregistrées seront remplacées par « ' + v.name + ' ». Continuer ?')) return;
        try {
          applyLoaded(await loadVersion(v.path), v.name);
          H().clearDraft();
          versionsBackdrop.classList.remove('open');
          H().toast('Version « ' + v.name + ' » chargée.');
        } catch (err) { console.error(err); H().toast('Erreur de chargement.'); }
      });
      versionList.appendChild(row);
    });
  } catch (err) { console.error(err); versionList.innerHTML = '<div class="empty-state">Erreur de chargement (connexion internet ?).</div>'; }
});
document.getElementById('versionsClose').addEventListener('click', () => versionsBackdrop.classList.remove('open'));
versionsBackdrop.addEventListener('click', (e) => { if (e.target === versionsBackdrop) versionsBackdrop.classList.remove('open'); });

/* ---------- Boot : brouillon puis dernière version cloud ---------- */
(async function boot() {
  H().updateSyncStatus();
  const draft = H().getDraft();
  let draftResumed = false;

  if (draft) {
    const banner = document.getElementById('draftBanner');
    const when = new Date(draft.ts).toLocaleString('fr-FR');
    banner.querySelector('.msg').textContent = `Un brouillon non enregistré du ${when} existe sur cet ordinateur (carte : ${window.currentMenuLabel()}).`;
    banner.classList.add('show');
    document.getElementById('draftResume').onclick = () => {
      draftResumed = true;
      S().doc = draft.doc;
      if (draft.style) S().style = draft.style;
      S().dirty = true;
      H().applyStyle(); window.__CARTE_RENDER__(); H().resetHistory(); H().updateSyncStatus();
      banner.classList.remove('show');
      H().toast('Brouillon repris — pensez à Enregistrer une version.');
    };
    document.getElementById('draftDiscard').onclick = () => { H().clearDraft(); banner.classList.remove('show'); };
  }

  try {
    const versions = await listVersions();
    if (versions.length && !draftResumed) {
      const data = await loadVersion(versions[0].path);
      if (!draftResumed) { applyLoaded(data, versions[0].name); H().toast('Dernière version chargée : ' + versions[0].name); }
    }
  } catch (err) { console.warn('Chargement initial impossible', err); }
  /* Signal pour le rendu cloud (render.mjs attend ce drapeau). */
  window.__BOOT_DONE__ = true;
})();
