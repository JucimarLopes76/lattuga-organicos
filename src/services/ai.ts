import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_ACCESS_TOKEN;
// Usando SDXL-Turbo: mais leve, rápido e menos chance de timeout
const HF_IMAGE_MODEL = 'stabilityai/sdxl-turbo'; 

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const RATE_LIMIT_KEY = 'lattuga_ai_img_gen';
const MAX_PER_DAY = 30;
const COOLDOWN_MS = 30_000; // 30 seconds between generations

interface RateLimitData {
    date: string;      // YYYY-MM-DD
    count: number;
    lastGen: number;   // timestamp
}

function getRateLimitData(): RateLimitData {
    try {
        const raw = localStorage.getItem(RATE_LIMIT_KEY);
        if (raw) {
            const data = JSON.parse(raw) as RateLimitData;
            const today = new Date().toISOString().split('T')[0];
            if (data.date === today) return data;
        }
    } catch { /* ignore parse errors */ }
    return { date: new Date().toISOString().split('T')[0], count: 0, lastGen: 0 };
}

function saveRateLimitData(data: RateLimitData): void {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
}

export function canGenerateImage(): { allowed: boolean; reason?: string; remaining: number } {
    const data = getRateLimitData();
    const now = Date.now();
    const remaining = MAX_PER_DAY - data.count;

    if (data.count >= MAX_PER_DAY) {
        return { allowed: false, reason: `Limite diário atingido (${MAX_PER_DAY} gerações). Tente novamente amanhã.`, remaining: 0 };
    }

    const elapsed = now - data.lastGen;
    if (elapsed < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return { allowed: false, reason: `Aguarde ${waitSec}s antes de gerar outra imagem.`, remaining };
    }

    return { allowed: true, remaining };
}

export function getRemainingGenerations(): number {
    return MAX_PER_DAY - getRateLimitData().count;
}

function recordGeneration(): void {
    const data = getRateLimitData();
    data.count += 1;
    data.lastGen = Date.now();
    saveRateLimitData(data);
}

// ─── SEO Helpers ─────────────────────────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
}

function buildSeoFilename(productName: string, category: string): string {
    const catSlug = slugify(category);
    const nameSlug = slugify(productName);
    const timestamp = Date.now();
    return `${catSlug}/${nameSlug}-organico-${timestamp}.webp`;
}

// ─── Product Description Generation (Gemini) ────────────────────────────────

export async function generateProductDescription(productName: string, category: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY ao arquivo .env');
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Você é redator da Lattuga Organicos, uma loja premium de alimentos orgânicos e naturais.

Crie uma descrição de até 150 caracteres para o produto "${productName}" (Categoria: ${category}).

Regras:
- NÃO repita o nome do produto
- Comece direto com a qualidade/benefício
- Destaque: frescor, procedência orgânica, sabor natural, benefícios à saúde
- Tom: premium, confiável, natural
- Use linguagem que desperte desejo no consumidor consciente
- Máximo 150 caracteres, sem aspas`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Falha ao gerar descrição com Gemini');
        }

        const data = await response.json();
        let description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Remove product name if AI hallucinates it at start
        const nameClean = productName.trim();
        if (description.toLowerCase().startsWith(nameClean.toLowerCase())) {
            description = description.substring(nameClean.length).replace(/^[:\s\-–]+/, '').trim();
        }

        // Remove surrounding quotes if present
        description = description.replace(/^["'""]+|["'""]+$/g, '');

        return description.length > 150 ? description.substring(0, 147) + '...' : description;
    } catch (error) {
        console.error('Erro ao gerar descrição com IA:', error);
        throw error;
    }
}

// ─── Product Image Generation (Hugging Face) ───────────────────────────

export async function generateProductImage(
    productName: string,
    category: string,
    scenario?: string
): Promise<string> {
    if (!HF_TOKEN) {
        throw new Error('Token do Hugging Face não configurado localmente. Verifique se adicionou VITE_HUGGINGFACE_ACCESS_TOKEN ao arquivo .env e reiniciou o servidor.');
    }

    // Check rate limit
    const rateCheck = canGenerateImage();
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.reason);
    }

    const scenarioText = scenario
        ? `, in a professional studio setting with ${scenario}`
        : ', professional food photography, isolated on a clean aesthetic background, studio lighting';

    const prompt = `Highest quality professional food photography of ${productName}${scenarioText}. 
Exquisite detail, 8k resolution, photorealistic, appetizing, natural vibrant colors, clean minimal composition, editorial style.`;

    const negativePrompt = "text, words, logo, watermark, blurry, low quality, distorted, artificial, packaging, plastic bag, messy, lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck";

    try {
        console.log('Solicitando imagem ao Hugging Face:', prompt);
        
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${HF_TOKEN}`,
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        negative_prompt: negativePrompt,
                        num_inference_steps: 1, // Especifico para Turbo
                        guidance_scale: 0.0,    // Especifico para Turbo
                    },
                    options: {
                        wait_for_model: true,
                        use_cache: false
                    }
                }),
            }
        );

        if (!response.ok) {
            let errorMessage = 'Erro desconhecido na API de imagem';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const blob = await response.blob();
        
        // Verifica se o blob é mesmo uma imagem
        if (!blob.type.startsWith('image/')) {
             const text = await blob.text();
             console.error('Resposta inesperada (não é imagem):', text);
             throw new Error('A API retornou um formato inválido. Tente novamente.');
        }

        const mimeType = blob.type;

        // Generate SEO-friendly filename
        const filePath = buildSeoFilename(productName, category);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, blob, {
                contentType: mimeType,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Erro no Supabase Storage: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // Record the generation for rate limiting
        recordGeneration();

        return urlData.publicUrl;
    } catch (error: any) {
        console.error('Erro detalhado na geração de imagem:', error);
        
        // Se for erro de fetch, dar uma dica sobre CORS/Token
        if (error.message === 'Failed to fetch') {
            throw new Error('Falha na conexão com Hugging Face. Verifique se o Token é válido e se reiniciou o servidor local.');
        }
        
        throw error;
    }
}
