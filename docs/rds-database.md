# RDS Database Blueprint

Este projeto agora tem uma migration base em [db/migrations/0001_rds_postgres.sql](/Users/naassom/Documents/mmmma/db/migrations/0001_rds_postgres.sql) pensada para PostgreSQL em RDS com:

- separacao entre dominio (`app`) e auditoria (`audit`)
- roles de banco por superficie de acesso
- RLS forzado em todas as tabelas sensiveis do dominio
- trilha de auditoria por trigger
- criptografia em nivel de coluna para `cpf` e `pix`
- indices e constraints alinhados com os fluxos atuais do produto

## O que o schema cobre

- newsletter
- formulario publico de atletas interessados
- formulario de patrocinadores
- usuarios internos e sessoes auditaveis
- eventos, atletas, card, resultados e regras do fantasy
- inscricoes do fantasy com token opaco de consulta privada
- area privada de atletas confirmados, com intake e fotos

## Roles recomendadas

O SQL cria roles de grupo sem login:

- `mmmma_public_api`
- `mmmma_backoffice`
- `mmmma_fighter_portal`
- `mmmma_auditor`
- `mmmma_service`

O ideal em producao e criar usuarios/login separados na RDS herdando dessas roles. Isso deixa a aplicacao com pools distintos por superficie:

- publico
- admin/backoffice
- portal de atleta
- jobs internos
- auditoria/BI

Se tudo rodar com uma unica credencial de banco, a modelagem continua util, mas voce perde uma parte importante da defesa em profundidade.

## Contexto de request para RLS

O RLS depende de contexto por transacao. Antes de consultar ou gravar, a aplicacao deve abrir transacao e chamar:

```sql
select app.set_request_context(
  p_actor_id := '00000000-0000-0000-0000-000000000000',
  p_actor_role := 'fighter',
  p_actor_email := 'lutador@dominio.com',
  p_fantasy_entry_id := null,
  p_request_id := 'req_123',
  p_client_ip := '203.0.113.10',
  p_origin := 'https://moneymoicano.com',
  p_user_agent := 'Mozilla/5.0'
);
```

No fim da unidade de trabalho, limpe o contexto:

```sql
select app.clear_request_context();
```

Fluxos que dependem disso:

- portal do atleta: `p_actor_id` deve ser o `accounts.id` do atleta autenticado
- consulta privada do fantasy: depois de validar o token opaco, defina `p_fantasy_entry_id`
- backoffice: use `p_actor_id` e `p_actor_role` do usuario interno para auditoria consistente

## Criptografia de CPF e Pix

As colunas sensiveis do intake usam `pgcrypto`. Para inserir ou ler esses campos, a conexao precisa setar uma chave por transacao:

```sql
select set_config('app.encryption_key', '<segredo-longo-e-aleatorio>', true);
```

Insercao segura:

```sql
insert into app.event_fighter_intakes (
  event_fighter_id,
  full_name,
  nickname,
  email,
  phone_whatsapp,
  birth_date,
  cpf_ciphertext,
  cpf_digest,
  cpf_last4,
  pix_key_type,
  pix_key_ciphertext,
  pix_key_digest,
  pix_key_last4,
  has_health_insurance,
  health_insurance_provider,
  record_summary,
  category,
  height,
  reach,
  city,
  state_code,
  education_level,
  team,
  coach_name,
  fight_graduations,
  tapology_profile,
  instagram_profile,
  coach_contact,
  manager_name,
  manager_contact,
  corner_one_name,
  corner_two_name,
  primary_specialty,
  additional_specialties,
  competition_history,
  titles_won,
  life_story,
  funny_story,
  curiosities,
  hobbies,
  source
) values (
  $1,
  $2,
  $3,
  app.normalize_email_text($4),
  $5,
  $6,
  app.encrypt_secret($7),
  app.secret_digest(app.digits_only($7)),
  app.last_four_digits($7),
  $8,
  app.encrypt_secret($9),
  app.secret_digest($9),
  app.last_four_digits($9),
  $10,
  $11,
  $12,
  $13,
  $14,
  $15,
  $16,
  $17,
  $18,
  $19,
  $20,
  $21,
  $22,
  $23,
  $24,
  $25,
  $26,
  $27,
  $28,
  $29,
  $30,
  $31,
  $32,
  $33,
  $34,
  $35,
  $36,
  $37
);
```

Leitura administrativa:

```sql
select
  app.decrypt_secret(cpf_ciphertext) as cpf,
  app.decrypt_secret(pix_key_ciphertext) as pix_key
from app.event_fighter_intakes
where id = $1;
```

## Auditoria

Toda tabela sensivel recebe trigger de auditoria em `audit.logged_actions`.

O log guarda:

