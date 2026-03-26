import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Rate Limiting (MANTIDO) ───────────────────────────────────────────────────────────

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

// ─── SEO Helpers (MANTIDO) ─────────────────────────────────────────────────────────────

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
    return `${catSlug}/${nameSlug}-organico-${timestamp}.jpeg`; // Alterado para .jpeg devido ao Imagen 3
}

// ─── Product Description Generation (Gemini 2.0 Flash) (MANTIDO) ────────────────────

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

// ─── Product Image Generation (Imagen 3 - Corrigido) ─────────────────────────

export async function generateProductImage(
    productName: string,
    category: string,
    scenario?: string
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Chave da API não configurada. Adicione VITE_GEMINI_API_KEY ao arquivo .env');
    }

    // Check rate limit (MANTIDO)
    const rateCheck = canGenerateImage();
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.reason);
    }

    // Estruturação do prompt otimizada para Imagen 3 (inglês para melhor resultado fotográfico)
    const scenarioText = scenario
        ? `, in a professional studio setting with ${scenario}`
        : ', professional food photography, isolated on a clean minimal aesthetic background, studio lighting';

    const prompt = `Professional high-resolution e-commerce photography of ${productName} (organic food). ${scenarioText}. Sharp focus, vibrant natural colors, appetizing composition. 1:1 square aspect ratio. Absolutely no text, no watermarks, no logos, no artificial packaging, purely the natural food item. Editorial gastronomy magazine style.`;

    try {
        // CORREÇÃO: Endpoint do Imagen 3 via Predict
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent, {
            method: 'POST',
            headers: { 'x-goog-api-key': ${GEMINI_API_KEY}, 'Content-Type': 'application/json',},
            body: JSON.stringify({
                instances: [{ prompt: prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    outputOptions: { mimeType: "image/jpeg" }
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Falha ao gerar imagem com Imagen 3. Verifique sua cota.');
        }

        const data = await response.json();

        // CORREÇÃO: Extração do base64 específica do Imagen 3
        const base64 = data.predictions?.[0]?.bytesBase64Encoded;

        if (!base64) {
            throw new Error('A IA não retornou uma imagem.');
        }

        // Conversão base64 to blob (MANTIDO, ajustado tipo)
        const mimeType = 'image/jpeg';
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // Generate SEO-friendly filename (MANTIDO)
        const filePath = buildSeoFilename(productName, category);

        // Upload to Supabase Storage (MANTIDO)
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, blob, {
                contentType: mimeType,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Erro ao salvar imagem no Storage: ${uploadError.message}`);
        }

        // Get public URL (MANTIDO)
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // Record the generation for rate limiting (MANTIDO)
        recordGeneration();

        return urlData.publicUrl;
    } catch (error: any) {
        console.error('Erro na geração de imagem Gemini:', error);
        throw error;
    }
}
