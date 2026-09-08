const allowed=new Set(['https://eventpic-online.vercel.app','https://dashboard.eventpic.pt','https://personalizar.eventpic.pt']);
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=async function handler(req,res){
 if(req.method==='GET')return res.status(200).json({configured:!!process.env.RESEND_API_KEY,from:process.env.RESEND_FROM_EMAIL||'onboarding@resend.dev'});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const origin=req.headers.origin||''; if(!allowed.has(origin))return res.status(403).json({error:'Origin not allowed'});
 if(!process.env.RESEND_API_KEY)return res.status(503).json({error:'Email service not configured'});
 const x=req.body||{}; if(!x.names||String(x.names).length>160)return res.status(400).json({error:'Invalid lead'});
 const rows=[['Nome',x.names],['Telemóvel',x.phone],['Email',x.email],['Data do evento',x.wedding_date],['Local',x.venue],['Convidados',x.guests],['Tipo de evento',x.source],['Pack',x.campaign],['Origem',x.origin]].map(([k,v])=>`<tr><td style="padding:8px;border-bottom:1px solid #eee"><b>${k}</b></td><td style="padding:8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join('');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'eventpic-lead-'+(x.id||Date.now())},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'Eventpic <onboarding@resend.dev>',to:['juliper12@gmail.com','filipe@eventpic.pt'],subject:'Novo lead Eventpic — '+String(x.names).slice(0,100),html:`<div style="font-family:Arial,sans-serif;max-width:620px"><h1 style="color:#0875ef">Novo lead Eventpic</h1><p>Foi recebido um novo pedido.</p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="margin-top:24px"><a href="https://eventpic-online.vercel.app/dashboard" style="background:#0875ef;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Abrir dashboard</a></p></div>`})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)return res.status(502).json({error:'Email provider error',details:data});
 return res.status(200).json({sent:true,id:data.id});
};