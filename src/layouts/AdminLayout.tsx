import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    BarChart3,
    LogOut,
    Menu,
    X,
    Wallet,
    BellRing,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import logoImg from '@/imagens/logo_lattuga_organicos-removebg-preview.png';

const navItems = [
    { to: '/admin/pos', icon: ShoppingCart, label: 'PDV' },
    { to: '/admin/orders', icon: LayoutDashboard, label: 'Pedidos' },
    { to: '/admin/products', icon: Package, label: 'Produtos' },
    { to: '/admin/finance', icon: Wallet, label: 'Financeiro' },
    { to: '/admin/customers', icon: Users, label: 'Clientes' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Análises' },
];

// VAPID Public key from the environment
const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
    const logout = useAuthStore((s) => s.logout);
    const user = useAuthStore((s) => s.user);

    // Dynamic Manifest Injection for Admin PWA
    useEffect(() => {
        const setManifest = (manifestPath: string) => {
            let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'manifest';
                document.head.appendChild(link);
            }
            link.href = manifestPath;
        };

        // Set admin manifest when entering admin area
        setManifest('/admin-manifest.json');

        // Cleanup: restore public manifest when unmounting
        return () => {
            setManifest('/manifest.webmanifest');
        };
    }, []);

    // Push Notification Setup
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushStatus('unsupported');
            return;
        }

        setPushStatus(Notification.permission);

        // Auto-subscribe if they already granted permission
        if (Notification.permission === 'granted') {
            subscribeToPush();
        }
    }, [user]);

    const subscribeToPush = async () => {
        if (!user || pushStatus === 'unsupported') return;

        try {
            const permission = await Notification.requestPermission();
            setPushStatus(permission);

            if (permission !== 'granted') return;

            const registration = await navigator.serviceWorker.ready;

            // MUDANÇA: Vamos tentar buscar a subscription
            let subscription = await registration.pushManager.getSubscription();
            
            // Se existir uma velha com a chave antiga, ou se VAPID foi re-gerado,
            // a FCM (Google) bloqueia o push. Por garantia, se houver erro ou para renovar,
            // podemos precisr dar `unsubscribe` nela. Mas o jeito ideal é:
            if (!subscription) {
                // Subscribe from scratch
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: PUBLIC_VAPID_KEY
                });
            }

            // Save to Supabase
            const subJson = subscription.toJSON();
            
            // Delete old subscriptions for this user if we want 1 device strictly?
            // Usually we allow multiple. We rely on the UNIQUE constraint in DB.
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert(
                    { user_id: user.id, subscription_json: subJson },
                    { onConflict: 'user_id, subscription_json' }
                );

            if (error) console.error('Failed to save push subscription:', error);
            else console.log('Push subscription active and saved.');

        } catch (error) {
            console.error('Error subscribing to push:', error);
        }
    };

    // FUNÇÃO DEBUG: Força a limpeza para consertar o Erro 403 (Chaves VAPID trocadas)
    const resetPushSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                console.log("Unregistered from FCM.");
            }
            // Clear DB for this user
            if (user) {
                await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
                console.log("Cleared from Supabase DB.");
            }
            alert("Memória do Push limpa! Por favor, recarregue a página e clique no Sininho para autorizar com a nova chave.");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Erro ao limpar a inscrição: " + err);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-800 text-white transition-transform duration-300 lg:static lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-center py-3 lg:py-5 border-b border-brand-700">
                    <div className="flex items-center justify-center overflow-hidden h-[120px] w-[120px] lg:h-[200px] lg:w-[200px]">
                        <img src={logoImg} alt="Lattuga" className="h-full w-full object-contain scale-150" />
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="ml-auto lg:hidden p-1 hover:bg-brand-700 rounded-lg cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20'
                                        : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                                )
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-4 border-t border-brand-700 space-y-2">
                    {/* Push Notification Toggle */}
                    {pushStatus !== 'unsupported' && (
                        <button
                            onClick={subscribeToPush}
                            disabled={pushStatus === 'granted' || pushStatus === 'denied'}
                            className={cn(
                                "flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                pushStatus === 'granted' ? "text-green-400 bg-brand-900/50 cursor-default" :
                                pushStatus === 'denied' ? "text-red-400 bg-brand-900/50 cursor-not-allowed" :
                                "text-brand-200 hover:bg-brand-700 hover:text-white cursor-pointer"
                            )}
                        >
                            <BellRing size={20} className={pushStatus === 'default' ? 'animate-pulse text-yellow-400' : ''} />
                            {pushStatus === 'granted' ? 'Notificações Ativas' : 
                             pushStatus === 'denied' ? 'Notificações Bloqueadas' : 'Ativar Notificações'}
                        </button>
                    )}
                    
                    {pushStatus === 'granted' && (
                        <button onClick={resetPushSubscription} className="w-full text-center text-xs text-brand-300 hover:text-white transition-colors cursor-pointer pb-2">
                           Problemas com alertas? Limpar cache
                        </button>
                    )}

                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-brand-200 hover:bg-brand-700 hover:text-white transition-all cursor-pointer"
                    >
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Mobile header */}
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 lg:hidden">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="flex items-center">
                            <div className="bg-brand-800 rounded-xl overflow-hidden">
                                <img src={logoImg} alt="Lattuga" className="h-[50px] w-[50px] object-contain scale-150" />
                            </div>
                        </div>
                    </div>
                    {/* Mobile Push Status */}
                    {pushStatus !== 'unsupported' && (
                        <button
                            onClick={subscribeToPush}
                            disabled={pushStatus === 'granted' || pushStatus === 'denied'}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                pushStatus === 'granted' ? "text-brand-600 bg-brand-50" :
                                pushStatus === 'denied' ? "text-red-500 bg-red-50" :
                                "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 cursor-pointer animate-pulse"
                            )}
                            title="Notificações"
                        >
                            <BellRing size={20} />
                        </button>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
