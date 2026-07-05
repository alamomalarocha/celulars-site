# Wholesale Access Security Plan

## Pagina criada

- `atacado.html`

## Status atual

O login atual e apenas uma interface visual preparada para futura autenticacao segura.

## Garantias desta etapa

1. Nenhuma senha real foi colocada no codigo.
2. Nenhum usuario de teste publico foi criado.
3. Nenhuma tabela real de atacado foi exposta no HTML.
4. Nenhum dado sensivel de atacado foi colocado em CSS ou JavaScript publico.
5. O botao `Entrar` apenas mostra a mensagem de acesso restrito.
6. A solicitacao de acesso acontece pelo WhatsApp institucional da CELULARS.
7. A estrutura visual da tabela de atacado foi preparada apenas com exemplos zerados.
8. Dados reais ainda nao foram publicados.
9. O arquivo `data/wholesale-inventory.sample.json` foi criado apenas para referencia de estrutura.

## Proxima etapa recomendada

Proteger `/atacado` ou uma rota futura `/wholesale` usando uma solucao segura, como:

- Cloudflare Access
- Cloudflare Pages Functions
- Cloudflare Workers
- Backend de autenticacao proprio

Recomendacao principal: Cloudflare Access com liberacao por e-mails aprovados de clientes B2B.

Alternativa futura: Cloudflare Pages Functions ou Worker para validar sessao e entregar dados protegidos.

## Fases do projeto

1. Fase 1 - Pagina visual criada.
2. Fase 2 - Estrutura sample criada.
3. Fase 3 - Preparacao para Cloudflare Access.
4. Fase 4 - Ativar Cloudflare Access no painel da Cloudflare.
5. Fase 5 - Limpar e transformar a planilha real em `wholesale-inventory.json`.
6. Fase 6 - Publicar tabela real somente apos protecao confirmada.

## Status da Fase 3

O projeto esta preparado para receber uma camada real de Cloudflare Access antes de qualquer dado comercial sensivel. A pagina `atacado.html` continua publica apenas com linguagem comercial, interface visual e dados de exemplo zerados. Nenhum arquivo real `data/wholesale-inventory.json` deve ser criado antes da protecao estar ativa e testada.

## Primeira versao da tabela real protegida

A primeira versao da tabela real deve ser somente de iPhones e deve permanecer publicada apenas porque `/atacado` esta protegido por Cloudflare Access.

Esta tabela segue um padrao comercial completo de iPhones 12 ao 17. Ela ainda nao e o controle de estoque definitivo da CELULARS. Itens sem quantidade ou preco confirmados devem permanecer com `qty: 0` e `unit_price_usd: 0` ate revisao comercial.

O controle de estoque real, com dados operacionais completos, sera uma etapa futura e nao deve ser confundido com esta tabela comercial provisoria de atacado.

Colunas permitidas:

- Modelo
- Capacidade
- Cor
- Grade
- QTY
- Preco Unit.
- Total

Colunas proibidas:

- Cost
- Profit
- Margem
- Total Asset
- formulas
- erros como `#VALUE!`
- dados internos operacionais

Produtos fora do escopo inicial:

- Apple Watch
- iPad
- MacBook
- acessorios
- misc

O arquivo `data/wholesale-inventory.json` deve conter apenas registros comerciais aprovados para exibicao B2B. Se nao houver dados reais validados, ele deve permanecer como uma lista vazia (`[]`).

## Diretriz para tabela real

A tabela real de atacado so deve ser implementada apos autenticacao segura. Ela nao deve ser escondida apenas com CSS, nem ficar presente no HTML publico, nem ser entregue em JavaScript publico sem controle de acesso.

A tabela real deve ser carregada somente depois da validacao de acesso do cliente B2B. A estrutura atual em `atacado.html` e uma previa visual com dados ficticios e precos zerados.

## Modelo recomendado de acesso

- Liberar acesso por e-mails aprovados de clientes B2B.
- Validar previamente lojistas, revendedores e compradores comerciais.
- Registrar data e criterio de aprovacao.
- Evitar senha compartilhada publica.
- Evitar credenciais fixas no codigo.
- Nunca colocar senha fixa ou tabela real no front-end publico.

## Observacao operacional

A pagina publica de atacado deve explicar o processo comercial e orientar o cliente a solicitar acesso pelo WhatsApp. Dados de lote, preco, margem, disponibilidade e tabela de atacado devem permanecer fora do site publico ate a camada segura estar ativa.

## HOTFIX - Inventario real removido do frontend publico

Em 2026-07-05, o arquivo `data/wholesale-inventory.json` foi zerado para `[]` como medida imediata de seguranca.

Motivo:

- A rota `/atacado` pode ser protegida por Cloudflare Access, mas isso nao protege automaticamente arquivos estaticos em `/data/`.
- Um arquivo publico como `/data/wholesale-inventory.json` pode ser acessado diretamente se estiver publicado no frontend.
- Inventario real, quantidade, preco por lote ou qualquer dado comercial sensivel nao deve ficar em arquivo estatico publico.

Estado apos o hotfix:

- `data/wholesale-inventory.json` permanece vazio.
- `atacado.html` mostra apenas a estrutura visual e uma mensagem de tabela em preparacao.
- A pagina nao deve exibir linhas reais, precos reais, quantidades reais ou estoque real.
- `_headers` adiciona `X-Robots-Tag: noindex, nofollow` e `Cache-Control: no-store` para o JSON, mas isso e apenas mitigacao de indexacao/cache.

Proxima etapa segura:

- Mover o inventario real para Cloudflare Pages Functions, Worker, D1, KV, R2 ou outro backend protegido.
- Entregar dados reais somente depois de validar o cliente B2B no servidor.
- Manter no frontend publico apenas sample, schema ou estrutura sem dados reais.
