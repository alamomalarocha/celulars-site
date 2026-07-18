import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { AccountLifecycleService } from '../server/accounts.js';
import { AuthService } from '../server/auth.js';
import { loadConfig } from '../src/config.js';
import type { Principal } from '../server/types.js';

function remove(file:string):void{for(const candidate of [file,`${file}-wal`,`${file}-shm`])if(existsSync(candidate))rmSync(candidate);}
function admin():Principal{return{sessionId:'session-admin',userId:'user-demo-admin',email:'admin@demo.invalid',displayName:'Admin',companyId:'company-demo-internal',roles:['ADMIN'],permissions:['users.write'],csrfToken:'csrf'};}

test('invitation is single-use and creates an active scoped account',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`accounts-test-${process.pid}.sqlite`);const config=loadConfig({databasePath,credentialsPath:path.join(base.platformRoot,'data',`accounts-credentials-${process.pid}.json`)});remove(databasePath);const database=openDatabase(config);
 try{migrateDatabase(database);seedDatabase(database,config,'Existing-Demo-Password!');const service=new AccountLifecycleService(database,config);const invitation=service.invite(admin(),{email:'novo.funcionario@demo.invalid',displayName:'Novo Funcionario',roleId:'role-employee',companyId:'company-demo-internal'},new Date('2026-07-18T17:00:00.000Z'));assert.ok(invitation.token.length>30);const userId=service.acceptInvitation(invitation.token,'New-Employee-Password!',new Date('2026-07-18T17:05:00.000Z'));assert.ok(userId);assert.throws(()=>service.acceptInvitation(invitation.token,'Another-Password-123!'),/INVALID_OR_EXPIRED_TOKEN/);const auth=new AuthService(database,config);assert.equal(auth.login('novo.funcionario@demo.invalid','New-Employee-Password!',{ipAddress:'127.0.0.1',userAgent:'test'}).principal.roles[0],'EMPLOYEE');}
 finally{database.close();remove(databasePath);}
});

test('password reset is generic, single-use and revokes sessions',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`reset-test-${process.pid}.sqlite`);const config=loadConfig({databasePath});remove(databasePath);const database=openDatabase(config);
 try{migrateDatabase(database);seedDatabase(database,config,'Existing-Demo-Password!');const auth=new AuthService(database,config);auth.login('funcionario1@demo.invalid','Existing-Demo-Password!',{ipAddress:'127.0.0.1',userAgent:'test'});const service=new AccountLifecycleService(database,config);assert.equal(service.createPasswordReset('missing@demo.invalid').token,null);const reset=service.createPasswordReset('funcionario1@demo.invalid');assert.ok(reset.token);service.resetPassword(reset.token??'','Replacement-Password!');assert.throws(()=>service.resetPassword(reset.token??'','Replacement-Password!'),/INVALID_OR_EXPIRED_TOKEN/);assert.equal(service.sessions('user-employee-demo-0001').length,0);assert.equal(auth.login('funcionario1@demo.invalid','Replacement-Password!',{ipAddress:'127.0.0.1',userAgent:'test'}).principal.userId,'user-employee-demo-0001');}
 finally{database.close();remove(databasePath);}
});

test('demo TOTP setup encrypts the secret and enables MFA after confirmation',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`mfa-test-${process.pid}.sqlite`);const config=loadConfig({databasePath});remove(databasePath);const database=openDatabase(config);
 try{migrateDatabase(database);seedDatabase(database,config,'Existing-Demo-Password!');const service=new AccountLifecycleService(database,config);const now=new Date('2026-07-18T17:30:00.000Z');const setup=service.startMfa('user-demo-admin',now);assert.match(setup.provisioningUri,/^otpauth:\/\/totp\//);assert.match(setup.qrSvgDataUrl,/^data:image\/svg\+xml;base64,/);assert.match(Buffer.from(setup.qrSvgDataUrl.split(',')[1]??'','base64').toString('utf8'),/<svg[^>]+><rect[^>]+\/><path/);assert.equal(setup.recoveryCodes.length,8);const stored=String(database.prepare('SELECT secret_ciphertext FROM mfa_credentials WHERE user_id=?').get('user-demo-admin')?.secret_ciphertext);assert.equal(stored.includes(setup.secret),false);service.confirmMfa('user-demo-admin',service.currentTotpForDemo('user-demo-admin',now),now);assert.equal(Number(database.prepare('SELECT enabled FROM mfa_credentials WHERE user_id=?').get('user-demo-admin')?.enabled),1);}
 finally{database.close();remove(databasePath);}
});
test('MFA challenges login, accepts tolerance and consumes recovery code once',()=>{
 const base=loadConfig();const databasePath=path.join(base.platformRoot,'data',`mfa-login-test-${process.pid}.sqlite`);const config=loadConfig({databasePath});remove(databasePath);const database=openDatabase(config);const password='Existing-Demo-Password!';
 try{migrateDatabase(database);seedDatabase(database,config,password);const accounts=new AccountLifecycleService(database,config);const auth=new AuthService(database,config);const now=new Date('2026-07-18T18:00:00.000Z');auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'before-mfa',now});const setup=accounts.startMfa('user-demo-admin',now);accounts.confirmMfa('user-demo-admin',accounts.currentTotpForDemo('user-demo-admin',now),now);assert.throws(()=>auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'missing-mfa',now}),/MFA_REQUIRED/);const previousWindow=accounts.currentTotpForDemo('user-demo-admin',new Date(now.getTime()-30_000));assert.equal(auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'totp-window',now},previousWindow).principal.userId,'user-demo-admin');const recovery=setup.recoveryCodes[0]??'';assert.equal(auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'recovery',now},recovery).principal.userId,'user-demo-admin');assert.throws(()=>auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'reused-recovery',now},recovery),/MFA_REQUIRED/);const active=auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'disable',now},accounts.currentTotpForDemo('user-demo-admin',now));const revoked=accounts.disableMfa('user-demo-admin',accounts.currentTotpForDemo('user-demo-admin',now),active.principal.sessionId,now);assert.ok(revoked>=2);assert.deepEqual(accounts.mfaStatus('user-demo-admin'),{enabled:false,recoveryCodesRemaining:0});assert.equal(auth.login('admin@demo.invalid',password,{ipAddress:'127.0.0.1',userAgent:'after-disable',now}).principal.userId,'user-demo-admin');}
 finally{database.close();remove(databasePath);}
});
