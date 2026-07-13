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
