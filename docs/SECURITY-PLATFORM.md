# Seguranca da Plataforma CELULARS DEMO

## Limite do ambiente

A plataforma so inicia com `CELULARS_PLATFORM_DEMO=1`. O banco aceito fica sob `apps/platform/data/` e deve terminar em `.sqlite`. Banco, credenciais geradas e resultados de teste nao entram no Git nem em `dist`.

## Autenticacao

- senhas armazenadas com `scrypt` e salt individual;
- resposta de login generica para reduzir enumeracao de contas;
- bloqueio da conta depois de cinco falhas por quinze minutos;
- limitador em memoria por IP e email no endpoint de login;
- sessao opaca aleatoria, armazenada no banco somente como hash SHA-256 combinado com segredo local;
- cookie `HttpOnly`, `SameSite=Strict` e `Secure` quando `PLATFORM_SECURE_COOKIES=1`;
- expiracao padrao de oito horas, logout por revogacao e rotacao padrao a cada trinta minutos;
- nenhum token de autenticacao e armazenado em `localStorage`.

## Protecao de requisicoes

Operacoes mutaveis exigem origem exatamente igual a `PLATFORM_ALLOWED_ORIGIN`. Depois do login, exigem tambem `X-CSRF-Token` associado a sessao. O servidor aplica CSP restritiva, bloqueio de frames, `nosniff`, politica de referencias e permissoes reduzidas.

## Autorizacao

Permissoes sao carregadas do banco pela sessao e verificadas na API. Ocultar controles na interface nunca substitui a verificacao server-side.

## Ativacao futura

Antes de qualquer preview compartilhado, gerar segredo aleatorio longo, ativar cookies seguros, configurar HTTPS e origem exata, escolher armazenamento de banco compativel com Cloudflare e substituir todas as credenciais DEMO.
