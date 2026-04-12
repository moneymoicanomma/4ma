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
DATABASE_POOL_MAX_CONNECTIONS=5
NEXT_PUBLIC_SITE_ASSET_BASE_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
ALLOWED_FORM_ORIGINS=http://localhost:3000,https://moneymoicanomma.com.br
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
```

Somente quando o portal privado dos atletas for religado:

```bash
EVENT_FIGHTER_PORTAL_ENABLED=true
APP_ENCRYPTION_KEY=<segredo-longo>
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
- `FIGHTER_PHOTOS_S3_ENDPOINT` usa o endpoint S3 compatível do R2.
- `DATABASE_POOL_MAX_CONNECTIONS=5` é um ponto de partida mais seguro para ambiente serverless do que deixar o pool alto por instância.
- O app continua salvando no banco só os metadados das fotos. Os binários seguem no bucket S3 compatível.
- `UPSTREAM_*`, `ADMIN_*` e `ATHLETE_FORM_*` ficaram fora do exemplo de propósito. Nesta arquitetura, os formulários gravam direto na RDS e a autenticação administrativa deve vir de `app.accounts` + `app.auth_sessions`.

## Checklist

1. Apontar o domínio do site para o projeto no Vercel.
2. Usar o `r2.dev` atual ou criar depois um subdomínio próprio para os assets.
3. Cadastrar todas as variáveis acima no Vercel em Production e Preview.
4. Validar upload do portal de atletas com um bucket de teste antes de religar o fluxo para produção.
5. Monitorar conexões simultâneas da RDS nos primeiros deploys.
