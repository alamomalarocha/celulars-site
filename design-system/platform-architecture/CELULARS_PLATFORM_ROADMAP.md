# CELULARS Platform Roadmap

## Visão geral

O projeto CELULARS deve evoluir de um site estático para uma plataforma comercial completa, com site público, área B2B protegida, painel administrativo, dados estruturados, API reutilizável e base preparada para app iOS/Android.

O caminho recomendado é evolutivo: manter o site público estável, proteger rotas sensíveis primeiro, depois introduzir backend, banco de dados e painel administrativo por fases.

## Estado atual

- Site público publicado no Cloudflare Pages.
- Último commit de referência: `a179af9 Update iPhones page to new iPhone 17 pricing`.
- Página iPhones pública focada na linha nova iPhone 17.
- Tabela pública sem imagens, sem CDVS visual e sem eCPO público.
- PTAX/Cotação CELULARS ativa no front-end atual.
- Página Atacado sem inventário real exposto.
- WhatsApp institucional como principal canal de conversão.
- Cloudflare Access já foi avaliado/testado como camada de proteção.

## Fases recomendadas

### Fase 1 - Site público estável

Objetivo: manter Home, iPhones, Atacado, Sobre e Contato confiáveis, rápidos e sem dados sensíveis.

Itens:
- preservar PTAX;
- manter catálogo público sem inventário real;
- revisar SEO e performance;
- padronizar conteúdo institucional;
- manter WhatsApp como CTA principal.

### Fase 2 - Atacado protegido básico

Objetivo: proteger a área de atacado antes de expor qualquer dado comercial sensível.

Itens:
- usar Cloudflare Access como primeira camada;
- não colocar inventário real em HTML/JS público;
- criar conteúdo B2B protegido simples;
- registrar manualmente clientes autorizados enquanto não houver backend.

### Fase 3 - Backend/API inicial

Objetivo: criar API server-side para dados que não devem ficar no front-end.

Opção recomendada inicial:
- Cloudflare Pages Functions ou Workers;
- rotas públicas limitadas;
- rotas protegidas para B2B/admin;
- validação no servidor;
- variáveis sensíveis em ambiente seguro.

### Fase 4 - Painel administrativo

Objetivo: criar painel interno para gerenciar dados sem editar código.

Itens:
- autenticação server-side;
- roles e permissões;
- produtos;
- preços;
- estoque;
- clientes;
- logs.

### Fase 5 - Clientes B2B com conta

Objetivo: permitir que clientes aprovados acessem dados comerciais.

Itens:
- solicitação de acesso;
- aprovação manual;
- perfil da empresa;
- permissões por cliente;
- histórico de consultas.

### Fase 6 - Controle de estoque

Objetivo: controlar disponibilidade, condição, grade, lote e origem.

Itens:
- produtos e variantes;
- quantidade;
- condição;
- lote;
- reserva;
- status.

### Fase 7 - Pedidos/consultas B2B

Objetivo: registrar intenção comercial e reduzir perda de informação no WhatsApp.

Itens:
- solicitação de cotação;
- pedido em análise;
- histórico;
- vínculo com vendedor;
- notificações internas.

### Fase 8 - Relatórios e auditoria

Objetivo: dar visibilidade de operação sem expor dados indevidos.

Itens:
- logs de alteração;
- relatórios por produto;
- relatórios por cliente;
- exportações;
- trilha de auditoria.

### Fase 9 - Preparação para app iOS/Android

Objetivo: separar regras e dados da interface web.

Itens:
- API versionada;
- autenticação reutilizável;
- contratos de dados;
- endpoints públicos e protegidos;
- estrutura de mídia.

### Fase 10 - App mobile

Objetivo: criar app quando API, dados e autenticação estiverem maduros.

Possíveis telas:
- login;
- catálogo;
- estoque B2B;
- pedidos/cotações;
- notificações;
- perfil do cliente.

## Comparação de caminhos

### Opção A - Site estático + Cloudflare Access temporário

Boa para curto prazo. Simples, barata e segura para bloquear páginas inteiras. Não resolve painel, dados dinâmicos ou permissões finas por cliente.

### Opção B - Pages Functions para rotas protegidas

Boa evolução inicial. Permite começar a ter API sem migrar o site inteiro. Recomendado como próximo passo técnico.

### Opção C - Cloudflare D1

Boa para dados relacionais: usuários, clientes, produtos, estoque, preços, pedidos e logs. Recomendado quando a plataforma sair do estágio estático.

### Opção D - KV/R2

KV é útil para cache e configurações simples. R2 é útil para arquivos, imagens e documentos. Não substituir D1 para dados relacionais importantes.

### Opção E - Framework completo no futuro

Pode ser necessário se o painel crescer muito. Não é recomendado migrar agora sem necessidade.

## Recomendações

1. Manter o site público estável.
2. Usar Cloudflare Access apenas como camada inicial para Atacado.
3. Criar API com Pages Functions/Workers antes de expor dados reais.
4. Usar D1 para dados estruturados.
5. Usar R2 para arquivos e mídia.
6. Usar KV apenas para cache e configurações simples.
7. Criar painel admin somente depois de autenticação e modelo de permissões.
8. Preparar app apenas depois que a API estiver madura.

## Riscos

- Colocar senha, estoque ou preços sensíveis no front-end público.
- Criar painel sem autenticação server-side.
- Misturar regras comerciais no HTML estático.
- Usar Cloudflare Access como se fosse sistema completo de usuários.
- Não registrar logs de alteração.
- Criar app antes de uma API confiável.

## Próximos passos

1. Aprovar este roadmap.
2. Definir se a Fase 2 usará Cloudflare Access como bloqueio inicial do Atacado.
3. Planejar a primeira Pages Function.
4. Definir modelo mínimo de dados para produtos, clientes e preços.
5. Criar protótipo seguro do painel admin sem dados reais.
