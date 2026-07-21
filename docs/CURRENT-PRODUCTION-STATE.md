# Estado atual canônico da Plataforma CELULARS

Checkpoint de produção atualizado em 21 de julho de 2026. Este é o documento canônico para o estado operacional do painel; planos históricos não substituem as confirmações registradas aqui.

## Estado confirmado

- os PRs #7, #8, #9 e #11 foram mesclados; o PR #10 consolida documentalmente este checkpoint, sem ampliar o escopo operacional;
- a baseline operacional validada para este checkpoint é o merge commit `0693a3937d66f9acc564653db174981641b9809f` da `main`;
- merges exclusivamente documentais posteriores podem gerar novos workflows, artifacts e deployments sem alterar código operacional ou ampliar a autorização comercial;
- a evidência histórica associada ao workflow `29826659240` e ao artifact `8493574407` permanece válida para essa baseline;
- o painel está publicado em `https://painel.celulars.com.br` pelo Worker `celulars-platform`;
- o banco D1 de produção é `celulars-platform-prod-db` e continua sem dados comerciais;
- Cloudflare Access e o login interno com MFA protegem o painel;
- `workers.dev` não oferece rota alternativa para a aplicação;
- Worker, D1 e domínio da aplicação DEMO permanecem preservados e isolados;
- `celulars.com.br`, `www.celulars.com.br`, o catálogo público, a PTAX, o inventário privado e `dist/` permanecem separados e intactos;
- importação de dados reais, cadastro público, e-mail, WhatsApp, pagamentos, transportadora, SMS e storage externos permanecem desabilitados;
- nenhum recurso pago foi ativado.
- o Cloudflare Pages instala com Node.js `24.18.0` e pnpm `11.9.0`; a política fail-closed autoriza scripts somente para as versões fixadas de `esbuild`, `sharp` e `workerd`.

Produção operacional, neste checkpoint, significa infraestrutura publicada e acesso administrativo homologado com banco comercial vazio. Não significa autorização para importar dados reais ou ativar integrações.

## Evidência automática

A execução de produção do GitHub Actions `29826659240`, associada ao commit acima, foi concluída com sucesso e confirmou a ordem segura:

1. validação do repositório;
2. presença das credenciais de implantação, sem expor valores;
3. pré-validação somente leitura da conta Cloudflare e do D1;
4. export do D1 antes das migrations;
5. upload de 7.992 bytes do backup `celulars-platform-prod-backup-0693a3937d66f9acc564653db174981641b9809f` como artifact `8493574407`;
6. migrations aplicadas sem pendências;
7. deploy do Worker;
8. 37 de 37 smoke tests online aprovados.

Os testes online confirmaram a proteção do painel pelo Access, a indisponibilidade da aplicação em `workers.dev`, a disponibilidade do site público e das chaves JWT do Access. O workflow do site `29826659182` e o deployment de produção do Cloudflare Pages também foram aprovados. A falha `ERR_PNPM_IGNORED_BUILDS` foi resolvida pelo PR #11 antes do build, sem ampliar a execução de scripts de dependências. Pull requests executam `validate`, mas o job de deploy fica bloqueado; produção só é implantada a partir da `main`.

## Evidência humana autenticada

O proprietário homologou, sem automação de credenciais:

- a aplicação Access `CELULARS Painel Operacional` direcionada a `painel.celulars.com.br`;
- política Allow restrita ao e-mail autorizado do proprietário, autenticação por OTP e duração de sessão de 24 horas;
- ausência de políticas Everyone, Bypass ou Service Auth;
- audience do Access conferido com a configuração esperada, sem registrar credenciais neste documento;
- login interno do administrador Alamo, função ADMIN, com MFA habilitado e verificado;
- carregamento do dashboard;
- produtos, estoque, CRM, empresas, documentos, aprovações, pedidos, itens, reservas e logística sem registros comerciais;
- ausência de dados DEMO no painel de produção;
- logout funcional.
- o log autenticado do preview do PR #11 detectou `nodejs@24.18.0` e `pnpm@11.9.0` e confirmou a instalação do Node.js `24.18.0`.

## Itens não afirmados por este checkpoint

Não foi registrada uma auditoria visual exaustiva de todas as telas e breakpoints, nem cobertura autenticada de todas as APIs. Integrações externas e importação real permanecem deliberadamente desligadas e, por isso, não foram homologadas em produção.

## Limites de autorização

Este checkpoint não autoriza deploy manual, importação, seed, integração externa, recurso pago, cadastro público ou alteração de Access, DNS, Worker, D1, Pages ou DEMO. Uma futura mudança desse escopo exige revisão, testes e autorização explícita.

Os Repository secrets `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` têm existência confirmada pelo proprietário. Seus valores nunca devem ser acessados, impressos ou documentados.

## Operação e recuperação

O pipeline cria e envia o backup D1 antes de qualquer migration. Migrations precedem o deploy, e smoke tests sucedem o deploy. Em caso de falha, não há restauração automática: interrompa a operação e siga [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md). O trabalho local e a operação DEMO seguem [PLATFORM-RUNBOOK.md](PLATFORM-RUNBOOK.md); a governança de mudanças futuras está em [PRODUCTION-ACTIVATION.md](PRODUCTION-ACTIVATION.md).
