# Ativação protegida CELULARS

1. Criar STAGING isolado e preencher `.env.staging.example` em cofre seguro.
2. Provisionar banco, storage, fila, logs e backup externos após aprovação de custos.
3. Executar migrations, `platform:doctor`, testes e `platform:activation:check`.
4. Criar o primeiro administrador somente em PRODUCTION usando confirmação exata `CREATE FIRST CELULARS ADMIN`, e-mail válido e senha temporária forte; a troca de senha é obrigatória e MFA é recomendado.

   Defina `PLATFORM_BOOTSTRAP_CONFIRMATION`, `PLATFORM_BOOTSTRAP_EMAIL`, `PLATFORM_BOOTSTRAP_DISPLAY_NAME` e `PLATFORM_BOOTSTRAP_TEMPORARY_PASSWORD` em uma sessão protegida e execute `npm run platform:bootstrap-admin`. O comando nunca imprime a senha e falha antes da escrita fora de PRODUCTION ou sem adaptador externo provisionado.
5. Importar dados reais primeiro em STAGING: preview, validação, diff, backup, aprovação, aplicação e teste de rollback. Não importar diretamente em produção.
6. Revisar segurança, retenção e termos com assessoria jurídica. Este projeto não afirma conformidade legal definitiva.
7. Somente após homologação humana separada decidir sobre ativação. Nenhum comando deste repositório realiza deploy automaticamente.
