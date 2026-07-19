# Roadmap historico do painel CELULARS

Este documento registrava a direcao tecnica antes da implementacao. O estado executavel atual prevalece sobre as previsoes abaixo.

## Estado alcançado no ambiente DEMO

A plataforma interna foi implementada em `apps/platform/` e esta online em `demo.celulars.com.br`, isolada do site publico, protegida por Cloudflare Access e login interno. O Worker `celulars-platform-demo` usa o D1 `celulars-platform-demo-db`, dados exclusivamente ficticios e providers externos MOCK.

Foram concluidos:

- catalogo, precos e inventario DEMO com razao imutavel;
- CRM, empresas, solicitacoes, conversas, cotacoes, pedidos e pos-venda;
- Administrador, Funcionario e Atacadista com escopo empresarial;
- sessoes server-side, CSRF, RBAC, MFA TOTP e lockout;
- auditoria, notificacoes, configuracoes, relatorios e privacidade;
- testes unitarios, integracao, API, seguranca e E2E;
- deploy continuo somente do Worker DEMO, sem merge do PR #7.

## Limites preservados

A plataforma DEMO nao atualiza nem publica automaticamente `data/catalog-public.json`. Permanecem separados e intactos:

- site publico e Cloudflare Pages;
- PTAX/Cotacao CELULARS;
- catalogo canonico e precos reais;
- inventario privado real;
- `dist/`, DNS publico e producao.

Documentos privados online permanecem fail-closed porque nenhum storage externo foi provisionado. E-mail, WhatsApp, pagamentos, transportadora, imports e recursos pagos permanecem desativados.

## Proximas decisoes externas, fora do DEMO

Uma ativacao real ainda depende de aprovacao separada, revisao juridica e de seguranca, provisionamento de storage/cofre/backup/telemetria e escolha dos provedores oficiais. Essas decisoes nao autorizam merge nem producao.

Consulte `docs/DEMO-ONLINE-DEPLOYMENT.md`, `docs/PLATFORM-README.md` e o PR #7 para o estado tecnico atual.
