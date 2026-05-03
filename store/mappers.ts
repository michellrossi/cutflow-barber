import type {
    Appointment,
    AutomationTrigger,
    BlockedSlot,
    CashFlowEntry,
    CashSession,
    Client,
    ClientSubscription,
    Coupon,
    Goal,
    MessageCategory,
    MessageTemplate,
    Product,
    Professional,
    Service,
    Shop,
    ShopSettings,
    SubscriptionPlan,
    WorkSchedule,
} from '../types';
import { DEFAULT_SCHEDULE, PROFESSIONAL_COLORS } from './helpers';

/** Row from `shops` (PostgREST snake_case) */
export interface ShopRow {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    plan?: Shop['plan'];
    plan_tier?: string | null;
    payment_confirmed_at?: string | null;
    whatsapp_instance?: string | null;
    whatsapp_connected?: boolean | null;
}

/** Row from `settings` */
interface SettingsRow {
    id?: string;
    shop_id: string;
    name?: string | null;
    logo_url?: string | null;
    slug?: string | null;
    email?: string | null;
    about_us?: string | null;
    twitter?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    title_color?: string | null;
    text_color?: string | null;
    background_color?: string | null;
    card_background_color?: string | null;
    button_text_color?: string | null;
    price_color?: string | null;
    accent_color?: string | null;
    border_color?: string | null;
    input_background_color?: string | null;
    input_text_color?: string | null;
    loyalty_enabled?: boolean | null;
    loyalty_mode?: string | null;
    loyalty_card_goal?: number | null;
    loyalty_points_ratio?: number | null;
    loyalty_points_goal?: number | null;
    loyalty_reward_value?: number | null;
    loyalty_reward_type?: string | null;
    loyalty_reward_validity_days?: number | null;
    instagram?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
    description?: string | null;
    payment_methods?: string[] | null;
    address?: string | null;
    phone?: string | null;
    business_hours?: ShopSettings['businessHours'] | null;
}

interface AutomationTriggerRow {
    id: string;
    shop_id: string;
    name: string;
    value: number;
    unit: AutomationTrigger['unit'];
    period: AutomationTrigger['period'];
    active: boolean;
}

export interface ClientRow {
    id: string;
    shop_id: string;
    name: string;
    last_name?: string | null;
    phone: string;
    email?: string | null;
    avatar_url?: string | null;
    notes?: string | null;
    birth_date?: string | null;
    cpf?: string | null;
    gender?: string | null;
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    total_spent?: number | null;
    loyalty_points?: number | null;
    loyalty_card_count?: number | null;
    created_at: string;
}

interface ServiceRow {
    id: string;
    shop_id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    category?: string | null;
    image_url?: string | null;
}

interface ProfessionalRow {
    id: string;
    shop_id: string;
    name: string;
    role: string;
    photo_url: string;
    work_schedule?: WorkSchedule | null;
    email?: string | null;
    phone?: string | null;
    user_id?: string | null;
    commission_percentage?: number | null;
    color?: string | null;
}

interface CouponRow {
    id: string;
    shop_id: string;
    code: string;
    type: Coupon['type'];
    value: number;
    usage_count: number;
    active: boolean;
    max_uses?: number | null;
    expires_at?: string | null;
}

interface AppointmentRow {
    id: string;
    shop_id: string;
    client_id?: string | null;
    client_name: string;
    client_phone: string;
    service_ids?: string[] | null;
    professional_id: string | null;
    date: string;
    time: string;
    total_value: number;
    coupon_code?: string | null;
    used_subscription_id?: string | null;
    created_at: string;
    status?: Appointment['status'] | null;
    payment_method?: Appointment['paymentMethod'] | null;
    stock_deducted?: boolean | null;
}

interface BlockedSlotRow {
    id: string;
    shop_id: string;
    professional_id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string | null;
}

interface MessageTemplateRow {
    id: string;
    shop_id: string;
    title: string;
    content: string;
    trigger_id?: string | null;
    trigger?: string | null;
    active: boolean;
    target?: MessageTemplate['target'] | null;
    category?: string | null;
}

interface MessageCategoryRow {
    id: string;
    shop_id: string;
    name: string;
}

export interface SubscriptionPlanRow {
    id: string;
    shop_id: string;
    name: string;
    description: string | null;
    price: number;
    services_per_month: number;
    active: boolean;
    created_at: string;
}

export interface ClientSubscriptionRow {
    id: string;
    shop_id: string;
    client_id: string;
    plan_id: string;
    status: ClientSubscription['status'];
    start_date: string;
    next_billing_date: string;
    services_used_this_month?: number | null;
    created_at: string;
}

