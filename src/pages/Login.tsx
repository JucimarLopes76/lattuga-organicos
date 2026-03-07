import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import logoImg from '@/imagens/logo_lattuga_organicos-removebg-preview.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Demo bypass removed — enforcing real authentication
        /*
        if (email === 'admin@lattuga.com' && password === 'admin123') {
            useAuthStore.setState({
                isAuthenticated: true,
                isLoading: false,
                user: { id: 'demo', email: 'admin@lattuga.com' } as any,
            });
            navigate('/admin/pos');
            return;
        }
        */

        const result = await login(email, password);
        setLoading(false);
        if (result.error) {
            setError(result.error);
        } else {
            navigate('/admin/pos');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-4">
            <div className="w-full max-w-sm animate-scale-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex h-[140px] w-[140px] md:h-[200px] md:w-[200px] items-center justify-center mb-4 overflow-hidden">
                        <img src={logoImg} alt="Lattuga" className="h-full w-full object-contain scale-150" />
                    </div>
                    <p className="text-brand-300 text-sm mt-1">Painel Administrativo</p>
                </div>

                {/* Form card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Entrar</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Acesse o painel com suas credenciais
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="E-mail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@lattuga.com"
                            icon={<Mail size={18} />}
                            required
                        />
                        <Input
                            label="Senha"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            icon={<Lock size={18} />}
                            required
                        />

                        {error && (
                            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={loading}
                        >
                            Entrar
                        </Button>
                    </form>

                    {/* <p className="mt-4 text-center text-xs text-gray-400">
                        Demo: admin@lattuga.com / admin123
                    </p> */}
                </div>
            </div>
        </div>
    );
}
