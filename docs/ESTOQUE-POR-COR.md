# Estoque opcional por cor CELULARS

## Objetivo e privacidade

O gerenciador local pode controlar cada combinação de modelo e capacidade em um de dois modos:

- `aggregate`: estoque único por modelo e capacidade;
- `by_color`: estoque dividido somente entre as cores escolhidas explicitamente para aquele registro.

O modo agregado continua sendo o padrão. Registros antigos sem `tracking_mode` são lidos como agregados, sem migração ou regravação obrigatória.

O detalhamento é privado. Inventário, variantes, planilhas, backups, histórico, fixtures e ferramenta local não entram em `dist`, GitHub, Cloudflare Pages ou site público.

## Estrutura

No modo agregado:

```json
{
  "tracking_mode": "aggregate",
  "stock_on_hand": 5,
  "reserved": 1
}
```

No modo por cor:

```json
{
  "tracking_mode": "by_color",
  "stock_on_hand": 5,
  "reserved": 1,
  "color_variants": [
    {
      "color": "Black Titanium",
      "stock_on_hand": 3,
      "reserved": 1,
      "updated_at": "2026-07-16T00:00:00.000Z"
    },
    {
      "color": "White Titanium",
      "stock_on_hand": 2,
      "reserved": 0,
      "updated_at": "2026-07-16T00:00:00.000Z"
    }
  ]
}
```

`available` nunca é a fonte principal. Ele é derivado por `stock_on_hand - reserved`.

No modo por cor:

- o estoque agregado é a soma dos estoques das variantes;
- o reservado agregado é a soma dos reservados das variantes;
- a disponibilidade agregada é a soma das disponibilidades;
- `color` no nível principal permanece `null`;
- os totais agregados ficam somente leitura.

## Ativar “Detalhar por cor”

1. Abra **Estoque e disponibilidade**.
2. Localize uma combinação específica de modelo e capacidade.
3. Clique em **Detalhar por cor**.
4. Selecione somente as cores realmente usadas nesse registro.
5. Distribua estoque e reservado.
6. Revise o diff e os totais.
7. Confirme **Ativar estoque por cor**.

Nenhuma cor é selecionada automaticamente. O sistema não cria o produto cartesiano de cores por capacidades.

Se os totais agregados estiverem zerados, as cores selecionadas podem ser ativadas com tudo zerado. Se houver unidades, as somas por cor devem coincidir exatamente com os totais anteriores. Não há arredondamento nem correção silenciosa.

## Regras das variantes

Cada variante possui somente:

- cor oficial em inglês;
- estoque físico inteiro e não negativo;
- reservado inteiro e não negativo;
- data de atualização.

O reservado nunca pode superar o estoque da própria cor. Cores vazias, duplicadas, desconhecidas, renomeadas ou fora do catálogo são bloqueadas.

Preço, threshold, status e notas continuam no nível agregado.

## Editar, adicionar e remover cores

No registro expandido, edite estoque e reservado de cada variante. O resumo agregado é recalculado a partir delas.

**Adicionar cor** aceita apenas uma cor oficial ainda não detalhada. A nova variante começa com estoque e reservado zerados. Nenhuma unidade é transferida automaticamente.

**Remover cor** é permitido somente quando estoque e reservado da variante são zero. A última variante não pode ser removida; para voltar ao modo agregado use **Consolidar estoque**.

## Consolidar estoque

**Consolidar estoque**:

- soma as variantes;
- preserva estoque, reservado, threshold, status e notas;
- volta o registro para `aggregate`;
- remove `color_variants` do estado atual somente após confirmação;
- cria backup;
- registra histórico.

O histórico da operação permanece disponível, embora o detalhamento deixe de fazer parte do estado atual.

## Alertas

O painel interno pode sinalizar:

- cor com estoque baixo usando o threshold agregado apenas como referência;
- cor com unidades reservadas;
- CPO detalhado por cor com preço zero;
- registro pausado com estoque;
- soma inconsistente;
- cor duplicada ou fora do catálogo.

Alertas não alteram o inventário automaticamente e nunca são publicados.

## Planilha de estoque por cor

Use **Baixar planilha de estoque por cor** para gerar:

`estoque-por-cor-celulars.csv`

Formato:

- UTF-8 com BOM;
- separador `;`;
- CRLF;
- máximo de 2 MB.

Colunas:

```text
inventory_hash;inventory_id;product_id;model;year;group;capacity;color;stock_on_hand;reserved;available;status;updated_at
```

Edite somente:

- `stock_on_hand`
- `reserved`

Não é permitido criar, remover ou renomear cores pela planilha. Essas operações pertencem à interface. A importação exige todas as variantes atuais, bloqueia duplicatas, hash antigo, fórmulas, comandos, XSS, campos de identidade alterados, números inválidos e reserva superior ao estoque.

O CSV agregado continua disponível. Para registros `by_color`, ele exporta os totais derivados, mas bloqueia a edição de estoque e reservado e orienta o uso da planilha por cor. Threshold, status e notas agregadas continuam editáveis no fluxo agregado.

## Backup, histórico, lock e rollback

Toda gravação real por cor:

1. adquire o lock compartilhado;
2. relê catálogo e inventário;
3. confirma o hash atual;
4. valida cores e quantidades;
5. cria backup;
6. escreve de forma atômica;
7. relê e valida o resultado;
8. registra histórico;
9. libera o lock em `finally`.

Falhas restauram byte a byte o conteúdo anterior. O mesmo lock protege edições manuais, importações CSV, restaurações e build.

O histórico registra ação, IDs, capacidade, valores anteriores e novos, totais e hashes. Não registra dados pessoais nem caminhos locais.

## Modo demonstração

Execute:

```powershell
npm run catalog:demo
```

O demo usa diretório temporário, um produto Novo, dois CPO e duas ou três cores por registro. Os preços fictícios `111.11`, `222.22` e `333.33` existem apenas no catálogo temporário. O build permanece bloqueado.

## Testes

Depois de gerar `dist`, execute:

```powershell
npm run inventory:color-test
```

A suíte cobre compatibilidade antiga, ativação, somas, validação de cores, edição, adição, remoção, consolidação, CSV, injeções, hash antigo, concorrência, rollback, demo, preservação do catálogo/inventário reais e ausência de dados privados em `dist`.

## Limitações atuais

- `low_stock_threshold` é agregado;
- `status` é agregado;
- `notes` é agregado;
- não há preço, fornecedor, lote, IMEI, serial, custo ou cliente por cor;
- não há transferência automática entre cores;
- não há criação de variantes por CSV.

Fases futuras podem avaliar threshold por cor e estoque por lote, mantendo a mesma política de privacidade.
