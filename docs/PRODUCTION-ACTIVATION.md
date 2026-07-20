# Governanca de ativacao da Plataforma CELULARS

A infraestrutura do painel de producao ja esta provisionada, mas permanece com banco comercial vazio, importacao bloqueada e integracoes externas desligadas. Consulte [CURRENT-PRODUCTION-STATE.md](CURRENT-PRODUCTION-STATE.md). Provisionamento nao autoriza importar dados, ativar providers ou mesclar o PR #7.

## Bloqueios atuais para operacao comercial completa

- dados comerciais ainda nao foram autorizados;
- importacao real e integracoes externas estao desabilitadas;
- a configuracao efetiva do Access e o painel autenticado ainda exigem homologacao humana;
- nao ha ambiente de staging protegido aprovado;
- nao ha politica de retencao e privacidade aplicada a dados reais.

## Checklist de ativacao

### Infraestrutura

- escolher runtime protegido separado do Pages publico;
- adotar D1, PostgreSQL ou banco transacional aprovado;
- configurar migrations automatizadas e rollback;
- configurar backups, restauracao e monitoramento;
- separar desenvolvimento, homologacao e producao.

### Identidade e segredos

- integrar provedor de identidade aprovado;
- exigir MFA para administradores;
- armazenar segredos em cofre gerenciado;
- remover todos os fallbacks DEMO;
- definir rotacao e revogacao de sessoes;
- ativar cookies `Secure` sob HTTPS.

### Dados

- definir responsavel e finalidade de cada dado;
- revisar LGPD, privacidade e retencao;
- importar apenas dados reais aprovados;
- nunca migrar o banco DEMO;
- validar isolamento por empresa e trilha de auditoria.

### Integracoes

- habilitar e-mail em ambiente de teste antes de producao;
- habilitar WhatsApp com templates e consentimento;
- homologar pagamentos sem armazenar dados de cartao;
- homologar transportadoras e webhooks assinados;
- definir idempotencia, retries e dead-letter handling.

### Aplicacao

- repetir threat model e pentest;
- executar testes de carga e concorrencia;
- validar WCAG 2.2 AA;
- adicionar logs estruturados sem PII desnecessaria;
- configurar alertas, SLOs e resposta a incidentes;
- revisar RBAC com a operacao CELULARS.

### Liberacao

1. congelar schema aprovado;
2. executar migrations em staging;
3. validar smoke tests e E2E;
4. fazer backup e ensaio de restauracao;
5. revisar configuracoes e segredos;
6. obter aprovacao humana formal;
7. liberar gradualmente;
8. monitorar e manter plano de rollback.

## Rollback

O rollback deve cobrir aplicacao, schema e integracoes. Nunca restaure o banco DEMO sobre dados reais. Cada migration de producao precisa de plano de reversao ou compensacao documentado. O procedimento obrigatorio esta em [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md).

## Criterio de pronto

A ativacao real so pode ocorrer quando seguranca, privacidade, backup, observabilidade, operacao, suporte e responsaveis estiverem formalmente definidos. O PR da DEMO nao concede autorizacao de producao.
