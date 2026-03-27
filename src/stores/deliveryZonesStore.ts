import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { DeliveryZone } from '@/types';

interface DeliveryZonesState {
    zones: DeliveryZone[];
    isLoading: boolean;
    error: string | null;
    fetchZones: () => Promise<void>;
    updateZone: (id: string, updates: Partial<DeliveryZone>) => Promise<void>;
    createZone: (zone: Omit<DeliveryZone, 'id' | 'created_at'>) => Promise<void>;
    deleteZone: (id: string) => Promise<void>;
}

export const useDeliveryZonesStore = create<DeliveryZonesState>((set, get) => ({
    zones: [],
    isLoading: false,
    error: null,

    fetchZones: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('delivery_zones')
                .select('*')
                .order('city')
                .order('neighborhood');

            if (error) {
                console.error('Supabase error fetching zones:', error);
                set({ zones: [], isLoading: false, error: error.message });
                return;
            }

            set({ zones: data as DeliveryZone[], isLoading: false });
        } catch (err: any) {
            console.error('Failed to fetch zones:', err);
            set({ zones: [], isLoading: false, error: err.message });
        }
    },

    updateZone: async (id, updates) => {
        set((state) => ({
            zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
        }));

        const { error } = await supabase
            .from('delivery_zones')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating zone:', error);
            get().fetchZones();
        }
    },

    createZone: async (zone) => {
        const { data, error } = await supabase
            .from('delivery_zones')
            .insert([zone])
            .select()
            .single();

        if (error) {
            console.error('Error creating zone:', error);
            return;
        }

        if (data) {
            set((state) => ({ zones: [...state.zones, data as DeliveryZone] }));
            get().fetchZones();
        }
    },

    deleteZone: async (id) => {
        set((state) => ({
            zones: state.zones.filter((z) => z.id !== id),
        }));

        const { error } = await supabase
            .from('delivery_zones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting zone:', error);
            get().fetchZones();
        }
    },
}));
