import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { AuthService } from '../server/auth.js';
import {
  conversationData,
  createConversation,
  createMessage,
  createRequest,
  requestData,
  transitionRequest
} from '../server/communications.js';
import { loadConfig } from '../src/config.js';

const password = 'Local-Demo-Communications-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
}

test('requests and messages enforce company scope and internal-note permissions', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `communications-test-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, sessionSecret: 'communications-test-secret-that-is-long-enough' });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, password);
  const auth = new AuthService(database, config);

  try {
    const admin = auth.login('admin@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const wholesale1 = auth.login('atacadista1@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const wholesale2 = auth.login('atacadista2@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;

    const createdRequest = createRequest(database, wholesale1, {
      title: 'Consulta de lote DEMO',
      description: 'Solicitacao ficticia para validar isolamento empresarial.',
      leadType: 'WHOLESALE',
      priority: 'HIGH'
    }) as { id: string; companyId: string };
    assert.equal(createdRequest.companyId, 'company-demo-1');

    const ownRequests = requestData(database, wholesale1) as { requests: readonly { id: string; company_id: string }[]; readOnlyStatus: boolean };
    const otherRequests = requestData(database, wholesale2) as { requests: readonly { id: string }[] };
    assert.equal(ownRequests.readOnlyStatus, true);
    assert.ok(ownRequests.requests.some((row) => row.id === createdRequest.id && row.company_id === 'company-demo-1'));
    assert.ok(!otherRequests.requests.some((row) => row.id === createdRequest.id));
    assert.throws(() => transitionRequest(database, wholesale1, createdRequest.id, { status: 'IN_PROGRESS' }), /FORBIDDEN/);

    const employee = database.prepare(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id
      JOIN roles r ON r.id=ur.role_id WHERE r.code='EMPLOYEE' ORDER BY u.id LIMIT 1`).get();
    assert.ok(employee?.id);
    const transitioned = transitionRequest(database, admin, createdRequest.id, {
      status: 'ASSIGNED', assignedUserId: String(employee?.id)
    }) as { toStatus: string };
    assert.equal(transitioned.toStatus, 'ASSIGNED');

    const conversation = createConversation(database, wholesale1, {
      subject: 'Disponibilidade comercial DEMO'
    }) as { id: string; companyId: string };
    assert.equal(conversation.companyId, 'company-demo-1');
    const message = createMessage(database, wholesale1, {
      conversationId: conversation.id,
      body: 'Mensagem ficticia do atacadista.',
      messageType: 'MESSAGE'
    }) as { externalDelivery: string };
    assert.equal(message.externalDelivery, 'DEMO_NOT_SENT');
    assert.throws(() => createMessage(database, wholesale1, {
      conversationId: conversation.id,
      body: 'Nota que nao pode ser criada.',
      messageType: 'INTERNAL_NOTE'
    }), /FORBIDDEN/);

    createMessage(database, admin, {
      conversationId: conversation.id,
      body: 'Nota interna ficticia visivel somente para a equipe.',
      messageType: 'INTERNAL_NOTE'
    });
    const wholesaleMessages = conversationData(database, wholesale1) as {
      conversations: readonly { id: string; company_id: string }[];
      messages: readonly { message_type: string }[];
      allowInternalNotes: boolean;
    };
    assert.ok(wholesaleMessages.conversations.every((row) => row.company_id === 'company-demo-1'));
    assert.ok(wholesaleMessages.messages.every((row) => row.message_type !== 'INTERNAL_NOTE'));
    assert.equal(wholesaleMessages.allowInternalNotes, false);

    const otherMessages = conversationData(database, wholesale2) as { conversations: readonly { id: string }[] };
    assert.ok(!otherMessages.conversations.some((row) => row.id === conversation.id));
  } finally {
    database.close();
    removeDatabase(databasePath);
  }
});
