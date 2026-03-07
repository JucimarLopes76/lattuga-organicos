// ============================================================
// Evolution API — WhatsApp integration
// ============================================================

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE;
const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Lattuga Orgânicos';

/**
 * Normalise a Brazilian phone to the 55XXXXXXXXXXX format
 * accepted by the Evolution API (country code + DDD + number, digits only).
 */
function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // Already has country‑code
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    // Missing country code
    return `55${digits}`;
}

/**
 * Low‑level: send a plain‑text WhatsApp message via Evolution API.
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
    if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) {
        console.warn('[Evolution API] Missing env vars — skipping WhatsApp message.');
        return false;
    }

    const url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: normalisePhone(phone),
                text,
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            console.error('[Evolution API] Error:', res.status, body);
            return false;
        }

        console.log('[Evolution API] Message sent to', phone);
        return true;
    } catch (err) {
        console.error('[Evolution API] Network error:', err);
        return false;
    }
}

/**
 * Build and send an order‑confirmation message.
 */
export async function sendOrderConfirmation(order: {
    id: string;
    total_amount: number;
    payment_method?: string | null;
    delivery_method?: string | null;
    delivery_address?: string | null;
    customer?: { name: string; phone?: string | null } | null;
    items?: { quantity: number; unit_price: number; product?: { name: string } | null }[];
}): Promise<boolean> {
    const phone = order.customer?.phone;
    if (!phone) {
        console.warn('[Evolution API] Order has no customer phone — skipping.');
        return false;
    }

    const customerName = order.customer?.name || 'Cliente';
    const shortId = order.id.slice(0, 8).toUpperCase();

    // Build items list
    const itemLines = (order.items || [])
        .map((i) => {
            const name = i.product?.name || 'Produto';
            const total = (i.quantity * i.unit_price).toFixed(2);
            return `  • ${i.quantity}x ${name} — R$ ${total}`;
        })
        .join('\n');

    const paymentLabel: Record<string, string> = {
        pix: 'Pix',
        credit: 'Cartão de Crédito',
        debit: 'Cartão de Débito',
        cash: 'Dinheiro',
    };
    const payment = paymentLabel[order.payment_method || ''] || order.payment_method || '-';

    const deliveryLabel = order.delivery_method === 'delivery' ? 'Entrega' : 'Retirada na loja';

    const message = [
        `✅ *Pedido Confirmado!*`,
        ``,
        `Olá, *${customerName}*! 🥬`,
        `Seu pedido na *${STORE_NAME}* foi aceito.`,
        ``,
        `📋 *Pedido #${shortId}*`,
        itemLines,
        ``,
        `💰 *Total: R$ ${Number(order.total_amount).toFixed(2)}*`,
        `💳 Pagamento: ${payment}`,
        `🚚 Entrega: ${deliveryLabel}`,
        order.delivery_address ? `📍 Endereço: ${order.delivery_address}` : '',
        ``,
        `Obrigado pela preferência! 💚`,
    ]
        .filter(Boolean)
        .join('\n');

    return sendWhatsAppMessage(phone, message);
}
