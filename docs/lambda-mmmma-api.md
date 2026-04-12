# Lambda MMMMA API

## Estrutura minima

Arquivos:

- `lambda/mmmma-api/index.mjs`
- `lambda/mmmma-api/package.json`

## Primeiro endpoint pronto

Este starter responde:

- `GET /health`
- `POST /v1/event-fighter-access/session`

## Env na Lambda

Obrigatorias:

```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/mmmma
DATABASE_SSL_MODE=require
INTERNAL_API_BEARER_TOKEN=gere-um-token-longo-e-aleatorio
```

## Como publicar

Dentro de `lambda/mmmma-api`:

```bash
npm install
zip -r function.zip index.mjs package.json package-lock.json node_modules
```

Depois, na Lambda:

1. `Code`
2. `Upload from`
3. `.zip file`
4. enviar `function.zip`

## Runtime settings

No painel da Lambda, deixar:

- handler: `index.handler`
- runtime: `Node.js 20.x`

## Testes rapidos

Healthcheck:

```bash
curl https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/health
```

Login:

```bash
curl -i https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/event-fighter-access/session \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"email":"lutador@dominio.com","password":"senha","next":"/atletas-da-edicao"}'
```

## Proximo passo no Vercel

Configurar:

```bash
UPSTREAM_API_BASE_URL=https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws
UPSTREAM_API_BEARER_TOKEN=mesmo-token-da-lambda
UPSTREAM_EVENT_FIGHTER_ACCESS_PATH=/v1/event-fighter-access/session
EVENT_FIGHTER_PORTAL_ENABLED=true
```

Para forcar o portal a usar a Lambda e nao o Postgres direto no Vercel, remova `DATABASE_URL` do projeto na Vercel.
