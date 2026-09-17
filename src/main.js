import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const q = (sel) => document.querySelector(sel);
const qAll = (sel) => [...document.querySelectorAll(sel)];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------
   Contato — WhatsApp da Francar
   --------------------------------------------------------- */
const WHATSAPP = "5563992307887";
const DEFAULT_NUMBER = "5500";

function formatWa(number) {
  const d = number.replace(/\D/g, "");
  if (!d) return "(00) 00000-0000";
  return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
}

const digits = WHATSAPP.replace(/\D/g, "");
const numberIsSet = digits !== DEFAULT_NUMBER && !/^0+$/.test(digits);

qAll("[data-wa]").forEach((el) => {
  el.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    "Olá, Francar! Quero agendar um serviço para o meu carro."
  )}`;
  if (numberIsSet) el.target = "_blank";
  el.rel = "noopener";
});
const waText = q("[data-wa-text]");
if (waText) waText.textContent = formatWa(WHATSAPP);
const waNote = q("#waNote");
if (waNote) waNote.hidden = numberIsSet;

const yearEl = q("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   Status de scroll — barra de progresso
   --------------------------------------------------------- */
const progress = q("#progress");
const toTop = q("#toTop");

function setGlobalProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  progress.style.setProperty("--p", p.toFixed(4));
}

/* ---------------------------------------------------------
   Scroller — sequência de frames em <canvas>
   O mp4 roda UMA vez escondido no load e cada quadro é
   recortado para um array de <Image>; o scrub (GSAP +
   ScrollTrigger, scrub:true) só DESENHA frames no canvas via
   drawImage — determinístico, avança e volta, sem seeks de
   vídeo (o currentTime do mp4 não entra mais no efeito).
   --------------------------------------------------------- */
const cine = q(".cine");
const stage = q(".cine__stage");
const video = q("#cineVideo");
const cineTime = q("#cineTime");
const cineFallback = q("#cineFallback");
const cineLoader = q("#cineLoader");
const cineNum = q("#cineNum");
const cineLabel = q("#cineLabel");
const cineBig = q("#cineBig");
const cineSub = q("#cineSub");
const cineCount = q("#cineCount");

const STAGES = [
  [0, 0.33, {
    num: "01",
    label: "Diagnóstico",
    big: "Antes de trocar peça, a gente descobre o problema.",
    sub: "Leitura, teste e análise para chegar na causa certa.",
  }],
  [0.33, 0.66, {
    num: "02",
    label: "Bancada",
    big: "É aqui que o serviço acontece de verdade.",
    sub: "Motor aberto, peça por peça, medida por medida, sem atalho.",
  }],
  [0.66, 1, {
    num: "03",
    label: "Entrega",
    big: "Não sai da oficina sem está pronto.",
    sub: "Montagem, conferência e teste final antes de voltar para a rua.",
  }],
];

let dur = 0;
let lastLabel = -1;
let lastStage = -1;
let seq = [];
let canvas = null;
let ctx2d = null;
let lastIdx = -1;
let vw = 0;
let vh = 0;
let dpr = 1;
let scrubReady = false;
let frameTime = (i) =>
  dur > 0 && seq.length > 1 ? (i / (seq.length - 1)) * dur : 0;

function fmt(t) {
  if (!Number.isFinite(t)) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setStageFor(t) {
  const fraction = dur > 0 ? t / dur : 0;
  let found = -1;
  for (let i = 0; i < STAGES.length; i++) {
    const [lo, hi] = STAGES[i];
    if (fraction >= lo && fraction <= hi) {
      found = i;
      break;
    }
  }
  if (found === -1 || found === lastStage) return;
  lastStage = found;
  const s = STAGES[found][2];
  cineNum.textContent = s.num;
  cineLabel.textContent = s.label;
  cineBig.textContent = s.big;
  cineSub.textContent = s.sub;
  cineCount.textContent = `${s.num} / ${String(STAGES.length).padStart(2, "0")}`;
  qAll(".cine__meta, .cine__scene").forEach((el) => {
    el.classList.remove("is-swap");
    void el.offsetWidth;
    el.classList.add("is-swap");
  });
}

function status(sec) {
  if (Math.abs(sec - lastLabel) > 0.025) {
    lastLabel = sec;
    cineTime.textContent = `${fmt(sec)} / ${fmt(dur)}`;
  }
  setStageFor(sec);
}

video.addEventListener("loadedmetadata", () => {
  dur = video.duration;
  cineTime.textContent = `${fmt(0)} / ${fmt(dur)}`;
});
video.addEventListener("error", () => {
  cineFallback.hidden = false;
  cineTime.textContent = "vídeo indisponível";
});

/* Canvas: viewport × DPR (sem cap) — backing store em resolução real. */
function makeCanvas() {
  canvas = document.createElement("canvas");
  canvas.className = "cine__canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.tabIndex = -1;
  stage.prepend(canvas);
  ctx2d = canvas.getContext("2d");
  sizeCanvas();
  window.addEventListener("resize", () => {
    const nw = Math.max(1, stage.clientWidth);
    const nh = Math.max(1, stage.clientHeight);
    if (nw === vw && nh === vh) return;
    sizeCanvas();
    if (lastIdx >= 0) requestPaint();
  });
}

function sizeCanvas() {
  vw = Math.max(1, stage.clientWidth);
  vh = Math.max(1, stage.clientHeight);
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
}

/* Cache deslizante + pré-load por janela (memória contida):
   frames full-res decodificados sob demanda ao redor do índice atual —
   prioridade para o atual, depois alternando frente/trás — e os que saem
   da janela são descartados (bitmap.close()). No máximo um drawImage por
   rAF (coalescido). */
const bitCache = new Map();
const decoding = new Map();
const queued = new Set();
const decodeQueue = [];
const RADIUS = 18;   // janela de pré-load (índices)
const CACHE_R = 26;  // retém decodificados
const NEAR = 16;     // busca de bitmaps próximos: não congela o quadro
const MAX_ACTIVE = 3;
let activeDecodes = 0;
let pumpScheduled = false;
let winCenter = -1;

function evictWindow(i) {
  const lo = i - CACHE_R;
  const hi = i + CACHE_R;
  for (const k of [...bitCache.keys()]) {
    if (k < lo || k > hi) {
      const b = bitCache.get(k);
      bitCache.delete(k);
      try { if (b && b.close) b.close(); } catch (err) {}
    }
  }
}

function enqueue(k) {
  if (k < 0 || k >= seq.length) return;
  if (bitCache.has(k) || decoding.has(k) || queued.has(k)) return;
  queued.add(k);
  decodeQueue.push(k);
}

/* Enfileira a janela alternando: atual, +1, -1, +2, -2… (serve ida e volta). */
function enqueueWindow(i) {
  enqueue(i);
  for (let d = 1; d <= RADIUS; d++) {
    enqueue(i + d);
    enqueue(i - d);
  }
}

function pump() {
  if (pumpScheduled) return;
  pumpScheduled = true;
  requestAnimationFrame(() => {
    pumpScheduled = false;
    while (activeDecodes < MAX_ACTIVE && decodeQueue.length) {
      const i = decodeQueue.shift();
      if (decoding.has(i) || bitCache.has(i)) { queued.delete(i); continue; }
      activeDecodes++;
      decoding.set(i, true);
      queued.delete(i);
      (async () => {
        let bmp = null;
        try {
          const im = new Image();
          im.src = seq[i];
          if (im.decode) await im.decode();
          bmp = await createImageBitmap(im);
        } catch (err) {
          bmp = null;
        }
        decoding.delete(i);
        activeDecodes--;
        if (bmp) bitCache.set(i, bmp);
        if (lastIdx >= 0 && Math.abs(lastIdx - i) <= 1) requestPaint();
        if (bmp) evictWindow(lastIdx);
        pump();
      })();
    }
  });
}

function waitBitmap(i) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function chk() {
      if (bitCache.has(i) || Date.now() - t0 > 6000) return resolve();
      setTimeout(chk, 30);
    })();
  });
}

/* Desenho coalescido: no máximo um drawImage por rAF (nada de múltiplos
   desenhos no mesmo frame — o alvo são os últimos pedidos). */
let paintScheduled = false;
function requestPaint() {
  if (paintScheduled) return;
  paintScheduled = true;
  requestAnimationFrame(() => {
    paintScheduled = false;
    paint();
  });
}

/* Durante scroll rápido, se o frame-alvo ainda está decodificando, usa o
   bitmap decodificado mais próximo — o movimento nunca congela. */
function nearestPaintable(i) {
  for (let d = 1; d <= NEAR; d++) {
    const f = bitCache.get(i + d);
    if (f) return f;
    const b = bitCache.get(i - d);
    if (b) return b;
  }
  return null;
}

/* DrawImage com corte central (object-fit: cover), smoothing high,
   resolução nativa do vídeo × DPR. Um único drawImage por paint. */
function paint() {
  if (!ctx2d || lastIdx < 0) return;
  const i = lastIdx;
  let bmp = bitCache.get(i);
  if (!bmp) bmp = nearestPaintable(i);
  if (!bmp) return;
  const scale = Math.max(vw / bmp.width, vh / bmp.height);
  const dw = bmp.width * scale;
  const dh = bmp.height * scale;
  ctx2d.imageSmoothingEnabled = true;
  try { ctx2d.imageSmoothingQuality = "high"; } catch (err) {}
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.clearRect(0, 0, vw, vh);
  ctx2d.drawImage(bmp, (vw - dw) / 2, (vh - dh) / 2, dw, dh);
  status(frameTime(i));
}

/* Só avança quando o índice realmente muda; recalcula a janela e desenha. */
function drawIndex(i) {
  if (!ctx2d) return;
  if (i === lastIdx) return;
  lastIdx = i;
  if (winCenter === -1 || Math.abs(i - winCenter) > 10) {
    winCenter = i;
    for (const k of [...queued]) {
      if (Math.abs(k - i) > RADIUS) {
        queued.delete(k);
        const p = decodeQueue.indexOf(k);
        if (p > -1) decodeQueue.splice(p, 1);
      }
    }
  }
  evictWindow(i);
  enqueueWindow(i);
  pump();
  requestPaint();
}

/* Extrai os quadros na resolução ORIGINAL do vídeo, em WebP alta qualidade
   (fallback JPEG), tocando o mp4 uma vez a ~30fps, invisível. */
function captureFrames() {
  return new Promise((resolve) => {
    const fw = Math.max(2, video.videoWidth);
    const fh = Math.max(2, video.videoHeight);
    const cap = document.createElement("canvas");
    cap.width = fw;
    cap.height = fh;
    const c = cap.getContext("2d");
    const type = (() => {
      try {
        const probe = document.createElement("canvas").toDataURL("image/webp", 0.92);
        return probe.indexOf("data:image/webp") === 0 ? "image/webp" : "image/jpeg";
      } catch (err) {
        return "image/jpeg";
      }
    })();
    const quality = type === "image/webp" ? 0.92 : 0.88;
    const frames = [];
    const baseEnd = Number.isFinite(video.duration)
      ? video.duration
      : video.seekable && video.seekable.length
        ? video.seekable.end(0)
        : 10;
    const end = Math.max(0.05, baseEnd - 0.06);
    const iv = setInterval(() => {
      if (video.readyState >= 2) {
        c.drawImage(video, 0, 0, fw, fh);
        frames.push(cap.toDataURL(type, quality));
      }
      if (video.currentTime >= end || video.ended || frames.length >= 420) {
        clearInterval(iv);
        resolve(frames);
      }
    }, 1000 / 30);

    video.currentTime = 0;
    video.muted = true;
    const p = video.play();
    if (p) p.catch(() => resolve(frames));
  });
}

/* Pré-carrega todos os frames antes do scrub ficar ativo. */
async function initScrub() {
  if (reduced || scrubReady || video.readyState < 2) return;
  scrubReady = true;
  try { video.pause(); } catch (err) {}
  cineLoader.hidden = false;
  try { video.style.visibility = "hidden"; } catch (err) {}

  let frames = [];
  try { frames = await captureFrames(); } catch (err) {}
  try { video.pause(); } catch (err) {}

  if (frames.length < 12) {
    cineLoader.hidden = true;
    try { video.style.visibility = ""; } catch (err) {}
    video.style.display = "";
    cineFallback.hidden = false;
    cineTime.textContent = "vídeo indisponível";
    return;
  }
  seq = frames;
  dur = video.duration;
  cineTime.textContent = `${fmt(0)} / ${fmt(dur)}`;
  makeCanvas();
  video.style.display = "none";
  cineLoader.hidden = true;
  canvas.hidden = false;
  for (let k = 0; k < Math.min(18, seq.length); k++) enqueue(k);
  pump();
  await waitBitmap(0);
  drawIndex(0);

  gsap.registerPlugin(ScrollTrigger);
  const proxy = { i: 0 };
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: cine,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: () => status(frameTime(proxy.i)),
    },
  });
  tl.to(proxy, {
    i: seq.length - 1,
    duration: 1,
    ease: "none",
    onUpdate: () => {
      const i = Math.max(0, Math.min(seq.length - 1, Math.round(proxy.i)));
      if (i !== lastIdx) drawIndex(i);
    },
  });

  window.__cine = {
    n: () => seq.length,
    idx: () => lastIdx,
    t: () => frameTime(lastIdx),
    cache: () => bitCache.size,
    paint: () => paintScheduled,
    tl,
    st: tl.scrollTrigger,
  };
}

video.addEventListener("canplay", initScrub, { once: true });

/* -------- Scroll: progresso global + botão "voltar ao topo" ---------- */

/* Parallax sutil: o conteúdo do hero deriva suavemente ao sair da tela e
   as fotos da oficina se movem dentro da moldura (corte central). */
const heroFx = q(".hero__fx");
const heroEl = q(".hero");
const plates = qAll(".plate");

function parallax() {
  if (reduced) return;
  if (heroFx) {
    const f = Math.min(1, Math.max(0, window.scrollY / (heroEl ? heroEl.offsetHeight : 1)));
    heroFx.style.transform = `translate3d(0, ${(-f * 70).toFixed(1)}px, 0)`;
  }
  const vh = window.innerHeight;
  for (const pl of plates) {
    const r = pl.getBoundingClientRect();
    if (r.bottom < -60 || r.top > vh + 60) continue;
    const d = Math.max(-30, Math.min(30, (r.top + r.height / 2 - vh / 2) * -0.045));
    const img = pl.querySelector("img");
    if (img) img.style.transform = `translate3d(0, ${d.toFixed(1)}px, 0)`;
  }
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    setGlobalProgress();
    parallax();
    toTop.hidden = window.scrollY < 1200;
  });
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------------
   Retorna ao topo
   --------------------------------------------------------- */
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

/* ---------------------------------------------------------
   Entrada única do hero
   --------------------------------------------------------- */
qAll([".hero__title", ".hero__sub", ".hero__actions"]).forEach((el) => el.classList.add("reveal"));

/* ---------------------------------------------------------
   Revelações ao rolar
   --------------------------------------------------------- */
function reveal(el) {
  if (reduced) {
    el.classList.add("is-in");
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        el.classList.add("is-in");
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
  );
  io.observe(el);
}

qAll(".reveal").forEach(reveal);

/* ---------------------------------------------------------
   Tecnologias — um bloco por vez (Scanner ⇄ Equipamentos)
   --------------------------------------------------------- */
const techSlides = qAll("[data-tech-slide]");
const techDots = qAll("[data-tech-dot]");
const techPrev = q("[data-tech-prev]");
const techNext = q("[data-tech-next]");
let techIdx = 0;

function paintTech() {
  techSlides.forEach((s, i) => s.classList.toggle("is-on", i === techIdx));
  techDots.forEach((d, i) => {
    const active = i === techIdx;
    d.classList.toggle("is-on", active);
    if (active) d.setAttribute("aria-current", "true");
    else d.removeAttribute("aria-current");
  });
}

if (techPrev) {
  techPrev.addEventListener("click", () => {
    techIdx = (techIdx - 1 + techSlides.length) % techSlides.length;
    paintTech();
  });
}
if (techNext) {
  techNext.addEventListener("click", () => {
    techIdx = (techIdx + 1) % techSlides.length;
    paintTech();
  });
}
techDots.forEach((d, i) =>
  d.addEventListener("click", () => {
    techIdx = i;
    paintTech();
  })
);