# Governança de ativação da Plataforma CELULARS

A base operacional de produção foi ativada com banco comercial vazio. O estado confirmado, incluindo a separação entre evidência automática, evidência humana e itens não verificados, está em [CURRENT-PRODUCTION-STATE.md](CURRENT-PRODUCTION-STATE.md).

## Ativação concluída

- Worker `celulars-platform` e D1 `celulars-platform-prod-db` provisionados e publicados;
- deploy restrito à `main`, depois de `validate`;
- pré-validação somente leitura da conta e do D1 antes de operações remotas;
- backup e artifact criados antes das migrations;
- migrations concluídas antes do deploy;
- smoke tests online executados depois do deploy;
- Cloudflare Access, login administrativo, MFA e logout homologados pelo proprietário;
- módulos comerciais e banco real confirmados vazios;
- site público e aplicação DEMO preservados.

## Bloqueios deliberados para operação comercial com dados reais

- importação de dados reais não foi autorizada;
- cadastro público e integrações externas estão desabilitados;
- nenhum recurso pago foi ativado;
- storage externo de documentos não foi provisionado;
- política final de LGPD, retenção e responsabilidades para dados reais requer aprovação;
- auditoria visual exaustiva e cobertura autenticada de todas as APIs não fazem parte do checkpoint atual.

## Checklist para uma mudança futura de escopo

Antes de importar dados ou ativar qualquer provider:

1. definir responsável, finalidade, retenção e base legal de cada dado;
2. delimitar a menor mudança possível em branch e PR próprios;
3. revisar threat model, RBAC, privacidade e tratamento de falhas;
4. validar em ambiente seguro sem copiar o banco DEMO para produção;
5. criar backup de produção antes de qualquer migration ou escrita autorizada;
6. validar migrations e plano de reversão ou compensação;
7. obter aprovação humana explícita para merge e ativação;
8. publicar apenas pela `main` e acompanhar todo o pipeline;
9. executar smoke tests online e confirmar o site público intacto;
10. monitorar sem registrar PII ou credenciais desnecessárias.

## Integrações

E-mail, WhatsApp, pagamentos, transportadora, SMS e storage externo devem continuar desligados até homologação específica. Cada integração exige consentimento, credenciais em cofre gerenciado, idempotência, retries controlados, webhooks assinados quando aplicável e critérios de desligamento.

## Rollback e restauração

Rollback do Worker e restauração do D1 são operações distintas. Nunca restaure automaticamente nem use o banco DEMO como fonte para produção. Em caso de falha, interrompa o processo e siga o procedimento controlado em [PRODUCTION-RECOVERY.md](PRODUCTION-RECOVERY.md).

## Critério de pronto para operação comercial

Dados reais ou integrações só podem entrar em operação quando segurança, privacidade, backup, observabilidade, suporte, responsáveis e autorização estiverem formalmente definidos. A infraestrutura publicada, por si só, não amplia essa autorização.
