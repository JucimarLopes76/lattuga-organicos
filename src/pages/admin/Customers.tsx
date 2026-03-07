import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Users as UsersIcon, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useCustomersStore } from '@/stores/customersStore';
import type { Customer } from '@/types';

export default function Customers() {
    const { customers, isLoading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomersStore();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formAddress, setFormAddress] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const filtered = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(search.toLowerCase())
    );

    const resetForm = () => {
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormAddress('');
        setEditingCustomer(null);
    };

    const openCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (c: Customer) => {
        setEditingCustomer(c);
        setFormName(c.name);
        setFormPhone(c.phone || '');
        setFormEmail(c.email || '');
        setFormAddress(c.address || '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, {
                name: formName,
                phone: formPhone || null,
                email: formEmail || null,
                address: formAddress || null,
            });
        } else {
            await createCustomer({
                name: formName,
                phone: formPhone || null,
                email: formEmail || null,
                address: formAddress || null,
            });
        }
        resetForm();
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        await deleteCustomer(id);
        setConfirmDelete(null);
    };

    return (
        <div className="p-4 lg:p-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-sm text-gray-500">
                        {customers.length} clientes cadastrados
                    </p>
                </div>
                <Button onClick={openCreate} leftIcon={<Plus size={18} />}>
                    Novo Cliente
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Buscar por nome, telefone ou e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                />
            </div>

            {/* Loading */}
            {isLoading && customers.length === 0 && (
                <div className="flex items-center justify-center py-20">
                    <Spinner />
                </div>
            )}

            {/* Customer list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((c) => (
                    <div
                        key={c.id}
                        className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all animate-fade-in group"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-lg font-bold flex-shrink-0">
                                {c.name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 truncate">
                                    {c.name}
                                </p>
                            </div>
                            {/* Edit / Delete */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEdit(c)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition cursor-pointer"
                                    title="Editar"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(c.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            {c.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{c.phone}</span>
                                </div>
                            )}
                            {c.email && (
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{c.email}</span>
                                </div>
                            )}
                            {c.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{c.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <UsersIcon size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                </div>
            )}

            {/* Create / Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            >
                <div className="space-y-4">
                    <Input
                        label="Nome"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Nome completo"
                        required
                    />
                    <Input
                        label="Telefone"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        icon={<Phone size={16} />}
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        icon={<Mail size={16} />}
                    />
                    <Input
                        label="Endereço"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Rua, número, complemento, bairro, CEP"
                        icon={<MapPin size={16} />}
                    />
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} className="flex-1" disabled={!formName}>
                            {editingCustomer ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="Excluir Cliente"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => confirmDelete && handleDelete(confirmDelete)}
                            className="flex-1 !bg-red-600 hover:!bg-red-700"
                        >
                            Excluir
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
