import React from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Plus,
  Clock,
  PiggyBank,
  HelpCircle,
  CreditCard as CreditCardIcon,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  FinancialSnapshot,
  Expense,
  BankAccount,
  Income,
  ScheduledPayment,
} from '../types/finance';
import {
  formatCurrency,
  formatTurkishDate,
  formatShortDate,
  formatTurkishMonth,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
} from '../utils/financialCalculations';
import { NavTab } from './Navbar';

export interface DashboardViewProps {
  snapshot: FinancialSnapshot;
  expenses: Expense[];
  accounts: BankAccount[];
  incomes?: Income[];
  scheduledPayments?: ScheduledPayment[];
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickExpense: () => void;
  onMarkPaymentPaid?: (id: string) => void;
}

/**
 * Returns clean, visual badges for transaction classification (Requirement 9)
 */
export function getTransactionBadge(exp: Expense): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  if (exp.isDebtPayment) {
    if (exp.relatedDebtType === 'card') {
      return {
        label: 'Kredi Kartı Borç Ödemesi',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
      };
    }
    if (exp.relatedDebtType === 'loan') {
      return {
        label: 'Kredi Taksiti',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
      };
    }
    if (exp.relatedDebtType === 'kmh') {
      return {
        label: 'KMH İşlemi',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    }
    return {
      label: 'Diğer Borç Ödemesi',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-200',
    };
  }

  if (exp.paymentSourceType === 'credit_card') {
    return {
      label: 'Kredi Kartı Harcaması',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
    };
  }

  return {
    label: 'Harcama',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  expenses,
  accounts,
  incomes = [],
  scheduledPayments = [],
  onSelectTab,
  onOpenQuickExpense,
  onMarkPaymentPaid,
}) => {
  // Sort recent expenses (both consumer expenses and debt payments)
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Filter upcoming payments from snapshot.debtDetails or scheduledPayments
  const upcomingPayments = snapshot.debtDetails
    .filter((d) => d.dueDate)
    .slice(0, 5);

  // Filter expected incomes that haven't arrived yet
  const pendingIncomes = incomes.length > 0
    ? incomes.filter((inc) => {
        // If recurring or has payment date
        return inc.amount > 0;
      })
    : snapshot.incomes;

  const todayStr = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HEADER & QUICK ACTIONS */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                CEBİ
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {todayStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
              Finansal durumun bugün
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {formatTurkishMonth()} dönemi • Anlık bütçe ve güvenli harcama görünümü
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dash-talk-to-coach-btn"
              onClick={() => onSelectTab('coach')}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Koça Danış</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Row (Requirement 8) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Hızlı İşlemler:
          </span>

          <button
            id="quick-action-add-expense-btn"
            onClick={onOpenQuickExpense}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Harcama Ekle</span>
          </button>

          <button
            id="quick-action-add-income-btn"
            onClick={() => onSelectTab('accounts')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Gelir Ekle</span>
          </button>

          <button
            id="quick-action-pay-debt-btn"
            onClick={() => onSelectTab('debts')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCardIcon className="w-3.5 h-3.5 text-rose-600" />
            <span>+ Borç Öde</span>
          </button>

          <button
            id="quick-action-add-payment-btn"
            onClick={() => onSelectTab('calendar')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Ödeme Ekle</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRIMARY FINANCIAL STATUS & DAILY SAFE SPENDING */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Şu An Kullanılabilir Param */}
        <div
          id="card-current-available-cash"
          onClick={() => onSelectTab('accounts')}
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Şu An Kullanılabilir Param
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(snapshot.totalBalance)}
            </div>

            <p className="text-xs font-medium text-slate-600 mt-2">
              Şu an hesaplarında bulunan para.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              *Gelecek gelirler dahil değildir.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {accounts.length > 0
                ? `${accounts.length} banka hesabında hazır`
                : 'Henüz banka hesabı eklemedin'}
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
              <span>Hesapları Gör</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Günlük Güvenli Harcama */}
        <div
          id="card-daily-safe-spending"
          className={`p-5 sm:p-6 rounded-2xl border shadow-xs flex flex-col justify-between transition ${
            snapshot.hasCashShortfall
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : snapshot.isOverBudget
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    snapshot.hasCashShortfall
                      ? 'bg-amber-600 text-white'
                      : snapshot.isOverBudget
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {snapshot.hasCashShortfall || snapshot.isOverBudget ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-xs font-black uppercase tracking-wider">
                  Günlük Güvenli Harcama
                </span>
              </div>

              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-current/10">
                Kalan: {snapshot.remainingDays} gün
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {snapshot.hasCashShortfall || snapshot.dailySafeSpending <= 0 ? (
                <span className="text-amber-900">0 ₺ / gün</span>
              ) : (
                <span className="text-emerald-950">
                  {formatCurrency(snapshot.dailySafeSpending)} / gün
                </span>
              )}
            </div>

            <p className="text-xs font-semibold mt-2">
              {snapshot.hasCashShortfall ? (
                <span className="text-amber-900 font-bold">
                  Mevcut nakdin yaklaşan ödemelerini karşılamıyor.
                </span>
              ) : snapshot.isOverBudget ? (
                <span className="text-rose-800 font-bold">
                  Aylık bütçe aşıldı, harcamaları durdurman önerilir.
                </span>
              ) : (
                <span className="text-emerald-800">
                  Yaklaşan zorunlu ödemeler dikkate alınmıştır.
                </span>
              )}
            </p>

            <p className="text-[11px] opacity-75 mt-0.5">
              {snapshot.hasCashShortfall
                ? `Ay sonuna kadarki zorunlu ödemeler (${formatCurrency(snapshot.upcomingPaymentsTotal)}) mevcut bakiyeni aşıyor.`
                : `Bugün bu tutara kadar harcayarak ayı zorunlu ödemelerini aksatmadan güvenle kapatabilirsin.`}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className="opacity-80">
              Zorunlu Rezerve: {formatCurrency(snapshot.upcomingPaymentsTotal)}
            </span>
            <button
              onClick={() => onSelectTab('coach')}
              className="font-bold underline hover:opacity-80 transition cursor-pointer"
            >
              Koçun Analizi
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CASH SHORTFALL ALERT (Only shown if hasCashShortfall === true) */}
      {/* ========================================================================= */}
      {snapshot.hasCashShortfall && (
        <div
          id="alert-cash-shortfall"
          className="p-5 sm:p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-base font-black text-amber-950 tracking-tight">
                  Anlık Nakit Rezervi Yetersiz
                </h3>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-950 self-start sm:self-auto">
                  Nakit Açığı: -{formatCurrency(snapshot.cashShortfall)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                Yaklaşan zorunlu ödemelerini karşılamak için{' '}
                <strong className="font-black text-amber-950 underline">
                  {formatCurrency(snapshot.cashShortfall)}
                </strong>{' '}
                açığın var. Şu anki banka bakiyen ({formatCurrency(snapshot.totalBalance)}) yaklaşan zorunlu ödemelerin ({formatCurrency(snapshot.upcomingPaymentsTotal)}) için yetersiz kalıyor.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-white/80 border border-amber-200 font-bold text-amber-950">
                  Günlük güvenli harcama: 0 ₺
                </div>
                <div className="text-amber-800">
                  *Beklenen gelirlerin (örneğin maaş/avans) fiilen hesabına geçene kadar nakit harcama yapmaman önerilir.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 & 5. UPCOMING PAYMENTS & EXPECTED INCOME */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. UPCOMING PAYMENTS */}
        <div
          id="dashboard-upcoming-payments-card"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <h3 className="text-base font-black text-slate-900">Yaklaşan Ödemeler</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bu tutarlar borç temerrüdünü önlemek için serbest nakdinden ayrılmıştır.
                </p>
              </div>

              <button
                id="dash-view-calendar-btn"
                onClick={() => onSelectTab('calendar')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Tüm Takvim</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 my-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Yaklaşan zorunlu ödemen bulunmuyor.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tüm kredi kartı ve taksit ödemelerin güncel.
                </p>
                <button
                  onClick={() => onSelectTab('calendar')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  + Ödeme Planla
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 my-3">
                {upcomingPayments.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      item.isOverdue
                        ? 'border-rose-200 bg-rose-50/50'
                        : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          item.isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-600">{item.type}</span>
                          <span>•</span>
                          <span>{formatTurkishDate(item.dueDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-xs sm:text-sm text-slate-900">
                        {formatCurrency(item.monthlyOrMin || item.amount)}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                          item.isOverdue
                            ? 'bg-rose-100 text-rose-700 font-extrabold'
                            : item.daysUntilDue === 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.isOverdue
                          ? 'Gecikmiş'
                          : item.daysUntilDue === 0
                          ? 'Bugün'
                          : `${item.daysUntilDue} gün sonra`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Toplam Yaklaşan Yükümlülük:
            </span>
            <span className="font-black text-slate-900 text-sm">
              {formatCurrency(snapshot.upcomingPaymentsTotal)}
            </span>
          </div>
        </div>

        {/* 5. EXPECTED INCOME */}
        <div
          id="dashboard-expected-income-card"
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900">Beklenen Gelir</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bu para henüz fiilen hesaba geçmediği için mevcut nakdine dahil edilmez.
                </p>
              </div>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Henüz hesaba geçmedi
              </span>
            </div>

            {pendingIncomes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 my-3">
                <PiggyBank className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Beklenen gelir bulunmuyor.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Maaş, kira veya ek gelirlerini ekleyebilirsin.
                </p>
                <button
                  onClick={() => onSelectTab('accounts')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  + Gelir Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 my-3">
                {pendingIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{inc.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{inc.isRecurring ? 'Düzenli Gelir' : 'Tek Seferlik'}</span>
                          <span>•</span>
                          <span>
                            {inc.paymentDate
                              ? formatTurkishDate(inc.paymentDate)
                              : inc.dayOfMonth
                              ? `Her ayın ${inc.dayOfMonth}. günü`
                              : 'Ay sonuna kadar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-xs sm:text-sm text-emerald-800">
                        +{formatCurrency(inc.amount)}
                      </div>
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100 mt-0.5">
                        Bekleniyor
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Toplam Beklenen Gelir:</span>
            <span className="font-black text-emerald-700 text-sm">
              +{formatCurrency(snapshot.pendingMonthlyIncome || snapshot.monthlyIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. PLANNED DAILY BUDGET (Distinct from Daily Safe Spending) */}
      {/* ========================================================================= */}
      <div
        id="card-planned-daily-budget"
        className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Planlanan Günlük Bütçe
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700">
              Aylık Hedef
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
            {formatCurrency(snapshot.plannedDailyBudget)} / gün
          </div>

          <p className="text-xs text-slate-300 font-medium mt-1">
            Beklenen gelirler gerçekleştiğinde planlanan günlük bütçen.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            *Bu tutar anlık nakit harcama sınırın değildir. Tüm gelirler yattıktan sonra hedeflenen günlük ortalamayı ifade eder.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <span className="text-slate-400 block text-[10px]">Toplam Planlanan Bütçe</span>
            <span className="font-bold text-white text-sm">
              {formatCurrency(snapshot.remainingBudget)}
            </span>
          </div>

          <button
            onClick={() => onSelectTab('coach')}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Bütçe Rehberi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MONTHLY OVERVIEW (Compact summary: Gelir, Harcamalar, Borç Ödemeleri, Yaklaşan Ödemeler) */}
      {/* ========================================================================= */}
      <div
        id="dashboard-monthly-overview-card"
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Aylık Finansal Özet
            </h3>
            <p className="text-xs text-slate-500">
              Tüketim harcamaları ve borç geri ödemeleri bağımsız olarak takip edilir.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {formatTurkishMonth()}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {/* 1. Gelir */}
          <div
            id="summary-item-income"
            onClick={() => onSelectTab('accounts')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-300 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold text-slate-600">Gelir</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {formatCurrency(snapshot.monthlyIncome)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Fiilen Yatan: {formatCurrency(snapshot.realizedMonthlyIncome)}
            </p>
          </div>

          {/* 2. Harcamalar (Consumer Spending Only) */}
          <div
            id="summary-item-expenses"
            onClick={() => onSelectTab('expenses')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold text-slate-600">Tüketim Harcamaları</span>
              <TrendingDown className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {formatCurrency(snapshot.monthlyExpenses)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Market, fatura, ulaşım vb.
            </p>
          </div>

          {/* 3. Borç Ödemeleri (Debt Repayments - Separated!) */}
          <div
            id="summary-item-debt-repayments"
            onClick={() => onSelectTab('debts')}
            className="p-3.5 sm:p-4 rounded-xl bg-purple-50/60 border border-purple-100 hover:border-purple-300 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-purple-700 mb-1">
              <span className="text-xs font-bold text-purple-800">Borç Ödemeleri</span>
              <CreditCardIcon className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-950">
              {formatCurrency(snapshot.totalDebtRepayments)}
            </div>
            <p className="text-[11px] text-purple-700 mt-1 font-medium">
              Kart & taksit ödemeleri (Bilanço)
            </p>
          </div>

          {/* 4. Yaklaşan Ödemeler */}
          <div
            id="summary-item-upcoming"
            onClick={() => onSelectTab('calendar')}
            className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-300 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold text-slate-600">Yaklaşan Ödemeler</span>
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {formatCurrency(snapshot.upcomingPaymentsTotal)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Ay sonuna kadar rezerve
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. RECENT TRANSACTIONS (With Visual Classification Tags - Requirement 9) */}
      {/* ========================================================================= */}
      <div
        id="dashboard-recent-transactions-card"
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Son İşlemler & Sınıflandırma
            </h3>
          </div>
          <button
            id="dash-view-all-expenses-btn"
            onClick={() => onSelectTab('expenses')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Tümünü Gör</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-700">Bu ay henüz harcama kaydı yok.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Harcamalarını veya borç ödemelerini anında kaydedebilirsin.
            </p>
            <button
              id="dash-add-first-expense-btn"
              onClick={onOpenQuickExpense}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              + Harcama Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentExpenses.map((exp) => {
              const label = EXPENSE_CATEGORY_LABELS[exp.category as any] || exp.category;
              const color = EXPENSE_CATEGORY_COLORS[exp.category as any] || '#64748B';
              const badge = getTransactionBadge(exp);

              return (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {label.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {exp.note || label}
                        </span>
                        {/* Transaction classification badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{label}</span>
                        <span>•</span>
                        <span>{formatShortDate(exp.date)}</span>
                        {exp.paymentSourceName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">
                              {exp.paymentSourceName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-xs sm:text-sm text-slate-900">
                      -{formatCurrency(exp.amount)}
                    </div>
                    {exp.isDebtPayment ? (
                      <span className="text-[10px] text-purple-700 font-bold block">
                        Borç Düşüldü
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Tüketim
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 9. AI COACH TEASER BANNER */}
      {/* ========================================================================= */}
      <div
        id="dash-ai-coach-banner"
        className="bg-emerald-950 text-white p-5 sm:p-6 rounded-2xl border border-emerald-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">CEBİ Yapay Zeka Finans Koçu</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200">
                Kişiselleştirilmiş Öneri
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed max-w-2xl">
              {snapshot.hasCashShortfall
                ? `Mevcut nakit açığın (-${formatCurrency(snapshot.cashShortfall)}) için borç önceliklendirme ve erteleme tavsiyeleri hazır.`
                : snapshot.isOverBudget
                ? `Bütçe açığını kapatmak ve kalan günleri güvenle tamamlamak için stratejiler hazır.`
                : `Bugünkü ${formatCurrency(snapshot.dailySafeSpending)} güvenli harcama limitine göre tasarruf ve birikim önerileri hazır.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('coach')}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-900 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
        >
          <span>Koç ile Konuş</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-700" />
        </button>
      </div>
    </div>
  );
};
