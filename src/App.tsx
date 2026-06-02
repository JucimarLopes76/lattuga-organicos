import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';

// Layouts - imported statically as they are needed immediately
import { AdminLayout } from '@/layouts/AdminLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

// Pages - lazy loaded to enable code splitting
const Login = lazy(() => import('@/pages/Login'));
const Catalog = lazy(() => import('@/pages/catalog/Catalog'));
const Offers = lazy(() => import('@/pages/catalog/Offers'));
const Cart = lazy(() => import('@/pages/catalog/Cart'));
const Checkout = lazy(() => import('@/pages/catalog/Checkout'));
const POS = lazy(() => import('@/pages/admin/POS'));
const Orders = lazy(() => import('@/pages/admin/Orders'));
const Products = lazy(() => import('@/pages/admin/Products'));
const Customers = lazy(() => import('@/pages/admin/Customers'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const Finance = lazy(() => import('@/pages/admin/Finance'));
const DeliveryZones = lazy(() => import('@/pages/admin/DeliveryZones'));

// Fallback spinner while loading a code chunk
const PageLoadingFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Spinner />
    </div>
);

export default function App() {
    const initialize = useAuthStore((s) => s.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <BrowserRouter>
            <PWAInstallPrompt />
            <VercelAnalytics />
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    {/* Public routes */}
                    <Route element={<PublicLayout />}>
                        <Route path="/" element={<Catalog />} />
                        <Route path="/ofertas" element={<Offers />} />
                        <Route path="/ofertas/:category" element={<Offers />} />
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
                            <Route path="/admin/delivery-zones" element={<DeliveryZones />} />
                            <Route path="/admin/analytics" element={<Analytics />} />
                        </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
