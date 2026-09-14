export type AccountType = 'vadesiz' | 'vadeli' | 'birikim' | 'diger';

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  bank: string;
  cardName: string;
  limit: number;
  availableLimit: number;
  currentDebt: number; // Güncel dönem borcu
  statementDebt: number; // Kesilen ekstre borcu
  minimumPayment: number; // Asgari ödeme tutarı
  paymentDueDate: string; // YYYY-MM-DD
  cutoffDate?: string; // Hesap kesim tarihi (1-31)
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  loanName: string;
  bank: string;
  originalAmount: number;
  remainingPrincipal: number; // Kalan anapara
  monthlyInstallment: number; // Aylık taksit tutarı
  remainingInstallments: number; // Kalan taksit sayısı
  nextPaymentDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface Overdraft {
  id: string;
  bank: string;
  accountName?: string;
  limit: number;
  usedAmount: number; // Borç olarak sayılan kullanılan limit
  remainingAvailable: number;
  interestRate?: number; // Aylık akdi faiz oranı (%)
  paymentDate?: string; // YYYY-MM-DD veya gün
  createdAt: string;
  updatedAt: string;
}

export interface OtherDebt {
  id: string;
  debtName: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type IncomeCategory = 'maas' | 'avans' | 'freelance' | 'ticari' | 'kira' | 'diger';
export type IncomeFrequency = 'monthly' | 'one_time' | 'biweekly' | 'weekly';

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  dayOfMonth?: number; // 1-31 (Her ayın x'i)
  category: IncomeCategory;
  paymentDate?: string; // YYYY-MM-DD
  isRecurring: boolean;
  targetAccountId?: string; // Yatırılacak banka hesabı ID'si
  processedMonths?: string[]; // Örn: ["2026-09"] - Yenilemelerde mükerrer gelir kaydını önler
  createdAt: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | 'market'
  | 'yemek'
  | 'ulasim'
  | 'fatura'
  | 'kira'
  | 'alisveris'
  | 'saglik'
  | 'eglence'
  | 'abonelik'
  | 'egitim'
  | 'diger';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentSourceId?: string;
  paymentSourceName?: string;
  paymentSourceType?: 'bank_account' | 'credit_card' | 'nakit' | 'diger';
  note: string;
  isDebtPayment?: boolean; // True if transaction is debt repayment (does NOT count towards consumer spending)
  relatedDebtType?: 'card' | 'loan' | 'kmh' | 'other';
  relatedDebtId?: string;
  createdAt: string;
}

export type ScheduledPaymentType = 'credit_card' | 'loan' | 'bill' | 'rent' | 'kmh' | 'salary' | 'other';

export interface ScheduledPayment {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  type: ScheduledPaymentType;
  relatedEntityId?: string;
  isPaid: boolean;
  paidDate?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface CategoryStat {
  category: ExpenseCategory | string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

export interface DebtDetailItem {
  id: string;
  name: string;
  type: string;
  bank?: string;
  amount: number;
  monthlyOrMin: number;
  dueDate?: string;
  isOverdue: boolean;
  daysUntilDue?: number;
}

export interface FinancialSnapshot {
  totalBalance: number;
  totalDebt: number;
  creditCardDebt: number;
  loanDebt: number;
  overdraftDebt: number;
  otherDebt: number;
  monthlyIncome: number;
  realizedMonthlyIncome: number; // Ay içinde şu ana kadar fiilen yatan gelir
  pendingMonthlyIncome: number; // Ay içinde henüz günü gelmemiş beklenen gelir
  monthlyExpenses: number; // Tüketim harcamaları
  totalDebtRepayments: number; // Bu ay yapılan borç ödemeleri (harcama sayılmaz)
  netLiquidAvailable: number; // Nakit bakiye - bu ayki yaklaşan zorunlu ödemeler
  currentCashSafety: number; // Mevcut nakit güvenliği (totalBalance - thisMonthUpcomingTotal)
  hasCashShortfall: boolean; // Anlık nakit açığı var mı (currentCashSafety < 0)
  cashShortfall: number; // Anlık nakit açığı tutarı (varsa pozitif sayı)
  upcomingPaymentsTotal: number;
  thisMonthUpcomingTotal: number; // Bu ay vadesi gelecek zorunlu ödemeler
  remainingBudget: number;
  plannedDiscretionaryBudget: number; // Planlanan aylık serbest bütçe
  dailySafeSpending: number; // GÜNLÜK GÜVENLİ HARCAMA: Anlık serbest likit nakit / kalan gün (asla gelecekteki geliri varsaymaz)
  plannedDailyBudget: number; // PLANLANAN GÜNLÜK BÜTÇE: Kalan aylık bütçe / kalan gün (gelecek beklenen gelir dahil)
  isOverBudget: boolean;
  budgetDeficit: number;
  remainingDays: number;
  totalDaysInMonth: number;
  currentDayOfMonth: number;
  debtRatio: number; // Borç / Gelir oranı %
  categoryBreakdown: CategoryStat[];
  debtDetails: DebtDetailItem[];
  incomes: { id?: string; name: string; amount: number; isRecurring: boolean; paymentDate?: string }[];
  lastUpdated: string;
}

export interface CoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  isRuleBased?: boolean;
  errorNotice?: string;
}

export interface UserProfile {
  name: string;
  hasCompletedOnboarding: boolean;
  currency: string;
  createdAt: string;
}

export interface AppData {
  profile: UserProfile;
  accounts: BankAccount[];
  creditCards: CreditCard[];
  loans: Loan[];
  overdrafts: Overdraft[];
  otherDebts: OtherDebt[];
  incomes: Income[];
  expenses: Expense[];
  scheduledPayments: ScheduledPayment[];
  coachMessages: CoachMessage[];
  version: number;
}
