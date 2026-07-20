# Arquitetura da Plataforma CELULARS DEMO

## Decisao

A plataforma usa Node.js 24, TypeScript, HTTP nativo e `node:sqlite`. Todo o codigo fica em `apps/platform/` e nao participa do build publico em `dist/`.

Camadas:

- `database/`: migrations versionadas, seed deterministico e reset protegido;
- `server/`: HTTP, autenticacao, autorizacao, servicos e persistencia;
- `src/`: configuracao e contratos compartilhados;
- `public/`: interface interna servida somente pelo processo local;
- `tests/` e `tests-e2e/`: verificacoes unitarias, integradas e ponta a ponta;
- `docs/`: orientacao especifica da aplicacao quando necessario.

## Alternativas avaliadas

- Framework web completo: aceleraria telas, mas adicionaria dependencia e superficie de ataque desnecessarias nesta etapa.
- `better-sqlite3`: API madura, porem exige binario nativo externo.
- PostgreSQL local: excelente para producao, mas criaria dependencia operacional e bloquearia a demonstracao simples.
- Cloudflare D1 imediato: alinhado ao destino, mas exige configuracao externa e publicacao antes da homologacao local.

## Razoes

- banco transacional local sem servico externo;
- queries parametrizadas e foreign keys;
- migracao futura direta para D1 por meio de um adaptador de repositorio;
- servidor pequeno, auditavel e preso a `127.0.0.1`;
- nenhuma dependencia da plataforma no site publico atual.

## Limites

`node:sqlite` ainda emite aviso experimental no Node 24. O banco DEMO e descartavel e nao deve ser promovido para producao. Uploads, e-mail, WhatsApp, pagamento e rastreio externo permanecem simulados.

## Estado de producao

O Worker e o D1 de producao ja estao provisionados em ambiente separado da DEMO e do Pages publico. O banco comercial permanece vazio, e integracoes externas e importacao real permanecem desabilitadas. Consulte [CURRENT-PRODUCTION-STATE.md](CURRENT-PRODUCTION-STATE.md) e [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md).

## Migracao dos dados DEMO

Dados DEMO nunca sao migrados. Apenas schema, contratos e migrations seguem adiante. O banco local e recriado por seed e fica ignorado pelo Git.


## Fluxo de requisicao

1. `main.ts` carrega configuracao e abre o SQLite;
2. migrations pendentes sao aplicadas;
3. `app.ts` aplica headers, origem, rate limiting, sessao e CSRF;
4. a rota exige permissao no servidor;
5. modulos de dominio executam queries parametrizadas e transacoes;
6. respostas JSON retornam sem dados sensiveis;
7. o frontend renderiza com APIs DOM seguras.

## Fronteiras de confianca

- navegador local nunca e fonte de autorizacao;
- cookie identifica uma sessao opaca armazenada no servidor;
- `company_id` restringe registros atacadistas;
- `data/catalog-public.json` e somente fonte de snapshot para o seed;
- o SQLite DEMO nao e fonte do site publico;
- integracoes externas permanecem fora da fronteira da DEMO.

## Concorrencia e consistencia

Operacoes de reserva, liberacao, pedido e movimentos usam transacoes `BEGIN IMMEDIATE`, constraints e IDs deterministas. A futura migracao deve preservar atomicidade, idempotencia e isolamento por empresa.

## Deploy

O build estatico do site ignora `apps/platform/`. A plataforma nao possui rota no Cloudflare Pages. Os Workers DEMO e de producao usam dominios, bancos e protecoes separados do site publico.
