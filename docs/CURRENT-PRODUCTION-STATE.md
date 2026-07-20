# Estado atual canonico da Plataforma CELULARS

Atualizado para o checkpoint do PR #7 em 19 de julho de 2026.

## Estado confirmado

- o PR #7 permanece aberto, sem merge e sem autorizacao de publicacao;
- o painel de producao esta provisionado em `https://painel.celulars.com.br`;
- o Worker `celulars-platform` e o D1 `celulars-platform-prod-db` existem;
- o banco comercial real esta vazio para empresas, clientes, produtos, pedidos e inventario;
- existe um administrador real com troca de senha concluida e MFA habilitado;
- Cloudflare Access protege o dominio do painel;
- `workers.dev` e Preview URLs estao desabilitados;
- `PLATFORM_DEMO=false` e `PRODUCTION_MODE=true`;
- importacao real, e-mail, WhatsApp, pagamentos, remessas e storage externos estao desabilitados;
- Worker, D1 e dominio DEMO permanecem preservados e isolados;
- site publico, catalogo, PTAX, inventario privado e `dist` permanecem separados da plataforma.

## Limites de autorizacao

Provisionamento nao autoriza merge, deploy manual, importacao, seed, integracao externa, recurso pago ou alteracao de Access, DNS, Worker, D1 ou Pages. Importacao real somente pode ser habilitada por mudanca futura revisada, testada e aprovada explicitamente.

Os Repository secrets `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` tiveram sua existencia confirmada pelo proprietario; seus valores nunca devem ser acessados ou documentados.

## Pipeline

Pull requests executam validacao, mas nunca deploy. Deploy somente pode ocorrer na `main`, depende de `validate`, cria backup D1, aplica migrations, publica o Worker e depois executa smoke tests. Recuperacoes seguem [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md) e nunca sao automaticas.

## Verificacoes humanas pendentes

Antes do merge, confirmar em modo somente leitura as politicas efetivas do Cloudflare Access e homologar o painel autenticado, incluindo dashboard vazio, APIs, assets, responsividade e logout.
