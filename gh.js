/* =========================================================
   Socle GitHub partagé (aucune dépendance au DOM).
   Utilisé par l'éditeur (storage.js) et la page Publier (publier.js).
   - Lecture : API publique, aucun jeton requis.
   - Écriture : jeton fine-grained (localStorage), collé une fois
     ou activé par « lien magique » (#jeton=…).
   ========================================================= */
(function (global) {
  const GH = {
    owner: 'Viktor-Guignard',
    repo: 'La-galette',
    branch: 'main',
    tokenKey: 'galette_gh_token'   // propre à La Galette : l'éditeur Coursive est sur le même domaine,
  };
  const API = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents`;

  function getToken() { return localStorage.getItem(GH.tokenKey) || ''; }
  function hasToken() { return !!getToken(); }
  function setToken(t) { tokenRejected = false; if (t) localStorage.setItem(GH.tokenKey, t); else localStorage.removeItem(GH.tokenKey); }

  /* Par morceaux : « String.fromCharCode(...tout) » dépasse la pile du
     navigateur dès que la carte pèse plus de ~100 Ko (traductions incluses). */
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob((b64 || '').replace(/\n/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  function authHeaders(extra) {
    const h = Object.assign({ 'Accept': 'application/vnd.github+json' }, extra || {});
    const t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  /* Clé chronologique tirée du nom (quel que soit le préfixe d'onglet). */
  function dateKey(name) {
    const m = (name || '').match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})h(\d{2})(?:s(\d{2}))?/);
    return m ? (m[1] + m[2] + m[3] + m[4] + m[5] + (m[6] || '00')) : '';
  }

  /* Liste les fichiers .json d'un dossier. -> [{name, path, sha}] trié récent→ancien (par date). */
  /* Clé refusée par GitHub (expirée, révoquée, mal collée) : les cartes sont
     publiques, on les relit SANS clé pour que l'écran ne reste jamais vide.
     L'enregistrement, lui, continuera de signaler la clé à renouveler. */
  var tokenRejected = false;   // var : connu aussi de setToken, plus haut
  async function readFetch(url) {
    const h = authHeaders();
    let res = await fetch(url, { headers: h });
    if ((res.status === 401 || res.status === 403) && h.Authorization) {
      tokenRejected = true;
      res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    }
    return res;
  }
  function isTokenRejected() { return tokenRejected; }

  async function listDir(dir) {
    const res = await readFetch(`${API}/${dir}?ref=${GH.branch}&t=${Date.now()}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items
      .filter(it => it.type === 'file' && it.name.endsWith('.json'))
      .map(it => ({ name: it.name.replace(/\.json$/, ''), path: it.path, sha: it.sha }))
      .sort((a, b) => { const d = dateKey(b.name).localeCompare(dateKey(a.name)); return d !== 0 ? d : b.name.localeCompare(a.name); });
  }

  /* Récupère un fichier {content parsed, sha}. */
  async function getFile(path) {
    const res = await readFetch(`${API}/${path}?ref=${GH.branch}&t=${Date.now()}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    const json = await res.json();
    return { data: JSON.parse(b64ToUtf8(json.content)), sha: json.sha };
  }

  /* Crée un NOUVEAU fichier (échoue si existe). */
  async function createJson(path, obj, message) {
    const token = getToken();
    if (!token) throw new Error('NO_TOKEN');
    const res = await fetch(`${API}/${path}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: message || ('Ajout ' + path),
        content: utf8ToB64(JSON.stringify(obj, null, 1)),
        branch: GH.branch,
      }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('BAD_TOKEN');
    return res;
  }

  /* Écrit (crée ou met à jour) un fichier — récupère le sha si besoin. */
  async function putJson(path, obj, message) {
    const token = getToken();
    if (!token) throw new Error('NO_TOKEN');
    let sha = null;
    try { const ex = await getFile(path); if (ex) sha = ex.sha; } catch (e) { /* 404 => création */ }
    const body = {
      message: message || ('Mise à jour ' + path),
      content: utf8ToB64(JSON.stringify(obj, null, 1)),
      branch: GH.branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(`${API}/${path}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) throw new Error('BAD_TOKEN');
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    return res;
  }

  async function deleteFile(path, sha, message) {
    const token = getToken();
    if (!token) throw new Error('NO_TOKEN');
    const res = await fetch(`${API}/${path}`, {
      method: 'DELETE',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: message || ('Suppression ' + path), sha, branch: GH.branch }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('BAD_TOKEN');
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    return res;
  }

  /* Lien magique : #jeton=… -> mémorise le jeton et nettoie l'URL. */
  function consumeMagicLink(onDone) {
    try {
      const h = location.hash || '';
      if (!h.startsWith('#jeton=')) return false;
      const tok = decodeURIComponent(h.slice(7)).trim();
      if (!tok) return false;
      setToken(tok);
      try { history.replaceState(null, '', location.pathname + location.search); }
      catch (e) { try { location.hash = ''; } catch (e2) {} }
      if (onDone) setTimeout(onDone, 200);
      return true;
    } catch (e) { return false; }
  }
  function magicUrl(baseUrl) {
    return (baseUrl || (location.origin + location.pathname)) + '#jeton=' + encodeURIComponent(getToken());
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  /* Nom de version à l'heure de Paris, quel que soit le réglage de l'appareil
     (un ordinateur resté en heure UTC ou sur un autre fuseau rangeait sa
     version « avant » la précédente). */
  function timestampSuffix() {
    const d = new Date();
    try {
      const o = {};
      new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(p => { o[p.type] = p.value; });
      if (o.year && o.month && o.day && o.hour && o.minute) return `${o.year}-${o.month}-${o.day}_${o.hour === '24' ? '00' : o.hour}h${o.minute}`;
    } catch (e) { /* navigateur ancien : heure locale */ }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}`;
  }
  /* Instant réel d'un nom de version (écrit à l'heure de Paris), quel que soit
     le fuseau de l'appareil qui le lit. */
  function parisOffsetMinutes(dt) {
    try {
      const o = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(dt).forEach(p => { o[p.type] = p.value; });
      return Math.round((Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second) - dt.getTime()) / 60000);
    } catch (e) { return -dt.getTimezoneOffset(); }
  }
  function nameDate(name) {
    const k = dateKey(name || '');
    if (!k) return null;
    const guess = Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), +k.slice(8, 10), +k.slice(10, 12), +k.slice(12, 14));
    return new Date(guess - parisOffsetMinutes(new Date(guess)) * 60000);
  }
  /* Nom de la version à enregistrer : jamais « avant » la dernière version
     existante, même si l'horloge de l'appareil retarde (sinon, au retour, la
     carte affichée serait la précédente). */
  function nextName(prefix, latestName) {
    const name = timestampName(prefix);
    const k = dateKey(latestName || '');
    if (!k) return name;
    const nk = dateKey(name);
    if (nk.slice(0, 12) === k.slice(0, 12)) {
      /* même minute que la dernière version : on ajoute les secondes */
      const s = Math.max(new Date().getSeconds(), +k.slice(12, 14) + 1);
      if (s <= 59) return name + 's' + pad(s);
    } else if (nk > k) {
      return name;
    }
    /* horloge de l'appareil en retard : juste après la dernière version */
    const d = new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), +k.slice(8, 10), +k.slice(10, 12) + 1);
    return `${prefix || 'carte'}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}`;
  }
  function timestampName(prefix) {
    return `${prefix || 'carte'}_${timestampSuffix()}`;
  }

  global.GHUB = {
    conf: GH, getToken, hasToken, setToken,
    listDir, getFile, createJson, putJson, deleteFile, isTokenRejected,
    consumeMagicLink, magicUrl, timestampName, timestampSuffix, nextName, nameDate, dateKey, pad,
  };
})(window);
