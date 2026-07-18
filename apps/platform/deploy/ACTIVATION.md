# Ativação protegida CELULARS

1. Criar STAGING isolado e preencher `.env.staging.example` em cofre seguro.
2. Provisionar banco, storage, fila, logs e backup externos após aprovação de custos.
3. Executar migrations, `platform:doctor`, testes e `platform:activation:check`.
4. Criar o primeiro administrador somente em PRODUCTION usando confirmação exata `CREATE FIRST CELULARS ADMIN`, e-mail válido e senha temporária forte; a troca de senha é obrigatória e MFA é recomendado.
5. Importar dados reais primeiro em STAGING: preview, validação, diff, backup, aprovação, aplicação e teste de rollback. Não importar diretamente em produção.
6. Revisar segurança, retenção e termos com assessoria jurídica. Este projeto não afirma conformidade legal definitiva.
7. Somente após homologação humana separada decidir sobre ativação. Nenhum comando deste repositório realiza deploy automaticamente.
