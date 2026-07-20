# Recuperacao controlada da Plataforma CELULARS em producao

Este runbook cobre falhas de migration ou deploy. Ele nao executa restauracao automaticamente e nao concede autorizacao para alterar producao. Rollback ou restore exige aprovacao humana explicita, identificacao do incidente, registro do commit e conferencia do alvo `celulars-platform-prod-db`.

## Criterios para nao prosseguir

Pare quando o backup nao existir, estiver vazio, truncado ou nao puder ser validado; quando Worker, D1, conta, ambiente, commit ou artifact estiver ambiguo; quando houver risco para DEMO, Pages ou site publico; quando houver escrita parcial sem diagnostico; quando faltar aprovacao para etapa destrutiva; ou quando secrets e dados sensiveis puderem ser expostos.

Nunca execute nova migration, deploy ou restore como tentativa exploratoria.

## 1. Conter e registrar

1. Nao reexecute o workflow e nao faca novo push.
2. Registre run ID, commit SHA, horario, job e etapa que falhou.
3. Determine se a falha ocorreu antes do backup, durante a migration, no deploy ou nos smoke tests.
4. Preserve somente logs sanitizados.
5. Confirme que `https://celulars.com.br` continua respondendo; nao altere Pages, DNS ou arquivos publicos.

## 2. Localizar e baixar o artifact

1. Abra o run da `main` correspondente ao commit afetado.
2. Localize `celulars-platform-prod-backup-<commit-sha>` em **Artifacts**.
3. Baixe o ZIP por sessao GitHub autenticada e autorizada.
4. Extraia em diretorio protegido fora do repositorio.
5. Confirme que existe exatamente `celulars-platform-prod-pre-deploy.sql` e nenhum arquivo inesperado.

Se o artifact nao existir, pare. Nao considere a migration recuperavel por este procedimento.

## 3. Verificar o backup sem restaurar

1. Registre tamanho e SHA-256 do SQL extraido.
2. Confirme que o arquivo e nao vazio, legivel e sem truncamento aparente.
3. Verifique cabecalho e statements esperados de exportacao D1.
4. Confirme correspondencia com run, commit e banco de producao.
5. Nao publique, anexe a issues ou adicione o arquivo ao Git.

Quando autorizado, valide em D1 temporario isolado e vazio, nunca na DEMO ou producao. Criar recurso temporario exige autorizacao de custo separada.

## 4. Escolher a recuperacao

- Falha antes da migration: nao restaure; corrija em nova PR.
- Migration falhou sem mudanca: confirme com consultas somente leitura antes de decidir.
- Migration alterou parcialmente o D1: use compensacao revisada ou restore completo somente com aprovacao.
- Deploy falhou apos migration valida: prefira rollback do Worker se o schema for compativel.
- Smoke test falhou: preserve o site publico, diagnostique Worker e Access e avalie rollback.

## 5. Rollback do Worker

1. Liste deployments de `celulars-platform` e identifique a versao anterior saudavel.
2. Confirme compatibilidade da versao anterior com o schema atual.
3. Registre versoes atual e alvo, impacto e aprovacao humana.
4. Execute somente o mecanismo oficial de rollback do Cloudflare.
5. Nao altere DNS, Custom Domain, Access ou `celulars.com.br`.

Se aplicacao e schema forem incompativeis, pare e trate-os como recuperacao conjunta.

## 6. Restauracao controlada do D1

Restore e destrutivo. Antes de qualquer comando:

1. confirme por duas pessoas ou aprovacao registrada o database ID e `celulars-platform-prod-db`;
2. obtenha um segundo export somente leitura do estado incidente, quando possivel;
3. registre hashes dos arquivos fora do Git;
4. confirme janela de manutencao e indisponibilidade;
5. valide o procedimento em ambiente isolado quando autorizado;
6. use somente comando oficial D1 previamente revisado e aprovado;
7. nunca use `wrangler.jsonc` da DEMO e nunca execute seed ou reset.

O repositorio deliberadamente nao oferece restore automatico. Consulte a documentacao oficial vigente do Cloudflare e submeta o comando exato a revisao humana antes de executa-lo.

## 7. Verificacoes posteriores

Em modo somente leitura, confirme migrations esperadas, zero violacoes referenciais, contagens comerciais, administrador e MFA, Access, `workers.dev` indisponivel, painel sem 500, assets, smoke tests e o site publico completo. Confirme tambem DEMO isolada e importacao e integracoes externas desabilitadas.

## 8. Encerramento

Documente causa, decisao, aprovadores, versoes, hashes, horario, verificacoes e pendencias. Nao apague artifacts antes da retencao. Retomar deploy exige nova PR, validacao completa e aprovacao humana; nunca apenas repetir o job que falhou.
