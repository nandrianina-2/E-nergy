// Types globaux partagés dans toute l'application

export type UserRole = "admin" | "user";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type AllocationMethod = "proportional" | "equal";

export type NotificationType =
  | "new_invoice"
  | "reading_reminder"
  | "payment_overdue"
  | "payment_received"
  | "discrepancy_alert"
  | "account_created"
  | "new_message"
  | "general";

/** Types pour lesquels l'utilisateur peut personnaliser ses préférences. */
export const CONFIGURABLE_NOTIFICATION_TYPES: NotificationType[] = [
  "new_invoice",
  "reading_reminder",
  "payment_overdue",
  "payment_received",
  "new_message",
  "general",
];

export interface NotificationChannelPrefs {
  inApp: boolean;
  email: boolean;
}

export type NotificationPreferences = Partial<
  Record<NotificationType, NotificationChannelPrefs>
>;

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  submeterId?: string | ISubmeter;
  isActive: boolean;
  language: "fr" | "mg";
  theme: "light" | "dark";
  createdAt: string;
  updatedAt: string;
}

export interface ISubmeter {
  _id: string;
  code: string; // ex: SM-001
  label: string; // ex: "Appartement 1"
  userId?: string | IUser;
  initialIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IMainMeter {
  _id: string;
  invoiceNumber: string;
  oldIndex: number;
  newIndex: number;
  consumption: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  allocationMethod: AllocationMethod;
  fileUrl?: string;
  ocrRawText?: string;
  ocrConfidence?: number;
  status: "draft" | "validated" | "allocated";
  createdAt: string;
  updatedAt: string;
}

export interface IReading {
  _id: string;
  submeterId: string | ISubmeter;
  mainMeterId?: string | IMainMeter;
  period: string; // format "YYYY-MM"
  oldIndex: number;
  newIndex: number;
  consumption: number;
  submittedBy: string | IUser;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  submeterId: string | ISubmeter;
  readingId: string | IReading;
  mainMeterId: string | IMainMeter;
  period: string;
  consumption: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  _id: string;
  invoiceId: string | IInvoice;
  submeterId: string | ISubmeter;
  amount: number;
  paymentDate: string;
  method: "cash" | "transfer" | "mobile_money" | "other";
  note?: string;
  recordedBy: string | IUser;
  createdAt: string;
}

export interface INotification {
  _id: string;
  userId: string | IUser;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DiscrepancyResult {
  mainMeterConsumption: number;
  submetersTotalConsumption: number;
  difference: number;
  differencePercent: number;
  isWithinTolerance: boolean;
}

export interface DashboardStats {
  totalSubmeters: number;
  activeSubmeters: number;
  totalUsers: number;
  currentPeriodConsumption: number;
  currentPeriodAmount: number;
  unpaidInvoicesCount: number;
  unpaidAmount: number;
  discrepancy: DiscrepancyResult | null;
}

export type MobileMoneyOperator = "mvola" | "orange_money" | "airtel_money";
export type PaymentRequestMethod = MobileMoneyOperator | "cash";
export type PaymentRequestStatus = "pending" | "approved" | "rejected";

export interface IPaymentMethod {
  _id: string;
  operator: MobileMoneyOperator;
  label: string;
  transferCode: string;
  ussdTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISiteSettings {
  _id: string;
  siteName: string;
  logoUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportAddress?: string;
  updatedAt: string;
}

export interface IPaymentRequest {
  _id: string;
  invoiceId: string | IInvoice;
  submeterId: string | ISubmeter;
  userId: string | IUser;
  amount: number;
  method: PaymentRequestMethod;
  status: PaymentRequestStatus;
  reviewedBy?: string | IUser;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  _id: string;
  userId: string | IUser;
  invoiceId?: string | IInvoice;
  subject: string;
  status: "open" | "closed";
  archivedByUser: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string | IUser;
  senderRole: "admin" | "user";
  text?: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}
