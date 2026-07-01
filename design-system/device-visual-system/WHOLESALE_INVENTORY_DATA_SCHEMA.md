# Schema da tabela real de atacado

Este documento define o formato ideal para a futura tabela real de atacado da CELULARS.

## Importante

O arquivo real `data/wholesale-inventory.json` ainda nao deve ser criado nem publicado. Ele so deve existir depois que a protecao Cloudflare Access estiver ativa e testada.

## Formato recomendado

```json
[
  {
    "model": "iPhone 17 Pro Max",
    "capacity": "256 GB",
    "color": "Blue",
    "grade": "A+",
    "condition": "New",
    "qty": 0,
    "unit_price_usd": 0,
    "location": "Miami",
    "notes": ""
  }
]
```

## Colunas da tabela real

- `model`
- `capacity`
- `color`
- `grade`
- `condition`
- `qty`
- `unit_price_usd`
- `total_usd`, calculado no front-end protegido ou no build
- `location`
- `notes`

## Campos que nao devem entrar na tabela publica

- `cost` interno
- `profit`
- `total asset`
- formulas
- erros `#VALUE!`
- dados quebrados
- colunas operacionais internas
- produtos nao aprovados para exibicao

## Regras de limpeza antes da publicacao

1. Remover formulas e salvar apenas valores finais.
2. Remover colunas internas de custo e margem.
3. Remover linhas quebradas ou sem aprovacao comercial.
4. Padronizar capacidades, cores, grades e condicoes.
5. Confirmar que `qty` e `unit_price_usd` representam dados autorizados para clientes B2B.
6. Publicar somente depois da protecao Cloudflare Access estar confirmada.
