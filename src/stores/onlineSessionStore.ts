import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnlineSessionState {
    customer: {
        name: string;
        phone: string;
        email: string;
        address: string;
    };
    isIdentified: boolean;
    setCustomer: (data: Partial<OnlineSessionState['customer']>) => void;
    identify: (name: string, phone: string) => void;
    clearSession: () => void;
}

export const useOnlineSessionStore = create<OnlineSessionState>()(
    persist(
        (set) => ({
            customer: {
                name: '',
                phone: '',
                email: '',
                address: '',
            },
            isIdentified: false,

            setCustomer: (data) =>
                set((state) => ({
                    customer: { ...state.customer, ...data },
                })),

            identify: (name, phone) =>
                set((state) => ({
                    customer: { ...state.customer, name, phone },
                    isIdentified: true,
                })),

            clearSession: () =>
                set({
                    customer: { name: '', phone: '', email: '', address: '' },
                    isIdentified: false,
                }),
        }),
        {
            name: 'lattuga-session-storage',
            partialize: (state) => ({
                customer: {
                    name: state.customer.name,
                    phone: state.customer.phone,
                    // We persist email/address too to improve UX on return
                    email: state.customer.email,
                    address: state.customer.address,
                },
                isIdentified: state.isIdentified,
            }),
        }
    )
);
