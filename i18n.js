/* =========================================================
   Cartes multilingues — FR (source) · EN · IT · DE
   Partagé par l'éditeur, la page du QR et le site vitrine.

   Les traductions sont rangées DANS chaque bloc :
     blk.tr = { en:{fr:'…', desc:'…'}, it:{…}, de:{…},
                src:{fr:'texte français traduit', …},      // pour savoir si c'est à jour
                manual:{it:{fr:true}} }                    // corrigé à la main : on n'écrase pas
   Quand le français change, la traduction redevient « à refaire ».

   Traduction automatique, dans cet ordre :
     1. mémoire de traduction (i18n/glossaire.json : traductions relues)
     2. listes d'ingrédients recomposées terme à terme depuis la mémoire
     3. service en ligne (Google, puis MyMemory) en dernier recours
   ========================================================= */
(function (global) {
  const LANGS = [
    { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
    { code: 'it', label: 'Italiano', short: 'IT', flag: '🇮🇹' },
    { code: 'de', label: 'Deutsch', short: 'DE', flag: '🇩🇪' },
  ];
  const TARGETS = ['en', 'it', 'de'];

  /* champs traduits, par type de bloc (le prix, lui, est commun) */
  const FIELDS = {
    item: ['fr', 'desc', 'sub', 'en'],   // « en » = ligne anglaise imprimée, traduite elle aussi
    wine: ['desc'],                    // le nom du vin ne se traduit pas
    section: ['fr'], line: ['text'], note: ['text'], formule: ['text'],
    banner: ['text'], winehead: ['text'], legend: ['text'],
    'emp-header': ['title', 'box1'],
  };
  /* noms qui ne se traduisent jamais (pizzas, vins…) : drapeau keepName sur le bloc */
  function fieldsOf(blk) {
    let f = FIELDS[blk.type] || [];
    if (blk.keepName) f = f.filter(x => x !== 'fr');
    if (blk.enAuto) f = f.filter(x => x !== 'en');   // ligne anglaise recalculée depuis le français
    return f;
  }

  /* petits textes d'interface (page du QR, site, légendes) */
  const UI = {
    fr: { tagline: 'Méribel · Restaurant savoyard · Pizzéria · Crêperie', legend: 'Pictogrammes', veg: 'Végétarien', gf: 'Sans gluten', new: 'Nouveauté', coeur: 'Coup de cœur', updated: 'Carte mise à jour le', loading: 'Chargement de la carte…', error: 'La carte n\'a pas pu être chargée. Vérifiez votre connexion et réessayez.', soon: 'La carte sera bientôt disponible.', foot: 'Prix nets en euros, service compris.', top: 'Revenir en haut', lang: 'Langue' },
    en: { tagline: 'Méribel · Savoyard restaurant · Pizzeria · Crêperie', legend: 'Symbols', veg: 'Vegetarian', gf: 'Gluten free', new: 'New', coeur: 'Our favourite', updated: 'Menu updated on', loading: 'Loading the menu…', error: 'The menu could not be loaded. Please check your connection and try again.', soon: 'The menu will be available soon.', foot: 'Net prices in euros, service included.', top: 'Back to top', lang: 'Language' },
    it: { tagline: 'Méribel · Ristorante savoiardo · Pizzeria · Crêperie', legend: 'Simboli', veg: 'Vegetariano', gf: 'Senza glutine', new: 'Novità', coeur: 'Il nostro preferito', updated: 'Menu aggiornato il', loading: 'Caricamento del menu…', error: 'Impossibile caricare il menu. Controlla la connessione e riprova.', soon: 'Il menu sarà presto disponibile.', foot: 'Prezzi netti in euro, servizio incluso.', top: 'Torna su', lang: 'Lingua' },
    de: { tagline: 'Méribel · Savoyardisches Restaurant · Pizzeria · Crêperie', legend: 'Symbole', veg: 'Vegetarisch', gf: 'Glutenfrei', new: 'Neu', coeur: 'Unser Favorit', updated: 'Speisekarte aktualisiert am', loading: 'Speisekarte wird geladen…', error: 'Die Speisekarte konnte nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen.', soon: 'Die Speisekarte ist bald verfügbar.', foot: 'Nettopreise in Euro, Service inbegriffen.', top: 'Nach oben', lang: 'Sprache' },
  };
  const MENU_LABELS = {
    carte: { fr: 'La carte', en: 'Menu', it: 'Menu', de: 'Speisekarte' },
    pizzas: { fr: 'Pizzas', en: 'Pizzas', it: 'Pizze', de: 'Pizzen' },
    'pizzas-en': { fr: 'Pizzas (EN)', en: 'Pizzas (EN)', it: 'Pizze (EN)', de: 'Pizzen (EN)' },
    emporter: { fr: 'Vente à emporter', en: 'Takeaway', it: 'Da asporto', de: 'Zum Mitnehmen' },
  };
  function ui(lang, key) { return (UI[lang] || UI.fr)[key] || UI.fr[key] || key; }
  function menuLabel(key, lang, fallback) { return (MENU_LABELS[key] || {})[lang] || fallback || key; }

  /* ---------- normalisation & casse ---------- */
  const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const isUpper = s => /[A-ZÀ-Þ]/.test(s) && s === s.toUpperCase();
  function fitCase(src, out) {
    if (!out) return out;
    if (isUpper(src)) return out.toUpperCase();
    return out;
  }

  /* ---------- mémoire de traduction ---------- */
  let memory = { en: {}, it: {}, de: {} };      // norm(fr) -> traduction
  let terms = { en: {}, it: {}, de: {} };       // norm(terme) -> traduction (ingrédients)
  let memoryReady = null;

  /* on préfère garder la version en casse normale (« Green salad ») à la
     version tout en capitales (« GREEN SALAD ») : on sait remettre en
     capitales, pas l'inverse (noms allemands !) */
  function keep(dict, k, v) {
    const cur = dict[k];
    if (!cur || (isUpper(cur) && !isUpper(v))) dict[k] = v;
  }
  function learn(lang, src, out) {
    if (!src || !out) return;
    keep(memory[lang], norm(src), out);
    /* alignement des listes « a, b, c » -> termes */
    const a = src.split(/\s*,\s*/), b = out.split(/\s*,\s*/);
    if (a.length > 1 && a.length === b.length) a.forEach((t, i) => keep(terms[lang], norm(t), b[i]));
  }

  function loadMemory(base) {
    if (memoryReady) return memoryReady;
    memoryReady = fetch((base || '') + 'i18n/glossaire.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : {})
      .then(g => { TARGETS.forEach(l => Object.entries((g && g[l]) || {}).forEach(([k, v]) => learn(l, k, v))); })
      .catch(() => { /* hors ligne : on apprendra des cartes elles-mêmes */ });
    return memoryReady;
  }
  /* les traductions déjà présentes dans une carte enrichissent la mémoire */
  function learnFromBlocks(blocks) {
    (blocks || []).forEach(b => {
      if (!b.tr || !b.tr.src) return;
      TARGETS.forEach(l => fieldsOf(b).forEach(f => {
        const t = b.tr[l] && b.tr[l][f];
        if (t && b.tr.src[l] && b.tr.src[l][f] === b[f]) learn(l, b[f], t);
      }));
    });
  }

  /* casse d'un terme recomposé : comme le terme français (MAJUSCULES, Capitale, minuscule) */
  function likeCase(t, frPart, lang) {
    if (!t) return t;
    if (isUpper(frPart)) return t.toUpperCase();
    /* terme connu seulement en capitales : en allemand chaque mot garde sa majuscule */
    if (isUpper(t) && lang === 'de') return t.toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, c) => a + c.toUpperCase());
    let x = isUpper(t) ? t.toLowerCase() : t;
    if (lang === 'de') return x.charAt(0).toUpperCase() + x.slice(1);
    const cap = /^[A-ZÀ-Þ]/.test(frPart);
    return cap ? x.charAt(0).toUpperCase() + x.slice(1) : x.charAt(0).toLowerCase() + x.slice(1);
  }
  function fromMemory(src, lang) {
    const hit = memory[lang][norm(src)];
    if (hit) return fitCase(src, hit);
    const parts = src.split(/\s*,\s*/);
    if (parts.length > 1) {
      const out = parts.map(p => memory[lang][norm(p)] || terms[lang][norm(p)]);
      if (out.every(Boolean)) return out.map((t, i) => likeCase(t, parts[i], lang)).join(', ');
    }
    return null;
  }

  /* ---------- services en ligne (dernier recours) ---------- */
  async function online(src, lang) {
    const q = encodeURIComponent(src);
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${q}`);
      if (r.ok) {
        const j = await r.json();
        const t = (j[0] || []).map(x => x[0]).join('');
        if (t) return t;
      }
    } catch (e) { /* service suivant */ }
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${q}&langpair=fr|${lang}`);
      if (r.ok) {
        const j = await r.json();
        const t = j && j.responseData && j.responseData.translatedText;
        if (j.responseStatus === 200 && t && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return t;
      }
    } catch (e) { /* hors ligne */ }
    return null;
  }

  async function translateText(src, lang) {
    if (!src || !/[A-Za-zÀ-ÿ]/.test(src)) return src;
    await loadMemory();
    const m = fromMemory(src, lang);
    if (m) return m;
    /* balises <br> du titre d'affiche : traduites ligne à ligne */
    if (/<br\s*\/?>/i.test(src)) {
      const lines = await Promise.all(src.split(/<br\s*\/?>/i).map(l => translateText(l, lang)));
      return lines.every(x => x != null) ? lines.join('<br>') : null;
    }
    /* liste d'ingrédients en partie connue : on ne demande en ligne que les
       termes inconnus (la traduction relue des autres est conservée) */
    const parts = src.split(/\s*,\s*/);
    if (parts.length > 1) {
      const known = parts.map(x => memory[lang][norm(x)] || terms[lang][norm(x)]);
      if (known.filter(Boolean).length >= Math.ceil(parts.length / 2)) {
        const outParts = [];
        for (let i = 0; i < parts.length; i++) {
          const k = known[i] || await online(parts[i], lang);
          if (!known[i]) lastWasOnline = true;
          if (!k) return null;
          outParts.push(likeCase(k, parts[i], lang));
        }
        const out = fitCase(src, outParts.join(', '));
        learn(lang, src, out);
        return out;
      }
    }
    const t = await online(src, lang);
    if (t) { const out = fitCase(src, t); learn(lang, src, out); lastWasOnline = true; return out; }
    return null;
  }
  let lastWasOnline = false;

  /* ---------- état des traductions d'un bloc ----------
     tr.src[lang][champ] = le texte français qui a servi à traduire :
     s'il diffère du français actuel, la traduction est à refaire. */
  function isStale(blk, lang, f) {
    const src = blk[f];
    if (src == null || src === '' || !/[A-Za-zÀ-ÿ]/.test(src)) return false;
    const tr = blk.tr;
    if (!tr || !tr[lang] || tr[lang][f] == null || tr[lang][f] === '') return true;
    return !tr.src || !tr.src[lang] || tr.src[lang][f] !== src;
  }
  function pending(blocks) {
    const out = [];
    (blocks || []).forEach(b => fieldsOf(b).forEach(f => TARGETS.forEach(l => { if (isStale(b, l, f)) out.push([b, l, f]); })));
    return out;
  }
  function store(blk, lang, f, value, src) {
    blk.tr = blk.tr || {};
    blk.tr[lang] = blk.tr[lang] || {};
    blk.tr[lang][f] = value;
    blk.tr.src = blk.tr.src || {};
    blk.tr.src[lang] = blk.tr.src[lang] || {};
    blk.tr.src[lang][f] = src;
  }

  /* Traduit tout ce qui manque ou n'est plus à jour. onProgress(fait, total). */
  async function translateBlocks(blocks, onProgress) {
    await loadMemory();
    learnFromBlocks(blocks);
    const todo = pending(blocks);
    let done = 0, failed = 0;
    for (const [b, l, f] of todo) {
      const src = b[f];
      lastWasOnline = false;
      const t = await translateText(src, l);
      if (t != null && b[f] === src) {          // le texte n'a pas rechangé entre-temps
        store(b, l, f, t, src);
        if (b.tr.manual && b.tr.manual[l]) delete b.tr.manual[l][f];
        /* traduite par un service en ligne : à relire */
        b.tr.auto = b.tr.auto || {}; b.tr.auto[l] = b.tr.auto[l] || {};
        if (lastWasOnline) b.tr.auto[l][f] = true; else delete b.tr.auto[l][f];
      } else if (t == null) failed++;
      done++;
      if (onProgress) onProgress(done, todo.length);
    }
    return { total: todo.length, failed };
  }

  /* Correction manuelle d'une traduction (dans l'éditeur, vue IT par ex.) */
  function setManual(blk, lang, f, value) {
    store(blk, lang, f, value, blk[f]);
    if (blk.tr.auto && blk.tr.auto[lang]) delete blk.tr.auto[lang][f];
    blk.tr.manual = blk.tr.manual || {};
    blk.tr.manual[lang] = blk.tr.manual[lang] || {};
    blk.tr.manual[lang][f] = true;
    learn(lang, blk[f], value);
  }

  /* ---------- affichage dans une langue ---------- */
  /* Renvoie une copie du bloc avec les textes de la langue demandée.
     En français : le bloc tel quel (carte bilingue FR + ligne anglaise).
     Dans une autre langue : carte monolingue (la ligne de traduction
     anglaise et les sous-lignes « traduction » disparaissent). */
  function view(blk, lang) {
    if (!lang || lang === 'fr') {
      /* carte bilingue : on imprime l'anglais corrigé quand il existe */
      if (blk.type === 'item' && blk.en && blk.tr && blk.tr.en && blk.tr.en.en && !blk.enAuto && !isStale(blk, 'en', 'en')) return Object.assign({}, blk, { en: blk.tr.en.en });
      return blk;
    }
    const v = Object.assign({}, blk);
    const tr = (blk.tr && blk.tr[lang]) || {};
    fieldsOf(blk).forEach(f => { if (tr[f] != null && tr[f] !== '') v[f] = tr[f]; });
    if (blk.type === 'item') {
      /* La ligne anglaise imprimée décrit tout le plat : à l'étranger, sa
         traduction sert de description (rien ne se perd). Si le français a
         été modifié depuis (enAuto), on prend la traduction du français. */
      if (blk.en && !blk.enAuto && tr.en) { v.desc = tr.en; v.sub = ''; }
      v.en = '';
      /* description qui ne faisait que traduire le nom (carte d'origine) : doublon */
      ['desc', 'sub'].forEach(f => { if (v[f] && v.fr && norm(v.fr).includes(norm(v[f]))) v[f] = ''; });
    }
    if (blk.type === 'line' && blk.variant === 'sub') v.__skip = true;
    /* drapeau de la carte : celui de la langue affichée */
    if (blk.type === 'image' && /assets\/flag-(fr|gb|en|it|de)\.svg/.test(blk.src || '')) v.src = blk.src.replace(/flag-(fr|gb|en|it|de)\.svg/, 'flag-' + (lang === 'en' ? 'gb' : lang) + '.svg');
    if (blk.type === 'note' && blk.italic && /\b(people|price|minimum)\b/i.test(blk.text || '')) v.__skip = true;
    return v;
  }
  function isTranslatable(blk, f) { return fieldsOf(blk).includes(f); }
  /* textes traduits par machine et pas encore relus */
  function toReview(blocks, lang) {
    const out = [];
    (blocks || []).forEach(b => { const a = b.tr && b.tr.auto; TARGETS.forEach(l => { if ((!lang || l === lang) && a && a[l]) Object.keys(a[l]).forEach(f => { if (a[l][f] && b[f]) out.push([b, l, f]); }); }); });
    return out;
  }
  function markReviewed(blocks, lang) { toReview(blocks, lang).forEach(([b, l, f]) => { delete b.tr.auto[l][f]; }); }
  /* le champ affiché à cet endroit (vue étrangère) est-il à relire ? */
  function isAuto(blk, lang, f) {
    const a = blk.tr && blk.tr.auto && blk.tr.auto[lang];
    if (!a) return false;
    if (f === 'desc' && blk.type === 'item' && blk.en && !blk.enAuto) return !!a.en;
    return !!a[f];
  }
  /* champ réellement modifié quand on corrige la description à l'étranger */
  function sourceField(blk, f) { return (f === 'desc' && blk.type === 'item' && blk.en && !blk.enAuto) ? 'en' : f; }

  /* prix affichés aux clients : format français « 10,00 € » */
  function price(p) {
    if (!p) return p;
    const m = String(p).match(/^\s*(\d+)(?:[.,](\d{1,2}))?\s*€?\s*$/);
    if (!m) return String(p).replace(/(\d)\.(\d\d)/g, '$1,$2').replace(/\s*€/g, ' €');
    return m[1] + ',' + ((m[2] || '') + '00').slice(0, 2) + ' €';
  }

  /* ---------- langue préférée du visiteur ---------- */
  function preferred(param) {
    const q = new URLSearchParams(location.search).get(param || 'lang');
    if (LANGS.some(l => l.code === q)) return q;
    try { const s = localStorage.getItem('carte_lang'); if (LANGS.some(l => l.code === s)) return s; } catch (e) { }
    const n = (navigator.language || 'fr').slice(0, 2).toLowerCase();
    return LANGS.some(l => l.code === n) ? n : 'fr';
  }
  function remember(lang) { try { localStorage.setItem('carte_lang', lang); } catch (e) { } }

  global.CarteI18n = {
    LANGS, TARGETS, FIELDS, fieldsOf, ui, menuLabel, view, isTranslatable, toReview, markReviewed, isAuto, sourceField, price,
    translateText, translateBlocks, pending, isStale, setManual, store, loadMemory, learnFromBlocks,
    preferred, remember, norm,
  };
})(window);
