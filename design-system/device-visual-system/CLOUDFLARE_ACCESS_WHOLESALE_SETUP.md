# Cloudflare Access para a area Atacado CELULARS

Este documento orienta a configuracao manual da protecao real da area de atacado da CELULARS.

## Objetivo

Usar Cloudflare Access na frente da rota de atacado para bloquear o acesso antes do navegador carregar a pagina. Assim, a tabela real de atacado nao fica publica para visitantes comuns.

## Caminho recomendado

Proteger:

```text
celulars.com.br/atacado*
```

## Passo a passo conceitual

1. Entrar no painel da Cloudflare.
2. Acessar a area Zero Trust.
3. Criar uma aplicacao Access para a area de atacado.
4. Configurar a aplicacao para proteger o caminho `celulars.com.br/atacado*`.
5. Criar uma politica de acesso permitindo somente e-mails aprovados.
6. Adicionar e-mails autorizados, por exemplo:
   - `cliente@empresa.com`
   - `comprador@loja.com`
7. Escolher metodo de login por e-mail/OTP ou outro provedor compativel.
8. Testar com um e-mail autorizado.
9. Testar com um e-mail nao autorizado.
10. Somente depois publicar a tabela real.

## Por que usar Cloudflare Access

Cloudflare Access deve validar o usuario antes de entregar a pagina protegida. Essa abordagem e mais segura do que colocar senha fixa no JavaScript, esconder uma tabela com CSS ou deixar dados sensiveis dentro do HTML publico.

## O que nao fazer

- Nao colocar senha fixa em HTML, CSS ou JavaScript.
- Nao esconder a tabela real apenas com CSS.
- Nao publicar `wholesale-inventory.json` real antes da protecao.
- Nao colocar custo interno, margem, lucro ou dados operacionais no front-end publico.

## Fluxo recomendado para liberar um cliente

1. Cliente solicita acesso pelo WhatsApp institucional.
2. CELULARS valida se o cliente e lojista, revendedor ou comprador comercial.
3. CELULARS registra o e-mail aprovado.
4. E-mail aprovado entra na politica do Cloudflare Access.
5. Cliente acessa `/atacado` e faz validacao pelo metodo configurado.
6. Apenas clientes autorizados visualizam a tabela real quando ela existir.

## Publicacao da tabela real

A tabela real so deve ser adicionada depois que:

1. A politica Cloudflare Access estiver ativa.
2. Um e-mail autorizado conseguir acessar.
3. Um e-mail nao autorizado for bloqueado.
4. A CELULARS confirmar que `/atacado*` esta realmente protegido.

Depois disso, a tabela real pode ser adicionada em arquivo separado protegido, seguindo o schema documentado em `WHOLESALE_INVENTORY_DATA_SCHEMA.md`.
