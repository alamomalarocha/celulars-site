# Schema da tabela real de atacado

Este documento define o formato ideal para a futura tabela real de atacado da CELULARS.

## Importante

O arquivo real `data/wholesale-inventory.json` so deve ser usado porque a rota `/atacado` esta protegida por Cloudflare Access. Se nao houver dados comerciais validados, o arquivo deve permanecer como uma lista vazia (`[]`).

## Formato recomendado

```json
[
  {
    "model": "iPhone 17 Pro Max",
    "capacity": "256 GB",
    "color": "Blue",
    "grade": "A+",
    "qty": 10,
    "unit_price_usd": 1155
  }
]
```

## Colunas da tabela real

- `model`
- `capacity`
- `color`
- `grade`
- `qty`
- `unit_price_usd`

O total nao precisa ser salvo manualmente no JSON. Ele deve ser calculado pela tabela:

```text
total_usd = qty * unit_price_usd
```

Exemplo:

```text
10 x US$ 1,155 = US$ 11,550
```

## Campos que nao devem entrar na tabela publica

- `cost` interno
- `profit`
- `total asset`
- formulas
- erros `#VALUE!`
- dados quebrados
- colunas operacionais internas
- produtos nao aprovados para exibicao
- produtos fora do escopo inicial, como Watch, iPad, MacBook, acessorios e misc

## Regras de limpeza antes da publicacao

1. Remover formulas e salvar apenas valores finais.
2. Remover colunas internas de custo e margem.
3. Remover linhas quebradas ou sem aprovacao comercial.
4. Padronizar capacidades, cores, grades e condicoes.
5. Confirmar que `qty` e `unit_price_usd` representam dados autorizados para clientes B2B.
6. Publicar somente depois da protecao Cloudflare Access estar confirmada.
