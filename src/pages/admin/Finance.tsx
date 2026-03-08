
import { useState, useEffect } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { AddExpenseModal } from '@/components/finance/AddExpenseModal';
import { TransactionDetailsModal } from '@/components/finance/TransactionDetailsModal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, cn } from '@/lib/utils';
import {
    TrendingUp, TrendingDown, Wallet, Calendar, Filter,
    Plus, Search, ArrowUpRight, ArrowDownLeft, Eye, Receipt, DollarSign
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { FinancialTransaction } from '@/types';

export default function Finance() {
    const {
        transactions,
        summary,
        isLoading,
        fetchTransactions
    } = useFinanceStore();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

    // Filters
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()).toISOString().split('T')[0],
        end: endOfMonth(new Date()).toISOString().split('T')[0]
    });
    const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTransactions(new Date(dateRange.start), new Date(dateRange.end));
    }, [fetchTransactions, dateRange.start, dateRange.end]);

    // Derived state for filtering
    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const categories = Array.from(new Set(transactions.map(t => t.category))).sort();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
                    <p className="text-gray-500">Gestão de Receitas e Despesas</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} className="mr-2" /> Nova Despesa
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Receitas</p>
                        <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Despesas</p>
                        <h3 className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</h3>
                    </div>
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <TrendingDown size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Saldo</p>
                        <h3 className={cn("text-2xl font-bold", summary.balance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(summary.balance)}
                        </h3>
                    </div>
                    <div className={cn("p-3 rounded-xl", summary.balance >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                        <Wallet size={24} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Calendar size={18} className="text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent text-sm focus:outline-none w-32"
                        />
                        <span className="text-gray-400">até</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent text-sm focus:outline-none w-32"
                        />
                    </div>

                    {/* Type Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['all', 'revenue', 'expense'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                    filterType === type
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {type === 'all' ? 'Todas' : type === 'revenue' ? 'Receitas' : 'Despesas'}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                        <option value="Todas">Todas Categorias</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar descrição..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Data</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold">Categoria</th>
                                <th className="px-6 py-4 font-semibold">Descrição</th>
                                <th className="px-6 py-4 font-semibold">Valor</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Nenhuma transação encontrada no período.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {format(parseISO(t.date), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.type === 'revenue' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                    <ArrowDownLeft size={12} /> Receita
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                                                    <ArrowUpRight size={12} /> Despesa
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {t.category}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 max-w-[200px] truncate" title={t.description}>
                                            {t.description}
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 font-bold whitespace-nowrap table-cell-amount",
                                            t.type === 'revenue' ? "text-blue-600" : "text-red-600"
                                        )}>
                                            {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-xs font-bold",
                                                t.status === 'completed' || t.status === 'paid'
                                                    ? "bg-green-100 text-green-700"
                                                    : t.status === 'cancelled'
                                                        ? "bg-gray-200 text-gray-600"
                                                        : "bg-amber-100 text-amber-700"
                                            )}>
                                                {t.status === 'completed' ? 'Concluído' :
                                                    t.status === 'paid' ? 'Pago' :
                                                        t.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedTransaction(t)}
                                                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                                title="Visualizar Detalhes"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <TransactionDetailsModal
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
            />
        </div>
    );
}
