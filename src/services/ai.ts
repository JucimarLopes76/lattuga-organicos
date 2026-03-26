import { supabase } from '@/lib/supabase';

// ─── API Keys ─────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SILICONFLOW_API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const SILICONFLOW_API_URL = 'https://api.siliconflow.com/v1/images/generations';

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

// ─── Product Image Generation (SiliconFlow — FLUX1.1 Pro) ────────────────────

export async function generateProductImage(
    productName: string,
    category: string,
    scenario?: string
): Promise<string> {

    if (!SILICONFLOW_API_KEY) {
        throw new Error('Chave da API SiliconFlow não configurada. Adicione VITE_SILICONFLOW_API_KEY ao arquivo .env');
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
        const response = await fetch(SILICONFLOW_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Pro/black-forest-labs/FLUX1.1-pro',  // $0.04/img — qualidade profissional
                prompt,
                image_size: '1024x1024',
                batch_size: 1,
                num_inference_steps: 25,   // recomendado para Pro — melhor qualidade
                guidance_scale: 3.5        // equilíbrio entre criatividade e fidelidade ao prompt
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro SiliconFlow: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.images?.[0]?.url;

        if (!imageUrl) {
            throw new Error('SiliconFlow não retornou imagem. Verifique seu saldo de créditos.');
        }

        // Baixa a imagem gerada
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
            throw new Error('Falha ao baixar imagem gerada.');
        }
        const blob = await imgResponse.blob();

        // Gera nome de arquivo SEO-friendly e sobe no Supabase Storage
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

        // Retorna URL pública do Supabase
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // Registra a geração no rate limit
        recordGeneration();

        return urlData.publicUrl;

    } catch (error: any) {
        console.error('Erro na geração de imagem SiliconFlow:', error);
        throw error;
    }
}
