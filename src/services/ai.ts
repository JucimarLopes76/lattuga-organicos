import { supabase } from '@/lib/supabase';

// ─── API Keys ─────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const RATE_LIMIT_KEY = 'lattuga_ai_img_gen';
const MAX_PER_DAY = 30;
const COOLDOWN_MS = 30_000;

interface RateLimitData {
    date: string;
    count: number;
    lastGen: number;
}

function getRateLimitData(): RateLimitData {
    try {
        const raw = localStorage.getItem(RATE_LIMIT_KEY);
        if (raw) {
            const data = JSON.parse(raw) as RateLimitData;
            const today = new Date().toISOString().split('T')[0];
            if (data.date === today) return data;
        }
    } catch { }
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
        throw new Error('Chave da API Gemini não configurada.');
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
                            text: `Você é um nutricionista e redator autêntico da Lattuga Organicos.
Crie uma descrição super curta (máximo 120 caracteres) para o produto "${productName}" focada ESTRITAMENTE em seus benefícios nutricionais REAIS.

Regras OBRIGATÓRIAS:
1. NÃO repita o nome do produto no texto. Vá direto ao ponto.
2. Instigue a compra destacando o valor à saúde.
3. Cite apenas vitaminas, minerais ou propriedades biológicas VERDADEIRAS e comprovadas deste exato alimento (ex: "Rico em Vitamina C e antioxidantes naturais", "Alta concentração de fibras").
4. É ESTRITAMENTE PROIBIDO mentir, generalizar ou alucinar benefícios que o produto não possui.
5. Tom direto, premium e comercial.
6. Não use aspas.`
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Limite de uso atingido (15 requisições por minuto). Aguarde uns 10 segundinhos e tente novamente! ⏳');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Falha ao gerar descrição com Gemini');
        }

        const data = await response.json();
        let description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        const nameClean = productName.trim();
        if (description.toLowerCase().startsWith(nameClean.toLowerCase())) {
            description = description.substring(nameClean.length).replace(/^[:\s\-–]+/, '').trim();
        }

        description = description.replace(/^["'""]+|["'""]+$/g, '');
        return description;

    } catch (error) {
        console.error('Erro ao gerar descrição:', error);
        throw error;
    }
}

// ─── Translator Helper (Gemini) ──────────────────────────────────────────────

async function translateToEnglish(productName: string): Promise<string> {
    if (!GEMINI_API_KEY) return productName; // Fallback se não tiver chave
    try {
        const response = await fetch(
            `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Translate the following Brazilian food/produce name to English. Return ONLY the translation, nothing else. Example: Abacate -> Avocado. Abobrinha -> Zucchini. Name: "${productName}"`
                        }]
                    }]
                })
            }
        );
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Limite do Gemini atingido (15/min). Aguarde 10 segundinhos antes de gerar a imagem! ⏳');
            }
            return productName;
        }
        const data = await response.json();
        const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || productName;
        return translation.replace(/[^a-zA-Z\s\-]/g, ''); // Limpa qualquer aspas extra
    } catch {
        return productName;
    }
}

// ─── Product Image Generation (via proxy serverless /api/generate-image) ──────

export async function generateProductImage(
    productName: string,
    category: string,
    isPackaged: boolean = false,
    scenario?: string,
    existingImageUrl?: string,
    description?: string // Add description parameter
): Promise<string> {

    const rateCheck = canGenerateImage();
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.reason);
    }
    
    if (isPackaged) {
        throw new Error('A IA de geração de imagem está desativada para produtos de empresas/embalados para evitar alucinações (como inventar falsas embalagens). Utilize a imagem oficial do fornecedor.');
    }

    const baseDesc = description ? ` Context details: ${description}` : '';
    const baseScen = scenario ? ` Background setup: ${scenario}` : '';
    
    // Limpar o nome do produto para a IA não se confundir com palavras adicionais
    const cleanName = productName
        .replace(/orgânic[ao]s?/ig, '')
        .replace(/\(.*\)/g, '')
        .replace(/\b(kg|maço|bandeja|g|ml|litro|peça|dúzia|unidade)\b/ig, '')
        .trim();

    // Fundamental: Traduzir para o inglês para a IA (FLUX) saber exatamente a biologia do alimento
    const translatedName = await translateToEnglish(cleanName);

    // Prompt fornecido e homologado para alta conversão de fotografia
    const prompt = `Ultra photorealistic image of fresh ${translatedName}, perfectly clean and visually appealing, with vibrant natural colors and realistic textures.${baseDesc}

Placed in an attractive and modern composition suitable for e-commerce, with soft natural lighting, subtle shadows, and a premium aesthetic.

Background: clean, minimal, and slightly blurred (light neutral tones or natural kitchen/organic environment), enhancing the product as the main focus.${baseScen}

Style: high-end food photography, shot with a professional DSLR camera, 50mm lens, shallow depth of field, sharp focus on the product.

Details: visible freshness (water droplets, natural imperfections), rich texture, realistic color grading, no artificial look.

Framing: centered or slightly off-center composition, balanced and visually pleasing, with negative space for branding if needed.

Resolution: 4K, ultra-detailed, studio quality.

No text, no watermark, no logo.`;

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ao gerar imagem: ${response.status}`);
        }

        const data = await response.json();
        const imageBase64 = data.imageBase64;

        if (!imageBase64) {
            throw new Error('A IA não retornou imagem. Tente novamente mais tarde.');
        }

        // Converte base64 → Blob para upload no Supabase
        const byteChars = atob(imageBase64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: 'image/jpeg' });

        const filePath = buildSeoFilename(productName, category);

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, blob, { contentType: 'image/webp', upsert: true });

        if (uploadError) throw new Error(`Erro ao salvar no Storage: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        recordGeneration();
        return urlData.publicUrl;

    } catch (error: any) {
        console.error('Erro na geração de imagem:', error);
        throw error;
    }
}
