(()=>{
const $=id=>document.getElementById(id),safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let current=null;
const packFor=x=>x.campaign||(!x.guests?'A aconselhar':x.guests<=150?'Silver':x.guests<=200?'Gold':x.guests<=300?'Premium':'Extreme');
const priceFor=p=>({Silver:450,Gold:700,Premium:850,Extreme:1300}[p]||0);
const localValue=v=>v?new Date(v).toISOString().slice(0,16):'';
async function log(type,title,details=''){if(!current)return;await sb.from('lead_timeline').insert({lead_id:current,event_type:type,title,details:details||null})}
async function timeline(){
 if(!current||!$('leadTimeline'))return;
 let {data,error}=await sb.from('lead_timeline').select('*').eq('lead_id',current).order('created_at',{ascending:false}).limit(50);
 if(error){$('leadTimeline').innerHTML='<p class="lw-muted">Não foi possível carregar o histórico.</p>';return}
 $('leadTimeline').innerHTML=(data||[]).map(x=>`<div class="lw-time"><i></i><div><b>${safe(x.title)}</b><small>${new Date(x.created_at).toLocaleString('pt-PT')}${x.details?' · '+safe(x.details):''}</small></div></div>`).join('')||'<p class="lw-muted">Ainda sem histórico.</p>'
}
function proposalText(x){
 let pack=packFor(x),value=+$('lwValue').value||priceFor(pack),event=x.source||'evento',date=x.wedding_date?new Date(x.wedding_date+'T00:00:00').toLocaleDateString('pt-PT'):'data a definir';
 return `PROPOSTA EVENTPIC\n\nCliente: ${x.names||'—'}\nEvento: ${event}\nData: ${date}\nLocal: ${x.venue||'A definir'}\nConvidados: ${x.guests||'A definir'}\n\nPack recomendado: ${pack}\nValor proposto: ${value?value.toLocaleString('pt-PT',{style:'currency',currency:'EUR'}):'Sob consulta'}\n\nInclui serviço Eventpic de acordo com as condições do pack selecionado. A reserva fica confirmada após aceitação da proposta e pagamento do sinal.\n\nFicamos disponíveis para esclarecer qualquer dúvida.`
}
function prepare(){
 let x=leads.find(v=>v.id===current);if(!x)return;let pack=packFor(x),value=priceFor(pack);$('lwValue').value=$('lwValue').value||value;$('lwProposal').value=proposalText(x)
}
async function saveExtras(){
 if(!current)return;
 let payload={next_contact_at:$('lwNext').value?new Date($('lwNext').value).toISOString():null,notes:$('lwNotes').value.trim()||null,proposed_value:$('lwValue').value?+$('lwValue').value:null,proposal_details:$('lwProposal').value.trim()||null,updated_at:new Date().toISOString()};
 let {error}=await sb.from('leads').update(payload).eq('id',current);if(error)throw error;
 await log('update','Dados comerciais atualizados');
}
async function markContact(){
 let x=leads.find(v=>v.id===current);if(!x)return;
 let next=new Date(Date.now()+2*86400000);next.setHours(10,0,0,0);
 let {error}=await sb.from('leads').update({status:'Em contacto',last_contact_at:new Date().toISOString(),next_contact_at:next.toISOString(),updated_at:new Date().toISOString()}).eq('id',current);
 if(error)return alert(error.message);await log('contact','Lead contactado','Próximo seguimento agendado para 48 horas');$('lwLast').textContent='Agora';$('lwNext').value=localValue(next);await timeline();await loadL()
}
async function addNote(){
 let text=$('lwNewNote').value.trim();if(!text)return;await log('note','Observação',text);$('lwNewNote').value='';await timeline()
}
function openWa(text){
 let x=leads.find(v=>v.id===current),n=String(x?.phone||'').replace(/\D/g,'');if(n.length===9)n='351'+n;if(!n)return alert('Este lead não tem telemóvel.');open('https://wa.me/'+n+'?text='+encodeURIComponent(text),'_blank')
}
function decorate(){
 document.querySelectorAll('#leadgrid .lead').forEach(card=>{
  let edit=[...card.querySelectorAll('button')].find(b=>b.textContent.includes('Editar lead')),m=edit?.getAttribute('onclick')?.match(/'([^']+)'/);if(!m)return;let x=leads.find(v=>v.id===m[1]);if(!x)return;
  let old=card.querySelector('.lw-alert');if(old)old.remove();let due=x.next_contact_at&&new Date(x.next_contact_at)<=new Date(),stale=!x.last_contact_at&&Date.now()-new Date(x.created_at).getTime()>=86400000;
  if(due||stale){let tag=document.createElement('span');tag.className='lw-alert';tag.textContent=due?'Seguimento pendente':'Sem contacto há 24h';card.querySelector('.lead-head')?.appendChild(tag)}
 })
}
function setup(){
 let modal=$('leadEditModal'),form=modal?.querySelector('.form');if(!form||$('leadWorkflow'))return setTimeout(setup,300);
 form.insertAdjacentHTML('afterend',`<div id="leadWorkflow"><div class="lw-section"><div class="top"><h3>Seguimento comercial</h3><button class="btn green" id="lwMark">Marcar como contactado</button></div><div class="lw-grid"><label>Próximo contacto<input id="lwNext" type="datetime-local"></label><label>Último contacto<span id="lwLast" class="lw-read">Ainda não contactado</span></label></div></div><div class="lw-section"><div class="top"><h3>Proposta comercial</h3><button class="btn blue" id="lwPrepare">Preparar proposta</button></div><label>Valor proposto (€)<input id="lwValue" type="number" min="0" step="0.01"></label><label>Proposta<textarea id="lwProposal" rows="8"></textarea></label><div class="quick"><button class="btn light" id="lwCopy">Copiar proposta</button><button class="btn green" id="lwWa">Abrir no WhatsApp</button></div></div><div class="lw-section"><h3>Observações</h3><textarea id="lwNotes" rows="4" placeholder="Notas internas sobre este lead"></textarea><div class="lw-note"><input id="lwNewNote" placeholder="Adicionar registo ao histórico"><button class="btn light" id="lwAddNote">Registar</button></div></div><div class="lw-section"><div class="top"><h3>Histórico</h3><button class="btn light" id="lwRefresh">Atualizar</button></div><div id="leadTimeline"></div></div></div>`);
 let oldEdit=window.editLead;window.editLead=async id=>{oldEdit(id);current=id;let x=leads.find(v=>v.id===id);$('lwNext').value=localValue(x?.next_contact_at);$('lwLast').textContent=x?.last_contact_at?new Date(x.last_contact_at).toLocaleString('pt-PT'):'Ainda não contactado';$('lwNotes').value=x?.notes||'';$('lwValue').value=x?.proposed_value??'';$('lwProposal').value=x?.proposal_details||'';await timeline()};
 let save=$('saveLeadEdit'),oldSave=save.onclick;save.onclick=async function(){try{await saveExtras();await oldSave.call(this)}catch(e){alert(e.message)}};
 $('lwMark').onclick=markContact;$('lwPrepare').onclick=prepare;$('lwAddNote').onclick=addNote;$('lwRefresh').onclick=timeline;$('lwCopy').onclick=async()=>{await navigator.clipboard.writeText($('lwProposal').value);alert('Proposta copiada.')};$('lwWa').onclick=()=>openWa($('lwProposal').value);
 let oldMove=window.moveL;window.moveL=async(id,status)=>{current=id;let x=leads.find(v=>v.id===id),before=x?.status||'Novo lead';await oldMove(id,status);await log('status','Estado alterado',before+' → '+status)};
 window.convertL=async id=>{current=id;let x=leads.find(v=>v.id===id);if(!x)return;let {data:hist}=await sb.from('lead_timeline').select('title,details,created_at').eq('lead_id',id).order('created_at');let history=(hist||[]).map(h=>new Date(h.created_at).toLocaleDateString('pt-PT')+' — '+h.title+(h.details?': '+h.details:'')).join('\n');let conditions=[x.campaign&&('Pack: '+x.campaign),x.source&&('Tipo: '+x.source),x.proposal_details].filter(Boolean).join('\n\n')||null,notes=[x.notes,history&&('Histórico do lead:\n'+history)].filter(Boolean).join('\n\n')||null;let value=+x.proposed_value||null;let {error}=await sb.from('weddings').insert({names:x.names,contact:x.phone||null,email:x.email||null,wedding_date:x.wedding_date||null,venue:x.venue||null,guests:x.guests||null,conditions,notes,origin:x.origin||null,event_type:x.source||null,package_name:x.campaign||null,total_value:value,estimated_value:value,contract_date:new Date().toISOString().slice(0,10),status:'Por preencher',portal_status:'Por preencher',preparation_status:'Por iniciar'});if(error)return alert(error.message);await log('conversion','Novo serviço criado','Dados, proposta, observações e histórico transferidos');await sb.from('leads').update({status:'Fechado',updated_at:new Date().toISOString()}).eq('id',id);alert('Novo serviço criado na agenda com todos os dados do lead.');await Promise.all([loadW(),loadL()])};
 let s=document.createElement('style');s.textContent='.lw-section{margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e5ebf2;border-radius:14px}.lw-section h3{margin:0 0 10px}.lw-section label{display:block;font-size:12px;font-weight:800;margin-top:9px}.lw-section input,.lw-section textarea{width:100%;padding:10px;border:1px solid #d8e0ea;border-radius:9px;margin-top:5px;background:#fff}.lw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lw-read{display:flex;min-height:42px;align-items:center;padding:10px;background:#fff;border:1px solid #e5ebf2;border-radius:9px;margin-top:5px}.lw-note{display:flex;gap:7px;align-items:end}.lw-note input{flex:1}.lw-time{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #e5ebf2}.lw-time i{width:9px;height:9px;background:#0875ef;border-radius:50%;margin-top:5px;flex:none}.lw-time small{display:block;color:#748096;margin-top:3px}.lw-muted{color:#748096}.lw-alert{background:#fee2e2;color:#b42318;border-radius:99px;padding:5px 8px;font-size:10px;font-weight:800}.lead-head{flex-wrap:wrap}@media(max-width:560px){.lw-grid{grid-template-columns:1fr}.lw-note{align-items:stretch;flex-direction:column}}';document.head.appendChild(s);
 decorate();new MutationObserver(decorate).observe($('leadgrid'),{childList:true,subtree:true})
}
setup();
})();