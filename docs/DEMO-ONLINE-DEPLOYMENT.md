# Plataforma DEMO CELULARS online

## Escopo e isolamento

Este ambiente é exclusivamente demonstrativo. Ele usa o Worker `celulars-platform-demo`, o banco D1 `celulars-platform-demo-db` e o domínio `https://demo.celulars.com.br`. O site público, o projeto Pages, o catálogo operacional, o inventário privado e ambientes futuros de produção não fazem parte deste deployment.

A faixa **AMBIENTE DE DEMONSTRAÇÃO — DADOS FICTÍCIOS — SEM TRANSAÇÕES REAIS** deve permanecer visível. E-mail, WhatsApp, pagamentos, remessas, importações reais e cadastro público permanecem desligados. Os providers são MOCK e não entregam conteúdo externamente.

## Camadas de segurança

1. Cloudflare Access protege `demo.celulars.com.br/*` com sessão de 24 horas, One-time PIN e política Allow restrita a `alamomalarocha@gmail.com`.
2. O Worker valida `Cf-Access-Jwt-Assertion` antes de servir assets ou APIs: algoritmo RS256, assinatura pelas chaves públicas do Team Domain, issuer, AUD, expiração e e-mail permitido.
3. A plataforma mantém sessão interna, cookie `HttpOnly; Secure; SameSite=Strict`, CSRF e RBAC para Administrador, Funcionário e Atacadista.

`workers.dev` e Preview URLs estão desabilitados em `wrangler.jsonc`. Não criar políticas `Allow Everyone` ou `Bypass`.

## Recursos

- Worker: `celulars-platform-demo`
- D1: `celulars-platform-demo-db`
- D1 binding: `DB`
- Database ID: `226bebcd-fdcc-4c67-8619-b98089f80fa8`
- Team Domain: `black-hall-e4fd.cloudflareaccess.com`
- Domínio: `demo.celulars.com.br`
- Assets: `apps/platform/public`
- Runtime: `apps/platform/worker/index.ts`
- Migrations: `apps/platform/database/migrations`

Não há R2 neste ambiente. Documentos continuam no provider MOCK, sem upload persistente e sem arquivos reais.

## Secrets

Valores nunca devem entrar no Git, PR, documentação, HTML ou logs. Nomes configurados:

- `ACCESS_AUDIENCE`
- `SESSION_SECRET`
- `CSRF_SECRET`
- `ENCRYPTION_KEY`
- `DEMO_SEED_SECRET`

Credenciais temporárias ficam apenas em `apps/platform/data/demo-online-credentials.json`, ignorado pelo Git. O D1 armazena somente hashes PBKDF2-SHA256 com salt individual.

## Operação

Pré-requisito: `npx wrangler whoami` deve apontar para a conta CELULARS.

```powershell
npm run platform:deploy:check
npm run platform:migrate:demo
$env:PLATFORM_DEMO_ONLINE_PASSWORD='<senha temporária forte>'
npm run platform:seed:demo
npm run platform:deploy:demo
npm run platform:doctor:demo
npm run platform:e2e:demo-online
```

O seed é determinístico para entidades DEMO e substitui o conteúdo do banco exclusivamente demonstrativo. A senha nunca é incluída no SQL versionado. Execute novamente para testar idempotência; as contagens devem permanecer estáveis.

## Health e readiness

`/health` e `/ready` são protegidos pelo Access. Sem autenticação, o resultado esperado é redirecionamento ao Access. Depois de Access válido, `/health` confirma o Worker e `/ready` confirma migrations, D1 e providers MOCK. `npm run platform:doctor:demo` valida o perímetro e o D1 pelo terminal autenticado e deve imprimir `READY`.

O activation check de produção pode permanecer `NOT_READY`; isso é esperado e não bloqueia o DEMO online.

## Reset DEMO

Não execute o seed ou reset sem conferir explicitamente o binding `DB` e o nome `celulars-platform-demo-db`. O reset online deve exigir Administrador, CSRF, confirmação forte `RESET DEMO` e auditoria. Nunca direcione comandos a banco local, catálogo, inventário privado ou produção.

## Deploy, persistência e rollback

Deploy de código não apaga D1. Antes de um redeploy, registre o Version ID. Para rollback, liste versões e use o mecanismo oficial de rollback do Wrangler/Cloudflare para a versão anterior; o D1 permanece separado e não deve ser apagado.

```powershell
npx --yes wrangler@4.52.1 deployments list --name celulars-platform-demo
npx --yes wrangler@4.52.1 rollback --name celulars-platform-demo
```

Para desativar, remova primeiro o Custom Domain ou desative o Worker e preserve o D1. Excluir D1 exige confirmação separada e não faz parte do rollback.

## Custos e limitações

O ambiente usa apenas recursos disponíveis sem upgrade na conta atual. Nenhum plano pago, Argo, R2, Queue, serviço de e-mail ou integração paga foi ativado. O consumo continua sujeito às cotas gratuitas vigentes de Workers, D1 e Access. O storage de documentos é MOCK e os testes autenticados completos exigem uma sessão Access válida.

## Troubleshooting

- 302 para `black-hall-e4fd.cloudflareaccess.com`: Access está protegendo corretamente.
- 403 `CLOUDFLARE_ACCESS_REQUIRED`: o JWT não chegou ou falhou em assinatura/issuer/AUD/expiração/e-mail.
- 401 `AUTHENTICATION_REQUIRED`: Access passou, mas falta login interno.
- 404 em `workers.dev`: comportamento esperado, rota alternativa desabilitada.
- `NOT_READY`: conferir migrations D1, secrets e binding `DB`.

Nunca corrija falhas criando `Allow Everyone`, `Bypass`, expondo `workers.dev` ou desligando a validação JWT.
