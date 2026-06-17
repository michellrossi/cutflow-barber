import DOMPurify from 'dompurify';
import type { Shop, ShopState, WorkSchedule, ShopSettings } from '../types';

export const DEFAULT_SCHEDULE: WorkSchedule = {
    monday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    tuesday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    wednesday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    thursday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    friday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    saturday: { start: '09:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
    sunday: { start: '09:00', end: '13:00', lunchStart: '00:00', lunchEnd: '00:00', active: false },
};

export const PROFESSIONAL_COLORS = [
    '#f97316',
    '#3b82f6',
    '#10b981',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f59e0b',
] as const;

export const DEFAULT_SETTINGS: ShopSettings = {
    shopId: '',
    name: 'Carregando...',
    logoUrl: null,
    primaryColor: '#f97316',
    secondaryColor: '#1e293b',
    titleColor: '#ffffff',
    textColor: '#94a3b8',
    backgroundColor: '#0f172a',
    cardBackgroundColor: '#1e293b',
    buttonTextColor: '#ffffff',
    priceColor: '#f97316',
    accentColor: '#f97316',
    borderColor: '#334155',
    inputBackgroundColor: '#0f172a',
    inputTextColor: '#ffffff',
    description: '',
    facebook: '',
    whatsapp: '',
    paymentMethods: ['credit', 'debit', 'cash', 'pix'],
};

export const INITIAL_STATE: ShopState = {
    shop: null,
    appointments: [],
    trialStatus: 'active',
    daysRemaining: 14,
    theme: 'light',
    myShops: [],
    botPausedCount: 0,
};

export function sanitize(text: string): string {
    if (!text) return '';
    return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
}

export function formatCurrencyBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    })
        .format(value || 0)
        .replace(/\s/g, '');
}

export function calculateTrialStatus(shop: Shop): {
    status: 'active' | 'expired' | 'paid';
    days: number;
} {
    if (shop.plan === 'active') {
        return { status: 'paid', days: 0 };
    }

    if (shop.plan === 'suspended') {
        return { status: 'expired', days: 0 };
    }

    if (!shop.trialEndsAt) return { status: 'active', days: 14 };

    const now = new Date();
    const end = new Date(shop.trialEndsAt);
    const diffTime = end.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days <= 0) {
        return { status: 'expired', days: 0 };
    }

    return { status: 'active', days };
}
