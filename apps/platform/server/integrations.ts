import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { recordAudit } from './governance.js';
import type { Principal } from './types.js';

export interface DeliveryMessage { readonly id:string;readonly recipient:string;readonly subject:string|null;readonly body:string;readonly correlationId:string|null }
export interface DeliveryResult { readonly status:'SIMULATED'|'SENT';readonly providerMessageId:string;readonly preview:string }
export interface DeliveryProvider { readonly channel:'EMAIL'|'WHATSAPP';send(message:DeliveryMessage):DeliveryResult;health():{ready:boolean;mode:string} }
export class MockEmailProvider implements DeliveryProvider { readonly channel='EMAIL' as const;send(message:DeliveryMessage):DeliveryResult{return{status:'SIMULATED',providerMessageId:`mock-email-${message.id}`,preview:`DEMO — E-MAIL NÃO ENVIADO EXTERNAMENTE\n${message.subject??''}\n${message.body}`};}health(){return{ready:true,mode:'mock'};} }
export class MockWhatsAppProvider implements DeliveryProvider { readonly channel='WHATSAPP' as const;send(message:DeliveryMessage):DeliveryResult{return{status:'SIMULATED',providerMessageId:`mock-whatsapp-${message.id}`,preview:`DEMO — MENSAGEM NÃO ENVIADA EXTERNAMENTE\n${message.body}`};}health(){return{ready:true,mode:'mock'};} }
export class ExternalEmailAdapter implements DeliveryProvider { readonly channel='EMAIL' as const;send():never{throw new Error('EXTERNAL_EMAIL_NOT_CONFIGURED');}health(){return{ready:false,mode:'external-pending'};} }
export class OfficialWhatsAppAdapter implements DeliveryProvider { readonly channel='WHATSAPP' as const;send():never{throw new Error('OFFICIAL_WHATSAPP_NOT_CONFIGURED');}health(){return{ready:false,mode:'official-api-pending'};} }

function render(template:string,variables:Readonly<Record<string,string>>):string{return template.replace(/{{([a-zA-Z0-9_]+)}}/g,(_match,key:string)=>variables[key]??'');}
function safeError(error:unknown):string{return(error instanceof Error?error.message:'DELIVERY_FAILED').slice(0,240);}

