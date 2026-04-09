# Fantasy MMMMA

## Escopo Fechado Nesta Etapa

- O usuário participa escolhendo, em cada luta do evento:
  - atleta vencedor
  - método da vitória
  - round
- O envio fica disponível até 30 minutos antes do início do evento.
- Todos os dados do lead são obrigatórios:
  - nome
  - e-mail
  - WhatsApp
  - cidade
  - estado
  - confirmação de autorização para receber newsletters e ofertas dos parceiros do evento
- O campo de estado deve funcionar com sugestão/autocomplete por busca. Exemplo: `pa` precisa sugerir `Para` e `Paraiba`.
- O ranking público deve exibir apenas nome público e pontuação.
- As picks completas do usuário precisam ser consultáveis sem expor dados sensíveis.
- O admin precisa conseguir:
  - criar, editar e remover eventos
  - manter histórico dos eventos antigos
  - criar, editar e remover lutas dentro de cada evento
  - lançar resultados das lutas para calcular pontuação

## Privacidade

- Ranking público:
  - exibe somente `displayName` e `score`
- Consulta privada de picks:
  - deve usar token opaco por inscrição
  - idealmente persistido em cookie `HttpOnly`
  - pode existir também um link seguro de consulta enviado após o envio
- Dados sensíveis que não devem entrar no ranking:
  - e-mail
  - WhatsApp
  - cidade
  - estado

## Modelo Funcional

- `event`
  - nome, slug, status, `startsAt`, `lockAt`
- `fight`
  - evento, ordem, categoria, atletas, número máximo de rounds
- `fantasy_entry`
  - lead do usuário, consentimento, token privado, score total
- `fantasy_pick`
  - luta, atleta escolhido, método e round
- `fight_result`
  - atleta vencedor, método oficial, round oficial
- `scoring_rule`
  - tabela configurável para vencedor, método e round

## Observações de Produto

- A pontuação ainda não foi fechada e não deve ficar hardcoded no frontend.
- O card de picks pode seguir o padrão visual do print de referência:
  - duelo com dois atletas
  - seleção do vencedor por card
  - bloco de método
  - bloco de round
- Se uma luta tiver menos rounds que o máximo suportado, o frontend deve limitar as opções visíveis.

## Endpoints Sugeridos

### Público

- `GET /api/fantasy/events/current`
  - retorna o evento atual publicado, com lutas abertas para pick
- `POST /api/fantasy/entries`
  - recebe lead obrigatório, consentimento e picks
- `GET /api/fantasy/leaderboard?eventId=<id>`
  - retorna ranking público do evento
- `GET /api/fantasy/entries/me`
  - retorna as picks da inscrição autenticada por token/cookie

### Admin

- `GET /api/admin/fantasy/events`
- `POST /api/admin/fantasy/events`
- `PATCH /api/admin/fantasy/events/:eventId`
- `DELETE /api/admin/fantasy/events/:eventId`
- `GET /api/admin/fantasy/events/:eventId/fights`
- `POST /api/admin/fantasy/events/:eventId/fights`
- `PATCH /api/admin/fantasy/fights/:fightId`
- `DELETE /api/admin/fantasy/fights/:fightId`
- `POST /api/admin/fantasy/fights/:fightId/result`

## Próxima Implementação Recomendada

1. Montar a página pública `/fantasy` com dados seedados.
2. Subir os contratos e rotas públicas usando este documento como base.
3. Conectar persistência real para salvar inscrição, token privado e ranking.
4. Criar o admin de eventos, lutas e resultados.