- tabela e schema
- operacao (`I`, `U`, `D`)
- chave primaria
- colunas alteradas
- snapshot antigo/novo com colunas sensiveis removidas
- ator autenticado
- request id
- ip, origem e user agent
- timestamp e transaction id

Observacao importante:

- a auditoria remove campos como `password_hash`, `token_hash`, `cpf_ciphertext`, `pix_key_ciphertext`, `email` e `phone` das tabelas mais sensiveis
- a tabela `audit.logged_actions` fica protegida por grants, nao por RLS, para nao atrapalhar a escrita do trigger

## Fantasy

O schema deixa o fantasy pronto para persistencia real:

- `app.events`
- `app.fighters`
- `app.event_fighters`
- `app.fights`
- `app.fight_results`
- `app.fantasy_scoring_profiles`
- `app.fantasy_entries`
- `app.fantasy_picks`
- `app.fantasy_entry_access_tokens`

Pontos importantes:

- score e `perfect_picks_cached` sao recalculados por trigger quando pick ou resultado muda
- a inscricao publica so entra se o evento estiver `published` e antes de `lock_at`
- a leitura publica do ranking usa grants de coluna em `app.fantasy_entries`, sem expor email/whatsapp/cidade
- a consulta privada das picks depende de `p_fantasy_entry_id` no contexto da transacao
- o schema normaliza UF em `state_code`, entao a API atual precisa converter o nome recebido no frontend para o codigo da tabela `app.brazilian_states`

## Auth interna e portal

O schema inclui:

- `app.accounts`
- `app.auth_sessions`

Isso permite sair do modelo atual de senha compartilhada para atletas. A recomendacao e migrar para:

- conta por atleta confirmado
- sessao opaca com hash persistido em `app.auth_sessions`
- cookie HttpOnly apontando para um token que nunca e salvo em claro no banco

## Ordem de rollout

1. Criar a instancia/cluster PostgreSQL na RDS com SSL obrigatorio.
2. Aplicar a migration `0001_rds_postgres.sql`.
3. Criar usuarios/login na RDS herdando das roles de grupo.
4. Configurar a aplicacao para usar pools separados por superficie.
5. Em cada request, abrir transacao e chamar `app.set_request_context(...)`.
6. No fluxo de intake, setar `app.encryption_key` por transacao.
7. Substituir o upstream atual pelos inserts/selects reais no Postgres.
8. Migrar o login do portal de atleta e do admin para `app.accounts` + `app.auth_sessions`.

## Env da aplicacao

Com a integracao direta ativada no app, o caminho principal passa a ser:

- `DATABASE_URL`
- `DATABASE_POOL_MAX_CONNECTIONS`
- `DATABASE_SSL_MODE`
- `APP_ENCRYPTION_KEY`

O ideal e que `DATABASE_URL` aponte para um login herdando pelo menos a role `mmmma_service`.
Isso permite a aplicacao ler/escrever pelos fluxos atuais sem depender do upstream legado.

Para o intake privado com fotos, alem do banco tambem existe dependencia de bucket S3-compatível:

- `FIGHTER_PHOTOS_STORAGE_PROVIDER`
- `FIGHTER_PHOTOS_S3_BUCKET`
- `FIGHTER_PHOTOS_S3_REGION`
- `FIGHTER_PHOTOS_S3_ENDPOINT` (opcional para R2/S3 compativel)
- `FIGHTER_PHOTOS_S3_ACCESS_KEY_ID`
- `FIGHTER_PHOTOS_S3_SECRET_ACCESS_KEY`
- `FIGHTER_PHOTOS_S3_FORCE_PATH_STYLE`
- `NEXT_PUBLIC_SITE_ASSET_BASE_URL` (dominio publico dos assets no R2/CDN)

Observacoes praticas:

- sem `DATABASE_URL`, os formularios publicos ainda podem cair no upstream legado se ele estiver configurado
- sem bucket configurado, o intake de atleta nao consegue persistir as fotos no fluxo direto
- sem `APP_ENCRYPTION_KEY`, CPF e Pix do intake nao podem ser gravados pelo schema atual
- em deploy serverless, vale reduzir `DATABASE_POOL_MAX_CONNECTIONS` para evitar excesso de conexoes na RDS

## Seed de senha

As contas em `app.accounts` esperam `password_hash` no formato scrypt usado pela aplicacao.
Para gerar um hash compativel localmente:

```bash
npm run hash-password -- "sua-senha-forte"
```

Isso serve para popular contas `admin`, `operator` e `fighter` no seed inicial antes de testar login.

## Lacunas intencionais

Algumas escolhas ficaram propositalmente fora desta primeira migration:

- particionamento da auditoria por mes
- automacao de rotacao da chave de criptografia
- funcoes stored-procedure para todos os formularios
- views publicas prontas para leaderboard e picks privadas

Esses pontos podem entrar numa `0002` sem quebrar a base ja criada.
