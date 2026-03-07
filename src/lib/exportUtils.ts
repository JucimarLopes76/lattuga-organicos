import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/types';

const translateStatus = (status: string) => {
    switch (status) {
        case 'pending': return 'Pendente';
        case 'accepted': return 'Aceito';
        case 'rejected': return 'Rejeitado';
        case 'completed': return 'Concluído';
        default: return status;
    }
};

const translatePayment = (method: string | null) => {
    switch (method) {
        case 'pix': return 'Pix';
        case 'credit': return 'Crédito';
        case 'debit': return 'Débito';
        case 'cash': return 'Dinheiro';
        default: return method || '-';
    }
};

const getExportData = (orders: Order[]) => {
    const rows: Record<string, string>[] = [];
    for (const order of orders) {
        const base = {
            'Pedido': `#${order.id.slice(-4).toUpperCase()}`,
            'Data': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
            'Cliente': order.customer?.name || 'Não identificado',
            'Telefone': order.customer?.phone || '-',
            'Tipo': order.type === 'online' ? 'Online' : 'PDV',
            'Status': translateStatus(order.status),
            'Entrega': order.delivery_method === 'delivery' ? 'Delivery' : (order.delivery_method === 'pickup' ? 'Retirada' : '-'),
            'Endereço': order.delivery_address || '-',
            'Pagamento': translatePayment(order.payment_method),
            'Total Pedido': formatCurrency(order.total_amount),
            'Desconto': order.discount_amount > 0 ? formatCurrency(order.discount_amount) : '-',
            'Acréscimo': order.surcharge_amount > 0 ? formatCurrency(order.surcharge_amount) : '-',
        };

        const items = order.items ?? [];
        if (items.length === 0) {
            rows.push({ ...base, 'Produto': '-', 'Qtd': '-', 'Preço Unit.': '-', 'Subtotal': '-' });
        } else {
            for (const item of items) {
                rows.push({
                    ...base,
                    'Produto': item.product?.name || 'Item',
                    'Qtd': String(item.quantity),
                    'Preço Unit.': formatCurrency(item.unit_price),
                    'Subtotal': formatCurrency(item.unit_price * item.quantity),
                });
            }
        }
    }
    return rows;
};

const EXPORT_COLUMNS = [
    'Pedido', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Status',
    'Entrega', 'Endereço', 'Pagamento', 'Produto', 'Qtd',
    'Preço Unit.', 'Subtotal', 'Total Pedido', 'Desconto', 'Acréscimo',
] as const;

const getHeaderTitle = (filterDate: string) => {
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    return `Lattuga Organicos - ${currentDate} - Relatório de Pedidos - ${filterDate}`;
};

export const exportToExcel = (orders: Order[], filterDate: string) => {
    const data = getExportData(orders);
    const title = getHeaderTitle(filterDate);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Create worksheet with title in first row
    const ws = XLSX.utils.json_to_sheet([]);

    // Add title
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });

    // Add empty row
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A2' });

    // Add headers and data starting from A3, respecting column order
    XLSX.utils.sheet_add_json(ws, data, { origin: 'A3', header: [...EXPORT_COLUMNS] });

    // Merge title across all columns
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: EXPORT_COLUMNS.length - 1 } });

    // Auto-width columns
    const colWidths = [
        { wch: 10 }, // Pedido
        { wch: 18 }, // Data
        { wch: 25 }, // Cliente
        { wch: 15 }, // Telefone
        { wch: 10 }, // Tipo
        { wch: 12 }, // Status
        { wch: 12 }, // Entrega
        { wch: 30 }, // Endereço
        { wch: 12 }, // Pagamento
        { wch: 30 }, // Produto
        { wch: 8 },  // Qtd
        { wch: 14 }, // Preço Unit.
        { wch: 14 }, // Subtotal
        { wch: 15 }, // Total Pedido
        { wch: 12 }, // Desconto
        { wch: 12 }, // Acréscimo
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

    const safeDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `relatorio_pedidos_${safeDate}.xlsx`);
};

export const exportToPDF = (orders: Order[], filterDate: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const title = getHeaderTitle(filterDate);
    const data = getExportData(orders);

    // Title
    doc.setFontSize(14);
    doc.text(title, 14, 15);

    // Use a subset of columns for PDF (omit Telefone, Endereço for space)
    const pdfColumns = [
        'Pedido', 'Data', 'Cliente', 'Tipo', 'Status', 'Pagamento',
        'Produto', 'Qtd', 'Preço Unit.', 'Subtotal', 'Total Pedido',
    ];

    // Convert data to array of arrays
    const body = data.map(obj => pdfColumns.map(col => obj[col] ?? '-'));

    autoTable(doc, {
        head: [pdfColumns],
        body: body,
        startY: 20,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [22, 163, 74] }, // Brand Green
        columnStyles: {
            6: { cellWidth: 40 }, // Produto
        },
    });

    const safeDate = new Date().toISOString().split('T')[0];
    doc.save(`relatorio_pedidos_${safeDate}.pdf`);
};
