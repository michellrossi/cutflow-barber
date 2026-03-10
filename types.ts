
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
  createdAt: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';
  paymentMethod?: 'pix' | 'credit' | 'cash';
}

export interface ShopSettings {
  id?: string;
  shopId: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
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

export interface ShopState {
  shop: Shop | null;
  services: Service[];
  professionals: Professional[];
  coupons: Coupon[];
  appointments: Appointment[];
  clients: Client[]; // Nova lista de clientes
  blockedSlots: BlockedSlot[];
  settings: ShopSettings;
  // [NOVO] Estado derivado do trial
  trialStatus: 'active' | 'expired' | 'paid';
  daysRemaining: number;
}