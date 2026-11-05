/* ============================================================
   Générateur PDF VECTORIEL — un clic, aucun dialogue.

   Principe : c'est LE NAVIGATEUR qui calcule la mise en page (comme à
   l'écran) ; on se contente de relever les positions déjà calculées
   (Range.getClientRects) et d'écrire le même texte, avec la même
   police, aux mêmes coordonnées, dans le PDF.

   C'est la différence avec html2canvas, qui re-mesure lui-même chaque
   fragment de texte — mesures que Safari fausse (mots collés, puis
   interlettrage irrégulier). Ici aucune mesure n'est refaite : on
   copie celles de l'affichage. Le résultat est donc identique à
   l'écran, dans tous les navigateurs.

   Sortie : texte vectoriel (net à toute échelle, sélectionnable),
   fichier ~10× plus léger qu'une capture image.
   ============================================================ */

(function (global) {

  /* 1 px CSS = 1/96 pouce en A4 ; en grand format (affiche dessinée à
     échelle réduite à l'écran) l'échelle est recalculée à chaque page
     pour que le PDF sorte aux dimensions réelles. */
  let PX2MM = 25.4 / 96;
  const FONT_DIR = 'assets/fonts/';

  /* Polices embarquées : famille CSS + graisse + style -> fichier.
     (sous-ensemble latin, licence SIL OFL — voir assets/fonts/OFL.txt) */
  const FONTS = [
    { file: 'Arimo-Regular.ttf', name: 'Arimo', style: 'normal', weight: 'normal' },
    { file: 'Arimo-Italic.ttf', name: 'Arimo', style: 'italic', weight: 'normal' },
    { file: 'Arimo-Bold.ttf', name: 'Arimo', style: 'normal', weight: 'bold' },
    { file: 'Jost-Regular.ttf', name: 'Jost', style: 'normal', weight: 'normal' },
    { file: 'Jost-Italic.ttf', name: 'Jost', style: 'italic', weight: 'normal' },
    { file: 'Jost-Medium.ttf', name: 'Jost', style: 'normal', weight: 'semibold' },
    { file: 'Jost-SemiBold.ttf', name: 'Jost', style: 'normal', weight: 'bold' },
    { file: 'Montserrat-Regular.ttf', name: 'Montserrat', style: 'normal', weight: 'normal' },
    { file: 'Montserrat-Italic.ttf', name: 'Montserrat', style: 'italic', weight: 'normal' },
    { file: 'Montserrat-Medium.ttf', name: 'Montserrat', style: 'normal', weight: 'semibold' },
    { file: 'Montserrat-Bold.ttf', name: 'Montserrat', style: 'normal', weight: 'bold' },
    { file: 'Poppins-Regular.ttf', name: 'Poppins', style: 'normal', weight: 'normal' },
    { file: 'Poppins-Italic.ttf', name: 'Poppins', style: 'italic', weight: 'normal' },
    { file: 'Poppins-SemiBold.ttf', name: 'Poppins', style: 'normal', weight: 'semibold' },
    { file: 'Poppins-Bold.ttf', name: 'Poppins', style: 'normal', weight: 'bold' },
    { file: 'PlayfairDisplay-Bold.ttf', name: 'Playfair Display', style: 'normal', weight: 'bold' },
    { file: 'PlayfairDisplay-ExtraBold.ttf', name: 'Playfair Display', style: 'normal', weight: 'extrabold' },
    { file: 'CormorantGaramond-SemiBold.ttf', name: 'Cormorant Garamond', style: 'normal', weight: 'semibold' },
    { file: 'CormorantGaramond-Bold.ttf', name: 'Cormorant Garamond', style: 'normal', weight: 'bold' },
    { file: 'Fraunces-SemiBold.ttf', name: 'Fraunces', style: 'normal', weight: 'semibold' },
    { file: 'Fraunces-Italic.ttf', name: 'Fraunces', style: 'italic', weight: 'semibold' },
  ];

  let fontCache = null;                 // { file: base64 } — chargé une fois

  async function loadFonts() {
    if (fontCache) return fontCache;
    const out = {};
    await Promise.all(FONTS.map(async f => {
      const res = await fetch(FONT_DIR + f.file);
      if (!res.ok) throw new Error('Police introuvable : ' + f.file);
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 8192) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      }
      out[f.file] = btoa(bin);
    }));
    fontCache = out;
    return out;
  }

  function registerFonts(pdf, b64) {
    FONTS.forEach(f => {
      pdf.addFileToVFS(f.file, b64[f.file]);
      pdf.addFont(f.file, f.name, f.style, f.weight);
    });
  }

  /* Graisse CSS (100-900 ou mot-clé) -> graisse déclarée à jsPDF. */
  function pickWeight(family, cssWeight) {
    const w = parseInt(cssWeight, 10) || (cssWeight === 'bold' ? 700 : 400);
    if (family === 'Playfair Display') return w >= 800 ? 'extrabold' : 'bold';
    if (family === 'Cormorant Garamond') return w >= 700 ? 'bold' : 'semibold';
    if (family === 'Fraunces') return 'semibold';
    if (family === 'Jost') return w >= 600 ? 'bold' : (w >= 500 ? 'semibold' : 'normal');
    if (family === 'Arimo') return w >= 600 ? 'bold' : 'normal';
    if (family === 'Montserrat') return w >= 600 ? 'bold' : (w >= 500 ? 'semibold' : 'normal');
    if (w >= 700) return 'bold';
    if (w >= 500) return 'semibold';
    return 'normal';
  }

  function familyOf(cs) {
    const first = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    return FONTS.some(f => f.name === first) ? first : 'Arimo';
  }


  /* La combinaison demandee (famille + style + graisse) n'existe pas
     toujours — un texte italique en demi-gras, par exemple. Sans
     repli, jsPDF abandonne la police embarquee et retombe sur une
     police generique. On degrade proprement : meme style d'abord,
     puis graisse normale. */
  function resolveFont(family, style, weight) {
    const has = (st, w) => FONTS.some(f => f.name === family && f.style === st && f.weight === w);
    if (has(style, weight)) return [style, weight];
    if (has(style, 'normal')) return [style, 'normal'];
    if (has('normal', weight)) return ['normal', weight];
    const any = FONTS.find(f => f.name === family);
    return any ? [any.style, any.weight] : ['normal', 'normal'];
  }

  function rgb(str) {
    const m = (str || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const p = m[1].split(',').map(s => parseFloat(s));
    return { r: p[0] | 0, g: p[1] | 0, b: p[2] | 0, a: p.length > 3 ? p[3] : 1 };
  }

  const isSkipped = (el) =>
    el.classList.contains('row-controls') ||
    el.classList.contains('page-label') ||
    el.classList.contains('page-overflow-warning') ||
    el.classList.contains('holder-guide') ||
    el.classList.contains('arche-guide') ||
    el.classList.contains('hidden-badge') ||
    el.classList.contains('blk-pagebreak') ||
    el.classList.contains('blk-marker') ||
    el.classList.contains('insert-bar') ||
    el.classList.contains('is-hidden');

  /* ---------- Découpe d'un nœud texte en lignes RENDUES ----------
     Le navigateur a déjà décidé où couper les lignes ; on relève ce
     découpage au lieu de le recalculer. */
  function textLines(node) {
    const txt = node.textContent;
    if (!txt.trim()) return [];
    const range = document.createRange();
    const lines = [];
    let cur = null;

    for (let i = 0; i < txt.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (!r || r.width === 0 && txt[i] === ' ') {
        if (cur) cur.text += txt[i];       // espace en fin de ligne
        continue;
      }
      /* nouvelle ligne visuelle si le haut change nettement */
      if (!cur || Math.abs(r.top - cur.top) > 1) {
        cur = { text: txt[i], left: r.left, right: r.right, rightTrim: r.right, top: r.top, bottom: r.bottom };
        lines.push(cur);
      } else {
        cur.text += txt[i];
        cur.right = Math.max(cur.right, r.right);
        /* fin du dernier caractere visible : les espaces de fin ne
           comptent pas dans la largeur du texte reellement ecrit */
        if (txt[i].trim()) cur.rightTrim = r.right;
        cur.bottom = Math.max(cur.bottom, r.bottom);
      }
    }
    return lines.filter(l => l.text.trim());
  }

  /* ---------- Ligne de base exacte ----------
     jsPDF écrit depuis la ligne de base ; le navigateur nous donne le
     haut de la ligne. On mesure l'écart pour de bon (au lieu de
     l'estimer) : un repère invisible aligné sur la baseline est inséré
     puis aussitôt retiré. Mis en cache par style, donc une poignée de
     mesures pour toute la carte. */
  const baselineCache = new Map();

  /* firstLineTop : haut de la première ligne de TEXTE (et non du bloc,
     qui inclurait marge, bordure et interligne). C'est le même
     référentiel que les lignes relevées, donc l'écart est réutilisable
     tel quel. */
  function baselineOffset(el, cs, firstLineTop) {
    const key = `${cs.fontFamily}|${cs.fontSize}|${cs.fontWeight}|${cs.fontStyle}|${cs.lineHeight}`;
    if (baselineCache.has(key)) return baselineCache.get(key);
    /* Mesure sur un témoin hors flux, avec la même police : insérer le
       repère dans le texte lui-même pouvait le faire passer à la ligne
       (texte en bout de ligne) et décaler toute la mesure d'une ligne. */
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:-9999px;top:0;white-space:nowrap;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};line-height:${cs.lineHeight};letter-spacing:0;`;
    const txt = document.createTextNode('Hxg');
    const mark = document.createElement('span');
    mark.style.cssText = 'display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;';
    probe.appendChild(txt); probe.appendChild(mark);
    document.body.appendChild(probe);
    const range = document.createRange();
    range.setStart(txt, 0); range.setEnd(txt, 1);
    const r = range.getClientRects()[0];
    const mr = mark.getBoundingClientRect();
    const off = r && mr ? mr.top - r.top : parseFloat(cs.fontSize) * 0.79;
    probe.remove();
    baselineCache.set(key, off);
    return off;
  }

  /* ---------- Images (logo, QR, pictos) ----------
     Rasterisées telles quelles : elles ne contiennent pas de texte,
     donc aucun risque de mesure faussée. La rotation éventuelle (le
     médaillon du logo est incliné) et le cadrage « contain » sont
     reproduits ici, pour occuper exactement la même empreinte qu'à
     l'écran. */
  async function imageData(img, rect) {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return null;
    const cs = getComputedStyle(img);

    /* taille de mise en page AVANT transformation */
    const w0 = img.offsetWidth || rect.width;
    const h0 = img.offsetHeight || rect.height;

    /* cadrage : « contain » laisse des marges, « fill » étire */
    let dw = w0, dh = h0;
    let src = [0, 0, nw, nh];                 // portion de l'image source dessinée
    if (cs.objectFit === 'contain') {
      const k = Math.min(w0 / nw, h0 / nh);
      dw = nw * k; dh = nh * k;
    } else if (cs.objectFit === 'cover') {
      /* « cover » : la photo remplit le cadre et déborde ; le point de cadrage
         (object-position, ex. « 50% 30% ») est respecté comme à l'écran */
      const k = Math.max(w0 / nw, h0 / nh);
      const sw = w0 / k, sh = h0 / k;
      const pos = (cs.objectPosition || '50% 50%').split(/\s+/).map(v => /%$/.test(v) ? parseFloat(v) / 100 : 0.5);
      const fx = isNaN(pos[0]) ? 0.5 : pos[0], fy = isNaN(pos[1]) ? 0.5 : pos[1];
      src = [(nw - sw) * fx, (nh - sh) * fy, sw, sh];
    }

    /* matrice CSS (rotation du médaillon, etc.) */
    let m = [1, 0, 0, 1];
    const tr = cs.transform;
    if (tr && tr !== 'none') {
      const nums = tr.match(/matrix\(([^)]+)\)/);
      if (nums) {
        const p = nums[1].split(',').map(parseFloat);
        m = [p[0], p[1], p[2], p[3]];
      }
    }

    /* résolution visée : 300 dpi à la taille imprimée (3000 px au plus),
       au moins 2× l'écran — l'affiche 46×66 n'est plus floue */
    const printPx = Math.max(rect.width, rect.height) * PX2MM / 25.4 * 300;
    const scale = Math.min(8, Math.max(2, Math.min(3000, printPx) / Math.max(rect.width, rect.height)));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(rect.width * scale));
    c.height = Math.max(1, Math.round(rect.height * scale));
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(rect.width / 2, rect.height / 2);          // centre de l'empreinte
    ctx.transform(m[0], m[1], m[2], m[3], 0, 0);             // même rotation qu'à l'écran
    if (cs.objectFit === 'cover') ctx.drawImage(img, src[0], src[1], src[2], src[3], -dw / 2, -dh / 2, dw, dh);
    else ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    /* photos (JPEG, sans transparence) : restent en JPEG, sinon le PDF gonfle */
    const opaque = /\.jpe?g(\?|$)/i.test(img.src || '');
    if (opaque) {
      const c2 = document.createElement('canvas');
      c2.width = c.width; c2.height = c.height;
      const k2 = c2.getContext('2d');
      k2.fillStyle = '#fff'; k2.fillRect(0, 0, c2.width, c2.height); k2.drawImage(c, 0, 0);
      try { return c2.toDataURL('image/jpeg', 0.9); } catch (e) { return null; }
    }
    try { return c.toDataURL('image/png'); } catch (e) { return null; }
  }

  /* ---------- Images de fond (ornements du thème Vigne) ---------- */
  const bgImgCache = new Map();
  const rasterCache = new Map();

  function loadImage(url) {
    if (bgImgCache.has(url)) return bgImgCache.get(url);
    const p = new Promise(resolve => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    bgImgCache.set(url, p);
    return p;
  }

  function bgUrl(cs) {
    const m = (cs.backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : null;
  }

  /* Dessine une image de fond dans une boîte, façon
     « background-size: contain; background-position: center ». */
  async function drawBgImage(pdf, url, box, X, Y, stretch) {
    const im = await loadImage(url);
    if (!im || !im.naturalWidth) return;
    /* « background-size: 100% 100% » (bandeau du thème alpage) : l'image
       épouse la boîte ; sinon « contain », centrée */
    const k = Math.min(box.width / im.naturalWidth, box.height / im.naturalHeight);
    const w = stretch ? box.width : im.naturalWidth * k, h = stretch ? box.height : im.naturalHeight * k;
    const x = box.left + (box.width - w) / 2, y = box.top + (box.height - h) / 2;
    /* Un ornement revient à chaque section : on le rasterise une fois
       et jsPDF le réutilise via son alias (sinon le fichier gonfle). */
    const alias = url + '@' + Math.round(w) + 'x' + Math.round(h);
    let data = rasterCache.get(alias);
    if (!data) {
      const scale = Math.min(6, Math.max(3, 600 / Math.max(w, h)));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      data = c.toDataURL('image/png');
      rasterCache.set(alias, data);
    }
    try { pdf.addImage(data, 'PNG', X(x), Y(y), w * PX2MM, h * PX2MM, alias); }
    catch (e) { console.warn('Ornement ignoré', url, e); }
  }

  /* ---------- Pseudo-éléments décoratifs (::before / ::after) ----------
     Ils n'existent pas dans le DOM : on reconstitue leur boîte à partir
     de l'élément porteur. Deux cas servent ici : le cadre du thème
     Vigne (absolu, collé aux bords) et l'ornement sous les titres
     (bande en fin de bloc). */
  async function drawPseudo(pdf, el, which, X, Y) {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.display === 'none') return;
    const url = bgUrl(cs);
    const bg = rgb(cs.backgroundColor);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const ow = parseFloat(cs.outlineWidth) || 0;
    const hasOutline = ow > 0 && cs.outlineStyle !== 'none';
    if (!url && bg.a < 0.02 && !bw && !hasOutline) return;

    const host = el.getBoundingClientRect();
    let box;

    if (cs.position === 'absolute' || cs.position === 'fixed') {
      const t = parseFloat(cs.top) || 0, l = parseFloat(cs.left) || 0;
      const r = parseFloat(cs.right) || 0, b = parseFloat(cs.bottom) || 0;
      box = {
        left: host.left + l, top: host.top + t,
        width: host.width - l - r, height: host.height - t - b,
      };
    } else {
      /* bande en fin de flux (ornement sous un titre) */
      const h = parseFloat(cs.height) || 0;
      if (!h) return;
      const mb = parseFloat(cs.marginBottom) || 0;
      const maxW = parseFloat(cs.maxWidth);
      const padL = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      const padR = parseFloat(getComputedStyle(el).paddingRight) || 0;
      const availW = host.width - padL - padR;
      const w = isNaN(maxW) ? availW : Math.min(maxW, availW);
      box = {
        left: host.left + padL + (availW - w) / 2,
        top: host.bottom - mb - h,
        width: w, height: h,
      };
    }
    if (box.width <= 0 || box.height <= 0) return;

    if (bg.a > 0.02) {
      pdf.setFillColor(bg.r, bg.g, bg.b);
      pdf.rect(X(box.left), Y(box.top), box.width * PX2MM, box.height * PX2MM, 'F');
    }
    if (bw > 0 && cs.borderTopStyle !== 'none') {
      const c = rgb(cs.borderTopColor);
      pdf.setDrawColor(c.r, c.g, c.b);
      pdf.setLineWidth(bw * PX2MM);
      pdf.rect(X(box.left) + bw * PX2MM / 2, Y(box.top) + bw * PX2MM / 2,
        (box.width - bw) * PX2MM, (box.height - bw) * PX2MM, 'S');
    }
    if (hasOutline) {
      const c = rgb(cs.outlineColor);
      const off = (parseFloat(cs.outlineOffset) || 0) + ow / 2;
      pdf.setDrawColor(c.r, c.g, c.b);
      pdf.setLineWidth(ow * PX2MM);
      pdf.rect(X(box.left - off), Y(box.top - off),
        (box.width + off * 2) * PX2MM, (box.height + off * 2) * PX2MM, 'S');
    }
    if (url) await drawBgImage(pdf, url, box, X, Y, /^100% 100%$/.test(cs.backgroundSize || ''));
  }

  /* ---------- Rendu d'une page ---------- */
  let pageMm = [210, 297];
  const imgCache = new Map();
  async function renderPage(pdf, pageEl) {
    const base = pageEl.getBoundingClientRect();
    PX2MM = pageMm[0] / base.width;
    const X = px => (px - base.left) * PX2MM;
    const Y = px => (px - base.top) * PX2MM;

    /* 1. Fond de page : toute la feuille, au millimètre près. (La page
       d'écran est arrondie au pixel : en grand format, sa hauteur
       ramenée en mm peut manquer de 0,2 mm, et un filet blanc
       apparaîtrait au bord d'une affiche à fond noir.) */
    const pageBg = rgb(getComputedStyle(pageEl).backgroundColor);
    if (pageBg.a > 0) {
      pdf.setFillColor(pageBg.r, pageBg.g, pageBg.b);
      pdf.rect(0, 0, Math.max(pageMm[0], base.width * PX2MM), Math.max(pageMm[1], base.height * PX2MM), 'F');
    }

    /* 2. Fonds, filets et images, dans l'ordre du document */
    const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_ELEMENT, {
      acceptNode: el => isSkipped(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const images = [];
    const deferred = [];                       // ornements, à dessiner après
    /* le cadre du thème Vigne est porté par la page elle-même */
    deferred.push(() => drawPseudo(pdf, pageEl, '::before', X, Y));
    deferred.push(() => drawPseudo(pdf, pageEl, '::after', X, Y));

    let el;
    while ((el = walker.nextNode())) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      /* image de fond (séparateur « grappe » du thème Vigne).
         « el » est réassigné à chaque tour : on fige l'élément
         courant, sinon les tâches différées le verraient à null. */
      const cur = el, curRect = r;
      const bgi = bgUrl(cs);
      if (bgi) deferred.push(() => drawBgImage(pdf, bgi, curRect, X, Y));
      deferred.push(() => drawPseudo(pdf, cur, '::before', X, Y));
      deferred.push(() => drawPseudo(pdf, cur, '::after', X, Y));

      const bg = rgb(cs.backgroundColor);
      if (bg.a > 0.02 && el !== pageEl) {
        pdf.setFillColor(bg.r, bg.g, bg.b);
        const rad = parseFloat(cs.borderRadius) || 0;
        if (rad > 0) pdf.roundedRect(X(r.left), Y(r.top), r.width * PX2MM, r.height * PX2MM, rad * PX2MM, rad * PX2MM, 'F');
        else pdf.rect(X(r.left), Y(r.top), r.width * PX2MM, r.height * PX2MM, 'F');
      }

      /* Bordures (filets de section, pointillés plat→prix) */
      [['Top', r.top, r.top], ['Bottom', r.bottom, r.bottom],
       ['Left', r.left, r.left], ['Right', r.right, r.right]].forEach(([side, a]) => {
        const w = parseFloat(cs['border' + side + 'Width']);
        const style = cs['border' + side + 'Style'];
        if (!w || style === 'none' || style === 'hidden') return;
        const c = rgb(cs['border' + side + 'Color']);
        if (c.a < 0.02) return;
        pdf.setDrawColor(c.r, c.g, c.b);
        pdf.setLineWidth(w * PX2MM);
        pdf.setLineDashPattern(style === 'dotted' ? [w * PX2MM, w * 2 * PX2MM]
          : style === 'dashed' ? [w * 3 * PX2MM, w * 2 * PX2MM] : [], 0);
        if (side === 'Top' || side === 'Bottom') {
          const y = Y(a) + (side === 'Bottom' ? -w * PX2MM / 2 : w * PX2MM / 2);
          pdf.line(X(r.left), y, X(r.right), y);
        } else {
          const x = X(a) + (side === 'Right' ? -w * PX2MM / 2 : w * PX2MM / 2);
          pdf.line(x, Y(r.top), x, Y(r.bottom));
        }
        pdf.setLineDashPattern([], 0);
      });

      if (el.tagName === 'IMG') images.push({ el, r });
    }

    for (const task of deferred) await task();

    for (const { el, r } of images) {
      /* même image, même taille (logo répété sur chaque page) : un seul
         exemplaire dans le fichier, réutilisé via son alias */
      const alias = (el.src || '').slice(-120) + '@' + Math.round(r.width) + 'x' + Math.round(r.height);
      const data = imgCache.get(alias) || await imageData(el, r);
      if (data) {
        imgCache.set(alias, data);
        const fmtImg = data.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
        try { pdf.addImage(data, fmtImg, X(r.left), Y(r.top), r.width * PX2MM, r.height * PX2MM, alias); }
        catch (e) { console.warn('Image ignorée', el.src, e); }
      }
    }

    /* 3. Texte — positions relevées, jamais recalculées */
    const tw = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        if (!n.textContent.trim()) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentElement; p && p !== pageEl.parentElement; p = p.parentElement) {
          if (isSkipped(p)) return NodeFilter.FILTER_REJECT;
          const cs = getComputedStyle(p);
          if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = tw.nextNode())) {
      const parent = node.parentElement;
      const cs = getComputedStyle(parent);
      const fam = familyOf(cs);
      const weight = pickWeight(fam, cs.fontWeight);
      const style = cs.fontStyle === 'italic' ? 'italic' : 'normal';
      const size = parseFloat(cs.fontSize);
      const col = rgb(cs.color);
      const deco = cs.textDecorationLine || '';

      const [fStyle, fWeight] = resolveFont(fam, style, weight);
      pdf.setFont(fam, fStyle, fWeight);
      pdf.setFontSize(size * PX2MM * 72 / 25.4);   // px CSS -> points PDF
      pdf.setTextColor(col.r, col.g, col.b);

      /* Espacement des lettres de la charte (letter-spacing) : sans
         lui le texte dérive vers la droite, de plus en plus au fil de
         la ligne. */
      const ls = parseFloat(cs.letterSpacing);
      const charSpace = isNaN(ls) ? 0 : ls * PX2MM;

      const lines = textLines(node);
      if (!lines.length) continue;
      const bOff = baselineOffset(parent, cs, lines[0].top);

      for (const line of lines) {
        /* majuscules / minuscules imposées par le style (text-transform) :
           à l'écran le navigateur les applique, ici on doit le faire */
        let text = line.text.replace(/\s+$/, '');
        const tt = cs.textTransform;
        if (tt === 'uppercase') text = text.toUpperCase();
        else if (tt === 'lowercase') text = text.toLowerCase();
        else if (tt === 'capitalize') text = text.replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toUpperCase());
        if (!text) continue;

        /* Chaque ligne doit occuper EXACTEMENT la largeur qu'elle a à
           l'écran. On compare la largeur mesurée à celle que donnerait
           la police embarquée et on répartit l'écart entre les
           caractères : les micro-différences de chasse entre la police
           du navigateur et celle du PDF ne peuvent plus décaler la
           suite de la ligne. */
        let cs2 = charSpace;
        const wScreen = ((line.rightTrim || line.right) - line.left) * PX2MM;
        if (text.length > 1 && wScreen > 0) {
          const wPdf = pdf.getTextWidth(text) + charSpace * text.length;
          const fix = (wScreen - wPdf) / text.length;
          /* garde-fou : on corrige des écarts fins, pas une police
             manquante (repli sur une substitution très différente) */
          if (Math.abs(fix) < parseFloat(cs.fontSize) * PX2MM * 0.25) cs2 = charSpace + fix;
        }
        pdf.text(text, X(line.left), Y(line.top + bOff), { baseline: 'alphabetic', charSpace: cs2 });
        if (deco.includes('line-through')) {
          const y = Y((line.top + line.bottom) / 2);
          pdf.setDrawColor(col.r, col.g, col.b);
          pdf.setLineWidth(Math.max(0.2, size * 0.06 * PX2MM));
          pdf.line(X(line.left), y, X(line.left) + pdf.getTextWidth(text), y);
        }
      }
    }
  }

  /* ---------- Point d'entrée ---------- */
  async function exportVectorPdf(opts) {
    const st = (window.__CARTE_STATE__ || {}).style || {};
    const H = window.__CARTE_HELPERS__;
    const fmt = H.PAGE_FORMATS[st.format] || H.PAGE_FORMATS.a4;
    const [wMm, hMm] = fmt.mm;
    pageMm = fmt.mm;
    const orientation = wMm > hMm ? 'landscape' : 'portrait';

    const b64 = await loadFonts();
    if (opts && opts.onStep) opts.onStep('mise en page');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation, unit: 'mm', format: [wMm, hMm], compress: true });
    registerFonts(pdf, b64);

    /* Dimensions exactes garanties le temps du relevé (la vue mobile
       écraserait sinon largeur et marges). */
    document.body.classList.add('exporting');
    try {
      try { await document.fonts.ready; } catch (_) { }
      document.body.offsetHeight;
      await new Promise(r => setTimeout(r, 250));

      const pages = document.querySelectorAll('.pdf-page');
      for (let i = 0; i < pages.length; i++) {
        if (opts && opts.onStep) opts.onStep(`page ${i + 1}/${pages.length}`);
        if (i > 0) pdf.addPage([wMm, hMm], orientation);
        await renderPage(pdf, pages[i]);
      }
    } finally {
      document.body.classList.remove('exporting');
    }
    return pdf;
  }

  global.CartePdfVector = { exportVectorPdf, loadFonts };

})(window);
