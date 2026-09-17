# Francar · Guia de atualização

Como mexer no site da Francar depois que ele já está no ar.
Site one-page com Vite + GSAP. Online em **https://francar.vercel.app**.

---

## Roteiro rápido (o que 90% das vezes você quer)

| Quero mudar… | Faço onde |
|---|---|
| Horário, telefone, WhatsApp | `index.html` (seções hero e contato) |
| Textos dos serviços | `index.html` (seção `#servicos`) |
| Frases e etapas do vídeo | `src/main.js` (constante `STAGES`) |
| Cores | `src/style.css` (variáveis topo do arquivo) |
| Vídeo do efeito | substituir `public/motor.mp4` |
| Fotos | substituir em `public/` |

Depois de qualquer mudança:

```bash
npm run build
npx vercel --prod
```

---

## Rodar em desenvolvimento (antes de subir)

```bash
npm install        # só na primeira vez
npm run dev        # site em http://localhost:5173
```

Use **Ctrl+Shift+R** para recarregar sem usar o cache (importante depois de mudar CSS/JS).

---

## Deploy (publicar de verdade)

```bash
npm run build      # gera a pasta dist/ com o site pronto
npx vercel --prod  # envia para produção
```

- O login é feito na primeira vez (**npx vercel login**, abre o navegador).
- A URL do site é **https://francar.vercel.app** (domínio grátis do Vercel).
- Não precisa pagar hospedagem nem domínio.

---

## Como trocar o número do WhatsApp

No arquivo `src/main.js`, no topo:

```js
const WHATSAPP = "5563992307887";
```

O formato é `55` (Brasil) + DDD + número, só dígitos. Um número para
`(63) 99230-7887` fica `5563992307887`. Depois de trocar: build + deploy.

---

## Como trocar o vídeo do efeito de rolagem

O vídeo do "parallax" é `public/motor.mp4`. Para trocar:

1. Substitua o arquivo `public/motor.mp4` por um vídeo novo.
2. **Não mude o nome** (o código já aponta para `/motor.mp4`).
3. Dicas:
   - Gravação de vídeo pode ser de celular (paisagem, 16:9), fica ótimo;
   - Grave com a câmera parada, movimentos lentos da máquina;
   - Corte para uns 8 a 12 segundos dão o melhor efeito;
   - Quanto mais claro e sem bagunça o fundo, melhor a leitura dos textos.
4. Rode `npm run build` e `npx vercel --prod`.

O vídeo é cortado em quadros (~28 por segundo) pelo próprio navegador — não
precisa preparar nada além de entregar o `.mp4`.

---

## Como trocar as frases da marquee e das etapas do vídeo

As frases em movimento (rolam embaixo do topo) estão no `index.html`
(seção `marquee`). Basta editar o texto entre `<span class="marquee__phrase">`.

As 3 etapas do vídeo (Diagnóstico → Bancada → Entrega) estão em
`src/main.js`, na constante `STAGES`. Cada posição tem:

```js
[início, fim, {
  num: "01",      // número grande no vídeo
  label: "…",     // palavra pequena (Ex.: Diagnóstico)
  big: "…",       // frase grande
  sub: "…",       // subtexto
}],
```

`início` e `fim` são pontos entre 0 e 1 que definem em qual trecho da rolagem
cada etapa aparece. É só editar os textos.

---

## Como trocar as fotos

As imagens ficam em `public/` e são referenciadas pelo caminho no
`index.html` (ex.: `/owner-landscape.jpeg`). Para trocar uma foto:
mantenha o mesmo nome do arquivo e substitua o conteúdo, ou troque o
caminho no `index.html` e adicione a nova imagem em `public/`.

Imagens pesadas deixam o site lento. Antes de subir, recomendo reduzir
para no máximo ~300 KB cada (99% dos casos resolve com uma foto de
celular direto).

---

## Backup (importante!)

Toda vez que você me pedir uma mudança, o assistente gera uma **versão
final em `dist/`** e este guia. Recomendo manter este repositório GitHub
sempre atualizado com o commit — é o seu backup e o histórico de tudo.

---

## Arquivos principais

```
index.html        página inteira (textos e estrutura)
src/main.js       comportamento (scroll, vídeo, carrossel, WhatsApp)
src/style.css     aparência (cores, tamanhos, efeitos)
public/           fotos, vídeo e logo
dist/             resultado do build (o que vai para o ar)
```
