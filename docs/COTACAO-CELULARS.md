# Cotação CELULARS

Documento interno sobre a política atual. Esta etapa não altera a fórmula nem o cache.

## Fonte

- Serviço oficial PTAX do Banco Central do Brasil.
- Endpoint OData `CotacaoDolarPeriodo`.
- Campo utilizado: `cotacaoVenda` de USD/BRL.
- A consulta cobre os últimos 14 dias e solicita a cotação mais recente disponível, contemplando fins de semana e feriados.

## Fórmula

`Cotação CELULARS = PTAX de venda + R$ 0,1500`

Os valores estimados em reais usam a Cotação CELULARS. A referência principal dos produtos permanece em USD. A tela exibe a taxa com quatro casas decimais; valores monetários seguem o arredondamento já implementado em cada contexto.

## Cache e falha

- Chave atual: `celulars_bcb_ptax_usd_brl_v3_spread15`.
- Chaves antigas v1 e v2 são lidas apenas como fallback.
- TTL: 86.400.000 ms (24 horas).
- Timeout da API: 8.000 ms.
- Uma cotação válida do mesmo dia pode ser reutilizada.
- Se a API falhar, o site usa a última cotação válida salva.
- Sem cache disponível, usa o fallback já existente e orienta a confirmação pelo WhatsApp.
- A data apresentada é a data da cotação retornada pelo Banco Central, não apenas a data da consulta.

## Decisão futura

Avaliar separadamente se haverá atualização intradiária. Não alterar a política atual sem revisão comercial e teste de consistência entre todas as páginas.
