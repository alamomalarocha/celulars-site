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
