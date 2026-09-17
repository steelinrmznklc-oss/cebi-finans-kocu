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
  ChevronRight,
  Plus,
  Clock,
  PiggyBank,
  CreditCard as CreditCardIcon,
  Layers,
} from 'lucide-react';

import {
  FinancialSnapshot,
  Expense,
  BankAccount,
  Income,
  ScheduledPayment,
} from './finance';

import {
  formatCurrency,
  formatTurkishDate,
  formatShortDate,
  formatTurkishMonth,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
} from './financialCalculations';

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

function getTransactionTitle(exp: Expense): string {
  if (exp.isDebtPayment) {
    if (exp.relatedDebtType === 'card') return 'Kredi kartı borç ödemesi';
    if (exp.relatedDebtType === 'loan') return 'Kredi taksiti ödemesi';
    if (exp.relatedDebtType === 'kmh') return 'KMH ödemesi';
    return 'Borç ödemesi';
  }

  const category = String(exp.category || '').toLowerCase().trim();

  const categoryTitles: Record<string, string> = {
    market: 'Market harcaması',
    yemek: 'Yemek harcaması',
    ulasim: 'Ulaşım harcaması',
    fatura: 'Fatura ödemesi',
    kira: 'Kira ödemesi',
    alisveris: 'Alışveriş harcaması',
    saglik: 'Sağlık harcaması',
    eglence: 'Eğlence harcaması',
    abonelik: 'Abonelik ödemesi',
    egitim: 'Eğitim harcaması',
    akaryakit: 'Akaryakıt harcaması',
    ev: 'Ev harcaması',
    giyim: 'Giyim harcaması',
    elektronik: 'Elektronik harcaması',
    sigorta: 'Sigorta ödemesi',
    vergi: 'Vergi ödemesi',
    diger: 'Diğer harcama',
  };

  if (categoryTitles[category]) return categoryTitles[category];

  const label =
    EXPENSE_CATEGORY_LABELS[exp.category as keyof typeof EXPENSE_CATEGORY_LABELS];

  if (label) return `${label} harcaması`;

  return 'Harcama';
}

