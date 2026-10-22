/* Carte de vœux 2027 · 3e RSMV La Rochelle
   GSAP 3 (ScrollTrigger, SplitText, CustomEase, Flip) + Lenis. Aucune dépendance externe chargée depuis un CDN. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const VALIDATION = params.has("validation");
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("statique");
  const POINTEUR = window.matchMedia("(hover: hover) and (pointer: fine)").matches; // souris ou pavé tactile (pas d'écran tactile seul)
  const COLORS = { terre: { uni: "#6FFF53", pts: "camo-pts-terre" } };
  if (VALIDATION) document.documentElement.classList.add("is-validation");

  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip);
  CustomEase.create("smvOut", "0.16, 1, 0.3, 1");
  CustomEase.create("smvInOut", "0.65, 0, 0.35, 1");

  /* ---------- Camouflage : une seule forme, une seule échelle, trame au-dessus ---------- */
  document.body.insertAdjacentHTML("afterbegin", window.SMV_CAMO_SPRITE);
  let camoId = 0;
  function mountCamo(el) {
    const c = COLORS[el.dataset.camo] || COLORS.terre;
    const id = `camo-wave-${camoId++}`;
    el.innerHTML = `<svg viewBox="0 0 1417 1181" aria-hidden="true" focusable="false">
      <defs><mask id="${id}"><circle class="camo__wave" cx="1417" cy="0" r="${REDUCE ? 2000 : 0}" fill="#fff"/></mask></defs>
      <use href="#camo-uni" fill="${c.uni}"/>
      <g clip-path="url(#camo-clip-trame)" mask="url(#${id})"><rect width="1417" height="1181" fill="url(#${c.pts})"/></g>
    </svg>`;
  }
  $$("[data-camo]").forEach(mountCamo);

  /* ---------- Typographie française ---------- */
  // Appliquée à tous les textes de site.json, pour qu'une saisie au clavier ordinaire suffise :
  // apostrophe typographique, espaces insécables (avant : ; ! ? » %, après «, entre un nombre et le mot suivant).
  const NBSP = " ";
  const fr = (s) => String(s ?? "")
    .replace(/'/g, "’")
    .replace(/\.\.\./g, "…")
    .replace(/ ([:;!?»%])/g, NBSP + "$1")
    .replace(/« /g, "«" + NBSP)
    .replace(/(\d) (?=\p{L})/gu, "$1" + NBSP);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const txt = (s) => esc(fr(s));
  const rich = (s) => txt(s).replace(/\b(\d+)(re|er|e)\b/g, "$1<sup>$2</sup>"); // 3e → 3ᵉ, 1re → 1ʳᵉ

  const picture = (p, sizes, eager = false) => {
    const ws = Object.keys(p.srcs).map(Number).sort((a, b) => a - b);
    const set = (f) => ws.map((w) => `${p.srcs[w][f]} ${w}w`).join(", ");
    const mid = p.srcs[ws[Math.min(1, ws.length - 1)]].webp;
    return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">
      <img src="${mid}" alt="${txt(p.alt)}" width="${p.w}" height="${p.h}" loading="${eager ? "eager" : "lazy"}" decoding="async"
      style="object-position:${p.focal};background-color:${p.couleur};background-image:url(${p.lqip})"></picture>`;
  };

  /* ---------- Son (optionnel, coupé par défaut, jamais de lecture automatique) ---------- */
  // Les 6 sons (55 Ko) ne sont téléchargés qu'au premier clic sur « Son ».
  const SONS = ["whoosh_court", "trame_scintillement", "logo_signature", "pop_picto", "clic_ui", "ding_validation"];
  const son = { actif: false, ctx: null, buffers: {} };
  const jouer = (nom, volume = .5) => {
    if (!son.actif || !son.buffers[nom]) return;
    const src = son.ctx.createBufferSource(); const gain = son.ctx.createGain();
    src.buffer = son.buffers[nom]; gain.gain.value = volume;
    src.connect(gain).connect(son.ctx.destination); src.start();
  };
  const boutonSon = $("[data-son]");
  boutonSon.addEventListener("click", () => {
    son.actif = !son.actif;
    boutonSon.setAttribute("aria-pressed", String(son.actif));
    if (son.actif && !son.ctx) {
      son.ctx = new (window.AudioContext || window.webkitAudioContext)();
      SONS.forEach((n) => fetch(`assets/sfx/${n}.m4a`).then((r) => r.arrayBuffer()).then((b) => son.ctx.decodeAudioData(b))
        .then((buf) => { son.buffers[n] = buf; if (n === "clic_ui") jouer("clic_ui", .4); }).catch(() => {}));
    } else if (son.actif) { son.ctx.resume(); jouer("clic_ui", .4); }
  });

  fetch("content/site.json").then((r) => r.json()).then(build).catch((e) => {
    console.error("Contenu introuvable (lancer un serveur local : voir README)", e);
    const p = document.createElement("p");
    p.className = "erreur"; p.setAttribute("role", "alert");
    p.textContent = fr("Le contenu de la carte n'a pas pu être chargé. Rechargez la page ; si le problème persiste, réessayez plus tard.");
    $("main").prepend(p);
    actions();
  });

  let T = {};
  function build(D) {
    T = D.textes;
    $("[data-hero-kicker]").innerHTML = rich(T.kicker);
    $("[data-hero-sub]").innerHTML = rich(T.sous_titre);
    $("#frise-title").innerHTML = rich(T.frise_titre);
    $("[data-frise-sub]").innerHTML = rich(T.frise_sous_titre);
    $("#final-title").innerHTML = rich(T.final_titre);
    $("[data-final-text]").innerHTML = rich(T.final_texte);
    $("[data-final-year]").textContent = D.annee_voeux;

    // Personnalisation par lien (?pour=france-travail) : LISTE FERMÉE dans site.json, aucun texte libre affiché.
    const cle = (params.get("pour") || "").trim().toLowerCase();
    const dest = D.destinataires || {};
    if (cle && !cle.startsWith("_") && Object.prototype.hasOwnProperty.call(dest, cle)) {
      const p = $("[data-hero-pour]"); p.innerHTML = rich(dest[cle]); p.hidden = false;
    }

    $("[data-chiffres]").innerHTML = D.chiffres.map((c) => `
      <li class="chiffre" data-chiffre>
        <div class="chiffre__picto" data-picto="${esc(c.picto)}" aria-hidden="true"></div>
        <div class="chiffre__num"><span data-count="${c.valeur}">${REDUCE ? c.valeur : 0}</span>${esc(c.suffixe)}</div>
        <div class="chiffre__label">${rich(c.label)}</div>
        <div class="chiffre__detail">${rich(c.detail)}</div>
        ${c.provisoire && VALIDATION ? `<span class="badge">À METTRE À JOUR</span>` : ""}
      </li>`).join("");

    const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    // En public : on masque seulement les fiches sans texte ni photo (les événements à venir sont affichés : décision du 22 octobre 2026).
    const evs = D.evenements.filter((e) => VALIDATION || e.texte || e.photos.length);
    let lastMonth = -1;
    const items = [];
    evs.forEach((e, i) => {
      // Mois lu dans la chaîne « AAAA-MM-JJ » : pas de conversion de fuseau horaire (un 1er du mois resterait dans son mois).
      const m = e.date ? +e.date.slice(5, 7) - 1 : lastMonth;
      if (m !== lastMonth && m >= 0) { items.push(`<li class="frise__month-mark" data-month="${MOIS[m]}" aria-hidden="true"><span>${MOIS[m]}</span></li>`); lastMonth = m; }
      const cover = e.photos[0];
      const plus = e.photos.length - 1;
      const dixAns = (e.categorie || "").trim().toLowerCase() === "10 ans";
      items.push(`<li class="card${dixAns ? " card--10ans" : ""}" data-card data-month="${m >= 0 ? MOIS[m] : ""}">
        <div class="card__media" data-media>
          ${cover ? picture(cover, "(max-width: 760px) 92vw, 440px") : `<div class="card__placeholder"><img src="assets/img/pictos/${esc(e.picto)}.svg" alt="" width="96" height="96"></div>`}
          ${dixAns ? `<span class="card__flag">${txt(T.etiquette_10ans)}</span>` : ""}
          ${plus > 0 ? `<span class="card__count"><span aria-hidden="true">+${plus}</span><span class="sr-only">${plus} photo${plus > 1 ? "s" : ""} de plus</span></span>` : ""}
        </div>
        <div class="card__meta"><span class="card__date">${txt(e.date_affichee)}</span><span class="card__cat">${txt(e.categorie)}</span>
          ${e.statut ? `<span class="card__badge badge">${txt(e.statut.toUpperCase())}</span>` : ""}</div>
        <h3 class="card__title"><button class="card__btn" type="button" data-open="${i}" aria-haspopup="dialog">${rich(e.titre)}</button></h3>
        ${e.texte ? `<p class="card__text">${rich(e.texte)}</p>` : `<p class="card__text"><em>Texte à venir</em></p>`}
        <span class="card__more" aria-hidden="true">En savoir plus</span>
        ${e.alertes?.length ? `<ul class="card__alertes">${e.alertes.map((a) => `<li>${txt(a)}</li>`).join("")}</ul>` : ""}
      </li>`);
    });
    $("[data-frise-track]").innerHTML = items.join("");
    // Pictos en ligne (pour recolorer base et accent selon le fond)
    $$("[data-picto]").forEach((el) => fetch(`assets/img/pictos/${el.dataset.picto}.svg`).then((r) => r.text()).then((svg) => (el.innerHTML = svg)));
    setupLightbox(evs);
    // L'ouverture démarre dès que les polices du titre et du sur-titre sont prêtes (pas besoin d'attendre toutes les autres).
    Promise.all(["800 1em Marianne", "700 1em Marianne"].map((f) => document.fonts.load(f))).catch(() => {}).then(animate);
  }

  /* ---------- Curseur « VOIR » sur les cartes (ordinateur) ---------- */
  let cacherCurseur = () => {};
  function curseur() {
    if (!POINTEUR || REDUCE) return;
    const c = document.createElement("div");
    c.className = "curseur"; c.setAttribute("aria-hidden", "true"); c.textContent = fr(T.curseur || "Voir");
    document.body.appendChild(c); document.documentElement.classList.add("has-curseur");
    gsap.set(c, { scale: 0 });
    const xTo = gsap.quickTo(c, "x", { duration: .35, ease: "power3" }), yTo = gsap.quickTo(c, "y", { duration: .35, ease: "power3" });
    let dedans = false, px = -1, py = -1;
    const basculer = (sur) => {
      if (sur === dedans) return;
      dedans = sur;
      gsap.to(c, { scale: sur ? 1 : 0, duration: sur ? .45 : .3, ease: sur ? "back.out(1.7)" : "power2.out", overwrite: "auto" });
    };
    const verifier = (cible) => basculer(!!cible?.closest?.("[data-card]") && !$("[data-lightbox]").open);
    window.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; xTo(px); yTo(py); verifier(e.target); }, { passive: true });
    // La frise glisse sous un pointeur immobile : on revérifie au défilement (une fois par image au plus).
    let attente = false;
    window.addEventListener("scroll", () => {
      if (attente || px < 0) return; attente = true;
      requestAnimationFrame(() => { attente = false; verifier(document.elementFromPoint(px, py)); });
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => basculer(false));
    cacherCurseur = () => basculer(false);
  }

  /* ---------- Lightbox : carrousel de photos, transition Flip depuis la carte ---------- */
  function setupLightbox(evs) {
    const dlg = $("[data-lightbox]");
    const mediaLb = $("[data-lb-media]");
    let cur = 0, diapo = 0;
    const animerTexte = () => { if (!REDUCE) gsap.from(".lightbox__text > *", { y: 16, opacity: 0, duration: .5, stagger: .05, ease: "smvOut" }); };
    const diapos = () => $$(".diapo", mediaLb);
    const majCompteur = () => {
      const n = diapos().length, c = $("[data-compteur]", mediaLb); if (!c || n < 2) return;
      c.innerHTML = `<span aria-hidden="true">${diapo + 1} / ${n}</span><span class="sr-only">Photo ${diapo + 1} sur ${n}</span>`;
    };
    // Une photo à la fois (modèle WAI-ARIA « carrousel ») ; les diapositives masquées sont retirées du parcours (inert).
    const show = (i, versFin = false) => {
      const focusDansMedia = mediaLb.contains(document.activeElement); // le bouton qui a le focus va être remplacé
      cur = (i + evs.length) % evs.length;
      const e = evs[cur];
      $("[data-lb-date]").textContent = fr(e.date_affichee);
      $("[data-lb-title]").innerHTML = rich(e.titre);
      $("[data-lb-texte]").innerHTML = rich(e.texte || "Texte à venir.");
      const n = e.photos.length;
      diapo = versFin && n ? n - 1 : 0;
      if (n > 1) mediaLb.setAttribute("aria-roledescription", "carrousel"); else mediaLb.removeAttribute("aria-roledescription");
      mediaLb.innerHTML = `<div class="carrousel__scene" data-scene>${n
        ? e.photos.map((p, k) => `<figure class="diapo${k === diapo ? " is-active" : ""}"${n > 1 ? ` aria-roledescription="diapositive" aria-label="${k + 1} sur ${n}"` : ""}${k === diapo ? "" : " aria-hidden=\"true\" inert"}>${picture(p, "(max-width: 860px) 94vw, 760px", k === diapo)}</figure>`).join("")
        : `<div class="card__placeholder"><img src="assets/img/pictos/${esc(e.picto)}.svg" alt="" width="96" height="96"></div>`}</div>
        ${n > 1 ? `<button class="carrousel__btn carrousel__btn--prec" type="button" data-diapo="-1" aria-label="Photo précédente">‹</button>
        <button class="carrousel__btn carrousel__btn--suiv" type="button" data-diapo="1" aria-label="Photo suivante">›</button>
        <p class="carrousel__compteur" aria-live="polite" data-compteur></p>` : ""}`;
      majCompteur();
      // Le focus ne doit pas tomber sur la page : il reste dans le carrousel (bouton dans le même sens, sinon la zone des photos).
      if (focusDansMedia) ($(versFin ? "[data-diapo='-1']" : "[data-diapo='1']", mediaLb) || mediaLb).focus({ preventScroll: true });
    };
    const allerA = (n, sens) => {
      const ds = diapos(); if (ds.length < 2) return;
      const anc = ds[diapo]; diapo = (n + ds.length) % ds.length; const nouv = ds[diapo];
      anc.classList.remove("is-active"); anc.setAttribute("aria-hidden", "true"); anc.inert = true;
      nouv.classList.add("is-active"); nouv.removeAttribute("aria-hidden"); nouv.inert = false;
      $("img", nouv)?.setAttribute("loading", "eager");
      majCompteur(); jouer("clic_ui", .25);
      if (REDUCE) return;
      gsap.fromTo(anc, { autoAlpha: 1, xPercent: 0 }, { autoAlpha: 0, xPercent: -5 * sens, duration: .35, ease: "smvOut", clearProps: "transform" });
      gsap.fromTo(nouv, { autoAlpha: 0, xPercent: 5 * sens }, { autoAlpha: 1, xPercent: 0, duration: .55, ease: "smvOut" });
    };
    // Flèches du clavier : les photos de l'événement, puis l'événement suivant (ou précédent), comme une visionneuse continue.
    const suivante = () => { if (diapo < diapos().length - 1) allerA(diapo + 1, 1); else { show(cur + 1); animerTexte(); } };
    const precedente = () => { if (diapo > 0) allerA(diapo - 1, -1); else { show(cur - 1, true); animerTexte(); } };
    mediaLb.addEventListener("click", (ev) => { const b = ev.target.closest("[data-diapo]"); if (b) allerA(diapo + +b.dataset.diapo, +b.dataset.diapo); });
    // Balayage au doigt (le défilement vertical reste possible : touch-action: pan-y dans le CSS)
    let x0 = null;
    mediaLb.addEventListener("pointerdown", (ev) => { if (ev.pointerType !== "mouse") x0 = ev.clientX; });
    mediaLb.addEventListener("pointerup", (ev) => {
      if (x0 === null) return; const dx = ev.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) allerA(diapo + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    // Fantôme : copie de la photo, posée dans la visionneuse (calque du dessus) et déplacée par Flip.fit.
    const fantome = (source) => {
      const f = document.createElement("div"); f.className = "flip-fantome";
      const img = $("img", source);
      f.innerHTML = source.classList.contains("card__placeholder") || $(".card__placeholder", source) ? `<div class="card__placeholder">${img ? img.outerHTML : ""}</div>`
        : `<img src="${img.currentSrc || img.src}" alt="" style="object-position:${img.style.objectPosition}">`;
      dlg.appendChild(f); return f;
    };
    // Cible dans la visionneuse : la zone réellement occupée par la photo affichée (photo entière, centrée dans la scène).
    const cibleLb = () => {
      const scene = $("[data-scene]", mediaLb); const img = $(".diapo.is-active img", scene);
      if (!img) return scene;
      const r = scene.getBoundingClientRect(), ratio = (+img.getAttribute("width") || 1) / (+img.getAttribute("height") || 1);
      let w = r.width, h = w / ratio; if (h > r.height) { h = r.height; w = h * ratio; }
      let m = $(".flip-repere", scene); if (!m) { m = document.createElement("div"); m.className = "flip-repere"; scene.appendChild(m); }
      Object.assign(m.style, { left: `${(r.width - w) / 2}px`, top: `${(r.height - h) / 2}px`, width: `${w}px`, height: `${h}px` });
      return m;
    };
    const nettoyer = () => { $$(".flip-fantome", dlg).forEach((f) => f.remove()); dlg.classList.remove("is-flip", "is-fermeture"); };
    const ouvrir = (i, carte) => {
      const media = carte && $("[data-media]", carte);
      const flip = !REDUCE && !!media;
      show(i);
      if (flip) dlg.classList.add("is-flip"); // AVANT l'ouverture : le panneau apparaît déjà effacé (pas de flash blanc)
      dlg.showModal(); lenis?.stop(); cacherCurseur(); jouer("clic_ui", .4);
      if (!flip) { animerTexte(); return; }
      const f = fantome(media);
      Flip.fit(f, media, { scale: false });
      Flip.fit(f, cibleLb(), { scale: false, duration: .7, ease: "smvInOut", onComplete: () => {
        dlg.classList.remove("is-flip");
        gsap.to(f, { opacity: 0, duration: .25, onComplete: () => f.remove() });
        animerTexte();
      } });
    };
    const fermer = () => {
      if (!dlg.open || dlg.classList.contains("is-fermeture")) return;
      const carte = $(`[data-open="${cur}"]`)?.closest("[data-card]");
      const media = carte && $("[data-media]", carte);
      const r = media?.getBoundingClientRect();
      const visible = r && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      // Trajet inverse vers la carte seulement si elle est à l'écran et si la 1re photo (celle de la carte) est affichée.
      if (REDUCE || !visible || diapo !== 0) { dlg.close(); return; }
      const source = $(".diapo.is-active", mediaLb) || $(".card__placeholder", mediaLb);
      const f = fantome(source);
      Flip.fit(f, cibleLb(), { scale: false });
      dlg.classList.add("is-flip", "is-fermeture");
      Flip.fit(f, media, { scale: false, duration: .55, ease: "smvInOut", onComplete: () => dlg.close() });
    };
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-open]");
      if (b) ouvrir(+b.dataset.open, b.closest("[data-card]"));
    });
    $("[data-lb-close]").onclick = fermer;
    $("[data-lb-prev]").onclick = () => { show(cur - 1); animerTexte(); };
    $("[data-lb-next]").onclick = () => { show(cur + 1); animerTexte(); };
    dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); fermer(); }); // Échap : même animation que le bouton Fermer
    dlg.addEventListener("close", () => { nettoyer(); lenis?.start(); });
    dlg.addEventListener("click", (ev) => { if (ev.target === dlg) fermer(); });
    // Écouté sur le document : les flèches fonctionnent où que soit le focus tant que la visionneuse est ouverte.
    document.addEventListener("keydown", (ev) => {
      if (!dlg.open) return;
      if (ev.key === "ArrowRight") { ev.preventDefault(); suivante(); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); precedente(); }
    });
  }

  /* ---------- Défilement doux ---------- */
  let lenis = null;
  if (!REDUCE) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    ScrollTrigger.addEventListener("refresh", () => lenis.resize()); // l'épinglage de la frise allonge la page : Lenis doit le savoir
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // Liens internes : défilement doux, puis le focus suit (clavier, lecteur d'écran) et l'adresse est mise à jour.
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href"); const t = $(hash); if (!t) return;
      e.preventDefault();
      history.pushState(null, "", hash);
      lenis.scrollTo(t, { duration: 1.4, easing: (x) => 1 - Math.pow(1 - x, 4), onComplete: () => {
        if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
        t.focus({ preventScroll: true });
      } });
    }));
  }

  /* ---------- Barre haute : bleu foncé, blanche sur la frise (fond blanc) ---------- */
  function topbar() {
    const bar = $("[data-topbar]");
    $$(".frise").forEach((sec) => ScrollTrigger.create({
      trigger: sec, start: "top 60", end: "bottom 60",
      onToggle: (s) => bar.classList.toggle("is-solid", s.isActive),
    }));
  }

  /* ---------- Intro (hero) : titre lisible à 1,8 s, 2027 à 2,8 s, bouton « Passer » ---------- */
  let intro;
  function construireIntro() {
    if (intro) { intro.progress(1); intro.finir?.(); intro.kill(); }
    const insigne = $("[data-hero-insigne]"); insigne.classList.remove("is-shine");
    // Le titre lisible par les lecteurs d'écran est un texte masqué à part : le titre animé est ignoré (aria: "none").
    // Le découpage est annulé à la fin (revert) : aucun masque ne reste autour des lettres une fois l'intro jouée.
    const splits = $$(".hero [data-split]").map((el) => SplitText.create(el, { type: "chars", mask: "chars", aria: "none" }));
    const chars = splits.flatMap((s) => s.chars);
    const reel = $(".odo__reel"); const [six, sept] = reel.children;
    const waves = $$(".hero .camo__wave");
    const skip = $("[data-skip]");
    let fini = false;
    const evenements = ["wheel", "touchmove", "keydown"];
    const passer = (e) => {
      if (e?.type === "keydown" && !["Enter", " ", "Escape", "ArrowDown", "PageDown", "End"].includes(e.key)) return;
      if (e?.type === "keydown" && e.target === skip) return; // le bouton gère lui-même Entrée / Espace
      tl.progress(1); finir();
    };
    const finir = () => {
      if (fini) return; fini = true;
      if (document.activeElement === skip) $("[data-hero-cue]").focus({ preventScroll: true });
      skip.hidden = true;
      splits.forEach((s) => s.revert());
      evenements.forEach((n) => window.removeEventListener(n, passer));
    };
    const tl = gsap.timeline({ defaults: { ease: "smvOut" }, onComplete: finir })
      .add(() => jouer("whoosh_court", .45), 0)
      .from(".hero .camo", { xPercent: (i) => [-35, 30, 40][i], yPercent: (i) => [30, -35, 40][i], opacity: 0, duration: 1.4, stagger: .1 }, 0)
      .fromTo(waves, { attr: { r: 0 } }, { attr: { r: 1900 }, duration: 1.8, stagger: .12, ease: "power2.out" }, .25)
      .add(() => jouer("trame_scintillement", .3), .3)
      .from(insigne, { y: 32, opacity: 0, duration: .9 }, .3)
      .add(() => { skip.hidden = false; gsap.fromTo(skip, { opacity: 0 }, { opacity: 1, duration: .4 }); }, .4)
      .from("[data-hero-pour], [data-hero-kicker]", { y: 18, opacity: 0, duration: .7, stagger: .06 }, .55)
      .from(chars, { yPercent: 115, duration: .8, stagger: .03 }, .6)
      .add(() => insigne.classList.add("is-shine"), 1.0)
      .from(".year", { yPercent: 115, opacity: 0, duration: .8 }, .9)
      // Le CSS affiche 2027 par défaut : on repart de 2026 (y: 0 annule le décalage lu dans le CSS) puis on bascule.
      // Seul le chiffre affiché est visible hors bascule (aucun liseré du chiffre voisin au bord de la fenêtre).
      .set(six, { visibility: "visible" }, 0).set(sept, { visibility: "hidden" }, 0)
      .set(sept, { visibility: "visible" }, 1.9)
      .fromTo(reel, { y: 0, yPercent: 0 }, { yPercent: -50, duration: .9, ease: "smvInOut" }, 1.9)
      .set(six, { visibility: "hidden" }, 2.8)
      .from("[data-hero-sub]", { y: 18, opacity: 0, duration: .8 }, 2.4)
      .from("[data-hero-cue]", { opacity: 0, duration: .6 }, 2.6);
    tl.finir = finir;
    skip.onclick = () => passer();
    evenements.forEach((n) => window.addEventListener(n, passer, { passive: true }));
    intro = tl;
  }
  function parallaxeHero() {
    gsap.to(".hero__inner", { yPercent: 18, opacity: .15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    $$(".hero [data-depth]").forEach((el) => gsap.to(el, { y: () => -window.innerHeight * parseFloat(el.dataset.depth), ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } }));
  }

  /* ---------- Révélations génériques ---------- */
  function reveals() {
    $$("[data-reveal-title]").forEach((h) => {
      const s = SplitText.create(h, { type: "lines", mask: "lines", linesClass: "split-line" });
      gsap.from(s.lines, { yPercent: 110, duration: 1.1, stagger: .08, ease: "smvOut", scrollTrigger: { trigger: h, start: "top 85%" } });
    });
  }

  /* ---------- Chiffres ---------- */
  function chiffres() {
    $$("[data-chiffre]").forEach((li, i) => {
      const num = $("[data-count]", li); const target = +num.dataset.count; const o = { v: 0 };
      const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: "top 85%" }, delay: i * .12 })
        .add(() => jouer("pop_picto", .3), 0)
        .from($(".chiffre__picto", li), { scale: .4, opacity: 0, duration: .7, ease: "back.out(2)", transformOrigin: "left bottom" }, 0)
        .to(li, { "--p": 1, duration: 1.2, ease: "smvOut" }, 0)
        .to(o, { v: target, duration: 1.6, ease: "power3.out", onUpdate: () => (num.textContent = Math.round(o.v)) }, .1)
        .from($$(".chiffre__label, .chiffre__detail", li), { y: 16, opacity: 0, stagger: .08, duration: .7, ease: "smvOut" }, .3);
      return tl;
    });
  }

  /* ---------- Frise ---------- */
  function frise() {
    const section = $(".frise"); const track = $("[data-frise-track]"); const label = $("[data-frise-month]");
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      section.classList.remove("is-vertical");
      const cards = $$("[data-card]");
      const progress = $("[data-frise-progress]");
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      // Positions des cartes mesurées une fois par recalcul (pas de lecture de mise en page à chaque image).
      let bounds = [];
      const measure = () => (bounds = cards.map((c) => [c.offsetLeft, c.offsetLeft + c.offsetWidth, c.dataset.month]));
      // Repère du mois et barre de progression suivent la position RÉELLE de la frise (lissée), pas celle du défilement.
      // Point de lecture à 30 % de la largeur : la carte la plus à gauche donne le mois.
      const onTrack = (tween) => {
        gsap.set(progress, { scaleX: tween.progress() });
        const mid = window.innerWidth * .3 - gsap.getProperty(track, "x");
        const b = bounds.find(([l, r]) => l <= mid && r >= mid);
        if (b && b[2] && label.textContent !== b[2]) {
          label.textContent = b[2];
          gsap.fromTo(label, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .45, ease: "smvOut" });
        }
      };
      const scroller = gsap.to(track, { x: () => -dist(), ease: "none", onUpdate() { onTrack(this); },
        scrollTrigger: { trigger: "[data-frise-pin]", pin: true, scrub: 1, start: "top top", end: () => "+=" + dist(), invalidateOnRefresh: true, onRefresh: measure } });
      measure();
      cards.forEach((card, i) => {
        const media = $("[data-media]", card); const img = $("picture img", media);
        // Les cartes visibles dès l'arrivée sur la frise se révèlent avec la section ; les suivantes au fil du défilement horizontal.
        const visible = card.offsetLeft < window.innerWidth * .9;
        const st = (start) => visible ? { trigger: section, start: "top 65%" } : { trigger: card, containerAnimation: scroller, start };
        gsap.fromTo(media, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "smvOut", delay: visible ? i * .12 : 0, scrollTrigger: st("left 92%") });
        gsap.from($$(".card__meta, .card__title, .card__text, .card__more", card), { y: 24, opacity: 0, stagger: .06, duration: .8, ease: "smvOut",
          delay: visible ? .2 + i * .12 : 0, scrollTrigger: st("left 85%") });
        if (img) gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: scroller, start: "left right", end: "right left", scrub: true } });
      });
      $$(".frise__month-mark span").forEach((m) => gsap.from(m, { yPercent: 40, opacity: 0, duration: .9, ease: "smvOut",
        scrollTrigger: m.parentElement.offsetLeft < window.innerWidth * .9 ? { trigger: section, start: "top 65%" } : { trigger: m, containerAnimation: scroller, start: "left 90%" } }));
      // Clavier : quand le focus arrive sur une carte, on fait défiler la page jusqu'à ce qu'elle soit au centre.
      const onFocus = (ev) => {
        const card = ev.target.closest("[data-card]"); if (!card) return;
        const x = gsap.utils.clamp(0, dist(), card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2);
        const y = scroller.scrollTrigger.start + x; // 1 px de défilement vertical = 1 px de frise
        if (Math.abs(window.scrollY - y) > 2) lenis ? lenis.scrollTo(y, { duration: .7 }) : window.scrollTo(0, y);
      };
      track.addEventListener("focusin", onFocus);
      return () => { track.removeEventListener("focusin", onFocus); gsap.set(track, { x: 0 }); };
    });
    mm.add("(max-width: 899px)", () => {
      section.classList.add("is-vertical");
      gsap.fromTo(track, { "--line": 0 }, { "--line": 1, ease: "none", scrollTrigger: { trigger: track, start: "top 70%", end: "bottom 80%", scrub: true } });
      ScrollTrigger.batch("[data-card]", { start: "top 88%", onEnter: (b) => gsap.from(b, { y: 50, opacity: 0, duration: .9, stagger: .1, ease: "smvOut" }) });
    });
  }

  /* ---------- 2027 ---------- */
  function finale() {
    const s = SplitText.create("[data-final-year]", { type: "chars", mask: "chars", aria: "none" });
    gsap.timeline({ scrollTrigger: { trigger: ".final", start: "top 65%" }, defaults: { ease: "smvOut" },
      onComplete: () => { s.revert(); trameInteractive(); } })
      .from(".final .camo", { xPercent: (i) => [-30, 30][i], yPercent: (i) => [30, -30][i], opacity: 0, duration: 1.6, stagger: .1 }, 0)
      .fromTo(".final .camo__wave", { attr: { r: 0 } }, { attr: { r: 1900 }, duration: 2.4, stagger: .15, ease: "power2.out" }, .2)
      .from(s.chars, { yPercent: 110, duration: 1.2, stagger: .09 }, .1)
      .from(".final__text, .final__logo, .final__actions", { y: 30, opacity: 0, duration: 1, stagger: .12 }, .6)
      .add(() => jouer("logo_signature", .35), .85);
  }

  /* ---------- Trame interactive du final (ordinateur, après l'apparition des motifs) ---------- */
  // Charte : seule la trame des motifs camouflage réagit (jamais de trame hors motif). Un calque canvas par motif
  // redessine uniquement les points proches du pointeur, agrandis, par-dessus la trame SVG (même couleur, même grille).
  function trameInteractive() {
    if (!POINTEUR || REDUCE || trameInteractive.fait) return;
    trameInteractive.fait = true;
    const section = $(".final");
    const forme = new Path2D($("#camo-clip-trame path").getAttribute("d"));
    const CELL = 21.566, OX = 2.63, OY = 18.75, R0 = 4.07; // grille de la trame (quinconce, diamètre / pas ≈ 0,53)
    const RAYON = 200, GAIN = .9; // rayon d'influence en px écran, grossissement maximal (+90 %)
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const test = document.createElement("canvas").getContext("2d");
    const points = [];
    for (let y = OY - CELL; y < 1181 + CELL; y += CELL) for (let x = OX - CELL; x < 1417 + CELL; x += CELL)
      for (const [dx, dy] of [[0, 0], [CELL / 2, CELL / 2]]) if (test.isPointInPath(forme, x + dx, y + dy)) points.push([x + dx, y + dy]);
    const couches = $$(".camo", section).map((camo) => {
      const cv = document.createElement("canvas"); cv.className = "camo__points"; cv.setAttribute("aria-hidden", "true");
      camo.appendChild(cv);
      return { camo, cv, ctx: cv.getContext("2d"), svg: $("svg", camo) };
    });
    const dimensionner = () => couches.forEach((c) => { c.cv.width = c.camo.offsetWidth * DPR; c.cv.height = c.camo.offsetHeight * DPR; c.k = c.camo.offsetWidth / 1417; });
    dimensionner();
    ScrollTrigger.addEventListener("refresh", dimensionner);
    const pos = { x: -1e4, y: -1e4 }, etat = { force: 0 };
    const xTo = gsap.quickTo(pos, "x", { duration: .3, ease: "power3" }), yTo = gsap.quickTo(pos, "y", { duration: .3, ease: "power3" });
    const dessiner = () => {
      couches.forEach((c) => {
        const { ctx, cv } = c;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
        if (etat.force < .01) return;
        const p = new DOMPoint(pos.x, pos.y).matrixTransform(c.svg.getScreenCTM().inverse()); // pointeur en coordonnées du motif
        const rayon = RAYON / c.k;
        ctx.setTransform(DPR * c.k, 0, 0, DPR * c.k, 0, 0);
        ctx.save(); ctx.clip(forme); ctx.fillStyle = "#3DA435"; ctx.beginPath();
        for (const [x, y] of points) {
          const d = Math.hypot(x - p.x, y - p.y); if (d >= rayon) continue;
          const r = R0 * (1 + GAIN * etat.force * Math.pow(1 - d / rayon, 1.2));
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.restore();
      });
    };
    let boucle = false;
    section.addEventListener("pointerenter", (e) => {
      gsap.set(pos, { x: e.clientX, y: e.clientY }); xTo(e.clientX); yTo(e.clientY);
      gsap.to(etat, { force: 1, duration: .5, ease: "power2.out", overwrite: true });
      if (!boucle) { boucle = true; gsap.ticker.add(dessiner); }
    });
    section.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    section.addEventListener("pointerleave", () => gsap.to(etat, { force: 0, duration: .6, ease: "power2.out", overwrite: true,
      onComplete: () => { boucle = false; gsap.ticker.remove(dessiner); dessiner(); } }));
  }

  /* ---------- Actions ---------- */
  function actions() {
    let timer;
    const toast = (m) => { const t = $("[data-toast]"); t.textContent = fr(m); clearTimeout(timer); timer = setTimeout(() => (t.textContent = ""), 4000); };
    const manuel = "Copiez l'adresse de la page dans la barre du navigateur pour la partager.";
    $("[data-share]").onclick = async () => {
      // Lien partagé sans paramètre : une carte personnalisée redevient générique quand elle circule.
      const data = { title: document.title, text: fr("Meilleurs vœux 2027 du 3e RSMV La Rochelle"), url: location.href.split(/[?#]/)[0] };
      if (navigator.share) {
        try { await navigator.share(data); } catch (e) { if (e.name !== "AbortError") toast(manuel); } // AbortError : partage annulé
        return;
      }
      try { await navigator.clipboard.writeText(data.url); toast("Lien copié !"); jouer("ding_validation", .4); } catch (e) { toast("Copie impossible. " + manuel); }
    };
    const rejouer = $("[data-replay]");
    if (REDUCE) { rejouer.hidden = true; return; }
    rejouer.onclick = () => {
      const go = () => construireIntro();
      if (lenis) lenis.scrollTo(0, { duration: 1.6, onComplete: go }); else { window.scrollTo(0, 0); go(); }
    };
  }

  function animate() {
    actions();
    if (REDUCE) { $(".frise").classList.add("is-vertical"); return; }
    construireIntro(); parallaxeHero(); reveals(); chiffres(); frise(); finale(); topbar(); curseur();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }
})();
