# Runbook da Plataforma CELULARS DEMO

## Preparacao

```powershell
npm install
npm run platform:build
$env:PLATFORM_DEMO_PASSWORD = '<senha-local-temporaria>'
npm run platform:reset
npm run platform:dev
```

A URL padrao e `http://127.0.0.1:4178`.

## Operacao diaria

1. confirme `git status --short`;
2. confirme que o processo escuta somente em `127.0.0.1`;
3. execute `npm run platform:check` antes de homologar;
4. use somente dados DEMO;
5. encerre o processo ao concluir;
6. remova variaveis sensiveis do terminal.

## Reset DEMO

```powershell
$env:PLATFORM_DEMO_PASSWORD = '<senha-local-temporaria>'
npm run platform:reset
```

O reset:

- valida que o arquivo esta sob `apps/platform/data/`;
- remove apenas SQLite DEMO, WAL e SHM;
- aplica todas as migrations;
- recria IDs, datas e registros operacionais de forma deterministica;
- preserva catalogo, inventario privado, site publico e `dist/`.

O seed produz 1 administrador, 3 funcionarios, 5 atacadistas, 5 empresas atacadistas, 15 clientes, 20 solicitacoes, 10 cotacoes, 8 pedidos, 30 mensagens e snapshots do catalogo DEMO.

## Verificacao de determinismo

Execute o reset duas vezes com a mesma senha e segredo de sessao. Compare contagens e uma serializacao ordenada de todas as tabelas, ignorando arquivos de journal e somente `schema_migrations.applied_at`, que registra o horario real da migration. O hash logico restante deve ser igual. O hash binario do SQLite nao e criterio de aceite.

## Migrations

```powershell
npm run platform:build
npm run platform:migrate
```

Migrations aplicadas ficam em `schema_migrations`. Nao edite migration ja aplicada; crie uma nova migration versionada.

## Testes

```powershell
npm run platform:lint
npm run platform:typecheck
npm run platform:build
npm run platform:test
npm run platform:e2e
npm run platform:check
```


## Diagnostico, backup e preparacao externa

```powershell
npm run platform:doctor
npm run platform:backup
npm run platform:deploy:check
npm run platform:activation:check
```

O doctor deve retornar READY no ambiente DEMO. O deploy-check apenas valida a preparacao e nunca publica. O activation-check deve permanecer NOT READY ate banco, storage, dominio/TLS, segredos, providers, staging, politicas e aprovacoes reais serem provisionados. O backup DEMO inclui SQLite, documentos privados e metadados nao secretos com checksum por artefato.

Para criptografar todos os artefatos do backup com AES-256-GCM, defina `PLATFORM_BACKUP_PASSPHRASE` antes de executar o comando. A restauracao de teste exige a mesma frase; frase ausente ou incorreta falha de forma fechada. O adaptador remoto permanece desabilitado ate um destino externo ser explicitamente provisionado.

## Solucao de problemas

### Banco sem usuarios

Execute `platform:reset` ou `platform:seed` antes de `platform:dev`.

### Caminho de banco inseguro

Remova `PLATFORM_DATABASE_PATH` ou aponte para um `.sqlite` dentro de `apps/platform/data/`.

### Origem ou CSRF recusados

Confirme que `PLATFORM_ALLOWED_ORIGIN` coincide exatamente com protocolo, host e porta acessados. Recarregue a sessao para obter um token CSRF valido.

### Cookie nao enviado

Em HTTP local, mantenha `PLATFORM_SECURE_COOKIES=0`. Em HTTPS protegido, use `1`.

### Porta ocupada

Defina outra porta e a origem correspondente antes de iniciar.

### Credenciais perdidas

Execute `platform:seed` para gerar novo arquivo local ou `platform:reset` com uma nova senha temporaria.

## Incidente local

1. encerre o servidor;
2. preserve logs sem credenciais;
3. revogue a sessao pelo reset;
4. confirme que nenhum arquivo DEMO entrou no Git ou `dist/`;
5. execute todos os testes antes de retomar.

## Evidencia de homologacao

Registrar fora do Git:

- commit testado;
- saida do `platform:check`;
- hashes dos dados reais protegidos;
- comparacao dos dois resets;
- capturas de desktop e mobile;
- URL local e horario do teste;
- pendencias para producao.

## Encerramento

Confirme processo local encerrado, Git limpo, screenshots fora do repositorio e ausencia de `platform`, SQLite ou credenciais em `dist/`.
