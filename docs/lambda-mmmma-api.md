# Lambda MMMMA API

## Estrutura minima

Arquivos:

- `lambda/mmmma-api/index.mjs`
- `lambda/mmmma-api/google-sheets-exports.mjs`
- `lambda/mmmma-api/package.json`

## Endpoints prontos

Este starter responde:

- `GET /health`
- `GET /v1/admin/database-overview`
- `GET /v1/google-sheets/exports/:tableKey`
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
DATABASE_SSL_ALLOW_INVALID_CERTIFICATES=false
PUBLIC_API_BEARER_TOKEN=gere-um-token-longo-so-para-formularios-publicos
PORTAL_API_BEARER_TOKEN=gere-um-token-longo-so-para-o-portal
ADMIN_READ_API_BEARER_TOKEN=gere-um-token-longo-so-para-leituras-admin
ADMIN_WRITE_API_BEARER_TOKEN=gere-um-token-longo-so-para-escritas-admin
APP_ENCRYPTION_KEY=gere-um-segredo-longo-e-aleatorio
```

Compatibilidade temporaria:

```bash
# legado: se estiver definido, ainda funciona como fallback para todas as superficies
INTERNAL_API_BEARER_TOKEN=token-legado
```

Opcional para Google Sheets com token dedicado:

```bash
GOOGLE_SHEETS_EXPORT_BEARER_TOKEN=gere-um-token-so-para-o-apps-script
GOOGLE_SHEETS_FINANCE_EXPORT_BEARER_TOKEN=gere-um-token-so-para-o-export-financeiro
```

## Como publicar

Dentro de `lambda/mmmma-api`:

```bash
npm install
zip -r function.zip index.mjs google-sheets-exports.mjs package.json package-lock.json node_modules
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

Export de uma tabela para Google Sheets:

```bash
curl -i 'https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/google-sheets/exports/event_fighter_intakes?limit=1000&offset=0' \
  -H 'Authorization: Bearer SEU_TOKEN_GOOGLE_SHEETS' \
  -H 'Accept: application/json'
```

Export financeiro dos intakes com CPF e Pix descriptografados:

```bash
curl -i 'https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws/v1/google-sheets/exports/event_fighter_intakes_financeiro?limit=1000&offset=0' \
  -H 'Authorization: Bearer SEU_TOKEN_FINANCEIRO' \
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
  -d '{"payload":{"fullName":"Nome do Atleta","nickname":"Nome de luta","cpf":"000.000.000-00","birthDate":"1990-01-01","pixKeyType":"cpf","pixKey":"000.000.000-00","hasHealthInsurance":false,"healthInsuranceProvider":"","email":"atleta@dominio.com","phoneWhatsapp":"85999999999","record":"10-2","category":"leve","height":"1,78 m","reach":"1,84 m","tapologyLink":"https://www.tapology.com/fightcenter/fighters/exemplo","instagramLink":"https://www.instagram.com/exemplo/","city":"Fortaleza","state":"Ceará","education":"Ensino medio completo","team":"Equipe Exemplo","coachName":"Nome do treinador","fightGraduations":"Faixa preta de jiu-jitsu","coachContact":"85999990000","managerName":"Nome do empresario","managerContact":"85999990001","cornerOne":"Corner principal","cornerTwo":"Corner secundario","primarySpecialty":"Boxe","additionalSpecialties":"Muay Thai","competitionHistory":"Historico...","titlesWon":"Titulos...","lifeStory":"Historia...","funnyStory":"Historia engraçada...","curiosities":"Curiosidades...","hobbies":"Hobbies...","source":"money-moicano-atletas-da-edicao","accessEmail":"atleta@dominio.com"},"photos":[]}'
```

## Proximo passo no Vercel

Configurar:

```bash
UPSTREAM_API_BASE_URL=https://rufyyaot4xzcbx4tapzd72hgoa0icnnk.lambda-url.us-east-2.on.aws
UPSTREAM_PUBLIC_WRITE_BEARER_TOKEN=<mesmo-valor-de-PUBLIC_API_BEARER_TOKEN>
UPSTREAM_PORTAL_BEARER_TOKEN=<mesmo-valor-de-PORTAL_API_BEARER_TOKEN>
UPSTREAM_ADMIN_READ_BEARER_TOKEN=<mesmo-valor-de-ADMIN_READ_API_BEARER_TOKEN>
UPSTREAM_ADMIN_WRITE_BEARER_TOKEN=<mesmo-valor-de-ADMIN_WRITE_API_BEARER_TOKEN>
UPSTREAM_ADMIN_DATABASE_OVERVIEW_PATH=/v1/admin/database-overview
EVENT_FIGHTER_PORTAL_ENABLED=true
EVENT_FIGHTER_ACCESS_AUTH_MODE=shared_password
ATHLETE_FORM_PASSWORD=<senha-compartilhada>
ATHLETE_FORM_SESSION_SECRET=<segredo-do-cookie>
UPSTREAM_FANTASY_EVENTS_PATH=/v1/fantasy/events
UPSTREAM_ADMIN_FANTASY_EVENTS_PATH=/v1/admin/fantasy/events
UPSTREAM_EVENT_FIGHTER_INTAKE_PATH=/v1/event-fighter-intakes
UPSTREAM_FANTASY_ENTRY_PATH=/v1/fantasy/entries
```

Para manter a RDS privada no Vercel:

- remova `DATABASE_URL` do projeto na Vercel
- mantenha no Vercel as credenciais de escrita do R2, porque as fotos sobem primeiro para o bucket
- a Lambda fica responsavel apenas por gravar a ficha e os metadados no Postgres
