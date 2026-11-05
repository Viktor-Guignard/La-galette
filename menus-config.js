/* Configuration partagée des cartes de La Galette.
   Utilisée par l'éditeur (onglets), la page Publier et la page publique. */
window.CARTE_MENUS = [
  { key: 'carte',     label: 'La carte',          hint: 'Salle · 9 pages',  slug: 'carte' },
  { key: 'pizzas',    label: 'Pizzas',            hint: '4 langues',         slug: 'pizzas-fr' },
  { key: 'emporter',  label: 'Vente à emporter',  hint: 'Adhésif vitre 48×68', slug: 'vente-a-emporter' },
  { key: 'totem',     label: 'Totem',             hint: 'Porte-menu 47,8×68', slug: 'porte-menu-totem' },
  { key: 'potence',   label: 'Panneau potence',   hint: 'Dibond recto verso 45×65', slug: 'panneau-potence' },
  { key: 'arche',     label: 'Arche du totem',    hint: '49×13,9 — découpe faite par le resto', slug: 'arche-totem' },
];
window.CARTE_PUBLIC_URL = 'https://viktor-guignard.github.io/la-coursive-site/carte-galette/carte.html';

window.currentMenuKey = function () {
  const k = new URLSearchParams(location.search).get('menu');
  return window.CARTE_MENUS.some(m => m.key === k) ? k : 'carte';
};
window.currentMenuLabel = function () {
  const k = window.currentMenuKey();
  const m = window.CARTE_MENUS.find(x => x.key === k);
  return m ? m.label : k;
};
window.menuSlug = function (key) {
  const m = window.CARTE_MENUS.find(x => x.key === key);
  return (m && m.slug) || key || 'carte';
};
window.currentMenuSlug = function () { return window.menuSlug(window.currentMenuKey()); };

/* Blocs proposés par « + Ajouter un bloc », adaptés à chaque carte
   (déterminés d'après les PDF d'origine). */
window.MENU_BLOCK_PRESETS = {
  // Carte de salle : logo, titres à filets bruns, plats FR + EN en rouge,
  // menus centrés, vins à 4 contenances, colonnes (boissons, photos)
  carte:       ['section', 'item', 'legend', 'item-simple', 'line', 'wine', 'winehead', 'formule-heading', 'note', 'image', 'divider', 'cols', 'colbreak', 'colsend', 'pagebreak'],
  // Pizzas : noms bruns + garniture sur une ligne
  pizzas:      ['item-simple', 'legend', 'section', 'line', 'note', 'image', 'divider', 'pagebreak'],
  'pizzas-en': ['item-simple', 'legend', 'section', 'line', 'note', 'image', 'divider', 'pagebreak'],
  // Affiche noir & or : 2 colonnes, bandeaux or
  totem:       ['item', 'item-simple', 'section', 'banner', 'line', 'wine', 'winehead', 'image', 'note', 'cols', 'colbreak', 'colsend', 'pagebreak'],
  emporter:    ['item', 'item-simple', 'section', 'banner', 'image', 'note', 'cols', 'colbreak', 'colsend', 'pagebreak'],
  // Panneau de la potence (Dibond noir) : même carte complète que le totem
  potence:     ['item', 'item-simple', 'section', 'banner', 'line', 'wine', 'winehead', 'image', 'note', 'cols', 'colbreak', 'colsend', 'pagebreak'],
  // Arche du totem : quelques lignes centrées, croix de Savoie (images)
  arche:       ['line', 'image', 'note', 'cols', 'colbreak', 'colsend'],
};
