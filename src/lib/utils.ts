import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function generateWhatsAppLink(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
}

export function generateOrderSummary(
    orderId: string,
    items: { name: string; quantity: number; unitPrice: number }[],
    total: number,
    deliveryMethod: string,
    paymentMethod: string,
    customerName: string,
    customerAddress: string | null
): string {
    const storeName = import.meta.env.VITE_STORE_NAME || 'Lattuga Orgânicos';

    const paymentMap: Record<string, string> = {
        pix: 'Pix',
        debit: 'Cartão de Débito',
        credit: 'Cartão de Crédito',
        cash: 'Dinheiro',
    };

    const paymentLabel = paymentMap[paymentMethod] || paymentMethod;

    // Use String.fromCodePoint to ensure correct encoding
    const icons = {
        user: String.fromCodePoint(0x1F464),
        package: String.fromCodePoint(0x1F4E6),
        pin: String.fromCodePoint(0x1F4CD),
        payment: String.fromCodePoint(0x1F4B2),
        cart: String.fromCodePoint(0x1F6D2),
        moneybag: String.fromCodePoint(0x1F4B0),
        bullet: String.fromCodePoint(0x2022)
    };

    let msg = `*Novo Pedido #${orderId.slice(0, 8).toUpperCase()}* — ${storeName}\n\n`;
    msg += `${icons.user} *Cliente:* ${customerName}\n`;
    msg += `${icons.package} *Entrega:* ${deliveryMethod === 'pickup' ? 'Retirada na loja' : 'Delivery'}\n`;

    if (deliveryMethod === 'delivery' && customerAddress) {
        msg += `${icons.pin} *Endereço:* ${customerAddress}\n`;
    }

    msg += `${icons.payment} *Pagamento:* ${paymentLabel}\n\n`;
    msg += `${icons.cart} *Itens:*\n`;
    items.forEach((item) => {
        msg += `${icons.bullet} ${item.quantity}x ${item.name} — ${formatCurrency(item.unitPrice * item.quantity)}\n`;
    });
    msg += `\n${icons.moneybag} *Total: ${formatCurrency(total)}*`;
    return msg;
}

export function isProductPackaged(productName: string, category: string): boolean {
    const FRESH_CATEGORIES = ['Verduras', 'Legumes', 'Frutas'];
    const PACKAGED_KEYWORDS = /korin|native|orgânic[ao]|mãe terra|taeq|jasmine|vitao|vitalin|bem estar|qualitá/i;
    const isFreshProduce = FRESH_CATEGORIES.includes(category) && !PACKAGED_KEYWORDS.test(productName);
    return !isFreshProduce || PACKAGED_KEYWORDS.test(productName);
}
