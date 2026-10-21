/* Carte de vœux 2027 · 3e RSMV La Rochelle
   GSAP 3 (ScrollTrigger, SplitText, CustomEase) + Lenis. Aucune dépendance externe chargée depuis un CDN. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const VALIDATION = params.has("validation");
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("statique");
  const COLORS = { terre: { uni: "#6FFF53", pts: "camo-pts-terre" } };
  if (VALIDATION) document.documentElement.classList.add("is-validation");

  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
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

  fetch("content/site.json").then((r) => r.json()).then(build).catch((e) => {
    console.error("Contenu introuvable (lancer un serveur local : voir README)", e);
    const p = document.createElement("p");
    p.className = "erreur"; p.setAttribute("role", "alert");
    p.textContent = fr("Le contenu de la carte n'a pas pu être chargé. Rechargez la page ; si le problème persiste, réessayez plus tard.");
    $("main").prepend(p);
    actions();
  });

  function build(D) {
    const T = D.textes;
    $("[data-hero-kicker]").innerHTML = rich(T.kicker);
    $("[data-hero-sub]").innerHTML = rich(T.sous_titre);
    $("#frise-title").innerHTML = rich(T.frise_titre);
    $("[data-frise-sub]").innerHTML = rich(T.frise_sous_titre);
    $("#final-title").innerHTML = rich(T.final_titre);
    $("[data-final-text]").innerHTML = rich(T.final_texte);
    $("[data-final-year]").textContent = D.annee_voeux;

    $("[data-chiffres]").innerHTML = D.chiffres.map((c) => `
      <li class="chiffre" data-chiffre>
        <div class="chiffre__picto" data-picto="${esc(c.picto)}" aria-hidden="true"></div>
        <div class="chiffre__num"><span data-count="${c.valeur}">${REDUCE ? c.valeur : 0}</span>${esc(c.suffixe)}</div>
        <div class="chiffre__label">${rich(c.label)}</div>
        <div class="chiffre__detail">${rich(c.detail)}</div>
        ${c.provisoire && VALIDATION ? `<span class="badge">À METTRE À JOUR</span>` : ""}
      </li>`).join("");

    const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // En public : on masque les fiches vides et les événements pas encore passés (ils apparaissent le jour venu).
    const evs = D.evenements.filter((e) => VALIDATION || ((e.texte || e.photos.length) && !(e.date > today)));
    let lastMonth = -1;
    const items = [];
    evs.forEach((e, i) => {
      // Mois lu dans la chaîne « AAAA-MM-JJ » : pas de conversion de fuseau horaire (un 1er du mois resterait dans son mois).
      const m = e.date ? +e.date.slice(5, 7) - 1 : lastMonth;
      if (m !== lastMonth && m >= 0) { items.push(`<li class="frise__month-mark" data-month="${MOIS[m]}" aria-hidden="true"><span>${MOIS[m]}</span></li>`); lastMonth = m; }
      const cover = e.photos[0];
      const plus = e.photos.length - 1;
      items.push(`<li class="card" data-card data-month="${m >= 0 ? MOIS[m] : ""}">
        <div class="card__media" data-media>
          ${cover ? picture(cover, "(max-width: 760px) 92vw, 440px") : `<div class="card__placeholder"><img src="assets/img/pictos/${esc(e.picto)}.svg" alt="" width="96" height="96"></div>`}
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
    document.fonts.ready.then(() => animate());
  }

  /* ---------- Lightbox ---------- */
  function setupLightbox(evs) {
    const dlg = $("[data-lightbox]");
    let cur = 0;
    const show = (i) => {
      cur = (i + evs.length) % evs.length;
      const e = evs[cur];
      $("[data-lb-date]").textContent = fr(e.date_affichee);
      $("[data-lb-title]").innerHTML = rich(e.titre);
      $("[data-lb-texte]").innerHTML = rich(e.texte || "Texte à venir.");
      $("[data-lb-media]").innerHTML = e.photos.length ? e.photos.map((p, k) => picture(p, "(max-width: 860px) 94vw, 680px", k === 0)).join("")
        : `<div class="card__placeholder" style="position:relative;min-height:320px"><img src="assets/img/pictos/${esc(e.picto)}.svg" alt="" width="96" height="96"></div>`;
      $("[data-lb-media]").scrollTop = 0;
      if (!REDUCE) gsap.from(".lightbox__text > *", { y: 16, opacity: 0, duration: .5, stagger: .05, ease: "smvOut" });
    };
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-open]");
      if (b) { show(+b.dataset.open); dlg.showModal(); lenis?.stop(); }
    });
    $("[data-lb-close]").onclick = () => dlg.close();
    $("[data-lb-prev]").onclick = () => show(cur - 1);
    $("[data-lb-next]").onclick = () => show(cur + 1);
    dlg.addEventListener("close", () => lenis?.start());
    dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", (ev) => { if (ev.key === "ArrowRight") show(cur + 1); if (ev.key === "ArrowLeft") show(cur - 1); });
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

  /* ---------- Barre haute : solide hors des fonds bleus ---------- */
  function topbar() {
    const bar = $("[data-topbar]");
    ScrollTrigger.create({ start: 80, end: "max", onToggle: (st) => bar.classList.toggle("is-scrolled", st.isActive) });
    $$(".frise").forEach((sec) => ScrollTrigger.create({
      trigger: sec, start: "top 60", end: "bottom 60",
      onToggle: (s) => bar.classList.toggle("is-solid", s.isActive),
    }));
  }

  /* ---------- Intro (hero) ---------- */
  let intro;
  function heroIntro() {
    // Le titre lisible par les lecteurs d'écran est un texte masqué à part : le titre animé est ignoré (aria: "none").
    const chars = $$(".hero [data-split]").flatMap((el) => SplitText.create(el, { type: "chars", mask: "chars", aria: "none" }).chars);
    const reel = $(".odo__reel");
    const waves = $$(".hero .camo__wave");
    intro = gsap.timeline({ defaults: { ease: "smvOut" } })
      .from(".hero .camo", { xPercent: (i) => [-35, 30, 40][i], yPercent: (i) => [30, -35, 40][i], opacity: 0, duration: 1.6, stagger: .12 }, 0)
      .fromTo(waves, { attr: { r: 0 } }, { attr: { r: 1900 }, duration: 2.2, stagger: .15, ease: "power2.out" }, .35)
      .from("[data-hero-insigne]", { y: 40, opacity: 0, duration: 1.1 }, .5)
      .add(() => $("[data-hero-insigne]").classList.add("is-shine"), 1.2)
      .from("[data-hero-kicker]", { y: 20, opacity: 0, duration: .8 }, .9)
      .from(chars, { yPercent: 115, duration: 1, stagger: .035 }, 1.0)
      .from(".year", { yPercent: 115, opacity: 0, duration: 1 }, 1.35)
      // Le CSS affiche 2027 par défaut : on repart de 2026 (y: 0 annule le décalage lu dans le CSS) puis on bascule.
      .fromTo(reel, { y: 0, yPercent: 0 }, { yPercent: -50, duration: 1.1, ease: "smvInOut" }, 2.45)
      .from("[data-hero-sub]", { y: 20, opacity: 0, duration: .9 }, 2.9)
      .from("[data-hero-cue]", { opacity: 0, duration: .8 }, 3.3);
    // Parallaxe au défilement
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
        .from($(".chiffre__picto", li), { scale: .4, opacity: 0, duration: .7, ease: "back.out(2)", transformOrigin: "left bottom" })
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
      const onTrack = (tween) => {
        gsap.set(progress, { scaleX: tween.progress() });
        const mid = window.innerWidth * .45 - gsap.getProperty(track, "x");
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
        const media = $("[data-media]", card); const img = $("img", media);
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
    gsap.timeline({ scrollTrigger: { trigger: ".final", start: "top 65%" }, defaults: { ease: "smvOut" } })
      .from(".final .camo", { xPercent: (i) => [-30, 30][i], yPercent: (i) => [30, -30][i], opacity: 0, duration: 1.6, stagger: .1 }, 0)
      .fromTo(".final .camo__wave", { attr: { r: 0 } }, { attr: { r: 1900 }, duration: 2.4, stagger: .15, ease: "power2.out" }, .2)
      .from(s.chars, { yPercent: 110, duration: 1.2, stagger: .09 }, .1)
      .from(".final__text, .final__logo, .final__actions", { y: 30, opacity: 0, duration: 1, stagger: .12 }, .6);
  }

  /* ---------- Actions ---------- */
  function actions() {
    let timer;
    const toast = (m) => { const t = $("[data-toast]"); t.textContent = fr(m); clearTimeout(timer); timer = setTimeout(() => (t.textContent = ""), 4000); };
    const manuel = "Copiez l'adresse de la page dans la barre du navigateur pour la partager.";
    $("[data-share]").onclick = async () => {
      const data = { title: document.title, text: fr("Meilleurs vœux 2027 du 3e RSMV La Rochelle"), url: location.href.split(/[?#]/)[0] };
      if (navigator.share) {
        try { await navigator.share(data); } catch (e) { if (e.name !== "AbortError") toast(manuel); } // AbortError : partage annulé
        return;
      }
      try { await navigator.clipboard.writeText(data.url); toast("Lien copié !"); } catch (e) { toast("Copie impossible. " + manuel); }
    };
    $("[data-replay]").onclick = () => {
      const go = () => { intro?.restart(); };
      if (lenis) lenis.scrollTo(0, { duration: 1.6, onComplete: go }); else { window.scrollTo(0, 0); go(); }
    };
  }

  function animate() {
    actions();
    if (REDUCE) { $(".frise").classList.add("is-vertical"); return; }
    heroIntro(); reveals(); chiffres(); frise(); finale(); topbar();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }
})();
