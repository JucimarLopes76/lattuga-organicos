import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Package,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { useOrdersStore } from '@/stores/ordersStore';
import { useProductsStore } from '@/stores/productsStore';

type Period = 'day' | 'week' | 'month';

const PAYMENT_COLORS: Record<string, string> = {
    pix: '#059669',
    credit: '#0ea5e9',
    debit: '#f59e0b',
    cash: '#8b5cf6',
};

const PAYMENT_LABELS: Record<string, string> = {
    pix: 'Pix',
    credit: 'Crédito',
    debit: 'Débito',
    cash: 'Dinheiro',
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Analytics() {
    const [period, setPeriod] = useState<Period>('day');
    const { orders, isLoading: ordersLoading, fetchOrders } = useOrdersStore();
    const { products, isLoading: productsLoading, fetchProducts } = useProductsStore();

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, [fetchOrders, fetchProducts]);

    const isLoading = ordersLoading || productsLoading;

    // ---- Computed stats ----
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        const todayOrders = orders.filter(
            (o) => o.created_at?.slice(0, 10) === todayStr && o.status !== 'rejected'
        );
        const todaySales = todayOrders.reduce((s, o) => s + o.total_amount, 0);
        const todayCount = todayOrders.length;
        const avgTicket = todayCount > 0 ? todaySales / todayCount : 0;
        const activeProducts = products.filter((p) => p.is_active).length;

        return [
            {
                label: 'Vendas Hoje',
                value: formatCurrency(todaySales),
                icon: DollarSign,
                color: 'bg-emerald-100 text-emerald-600',
            },
            {
                label: 'Pedidos Hoje',
                value: String(todayCount),
                icon: ShoppingCart,
                color: 'bg-blue-100 text-blue-600',
            },
            {
                label: 'Ticket Médio',
                value: formatCurrency(avgTicket),
                icon: TrendingUp,
                color: 'bg-amber-100 text-amber-600',
            },
            {
                label: 'Produtos Ativos',
                value: String(activeProducts),
                icon: Package,
                color: 'bg-purple-100 text-purple-600',
            },
        ];
    }, [orders, products]);

    // ---- Sales chart data ----
    const salesData = useMemo(() => {
        const validOrders = orders.filter((o) => o.status !== 'rejected');
        const now = new Date();

        // Daily: last 7 days
        const daily: { name: string; amount: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayOrders = validOrders.filter((o) => o.created_at?.slice(0, 10) === dateStr);
            const amount = dayOrders.reduce((s, o) => s + o.total_amount, 0);
            daily.push({ name: DAY_NAMES[d.getDay()], amount });
        }

        // Weekly: last 4 weeks
        const weekly: { name: string; amount: number }[] = [];
        for (let w = 3; w >= 0; w--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - w * 7);

            const weekOrders = validOrders.filter((o) => {
                const d = new Date(o.created_at);
                return d >= weekStart && d < weekEnd;
            });
            const amount = weekOrders.reduce((s, o) => s + o.total_amount, 0);
            weekly.push({ name: `Sem ${4 - w}`, amount });
        }

        // Monthly: last 5 months
        const monthly: { name: string; amount: number }[] = [];
        for (let m = 4; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthOrders = validOrders.filter(
                (o) => o.created_at?.slice(0, 7) === monthStr
            );
            const amount = monthOrders.reduce((s, o) => s + o.total_amount, 0);
            monthly.push({ name: MONTH_NAMES[d.getMonth()], amount });
        }

        return { day: daily, week: weekly, month: monthly };
    }, [orders]);

    // ---- Top products ----
    const topProducts = useMemo(() => {
        const productMap = new Map<string, { name: string; quantity: number }>();

        for (const order of orders) {
            if (order.status === 'rejected') continue;
            for (const item of order.items || []) {
                const name = item.product?.name || 'Produto desconhecido';
                const existing = productMap.get(item.product_id) || { name, quantity: 0 };
                existing.quantity += item.quantity;
                productMap.set(item.product_id, existing);
            }
        }

        return Array.from(productMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [orders]);

    // ---- Payment mix ----
    const paymentMix = useMemo(() => {
        const counts: Record<string, number> = {};
        const validOrders = orders.filter((o) => o.status !== 'rejected');

        for (const order of validOrders) {
            const method = order.payment_method || 'pix';
            counts[method] = (counts[method] || 0) + 1;
        }

        const total = validOrders.length || 1;

        return Object.entries(counts).map(([key, count]) => ({
            name: PAYMENT_LABELS[key] || key,
            value: Math.round((count / total) * 100),
            color: PAYMENT_COLORS[key] || '#94a3b8',
        }));
    }, [orders]);

    if (isLoading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
                <p className="text-sm text-gray-500">
                    Visão geral do desempenho da loja
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 animate-fade-in"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl',
                                    stat.color
                                )}
                            >
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Sales Chart */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Vendas</h2>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                        {(
                            [
                                { value: 'day', label: 'Dia' },
                                { value: 'week', label: 'Semana' },
                                { value: 'month', label: 'Mês' },
                            ] as { value: Period; label: string }[]
                        ).map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                                    period === p.value
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-72">
                    {salesData[period].some((d) => d.amount > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData[period]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(v) => `R$${v}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [
                                        formatCurrency(value),
                                        'Vendas',
                                    ]}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    }}
                                />
                                <Bar
                                    dataKey="amount"
                                    fill="#059669"
                                    radius={[8, 8, 0, 0]}
                                    maxBarSize={60}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <p className="text-sm">Nenhuma venda neste período</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Top Produtos
                    </h2>
                    <div className="h-64">
                        {topProducts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fontSize: 11 }}
                                        width={100}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [
                                            `${value} unidades`,
                                            'Vendas',
                                        ]}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                        }}
                                    />
                                    <Bar
                                        dataKey="quantity"
                                        fill="#10b981"
                                        radius={[0, 8, 8, 0]}
                                        maxBarSize={30}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p className="text-sm">Sem dados de vendas ainda</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Mix */}
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Formas de Pagamento
                    </h2>
                    <div className="h-64">
                        {paymentMix.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentMix}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {paymentMix.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`${value}%`, '']}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value: string) => (
                                            <span className="text-sm text-gray-700">{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p className="text-sm">Sem dados de pagamento ainda</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
