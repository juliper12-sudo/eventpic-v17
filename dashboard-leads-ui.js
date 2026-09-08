(()=>{
const $=id=>document.getElementById(id);
let detailed=false;
const meta={
 'Novo lead':{color:'#0875ef',soft:'#eaf3ff',label:'Entradas recentes'},
 'Em contacto':{color:'#8b5cf6',soft:'#f1ebff',label:'Conversa iniciada'},
 'Proposta enviada':{color:'#f59e0b',soft:'#fff5dc',label:'Aguardar decisão'},
 'Convertido':{color:'#16a34a',soft:'#e8f8ee',label:'Clientes ganhos'},
 'Perdido':{color:'#64748b',soft:'#eef2f6',label:'Sem continuidade'}
};
function toolbar(){
 if($('leadViewTools')||!$('leadTools'))return;
 $('leadTools').insertAdjacentHTML('afterend',`<div id="leadViewTools" class="lead-view-tools"><div><button class="lead-view on" data-view="compact">Vista compacta</button><button class="lead-view" data-view="detail">Vista detalhada</button></div><button id="clearLeadFilters" class="clear-filters">Limpar filtros</button></div>`);
 document.querySelectorAll('.lead-view').forEach(b=>b.onclick=()=>{detailed=b.dataset.view==='detail';document.querySelectorAll('.lead-view').forEach(x=>x.classList.toggle('on',x===b));document.body.classList.toggle('lead-detailed',detailed);decorate()});
 $('clearLeadFilters').onclick=()=>{let q=$('leadSearch'),s=$('leadStage'),o=$('leadOrigin'),p=$('leadPack');if(q)q.value='';if(s)s.value='Todos';if(o)o.value='Todas';if(p)p.value='Todos';q?.dispatchEvent(new Event('input',{bubbles:true}));s?.dispatchEvent(new Event('change',{bubbles:true}))};
}
function decorate(){
 toolbar();
 document.querySelectorAll('#leadgrid .col').forEach(col=>{
  let raw=col.firstElementChild;if(!raw)return;
  let name=(raw.textContent||'').split('·')[0].trim(),info=meta[name]||meta['Perdido'];
  col.dataset.stage=name;col.style.setProperty('--stage',info.color);col.style.setProperty('--stage-soft',info.soft);
  if(!raw.classList.contains('stage-head')){let count=(raw.textContent.match(/·\s*(\d+)/)||[])[1]||'0';raw.className='stage-head';raw.innerHTML=`<span><b>${name}</b><small>${info.label}</small></span><strong>${count}</strong>`}
 });
 document.querySelectorAll('#leadgrid .lead').forEach(card=>{
  card.classList.toggle('expanded',detailed);
  if(card.dataset.pretty)return;card.dataset.pretty='1';
  let info=card.querySelector('.lead-info'),actions=card.querySelector('.lead-actions'),select=card.querySelector('select');
  if(info){let t=document.createElement('button');t.className='lead-toggle';t.type='button';t.innerHTML='<span>Ver detalhes</span><i>⌄</i>';t.onclick=()=>{card.classList.toggle('expanded');t.querySelector('span').textContent=card.classList.contains('expanded')?'Ocultar detalhes':'Ver detalhes'};info.before(t)}
  if(select){let label=document.createElement('small');label.className='status-label';label.textContent='Mudar estado';select.before(label)}
  if(actions)actions.classList.add('pretty-actions');
 });
}
function css(){let s=document.createElement('style');s.textContent=`
#leads{--shadow:0 12px 35px rgba(20,36,62,.08)}#leads>.top{background:linear-gradient(135deg,#0b1d3a,#0875ef);color:#fff;padding:24px;border-radius:22px;box-shadow:0 18px 45px rgba(8,117,239,.18)}#leads>.top h1{margin:0}#leads>.top .btn{background:#fff!important;color:#0875ef!important}
.lead-stats{margin-top:15px}.lead-stat{position:relative;overflow:hidden;box-shadow:var(--shadow);border:0!important;transition:.2s transform}.lead-stat:hover{transform:translateY(-3px)}.lead-stat:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:#0875ef}.lead-stat:nth-child(2):before{background:#8b5cf6}.lead-stat:nth-child(3):before{background:#f59e0b}.lead-stat:nth-child(4):before{background:#16a34a}.lead-stat:nth-child(5):before{background:#64748b}
.lead-tools{background:#fff;padding:12px;border-radius:16px;box-shadow:var(--shadow);margin-bottom:8px!important}.lead-tools input,.lead-tools select{border:1px solid #e4e9f0!important;background:#f8fafc!important;transition:.2s}.lead-tools input:focus,.lead-tools select:focus{outline:3px solid rgba(8,117,239,.12);border-color:#0875ef!important;background:#fff!important}
.lead-view-tools{display:flex;justify-content:space-between;align-items:center;margin:10px 0 16px}.lead-view-tools>div{display:flex;background:#e9eef5;padding:4px;border-radius:11px}.lead-view,.clear-filters{border:0;background:transparent;padding:8px 11px;border-radius:8px;cursor:pointer;font-weight:750;color:#627086}.lead-view.on{background:#fff;color:#0875ef;box-shadow:0 3px 10px #20334e16}.clear-filters{background:#fff;border:1px solid #e3e8ef}
.leadgrid{gap:14px!important;padding:2px 2px 18px}.col{background:linear-gradient(180deg,var(--stage-soft),#f7f9fc 140px)!important;border-top:4px solid var(--stage);padding:12px!important}.stage-head{display:flex;align-items:center;justify-content:space-between;padding:5px 3px 12px}.stage-head span b,.stage-head span small{display:block}.stage-head span small{font-size:10px;color:#718096;margin-top:2px}.stage-head>strong{background:#fff;color:var(--stage);border-radius:99px;min-width:28px;height:28px;display:grid;place-items:center;font-size:12px;box-shadow:0 3px 10px #1f344a12}
.lead{border:0!important;border-left:4px solid var(--stage)!important;border-radius:14px!important;padding:14px!important;box-shadow:0 7px 20px rgba(25,43,70,.07)!important;transition:.2s transform,.2s box-shadow;animation:leadIn .25s ease both}.lead:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(25,43,70,.13)!important}.lead-head{align-items:center}.lead-head>b{font-size:15px;line-height:1.25}.lead-info{display:none!important;background:#f8fafc;border-radius:10px;padding:10px;margin:8px 0!important}.lead.expanded .lead-info,.lead-detailed .lead-info{display:grid!important}.lead-toggle{width:100%;display:flex;justify-content:space-between;border:0;background:transparent;color:#0875ef;font-weight:750;padding:8px 0;cursor:pointer;font-size:12px}.lead-toggle i{font-style:normal;transition:.2s transform}.lead.expanded .lead-toggle i{transform:rotate(180deg)}.lead-detailed .lead-toggle{display:none}.status-label{display:block;color:#8490a2;margin:7px 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}.pretty-actions{gap:6px!important}.pretty-actions .btn{border-radius:9px!important;padding:9px!important;font-size:12px}.la-buttons{margin-bottom:1px}
@keyframes leadIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media(max-width:900px){#leads>.top{padding:18px}.lead-view-tools{position:sticky;top:0;z-index:8;background:#f5f7fb;padding:8px 0}.leadgrid{scroll-snap-type:x proximity}.col{scroll-snap-align:start}}
@media(max-width:560px){.lead-view-tools{align-items:stretch;gap:8px;flex-direction:column}.lead-view-tools>div{width:100%}.lead-view{flex:1}.clear-filters{width:100%}.lead{margin:10px 0!important}.lead-stats{display:grid!important;grid-template-columns:1fr 1fr!important}.lead-stat:last-child{grid-column:1/-1}}
`;document.head.appendChild(s)}
function init(){css();let tries=0,t=setInterval(()=>{if($('leadgrid')){decorate();new MutationObserver(()=>requestAnimationFrame(decorate)).observe($('leadgrid'),{childList:true,subtree:true});clearInterval(t)}else if(++tries>30)clearInterval(t)},300)}
init();
})();