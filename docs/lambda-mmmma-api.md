# Lambda MMMMA API

## Estrutura minima

Arquivos:

- `lambda/mmmma-api/index.mjs`
- `lambda/mmmma-api/package.json`

## Endpoints prontos

Este starter responde:

- `GET /health`
- `GET /v1/admin/database-overview`
- `POST /v1/newsletter/subscriptions`
- `POST /v1/contact-messages`
- `POST /v1/fighter-applications`
- `POST /v1/partner-inquiries`
- `POST /v1/fantasy/entries`
- `POST /v1/event-fighter-access/session`
- `POST /v1/event-fighter-intakes`

## Env na Lambda

Obrigatorias:

```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/mmmma
DATABASE_SSL_MODE=require
INTERNAL_API_BEARER_TOKEN=gere-um-token-longo-e-aleatorio
APP_ENCRYPTION_KEY=gere-um-segredo-longo-e-aleatorio
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

Overview do admin:

```bash
curl -i https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/admin/database-overview \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Accept: application/json'
```

Login:

```bash
curl -i https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/event-fighter-access/session \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"email":"lutador@dominio.com","password":"senha","next":"/atletas-da-edicao"}'
```

Intake:

```bash
curl -i https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/event-fighter-intakes \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"payload":{"fullName":"Nome do Atleta","nickname":"Nome de luta","cpf":"000.000.000-00","birthDate":"1990-01-01","pixKeyType":"cpf","pixKey":"000.000.000-00","hasHealthInsurance":false,"healthInsuranceProvider":"","email":"atleta@dominio.com","phoneWhatsapp":"85999999999","record":"10-2","category":"Peso leve","height":"1,78 m","reach":"1,84 m","tapologyLink":"https://www.tapology.com/fightcenter/fighters/exemplo","instagramLink":"https://www.instagram.com/exemplo/","city":"Fortaleza","education":"Ensino medio completo","team":"Equipe Exemplo","fightGraduations":"Faixa preta de jiu-jitsu","coachContact":"85999990000","managerContact":"85999990001","cornerOne":"Corner principal","cornerTwo":"Corner secundario","primarySpecialty":"Boxe","additionalSpecialties":"Muay Thai","competitionHistory":"Historico...","titlesWon":"Titulos...","lifeStory":"Historia...","funnyStory":"Historia engraçada...","curiosities":"Curiosidades...","hobbies":"Hobbies...","source":"money-moicano-atletas-da-edicao","accessEmail":"atleta@dominio.com"},"photos":[]}'
```

## Proximo passo no Vercel

Configurar:

```bash
UPSTREAM_API_BASE_URL=https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws
UPSTREAM_API_BEARER_TOKEN=mesmo-token-da-lambda
UPSTREAM_ADMIN_DATABASE_OVERVIEW_PATH=/v1/admin/database-overview
EVENT_FIGHTER_PORTAL_ENABLED=true
EVENT_FIGHTER_ACCESS_AUTH_MODE=shared_password
ATHLETE_FORM_PASSWORD=<senha-compartilhada>
ATHLETE_FORM_SESSION_SECRET=<segredo-do-cookie>
UPSTREAM_EVENT_FIGHTER_INTAKE_PATH=/v1/event-fighter-intakes
UPSTREAM_FANTASY_ENTRY_PATH=/v1/fantasy/entries
```

Para manter a RDS privada no Vercel:

- remova `DATABASE_URL` do projeto na Vercel
- mantenha no Vercel as credenciais de escrita do R2, porque as fotos sobem primeiro para o bucket
- a Lambda fica responsavel apenas por gravar a ficha e os metadados no Postgres
