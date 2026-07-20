# CELULARS Current State
> Atualizacao de 19 de julho de 2026: este arquivo descreve o site publico e o estado anterior ao projeto da plataforma. A plataforma interna DEMO foi implementada separadamente em `apps/platform/`, esta protegida em `demo.celulars.com.br` e nao alterou os itens publicos descritos aqui. Para o estado atual, consulte `docs/DEMO-ONLINE-DEPLOYMENT.md` e `docs/ROADMAP-PAINEL.md`.

## Referência

Último commit de referência antes deste planejamento:

`a179af9 Update iPhones page to new iPhone 17 pricing`

## Site público

Páginas atuais:
- Home;
- iPhones;
- Atacado;
- Sobre;
- Contato.

## Página iPhones

Estado atual:
- mostra somente modelos novos da linha iPhone 17;
- modelos exibidos: iPhone 17 Pro Max, iPhone 17 Pro, iPhone Air, iPhone 17, iPhone 17e;
- sem eCPO público;
- sem imagens de aparelho;
- sem CDVS visual;
- sem placeholders;
- sem lightbox;
- tabela usa preço Apple + taxa FL 7%;
- conversão BRL usa Cotação CELULARS/PTAX existente.

## PTAX/Cotação CELULARS

Estado:
- PTAX preservada;
- ajuste operacional preservado;
- exibição com 4 casas decimais;
- cache existente preservado.

## Atacado

Estado:
- sem inventário real exposto;
- preparado para evolução futura;
- Cloudflare Access foi considerado/testado anteriormente como camada de proteção.

## Inventário real

Estado:
- removido do front-end público;
- não deve voltar para HTML/JS público.

## Header e identidade

Estado:
- header usa ícone original CELULARS;
- botões e menu foram refinados anteriormente;
- logo institucional preservada em áreas visuais apropriadas.

## Contador ambiental

Estado:
- presente no site conforme ajustes anteriores;
- não alterado nesta etapa.

## CDVS

Estado:
- documentação e estrutura interna existem;
- imagens de aparelho foram removidas da experiência pública da página iPhones;
- CDVS permanece como sistema interno/documental.

## Pontos pendentes no momento deste registro historico

- Definir proteção definitiva da área Atacado.
- Decidir quando iniciar Pages Functions/Workers.
- Criar modelo mínimo de dados.
- Planejar painel admin.
- Planejar fluxo B2B com aprovação.
- Manter site público sem dados sensíveis.
- Evitar implementar login ou estoque antes da arquitetura estar aprovada.
