import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod, DeliveryMethod } from '@/types';

export interface ReceiptData {
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    subtotal: number;
    discountAmount: number;
    surcharge: number;
    total: number;
    paymentMethod: PaymentMethod;
    date: Date;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryMethod?: DeliveryMethod | null;
    deliveryAddress?: string | null;
}

const paymentLabels: Record<PaymentMethod, string> = {
    pix: 'Pix',
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
};

export function Receipt({ data }: { data: ReceiptData }) {
    const storeName = import.meta.env.VITE_STORE_NAME || 'Lattuga Orgânicos';
    const storeAddress =
        import.meta.env.VITE_STORE_ADDRESS || 'Rua das Hortaliças, 123';

    return (
        <div className="print-receipt">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {storeName}
                </div>
                <div style={{ fontSize: '10px' }}>{storeAddress}</div>
                <div className="receipt-divider" />
                <div style={{ fontSize: '10px' }}>
                    {format(data.date, 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="receipt-divider" />
            </div>

            {/* Customer + Delivery info */}
            {(data.customerName || data.deliveryMethod) && (
                <div style={{ marginBottom: '6px' }}>
                    {data.customerName && (
                        <div style={{ fontSize: '11px' }}>
                            <strong>Cliente:</strong> {data.customerName}
                        </div>
                    )}
                    {data.customerPhone && (
                        <div style={{ fontSize: '10px' }}>
                            Tel: {data.customerPhone}
                        </div>
                    )}
                    {data.deliveryMethod && (
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            <strong>Entrega:</strong>{' '}
                            {data.deliveryMethod === 'pickup' ? 'Retira na loja' : 'Delivery'}
                        </div>
                    )}
                    {data.deliveryMethod === 'delivery' && data.deliveryAddress && (
                        <div style={{ fontSize: '10px', marginTop: '1px' }}>
                            {data.deliveryAddress}
                        </div>
                    )}
                    <div className="receipt-divider" />
                </div>
            )}

            {/* Items */}
            <table>
                <thead>
                    <tr>
                        <td style={{ fontWeight: 'bold', fontSize: '10px' }}>Item</td>
                        <td style={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>Qtd</td>
                        <td style={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Valor</td>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, i) => (
                        <tr key={i}>
                            <td style={{ fontSize: '11px', maxWidth: '120px' }}>
                                {item.name}
                            </td>
                            <td style={{ fontSize: '11px', textAlign: 'center' }}>
                                {item.quantity}
                            </td>
                            <td style={{ fontSize: '11px', textAlign: 'right' }}>
                                {formatCurrency(item.total)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="receipt-divider" />

            {/* Totals */}
            <table>
                <tbody>
                    <tr>
                        <td style={{ fontSize: '11px' }}>Subtotal:</td>
                        <td style={{ fontSize: '11px', textAlign: 'right' }}>
                            {formatCurrency(data.subtotal)}
                        </td>
                    </tr>
                    {data.discountAmount > 0 && (
                        <tr>
                            <td style={{ fontSize: '11px' }}>Desconto:</td>
                            <td style={{ fontSize: '11px', textAlign: 'right' }}>
                                -{formatCurrency(data.discountAmount)}
                            </td>
                        </tr>
                    )}
                    {data.surcharge > 0 && (
                        <tr>
                            <td style={{ fontSize: '11px' }}>Acréscimo:</td>
                            <td style={{ fontSize: '11px', textAlign: 'right' }}>
                                +{formatCurrency(data.surcharge)}
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td style={{ fontSize: '14px', fontWeight: 'bold' }}>TOTAL:</td>
                        <td
                            style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                textAlign: 'right',
                            }}
                        >
                            {formatCurrency(data.total)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="receipt-divider" />

            {/* Payment */}
            <div style={{ fontSize: '11px', textAlign: 'center' }}>
                Pagamento: {paymentLabels[data.paymentMethod]}
            </div>

            <div className="receipt-divider" />

            {/* Footer */}
            <div
                style={{
                    textAlign: 'center',
                    fontSize: '10px',
                    marginTop: '8px',
                }}
            >
                <div>Obrigado pela preferência!</div>
                <div style={{ marginTop: '4px' }}>
                    Volte sempre 🥬
                </div>
            </div>
        </div>
    );
}
