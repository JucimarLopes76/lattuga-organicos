export const config = { runtime: 'edge' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    const sfRes = await fetch('https://api.siliconflow.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        image_size: '1024x1024',
        batch_size: 1,
      }),
    })

    const sfData = await sfRes.json()
    const imageUrl = sfData.images?.[0]?.url ?? null

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'SiliconFlow não retornou imagem. Verifique seu saldo.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download server-side para evitar bloqueio CORS do CDN no browser
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Falha ao baixar imagem do CDN: ${imgRes.status}`)
    const imgBuffer = await imgRes.arrayBuffer()
    const bytes = new Uint8Array(imgBuffer)
    
    // Chunk conversion to avoid "Maximum call stack size exceeded"
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    return new Response(JSON.stringify({ imageBase64: base64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
