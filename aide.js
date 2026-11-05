/* =========================================================
   Assistant d'aide — FAQ conversationnelle, 100 % locale.
   Aucune IA, aucun appel réseau : simple moteur de correspondance
   par mots-clés sur une base de questions/réponses.
   Utilisé par l'éditeur (index.html) et la page Publier (publier.html).
   ========================================================= */
(function () {

  /* ---------- Base de connaissances ---------- */
  /* k = mots-clés (sans accents, minuscules) ; q = question affichée ; a = réponse HTML */
  const FAQ = [
    {
      id: 'modifier-texte',
      cat: 'Modifier',
      q: 'Comment changer un nom de plat ou un prix ?',
      k: 'modifier changer editer texte nom plat prix titre corriger ecrire taper faute orthographe remplacer mot',
      a: `<b>Cliquez simplement dessus.</b>
        <ol>
          <li>Cliquez sur le texte à modifier (nom, description ou prix)</li>
          <li>Tapez votre correction</li>
          <li>Appuyez sur <b>Entrée</b> ou cliquez ailleurs pour valider</li>
        </ol>
        <p class="tip">Pensez ensuite à <b>💾 Enregistrer</b> pour conserver la modification.</p>`
    },
    {
      id: 'ajouter-plat',
      cat: 'Modifier',
      q: 'Comment ajouter un nouveau plat ?',
      k: 'ajouter nouveau plat ligne creer inserer rajouter boisson vin item entree dessert',
      a: `<ol>
          <li>Survolez l'endroit où insérer le plat : une barre <b>« + ajouter ici »</b> apparaît entre deux lignes</li>
          <li>Cliquez dessus, puis choisissez <b>Plat</b></li>
          <li>Le nouveau plat s'ajoute — cliquez sur son texte pour le renseigner</li>
        </ol>
        <p class="tip">Le bouton <b>+ Ajouter un bloc</b> en haut fait la même chose, mais ajoute à la fin (ou après le bloc sélectionné).</p>`
    },
    {
      id: 'supprimer',
      cat: 'Modifier',
      q: 'Comment supprimer un plat ?',
      k: 'supprimer enlever retirer effacer plat ligne bloc croix delete virer',
      a: `<ol>
          <li>Survolez la ligne à supprimer</li>
          <li>Cliquez sur la <b>croix ✕</b> qui apparaît à droite</li>
        </ol>
        <p class="tip">Erreur de manip ? Un bouton <b>Annuler</b> s'affiche pendant 6 secondes en bas de l'écran. Sinon, utilisez <b>↶</b> en haut.</p>`
    },
    {
      id: 'deplacer',
      cat: 'Modifier',
      q: 'Comment déplacer / réorganiser les plats ?',
      k: 'deplacer bouger monter descendre ordre reorganiser haut bas ranger position inverser',
      a: `<p>Survolez la ligne, puis utilisez les flèches à droite :</p>
        <ul>
          <li><b>↑</b> monte le plat d'un cran</li>
          <li><b>↓</b> le descend d'un cran</li>
          <li><b>⧉</b> le duplique (pratique pour créer un plat similaire)</li>
        </ul>`
    },
    {
      id: 'picto',
      cat: 'Modifier',
      q: 'Comment mettre le pictogramme végétarien ou sans gluten sur un plat ?',
      k: 'picto pictogramme icone logo vegetarien vegan vege gluten sans gluten allergie nouveau new coeur coup de coeur symbole feuille epi signe',
      a: `<ol>
          <li>Survolez la ligne du plat</li>
          <li>Cliquez sur le bouton <b>🏷</b> (le dernier de la rangée à droite)</li>
        </ol>
        <p>Chaque clic fait défiler : <b>aucun → végétarien → sans gluten → les deux → « NEW » → coup de cœur ❤ → aucun</b>.</p>
        <p class="tip">Les pictogrammes apparaissent aussi sur la page du QR code et sur le site, avec leur légende traduite.</p>`
    },
    {
      id: 'masquer',
      cat: 'Modifier',
      q: 'Comment masquer un plat en rupture (sans le supprimer) ?',
      k: 'masquer cacher rupture stock indisponible plus dispo temporaire retirer momentane epuise fini absent enlever provisoire desactiver reactiver reafficher oeil',
      a: `<p>Pour retirer un plat du site <b>sans le supprimer</b> (rupture, produit du jour épuisé…) :</p>
        <ol>
          <li>Survolez la ligne du plat</li>
          <li>Cliquez sur le bouton <b>👁</b> dans les contrôles à droite</li>
          <li>Le plat s'affiche <b>grisé et barré</b> avec l'étiquette « Masqué du site »</li>
          <li><b>💾 Enregistrer</b>, puis <b>Publier</b> pour appliquer côté clients</li>
        </ol>
        <p>Le plat <b>disparaît du QR et du site</b>, mais reste dans votre carte. Pour le remettre : recliquez sur <b>🚫</b>, enregistrez et republiez.</p>
        <p class="tip">Le plat masqué disparaît <b>partout</b> : du QR, du site et du <b>PDF téléchargé</b>. Il reste seulement visible (grisé) dans l'éditeur.</p>`
    },
    {
      id: 'section',
      cat: 'Modifier',
      q: 'Comment ajouter une section (ENTRÉES, DESSERTS…) ?',
      k: 'section categorie titre rubrique entrees desserts plats groupe partie chapitre',
      a: `<ol>
          <li>Cliquez sur <b>« + ajouter ici »</b> à l'endroit voulu</li>
          <li>Choisissez <b>Titre de section</b></li>
          <li>Modifiez le texte français, puis la traduction anglaise après le « / »</li>
        </ol>
        <p class="tip">Sur la page des vins, le bloc <b>Sous-titre</b> sert aux groupes en couleur (« VINS BLANCS DE SAVOIE AOP »…). Sur la page des boissons, les petits titres à gauche (APÉRITIFS…) sont des titres de section en mode « sous-titre ».</p>
        <p class="tip">Pour mettre des blocs côte à côte (photo à côté des raclettes, boissons sur 2 colonnes) : <b>Début de colonnes</b>, puis les blocs de gauche, <b>Colonne suivante</b>, les blocs de droite, et <b>Fin des colonnes</b>. Le bouton ⇔ change la largeur des colonnes.</p>`
    },
    {
      id: 'couleurs',
      cat: 'Apparence',
      q: 'Comment changer les couleurs ou la police ?',
      k: 'couleur police font typo apparence design style titre accent fond creme changer graphisme da',
      a: `<p>Cliquez sur <b>🎨 Apparence</b> en haut. Vous pouvez y régler :</p>
        <ul>
          <li>Police des titres et police du texte</li>
          <li>Couleur des titres et couleur d'accent</li>
          <li>Fond de la carte (blanc, crème, ivoire)</li>
          <li>Pointillés entre le plat et le prix</li>
        </ul>
        <p class="tip">Les changements sont visibles en direct et n'affectent que la carte de l'onglet en cours.</p>`
    },
    {
      id: 'format',
      cat: 'Apparence',
      q: 'Comment changer le format de page ou les marges ?',
      k: 'format taille page marge dimension a4 a5 mm centimetre impression porte-menu bord',
      a: `<p>Dans <b>🎨 Apparence</b> :</p>
        <ul>
          <li><b>Format de page</b> : A4 (carte de salle, pizzas) ou le format exact de chaque support extérieur : adhésif vitre 48 × 68 cm, totem 47,8 × 68 cm, panneau potence 45 × 65 cm, arche 49 × 13,9 cm</li>
          <li><b>Porte-menu</b> : indiquez les millimètres cachés par le cadre — un pointillé rouge montre la zone visible, et ce qui passe dessous est signalé</li>
          <li><b>Marges (mm)</b> : haut / droite / bas / gauche, au dixième de millimètre</li>
          <li><b>Marges en miroir</b> : pour les documents reliés (pages paires inversées)</li>
          <li><b>Espacement entre les lignes</b> : pour aérer ou densifier</li>
        </ul>
        <p class="tip">Le format actif est rappelé au-dessus de chaque page (ex. « 210 × 297 mm »). Cette indication ne s'imprime pas.</p>`
    },
    {
      id: 'enregistrer',
      cat: 'Enregistrer',
      q: 'Comment enregistrer mes modifications ?',
      k: 'enregistrer enregistre sauvegarder sauver save version garder valider conserver modif modifs modification modifications changement',
      a: `<p>Cliquez sur <b>💾 Enregistrer</b> en haut.</p>
        <p>Chaque enregistrement crée une <b>nouvelle version horodatée</b> : rien n'est jamais écrasé, vous pouvez toujours revenir en arrière.</p>
        <p class="tip">Enregistrer ne rend pas la carte visible aux clients — pour ça, il faut <b>Publier</b> (onglet 📱 Publier / QR).</p>`
    },
    {
      id: 'versions',
      cat: 'Enregistrer',
      q: 'Comment revenir à une version précédente ?',
      k: 'version precedente revenir retour ancienne historique restaurer recuperer avant hier semaine derniere',
      a: `<ol>
          <li>Cliquez sur <b>🕑 Versions</b></li>
          <li>Repérez la version voulue (elles sont datées et heurées)</li>
          <li>Cliquez sur <b>Charger</b></li>
        </ol>
        <p class="tip">Pour annuler juste la dernière action, plus simple : le bouton <b>↶</b> en haut (ou Ctrl/Cmd+Z).</p>`
    },
    {
      id: 'supprimer-version',
      cat: 'Enregistrer',
      q: 'Comment supprimer une ancienne version ?',
      k: 'supprimer version effacer historique nettoyer menage poubelle ancienne',
      a: `<ol>
          <li>Cliquez sur <b>🕑 Versions</b></li>
          <li>Cliquez sur l'icône <b>🗑</b> à droite de la version</li>
          <li>Confirmez</li>
        </ol>
        <p class="warn">⚠️ C'est la seule action <b>définitive</b> de l'outil : une version supprimée ne peut pas être récupérée.</p>`
    },
    {
      id: 'publier',
      cat: 'Publier',
      q: 'Comment publier la carte pour les clients ?',
      k: 'publier publication mettre en ligne client visible qr diffuser sortir live',
      a: `<ol>
          <li>Enregistrez d'abord vos modifications (<b>💾</b>)</li>
          <li>Allez sur l'onglet <b>📱 Publier / QR</b></li>
          <li>Cochez les cartes à rendre visibles</li>
          <li>Cliquez sur <b>Mettre en ligne (QR code + site)</b></li>
        </ol>
        <p>Chaque carte indique son état : <b>en ligne ✓ à jour</b>, ou <b>modifiée — à publier</b> s'il reste une version enregistrée à mettre en ligne. Un point orange sur le bouton <b>📱 Publier</b> de l'éditeur rappelle qu'une publication est en attente.</p>
        <p class="tip">Tant que vous n'avez pas publié, vos modifications restent invisibles pour les clients : vous pouvez préparer une carte tranquillement.</p>`
    },
    {
      id: 'qr-pas-jour',
      cat: 'Publier',
      q: "J'ai publié mais le QR code n'affiche pas les changements",
      k: 'qr pas jour marche pas fonctionne pas rien change attendre delai lent bug probleme actualise',
      a: `<p>C'est normal : comptez <b>jusqu'à 5 minutes</b> de propagation après avoir cliqué Publier.</p>
        <p>Pour vérifier sans attendre :</p>
        <ul>
          <li>Ouvrez la page en navigation privée</li>
          <li>Ou fermez la page et rouvrez-la quelques minutes plus tard</li>
        </ul>
        <p class="tip">Si rien ne change après 10 minutes, vérifiez que vous avez bien <b>enregistré</b> avant de publier.</p>`
    },
    {
      id: 'qr-code',
      cat: 'Publier',
      q: 'Comment récupérer le QR code pour les tables ?',
      k: 'qr code telecharger table image png recuperer afficher sticker chevalet flashcode',
      a: `<p>Onglet <b>📱 Publier / QR</b> → bouton <b>⬇️ Télécharger le QR</b>.</p>
        <p>Le QR est <b>fixe et définitif</b> : imprimez-le une fois, il restera valable même quand vous modifiez la carte.</p>`
    },
    {
      id: 'pdf',
      cat: 'Imprimer',
      q: 'Comment obtenir le PDF pour l\'imprimeur ?',
      k: 'pdf imprimer imprimeur telecharger export fichier papier impression editer sortir',
      a: `<p>Cliquez sur <b>⬇️ PDF</b> en haut : le fichier se télécharge directement, nommé avec la date et l'heure. Rien à régler.</p>
        <p>Le PDF sort <b>exactement au format choisi</b> dans 🎨 Apparence (A4, adhésif 48 × 68 cm, totem 47,8 × 68 cm…), sans fond perdu ni traits de coupe, et <b>identique à ce que vous voyez à l'écran</b>.</p>
        <p><b>Dans quelle langue ?</b> Celle affichée : le bouton indique « PDF FR », « PDF DE »… Choisissez la langue en haut (🇫🇷 🇬🇧 🇮🇹 🇩🇪) avant de cliquer.</p>
        <p>Le texte reste du <b>vrai texte</b> : net à n'importe quelle taille d'impression, et votre imprimeur peut le sélectionner pour vérifier les accents ou les prix.</p>
        <p class="tip">Le PDF ne concerne que la carte de l'onglet en cours — répétez l'opération pour chaque carte.</p>`
    },
    {
      id: 'autre-ordi',
      cat: 'Accès',
      q: 'Comment travailler depuis un autre ordinateur ?',
      k: 'autre ordinateur pc mac telephone maison acces connexion ailleurs lien magique deplacement partager equipe chez soi domicile distance exterieur portable tablette autre poste collegue serveur',
      a: `<p>Utilisez le <b>lien d'activation</b> (envoyé par Viktor) :</p>
        <ol>
          <li>Sur un appareil déjà autorisé : <b>⚙️</b> → <b>Copier le lien d'activation</b></li>
          <li>Envoyez-vous ce lien (mail, WhatsApp…)</li>
          <li>Sur l'autre appareil : ouvrez le lien une fois → tout est activé, mettez-le en favori</li>
        </ol>
        <p class="warn">⚠️ Ce lien donne le droit de modifier la carte : ne le diffusez qu'aux personnes de confiance.</p>`
    },
    {
      id: 'lecture-seule',
      cat: 'Accès',
      q: 'Il est écrit « Consultation seule », je ne peux pas enregistrer',
      k: 'lecture seule consultation autorise autorisation enregistrer grise impossible bloque jeton token acces droit refuse marche pas bouton',
      a: `<p>Cet appareil n'est pas encore autorisé à modifier les cartes.</p>
        <ul>
          <li><b>Ouvrez le lien d'activation</b> que Viktor vous a envoyé, sur cet appareil : c'est tout.</li>
          <li>Pas de lien ? Demandez-le à Viktor (ou copiez-le depuis un appareil déjà autorisé : ⚙️ → Copier le lien d'activation).</li>
        </ul>
        <p class="tip">Consulter la carte est toujours possible sans clé — seuls l'enregistrement et la publication en nécessitent une.</p>`
    },
    {
      id: 'brouillon',
      cat: 'Accès',
      q: 'On me propose de reprendre un brouillon, c\'est quoi ?',
      k: 'brouillon reprendre ignorer bandeau jaune non enregistre perdu recuperer travail',
      a: `<p>Si vous fermez la page sans enregistrer, l'outil garde une copie locale de votre travail.</p>
        <ul>
          <li><b>Reprendre le brouillon</b> : récupère vos modifications non enregistrées</li>
          <li><b>Ignorer</b> : repart de la dernière version enregistrée</li>
        </ul>
        <p class="warn">⚠️ Le brouillon reste sur <b>cet ordinateur uniquement</b>. Pour retrouver votre travail ailleurs, enregistrez avant de partir.</p>`
    },
    {
      id: 'debordement',
      cat: 'Mise en page',
      q: 'Un message dit que le contenu dépasse la page',
      k: 'depasse deborde rouge avertissement trop long page pleine coupe alerte warning',
      a: `<p>Le contenu ne tient pas dans le format choisi. Solutions :</p>
        <ul>
          <li>Ajoutez un <b>Saut de page</b> avant le bloc de trop (via « + ajouter ici »)</li>
          <li>Réduisez l'<b>espacement entre les lignes</b> dans 🎨 Apparence</li>
          <li>Réduisez les <b>marges</b></li>
          <li>Supprimez ou raccourcissez des lignes</li>
        </ul>
        <p class="tip">Si vous exportez malgré l'avertissement, le contenu en trop sera coupé dans le PDF.</p>`
    },
    {
      id: 'logo',
      cat: 'Mise en page',
      q: 'Comment changer le logo ou une image ?',
      k: 'logo image photo remplacer changer visuel tampon medaillon illustration',
      a: `<p>Cliquez directement sur l'image dans la carte : un sélecteur de fichier s'ouvre.</p>
        <p>Ça marche pour le logo et toutes les photos. Les boutons <b>−</b> / <b>+</b> de la ligne changent la taille de l'image.</p>
        <p class="tip">Pour ajouter une nouvelle image : « + ajouter ici » → <b>Image / photo</b>.</p>`
    },
    {
      id: 'site-vs-qr',
      cat: 'Général',
      q: 'Quelle différence entre le site web et le QR code ?',
      k: 'site web internet vitrine difference qr deux lien url adresse ou',
      a: `<p>Les deux affichent la <b>même carte publiée</b>, mais pour des usages différents :</p>
        <ul>
          <li><b>Le QR code</b> : pour les clients à table, sur leur téléphone. Toutes les cartes publiées (carte de salle, pizzas, vente à emporter…)</li>
          <li><b>Le lien direct</b> : la même page, à partager (site, réseaux sociaux, Google)</li>
        </ul>
        <p class="tip">Une seule publication met les deux à jour en même temps.</p>`
    },
    {
      id: 'onglets',
      cat: 'Général',
      q: 'À quoi servent les onglets en haut ?',
      k: 'onglet tab carte pizzas emporter affiche vins boissons naviguer changer passer',
      a: `<p>Chaque onglet est une <b>carte indépendante</b> : La carte (9 pages, salle), Pizzas, Vente à emporter (adhésif vitre 48 × 68 cm), Totem (47,8 × 68 cm), Panneau potence (45 × 65 cm, imprimé recto verso) et Arche du totem (49 × 13,9 cm : le restaurant découpe l'arrondi, un pointillé montre où garder les textes).</p>
        <p>Chacune existe dans les <b>4 langues</b> (sélecteur 🇫🇷 🇬🇧 🇮🇹 🇩🇪 en haut) : la carte anglaise des pizzas, par exemple, c'est l'onglet Pizzas en 🇬🇧.</p>
        <p>Chacune a son propre contenu, son format, ses couleurs, ses versions et son PDF.</p>
        <p class="tip">Le dernier onglet <b>📱 Publier / QR</b> n'est pas une carte : c'est là qu'on rend les modifications visibles aux clients.</p>`
    },
    {
      id: 'langues',
      cat: 'Langues',
      q: 'Comment la carte est-elle traduite (anglais, italien, allemand) ?',
      k: 'langue langues traduction traduire anglais italien allemand english italiano deutsch etranger touriste automatique dictionnaire',
      a: `<p><b>Toute seule.</b> Vous écrivez la carte en français ; dès que vous modifiez ou ajoutez un plat, la traduction anglaise, italienne et allemande se fait en quelques secondes (indicateur <b>🌐</b> en haut).</p>
        <p>Elle s'appuie d'abord sur les traductions déjà relues de vos cartes (plus de 600 textes), terme par terme pour les listes d'ingrédients, puis sur un service de traduction en ligne pour les mots nouveaux.</p>
        <p class="tip">Les clients voient la page du QR code dans la langue de leur téléphone, et peuvent en changer avec les drapeaux.</p>`
    },
    {
      id: 'langue-corriger',
      cat: 'Langues',
      q: 'La traduction est fausse : comment la corriger ?',
      k: 'traduction fausse faute erreur corriger allemand italien anglais mauvaise mot changer langue verifier relire',
      a: `<ol>
          <li>En haut, choisissez la langue : <b>🇬🇧 EN</b>, <b>🇮🇹 IT</b> ou <b>🇩🇪 DE</b></li>
          <li>Touchez le texte à corriger, tapez la bonne traduction, Entrée</li>
        </ol>
        <p>Le français ne bouge pas. Les textes traduits par le service en ligne sont <b>soulignés en orange</b> jusqu'à ce que vous les validiez (bouton <b>✓ Tout est bon</b>).</p>
        <p class="tip">Dans une autre langue, les prix et l'ordre des plats ne se modifient pas : faites-le dans la carte en 🇫🇷 français.</p>`
    },
    {
      id: 'langue-pdf',
      cat: 'Langues',
      q: 'Comment imprimer la carte en anglais, italien ou allemand ?',
      k: 'pdf langue anglais italien allemand imprimer carte etrangere english version traduite',
      a: `<p>Choisissez la langue en haut (🇬🇧 🇮🇹 🇩🇪), puis cliquez <b>⬇️ PDF</b> : le bouton affiche la langue (« PDF DE ») et le fichier sort dans cette langue, au même format.</p>`
    },
    {
      id: 'annuler',
      cat: 'Général',
      q: 'Comment annuler ma dernière action ?',
      k: 'annuler undo retour arriere erreur ctrl z retablir refaire',
      a: `<p>Bouton <b>↶</b> en haut, ou raccourci <b>Ctrl+Z</b> (Windows) / <b>Cmd+Z</b> (Mac).</p>
        <p>Pour refaire ce que vous venez d'annuler : <b>↷</b> ou Ctrl/Cmd+Shift+Z.</p>`
    },
    {
      id: 'contact',
      cat: 'Général',
      q: 'Je ne trouve pas ma réponse / j\'ai un problème',
      k: 'aide contact probleme bug aide viktor appeler assistance sos marche pas comprends rien',
      a: `<p>Écrivez à <b>VIKTO LABS</b> — <b>vikto.labs@gmail.com</b> — on vous répond rapidement.</p>
        <p>Pour aller plus vite, précisez : la carte concernée (onglet), ce que vous vouliez faire, et ce qui s'est passé.</p>
        <p class="tip">Utilisez le bouton ci-dessous : votre question et la page consultée sont ajoutées automatiquement au message.</p>`,
      mail: true
    },
  ];

  /* ---------- Moteur de correspondance (sans IA) ---------- */
  const norm = s => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // retire les accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const STOP = new Set(['le','la','les','un','une','des','du','de','a','au','aux','je','tu','il','on','pour','comment','faire','fait','faut','est','ce','que','qui','quoi','ou','et','en','dans','sur','avec','mon','ma','mes','se','sa','son','ne','pas','plus','peux','peut','veux','vais','dois','y','c','j','l','d','n','s','t','me','moi','nous','vous','par','the','how']);

  function tokens(s) {
    return norm(s).split(' ').filter(w => w.length >= 2 && !STOP.has(w));
  }

  /* Distance de Levenshtein bornée : tolère les fautes de frappe.
     Sort dès que la distance dépasse `max` (rapide). */
  function lev(a, b, max) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    let prev = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      const cur = new Array(lb + 1);
      cur[0] = i;
      let best = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[lb];
  }

  /* Score d'un mot de la question contre les mots-clés d'une fiche.
     1 = exact, 0.75 = même racine, 0.7/0.5 = faute de frappe tolérée. */
  function wordScore(w, kw) {
    if (kw.has(w)) return 1;
    let best = 0;
    const maxD = w.length >= 7 ? 2 : (w.length >= 4 ? 1 : 0);
    for (const k of kw) {
      if (k.length > 3 && w.length > 3 && (k.startsWith(w) || w.startsWith(k))) {
        if (best < 0.75) best = 0.75;
      }
      if (maxD > 0 && k.length >= 4) {
        const d = lev(w, k, maxD);
        if (d <= maxD) {
          const sc = d === 1 ? 0.8 : 0.55;   // faute corrigée > simple préfixe
          if (sc > best) best = sc;
        }
      }
    }
    return best;
  }

  function score(query, entry) {
    const qt = tokens(query);
    if (!qt.length) return 0;
    const kw = new Set(tokens(entry.k + ' ' + entry.q));
    let hits = 0;
    qt.forEach(w => { hits += wordScore(w, kw); });
    return hits / qt.length;
  }

  function search(query) {
    return FAQ.map(e => ({ e, s: score(query, e) }))
      .filter(x => x.s >= 0.3)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map(x => x.e);
  }

  /* ---------- Repli : écrire à VIKTO LABS ---------- */
  const MAIL = 'vikto.labs@gmail.com';
  function mailtoUrl(question) {
    const isPublier = /publier\.html/.test(location.pathname);
    const ctx = isPublier
      ? 'Page Publier / QR'
      : 'Éditeur — carte : ' + (typeof window.currentMenuLabel === 'function' ? window.currentMenuLabel() : '?');
    const body = "Bonjour,\n\nJe n'ai pas trouvé la réponse à ma question dans l'aide :\n\n« "
      + (question || '') + " »\n\n----------\nContexte : " + ctx + "\nPage : " + location.href + "\n\nMerci !";
    return 'mailto:' + MAIL + '?subject=' + encodeURIComponent("Question sur l'éditeur de carte")
      + '&body=' + encodeURIComponent(body);
  }

  /* ---------- Interface ---------- */
  const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };

  function build() {
    const btn = document.createElement('button');
    btn.id = 'aideBtn';
    btn.setAttribute('aria-label', "Aide — comment faire ?");
    btn.innerHTML = '<span>?</span>';

    const panel = document.createElement('div');
    panel.id = 'aidePanel';
    panel.innerHTML = `
      <div class="aide-head">
        <div>
          <div class="aide-title">Besoin d'aide ?</div>
          <div class="aide-sub">Posez votre question, ou choisissez ci-dessous</div>
        </div>
        <button class="aide-close" aria-label="Fermer">×</button>
      </div>
      <div class="aide-body" id="aideBody"></div>
      <form class="aide-form" id="aideForm" autocomplete="off">
        <input type="text" id="aideInput" placeholder="Ex : comment changer un prix ?" aria-label="Votre question">
        <button type="submit" aria-label="Envoyer">➤</button>
      </form>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    const body = panel.querySelector('#aideBody');
    const input = panel.querySelector('#aideInput');

    /* --- messages --- */
    function addBot(html) {
      const el = document.createElement('div');
      el.className = 'aide-msg bot';
      el.innerHTML = html;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }
    function addUser(text) {
      const el = document.createElement('div');
      el.className = 'aide-msg user';
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }
    function addChips(entries, label) {
      const wrap = document.createElement('div');
      wrap.className = 'aide-chips';
      if (label) wrap.innerHTML = `<div class="aide-chips-label">${label}</div>`;
      entries.forEach(e => {
        const c = document.createElement('button');
        c.className = 'aide-chip';
        c.textContent = e.q;
        c.onclick = () => { addUser(e.q); answer(e); };
        wrap.appendChild(c);
      });
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }
    function addMail(question) {
      const wrap = document.createElement('div');
      wrap.className = 'aide-mailbox';
      wrap.innerHTML = `
        <div class="aide-mailbox-txt">Envoyez votre question à VIKTO LABS, on vous répond rapidement.</div>
        <a class="aide-mail" href="${mailtoUrl(question)}">✉️ Écrire à ${MAIL}</a>
        <div class="aide-mailbox-alt">Ou écrivez directement à <b>${MAIL}</b></div>`;
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }

    function answer(entry) {
      addBot(`<div class="aide-a-title">${esc(entry.q)}</div>${entry.a}`);
      if (entry.mail) { addMail(''); return; }
      // suggestions de la même catégorie
      const related = FAQ.filter(e => e.cat === entry.cat && e.id !== entry.id).slice(0, 3);
      if (related.length) addChips(related, 'Sur le même sujet');
    }

    /* --- accueil, contextuel à l'onglet ouvert --- */
    function welcome() {
      body.innerHTML = '';
      const isPublier = /publier\.html/.test(location.pathname);
      const menu = (typeof window.currentMenuLabel === 'function' && !isPublier)
        ? window.currentMenuLabel() : null;
      addBot(`Bonjour 👋<br>Je réponds aux questions sur l'éditeur de carte${menu ? ` — vous êtes sur la carte <b>${esc(menu)}</b>` : ''}.`);
      const starters = isPublier
        ? ['publier', 'qr-pas-jour', 'qr-code', 'site-vs-qr']
        : ['modifier-texte', 'ajouter-plat', 'enregistrer', 'publier', 'pdf'];
      addChips(starters.map(id => FAQ.find(e => e.id === id)).filter(Boolean), 'Questions fréquentes');
    }

    /* --- recherche libre --- */
    panel.querySelector('#aideForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      addUser(q);
      input.value = '';
      const found = search(q);
      if (!found.length) {
        addBot(`Je n'ai pas trouvé de réponse à cette question 😕`);
        addMail(q);
        addChips(FAQ.filter(e => ['modifier-texte','ajouter-plat','enregistrer','publier','pdf'].includes(e.id)), 'Ou consultez ces sujets');
      } else if (found.length === 1) {
        answer(found[0]);
      } else {
        answer(found[0]);
        addChips(found.slice(1), 'Vous cherchiez peut-être');
      }
    });

    /* --- ouverture / fermeture --- */
    function open() {
      panel.classList.add('open');
      btn.classList.add('open');
      if (!body.children.length) welcome();
      setTimeout(() => input.focus(), 250);
    }
    function close() { panel.classList.remove('open'); btn.classList.remove('open'); }

    btn.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
    panel.querySelector('.aide-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
