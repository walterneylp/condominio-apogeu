# Portaria Delivery Manager

Aplicação React + Vite para controle de entregas em condomínio.

## Requisitos

- Node.js 20+
- Variáveis de ambiente configuradas

## Ambiente

Crie um `.env` com base em `.env.example`.

Variáveis obrigatórias:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Variáveis de acesso administrativo:

- `VITE_ADMIN_USERNAME`
- `VITE_ADMIN_PASSWORD`
- `VITE_ADMIN_DISPLAY_NAME`

Variável opcional:

- `VITE_TELEGRAM_BOT_TOKEN`

## Login administrativo

O schema atual da tabela `usuarios` não possui colunas de credencial (`login`/`senha`). Por isso, o acesso administrativo é configurado por ambiente.

Valores padrão do projeto:

- usuário: `admin`
- senha: `1234`

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy no Coolify

Este repositório agora possui `Dockerfile` na raiz para deploy direto pelo Coolify.

Configure no serviço:

- Build Pack: `Dockerfile`
- Port: `80`
- Variáveis do `.env.example`

Se o token do Telegram não for informado, o app continua funcionando e apenas desabilita notificações/polling do bot.
