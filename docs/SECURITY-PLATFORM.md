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

## Defesas adicionais

- `Content-Type: application/json` obrigatorio em corpos JSON;
- rate limiting geral para escritas e limites menores em mensagens e rotas sensiveis;
- queries parametrizadas em todas as entradas;
- restricao por `company_id` contra IDOR;
- renderizacao frontend com `textContent`, sem `innerHTML` para dados;
- limpeza completa do estado do cliente em login, logout e restauracao de sessao, evitando reaproveitamento visual de dados entre perfis;
- `Cache-Control: no-store` para respostas da plataforma;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `X-Frame-Options: DENY` e CSP `frame-ancestors 'none'`;
- `Permissions-Policy` restritiva;
- `X-Permitted-Cross-Domain-Policies: none`.

## Eventos que nunca entram na auditoria

Senhas, hashes, salts, cookies, tokens CSRF, IDs completos de sessao, segredos, documentos sensiveis e conteudo pessoal desnecessario. O sanitizador remove chaves sensiveis antes de persistir os valores anteriores e posteriores.

## Modelo de ameacas resumido

| Ameaca | Mitigacao DEMO |
| --- | --- |
| Enumeracao de usuario | erro generico e limite de login |
| Fixacao/roubo de sessao | token aleatorio, hash server-side, rotacao, expiracao e logout |
| CSRF | origem exata e token por sessao |
| XSS armazenado | DOM seguro e CSP sem script inline |
| SQL injection | statements parametrizados |
| IDOR | permissao e escopo de empresa no servidor |
| Abuso de escrita | limites por usuario, rota e janela |
| Vazamento por cache/frame | no-store, CSP e bloqueio de frames |

## Testes de seguranca

`npm run platform:e2e` cobre login, cookies, headers, 401/403, CSRF ausente e cruzado, origem invalida, SQL injection, XSS inerte, isolamento entre empresas, RBAC e rate limiting.

## Risco residual

Os limitadores sao locais em memoria e o SQLite nao e uma arquitetura distribuida. O ambiente nao possui MFA, provedor de identidade, cofre de segredos, WAF dedicado ou observabilidade de producao. Por isso deve permanecer local ate a ativacao formal.
