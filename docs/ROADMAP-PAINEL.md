# Roadmap do futuro painel CELULARS

Este documento descreve direção técnica. Nenhum painel, login ou backend é implementado nesta etapa.

## Módulos previstos

- produtos e modelos;
- cores e capacidades;
- preços de aparelhos novos;
- preços CPO;
- estoque e disponibilidade;
- clientes comerciais;
- funcionários e administradores;
- permissões por função;
- mensagens e solicitações;
- auditoria;
- histórico de alterações.

## Regras de segurança

- Não criar login somente em JavaScript.
- Não armazenar senha, token ou segredo no frontend.
- Usar backend e autenticação reais.
- Separar dados públicos de dados restritos.
- Proteger preços de atacado, custos, margens, fornecedores, IMEI, serial e dados de clientes.
- Registrar autoria, data e conteúdo das alterações administrativas.
- Aplicar autorização no servidor, não apenas ocultação visual.

## Integração futura

`data/catalog-public.json` é a fonte canônica pública atual. Um painel futuro deverá atualizar dados por um fluxo autenticado e validado, gerar a representação pública e preservar o contrato de dados verificado por `scripts/validate-site.mjs`.

Antes de qualquer implementação, definir provedor de autenticação, armazenamento, modelo de permissões, trilha de auditoria, estratégia de backup e processo de publicação.
