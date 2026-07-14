# Gerenciador local do catálogo CELULARS

## Finalidade

O gerenciador permite consultar o catálogo canônico e alterar exclusivamente preços CPO em USD sem editar HTML ou JSON manualmente. Ele funciona somente no computador local, não possui login e não é copiado para `dist`.

Fonte canônica:

`data/catalog-public.json`

O arquivo `data/catalog-public.js` é o espelho gerado para leitura do site e é atualizado junto com a fonte canônica. Nenhum dado de produto é mantido dentro da interface do gerenciador.

## Como iniciar

Na raiz do projeto, execute:

```powershell
npm run catalog:admin
```

Abra:

`http://127.0.0.1:4175`

Para usar outra porta:

```powershell
$env:CELULARS_CATALOG_ADMIN_PORT=4180
npm run catalog:admin
```

O servidor escuta somente em `127.0.0.1`. Ele não deve ser exposto por túnel, proxy ou hospedagem pública.

## Edição de preços CPO

1. Use os filtros de tipo, modelo, ano ou capacidade.
2. Altere um campo de preço CPO.
3. Confira a quantidade de alterações não salvas.
4. Clique em **Revisar alterações**.
5. Compare o valor anterior e o novo.
6. Confirme **Salvar alterações no catálogo**.

Modelos novos, cores, capacidades, anos e nomes são somente leitura nesta versão.

### Significado de zero

`usd: 0` significa que a capacidade existe no catálogo CPO, mas ainda não possui preço comercial definido.

### Significado de ausência

Uma capacidade ausente ou `null` significa que ela não está cadastrada para aquele modelo. O gerenciador não cria capacidades ausentes nem converte ausência em zero.

## Prévia em reais

A prévia usa:

`USD × Cotação CELULARS informada na tela`

A taxa da tela serve apenas para conferência. O gerenciador salva somente USD e não altera a PTAX, o ajuste operacional ou o cache do site público.

## Backup, histórico e gravação

Antes de cada gravação, é criado um arquivo único em:

`data/backups/`

O histórico interno em JSON Lines fica em:

`data/history/catalog-changes.jsonl`

Cada entrada registra data/hora, modelo, capacidade, valor anterior, valor novo e hashes antes/depois. Essas duas pastas estão no `.gitignore` e não entram em `dist`.

O fluxo de gravação é:

1. validar o catálogo atual;
2. validar cada alteração;
3. criar backup;
4. gerar arquivo temporário;
5. validar o conteúdo temporário;
6. substituir a fonte canônica e o módulo público de forma atômica;
7. executar `npm run validate`;
8. restaurar o backup se a validação falhar;
9. registrar o histórico somente após sucesso.

O gerenciador não executa `git commit`, `git push` ou deploy.

## Importação e exportação

**Exportar catálogo atual** baixa a versão salva.

**Exportar com alterações** gera uma cópia local incluindo os campos ainda não salvos.

Na importação, o arquivo é analisado sem sobrescrever a fonte. São rejeitados:

- IDs, modelos, cores ou capacidades diferentes;
- preço de atacado, custo, margem, fornecedor ou outro campo interno;
- preço negativo ou inválido;
- alteração em preço de produto novo;
- estrutura incompatível.

Uma importação válida apenas prepara o diff de preços CPO para revisão.

## Validar e gerar o site

O botão **Validar e gerar site** executa, em ordem:

```powershell
npm run validate
npm run build
```

O resultado mostra status, quantidade de arquivos, caminho de `dist` e hash do catálogo. Não há deploy automático.

Também é possível executar os testes internos:

```powershell
npm run catalog:test
```

Os testes usam uma fixture temporária e não alteram preços reais.

## Planilha de preços CPO

A área **Planilha de preços CPO** permite atualizar em lote as 83 combinações de modelo e capacidade CPO. O arquivo usa UTF-8 com BOM, separador `;` e quebras de linha compatíveis com Excel, Google Sheets e LibreOffice.

Há três exportações:

- **Baixar planilha CPO**: inclui todas as combinações e deixa `new_usd` vazio;
- **Baixar somente preços zerados**: inclui apenas os preços atuais iguais a zero;
- **Baixar catálogo CPO completo**: inclui todas as combinações e preenche `new_usd` com o valor atual, útil para conferência completa.

As colunas são:

```text
catalog_hash;product_id;model;year;grade;capacity;current_usd;new_usd
```

Somente `new_usd` pode ser editada. As demais colunas identificam a versão e a estrutura protegida do catálogo. Se o catálogo mudar depois da exportação, o `catalog_hash` antigo será bloqueado e uma nova planilha deverá ser baixada.

### Valores aceitos em `new_usd`

São aceitos números sem símbolo monetário, maiores ou iguais a zero e com até duas casas decimais:

```text
625
625.5
625.50
625,50
0
0.00
0,00
```

Uma célula vazia significa **não alterar**. Um valor igual a `current_usd` é classificado como inalterado.

São rejeitados valores negativos, texto, símbolos, separadores de milhar ambíguos, mais de duas casas decimais e fórmulas iniciadas por `=`, `+`, `-` ou `@`.

### Importação segura

1. Exporte uma planilha nova.
2. Edite somente `new_usd`.
3. Salve como CSV UTF-8 separado por ponto e vírgula.
4. Arraste o arquivo para a área **Importar e validar** ou selecione-o.
5. Clique em **Importar e validar**.
6. Revise hashes, resumo, erros e diferenças antes/depois.
7. Se houver erros, baixe o relatório CSV e corrija a planilha.
8. Confirme a aplicação somente quando a prévia estiver correta.

O arquivo é limitado a 2 MB. A prévia não grava nada. Na confirmação, o servidor lê e valida novamente o catálogo e a planilha dentro do bloqueio de gravação. Importações simultâneas e importação durante build são bloqueadas.

Valores acima de US$ 10.000 exigem confirmação explícita. A aplicação reutiliza o mesmo backup, histórico, gravação controlada, validação e rollback do editor individual. Uma falha durante gravação ou validação restaura o catálogo anterior.

O CSV não aceita fórmulas e protege células exportadas que possam ser interpretadas por planilhas. A interface apresenta conteúdo importado apenas como texto.

### Testes da planilha

Execute:

```powershell
npm run catalog:csv-test
```

A suíte cobre exportações completa/parcial/zerados, vírgula e ponto decimal, valores inválidos, fórmulas, duplicidades, estrutura alterada, hash antigo, arquivo vazio/malformado/acima de 2 MB, concorrência, build simultâneo, rollback, XSS e preservação byte a byte do catálogo real.

## Revisão no Git

Depois de uma edição real:

```powershell
git diff -- data/catalog-public.json data/catalog-public.js
npm run validate
npm run build
git status
```

Revise os valores e só então faça commit e push pelo fluxo normal do projeto.

## Deploy

O Cloudflare Pages executa `npm run build` e publica somente `dist`. O gerenciador, backups, histórico, scripts administrativos e documentação não entram no artefato.

Nunca editar `dist` manualmente.

Nunca publicar `tools/catalog-manager`, `data/backups` ou `data/history`.

Nunca usar a ferramenta para armazenar custo, margem, fornecedor, estoque, cliente, senha ou token.
