
import { X, Receipt, Calendar, User, DollarSign, Package } from 'lucide-react';
import type { FinancialTransaction, Order, Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: FinancialTransaction | null;
}

export function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
    if (!isOpen || !transaction) return null;

    const isRevenue = transaction.type === 'revenue';
    const order = isRevenue ? (transaction.original as Order) : null;
    const expense = !isRevenue ? (transaction.original as Expense) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 ${isRevenue ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isRevenue ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                            {isRevenue ? <Receipt size={24} /> : <DollarSign size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                {isRevenue ? 'Detalhes do Pedido' : 'Detalhes da Despesa'}
                            </h2>
                            <p className="text-sm text-gray-500">{transaction.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Common Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Data</p>
                            <p className="font-medium text-gray-900">
                                {format(parseISO(transaction.date), 'dd/MM/yyyy HH:mm')}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Categoria</p>
                            <p className="font-medium text-gray-900">{transaction.category}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${transaction.status === 'completed' || transaction.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                                }`}>
                                {transaction.status === 'completed' ? 'Concluído' :
                                    transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Valor</p>
                            <p className={`font-bold ${isRevenue ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(transaction.amount)}
                            </p>
                        </div>
                    </div>

                    {/* Order Specifics */}
                    {isRevenue && order && (
                        <div className="space-y-4">
                            {/* Customer */}
                            {order.customer && (
                                <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl">
                                    <User className="text-gray-400 mt-1" size={20} />
                                    <div>
                                        <p className="font-bold text-gray-900">{order.customer.name}</p>
                                        <p className="text-sm text-gray-500">{order.customer.phone || 'Sem telefone'}</p>
                                        <p className="text-sm text-gray-500">{order.delivery_address || 'Retirada na loja'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Items */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Package size={18} /> Itens do Pedido
                                </h3>
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Produto</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Qtd</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Preço</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {order.items?.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-gray-900">{item.product?.name || 'Produto removido'}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                        {formatCurrency(item.quantity * item.unit_price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right text-gray-900">Total</td>
                                                <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(order.total_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expense Specifics */}
                    {!isRevenue && expense && (
                        <div className="space-y-4">
                            <div className="p-4 border border-gray-100 rounded-xl space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Fornecedor</p>
                                        <p className="font-medium text-gray-900">{expense.supplier || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Método de Pagamento</p>
                                        <p className="font-medium text-gray-900">{expense.payment_method || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Data de Vencimento</p>
                                        <p className="font-medium text-gray-900">{format(parseISO(expense.due_date), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Data de Pagamento</p>
                                        <p className="font-medium text-gray-900">
                                            {expense.payment_date ? format(parseISO(expense.payment_date), 'dd/MM/yyyy') : '-'}
                                        </p>
                                    </div>
                                </div>
                                {expense.proof_url && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-sm text-gray-500 mb-1">Comprovante</p>
                                        <a
                                            href={expense.proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-600 hover:underline break-all"
                                        >
                                            {expense.proof_url}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
