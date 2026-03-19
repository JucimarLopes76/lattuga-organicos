import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOnlineCartStore } from '@/stores/onlineCartStore';
import { useOnlineSessionStore } from '@/stores/onlineSessionStore';
import { cn } from '@/lib/utils';
import logoImg from '@/imagens/logo_lattuga_organicos-removebg-preview.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function PublicLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const itemCount = useOnlineCartStore((s) => s.getItemCount());
    const location = useLocation();

    // Session / Identification
    const { isIdentified, identify } = useOnlineSessionStore();
    const [showIdModal, setShowIdModal] = useState(false);
    const [tempName, setTempName] = useState('');
    const [tempPhone, setTempPhone] = useState('');

    // Show modal if not identified (only once per session/visit if needed, but here we check state)
    // We'll use a local effect to trigger it once if not identified
    useEffect(() => {
        if (!isIdentified) {
            const timer = setTimeout(() => setShowIdModal(true), 1000); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, [isIdentified]);

    const handleIdentify = () => {
        if (tempName && tempPhone) {
            identify(tempName, tempPhone);
            setShowIdModal(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-warm-white">
            {/* Identification Modal */}
            {showIdModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        {/* Decorative background circle */}
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-brand-100 opacity-50" />

                        <div className="relative z-10 text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 mb-2">
                                <img src={logoImg} alt="Lattuga" className="h-10 w-10 object-contain" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo(a)!</h2>
                            <p className="text-gray-500">
                                Para uma melhor experiência, por favor identifique-se.
                            </p>

                            <div className="space-y-3 text-left">
                                <Input
                                    label="Seu Nome"
                                    placeholder="Ex: Maria Silva"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    autoFocus
                                />
                                <Input
                                    label="Seu WhatsApp"
                                    placeholder="Ex: 11999999999"
                                    value={tempPhone}
                                    onChange={(e) => setTempPhone(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <Button
                                    onClick={handleIdentify}
                                    className="w-full"
                                    size="lg"
                                    disabled={!tempName || !tempPhone}
                                >
                                    Continuar
                                </Button>
                                <button
                                    onClick={() => setShowIdModal(false)}
                                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                >
                                    Pular por enquanto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <header className="relative z-30 bg-white border-b border-gray-100">
                <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
                    {/* Logo */}
                    <Link to="/" className="flex items-center group">
                        <div className="flex items-center justify-center overflow-hidden bg-brand-800 rounded-xl md:rounded-2xl">
                            <img src={logoImg} alt="Lattuga" className="h-[80px] w-[80px] md:h-[200px] md:w-[200px] object-contain scale-150" />
                        </div>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link
                            to="/"
                            className={cn(
                                'text-sm font-medium transition-colors',
                                location.pathname === '/' ? 'text-brand-600' : 'text-gray-600 hover:text-brand-600'
                            )}
                        >
                            Catálogo
                        </Link>
                        <Link
                            to="/ofertas"
                            className={cn(
                                'flex items-center gap-1 text-sm font-bold transition-colors',
                                location.pathname.startsWith('/ofertas') ? 'text-red-600' : 'text-red-500 hover:text-red-600'
                            )}
                        >
                            🏷️ Ofertas
                        </Link>
                        <Link
                            to="/cart"
                            className="relative flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
                        >
                            <ShoppingBag size={20} />
                            Carrinho
                            {itemCount > 0 && (
                                <span className="absolute -top-2 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
                    </nav>

                    {/* Mobile buttons */}
                    <div className="flex items-center gap-2 md:hidden">
                        <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                            <ShoppingBag size={22} className="text-gray-700" />
                            {itemCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            {menuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden px-4 pb-4 animate-fade-in">
                        <nav className="flex flex-col gap-1 rounded-xl bg-gray-50 p-2">
                            <Link
                                to="/"
                                onClick={() => setMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                            >
                                Catálogo
                            </Link>
                            <Link
                                to="/ofertas"
                                onClick={() => setMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-white transition-colors flex items-center gap-2"
                            >
                                🏷️ Ofertas da Semana
                            </Link>
                            <Link
                                to="/cart"
                                onClick={() => setMenuOpen(false)}
                                className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                            >
                                Carrinho ({itemCount})
                            </Link>
                        </nav>
                    </div>
                )}
            </header>

            {/* Page content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-brand-800 text-brand-200 py-8 mt-auto">
                <div className="mx-auto max-w-6xl px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <img src={logoImg} alt="Lattuga" className="h-[60px] w-[60px] object-contain scale-150" />
                    </div>
                    <p className="text-sm">Produtos orgânicos frescos e saudáveis</p>
                    <p className="text-xs mt-2 text-brand-400">
                        © {new Date().getFullYear()} Lattuga Orgânicos. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
