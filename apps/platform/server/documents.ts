import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { recordAudit } from './governance.js';
import type { Principal } from './types.js';

const MAX_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([['text/plain','.txt'],['application/pdf','.pdf'],['image/png','.png'],['image/jpeg','.jpg']]);
const forbiddenExtensions = new Set(['.exe','.dll','.bat','.cmd','.com','.msi','.ps1','.js','.vbs','.scr','.sh']);

export interface StorageProvider {
  put(key: string, content: Buffer): void;
  get(key: string): Buffer;
  delete(key: string): void;
  health(): { ready: boolean; provider: string };
}

function safeStorageKey(root: string, key: string): string {
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\.[a-z0-9]+$/.test(key)) throw new Error('INVALID_STORAGE_KEY');
  const target = path.resolve(root, key);
  const relative = path.relative(path.resolve(root), target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('INVALID_STORAGE_KEY');
  return target;
}

export class LocalDemoStorage implements StorageProvider {
  constructor(private readonly root: string) {}
  put(key:string,content:Buffer):void{const target=safeStorageKey(this.root,key);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,content,{flag:'wx'});}
  get(key:string):Buffer{return readFileSync(safeStorageKey(this.root,key));}
  delete(key:string):void{rmSync(safeStorageKey(this.root,key),{force:true});}
  health():{ready:boolean;provider:string}{return{ready:true,provider:'local-demo-private'};}
}

export class ProductionStorageAdapter implements StorageProvider {
  put(_key:string,_content:Buffer):never{throw new Error('EXTERNAL_STORAGE_NOT_PROVISIONED');}
  get(_key:string):never{throw new Error('EXTERNAL_STORAGE_NOT_PROVISIONED');}
  delete(_key:string):never{throw new Error('EXTERNAL_STORAGE_NOT_PROVISIONED');}
  health():{ready:boolean;provider:string}{return{ready:false,provider:'external-pending'};}
}

export interface AntivirusHook { scan(content: Buffer, metadata: { name:string; mimeType:string }): 'CLEAN'|'REJECTED'|'PENDING' }
export class DemoAntivirusHook implements AntivirusHook { scan(): 'CLEAN' { return 'CLEAN'; } }

export class DocumentService {
  constructor(private readonly database:PlatformDatabase,private readonly config:PlatformConfig,private readonly storage:StorageProvider,private readonly antivirus:AntivirusHook=new DemoAntivirusHook()){}
  upload(actor:Principal,input:{companyId?:string|null;entityType:string;entityId?:string|null;name:string;mimeType:string;content:Buffer;expiresAt?:string|null},now=new Date()):object{
    if(!this.config.features.documents)throw new Error('DOCUMENTS_DISABLED');
    const extension=path.extname(input.name).toLowerCase();const expected=allowedTypes.get(input.mimeType);
    if(input.name.includes('/')||input.name.includes('\\')||!expected||forbiddenExtensions.has(extension)||extension!==expected)throw new Error('INVALID_DOCUMENT_TYPE');
    if(input.content.length<1||input.content.length>MAX_BYTES)throw new Error('INVALID_DOCUMENT_SIZE');
    if(input.expiresAt&&Number.isNaN(Date.parse(input.expiresAt)))throw new Error('INVALID_DOCUMENT_EXPIRY');
    const companyId=input.companyId??actor.companyId??null;
    if(actor.roles.includes('WHOLESALE')&&companyId!==actor.companyId)throw new Error('FORBIDDEN:document.scope');
    if(!['COMPANY','REQUEST','MESSAGE','ORDER','INTERNAL'].includes(input.entityType))throw new Error('INVALID_DOCUMENT_ENTITY');
    if(input.entityType==='INTERNAL'&&actor.roles.includes('WHOLESALE'))throw new Error('FORBIDDEN:document.internal');
    const scan=this.antivirus.scan(input.content,{name:input.name,mimeType:input.mimeType});if(scan==='REJECTED')throw new Error('DOCUMENT_REJECTED');
    const id=randomUUID();const safeName=`document${expected}`;const key=`${id}/${randomUUID()}${expected}`;const checksum=createHash('sha256').update(input.content).digest('hex');
    this.storage.put(key,input.content);
    try{this.database.prepare(`INSERT INTO documents (id,company_id,uploaded_by_user_id,entity_type,entity_id,original_name,safe_name,storage_key,mime_type,size_bytes,checksum_sha256,scan_status,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,companyId,actor.userId,input.entityType,input.entityId??null,path.basename(input.name),safeName,key,input.mimeType,input.content.length,checksum,scan,input.expiresAt??null,now.toISOString());}
    catch(error){this.storage.delete(key);throw error;}
    recordAudit(this.database,actor,'DOCUMENT_UPLOAD','DOCUMENT',id,{after:{companyId,entityType:input.entityType,mimeType:input.mimeType,sizeBytes:input.content.length,checksum},companyId});
    return{id,companyId,name:input.name,mimeType:input.mimeType,sizeBytes:input.content.length,checksum,scanStatus:scan,environment:'DEMO_PRIVATE'};
  }
  download(actor:Principal,id:string,now=new Date()):{content:Buffer;name:string;mimeType:string}{
    const row=this.database.prepare('SELECT * FROM documents WHERE id=? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>?)').get(id,now.toISOString());
    if(!row||actor.roles.includes('WHOLESALE')&&String(row.company_id)!==actor.companyId)throw new Error('DOCUMENT_NOT_FOUND');
    if(String(row.scan_status)!=='CLEAN')throw new Error('DOCUMENT_NOT_AVAILABLE');
    const content=this.storage.get(String(row.storage_key));const checksum=createHash('sha256').update(content).digest('hex');if(checksum!==row.checksum_sha256)throw new Error('DOCUMENT_CHECKSUM_MISMATCH');
    return{content,name:String(row.original_name),mimeType:String(row.mime_type)};
  }
  remove(actor:Principal,id:string,now=new Date()):void{
    const row=this.database.prepare('SELECT company_id FROM documents WHERE id=? AND deleted_at IS NULL').get(id);if(!row)throw new Error('DOCUMENT_NOT_FOUND');
    if(actor.roles.includes('WHOLESALE')&&String(row.company_id)!==actor.companyId)throw new Error('DOCUMENT_NOT_FOUND');
    this.database.prepare('UPDATE documents SET deleted_at=?,deleted_by_user_id=? WHERE id=?').run(now.toISOString(),actor.userId,id);
    recordAudit(this.database,actor,'DOCUMENT_DELETE','DOCUMENT',id,{companyId:row.company_id?String(row.company_id):null});
  }
}

export function createStorage(config:PlatformConfig):StorageProvider{return config.storageMode==='mock'?new LocalDemoStorage(config.storagePath):new ProductionStorageAdapter();}