function getPaymentSourceDisplay(exp: Expense): string {
  if (!exp.paymentSourceName) return '';

  return String(exp.paymentSourceName).replace(/\s+/g, ' ').trim();
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  expenses,
  accounts,
  incomes = [],
  scheduledPayments = [],
  onSelectTab,
  onOpenQuickExpense,
}) => {
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const upcomingPayments = snapshot.debtDetails
    .filter((d) => d.dueDate)
    .slice(0, 5);

  const pendingIncomes =
    incomes.length > 0
      ? incomes.filter((inc) => inc.amount > 0)
      : snapshot.incomes;

  const todayStr = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6 w-full overflow-hidden"
        style={{ color: '#ffffff' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>
                {formatTurkishMonth()} Dönemi
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight break-words" style={{ color: '#ffffff' }}>
              Finansal Durumun Bugün
            </h1>

            <p className="text-sm mt-2" style={{ color: '#cbd5e1' }}>
              {todayStr}
            </p>
          </div>

          <button
            id="dash-talk-to-coach-btn"
            onClick={() => onSelectTab('coach')}
            className="px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 transition shadow-lg hover:shadow-xl flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Koça Danış</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-700">
          <button
            id="quick-action-add-expense-btn"
            onClick={onOpenQuickExpense}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Harcama Ekle</span>
          </button>

          <button
            id="quick-action-add-income-btn"
            onClick={() => onSelectTab('accounts')}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>+ Gelir Ekle</span>
          </button>

          <button
            id="quick-action-pay-debt-btn"
            onClick={() => onSelectTab('debts')}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <CreditCardIcon className="w-4 h-4" />
            <span>+ Borç Öde</span>
          </button>

          <button
            id="quick-action-add-payment-btn"
            onClick={() => onSelectTab('calendar')}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>+ Ödeme Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <div
          id="card-current-available-cash"
          onClick={() => onSelectTab('accounts')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group min-w-0 overflow-hidden"
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 truncate">
                  Şu An Kullanılabilir
                </span>
              </div>

              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition flex-shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div
              className="font-black text-slate-900 tracking-tight leading-none"
              style={{ fontSize: 'clamp(2rem, 9vw, 3rem)', overflowWrap: 'anywhere' }}
            >
              {formatCurrency(snapshot.totalBalance)}
            </div>

            <p className="text-sm text-slate-600 mt-3 font-medium">
              Banka hesaplarındaki toplam bakiye
            </p>

            <p className="text-xs text-slate-500 mt-1">
              *Henüz yatmamış gelirler dahil değildir.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm gap-3">
            <span className="text-slate-600 font-medium min-w-0 truncate">
              {accounts.length > 0 ? `${accounts.length} hesapta hazır` : 'Hesap eklemedin'}
            </span>

            <span className="text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition flex-shrink-0">
              <span>Detay</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div
          id="card-daily-safe-spending"
          className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition min-w-0 overflow-hidden ${
            snapshot.hasCashShortfall
              ? 'bg-amber-50 border-amber-300'
              : snapshot.isOverBudget
              ? 'bg-rose-50 border-rose-300'
              : 'bg-emerald-50 border-emerald-300'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    snapshot.hasCashShortfall
                      ? 'bg-amber-500'
                      : snapshot.isOverBudget
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  Günlük Güvenli Harcama
                </span>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-900 flex-shrink-0 whitespace-nowrap">
                {snapshot.remainingDays} gün kaldı
              </span>
            </div>

            <div className="font-black tracking-tight leading-none mt-2" style={{ fontSize: 'clamp(2rem, 9vw, 3rem)', overflowWrap: 'anywhere' }}>
              {snapshot.hasCashShortfall || snapshot.dailySafeSpending <= 0 ? (
                <span className="text-amber-900">0 ₺/gün</span>
              ) : (
                <span className={snapshot.isOverBudget ? 'text-rose-900' : 'text-emerald-900'}>
                  {formatCurrency(snapshot.dailySafeSpending)}/gün
                </span>
              )}
            </div>

            <p className={`text-sm font-semibold mt-3 ${
              snapshot.hasCashShortfall
                ? 'text-amber-900'
                : snapshot.isOverBudget
                ? 'text-rose-900'
                : 'text-emerald-900'
            }`}>
              {snapshot.hasCashShortfall
                ? '⚠️ Mevcut nakdin ödemeleri karşılamıyor'
                : snapshot.isOverBudget
                ? '⚠️ Aylık bütçe aşıldı'
                : '✓ Zorunlu ödemeler dikkate alındı'}
            </p>

            <p className="text-xs text-slate-700 mt-2">
              {snapshot.hasCashShortfall
                ? `Ay sonuna kadar ${formatCurrency(snapshot.upcomingPaymentsTotal)} ödemen var.`
                : 'Bu günlük tutara harcayarak ay sonunu güvenle kapatabilirsin.'}
            </p>
          </div>

          <div className={`mt-4 pt-4 border-t flex items-center justify-between text-sm gap-3 ${
            snapshot.hasCashShortfall
              ? 'border-amber-300'
              : snapshot.isOverBudget
              ? 'border-rose-300'
              : 'border-emerald-300'
          }`}>
            <span className={`min-w-0 ${
              snapshot.hasCashShortfall
                ? 'text-amber-800'
                : snapshot.isOverBudget
                ? 'text-rose-800'
                : 'text-emerald-800'
            }`}>
              Zorunlu Rezerve: {formatCurrency(snapshot.upcomingPaymentsTotal)}
            </span>

            <button
              onClick={() => onSelectTab('coach')}
              className="font-bold underline text-slate-900 transition flex-shrink-0"
            >
              Analiz
            </button>
          </div>
        </div>
      </div>

      {snapshot.hasCashShortfall && (
        <div
          id="alert-cash-shortfall"
          className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-md flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black tracking-tight mb-1">⚠️ Nakit Rezervi Yetersiz</h3>

            <p className="text-sm font-medium mb-2">
              Yaklaşan zorunlu ödemelerini karşılamak için{' '}
              <strong className="font-black">{formatCurrency(snapshot.cashShortfall)}</strong>{' '}
              açığın var.
            </p>

            <p className="text-xs text-amber-900 opacity-90">
              Mevcut bakiye ({formatCurrency(snapshot.totalBalance)}) → Zorunlu ödemeler ({formatCurrency(snapshot.upcomingPaymentsTotal)})
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
              <div className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 font-bold">
                Günlük güvenli: 0 ₺
              </div>
              <p>Beklenen gelirlerin hesaba geçene kadar harcama yapma.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <div
          id="dashboard-upcoming-payments-card"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-w-0 overflow-hidden"
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-5 h-5 text-slate-700 flex-shrink-0" />
                <h3 className="text-lg font-black text-slate-900 truncate">Yaklaşan Ödemeler</h3>
              </div>

              <button
                id="dash-view-calendar-btn"
                onClick={() => onSelectTab('calendar')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition flex-shrink-0"
              >
                <span>Tüm Takvim</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-medium">
              Borç temerrüdünü önlemek için ayrılmış tutar
            </p>

            {upcomingPayments.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 my-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Yaklaşan ödeme yok</p>
                <p className="text-xs text-slate-500 mt-1">Tüm ödemelerin güncel durumda.</p>

                <button
                  onClick={() => onSelectTab('calendar')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  + Ödeme Planla
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingPayments.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-lg border transition flex items-center justify-between gap-3 min-w-0 ${
                      item.isOverdue
                        ? 'border-rose-300 bg-rose-50/70'
                        : item.daysUntilDue === 0
                        ? 'border-amber-300 bg-amber-50/70'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          item.isOverdue
                            ? 'bg-rose-200 text-rose-700'
                            : item.daysUntilDue === 0
                            ? 'bg-amber-200 text-amber-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {item.type} • {formatTurkishDate(item.dueDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-[72px]">
                      <div className="font-black text-sm text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.monthlyOrMin || item.amount)}
                      </div>

                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${
                          item.isOverdue
                            ? 'bg-rose-200 text-rose-800'
                            : item.daysUntilDue === 0
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.isOverdue ? 'Gecikmiş' : item.daysUntilDue === 0 ? 'Bugün' : `${item.daysUntilDue}g`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs gap-3">
            <span className="text-slate-600 font-medium">Toplam Yaklaşan:</span>
            <span className="font-black text-slate-900 text-sm whitespace-nowrap">
              {formatCurrency(snapshot.upcomingPaymentsTotal)}
            </span>
          </div>
        </div>

        <div
          id="dashboard-expected-income-card"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-w-0 overflow-hidden"
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <h3 className="text-lg font-black text-slate-900 truncate">Beklenen Gelir</h3>
              </div>

              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-300 flex-shrink-0 whitespace-nowrap">
                Henüz hesaba geçmedi
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-medium">
              Mevcut bakiyeye dahil edilmez, sadece bekleniyor
            </p>

            {pendingIncomes.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 my-3">
                <PiggyBank className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Beklenen gelir yok</p>
                <p className="text-xs text-slate-500 mt-1">Maaş, kira veya ek gelir ekleyebilirsin.</p>

                <button
                  onClick={() => onSelectTab('accounts')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  + Gelir Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{inc.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {inc.isRecurring ? 'Düzenli' : 'Tek seferlik'} •{' '}
                          {inc.paymentDate
                            ? formatTurkishDate(inc.paymentDate)
                            : inc.dayOfMonth
                            ? `Her ${inc.dayOfMonth}. gün`
                            : 'Ay içinde'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-sm text-emerald-700 whitespace-nowrap">
                        +{formatCurrency(inc.amount)}
                      </div>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-800 mt-0.5">
                        Bekleniyor
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs gap-3">
            <span className="text-slate-600 font-medium">Toplam Beklenen:</span>
            <span className="font-black text-emerald-700 text-sm whitespace-nowrap">
              +{formatCurrency(snapshot.pendingMonthlyIncome || snapshot.monthlyIncome)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Aylık Finansal Özet</h3>
            <p className="text-xs text-slate-500 mt-1">Tüketim harcamaları ve borç ödemeleri ayrı takip edilir</p>
          </div>
          <span className="text-xs font-bold text-slate-500 flex-shrink-0">{formatTurkishMonth()}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div id="summary-item-income" onClick={() => onSelectTab('accounts')} className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-50/50 border border-emerald-200 hover:border-emerald-300 transition cursor-pointer min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800">Gelir</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-950 break-words">{formatCurrency(snapshot.monthlyIncome)}</div>
            <p className="text-[10px] text-emerald-700 mt-2 font-medium">Fiilen: {formatCurrency(snapshot.realizedMonthlyIncome)}</p>
          </div>

          <div id="summary-item-expenses" onClick={() => onSelectTab('expenses')} className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-50/50 border border-slate-200 hover:border-slate-300 transition cursor-pointer min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Harcamalar</span>
              <TrendingDown className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-black text-slate-900 break-words">{formatCurrency(snapshot.monthlyExpenses)}</div>
            <p className="text-[10px] text-slate-600 mt-2 font-medium">Market, fatura, ulaşım</p>
          </div>

          <div id="summary-item-debt-repayments" onClick={() => onSelectTab('debts')} className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-50/50 border border-purple-200 hover:border-purple-300 transition cursor-pointer min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-800">Borç Ödemeleri</span>
              <CreditCardIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-950 break-words">{formatCurrency(snapshot.totalDebtRepayments)}</div>
            <p className="text-[10px] text-purple-700 mt-2 font-medium">Kart & taksit ödemeleri</p>
          </div>

          <div id="summary-item-upcoming" onClick={() => onSelectTab('calendar')} className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-200 hover:border-blue-300 transition cursor-pointer min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800">Yaklaşan</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-950 break-words">{formatCurrency(snapshot.upcomingPaymentsTotal)}</div>
            <p className="text-[10px] text-blue-700 mt-2 font-medium">Ay sonuna kadar rezerve</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden" id="dashboard-recent-transactions">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-5 h-5 text-slate-700 flex-shrink-0" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Son İşlemler</h3>
          </div>

          <button
            id="dash-view-all-expenses-btn"
            onClick={() => onSelectTab('expenses')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition flex-shrink-0"
          >
            <span>Tümünü Gör</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-700">Bu ay henüz harcama yok</p>
            <p className="text-xs text-slate-500 mt-1">Harcamalarını veya borç ödemelerini anında kaydedebilirsin.</p>

            <button
              id="dash-add-first-expense-btn"
              onClick={onOpenQuickExpense}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              + Harcama Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentExpenses.map((exp) => {
              const label =
                EXPENSE_CATEGORY_LABELS[
                  exp.category as keyof typeof EXPENSE_CATEGORY_LABELS
                ] || exp.category;

              const color =
                EXPENSE_CATEGORY_COLORS[
                  exp.category as keyof typeof EXPENSE_CATEGORY_COLORS
                ] || '#64748B';

              const badge = getTransactionBadge(exp);
              const transactionTitle = getTransactionTitle(exp);
              const paymentSource = getPaymentSourceDisplay(exp);

              return (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3 min-w-0 overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {String(label || 'H').slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                        <span className="font-semibold text-sm text-slate-900">{transactionTitle}</span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border} shrink-0`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="whitespace-nowrap">{label}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{formatShortDate(exp.date)}</span>

                        {paymentSource && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600 truncate" style={{ maxWidth: 'min(180px, 45vw)' }} title={paymentSource}>
                              {paymentSource}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0" style={{ width: 'clamp(76px, 22vw, 120px)', minWidth: '76px' }}>
                    <div className="font-black text-slate-900 whitespace-nowrap leading-tight" style={{ fontSize: 'clamp(0.82rem, 3.5vw, 0.95rem)' }}>
                      −{formatCurrency(exp.amount)}
                    </div>

                    {exp.isDebtPayment ? (
                      <span className="text-[10px] text-purple-700 font-bold block mt-0.5">Borç Düşüldü</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Harcama</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-base font-black text-white">CEBİ Yapay Zeka Koçu</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200">Kişiselleştirilmiş</span>
            </div>

            <p className="text-sm text-emerald-100 leading-relaxed max-w-2xl">
              {snapshot.hasCashShortfall
                ? `Nakit açığın (-${formatCurrency(snapshot.cashShortfall)}) için borç önceliklendirme tavsiyeleri hazır.`
                : snapshot.isOverBudget
                ? 'Bütçe açığını kapatmak için stratejiler sunabilirim.'
                : `${formatCurrency(snapshot.dailySafeSpending)} güvenli harcama limitine göre tasarruf önerileri hazır.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('coach')}
          className="px-4 py-2.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-900 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl shrink-0"
        >
          <span>Koç ile Konuş</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
