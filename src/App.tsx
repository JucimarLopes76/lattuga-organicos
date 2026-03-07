import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

// Layouts
import { AdminLayout } from '@/layouts/AdminLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

// Pages
import Login from '@/pages/Login';
import Catalog from '@/pages/catalog/Catalog';
import Cart from '@/pages/catalog/Cart';
import Checkout from '@/pages/catalog/Checkout';
import POS from '@/pages/admin/POS';
import Orders from '@/pages/admin/Orders';
import Products from '@/pages/admin/Products';
import Customers from '@/pages/admin/Customers';
import Analytics from '@/pages/admin/Analytics';
import Finance from '@/pages/admin/Finance';

export default function App() {
    const initialize = useAuthStore((s) => s.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <BrowserRouter>
            <PWAInstallPrompt />
            <Routes>
                {/* Public routes */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Catalog />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                </Route>

                {/* Login */}
                <Route path="/login" element={<Login />} />

                {/* Admin routes — ProtectedRoute guards, AdminLayout provides sidebar */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin" element={<Navigate to="/admin/pos" replace />} />
                        <Route path="/admin/pos" element={<POS />} />
                        <Route path="/admin/orders" element={<Orders />} />
                        <Route path="/admin/products" element={<Products />} />
                        <Route path="/admin/customers" element={<Customers />} />
                        <Route path="/admin/finance" element={<Finance />} />
                        <Route path="/admin/analytics" element={<Analytics />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
