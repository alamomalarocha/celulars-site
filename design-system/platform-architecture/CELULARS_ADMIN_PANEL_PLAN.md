# CELULARS Admin Panel Plan

## Objetivo

Planejar o futuro painel administrativo interno da CELULARS.

Este documento nao implementa painel, login, API ou banco de dados. Ele define a direcao para que o site evolua para uma plataforma com dados editaveis, permissoes, auditoria e API reutilizavel.

## Principio Central

Toda tabela exibida no site deve ser editavel no futuro pelo painel administrativo.

O painel deve substituir a dependencia de alteracoes manuais em HTML/JS para:

- precos;
- produtos;
- variantes;
- estoque;
- eCPO;
- atacado;
- clientes;
- conteudo do site;
- configuracoes operacionais.

## Secoes do Painel

### A. Dashboard

Funcao:

- resumo de vendas/consultas;
- estoque;
- cotacoes;
- avisos;
- produtos mais consultados;
- pedidos/cotacoes abertas.

Permissoes:

- `super_admin`;
- `admin`;
- `sales`;
- `viewer` limitado.

### B. Produtos

Funcao:

- criar/editar modelos;
- capacidades;
- cores;
- condicao;
- categorias: Novo/eCPO;
- ativo/inativo;
- status publico/B2B.

Permissoes:

- `super_admin`;
- `admin`;
- `inventory` limitado.

### C. Precos

Funcao:

- editar precos Apple base;
- editar taxa FL;
- editar preco CELULARS;
- editar eCPO;
- editar atacado quando autorizado;
- registrar historico de alteracao;
- registrar quem alterou;
- registrar quando alterou.

Permissoes:

- `super_admin`;
- `admin`;
- `sales` leitura/solicitacao.

### D. Estoque

Funcao:

- QTY;
- grade;
- condicao;
- localizacao;
- lote;
- status;
- reservado;
- disponivel.

Permissoes:

- `super_admin`;
- `admin`;
- `inventory`;
- `sales` leitura.

### E. Atacado

Funcao:

- tabela B2B;
- precos por cliente;
- precos por lote;
- clientes aprovados;
- regras de visibilidade;
- permissoes.

Permissoes:

- `super_admin`;
- `admin`;
- `sales`.

### F. Clientes

Funcao:

- clientes varejo;
- clientes B2B;
- status de aprovacao;
- documentos;
- vendedor responsavel;
- historico.

Permissoes:

- `super_admin`;
- `admin`;
- `sales`.

### G. Conteudo do Site

Funcao:

- textos da Home;
- textos da pagina iPhones;
- textos Sobre/Contato;
- banners;
- imagens;
- SEO;
- avisos comerciais.

Permissoes:

- `super_admin`;
- `admin`;
- `content`.

### H. Usuarios e Permissoes

Funcao:

- funcionarios;
- niveis de acesso;
- roles;
- permissoes por modulo;
- logs de login e alteracao.

Permissoes:

- `super_admin`;
- `admin` limitado.

### I. Integracoes e Configuracoes

Funcao:

- parametros globais;
- PTAX;
- ajuste operacional;
- integracoes futuras;
- variaveis operacionais.

Permissoes:

- `super_admin`;
- `admin` leitura/solicitacao.

### J. Assistente Interno / Integracao Futura com IA

No futuro, o painel pode ter uma area de assistente para ajudar a:

- revisar textos;
- sugerir melhorias;
- preparar alteracoes;
- analisar estoque;
- gerar relatorios;
- sugerir atualizacao de precos;
- criar descricoes;
- revisar traducao;
- orientar funcionarios.

Regras:

- o assistente nao deve ter permissao para publicar sozinho;
- tudo deve passar por aprovacao de usuario autorizado;
- toda alteracao precisa gerar log;
- dados sensiveis precisam ficar protegidos;
- integracao real deve usar API segura e permissoes;
- a IA deve sugerir e preparar, mas nao executar alteracoes criticas sem aprovacao.

## Ordem Ideal de Implementacao

1. Autenticacao segura.
2. Roles e permissoes.
3. Produtos e variantes.
4. Precos.
5. Estoque.
6. Clientes.
7. Atacado/B2B.
8. Cotacoes/pedidos.
9. Conteudo do site.
10. Logs.
11. Relatorios.
12. Assistente interno.

## Riscos de Seguranca

- Painel sem autenticacao server-side.
- Acesso admin baseado apenas em JS.
- Dados sensiveis no front-end.
- Falta de logs.
- Permissoes amplas demais.
- Falta de validacao no backend.
- IA publicando sem aprovacao humana.

## Recomendacao

Nao iniciar o painel com dados reais antes de autenticacao, roles, API protegida, banco de dados e auditoria estarem definidos.
