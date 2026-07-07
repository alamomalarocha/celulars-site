# Estrategia de Tabelas Editaveis CELULARS

## Objetivo

Registrar a estrategia para que toda tabela exibida no site CELULARS evolua para uma fonte editavel pelo painel administrativo.

O objetivo e deixar de depender de alteracoes manuais em HTML/JS para atualizar precos, estoque, produtos, clientes, conteudo e configuracoes operacionais.

## Regra Principal

Nenhuma tabela deve ficar permanentemente hardcoded no HTML.

Toda tabela deve ser planejada para:

- origem em banco de dados;
- leitura via API;
- edicao via painel administrativo;
- controle de permissoes;
- validacao server-side;
- historico de alteracoes;
- possibilidade de consumo por site publico, area B2B e futuro app.

## Tabelas Atuais e Futuras

### A. iPhones novos linha 17

Hoje:

- HTML/JS;
- preco Apple + taxa FL 7% + conversao pela Cotacao CELULARS/PTAX.

Futuro:

- `products`;
- `product_variants`;
- `retail_prices`;
- `exchange_rates`;
- `settings`.

Editavel por:

- `super_admin`;
- `admin`;
- `sales` com permissao definida.

Visivel publico:

- sim.

### B. iPhones eCPO 12 ao 17

Hoje:

- HTML/JS sem preco publico;
- mostra preco sob consulta.

Futuro:

- `products`;
- `product_variants`;
- `ecpo_prices`;
- `inventory`.

Editavel por:

- `super_admin`;
- `admin`;
- `inventory`;
- `sales`.

Visivel publico:

- parcial. Modelos/capacidades/cores podem aparecer, mas precos e estoque real dependem de aprovacao.

### C. Atacado

Hoje:

- estrutura sem inventario real exposto.

Futuro:

- `inventory`;
- `wholesale_prices`;
- `b2b_accounts`;
- `customers`.

Editavel por:

- `super_admin`;
- `admin`;
- `sales`;
- `inventory`.

Visivel publico:

- nao.

Visivel B2B:

- sim, conforme permissao.

### D. PTAX/Cotacao

Hoje:

- API/cache + ajuste operacional fixo.

Futuro:

- `exchange_rates`;
- `settings`.

Editavel por:

- `super_admin`;
- `admin` conforme permissao.

Visivel publico:

- sim, apenas taxa final, base, data e informacao de referencia.

### E. Conteudo do Site

Hoje:

- HTML.

Futuro:

- `site_content`;
- `media_assets`.

Editavel por:

- `super_admin`;
- `admin`;
- `content`.

Visivel publico:

- sim, apenas conteudo publicado.

### F. Clientes e Pedidos/Cotacoes

Hoje:

- atendimento principalmente por WhatsApp.

Futuro:

- `customers`;
- `b2b_accounts`;
- `quote_requests`;
- `orders`;
- `audit_logs`.

Editavel por:

- `super_admin`;
- `admin`;
- `sales`.

Visivel publico:

- nao.

## Dados Publicos

Podem ser publicos quando aprovados:

- modelo;
- ano;
- capacidades;
- cores;
- condicao exibida;
- preco varejo aprovado;
- cotacao de referencia;
- conteudo institucional;
- CTA WhatsApp.

## Dados Privados

Devem permanecer protegidos:

- estoque real;
- custo;
- margem;
- fornecedor;
- lote interno;
- documentos de cliente;
- dados B2B;
- precos atacado;
- logs;
- permissoes;
- configuracoes sensiveis.

## Fluxo Futuro de Atualizacao

1. Admin entra no painel.
2. Edita tabela, preco, estoque, conteudo ou configuracao.
3. Backend valida permissao.
4. Banco salva alteracao.
5. Audit log registra antes/depois.
6. Site publico ou B2B atualiza via API.
7. App futuro consome a mesma API.

## Integracao Futura com Codex / Assistente

O assistente podera ajudar a:

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

- assistente nao publica sozinho;
- usuario autorizado aprova;
- toda alteracao gera log;
- dados sensiveis ficam protegidos;
- integracao real usa API segura e permissoes.

## Stack Recomendada

- Cloudflare Pages para o site.
- Pages Functions/Workers para API e logica server-side.
- D1 para dados relacionais.
- R2 para midia.
- KV para cache e configuracoes simples.
- Cloudflare Access como camada inicial, nao como substituto do painel completo.

## Status

Documentacao de arquitetura. Nenhuma implementacao foi feita nesta etapa.
