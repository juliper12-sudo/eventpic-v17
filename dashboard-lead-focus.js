(()=>{
const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state=s=>s==='Contactado'?'Em contacto':s==='Fechado'?'Convertido':(s||'Novo lead');
const stamp=v=>v?new Date(v).getTime():0;
const elapsed=v=>v?Math.max(0,Math.floor((Date.now()-stamp(v))/86400000)):0;
function task(x){
 const st=state(x.status),now=Date.now(),due=x.next_contact_at&&stamp(x.next_contact_at)<=now;
 if(due)return{level:3,label:'Seguimento vencido',color:'red',date:stamp(x.next_contact_at)};
 if(st==='Novo lead'&&!x.last_contact_at)return{level:3,label:elapsed(x.created_at)>=1?'Novo lead há '+elapsed(x.created_at)+' dias':'Novo lead por contactar',color:'red',date:stamp(x.created_at)};
 if(st==='Proposta enviada'&&elapsed(x.updated_at||x.created_at)>=2)return{level:2,label:'Proposta sem resposta',color:'amber',date:stamp(x.updated_at||x.created_at)};
 if(st==='Em contacto'&&!x.next_contact_at)return{level:1,label:'Agendar próximo contacto',color:'blue',date:stamp(x.updated_at||x.created_at)};
 return null
}
function render(){
 let host=$('leadFocus');if(!host||!window.leads)return;
 let rows=leads.map(x=>({x,t:task(x)})).filter(v=>v.t).sort((a,b)=>b.t.level-a.t.level||a.t.date-b.t.date),urgent=rows.filter(v=>v.t.level===3).length,due=rows.filter(v=>v.t.label==='Seguimento vencido').length,newCount=rows.filter(v=>v.t.label.includes('Novo lead')).length,proposal=rows.filter(v=>v.t.label==='Proposta sem resposta').length;
 host.innerHTML=`<div class="lf-head"><div><small>FOCO COMERCIAL</small><h2>Prioridades de hoje</h2></div><span class="lf-total ${urgent?'hot':''}">${rows.length} pendente${rows.length===1?'':'s'}</span></div><div class="lf-kpis"><button data-filter="new"><b>${newCount}</b><span>Por contactar</span></button><button data-filter="due"><b>${due}</b><span>Seguimentos</span></button><button data-filter="proposal"><b>${proposal}</b><span>Propostas</span></button></div><div class="lf-list">${rows.slice(0,6).map(({x,t})=>`<article><i class="${t.color}"></i><div><b>${safe(x.names||'Lead sem nome')}</b><small>${safe(t.label)}${x.wedding_date?' · '+safe(x.wedding_date):''}</small></div><div class="lf-actions">${x.phone?`<button class="btn green" onclick="contactLead('${x.id}')">WhatsApp</button>`:''}<button class="btn light" onclick="editLead('${x.id}')">Abrir</button><button class="btn blue" onclick="openLeadAnalysis('${x.id}')">Agente</button></div></article>`).join('')||'<p class="lf-empty">Tudo em dia. Não existem contactos pendentes.</p>'}</div>`;
 host.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{let type=b.dataset.filter,select=$('leadStage');if(!select)return;if(type==='new')select.value='Novo lead';else if(type==='proposal')select.value='Proposta enviada';else select.value='Todos';select.dispatchEvent(new Event('change',{bubbles:true}));$('leadgrid')?.scrollIntoView({behavior:'smooth',block:'start'})})
}
function init(){
 let stats=$('leadStats');if(!stats)return setTimeout(init,250);
 if(!$('leadFocus'))stats.insertAdjacentHTML('beforebegin','<section id="leadFocus" class="lead-focus"></section>');
 let s=document.createElement('style');s.textContent=`
.lead-focus{background:#fff;border:1px solid #e5ebf2;border-radius:20px;padding:18px;margin:16px 0;box-shadow:0 12px 35px rgba(20,36,62,.08)}.lf-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.lf-head small{font-weight:900;letter-spacing:.9px;color:#0875ef}.lf-head h2{font-size:20px;margin:3px 0}.lf-total{background:#eef2f7;color:#586477;padding:7px 11px;border-radius:99px;font-size:12px;font-weight:850}.lf-total.hot{background:#fee2e2;color:#b42318}.lf-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0}.lf-kpis button{border:0;background:#f7f9fc;border-radius:12px;padding:10px;text-align:left;cursor:pointer}.lf-kpis b,.lf-kpis span{display:block}.lf-kpis b{font-size:20px}.lf-kpis span{font-size:11px;color:#748096}.lf-list{display:grid;gap:7px}.lf-list article{display:grid;grid-template-columns:5px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:1px solid #edf0f4;border-radius:12px}.lf-list article>i{width:5px;height:100%;min-height:34px;border-radius:99px;background:#0875ef}.lf-list article>i.red{background:#dc2626}.lf-list article>i.amber{background:#f59e0b}.lf-list article small{display:block;color:#748096;margin-top:3px}.lf-actions{display:flex;gap:5px}.lf-actions .btn{padding:7px 9px;font-size:11px}.lf-empty{color:#16743d;background:#ecfdf3;padding:12px;border-radius:10px;margin:0}@media(max-width:650px){.lf-kpis{grid-template-columns:1fr 1fr 1fr}.lf-list article{grid-template-columns:5px 1fr}.lf-actions{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr)}.lf-actions .btn{width:100%}.lf-head{align-items:flex-start}.lf-kpis span{font-size:10px}}`;document.head.appendChild(s);
 render();let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,80)}).observe($('leadgrid'),{childList:true,subtree:true})
}
init();
})();