export interface ProductRow {
    id: string;
    shop_id: string;
    name: string;
    category: string;
    cost_price?: number | string | null;
    sale_price?: number | string | null;
    current_stock?: number | string | null;
    initial_stock?: number | string | null;
    min_stock?: number | string | null;
    created_at: string;
}

export interface GoalRow {
    id: string;
    shop_id: string;
    professional_id?: string | null;
    name: string;
    category: Goal['category'];
    target_value?: number | string | null;
    current_value?: number | string | null;
    period: Goal['period'];
    start_date: string;
    end_date: string;
    created_at: string;
}

interface CashSessionRow {
    id: string;
    shop_id: string;
    status: CashSession['status'];
    opening_balance: number;
    closing_balance?: number | null;
    opened_at: string;
    closed_at?: string | null;
    opened_by?: string | null;
}

interface CashFlowEntryRow {
    id: string;
    shop_id: string;
    session_id: string;
    type: CashFlowEntry['type'];
    category: string;
    amount: number;
    description?: string | null;
    created_at: string;
}

export function mapShop(data: ShopRow): Shop {
    return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        slug: data.slug,
        trialStartedAt: data.trial_started_at ?? undefined,
        trialEndsAt: data.trial_ends_at ?? undefined,
        plan: data.plan,
        planTier: (data.plan_tier as Shop['planTier']) || 'essencial',
        paymentConfirmedAt: data.payment_confirmed_at ?? undefined,
        whatsappInstance: data.whatsapp_instance ?? undefined,
        whatsappConnected: data.whatsapp_connected ?? undefined,
    };
}

export function mapSettings(data: SettingsRow): ShopSettings {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name || 'Minha Barbearia',
        logoUrl: data.logo_url ?? null,
        slug: data.slug ?? undefined,
        email: data.email ?? undefined,
        about_us: data.about_us ?? undefined,
        twitter: data.twitter ?? undefined,
        primaryColor: data.primary_color || '#f97316',
        secondaryColor: data.secondary_color || '#1e293b',
        titleColor: data.title_color || '#ffffff',
        textColor: data.text_color || '#94a3b8',
        backgroundColor: data.background_color || '#0f172a',
        cardBackgroundColor: data.card_background_color || '#1e293b',
        buttonTextColor: data.button_text_color || '#ffffff',
        priceColor: data.price_color || '#f97316',
        accentColor: data.accent_color || '#f97316',
        borderColor: data.border_color || '#334155',
        inputBackgroundColor: data.input_background_color || '#0f172a',
        inputTextColor: data.input_text_color || '#ffffff',
        loyaltyEnabled: data.loyalty_enabled ?? true,
        loyaltyMode: (data.loyalty_mode as ShopSettings['loyaltyMode']) || 'card',
        loyaltyCardGoal: data.loyalty_card_goal || 10,
        loyaltyPointsRatio: data.loyalty_points_ratio || 1,
        loyaltyPointsGoal: data.loyalty_points_goal || 1000,
        loyaltyRewardValue: data.loyalty_reward_value || 10,
        loyaltyRewardType: (data.loyalty_reward_type as ShopSettings['loyaltyRewardType']) || 'percentage',
        loyaltyRewardValidityDays: data.loyalty_reward_validity_days || 90,
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        whatsapp: data.whatsapp || '',
        description: data.description || '',
        paymentMethods: data.payment_methods || ['credit', 'debit', 'cash', 'pix'],
        address: data.address || '',
        phone: data.phone || '',
        businessHours: data.business_hours ?? undefined,
    };
}

export function mapAutomationTrigger(data: AutomationTriggerRow): AutomationTrigger {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
        value: data.value,
        unit: data.unit,
        period: data.period,
        active: data.active,
    };
}

export function mapClient(c: ClientRow): Client {
    return {
        id: c.id,
        shopId: c.shop_id,
        name: c.name,
        lastName: c.last_name ?? undefined,
        phone: c.phone,
        email: c.email ?? undefined,
        avatarUrl: c.avatar_url ?? undefined,
        notes: c.notes ?? undefined,
        birthDate: c.birth_date ?? undefined,
        cpf: c.cpf ?? undefined,
        gender: c.gender ?? undefined,
        cep: c.cep ?? undefined,
        street: c.street ?? undefined,
        number: c.number ?? undefined,
        complement: c.complement ?? undefined,
        neighborhood: c.neighborhood ?? undefined,
        city: c.city ?? undefined,
        state: c.state ?? undefined,
        totalSpent: c.total_spent || 0,
        loyaltyPoints: c.loyalty_points || 0,
        loyaltyCardCount: c.loyalty_card_count || 0,
        createdAt: c.created_at,
    };
}

