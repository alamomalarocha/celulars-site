# CELULARS Security Principles

## Objetivo

Registrar regras permanentes de segurança para o crescimento da plataforma CELULARS.

## Regras fundamentais

### Nunca colocar senha no front-end

Senhas, hashes, tokens e segredos não devem aparecer em HTML, CSS, JS ou JSON público.

### Nunca colocar inventário real em JSON público

Estoque real deve ficar em backend/API protegida.

### Nunca expor custo ou lucro

Custo de compra, margem e regras internas de preço são dados internos.

### Nunca expor dados de cliente

Dados de clientes e empresas devem ficar protegidos e acessíveis apenas por usuários autorizados.

### Usar autenticação server-side

Login real deve ser validado no servidor, com sessão segura e expiração.

### Usar roles e permissões

Cada usuário deve ter apenas o acesso necessário.

### Proteger endpoints

Toda rota sensível deve validar:
- autenticação;
- role;
- propriedade do dado;
- entrada recebida.

### Validar dados no backend

O front-end pode ajudar na experiência, mas validação final deve ser no backend.

### Usar logs

Registrar:
- login;
- alteração de preço;
- alteração de estoque;
- alteração de cliente;
- alteração de permissão;
- pedidos/cotações.

### Proteger variáveis sensíveis

Chaves e segredos devem ficar em variáveis de ambiente ou cofre seguro.

### Preparar backup/exportação

Dados importantes devem ter rotina de backup e exportação.

### Separar público, B2B e admin

O site público não deve carregar dados B2B ou admin ocultos no HTML.

## Cloudflare Access

Cloudflare Access pode ser usado como camada inicial de proteção para páginas e rotas.

Limitação:
- não substitui painel completo;
- não substitui modelo interno de permissões;
- não deve ser a única camada para dados críticos quando houver API própria.

## Regras para deploy

- Revisar diffs antes de publicar.
- Não commitar segredos.
- Não commitar arquivos de inventário real em público.
- Validar rotas protegidas.
- Testar site público após mudanças.

## Checklist antes de expor dado sensível

- Existe autenticação server-side?
- Existe role/permissão?
- Existe validação de entrada?
- Existe log?
- O dado não aparece no HTML público?
- Existe plano de rollback?
- O dado é realmente necessário para aquele usuário?
