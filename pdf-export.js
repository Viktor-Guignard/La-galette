/* Export PDF — un clic, aucun dialogue.

   Le PDF est fabriqué par pdf-vector.js : le navigateur calcule la
   mise en page (comme à l'écran), on relève les positions obtenues et
   on écrit le même texte, avec la même police, au même endroit.

   Historique : html2canvas re-mesurait lui-même chaque fragment de
   texte, et Safari fausse ces mesures (mots collés, puis interlettrage
   irrégulier). Cette capture image reste accessible en secours via
   window.__exportPdfImage(). */

const EXPORT_VERSION = 'v26';

const XP_S = () => window.__CARTE_STATE__;
const XP_H = () => window.__CARTE_HELPERS__;

/* Mode « pages seules » (?print=1) : pratique pour vérifier le rendu. */
if (new URLSearchParams(location.search).has('print')) {
  document.body.classList.add('exporting', 'print-mode');
}

function exportFilename(suffix) {
  const slug = window.currentMenuSlug ? window.currentMenuSlug() : 'carte';
  return `${slug}${suffix || ''}_${EXPORT_VERSION}_${GHUB.timestampSuffix()}.pdf`;
}

async function exportPdf() {
  const btn = document.getElementById('exportPdfBtn');
  if (document.querySelectorAll('.pdf-page').length === 0) return;
  document.querySelectorAll('[contenteditable="true"]').forEach(el => el.blur());

  const overflowing = document.querySelectorAll('.pdf-page.overflowing').length;
  if (overflowing > 0 && !confirm('⚠️ ' + overflowing + ' page(s) débordent du format : le contenu en trop sera coupé dans le PDF. Exporter quand même ?')) {
    return;
  }

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = '⏳ Génération…';

  try {
    const pdf = await window.CartePdfVector.exportVectorPdf({
      onStep: s => { btn.textContent = '⏳ ' + s + '…'; },
    });
    const name = exportFilename();
    pdf.save(name);
    XP_H().toast('PDF téléchargé : ' + name);
  } catch (err) {
    console.error(err);
    XP_H().toast('Erreur PDF — nouvelle tentative en mode image…');
    try {
      await window.__exportPdfImage();
    } catch (e2) {
      console.error(e2);
      XP_H().toast('Export PDF impossible.');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* ---------- Secours : ancienne capture image ---------- */

window.__exportPdfImage = async function () {
  const pages = document.querySelectorAll('.pdf-page');
  const { jsPDF } = window.jspdf;
  const st = XP_S().style || {};
  const fmt = XP_H().PAGE_FORMATS[st.format] || XP_H().PAGE_FORMATS.a4;
  const [wMm, hMm] = fmt.mm;
  const orientation = wMm > hMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [wMm, hMm] });
  document.body.classList.add('exporting');
  try {
    try { await document.fonts.ready; } catch (_) { }
    document.body.offsetHeight;
    await new Promise(r => setTimeout(r, 300));
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2.5, backgroundColor: st.pageBg || '#ffffff', useCORS: true,
        width: fmt.w, height: fmt.h,
        windowWidth: Math.max(document.documentElement.clientWidth, fmt.w + 40),
        windowHeight: Math.max(document.documentElement.clientHeight, fmt.h + 40),
        scrollX: 0, scrollY: 0,
      });
      if (i > 0) pdf.addPage([wMm, hMm], orientation);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, wMm, hMm);
    }
    pdf.save(exportFilename('_image'));
  } finally {
    document.body.classList.remove('exporting');
  }
};

document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
