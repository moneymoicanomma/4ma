# Vercel + RDS + R2

Rollout recomendado para esta fase:

- frontend e rotas Next.js no Vercel
- PostgreSQL mantido na AWS RDS
- imagens públicas e fotos do intake no Cloudflare R2
- DNS e domínio geridos pela Cloudflare

## Env no Vercel

Obrigatórias agora para o site público:

```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/mmmma
DATABASE_SSL_MODE=require
DATABASE_SSL_ALLOW_INVALID_CERTIFICATES=false
DATABASE_POOL_MAX_CONNECTIONS=5
NEXT_PUBLIC_SITE_ASSET_BASE_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
ALLOWED_FORM_ORIGINS=http://localhost:3000,https://moneymoicanomma.com.br
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
```

Somente quando o portal privado dos atletas for religado:

```bash
EVENT_FIGHTER_PORTAL_ENABLED=true
EVENT_FIGHTER_ACCESS_AUTH_MODE=shared_password
ATHLETE_FORM_PASSWORD=<senha-compartilhada-com-os-atletas>
ATHLETE_FORM_SESSION_SECRET=<segredo-do-cookie-do-portal>
APP_ENCRYPTION_KEY=<segredo-longo>
UPSTREAM_API_BASE_URL=https://sua-function-url.lambda-url.us-east-2.on.aws
UPSTREAM_PUBLIC_WRITE_BEARER_TOKEN=<token-public-write-da-lambda>
UPSTREAM_PORTAL_BEARER_TOKEN=<token-portal-da-lambda>
UPSTREAM_ADMIN_READ_BEARER_TOKEN=<token-admin-read-da-lambda>
UPSTREAM_ADMIN_WRITE_BEARER_TOKEN=<token-admin-write-da-lambda>
UPSTREAM_ADMIN_DATABASE_OVERVIEW_PATH=/v1/admin/database-overview
UPSTREAM_FANTASY_EVENTS_PATH=/v1/fantasy/events
UPSTREAM_ADMIN_FANTASY_EVENTS_PATH=/v1/admin/fantasy/events
UPSTREAM_EVENT_FIGHTER_INTAKE_PATH=/v1/event-fighter-intakes
UPSTREAM_FANTASY_ENTRY_PATH=/v1/fantasy/entries
FIGHTER_PHOTOS_STORAGE_PROVIDER=r2
FIGHTER_PHOTOS_S3_BUCKET=mmmma-fighter-photos
FIGHTER_PHOTOS_S3_REGION=auto
FIGHTER_PHOTOS_S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
FIGHTER_PHOTOS_S3_ACCESS_KEY_ID=<access-key-id>
FIGHTER_PHOTOS_S3_SECRET_ACCESS_KEY=<secret-access-key>
FIGHTER_PHOTOS_S3_FORCE_PATH_STYLE=false
```

## Notas práticas

- `NEXT_PUBLIC_SITE_ASSET_BASE_URL` pode usar o `r2.dev` agora para destravar o deploy. Quando o domínio customizado do bucket estiver livre, basta trocar a env.
- `DATABASE_SSL_ALLOW_INVALID_CERTIFICATES=false` deve ficar assim em produção. Só mude para `true` temporariamente em ambiente controlado se você estiver preso a um certificado fora da cadeia confiável.
- Com `EVENT_FIGHTER_ACCESS_AUTH_MODE=shared_password`, o login do portal aceita qualquer email válido junto da senha compartilhada enviada pela equipe. Não exige pré-cadastro do atleta.
- `ATHLETE_FORM_PASSWORD` precisa ser definido explicitamente. O app não usa mais senha padrão embutida para o portal.
- `FIGHTER_PHOTOS_S3_ENDPOINT` usa o endpoint S3 compatível do R2.
- `DATABASE_POOL_MAX_CONNECTIONS=5` é um ponto de partida mais seguro para ambiente serverless do que deixar o pool alto por instância.
- O app continua salvando no banco só os metadados das fotos. Os binários seguem no bucket S3 compatível.
- `UPSTREAM_*` continua sendo usado para enviar formularios publicos, portal do atleta e leituras/escritas administrativas para a Lambda/RDS privada, agora com bearer separado por superficie.
- No modo com RDS privada, o Vercel ainda precisa das credenciais do R2 para subir as fotos primeiro no bucket. A Lambda recebe só payload e metadados, sem os binários.

## Checklist

1. Apontar o domínio do site para o projeto no Vercel.
2. Usar o `r2.dev` atual ou criar depois um subdomínio próprio para os assets.
3. Cadastrar todas as variáveis acima no Vercel em Production e Preview.
4. Validar upload do portal de atletas com um bucket de teste antes de religar o fluxo para produção.
5. Monitorar conexões simultâneas da RDS nos primeiros deploys.
