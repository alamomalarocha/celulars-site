import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { IdentityGovernanceService } from '../server/identity.js';
import { loadConfig } from '../src/config.js';
import type { Principal } from '../server/types.js';

function remove(file:string):void{for(const candidate of [file,`${file}-wal`,`${file}-shm`])if(existsSync(candidate))rmSync(candidate);}
function principal(userId:string,companyId:string|null,permissions:string[]):Principal{return{sessionId:`session-${userId}`,userId,email:`${userId}@demo.invalid`,displayName:userId,companyId,roles:[],permissions,csrfToken:'csrf'};}

test('teams enforce administration, company scope and access expiry',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`identity-teams-${process.pid}.sqlite`);const config=loadConfig({databasePath});remove(databasePath);const database=openDatabase(config);
 try{migrateDatabase(database);seedDatabase(database,config,'Existing-Demo-Password!');const service=new IdentityGovernanceService(database);const admin=principal('user-demo-admin','company-demo-internal',['users.read','users.write']);const created=service.createTeam(admin,{name:'Operacoes DEMO',companyId:'company-demo-internal'}) as {id:string};service.addMember(admin,created.id,{userId:'user-employee-demo-0001',memberRole:'LEAD'});assert.equal((service.teams(principal('user-employee-demo-0001','company-demo-internal',[])) as {teams:unknown[]}).teams.length,1);assert.throws(()=>service.addMember(admin,created.id,{userId:'user-wholesale-demo-0001'}),/COMPANY_SCOPE_MISMATCH/);assert.throws(()=>service.createTeam(principal('user-employee-demo-0001','company-demo-internal',[]),{name:'Invalida'}),/FORBIDDEN/);}
 finally{database.close();remove(databasePath);}
});

test('terms activation and consent create an immutable privacy trail',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`identity-consent-${process.pid}.sqlite`);const config=loadConfig({databasePath});remove(databasePath);const database=openDatabase(config);
 try{migrateDatabase(database);seedDatabase(database,config,'Existing-Demo-Password!');const service=new IdentityGovernanceService(database);const admin=principal('user-demo-admin','company-demo-internal',['users.write']);const terms=service.publishTerms(admin,{version:'2026.07',title:'Termos DEMO CELULARS',effectiveAt:'2026-07-18T00:00:00.000Z'}) as {id:string};const consent=service.recordConsent(principal('user-employee-demo-0001','company-demo-internal',[]),{termsVersionId:terms.id,consentType:'TERMS_AND_PRIVACY',granted:true,ipAddress:'127.0.0.1',userAgent:'test'},new Date('2026-07-18T18:00:00.000Z')) as {id:string};assert.ok(consent.id);assert.equal(Number(database.prepare('SELECT COUNT(*) AS total FROM user_consents WHERE user_id=?').get('user-employee-demo-0001')?.total),1);assert.equal(String(database.prepare('SELECT terms_accepted_at FROM users WHERE id=?').get('user-employee-demo-0001')?.terms_accepted_at),'2026-07-18T18:00:00.000Z');}
 finally{database.close();remove(databasePath);}
});
