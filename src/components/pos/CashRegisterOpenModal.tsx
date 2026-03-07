import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils'; // Assuming this exists

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CashRegisterOpenModal({ isOpen, onClose, onSuccess }: Props) {
    const { user } = useAuthStore();
    const openRegister = useCashRegisterStore((s) => s.openRegister);

    const [openingBalance, setOpeningBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOpen = async () => {
        if (!user?.email) return;

        setIsLoading(true);
        setError('');

        try {
            const balance = parseFloat(openingBalance.replace(',', '.')) || 0;
            const success = await openRegister(balance, user.email); // Using email as username/identifier

            if (success) {
                onSuccess();
                onClose();
                setOpeningBalance('');
            } else {
                setError('Erro ao abrir o caixa. Tente novamente.');
            }
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Abrir Caixa">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Informe o valor inicial em dinheiro na gaveta para iniciar as operações de venda.
                </p>

                <Input
                    label="Fundo de Caixa (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    autoFocus
                />

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleOpen} isLoading={isLoading}>
                        Abrir Caixa
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
