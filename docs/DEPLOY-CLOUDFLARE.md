# Deploy do site CELULARS no Cloudflare Pages

## Projeto

- Repositório: `alamomalarocha/celulars-site`.
- Projeto Cloudflare Pages: `celulars-site-f38`.
- Branch de produção: `main`.
- Autenticação no painel: `Continue with GitHub`.
- Comando de build: `npm run build`.
- Diretório de saída: `dist`.

Não alterar DNS, não criar outro projeto Pages e não remover os domínios personalizados durante um deploy comum.

## Preview antes da produção

1. Criar uma branch de trabalho.
2. Fazer push da branch para o GitHub.
3. Aguardar o deployment preview no projeto `celulars-site-f38`.
4. Confirmar o hash do commit exibido no deployment.
5. Testar páginas, catálogo, PTAX, WhatsApp, redirects e 404.
6. Confirmar que arquivos internos, `docs/`, backups e inventários não existem na URL preview.
7. Integrar em `main` somente após a validação.

## Produção

1. Fazer push da integração para `main`.
2. Aguardar o deployment automático.
3. Usar Retry/Redeploy apenas no deployment do commit correto quando houver falha de infraestrutura.
4. Comparar o hash publicado com `origin/main`.
5. Validar a URL `pages.dev` e depois `https://celulars.com.br`.
6. Validar também as URLs limpas `/iphones`, `/sobre`, `/acessos` e `/contato`.

Não usar um deployment antigo apenas porque aparece como disponível no histórico.
