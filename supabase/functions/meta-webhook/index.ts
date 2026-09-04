import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method === 'GET') {
    const mode=url.searchParams.get('hub.mode'), token=url.searchParams.get('hub.verify_token'), challenge=url.searchParams.get('hub.challenge')
    if(mode==='subscribe' && token===Deno.env.get('META_VERIFY_TOKEN')) return new Response(challenge||'',{status:200})
    return new Response('Forbidden',{status:403})
  }
  if(req.method !== 'POST') return new Response('Method not allowed',{status:405})
  // Webhook receiver scaffold. Meta Lead Ads sends a leadgen_id; fetching the full lead
  // requires a Page access token with the appropriate Meta permissions.
  const body=await req.json()
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const entries=body?.entry||[]
  for(const entry of entries) for(const change of (entry.changes||[])) {
    if(change.field!=='leadgen') continue
    const v=change.value||{}
    await sb.from('meta_webhook_events').upsert({leadgen_id:String(v.leadgen_id||''),page_id:String(v.page_id||''),form_id:String(v.form_id||''),raw:v},{onConflict:'leadgen_id'})
  }
  return Response.json({ok:true})
})
