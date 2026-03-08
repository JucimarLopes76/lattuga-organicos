import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'npm:web-push'

// Deno Deploy / Supabase Edge Functions environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// We'll require these secrets to be set in the Supabase project
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:contato@lattuga.com.br'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Default payload if called via trigger or direct
    let notificationPayload = {
      title: 'Novo Pedido - Lattuga',
      body: 'Você tem um novo pedido!',
      url: '/admin/orders'
    }

    // Try parsing the webhook body (if it comes from Postgres Trigger)
    // Supabase triggers send { type: 'INSERT', record: { ... } }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (body && body.record) {
        const order = body.record;
        const total = Number(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        notificationPayload.body = `Novo pedido #${order.id.slice(0,6)} no valor de ${total}.`;
      } else if (body && body.message) {
        // Direct invocation with custom message
        notificationPayload.body = body.message;
      }
    }

    // Fetch all push subscriptions
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_json')

    if (error) throw error

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send push to all subscribers concurrently
    const pushPromises = subs.map(sub => {
      // web-push expects a stringified payload
      return webpush.sendNotification(
        sub.subscription_json,
        JSON.stringify(notificationPayload)
      ).catch(e => {
        console.error('Falha ao enviar push para uma subscription:', e);
        // Maybe in future we remove dead subscriptions (e.statusCode === 410)
      })
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ success: true, count: subs.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error handling push notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
