# Infraestrutura futura da plataforma CELULARS

A plataforma deve ser implantada separadamente do site público. Nenhum recurso externo é criado por estes arquivos.

Arquitetura preparada: runtime Node compatível ou adaptação para Cloudflare Workers/Pages Functions; banco PostgreSQL/D1 por adapter externo; storage privado R2 ou equivalente; fila Cloudflare Queues ou equivalente; TLS e domínio exclusivos; provedor transacional de e-mail; API oficial do WhatsApp.

Recursos/contas necessários: conta de hosting, banco persistente, bucket privado, fila, domínio/TLS, serviço de logs/erros (Sentry, Cloudflare Analytics ou OpenTelemetry), backup remoto e provedores de mensagens. Eventos de entrega, bounce, complaint e unsubscribe do provedor de e-mail devem usar webhook assinado e configuração específica do fornecedor. Custos dependem de tráfego, armazenamento e planos escolhidos e exigem aprovação do Alamo antes do provisionamento.

Credenciais futuras: URL do banco, segredo de sessão, credenciais de storage/fila, chaves do e-mail e segredo/webhook do WhatsApp. Nunca devem entrar no Git.

O `dist` público e o projeto Cloudflare Pages atual não fazem parte do artefato da plataforma.
