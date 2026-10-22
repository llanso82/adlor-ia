import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const code=readFileSync(new URL('../js/demo-measurement.js',import.meta.url),'utf8');
const store=new Map();
function boot(search,{dnt=false,form=false,responses=[]}={}) {
 const calls=[],handlers={},fields=[{disabled:false}];
 const status={textContent:''},button={disabled:false,textContent:''};
 const data={name:'QA ficticio',email:'qa@example.invalid',company:'Empresa ficticia',process:'Prueba interna sin cita',consent:'on',website:''};
 const f={reportValidity:()=>true,querySelector:()=>button,querySelectorAll:()=>fields,reset(){},addEventListener:(event,handler)=>{handlers[event]=handler;}};
 const context={URL,URLSearchParams,crypto:{randomUUID},Date,JSON,AbortController,setTimeout,clearTimeout,navigator:{doNotTrack:dnt?'1':'0'},location:{search},sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{querySelectorAll:()=>[],getElementById:id=>id==='demo-request'?(form?f:null):status},FormData:class {get(k){return data[k]}},fetch:async(url,options)=>{calls.push({url,row:JSON.parse(options.body)});const next=responses.shift();if(next==='timeout')throw Error('uncertain');return {ok:next!==400,status:next||201};}};
 runInNewContext(code,context);return {calls,handlers,status,button,data};
}
const flush=()=>new Promise(r=>setImmediate(r));
let first=boot('?utm_source=usem&qa=1');await flush();assert.equal(first.calls[0].row.source,'usem');assert.equal(first.calls[0].row.is_test,true);const id=first.calls[0].row.id;
let reload=boot('?utm_source=usem&qa=1');await flush();assert.equal(reload.calls.length,0,'Successful session must not be recounted on reload');
let bad=boot('?utm_source=attacker&email=private@example.com');await flush();assert.equal(bad.calls[0].row.source,'directo');assert.equal(JSON.stringify(bad.calls).includes('private@example.com'),false);
let dnt=boot('?utm_source=bni',{dnt:true});await flush();assert.equal(dnt.calls.length,0);
let f=boot('?utm_source=prospectos&utm_content=B-04&qa=1',{form:true,responses:[201,'timeout',201]});await flush();await f.handlers.submit({preventDefault(){}});assert.equal(f.button.textContent,'Reintentar la misma solicitud');assert.equal(f.data.process,'Prueba interna sin cita');await f.handlers.submit({preventDefault(){}});
const submissions=f.calls.filter(x=>x.url.includes('/visitors'));assert.equal(submissions.length,2);assert.equal(submissions[0].row.id,submissions[1].row.id,'An uncertain request retries with the same database primary key');assert.equal(submissions[0].row.source,'demo-qa:prospectos');assert.equal(submissions[0].row.page,'/demo/?contact_id=B-04');assert.match(f.status.textContent,/Solicitud registrada/);
console.log('PASS: refresh deduplication; bounded attribution; no raw query leakage; test segregation; DNT; idempotent uncertain request retry.');

