# WorldCup IPTV — player web pessoal

Player IPTV pessoal, **conexão direta** ao provedor (Xtream Codes). O vídeo vai
**direto do provedor para o aparelho do espectador** — nunca passa pela sua
infraestrutura (sem restream, sem proxy de vídeo, sem transcode).

## Modelo: Admin escolhe, público assiste

- **`/worldcup/`** — página **pública**. O visitante **só assiste** o que estiver
  no ar. Sem login, sem lista de canais, sem como trocar de canal. Só tela cheia
  e fechar.
- **`/worldcup/admin.html`** — página do **admin** (protegida por chave). Você
  navega todos os canais/filmes/séries e escolhe **o que vai ao ar**. Pode
  pré-visualizar, ver em tela cheia e (em filmes) escolher legenda quando o
  navegador expõe faixas.

São **duas páginas/bundles separados**: o bundle público **não contém** nenhum
código de login/admin.

## Arquitetura

| Tráfego | Caminho |
| --- | --- |
| **Vídeo** | Provedor → **direto** → aparelho do espectador. Nunca toca sua infra. |
| **Metadados** (categorias/canais/EPG — JSON leve) | Via `/api/xtream`, um proxy **só de metadados** (resolve CORS). Recusa qualquer URL que não seja a API — não vira proxy de vídeo. Protegido pela chave de admin. |
| **"No ar"** (qual canal o admin selecionou) | Via `/api/broadcast`, um registro JSON minúsculo em KV. **Não é vídeo.** |

### ⚠️ Limite de conexões simultâneas

Como cada espectador puxa o vídeo **direto** do provedor, o número de pessoas
assistindo ao mesmo tempo é limitado pelas **conexões simultâneas do seu plano
IPTV** (normalmente 1–3). Para ~3 espectadores, contrate um plano de **3 telas**.
Servir muitos espectadores exigiria restream (sua banda) — fora do escopo deste
projeto, por escolha.

## Rodar localmente

```bash
cd Iptv
npm install
npm run dev
```

- Público: `http://localhost:5173/worldcup/`
- Admin: `http://localhost:5173/worldcup/admin.html` (chave de admin em dev: **`admin`**)

## Deploy (Cloudflare Pages — recomendado)

1. Crie um projeto no Cloudflare Pages apontando para esta pasta `Iptv/`.
   - Build command: `npm run build`
   - Output: `dist`
2. Crie um **KV namespace** e faça o binding com o nome **`IPTV_KV`**
   (Settings → Functions → KV namespace bindings).
3. Defina a variável de ambiente **`ADMIN_KEY`** com uma senha forte
   (Settings → Environment variables). É a chave do painel admin.
4. As funções em `functions/api/*` sobem automaticamente.

## Deploy (Vercel — alternativo)

- As funções ficam em `api/*`. Defina `ADMIN_KEY` nas Environment Variables.
- O estado "no ar" (`/api/broadcast`) usa Cloudflare KV; na Vercel troque por
  Vercel KV/Upstash (não incluído aqui). Para Vercel, o caminho mais simples é
  hospedar só a página pública/admin e usar o `/api/broadcast` da Cloudflare,
  ou migrar o storage.

## Onde ficam as credenciais

- A senha do **admin** (`ADMIN_KEY`) fica só no servidor (env var) e na sessão do
  seu navegador admin.
- As credenciais do **IPTV** ficam salvas só no navegador do admin
  (localStorage). A URL do canal no ar (que contém usuário/senha do IPTV) fica
  visível para quem está assistindo aquele canal — inerente ao streaming direto.
  Para uso pessoal entre poucas pessoas de confiança, ok.

## Stack

Vite + React 19 + TypeScript + hls.js. Sem backend pesado.
