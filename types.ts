
export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  // Campos de Trial e Plano
  trialStartedAt?: string;
  trialEndsAt?: string;
  plan?: 'trial' | 'active' | 'suspended';
  planTier?: 'essencial' | 'profissional' | 'premium';
  paymentConfirmedAt?: string;
  // WhatsApp Multi-Instância
  whatsappInstance?: string;
  whatsappConnected?: boolean;
  monthly_price?: number;
}

export interface Client {
  id: string;
  shopId: string;
  name: string;
  lastName?: string; // [NOVO]
  phone: string;
  email?: string;
  avatarUrl?: string;
  notes?: string;
  birthDate?: string; // ISO Date YYYY-MM-DD
  cpf?: string; // [NOVO]
  gender?: string; // [NOVO]
  cep?: string; // [NOVO]
  street?: string; // [NOVO]
  number?: string; // [NOVO]
  complement?: string; // [NOVO]
  neighborhood?: string; // [NOVO]
  city?: string; // [NOVO]
  state?: string; // [NOVO]
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
  clientBirthDate?: string; // [NOVO] Para cadastro inicial
  serviceIds: string[];
  professionalId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  totalValue: number;
  couponCode?: string;
  usedSubscriptionId?: string;
  createdAt: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';
  paymentMethod?: 'pix' | 'credit' | 'debit' | 'cash' | 'subscription';
  stockDeducted?: boolean;
  npsScore?: number;
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
  loyaltyEnabled?: boolean; // [NOVO] Controle de fidelidade
  loyaltyMode?: 'points' | 'card';
  loyaltyCardGoal?: number;
  loyaltyPointsRatio?: number;
  loyaltyPointsGoal?: number;
  loyaltyRewardValue?: number;
  loyaltyRewardType?: 'percentage' | 'fixed';
  loyaltyRewardValidityDays?: number;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  description?: string;
  paymentMethods?: string[];
  address?: string;
  phone?: string;
  businessHours?: Record<string, { active: boolean; start: string; end: string }>;
  // Campos legados/compat (algumas telas ainda usam)
  slug?: string;
  email?: string;
  about_us?: string;
  twitter?: string;
}

export interface AutomationTrigger {
  id: string;
  shopId: string;
  name: string;
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  period: 'before' | 'immediate' | 'after';
  active: boolean;
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
  triggerId: string;
  /** Campo legado: algumas telas ainda leem `template.trigger` */
  trigger?: string;
  active: boolean;
  target?: 'client' | 'professional';
  category?: string;
  /** Campos opcionais (persistidos como snake_case no DB) */
  delayValue?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
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

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  initialStock: number;
  minStock: number;
  createdAt?: string;
}

export interface AppointmentProduct {
  id: string;
  appointmentId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Goal {
  id: string;
  shopId: string;
  professionalId?: string;
  name: string;
  category: 'faturamento' | 'atendimentos' | 'venda_produtos';
  targetValue: number;
  currentValue: number;
  period: 'diário' | 'semanal' | 'mensal' | 'anual';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  shopId: string;
  status: 'open' | 'closed';
  openingBalance: number;
  closingBalance?: number;
  openedAt: string;
  closedAt?: string;
  openedBy?: string;
}

export interface CashFlowEntry {
  id: string;
  shopId: string;
  sessionId: string;
  type: 'input' | 'output';
  category: string;
  amount: number;
  description?: string;
  createdAt: string;
}

export interface ShopState {
  shop: Shop | null;
  services?: Service[];
  professionals?: Professional[];
  coupons?: Coupon[];
  appointments: Appointment[];
  clients?: Client[];
  subscriptionPlans?: SubscriptionPlan[];
  clientSubscriptions?: ClientSubscription[];
  messageTemplates?: MessageTemplate[];
  messageCategories?: MessageCategory[];
  products?: Product[];
  goals?: Goal[];
  myShops: Shop[];
  cashSessions?: CashSession[];
  cashFlowEntries?: CashFlowEntry[];
  blockedSlots?: BlockedSlot[];
  settings: ShopSettings;
  trialStatus: 'active' | 'expired' | 'paid';
  daysRemaining: number;
  theme: 'dark' | 'light';
  automationTriggers?: AutomationTrigger[];
  botPausedCount: number;
}
