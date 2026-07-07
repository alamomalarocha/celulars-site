# CELULARS Platform Roadmap

## Visao Geral

O projeto CELULARS deve evoluir de um site estatico para uma plataforma comercial completa, com site publico, area B2B protegida, painel administrativo, dados estruturados, API reutilizavel e base preparada para app iOS/Android.

O caminho recomendado e evolutivo: manter o site publico estavel, proteger rotas sensiveis primeiro, depois introduzir backend, banco de dados e painel administrativo por fases.

## Estado Atual

- Site publico publicado no Cloudflare Pages.
- Commit de arquitetura de referencia: `c1601d6 Add CELULARS platform architecture planning`.
- Commit de catalogo iPhones de referencia: `58ed3e1 Restore eCPO catalog without public prices`.
- Pagina iPhones publica separada entre iPhones novos linha 17 e iPhones eCPO do 12 ao 17.
- iPhones novos linha 17 usam preco Apple + taxa FL 7% + conversao pela Cotacao CELULARS/PTAX.
- iPhones eCPO do 12 ao 17 nao exibem preco publico; mostram preco sob consulta.
- PTAX/Cotacao CELULARS ativa no front-end atual.
- Pagina Atacado sem inventario real exposto.
- WhatsApp institucional como principal canal de conversao.
- Cloudflare Access ja foi avaliado/testado como camada inicial de protecao.

## Regra Estrutural: Tabelas Editaveis

Nenhuma tabela exibida no site deve ficar permanentemente hardcoded em HTML, CSS ou JavaScript.

Toda tabela deve ser planejada para evoluir para uma fonte editavel pelo painel administrativo, com:

- banco de dados;
- API;
- permissoes por usuario;
- validacao no backend;
- historico e logs de alteracao.

O HTML/JS atual pode continuar funcionando como etapa temporaria, mas a arquitetura final deve permitir edicao pelo painel administrativo sem depender de alteracao manual de codigo.

Esta regra vale para:

- tabela publica de iPhones novos;
- tabela publica de eCPO;
- tabela de atacado;
- tabela de precos;
- tabela de estoque;
- tabela de clientes;
- tabela de pedidos/cotacoes;
- tabela de PTAX/ajustes;
- qualquer tabela futura do projeto.

## Stack Recomendada

Recomendacao principal:

- Cloudflare Pages;
- Cloudflare Pages Functions ou Workers;
- Cloudflare D1 para dados SQL estruturados;
- Cloudflare R2 para imagens, documentos e midia;
- Cloudflare KV para cache e configuracoes simples.

Motivos:

- o site ja esta em Cloudflare Pages;
- Pages Functions permite criar APIs e logica server-side sem migrar o site inteiro;
- Workers permite backend serverless;
- D1 atende dados relacionais como usuarios, produtos, precos, estoque, clientes e logs;
- R2 organiza midia e documentos;
- KV pode guardar cache e configuracoes simples;
- a mesma API pode servir site publico, painel admin, area B2B e futuro app iOS/Android.

Cloudflare Access pode continuar como protecao inicial, mas nao substitui um backend proprio de usuarios, permissoes e auditoria.

## Fases Recomendadas

### Fase 1 - Site Publico Estavel

Objetivo: manter Home, iPhones, Atacado, Sobre e Contato confiaveis, rapidos e sem dados sensiveis.

Itens:

- preservar PTAX;
- manter catalogo publico sem inventario real;
- revisar SEO e performance;
- padronizar conteudo institucional;
- manter WhatsApp como CTA principal.

### Fase 2 - Atacado Protegido Basico

Objetivo: proteger a area de atacado antes de expor qualquer dado comercial sensivel.

Itens:

- usar Cloudflare Access como primeira camada;
- nao colocar inventario real em HTML/JS publico;
- criar conteudo B2B protegido simples;
- registrar manualmente clientes autorizados enquanto nao houver backend.

### Fase 3 - Backend/API Inicial

Objetivo: criar API server-side para dados que nao devem ficar no front-end.

Itens:

- Cloudflare Pages Functions ou Workers;
- rotas publicas limitadas;
- rotas protegidas para B2B/admin;
- validacao no servidor;
- variaveis sensiveis em ambiente seguro.

### Fase 4 - Admin Data Management

Objetivo: transformar tabelas hardcoded em dados estruturados editaveis pelo painel administrativo.

Itens:

- criar banco D1;
- criar API para produtos, variantes, precos, eCPO, atacado e estoque;
- criar painel admin;
- criar roles e permissoes;
- criar logs de auditoria;
- migrar precos iPhones novos;
- migrar eCPO;
- migrar atacado;
- migrar estoque;
- migrar configuracoes de PTAX/ajustes;
- manter rollback para a versao estatica enquanto a migracao amadurece.

### Fase 5 - Painel Administrativo Completo

Objetivo: criar painel interno para gerenciar dados sem editar codigo.

Itens:

- autenticacao server-side;
- roles e permissoes;
- produtos;
- precos;
- estoque;
- clientes;
- conteudo do site;
- logs.

### Fase 6 - Clientes B2B com Conta

Objetivo: permitir que clientes aprovados acessem dados comerciais.

Itens:

- solicitacao de acesso;
- aprovacao manual;
- perfil da empresa;
- permissoes por cliente;
- historico de consultas.

### Fase 7 - Controle de Estoque

Objetivo: controlar disponibilidade, condicao, grade, lote e origem.

Itens:

- produtos e variantes;
- quantidade;
- condicao;
- lote;
- reserva;
- status.

### Fase 8 - Pedidos/Cotacoes B2B

Objetivo: registrar intencao comercial e reduzir perda de informacao no WhatsApp.

Itens:

- solicitacao de cotacao;
- pedido em analise;
- historico;
- vinculo com vendedor;
- notificacoes internas.

### Fase 9 - Relatorios e Auditoria

Objetivo: dar visibilidade da operacao sem expor dados indevidos.

Itens:

- logs de alteracao;
- relatorios por produto;
- relatorios por cliente;
- exportacoes;
- trilha de auditoria.

### Fase 10 - Preparacao para App iOS/Android

Objetivo: separar regras e dados da interface web.

Itens:

- API versionada;
- autenticacao reutilizavel;
- contratos de dados;
- endpoints publicos e protegidos;
- estrutura de midia.

### Fase 11 - App Mobile

Objetivo: criar app quando API, dados e autenticacao estiverem maduros.

Possiveis telas:

- login;
- catalogo;
- estoque B2B;
- pedidos/cotacoes;
- notificacoes;
- perfil do cliente.

## Riscos

- Colocar senha, estoque ou precos sensiveis no front-end publico.
- Criar painel sem autenticacao server-side.
- Misturar regras comerciais no HTML estatico.
- Usar Cloudflare Access como se fosse sistema completo de usuarios.
- Nao registrar logs de alteracao.
- Criar app antes de uma API confiavel.

## Proximos Passos

1. Aprovar a regra de tabelas editaveis.
2. Definir escopo minimo do D1.
3. Planejar a primeira Pages Function publica.
4. Planejar rotas admin protegidas.
5. Definir modelo minimo de produtos, variantes, precos, estoque e logs.
6. Criar prototipo seguro do painel admin sem dados reais.
