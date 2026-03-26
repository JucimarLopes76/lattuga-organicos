import { supabase } from '@/lib/supabase';

// ─── API Keys ─────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const RATE_LIMIT_KEY = 'lattuga_ai_img_gen';
const MAX_PER_DAY = 30;
const COOLDOWN_MS = 30_000; // 30 segundos entre gerações

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
        return {
            allowed: false,
            reason: `Limite diário atingido (${MAX_PER_DAY} gerações). Tente novamente amanhã.`,
            remaining: 0
        };
    }

    const elapsed = now - data.lastGen;
    if (elapsed < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return {
            allowed: false,
            reason: `Aguarde ${waitSec}s antes de gerar outra imagem.`,
            remaining
        };
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
        .replace(/[\u0300-\u036f]/g, '')
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

// ─── Product Description Generation (Gemini 2.0 Flash) ───────────────────────

export async function generateProductDescription(
    productName: string,
    category: string
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY ao arquivo .env');
    }

    try {
        const response = await fetch(
            `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
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
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Falha ao gerar descrição com Gemini');
        }

        const data = await response.json();
        let description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Remove nome do produto se a IA repetir no início
        const nameClean = productName.trim();
        if (description.toLowerCase().startsWith(nameClean.toLowerCase())) {
            description = description.substring(nameClean.length).replace(/^[:\s\-–]+/, '').trim();
        }

        // Remove aspas se presentes
        description = description.replace(/^["'""]+|["'""]+$/g, '');

        return description.length > 150 ? description.substring(0, 147) + '...' : description;

    } catch (error) {
        console.error('Erro ao gerar descrição com IA:', error);
        throw error;
    }
}

// ─── Product Image Generation (via Supabase Edge Function → SiliconFlow) ─────

export async function generateProductImage(
    productName: string,
    category: string,
    scenario?: string
): Promise<string> {

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas.');
    }

    // Verificação de rate limit
    const rateCheck = canGenerateImage();
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.reason);
    }

    const scenarioText = scenario
        ? `professional studio setting with ${scenario}`
        : 'professional food photography, isolated on clean minimal white background, studio lighting, soft natural light';

    const prompt = `Professional e-commerce product photography of "${productName}", organic food product, ${scenarioText}. High resolution, sharp focus, natural vibrant colors, clean appetizing composition for premium organic food store catalog. Square format 1:1. No text, no watermarks, no logos, no artificial packaging, food only. Editorial magazine style, photorealistic.`;

    try {
        // ── Chama a Edge Function (sem CORS, sem expor a API key) ──
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/quick-action`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, productName, category }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro na Edge Function: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.imageUrl;

        if (!imageUrl) {
            throw new Error('Edge Function não retornou imagem. Verifique o saldo SiliconFlow.');
        }

        // ── Baixa a imagem e sobe no Supabase Storage ──
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
            throw new Error('Falha ao baixar imagem gerada.');
        }
        const blob = await imgResponse.blob();

        const filePath = buildSeoFilename(productName, category);

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, blob, {
                contentType: 'image/webp',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Erro ao salvar imagem no Storage: ${uploadError.message}`);
        }

        // ── Retorna URL pública do Supabase Storage ──
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // Registra a geração no rate limit
        recordGeneration();

        return urlData.publicUrl;

    } catch (error: any) {
        console.error('Erro na geração de imagem:', error);
        throw error;
    }
}
