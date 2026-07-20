# Acesso local a Plataforma CELULARS DEMO

## Limite de uso

A plataforma e local, ficticia e separada do site publico. Nao publique esta URL nem reutilize as contas em producao.

## Contas semeadas

| Perfil | Contas |
| --- | --- |
| Administrador | `admin@demo.invalid` |
| Funcionarios | `funcionario1@demo.invalid` a `funcionario3@demo.invalid` |
| Atacadistas | `atacadista1@demo.invalid` a `atacadista5@demo.invalid` |

A senha nunca e versionada. Todos os usuarios recebem a senha local fornecida ao reset ou a senha aleatoria criada pelo seed.

## Gerar credenciais locais

```powershell
npm run platform:build
npm run platform:seed
```

O seed grava `apps/platform/data/demo-credentials.json` com permissao local restrita. Leia o arquivo somente na maquina de homologacao. Ele esta no `.gitignore`.

## Reset com senha escolhida

```powershell
$env:PLATFORM_DEMO_PASSWORD = '<senha-local-temporaria>'
npm run platform:reset
```

O reset nao grava a senha em documentacao. Remova a variavel do terminal ao terminar:

```powershell
Remove-Item Env:PLATFORM_DEMO_PASSWORD
```

## Iniciar

```powershell
npm run platform:dev
```

Abra `http://127.0.0.1:4178`.

## Variaveis locais importantes

| Variavel | Padrao / uso |
| --- | --- |
| `CELULARS_PLATFORM_DEMO` | deve ser `1` |
| `PLATFORM_PORT` | `4178` |
| `PLATFORM_HOST` | `127.0.0.1` |
| `PLATFORM_ALLOWED_ORIGIN` | origem local exata |
| `PLATFORM_SESSION_SECRET` | segredo local; substituir antes de preview protegido |
| `PLATFORM_SECURE_COOKIES` | `0` local; `1` somente sob HTTPS |
| `PLATFORM_DATABASE_PATH` | deve permanecer sob `apps/platform/data/` |

Nunca use valores reais de cliente, empresa, documento, senha, pagamento ou estoque nesta instancia.