export class DeliveryOutboxService {
  constructor(private readonly database:PlatformDatabase,private readonly config:PlatformConfig,private readonly providers:Readonly<Record<'EMAIL'|'WHATSAPP',DeliveryProvider>>){}
  queue(actor:Principal|null,input:{channel:'EMAIL'|'WHATSAPP';templateCode:string;recipient:string;variables:Readonly<Record<string,string>>;companyId?:string|null;conversationId?:string|null;correlationId?:string|null},now=new Date()):object{
    if(input.channel==='EMAIL'&&this.config.emailMode==='disabled'||input.channel==='WHATSAPP'&&this.config.whatsappMode==='disabled')throw new Error('DELIVERY_CHANNEL_DISABLED');
    if(actor?.roles.includes('WHOLESALE')&&(input.companyId??actor.companyId)!==actor.companyId)throw new Error('FORBIDDEN:delivery.scope');
    const template=this.database.prepare('SELECT subject_template,body_template FROM delivery_templates WHERE channel=? AND code=? AND active=1').get(input.channel,input.templateCode);if(!template)throw new Error('DELIVERY_TEMPLATE_NOT_FOUND');
    const recipient=input.recipient.trim();if(input.channel==='EMAIL'&&!recipient.includes('@')||input.channel==='WHATSAPP'&&!/^\+[1-9]\d{7,14}$/.test(recipient))throw new Error('INVALID_DELIVERY_RECIPIENT');
    const id=randomUUID();const subject=template.subject_template?render(String(template.subject_template),input.variables):null;const body=render(String(template.body_template),input.variables);const timestamp=now.toISOString();
    this.database.prepare(`INSERT INTO delivery_outbox (id,channel,template_code,recipient,subject,body,company_id,conversation_id,correlation_id,status,next_attempt_at,created_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'PENDING',?,?,?,?)`).run(id,input.channel,input.templateCode,recipient,subject,body,input.companyId??actor?.companyId??null,input.conversationId??null,input.correlationId??null,timestamp,actor?.userId??null,timestamp,timestamp);
    recordAudit(this.database,actor,'DELIVERY_QUEUED','DELIVERY',id,{after:{channel:input.channel,templateCode:input.templateCode,simulated:this.config.demo},companyId:input.companyId??actor?.companyId??null});return{id,status:'PENDING',channel:input.channel};
  }
  process(limit=20,now=new Date()):object[]{const rows=this.database.prepare(`SELECT id,channel,recipient,subject,body,correlation_id FROM delivery_outbox WHERE status IN ('PENDING','FAILED') AND attempts<max_attempts AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY created_at LIMIT ?`).all(now.toISOString(),limit);const results:object[]=[];for(const row of rows){const id=String(row.id);const channel=String(row.channel) as 'EMAIL'|'WHATSAPP';try{this.database.prepare("UPDATE delivery_outbox SET status='PROCESSING',attempts=attempts+1,updated_at=? WHERE id=?").run(now.toISOString(),id);const result=this.providers[channel].send({id,recipient:String(row.recipient),subject:row.subject?String(row.subject):null,body:String(row.body),correlationId:row.correlation_id?String(row.correlation_id):null});this.database.prepare('UPDATE delivery_outbox SET status=?,provider_message_id=?,last_error=NULL,updated_at=? WHERE id=?').run(result.status,result.providerMessageId,now.toISOString(),id);results.push({id,...result});}catch(error){const delay=new Date(now.getTime()+60_000).toISOString();this.database.prepare("UPDATE delivery_outbox SET status='FAILED',last_error=?,next_attempt_at=?,updated_at=? WHERE id=?").run(safeError(error),delay,now.toISOString(),id);results.push({id,status:'FAILED'});}}return results;}
  preview(actor:Principal,id:string):object{const row=this.database.prepare('SELECT id,channel,subject,body,status,company_id,provider_message_id FROM delivery_outbox WHERE id=?').get(id);if(!row||actor.roles.includes('WHOLESALE')&&String(row.company_id)!==actor.companyId)throw new Error('DELIVERY_NOT_FOUND');return{...row,banner:'DEMO — MENSAGEM NÃO ENVIADA EXTERNAMENTE'};}
}

export class WhatsAppWebhookService {
  constructor(private readonly database:PlatformDatabase,private readonly secret:string){}
  receive(eventId:string,rawBody:string,signature:string,now=new Date()):{duplicate:boolean;status:string}{const expected=createHmac('sha256',this.secret).update(rawBody).digest('hex');const a=Buffer.from(expected);const b=Buffer.from(signature);const valid=a.length===b.length&&timingSafeEqual(a,b);const hash=createHash('sha256').update(rawBody).digest('hex');const existing=this.database.prepare("SELECT id FROM inbound_webhooks WHERE provider='WHATSAPP_OFFICIAL' AND external_event_id=?").get(eventId);if(existing)return{duplicate:true,status:'PROCESSED'};this.database.prepare("INSERT INTO inbound_webhooks (id,provider,external_event_id,signature_valid,payload_hash,status,received_at,processed_at) VALUES (?,'WHATSAPP_OFFICIAL',?,?,?,?,?,?)").run(randomUUID(),eventId,valid?1:0,hash,valid?'PROCESSED':'REJECTED',now.toISOString(),valid?now.toISOString():null);if(!valid)throw new Error('INVALID_WEBHOOK_SIGNATURE');return{duplicate:false,status:'PROCESSED'};}
}

export function integrationProviders(config:PlatformConfig):Readonly<Record<'EMAIL'|'WHATSAPP',DeliveryProvider>>{return{EMAIL:config.emailMode==='mock'?new MockEmailProvider():new ExternalEmailAdapter(),WHATSAPP:config.whatsappMode==='mock'?new MockWhatsAppProvider():new OfficialWhatsAppAdapter()};}
