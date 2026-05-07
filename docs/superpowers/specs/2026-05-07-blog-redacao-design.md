# Blog e Redacao Design

## Contexto

O Money Moicano MMA precisa de um blog profissional com uma area de redacao dentro do proprio site. O projeto atual ja usa Next.js App Router, uma area administrativa, autenticacao por credenciais de ambiente, Postgres/RDS, sitemap/robots dinamicos e upload S3/R2 para fotos dos atletas.

O blog deve melhorar a presenca organica no Google e em experiencias de busca/consulta por LLMs, sem depender de um CMS externo.

## Objetivos

- Criar uma area publica de blog em `/blog`.
- Criar posts publicos em `/blog/[slug]`.
- Criar paginas publicas de tags em `/blog/tags/[tag]`.
- Criar uma area privada de redacao em `/admin/blog`.
- Permitir que `admin` e `editor` criem, editem, publiquem e despubliquem posts.
- Permitir login do `editor` por usuario e senha definidos em variaveis de ambiente.
- Suportar upload direto de imagem de capa para R2/S3.
- Gerar saidas otimizadas para Google: metadata, canonical, sitemap, imagens, schema e HTML semantico.
- Gerar saidas limpas para LLMs: `/llms.txt` e Markdown publico por post publicado em `/blog/[slug].md`.

## Fora de Escopo Inicial

- Agendamento de publicacao.
- Revisao/aprovacao separada entre redator e editor.
- Categorias hierarquicas.
- Comentarios publicos.
- CMS externo.
- Newsletter automatica para posts.
- Editor MDX puro.

## Permissoes

Adicionar o papel `editor` ao backoffice.

O `admin` pode:

- Acessar todas as areas administrativas ja permitidas hoje.
- Acessar a redacao.
- Criar, editar, publicar, despublicar e destacar posts.

O `editor` pode:

- Fazer login pelo fluxo normal de `/admin/login`.
- Acessar somente a area de blog/redacao.
- Criar, editar, publicar, despublicar e destacar posts.

O `editor` nao pode:

- Acessar Fantasy admin.
- Acessar banco/admin database.
- Acessar areas operacionais de atletas, parceiros ou leads.

As credenciais de `editor` devem ser aceitas pelo mecanismo de ambiente existente por meio de `ADMIN_EDITOR_USERNAME` e `ADMIN_EDITOR_PASSWORD`. `ADMIN_CREDENTIALS_JSON` tambem deve aceitar `role: "editor"` para manter o formato flexivel ja existente.

## Arquitetura

Usar CMS proprio sobre a stack existente:

- Next.js App Router para paginas publicas, rotas administrativas e metadata dinamica.
- Postgres para posts, tags, relacao post/tag, midias e redirecionamentos de slug.
- R2/S3 para imagens de capa e imagens inseridas no corpo.
- Rotas API server-side para criar/editar posts, salvar blocos, publicar/despublicar, gerenciar tags e gerar URLs assinadas de upload.
- Renderizacao publica baseada apenas em posts com status `published`.

## Modelo de Dados

### Posts

Cada post deve armazenar:

- `id`.
- `title`.
- `slug`.
- `description`.
- `cover_media_id`.
- `cover_alt_text`.
- `cover_caption`.
- `author_name`, padrao `Equipe Money Moicano MMA`.
- `status`: `draft` ou `published`.
- `is_featured`.
- `content_blocks` em JSONB, mantendo ordem e tipo dos blocos.
- `seo_title`.
- `seo_description`.
- `canonical_url_override`.
- `noindex`.
- `internal_keywords`.
- `social_title`.
- `social_description`.
- `social_media_id`.
- `word_count`.
- `reading_time_minutes`.
- `created_at`.
- `updated_at`.
- `published_at`.
- `created_by`.
- `updated_by`.

### Tags

Tags sao livres e reaproveitaveis:

- O editor digita tags no post.
- Tags novas sao criadas automaticamente.
- Tags existentes aparecem como sugestao/autocomplete.
- Cada tag tem nome normalizado e slug publico.

### Midia

Midias devem armazenar:

- `id`.
- `storage_bucket`.
- `object_key`.
- `public_url`.
- `original_file_name`.
- `content_type`.
- `byte_size`.
- `width`.
- `height`.
- `alt_text`.
- `caption`.
- `created_at`.
- `created_by`.

### Slug Redirects

Se um post publicado tiver slug alterado, registrar redirecionamento permanente do slug antigo para o novo para preservar SEO.

## Campos e Validacoes

Campos editoriais:

- Titulo publico.
- Slug editavel gerado do titulo.
- Descricao/resumo curto.
- Imagem de capa com upload direto.
- Alt text obrigatorio para a capa.
- Legenda opcional.
- Autor visivel.
- Tags livres.
- Status.
- Flag de destaque.
- Corpo em blocos.

Blocos do corpo:

- Paragrafo.
- H2.
- H3.
- Lista.
- Citacao.
- Imagem.
- Embed de YouTube.
- Embed de Instagram.
- Botao/link.

SEO avancado:

- Titulo SEO opcional.
- Descricao SEO opcional.
- Canonical override opcional.
- `noindex` excepcional.
- Palavras-chave internas.
- Social title opcional.
- Social description opcional.
- Social image opcional.

Para publicar, o post precisa ter:

- Titulo.
- Slug unico.
- Descricao.
- Capa.
- Alt text da capa.
- Autor.
- Pelo menos um bloco de conteudo.
- Metadata SEO herdada dos campos publicos ou preenchida explicitamente.

## Fluxo Administrativo

### `/admin/blog`

Lista de posts com:

