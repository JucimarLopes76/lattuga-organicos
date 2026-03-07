import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            return { error: error.message };
        }
        set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
        });
        return { error: null };
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAuthenticated: false });
    },

    initialize: async () => {
        set({ isLoading: true });
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            set({
                user: data.session.user,
                session: data.session,
                isAuthenticated: true,
            });
        }
        set({ isLoading: false });

        supabase.auth.onAuthStateChange((_event, session) => {
            set({
                user: session?.user ?? null,
                session,
                isAuthenticated: !!session,
            });
        });
    },
}));
