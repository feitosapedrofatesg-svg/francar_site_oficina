# Francar — Resumo da conversa

Site one-page da Francar (oficina mecânica, Palmas/TO). Este arquivo resume o que foi
feito com o assistente, para retomada rápida em sessões futuras.

## Comandos no projeto
- Build: `npm run build` (saída em `dist/`) — ~1-2s
- Preview local: `vite preview` em `http://127.0.0.1:4173/` (serve o `dist/`)
- Dependências: `animejs`, `motion` (não usados), `gsap` + `ScrollTrigger` (usados)

## Efeito de vídeo em scroll (seção `.cine`)
- **Abordagem**: sequência de frames desenhada em `<canvas>` (não usa `currentTime`
  do vídeo — essa solução foi abandonada por só atualizar ao soltar o scroll).
- `src/main.js` → `captureFrames()`: extrai os frames do `public/motor.mp4` via
  `drawImage` num canvas com a resolução **nativa** do vídeo (1280×720) e codifica
  `toDataURL("image/webp", 0.92)` (fallback JPEG 0.88), ~30fps de amostragem;
  fim = duração com buffer de 0,06s; se faltar frame, o quadro anterior fica.
- **Qualidade**: DPR real do dispositivo (sem limite) no canvas, `object-fit: cover`,
  `imageSmoothingQuality = "high"`. Nada foi reduzido para ganhar desempenho.
- **Fluidez (otimização final já aplicada)**:
  - 1 `drawImage` por rAF (paint coalescido via `requestAnimationFrame`);
  - `nearestPaintable()`: em scroll rápido usa o frame decodificado mais próximo
    (±16) — o movimento não congela e assenta no alvo exato ao parar;
  - redraw só quando o índice muda (`drawIndex` + guarda no `onUpdate`);
  - pré-load alternando frente/trás (`i, i+1, i-1, i+2…`);
  - cache deslizante: decodifica janela ±18, retém ±26, evicta com `bitmap.close()`;
  - resize só recalcula se o tamanho do stage mudou;
  - diagnóstico via console: `window.__cine` → `n()`, `idx()`, `t()`, `cache()`.
- Se `< 12` frames capturados → fallback: vídeo estático visível (loader some).
- ScrollTrigger: trigger `.cine`, `start: "top top"`, `end: "bottom bottom"`,
  `scrub: true`.

## Mudanças já feitas
1. **Reconstrução completa** do site (HTML, CSS, JS do zero, visual/parallax).
2. **Troca de fotos**: o conteúdo de `public/logo.jpeg` e `public/owner-landscape.jpeg`
   foi trocado entre si — agora `logo.jpeg` = 1600×1066 (logo, header/footer) e
   `owner-landscape.jpeg` = 1066×1600 (retrato do dono: about/cine/poster).
3. **Percurso do scroll do vídeo**: `.cine { height: 450vh }` (antes 300vh) →
   ~3150px de rolagem para atravessar os frames (ajustável nesse único valor do CSS).
4. **Vídeo cortado para 8s**: `public/motor.mp4` agora tem só os primeiros 8 segundos
   (era 10s). Corte com ffmpeg sem re-encode (`-c copy` — qualidade idêntica),
   arquivo 2,3MB. Obs.: disco estava 100% cheio; liberados ~3,7GB de perfis Chrome
   antigos em `/tmp/opencode`.
5. **Seção de contato atualizada** (`index.html` + `WHATSAAP` em `src/main.js`):
   - WhatsApp: `5563992307887` → exibido `(63) 99230-7887`, links `wa.me/…` com
     mensagem pré-preenchida, abre em nova aba;
   - Endereço: Q. 812 Sul, Alameda 1, 437 – Arse · Palmas – TO, 77023-132;
   - Atendimento: Seg–Sex 08h–19h · Sáb 08h–12h · Dom fechado.

## Testes/verificação
- Verificação automatizada via Chrome headless (CDP) com scripts em
  `/tmp/opencode/*.mjs`: scroll de scrub determinístico ida/volta (ex.: 1 → 12 → 1),
  canvas 2850×1800 a DPR 2, smoothing high, 0 erros de console, overflow sem
  horizontal.
- Em headless o encode WebP é por software e lento (~50-60 frames no vídeo de 8s);
  no Chrome real com encode hardware o esperado é ~200-300 frames.
- Arquivos principais: `index.html`, `src/main.js`, `src/style.css`, `public/`.

## Observações
- Testar no navegador real com **Ctrl+Shift+R** (hard refresh).
- O assistente não enxerga imagens — qualquer conferência visual de foto é feita
  pelo usuário.