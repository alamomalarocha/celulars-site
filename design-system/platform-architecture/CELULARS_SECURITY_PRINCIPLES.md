# CELULARS Security Principles

## Objetivo

Registrar regras permanentes de seguranca para o crescimento da plataforma CELULARS.

## Regras Fundamentais

### Nunca colocar senha no front-end

Senhas, hashes, tokens e segredos nao devem aparecer em HTML, CSS, JS ou JSON publico.

### Nunca colocar inventario real em JSON publico

Estoque real deve ficar em backend/API protegida.

### Nunca expor custo ou lucro

Custo de compra, margem e regras internas de preco sao dados internos.

### Nunca expor dados de cliente

Dados de clientes e empresas devem ficar protegidos e acessiveis apenas por usuarios autorizados.

### Usar autenticacao server-side

Login real deve ser validado no servidor, com sessao segura e expiracao.

### Usar roles e permissoes

Cada usuario deve ter apenas o acesso necessario.

### Proteger endpoints

Toda rota sensivel deve validar:

- autenticacao;
- role;
- propriedade do dado;
- entrada recebida.

### Validar dados no backend

O front-end pode ajudar na experiencia, mas validacao final deve ser no backend.

### Toda edicao de tabela deve exigir login

Qualquer edicao de preco, estoque, produto, cliente, tabela B2B, conteudo do site ou configuracao deve exigir usuario autenticado.

### Toda edicao de preco deve gerar audit log

Alteracoes de preco devem registrar:

- usuario;
- data/hora;
- valor anterior;
- valor novo;
- entidade alterada;
- origem da alteracao.

### Cliente B2B nunca ve custo/lucro

Clientes B2B podem ver apenas informacoes liberadas por permissao. Custo, margem, fornecedor, regra interna e preco de outros grupos nunca devem ser expostos.

### Preco atacado nunca fica em JSON publico

Precos atacado devem vir apenas de API protegida e conforme permissao do cliente.

### Estoque real nunca fica em arquivo publico

Estoque real deve ficar em banco/API protegidos, nao em HTML, JS ou JSON publico.

### Painel admin deve validar no backend

Nenhuma acao critica pode depender somente de bloqueio visual no front-end.

### Acoes criticas devem ser registradas

Registrar:

- login;
- alteracao de preco;
- alteracao de estoque;
- alteracao de cliente;
- alteracao de permissao;
- alteracao de conteudo do site;
- pedidos/cotacoes.

### Integracao com IA exige aprovacao humana

IA/assistente pode sugerir e preparar alteracoes, mas nao deve publicar sozinha sem aprovacao de usuario autorizado.

## Cloudflare Access

Cloudflare Access pode ser usado como camada inicial de protecao para paginas e rotas.

Limitacao:

- nao substitui painel completo;
- nao substitui modelo interno de permissoes;
- nao deve ser a unica camada para dados criticos quando houver API propria.

## Regras para Deploy

- Revisar diffs antes de publicar.
- Nao commitar segredos.
- Nao commitar arquivos de inventario real em publico.
- Validar rotas protegidas.
- Testar site publico apos mudancas.

## Checklist Antes de Expor Dado Sensivel

- Existe autenticacao server-side?
- Existe role/permissao?
- Existe validacao de entrada?
- Existe log?
- O dado nao aparece no HTML publico?
- Existe plano de rollback?
- O dado e realmente necessario para aquele usuario?

## Principio Permanente

Dados sensiveis, precos atacado, estoque real, clientes, logs e configuracoes criticas devem viver em backend protegido. O site publico deve receber somente dados aprovados para exibicao.
