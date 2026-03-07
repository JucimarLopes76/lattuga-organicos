const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateProductDescription(productName: string, category: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY ao arquivo .env');
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Crie uma descrição MUITO CURTA (máximo 60 caracteres) para o produto "${productName}" (Categoria: ${category}). Destaque sabor/benefício. IMPORTANTE: NÃO repita o nome do produto. Comece direto com a qualidade.`
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

        // Remove product name if AI hallucinates it at start (common issue)
        const nameClean = productName.trim();
        if (description.toLowerCase().startsWith(nameClean.toLowerCase())) {
            description = description.substring(nameClean.length).replace(/^[:\s-]+/, '').trim();
        }

        // Ensure strictly <= 70 chars
        return description.length > 70 ? description.substring(0, 67) + '...' : description;
    } catch (error) {
        console.error('Erro ao gerar descrição com IA:', error);
        throw error;
    }
}
