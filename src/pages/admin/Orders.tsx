import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ptBR } from 'date-fns/locale';
import {
    Clock,
    CheckCircle2,
    XCircle,
    ShoppingBag,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Calendar,
    Search,
    Filter,
    X,
    FileSpreadsheet,
    FileText,
    Download,
    Ban,
    Pencil,
    Save,
} from 'lucide-react';
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    isWithinInterval,
    parseISO
} from 'date-fns';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, cn } from '@/lib/utils';
import { useOrdersStore } from '@/stores/ordersStore';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import type { Order } from '@/types';

export default function Orders() {
    const { orders, isLoading, fetchOrders, updateStatus, cancelOrder, updateOrderFields } = useOrdersStore();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editPayment, setEditPayment] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const openEdit = (order: Order) => {
        setEditingOrderId(order.id);
        setEditPayment(order.payment_method || '');
        setEditStatus(order.status);
        setEditNotes((order as any).notes || '');
    };

    const saveEdit = async () => {
        if (!editingOrderId) return;
        setIsSavingEdit(true);
        try {
            await updateOrderFields(editingOrderId, {
                payment_method: editPayment,
                status: editStatus,
                notes: editNotes || undefined,
            });
            setEditingOrderId(null);
        } catch {
            alert('Erro ao salvar. Tente novamente.');
        } finally {
            setIsSavingEdit(false);
        }
    };
    const [filter, setFilter] = useState<string>('all');

    // Notifications and real-time listening are now globally handled in AdminLayout.tsx 
    // to ensure they work even when the admin is on the Products or Dashboard pages.

    // Advanced Filters State
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [deliveryFilter, setDeliveryFilter] = useState('all');

    useEffect(() => {
        // Initial fetch
        fetchOrders();
        // Global realtime listener lives in AdminLayout.tsx!
    }, [fetchOrders]);

    // Update dates when preset changes
    useEffect(() => {
        const now = new Date();
        switch (dateRange) {
            case 'today':
                setStartDate(format(now, 'yyyy-MM-dd'));
                setEndDate(format(now, 'yyyy-MM-dd'));
                break;
            case 'week':
                setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')); // Monday start
                setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                break;
            case 'month':
                setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
                break;
            case 'year':
                setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
                setEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
                break;
        }
    }, [dateRange]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            // 1. Status Filter
            let matchesStatus = true;
            if (filter !== 'all') {
                if (filter === 'online') matchesStatus = o.type === 'online';
                else if (filter === 'pdv') matchesStatus = o.type === 'pdv';
                else matchesStatus = o.status === filter;
            }
            if (!matchesStatus) return false;

            // 2. Date Filter
            const orderDate = new Date(o.created_at);
            const start = startOfDay(parseISO(startDate));
            const end = endOfDay(parseISO(endDate));
            // Simple check if dates are valid
            if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
                if (!isWithinInterval(orderDate, { start, end })) return false;
            }

            // 3. Payment Method Filter
            if (paymentFilter !== 'all' && o.payment_method !== paymentFilter) return false;

            // 4. Delivery Method Filter
            if (deliveryFilter !== 'all' && o.delivery_method !== deliveryFilter) return false;

            // 5. Customer Search
            if (customerSearch) {
                const search = customerSearch.toLowerCase();
                const customerName = o.customer?.name?.toLowerCase() || '';
                if (!customerName.includes(search)) return false;
            }

            // 6. Product Search
            if (productSearch) {
                const search = productSearch.toLowerCase();
                const hasProduct = o.items.some(item =>
                    item.product?.name?.toLowerCase().includes(search)
                );
                if (!hasProduct) return false;
            }

            return true;
        });
    }, [orders, filter, startDate, endDate, paymentFilter, deliveryFilter, customerSearch, productSearch]);

    return (
        <div className="p-4 lg:p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
                    <p className="text-sm text-gray-500">
                        Gerencie pedidos digitais e do PDV
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FileSpreadsheet size={16} className="text-green-600" />}
                        onClick={() => {
                            const label = dateRange === 'custom'
                                ? `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`
                                : dateRange === 'today' ? 'Hoje'
                                    : dateRange === 'week' ? 'Esta Semana'
                                        : dateRange === 'month' ? 'Este Mês'
                                            : 'Este Ano';
                            exportToExcel(filteredOrders, label);
                        }}
                        disabled={filteredOrders.length === 0}
                        className="hidden sm:flex"
                    >
                        Excel
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FileText size={16} className="text-red-500" />}
                        onClick={() => {
                            const label = dateRange === 'custom'
                                ? `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`
                                : dateRange === 'today' ? 'Hoje'
                                    : dateRange === 'week' ? 'Esta Semana'
                                        : dateRange === 'month' ? 'Este Mês'
                                            : 'Este Ano';
                            exportToPDF(filteredOrders, label);
                        }}
                        disabled={filteredOrders.length === 0}
                        className="hidden sm:flex"
                    >
                        PDF
                    </Button>
                    {/* Mobile Menu for Exports could be added here if needed, but keeping it simple for now */}

                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw size={16} />}
                        onClick={() => fetchOrders()}
                    >
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {[
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: '⏳ Pendentes' },
                    { value: 'online', label: '🌐 Online' },
                    { value: 'pdv', label: '🏪 PDV' },
                    { value: 'completed', label: '✅ Concluídos' },
                    { value: 'cancelled', label: '🚫 Cancelados' },
                ].map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                            filter === f.value
                                ? 'bg-brand-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Advanced Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Filter size={16} />
                    Filtros Avançados
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Periodo */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Período</label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-500 outline-none"
                        >
                            <option value="today">Hoje</option>
                            <option value="week">Esta Semana</option>
                            <option value="month">Este Mês</option>
                            <option value="year">Este Ano</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    {/* Custom Dates */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">De</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDateRange('custom');
                                }}
                                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Até</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateRange('custom');
                                }}
                                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-50">
                    {/* Cliente */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Cliente</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Nome do cliente..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 pl-8 pr-8 py-2 text-sm focus:border-brand-500 outline-none"
                            />
                            {customerSearch && (
                                <button
                                    onClick={() => setCustomerSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Produto */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Produto</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Nome do produto..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 pl-8 pr-8 py-2 text-sm focus:border-brand-500 outline-none"
                            />
                            {productSearch && (
                                <button
                                    onClick={() => setProductSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Forma Pagamento */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Pagamento</label>
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-500 outline-none"
                        >
                            <option value="all">Todas</option>
                            <option value="pix">Pix</option>
                            <option value="credit">Crédito</option>
                            <option value="debit">Débito</option>
                            <option value="cash">Dinheiro</option>
                            <option value="pay_later">Pagará Depois</option>
                        </select>
                    </div>

                    {/* Entrega */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Entrega</label>
                        <select
                            value={deliveryFilter}
                            onChange={(e) => setDeliveryFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-500 outline-none"
                        >
                            <option value="all">Todas</option>
                            <option value="delivery">Delivery</option>
                            <option value="pickup">Retirada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {
                isLoading && orders.length === 0 && (
                    <div className="flex items-center justify-center py-16">
                        <Spinner />
                    </div>
                )
            }

            {/* Orders list */}
            <div className="space-y-3">
                {filteredOrders.map((order) => (
                    <div
                        key={order.id}
                        className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden animate-fade-in"
                    >
                        {/* Order header */}
                        <button
                            onClick={() =>
                                setExpandedId(expandedId === order.id ? null : order.id)
                            }
                            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl',
                                    order.status === 'pending'
                                        ? 'bg-amber-100 text-amber-600'
                                        : order.status === 'accepted'
                                            ? 'bg-blue-100 text-blue-600'
                                            : order.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : order.status === 'cancelled'
                                                    ? 'bg-gray-200 text-gray-500'
                                                    : 'bg-red-100 text-red-600'
                                )}
                            >
                                {order.status === 'pending' ? (
                                    <Clock size={20} />
                                ) : order.status === 'accepted' ? (
                                    <CheckCircle2 size={20} />
                                ) : order.status === 'completed' ? (
                                    <CheckCircle2 size={20} />
                                ) : order.status === 'cancelled' ? (
                                    <Ban size={20} />
                                ) : (
                                    <XCircle size={20} />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900">
                                        #{order.id.slice(-4).toUpperCase()}
                                    </span>
                                    <StatusBadge status={order.status} />
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                        {order.type === 'online' ? '🌐 Online' : '🏪 PDV'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {format(
                                        new Date(order.created_at),
                                        "dd/MM/yyyy 'às' HH:mm",
                                        { locale: ptBR }
                                    )}{' '}
                                    · {order.items.length} itens
                                </p>
                            </div>

                            <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(order.total_amount)}
                            </span>

                            {expandedId === order.id ? (
                                <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={20} className="text-gray-400" />
                            )}
                        </button>

                        {/* Expanded details */}
                        {expandedId === order.id && (
                            <div className="px-4 pb-4 border-t border-gray-100 animate-fade-in">
                                {/* Order Details Info Block */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3 mt-3">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Cliente
                                        </p>
                                        {order.customer ? (
                                            <div>
                                                <p className="font-medium text-gray-900">{order.customer.name}</p>
                                                {order.customer.phone && <p className="text-xs">{order.customer.phone}</p>}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 italic">Não identificado</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Entrega & Pagamento
                                        </p>
                                        <div className="space-y-1">
                                            <p>
                                                <span className="font-medium text-gray-900">
                                                    {order.delivery_method === 'pickup' ? '🏪 Retirada' : '🚚 Entrega'}
                                                </span>
                                            </p>
                                            {order.delivery_method === 'delivery' && order.delivery_address && (
                                                <p className="text-xs border-l-2 border-gray-300 pl-2 ml-0.5">
                                                    {order.delivery_address}
                                                </p>
                                            )}
                                            <p className="pt-1">
                                                Pagamento: <span className="font-medium text-gray-900 capitalize">{order.payment_method === 'credit' ? 'Crédito' : order.payment_method === 'debit' ? 'Débito' : order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method === 'pay_later' ? 'Pagará Depois' : 'Pix'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="py-2 space-y-2">
                                    {order.items.length > 0 ? (
                                        order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <ShoppingBag size={14} className="text-gray-400" />
                                                <span className="flex-1 text-gray-700">
                                                    {item.quantity}x{' '}
                                                    {item.product?.name || `Produto`}
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(item.unit_price * item.quantity)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">
                                            Nenhum item registrado para este pedido.
                                        </p>
                                    )}
                                </div>

                                {order.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm text-red-600 pb-1">
                                        <span>Desconto</span>
                                        <span>- {formatCurrency(order.discount_amount)}</span>
                                    </div>
                                )}
                                {order.surcharge_amount > 0 && (
                                    <div className="flex justify-between text-sm text-amber-600 pb-1">
                                        <span>Acréscimo</span>
                                        <span>+ {formatCurrency(order.surcharge_amount)}</span>
                                    </div>
                                )}

                                {order.status === 'pending' && order.type === 'online' && (
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <Button
                                            size="sm"
                                            onClick={() => updateStatus(order.id, 'accepted')}
                                            leftIcon={<CheckCircle2 size={16} />}
                                        >
                                            Aceitar
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => updateStatus(order.id, 'rejected')}
                                            leftIcon={<XCircle size={16} />}
                                        >
                                            Rejeitar
                                        </Button>
                                    </div>
                                )}

                                {order.status === 'accepted' && (
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <Button
                                            size="sm"
                                            onClick={() => updateStatus(order.id, 'completed')}
                                            leftIcon={<CheckCircle2 size={16} />}
                                        >
                                            Marcar como Concluído
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setCancelConfirmId(order.id)}
                                            leftIcon={<Ban size={16} />}
                                        >
                                            Cancelar Pedido
                                        </Button>
                                    </div>
                                )}

                                {order.status === 'completed' && (
                                    <div className="pt-3 border-t border-gray-100 space-y-3">
                                        {editingOrderId === order.id ? (
                                            <div className="space-y-3 bg-gray-50 rounded-xl p-3">
                                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Editar Pedido</p>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Forma de Pagamento</label>
                                                    <select
                                                        value={editPayment}
                                                        onChange={e => setEditPayment(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                                    >
                                                        <option value="pix">Pix</option>
                                                        <option value="cash">Dinheiro</option>
                                                        <option value="debit">Débito</option>
                                                        <option value="credit">Crédito</option>
                                                        <option value="pay_later">Pagará Depois</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                                                    <select
                                                        value={editStatus}
                                                        onChange={e => setEditStatus(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                                    >
                                                        <option value="completed">Concluído</option>
                                                        <option value="accepted">Aceito</option>
                                                        <option value="pending">Pendente</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Observações</label>
                                                    <textarea
                                                        value={editNotes}
                                                        onChange={e => setEditNotes(e.target.value)}
                                                        rows={2}
                                                        placeholder="Observação opcional..."
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setEditingOrderId(null)} disabled={isSavingEdit}>
                                                        Cancelar
                                                    </Button>
                                                    <Button size="sm" onClick={saveEdit} disabled={isSavingEdit} leftIcon={<Save size={14} />}>
                                                        {isSavingEdit ? 'Salvando...' : 'Salvar'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEdit(order)}
                                                    leftIcon={<Pencil size={14} />}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => setCancelConfirmId(order.id)}
                                                    leftIcon={<Ban size={16} />}
                                                >
                                                    Cancelar Pedido
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {!isLoading && filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <ShoppingBag size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Nenhum pedido encontrado</p>
                    </div>
                )}
            </div>

            {/* Cancel Confirmation Modal */}
            {cancelConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={() => !isCancelling && setCancelConfirmId(null)}>
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                <Ban size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Cancelar Pedido</h3>
                                <p className="text-sm text-gray-500">
                                    #{cancelConfirmId.slice(-4).toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                            <p className="text-sm text-amber-800">
                                <strong>Atenção:</strong> Ao cancelar este pedido, o estoque dos produtos será restaurado e o registro financeiro será atualizado.
                            </p>
                        </div>

                        <p className="text-sm text-gray-600 mb-6">
                            Tem certeza que deseja cancelar este pedido? Esta ação não poderá ser desfeita.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelConfirmId(null)}
                                disabled={isCancelling}
                            >
                                Voltar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                disabled={isCancelling}
                                leftIcon={isCancelling ? <RefreshCw size={16} className="animate-spin" /> : <Ban size={16} />}
                                onClick={async () => {
                                    setIsCancelling(true);
                                    try {
                                        await cancelOrder(cancelConfirmId);
                                    } finally {
                                        setIsCancelling(false);
                                        setCancelConfirmId(null);
                                    }
                                }}
                            >
                                {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