- Busca.
- Filtro por status.
- Filtro por tag.
- Filtro por autor.
- Indicador de destaque.
- Data de atualizacao.
- Acoes rapidas.

### `/admin/blog/novo`

Cria rascunho e redireciona para o editor.

### `/admin/blog/[postId]`

Editor com:

- Corpo em blocos no centro.
- Painel lateral com status, publicar/despublicar, destaque, capa, autor, tags e SEO.
- Botao de salvar rascunho.
- Autosave local no navegador para reduzir risco de perda acidental.
- Botao de previa privada nao indexada.

Publicar executa validacoes. Despublicar muda status para `draft`; a URL publica deixa de ser indexavel e retorna 404.

A regra de destaque deve manter um unico post publicado em destaque. Ao destacar outro post, ele substitui o destaque anterior.

## Experiencia Publica

### `/blog`

Layout:

- Post em destaque no topo.
- Posts publicados em ordem cronologica abaixo.
- Lateral com filtro/lista de tags, priorizando tags mais usadas.

Cards de post mostram:

- Imagem.
- Titulo.
- Descricao.
- Data.
- Autor.
- Tags.

### `/blog/[slug]`

Layout de leitura:

- Capa.
- Titulo.
- Descricao.
- Autor.
- Data de publicacao.
- Tags.
- Tempo de leitura.
- Corpo HTML semantico.
- Posts relacionados por tag.

### `/blog/tags/[tag]`

Pagina publica indexavel com:

- Heading da tag.
- Descricao curta.
- Posts publicados daquela tag em ordem cronologica.

## SEO

Implementar metadata dinamica para blog, posts e tags:

- `title`.
- `description`.
- `canonical`.
- `robots`.
- Open Graph.
- Twitter card.

Implementar dados estruturados:

- `Blog`.
- `BlogPosting`.
- `BreadcrumbList`.
- `Organization` conectada ao schema global existente.

Atualizar sitemap:

- Incluir `/blog`.
- Incluir posts publicados.
- Incluir tags publicas com posts publicados.
- Excluir rascunhos e previews.

Imagens devem ter:

- URL publica.
- Alt text.
- Dimensoes quando disponiveis.
- Preview grande permitido por robots/meta.

## LLMs e Crawlers de IA

Implementar `/llms.txt` com:

- Resumo do site e do blog.
- Links principais.
- Tags publicas relevantes.
- Lista de posts publicados recentes ou principais.
- Instrucao para citar URLs canonicas.

Implementar `/blog/[slug].md` para posts publicados:

- Titulo.
- Descricao.
- Autor.
- Data.
- Tags.
- Canonical.
- Conteudo convertido dos blocos para Markdown limpo.

Robots deve adotar o meio-termo aprovado:

- Manter Googlebot e bots de busca tradicionais liberados para conteudo publico.
- Permitir `OAI-SearchBot` para descoberta/citacao em ChatGPT Search.
- Bloquear `GPTBot` para sinalizar que o conteudo nao deve ser usado para treinamento da OpenAI.
- Permitir `PerplexityBot` para descoberta/citacao.
- Bloquear areas privadas: `/admin`, `/api`, previews privados e rotas operacionais ja bloqueadas.

## Referencias Externas

- Google Search Central: Article/BlogPosting structured data.
  https://developers.google.com/search/docs/appearance/structured-data/article
- Google Search Central: image SEO best practices.
  https://developers.google.com/search/docs/advanced/guidelines/google-images
- OpenAI: crawler user agents and robots controls.
  https://platform.openai.com/docs/bots
- Perplexity: robots.txt behavior.
  https://www.perplexity.ai/help-center/en/articles/10354969-how-does-perplexity-follow-robots-txt
- llms.txt proposal/specification.
  https://llmstxt.org/

## Erros e Estados Vazios

- Banco nao configurado: admin de blog deve mostrar aviso operacional, sem fingir persistencia local.
- Falha de upload: manter rascunho intacto e explicar que a imagem nao foi enviada.
- Slug duplicado: sugerir alternativa baseada no titulo.
- Post publicado sem dados obrigatorios: bloquear publicacao com lista clara de campos pendentes.
- Tag sem posts publicados: retornar 404.
- Preview privado: sempre `noindex`.

## Testes e Verificacao

Verificacao automatica:

- `npm run typecheck`.
- `npm run build` ou `npm run check`.
- Testes focados nos helpers de slug, tags, blocos, Markdown e metadata quando houver estrutura de teste adequada.

Verificacao manual:

- Login como `admin` acessa blog e areas ja existentes.
- Login como `editor` acessa blog e nao acessa Fantasy/Banco.
- Criar rascunho.
- Fazer upload de capa.
- Criar tag nova e reaproveitar tag existente.
- Publicar post.
- Ver post em `/blog/[slug]`.
- Ver Markdown em `/blog/[slug].md`.
- Ver post em `/blog` e em `/blog/tags/[tag]`.
- Despublicar post e confirmar que a URL publica nao fica indexavel.
- Alterar slug publicado e confirmar redirecionamento.
- Validar sitemap e robots.

## Decisoes Aprovadas

- Blog publico em `/blog`.
- Posts em `/blog/[slug]`.
- Tags publicas em `/blog/tags/[tag]`.
- Tags livres com sugestoes baseadas em uso anterior.
- Autor visivel, padrao `Equipe Money Moicano MMA`.
- Status inicial apenas `draft` e `published`.
- Post em destaque no topo do blog.
- Lista cronologica abaixo do destaque.
- Filtro lateral por tags.
- Editor visual em blocos.
- Upload direto de imagem.
- `/llms.txt` e Markdown por post publicado.
- Editor com permissao completa para publicar, despublicar e editar.
