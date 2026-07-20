# Plataforma CELULARS DEMO

Aplicacao interna para homologar operacoes da CELULARS com dados exclusivamente ficticios. A plataforma fica em `apps/platform/`, nao e publicada pelo build estatico e nao entra em `dist/`. O Worker DEMO e o painel de producao usam infraestrutura isolada. O estado operacional canonico esta em [CURRENT-PRODUCTION-STATE.md](CURRENT-PRODUCTION-STATE.md), e a recuperacao controlada esta em [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md).

## Requisitos

- Node.js 24 ou superior;
- npm;
- Windows, macOS ou Linux com acesso local ao repositorio;
- variavel `CELULARS_PLATFORM_DEMO=1` (padrao local);
- senha temporaria em `PLATFORM_DEMO_PASSWORD` para reset controlado.

## Inicio rapido

```powershell
npx --yes pnpm@11.9.0 install --frozen-lockfile --ignore-scripts
npm run platform:build
$env:PLATFORM_DEMO_PASSWORD = '<senha-local-temporaria>'
npm run platform:reset
npm run platform:dev
```

A URL padrao e `http://127.0.0.1:4178`. O servidor recusa banco fora de `apps/platform/data/` e permanece preso ao host local por padrao.

Para gerar uma senha aleatoria e o arquivo local de credenciais:

```powershell
npm run platform:seed
```

O arquivo `apps/platform/data/demo-credentials.json` e ignorado pelo Git e nunca deve ser enviado, copiado para `dist/` ou compartilhado.

## Comandos

| Comando | Funcao |
| --- | --- |
| `npm run platform:dev` | inicia a plataforma local ja compilada |
| `npm run platform:migrate` | aplica migrations pendentes |
| `npm run platform:seed` | recria o conjunto DEMO e gera credenciais locais |
| `npm run platform:reset` | apaga somente o SQLite DEMO, migra e semeia novamente |
| `npm run platform:lint` | valida regras estaticas da plataforma |
| `npm run platform:typecheck` | executa TypeScript sem emitir arquivos |
| `npm run platform:build` | compila em `apps/platform/build/` |
| `npm run platform:test` | executa testes unitarios e integrados |
| `npm run platform:e2e` | executa testes E2E de seguranca |
| `npm run platform:check` | executa lint, tipos, build e todos os testes |
| `npm run platform:doctor` | diagnostica ambiente sem exibir segredos |
| `npm run platform:backup` | cria e verifica backup DEMO de banco, documentos e metadados |
| `npm run platform:deploy:check` | valida artefatos sem publicar |
| `npm run platform:activation:check` | informa READY/NOT READY sem ativar |
| `npm run platform:bootstrap-admin` | fluxo controlado do primeiro admin; somente producao |

## Modulos

- dashboard operacional;
- catalogo, precos e estoque DEMO;
- empresas, clientes e solicitacoes;
- conversas e mensagens internas;
- cotacoes, pedidos, reservas e logistica;
- usuarios, equipes, permissoes customizadas, sessoes e MFA TOTP;
- documentos privados, outbox simulada, caixa unificada e pos-venda;
- jobs auditados, observabilidade, backup opcionalmente criptografado, importacao/exportacao segura e privacidade;
- auditoria, notificacoes, configuracoes, feature flags e relatorios;
- administracao de usuarios, sessoes, equipes, retencao, solicitacoes de privacidade e legal holds.

Todas as telas e exportacoes de relatorio identificam o ambiente como demonstracao e usam somente dados ficticios.

## Dados e isolamento

O banco padrao e `apps/platform/data/platform-demo.sqlite`. O reset remove apenas esse arquivo e seus journals. Catalogo canonico, inventario privado, PTAX, site publico e `dist/` nao sao alterados.

O seed possui IDs e datas fixos para homologacao repetivel. Produtos e variantes sao copiados como snapshot DEMO do catalogo publico, sem modificar a fonte.

## Perfis

- `ADMIN`: acesso administrativo completo;
- `EMPLOYEE`: operacao comercial conforme permissoes;
- `WHOLESALE`: somente a propria empresa e seus registros.

Consulte [DEMO-ACCESS.md](DEMO-ACCESS.md) e [RBAC.md](RBAC.md).

## Seguranca

A aplicacao usa senha com `scrypt`, sessao server-side, cookie HttpOnly, CSRF, MFA TOTP opcional, validacao de origem, queries parametrizadas, rate limiting, headers defensivos, RBAC e permissoes customizadas no servidor. O servidor local deve permanecer em `127.0.0.1`. DEMO e producao usam Workers, D1 e dominios distintos; ambos mantem `workers.dev` e previews desabilitados. Integracoes externas e importacao real permanecem bloqueadas em producao.

Consulte [SECURITY-PLATFORM.md](SECURITY-PLATFORM.md).

## Homologacao

Antes de considerar uma alteracao pronta:

1. execute `npm run platform:check`;
2. execute `npm run platform:reset` duas vezes com a mesma senha e compare o estado logico;
3. valide login e os tres perfis;
4. confira 1440, 1024, 768, 430 e 390 px;
5. confirme que `dist/` nao contem `platform`, banco ou credenciais;
6. confirme hashes dos dados reais protegidos.

## Leitura adicional

- [ARCHITECTURE-PLATFORM.md](ARCHITECTURE-PLATFORM.md)
- [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)
- [DEMO-FLOWS.md](DEMO-FLOWS.md)
- [PLATFORM-RUNBOOK.md](PLATFORM-RUNBOOK.md)
- [PRODUCTION-ACTIVATION.md](PRODUCTION-ACTIVATION.md)