export function mapService(data: ServiceRow): Service {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        category: data.category || 'Geral',
        imageUrl: data.image_url ?? undefined,
    };
}

export function mapProfessional(data: ProfessionalRow, index: number): Professional {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
        role: data.role,
        photoUrl: data.photo_url,
        workSchedule: data.work_schedule || DEFAULT_SCHEDULE,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        userId: data.user_id ?? undefined,
        commissionPercentage: data.commission_percentage || 50,
        color: data.color || PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length],
    };
}

export function mapCoupon(data: CouponRow): Coupon {
    return {
        id: data.id,
        shopId: data.shop_id,
        code: data.code,
        type: data.type,
        value: data.value,
        usageCount: data.usage_count,
        active: data.active,
        maxUses: data.max_uses ?? null,
        expiresAt: data.expires_at ?? undefined,
    };
}

export function mapAppointment(data: AppointmentRow): Appointment {
    return {
        id: data.id,
        shopId: data.shop_id,
        clientId: data.client_id ?? undefined,
        clientName: data.client_name,
        clientPhone: data.client_phone,
        serviceIds: data.service_ids || [],
        professionalId: data.professional_id,
        date: data.date,
        time: data.time,
        totalValue: data.total_value,
        couponCode: data.coupon_code ?? undefined,
        usedSubscriptionId: data.used_subscription_id ?? undefined,
        createdAt: data.created_at,
        status: data.status || 'scheduled',
        paymentMethod: data.payment_method ?? undefined,
        stockDeducted: data.stock_deducted ?? false
    };
}

export function mapBlockedSlot(data: BlockedSlotRow): BlockedSlot {
    return {
        id: data.id,
        shopId: data.shop_id,
        professionalId: data.professional_id,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        reason: data.reason ?? undefined,
    };
}

export function mapMessageTemplate(data: MessageTemplateRow): MessageTemplate {
    const trigger = data.trigger_id || data.trigger || '';
    return {
        id: data.id,
        shopId: data.shop_id,
        title: data.title,
        content: data.content,
        triggerId: trigger,
        trigger,
        active: data.active,
        target: data.target || 'client',
        category: data.category ?? undefined,
    };
}

export function mapMessageCategory(data: MessageCategoryRow): MessageCategory {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
    };
}

export function mapSubscriptionPlan(data: SubscriptionPlanRow): SubscriptionPlan {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
        description: data.description || '',
        price: data.price,
        servicesPerMonth: data.services_per_month,
        active: data.active,
        createdAt: data.created_at,
    };
}

export function mapClientSubscription(data: ClientSubscriptionRow): ClientSubscription {
    return {
        id: data.id,
        shopId: data.shop_id,
        clientId: data.client_id,
        planId: data.plan_id,
        status: data.status,
        startDate: data.start_date,
        nextBillingDate: data.next_billing_date,
        servicesUsedThisMonth: data.services_used_this_month || 0,
        createdAt: data.created_at,
    };
}

export function mapProduct(data: ProductRow): Product {
    return {
        id: data.id,
        shopId: data.shop_id,
        name: data.name,
        category: data.category,
        costPrice: Number(data.cost_price || 0),
        salePrice: Number(data.sale_price || 0),
        currentStock: Number(data.current_stock || 0),
        initialStock: Number(data.initial_stock || 0),
        minStock: Number(data.min_stock || 0),
        createdAt: data.created_at,
    };
}

export function mapGoal(data: GoalRow): Goal {
    return {
        id: data.id,
        shopId: data.shop_id,
        professionalId: data.professional_id ?? undefined,
        name: data.name,
        category: data.category,
        targetValue: Number(data.target_value || 0),
        currentValue: Number(data.current_value || 0),
        period: data.period,
        startDate: data.start_date,
        endDate: data.end_date,
        createdAt: data.created_at,
    };
}

export function mapCashSession(data: CashSessionRow): CashSession {
    return {
        id: data.id,
        shopId: data.shop_id,
        status: data.status,
        openingBalance: data.opening_balance,
        closingBalance: data.closing_balance ?? undefined,
        openedAt: data.opened_at,
        closedAt: data.closed_at ?? undefined,
        openedBy: data.opened_by ?? undefined,
    };
}

export function mapCashFlowEntry(data: CashFlowEntryRow): CashFlowEntry {
    return {
        id: data.id,
        shopId: data.shop_id,
        sessionId: data.session_id,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description ?? undefined,
        createdAt: data.created_at,
    };
}
