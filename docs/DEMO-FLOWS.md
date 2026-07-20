# Fluxos de homologacao CELULARS DEMO

Todos os nomes, valores e eventos destes fluxos sao ficticios.

## Fluxo atacadista

1. Entrar como `atacadista2@demo.invalid`.
2. Conferir a propria empresa e enviar cadastro para analise.
3. Entrar como administrador e aprovar a empresa.
4. Voltar ao atacadista e consultar a lista DEMO permitida.
5. Criar solicitacao e mensagem interna.
6. Entrar como funcionario e assumir a solicitacao.
7. Responder, criar e enviar cotacao DEMO.
8. Voltar ao atacadista, visualizar e aceitar a cotacao.
9. Confirmar pedido e reserva DEMO.
10. Criar remessa como funcionario.
11. Confirmar atualizacao para o atacadista.
12. Conferir notificacoes e trilha de auditoria como administrador.

Resultado esperado: nenhuma integracao externa e acionada; todos os eventos permanecem no SQLite local.

## Fluxo de cancelamento

1. Criar pedido a partir de cotacao aceita.
2. Reservar estoque DEMO.
3. Conferir saldo fisico, reservado e disponivel.
4. Cancelar o pedido.
5. Confirmar liberacao da reserva.
6. Confirmar restauracao do saldo disponivel.
7. Conferir auditoria e notificacoes.

Resultado esperado: nenhuma reserva fica orfa e o movimento compensa o saldo de forma transacional.

## Funcionario sem permissao

1. Entrar como `funcionario1@demo.invalid`.
2. Tentar editar usuario.
3. Tentar alterar configuracao global.
4. Tentar aprovar empresa.
5. Tentar abrir auditoria administrativa completa.

Resultado esperado: `403` ou interface sem a acao; a API sempre decide a autorizacao.

## Isolamento de empresa

1. Entrar como `atacadista1@demo.invalid`.
2. Abrir empresa, solicitacoes, mensagens, cotacoes e pedidos proprios.
3. Trocar manualmente IDs por registros da empresa 2.
4. Repetir para notificacoes e documentos DEMO.

Resultado esperado: `403`, `404` seguro ou lista vazia, sem metadados de outra empresa.

## Auditoria e notificacoes

Validar os eventos de login, alteracao, aprovacao, cotacao, pedido, reserva, remessa, mensagens e configuracoes. Confirmar que senha, hash, cookie, token e sessao completa nunca aparecem.

## Relatorios

1. Entrar como administrador e aplicar filtros por periodo, status e funcionario.
2. Exportar um relatorio DEMO.
3. Entrar como atacadista e conferir apenas o proprio escopo.
4. Confirmar o aviso `AMBIENTE DE DEMONSTRACAO - DADOS FICTICIOS`.

## Criterios de aceite comuns

- sem erro no console;
- sem overflow horizontal;
- navegacao por teclado funcional;
- foco visivel e skip link;
- notificacoes com estado lida/nao lida;
- dados isolados por perfil e empresa;
- login, logout e troca de perfil reiniciam a tela e os dados do cliente, sem conservar o ultimo modulo visitado;
- nenhuma chamada de e-mail, WhatsApp, pagamento ou transportadora real.
