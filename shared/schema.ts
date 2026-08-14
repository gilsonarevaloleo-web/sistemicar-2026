// Tipos puros de TypeScript para SISTEMICAR (Firebase-only)
// No se usa PostgreSQL - todos los datos van a Firebase Firestore

export type SubscriptionPlanId =
  | "espejo_inicio"
  | "espejo_recarga"
  | "arquitecto"
  | "soberano_operativo"
  | "soberano";

export interface User {
  id: string;
  username: string;
  password: string;
  email?: string | null;
  referredBy?: string | null;
  subscriptionPlan?: SubscriptionPlanId | null;
  subscriptionStatus: string;
  createdAt: Date;
  motivationPhotoUrl?: string | null;
  monthlyGoal: string;
}

export interface EnergyLog {
  id: string;
  userId: string;
  text: string;
  type: string;
  points: number;
  timestamp: Date;
}

export interface BossStep {
  id: string;
  userId: string;
  text: string;
  isActive: number;
  createdAt: Date;
  completedAt?: Date | null;
  status: string;
  archivedAt?: Date | null;
}

export interface FuturePlan {
  id: string;
  userId: string;
  text: string;
  complexity: string;
  targetDate?: Date | null;
  isCompleted: number;
  createdAt: Date;
  completedAt?: Date | null;
  status: string;
  archivedAt?: Date | null;
}

export interface HopeLog {
  id: string;
  userId: string;
  text: string;
  type: string;
  referenceDate?: Date | null;
  createdAt: Date;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  password: string;
  referralCode: string;
  commissionBalance: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  partnerId?: string | null;
  plan: string;
  amount: string;
  commissionAmount?: string | null;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  commissionPaidOut: number;
}

export interface WisdomLesson {
  id: string;
  userId: string;
  context: string;
  conflict: string;
  lesson: string;
  createdAt: Date;
}

export interface EnergyScan {
  id: string;
  userId: string;
  inputText: string;
  totalScore: number;
  socialEgoScore: number;
  biologicalResistanceScore: number;
  financialFrequencyScore: number;
  architectFocusScore: number;
  honestyBonus: number;
  dimensionAnalysis: string;
  oracleConclusion: string;
  oracleSuggestions?: string | null;
  createdAt: Date;
}

export interface AffiliateRequest {
  id: string;
  name: string;
  email: string;
  currentCp: number;
  status: string;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface EmbudoLead {
  id: string;
  email: string;
  profesion: string;
  categoriaPrecios: string; // 'alto_capital' | 'base'
  multiplicador: number;
  planSeleccionado?: string | null;
  retoAceptado: boolean;
  abandonoEnPaso: number;
  createdAt: Date;
}

// Insert types (for creating new records)
export type InsertUser = Omit<User, 'id' | 'createdAt'>;
export type InsertEnergyLog = Omit<EnergyLog, 'id' | 'timestamp'>;
export type InsertBossStep = Omit<BossStep, 'id' | 'createdAt'>;
export type InsertFuturePlan = Omit<FuturePlan, 'id' | 'createdAt'>;
export type InsertHopeLog = Omit<HopeLog, 'id' | 'createdAt'>;
export type InsertPartner = Omit<Partner, 'id' | 'createdAt'>;
