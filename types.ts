
export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  // [NOVO] Campos de Trial e Plano
  trialStartedAt?: string;
  trialEndsAt?: string;
  plan?: 'trial' | 'active' | 'suspended';
  paymentConfirmedAt?: string;
  // [NOVO] WhatsApp Multi-Instância
  whatsappInstance?: string;
  whatsappConnected?: boolean;
}

export interface Client {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  notes?: string;
  totalSpent?: number;
  loyaltyPoints?: number;
  loyaltyCardCount?: number;
  createdAt: string;
}

export interface Service {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  imageUrl?: string;
}

export interface DaySchedule {
  start: string;    // "09:00"
  end: string;      // "18:00"
  lunchStart: string; // "12:00"
  lunchEnd: string;   // "13:00"
  active: boolean;
}

export interface WorkSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface Professional {
  id: string;
  shopId: string;
  name: string;
  role: string;
  photoUrl: string;
  workSchedule?: WorkSchedule;
  email?: string;
  userId?: string;
  phone?: string; // [NOVO] Celular para notificações
  commissionPercentage?: number; // Novo campo
  color?: string; // [NOVO] Cor para identificação na agenda
}

export interface Coupon {
  id: string;
  shopId: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  usageCount: number;
  active: boolean;
  maxUses: number | null; // [NOVO] Limite de uso
  expiresAt?: string; // [NOVO] Data de expiração
  isLoyaltyReward?: boolean;
  clientId?: string;
}

export interface Appointment {
  id: string;
  shopId: string;
  clientId?: string; // Referência ao cliente (novo)
  clientName: string; // Mantido para compatibilidade ou agendamentos rápidos
  clientPhone: string; // Mantido para compatibilidade
  serviceIds: string[];
  professionalId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  totalValue: number;
  couponCode?: string;
  usedSubscriptionId?: string;
  createdAt: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';
  paymentMethod?: 'pix' | 'credit' | 'cash' | 'subscription';
}

export interface ShopSettings {
  id?: string;
  shopId: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  titleColor?: string;
  textColor?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  buttonTextColor?: string;
  priceColor?: string;
  accentColor?: string; // [NOVO] Cor de destaque (ex: badges, ícones)
  borderColor?: string; // [NOVO] Cor de bordas
  inputBackgroundColor?: string; // [NOVO] Cor de fundo de inputs
  inputTextColor?: string; // [NOVO] Cor de texto de inputs
  loyaltyMode?: 'points' | 'card';
  loyaltyCardGoal?: number;
  loyaltyPointsRatio?: number;
  loyaltyPointsGoal?: number;
  loyaltyRewardValue?: number;
  loyaltyRewardType?: 'percentage' | 'fixed';
  loyaltyRewardValidityDays?: number;
  instagram?: string;
  address?: string;
  businessHours?: Record<string, { active: boolean; start: string; end: string }>;
}

export interface BlockedSlot {
  id: string;
  shopId: string;
  professionalId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
}

export interface MessageTemplate {
  id: string;
  shopId: string;
  title: string;
  content: string;
  trigger: 'immediate_confirmation' | 'appointment_reminder' | 'rescheduling_request' | 'post_sale' | 'custom';
  delayValue: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  active: boolean;
  target?: 'client' | 'professional';
  category?: string;
}

export interface SubscriptionPlan {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  servicesPerMonth: number;
  active: boolean;
  createdAt: string;
}

export interface ClientSubscription {
  id: string;
  shopId: string;
  clientId: string;
  planId: string;
  status: 'active' | 'pending' | 'inactive' | 'cancelled';
  startDate: string;
  nextBillingDate: string;
  servicesUsedThisMonth: number;
  createdAt: string;
}

export interface MessageCategory {
  id: string;
  shopId: string;
  name: string;
}

export interface ShopState {
  shop: Shop | null;
  services: Service[];
  professionals: Professional[];
  coupons: Coupon[];
  appointments: Appointment[];
  clients: Client[]; // Nova lista de clientes
  subscriptionPlans: SubscriptionPlan[]; // [NOVO] Planos de Assinatura
  clientSubscriptions: ClientSubscription[]; // [NOVO] Assinaturas de Clientes
  messageTemplates: MessageTemplate[]; // [NOVO] Modelos de Mensagem
  messageCategories: MessageCategory[]; // [NOVO] Categorias de Mensagem
  blockedSlots: BlockedSlot[];
  settings: ShopSettings;
  // [NOVO] Estado do Cliente Logado
  currentClient: Client | null;
  clientSession: {
    clientId: string;
    token: string;
  } | null;
  // [NOVO] Estado derivado do trial
  trialStatus: 'active' | 'expired' | 'paid';
  daysRemaining: number;
  theme: 'dark' | 'light';
}
