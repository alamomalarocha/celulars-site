# Roadmap histórico do painel CELULARS

Este documento registra a evolução técnica e as próximas decisões. O estado operacional canônico e mais recente está em [CURRENT-PRODUCTION-STATE.md](CURRENT-PRODUCTION-STATE.md).

## Marcos concluídos

### Ambiente DEMO

A plataforma interna foi implementada em `apps/platform/` e permanece online em `demo.celulars.com.br`, isolada do site público, protegida por Cloudflare Access e login interno. O Worker `celulars-platform-demo` usa o D1 `celulars-platform-demo-db`, dados exclusivamente fictícios e providers externos MOCK.

Foram concluídos:

- catálogo, preços e inventário DEMO com razão imutável;
- CRM, empresas, solicitações, conversas, cotações, pedidos e pós-venda;
- perfis Administrador, Funcionário e Atacadista com escopo empresarial;
- sessões server-side, CSRF, RBAC, MFA TOTP e lockout;
- auditoria, notificações, configurações, relatórios e privacidade;
- testes unitários, integração, API, segurança e E2E.

### Base operacional de produção

Os PRs #7, #8 e #9 foram mesclados. O painel de produção foi provisionado e publicado com Worker e D1 próprios, pipeline com backup anterior às migrations, deploy controlado pela `main` e smoke tests posteriores. Cloudflare Access, login administrativo e MFA foram homologados; os módulos comerciais e o banco real permanecem vazios.

O site público e a aplicação DEMO foram preservados durante a ativação.

## Limites preservados

A plataforma DEMO não atualiza nem publica automaticamente `data/catalog-public.json`. Permanecem separados:

- site público e Cloudflare Pages;
- PTAX/Cotação CELULARS;
- catálogo canônico e preços reais;
- inventário privado real;
- `dist/`, DNS público, DEMO e produção.

Documentos privados online permanecem fail-closed enquanto nenhum storage externo for autorizado. E-mail, WhatsApp, pagamentos, transportadora, SMS, imports, cadastro público e recursos pagos permanecem desativados.

## Próximas decisões

A base técnica está operacional, mas uso comercial com dados reais continua fora do escopo aprovado. Qualquer evolução deve ser tratada em mudança separada, com prioridade e autorização explícitas, especialmente para:

- política de dados, LGPD, retenção e responsáveis;
- importação controlada de dados reais;
- storage externo de documentos;
- provedores de e-mail, WhatsApp, pagamentos, SMS ou logística;
- observabilidade, alertas e objetivos de serviço;
- auditoria visual abrangente e cobertura autenticada adicional de APIs.

Consulte também [DEMO-ONLINE-DEPLOYMENT.md](DEMO-ONLINE-DEPLOYMENT.md), [PLATFORM-README.md](PLATFORM-README.md), [PRODUCTION-ACTIVATION.md](PRODUCTION-ACTIVATION.md) e [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md).
