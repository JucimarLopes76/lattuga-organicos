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
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
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

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const logout = useAuthStore((s) => s.logout);

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
                <div className="px-3 py-4 border-t border-brand-700">
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
                <header className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 lg:hidden">
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
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
