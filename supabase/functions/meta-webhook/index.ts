import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const encoder = new TextEncoder()

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

async function validMetaSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = 'sha256=' + [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return safeEqual(expected, signature)
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = Deno.env.get('META_VERIFY_TOKEN')
    if (verifyToken && mode === 'subscribe' && token === verifyToken) {
      return new Response(challenge || '', { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const appSecret = Deno.env.get('META_APP_SECRET')
  if (!appSecret) return new Response('Webhook not configured', { status: 503 })

  const declaredSize = Number(req.headers.get('content-length') || 0)
  if (declaredSize > 1_000_000) return new Response('Payload too large', { status: 413 })

  const rawBody = await req.text()
  if (rawBody.length > 1_000_000) return new Response('Payload too large', { status: 413 })

  const signature = req.headers.get('x-hub-signature-256')
  if (!(await validMetaSignature(rawBody, signature, appSecret))) {
    return new Response('Invalid signature', { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (body.object !== 'page') return new Response('Ignored', { status: 202 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return new Response('Database not configured', { status: 503 })

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const entries = Array.isArray(body.entry) ? body.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      if (change?.field !== 'leadgen') continue
      const value = change.value || {}
      const leadgenId = String(value.leadgen_id || '')
      if (!leadgenId) continue
      const { error } = await sb.from('meta_webhook_events').upsert(
        {
          leadgen_id: leadgenId,
          page_id: String(value.page_id || ''),
          form_id: String(value.form_id || ''),
          raw: value,
        },
        { onConflict: 'leadgen_id' },
      )
      if (error) {
        console.error('Failed to persist Meta webhook event', error.code)
        return new Response('Database error', { status: 500 })
      }
    }
  }

  return Response.json({ ok: true })
})
