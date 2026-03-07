import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    const now = Date.now();
    return now - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );
}

function isIOS(): boolean {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showIOSBanner, setShowIOSBanner] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (isStandalone() || isDismissed()) return;

        // iOS — show manual instructions
        if (isIOS()) {
            setShowIOSBanner(true);
            return;
        }

        // Android / Chrome — intercept beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Also listen for successful install
        window.addEventListener('appinstalled', () => {
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
        } finally {
            setInstalling(false);
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setShowBanner(false);
        setShowIOSBanner(false);
    }, []);

    // Android / Chrome banner
    if (showBanner) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    padding: '0 12px 12px',
                    animation: 'slideUp 0.4s ease-out',
                }}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 -2px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        maxWidth: '480px',
                        margin: '0 auto',
                    }}
                >
                    {/* Icon */}
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Download size={24} color="#fff" />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '15px',
                                lineHeight: '1.3',
                            }}
                        >
                            Instalar Lattuga
                        </div>
                        <div
                            style={{
                                color: 'rgba(255,255,255,0.8)',
                                fontSize: '13px',
                                lineHeight: '1.3',
                                marginTop: '2px',
                            }}
                        >
                            Acesse rápido direto da tela inicial
                        </div>
                    </div>

                    {/* Install button */}
                    <button
                        onClick={handleInstall}
                        disabled={installing}
                        style={{
                            background: '#fff',
                            color: '#059669',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            opacity: installing ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {installing ? 'Instalando…' : 'Instalar'}
                    </button>

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        aria-label="Fechar"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            opacity: 0.7,
                        }}
                    >
                        <X size={20} color="#fff" />
                    </button>
                </div>
            </div>
        );
    }

    // iOS banner — manual instructions
    if (showIOSBanner) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    padding: '0 12px 12px',
                    animation: 'slideUp 0.4s ease-out',
                }}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 -2px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        maxWidth: '480px',
                        margin: '0 auto',
                        position: 'relative',
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        aria-label="Fechar"
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            opacity: 0.7,
                        }}
                    >
                        <X size={20} color="#fff" />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Download size={24} color="#fff" />
                        </div>
                        <div>
                            <div
                                style={{
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    lineHeight: '1.3',
                                }}
                            >
                                Instalar Lattuga
                            </div>
                            <div
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '13px',
                                    lineHeight: '1.4',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                Toque em{' '}
                                <Share
                                    size={16}
                                    color="#fff"
                                    style={{ display: 'inline', verticalAlign: 'middle' }}
                                />{' '}
                                e depois em <strong>"Adicionar à Tela Inicial"</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
