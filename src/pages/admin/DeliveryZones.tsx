import { useState, useEffect } from 'react';
import { useDeliveryZonesStore } from '@/stores/deliveryZonesStore';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import type { DeliveryZone } from '@/types';

export default function DeliveryZones() {
    const { zones, isLoading, fetchZones, createZone, updateZone, deleteZone } = useDeliveryZonesStore();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formCity, setFormCity] = useState('Santos');
    const [formNeighborhood, setFormNeighborhood] = useState('');
    const [formFee, setFormFee] = useState('');

    useEffect(() => {
        fetchZones();
    }, [fetchZones]);

    const handleCreate = async () => {
        if (!formCity || !formNeighborhood || !formFee) return;
        await createZone({
            city: formCity,
            neighborhood: formNeighborhood,
            fee: parseFloat(formFee.replace(',', '.')),
            active: true
        });
        setIsCreating(false);
        setFormNeighborhood('');
        setFormFee('');
    };

    const handleUpdate = async (id: string) => {
        if (!formCity || !formNeighborhood || !formFee) return;
        await updateZone(id, {
            city: formCity,
            neighborhood: formNeighborhood,
            fee: parseFloat(formFee.replace(',', '.'))
        });
        setEditingId(null);
    };

    const toggleActive = async (zone: DeliveryZone) => {
        await updateZone(zone.id, { active: !zone.active });
    };

    const startEdit = (zone: DeliveryZone) => {
        setEditingId(zone.id);
        setFormCity(zone.city);
        setFormNeighborhood(zone.neighborhood);
        setFormFee(zone.fee.toString());
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Zonas de Entrega</h1>
                    <p className="text-sm text-gray-500">Configure os valores de frete por bairro.</p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={20} />}>
                        Nova Zona
                    </Button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-gray-900">Cadastrar Nova Zona de Entrega</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Cidade"
                            value={formCity}
                            onChange={(e) => setFormCity(e.target.value)}
                            placeholder="Ex: Santos"
                        />
                        <Input
                            label="Bairro"
                            value={formNeighborhood}
                            onChange={(e) => setFormNeighborhood(e.target.value)}
                            placeholder="Ex: Gonzaga"
                        />
                        <Input
                            label="Valor do Frete (R$)"
                            type="number"
                            step="0.01"
                            value={formFee}
                            onChange={(e) => setFormFee(e.target.value)}
                            placeholder="Ex: 15.00"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                        <Button onClick={handleCreate}>Salvar</Button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Cidade</th>
                                <th className="px-6 py-4 font-medium">Bairro</th>
                                <th className="px-6 py-4 font-medium">Frete</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : zones.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 flex flex-col items-center justify-center">
                                        <MapPin size={48} className="text-gray-300 mb-2" />
                                        <p>Nenhuma zona cadastrada.</p>
                                    </td>
                                </tr>
                            ) : (
                                zones.map((zone) => (
                                    <tr key={zone.id} className="hover:bg-gray-50/50 transition-colors">
                                        {editingId === zone.id ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Input value={formNeighborhood} onChange={(e) => setFormNeighborhood(e.target.value)} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Input type="number" step="0.01" value={formFee} onChange={(e) => setFormFee(e.target.value)} />
                                                </td>
                                                <td className="px-6 py-4"></td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                                                    <Button size="sm" onClick={() => handleUpdate(zone.id)}>Salvar</Button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-medium text-gray-900">{zone.city}</td>
                                                <td className="px-6 py-4 text-gray-600">{zone.neighborhood}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(zone.fee)}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleActive(zone)}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold max-w-fit transition-colors ${zone.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                    >
                                                        {zone.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                        {zone.active ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(zone)}
                                                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Excluir esta zona?')) deleteZone(zone.id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
