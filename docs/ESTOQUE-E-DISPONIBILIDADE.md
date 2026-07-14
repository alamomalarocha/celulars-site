# Estoque e disponibilidade CELULARS

## Escopo e privacidade

A aba **Estoque e disponibilidade** do gerenciador local controla quantidades por produto e capacidade. Ela funciona apenas em `127.0.0.1`, não possui backend público e não é copiada para `dist`.

O inventário real fica em:

`data/inventory-private.json`

Esse arquivo está no `.gitignore`. Backups, histórico, planilhas exportadas e observações internas também são privados. Nunca publicar inventário, reservas, disponibilidade, observações, custos, fornecedores, clientes, IMEI, serial, senhas ou tokens.

O arquivo rastreado `data/inventory-private.example.json` contém somente demonstração fictícia e usa `"demo": true`. O validador rejeita um inventário demo como produção.

## Como iniciar

Na raiz do projeto:

```powershell
npm run catalog:admin
```

Abra `http://127.0.0.1:4175` e selecione **Estoque e disponibilidade**.

Para testar sem tocar nos arquivos reais:

```powershell
npm run catalog:demo
```

O modo demonstração usa diretório temporário, mostra uma faixa permanente e bloqueia a geração do site. Os valores `3`, `2` e `1` são fictícios e existem somente no example, no modo demo e nos testes.

## Criar a estrutura inicial

Se `data/inventory-private.json` ainda não existir, a aba oferece **Criar estrutura inicial de estoque**. A prévia deve ser confirmada antes da gravação.

A estrutura é derivada somente das combinações reais de produto e capacidade do catálogo. Ela não cria cores por capacidade e não altera preço, modelo, ano, cor ou catálogo público. Todos os estoques e reservas começam em zero, o limite começa em um, o status começa como `active` e as notas começam vazias.

O campo `color` permanece `null` nesta fase. Estoque por modelo, capacidade e cor é uma evolução futura; não se deve presumir que toda cor exista em toda capacidade.

## Significado dos campos

- **Estoque físico (`stock_on_hand`)**: quantidade física inteira e não negativa.
- **Reservado (`reserved`)**: parte do estoque já reservada; nunca pode superar o estoque físico.
- **Disponível**: calculado como `stock_on_hand - reserved`; não é salvo como fonte principal.
- **Limite baixo (`low_stock_threshold`)**: quantidade inteira e não negativa usada para alertas.
- **Status**: `active`, `paused` ou `archived`.
- **Observação (`notes`)**: texto interno com até 500 caracteres.
- **Atualização (`updated_at`)**: preenchida automaticamente ao salvar.

Rótulos internos:

- disponível: disponível maior que o limite;
- estoque baixo: disponível entre um e o limite;
- sem estoque: disponível igual a zero;
- reservado: reserva maior que zero;
- pausado ou arquivado: conforme o status operacional.

## Preço CPO e alertas

O preço mostrado na aba é somente leitura e vem do catálogo canônico. A edição de preço CPO continua na área própria de preços ou na planilha CPO.

Preço CPO igual a zero significa que a combinação está cadastrada, mas ainda não tem preço comercial definido. Se houver estoque físico com preço CPO zero, o gerenciador alerta e exige confirmação; ele não publica o estoque nem cria preço automaticamente.

Outros alertas incluem estoque baixo, item ativo sem estoque, item pausado com estoque, reserva e registro sem atualização recente. Alertas não alteram dados automaticamente.

## Edição, revisão e gravação

Campos editáveis: estoque físico, reservado, limite, status e observação. Modelo, grupo, ano, capacidade, preço, disponibilidade e data anterior são somente leitura.

Antes de salvar, revise o diff por modelo, capacidade, campo, valor anterior e valor novo. A gravação exige confirmação explícita.

O fluxo seguro é:

1. adquirir o lock compartilhado;
2. reler e validar catálogo e inventário;
3. criar backup único;
4. escrever arquivo temporário;
5. reler e validar o temporário;
6. substituir o inventário de forma atômica;
7. registrar histórico por campo;
8. liberar o lock em `finally`.

Falhas restauram o conteúdo anterior. Gravação de preço, gravação/importação de inventário e build compartilham o mesmo lock; uma segunda operação mutável recebe HTTP 409.

Backups:

`data/backups/inventory-private-<timestamp>-<uuid>.json`

Histórico JSON Lines:

`data/history/inventory-changes.jsonl`

O histórico registra timestamp, IDs, capacidade, campo, antes, depois e hashes. Não registra caminhos pessoais nem dados sensíveis.

## Planilha de estoque

**Baixar planilha de estoque** exporta CSV UTF-8 com BOM, separador `;` e CRLF. Colunas:

```text
inventory_hash;inventory_id;product_id;model;year;group;capacity;price_usd;stock_on_hand;reserved;available;low_stock_threshold;status;notes;updated_at
```

Edite somente:

- `stock_on_hand`
- `reserved`
- `low_stock_threshold`
- `status`
- `notes`

As demais colunas protegem identidade, estrutura e versão. Célula editável vazia significa não alterar. Linha ausente não altera. O arquivo é limitado a 2 MB.

A validação bloqueia hash antigo, ID duplicado ou inexistente, produto/capacidade divergente, campo desconhecido, número negativo ou decimal, reserva superior ao estoque, status inválido, nota longa e fórmula/comando de planilha. A prévia mostra resumo, erros, alertas e diff antes da aplicação.

**Baixar relatório de disponibilidade** gera uma planilha interna com preço, estoque físico, reserva, disponível, status operacional e situação do preço.

## Testes e build

Execute:

```powershell
npm run inventory:test
npm run catalog:test
npm run catalog:csv-test
npm run validate
npm run build
```

Os testes usam arquivos temporários e preservam o catálogo real byte a byte. Eles cobrem criação, validações, CSV, XSS, concorrência, build simultâneo, rollback, demo e limite de tamanho.

O build usa allowlist explícita. `dist` não pode conter inventário, example, regras, ferramenta, API interna, CSV, fixtures, backups, histórico ou documentação interna. Rotas como `/inventory/`, `/data/inventory-private.json`, `/tools/`, `/internal/` e `/catalog-manager/` não existem no artefato estático e devem retornar 404.

## Fluxo de Git e preview

O inventário real e seus derivados nunca entram no Git. Somente código, schema de exemplo e documentação podem ser revisados em branch/PR. Antes de publicar, confira `git status`, rode todos os testes e inspecione `dist`.

O preview Cloudflare deve permanecer equivalente ao site público atual e não deve ter link, rota ou dado de inventário. O gerenciador não faz commit, push ou deploy.
