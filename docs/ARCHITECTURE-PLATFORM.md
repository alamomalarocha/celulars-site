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

## Caminho para producao

1. substituir o adaptador SQLite por D1 ou banco transacional aprovado;
2. usar provedor de identidade e gerenciamento de segredos;
3. configurar ambiente protegido separado do Pages publico;
4. executar migrations em homologacao;
5. importar somente dados reais revisados;
6. validar RBAC, auditoria, backup e recuperacao;
7. ativar integracoes externas individualmente.

## Migracao dos dados DEMO

Dados DEMO nunca sao migrados. Apenas schema, contratos e migrations seguem adiante. O banco local e recriado por seed e fica ignorado pelo Git.

