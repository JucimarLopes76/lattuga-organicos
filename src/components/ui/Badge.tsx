import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-600',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                variantClasses[variant],
                className
            )}
        >
            {children}
        </span>
    );
}

export function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { variant: BadgeVariant; label: string }> = {
        pending: { variant: 'warning', label: 'Pendente' },
        accepted: { variant: 'info', label: 'Aceito' },
        rejected: { variant: 'danger', label: 'Rejeitado' },
        completed: { variant: 'success', label: 'Concluído' },
        cancelled: { variant: 'danger', label: 'Cancelado' },
    };
    const config = map[status] || { variant: 'neutral' as BadgeVariant, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}
