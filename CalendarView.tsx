import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  X,
  CreditCard,
  Landmark,
  Receipt,
  TrendingUp,
  Check,
} from 'lucide-react';
import {
  FinancialSnapshot,
  ScheduledPayment,
  DebtDetailItem,
} from './finance';
import {
  formatCurrency,
  formatTurkishDate,
  formatShortDate,
  getRelativeDaysInfo,
} from './financialCalculations';

interface CalendarViewProps {
  snapshot: FinancialSnapshot;
  scheduledPayments: ScheduledPayment[];
  onAddScheduledPayment: (payment: Omit<ScheduledPayment, 'id' | 'createdAt'>) => void;
  onTogglePaymentPaid: (id: string) => void;
  onDeleteScheduledPayment: (id: string) => void;
}

interface CalendarEventItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  type: 'card' | 'loan' | 'kmh' | 'bill' | 'income' | 'other';
  typeLabel: string;
  isPaid?: boolean;
  isOverdue?: boolean;
  daysUntilDue: number;
  originalItem?: any;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  snapshot,
  scheduledPayments,
  onAddScheduledPayment,
  onTogglePaymentPaid,
  onDeleteScheduledPayment,
}) => {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billCategory, setBillCategory] = useState('Fatura');
  const [billRecurring, setBillRecurring] = useState(true);

  // Combine debt payments, scheduled bills, and incomes into a single timeline
  const allEvents: CalendarEventItem[] = [];

  // 1. Debt payments
  snapshot.debtDetails.forEach((d) => {
    if (d.dueDate) {
      const rel = getRelativeDaysInfo(d.dueDate);
      allEvents.push({
        id: `debt-${d.id}`,
        name: d.name,
        amount: d.monthlyOrMin || d.amount,
        dueDate: d.dueDate,
        type: d.type.toLowerCase().includes('kart')
          ? 'card'
          : d.type.toLowerCase().includes('kredi')
          ? 'loan'
          : d.type.toLowerCase().includes('kmh')
          ? 'kmh'
          : 'other',
        typeLabel: d.type,
        isOverdue: rel.isOverdue,
        daysUntilDue: rel.days,
        originalItem: d,
      });
    }
  });

  // 2. Scheduled bills
  scheduledPayments.forEach((b) => {
    const rel = getRelativeDaysInfo(b.dueDate);
    allEvents.push({
      id: `bill-${b.id}`,
      name: b.name,
      amount: b.amount,
      dueDate: b.dueDate,
      type: 'bill',
      typeLabel: b.category || 'Fatura',
      isPaid: b.isPaid,
      isOverdue: !b.isPaid && rel.isOverdue,
      daysUntilDue: rel.days,
      originalItem: b,
    });
  });

  // 3. Incomes
  snapshot.incomes.forEach((inc) => {
    if (inc.paymentDate) {
      const rel = getRelativeDaysInfo(inc.paymentDate);
      allEvents.push({
        id: `inc-${inc.id}`,
        name: `${inc.name} (Gelir)`,
        amount: inc.amount,
        dueDate: inc.paymentDate,
        type: 'income',
        typeLabel: 'Gelir',
        daysUntilDue: rel.days,
        originalItem: inc,
      });
    }
  });

  // Sort chronologically
  allEvents.sort((a, b) => (new Date(a.dueDate).getTime() || 0) - (new Date(b.dueDate).getTime() || 0));

  // Group into Overdue, This Week (0-7), This Month (8-30), Later (>30)
  const overdueItems = allEvents.filter((e) => e.isOverdue && !e.isPaid && e.type !== 'income');
  const thisWeekItems = allEvents.filter(
    (e) => !e.isOverdue && e.daysUntilDue >= 0 && e.daysUntilDue <= 7
  );
  const thisMonthItems = allEvents.filter(
    (e) => !e.isOverdue && e.daysUntilDue > 7 && e.daysUntilDue <= 30
  );
  const laterItems = allEvents.filter((e) => e.daysUntilDue > 30);

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(billAmount) || 0;
    if (amount <= 0 || !billName) return;

    onAddScheduledPayment({
      name: billName.trim(),
      amount,
      dueDate: billDueDate,
      category: billCategory,
      type: 'bill',
      isPaid: false,
      isRecurring: billRecurring,
    });

    setOpenAddModal(false);
    setBillName('');
    setBillAmount('');
  };

  const renderEventCard = (item: CalendarEventItem) => {
    const isIncome = item.type === 'income';

    return (
      <div
        key={item.id}
        className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
          item.isPaid
            ? 'border-emerald-200 bg-emerald-50/30 opacity-70'
            : item.isOverdue
            ? 'border-rose-200 bg-rose-50/60'
            : isIncome
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              item.isPaid
                ? 'bg-emerald-100 text-emerald-700'
                : item.isOverdue
                ? 'bg-rose-100 text-rose-700'
                : isIncome
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {item.isPaid ? (
              <Check className="w-5 h-5 stroke-[2.5]" />
            ) : isIncome ? (
              <TrendingUp className="w-5 h-5" />
            ) : item.type === 'card' ? (
              <CreditCard className="w-5 h-5" />
            ) : item.type === 'loan' ? (
              <Landmark className="w-5 h-5" />
            ) : (
              <Receipt className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 truncate">{item.name}</span>
              {item.isPaid && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  Ödendi
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span className="font-medium text-slate-700">{item.typeLabel}</span>
              <span>•</span>
              <span>{formatTurkishDate(item.dueDate)}</span>
              <span>•</span>
              <span
                className={`font-semibold ${
                  item.isOverdue
                    ? 'text-rose-700'
                    : item.daysUntilDue === 0
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
              >
                {item.isOverdue
                  ? `${Math.abs(item.daysUntilDue)} gün gecikti`
                  : item.daysUntilDue === 0
                  ? 'Bugün'
                  : `${item.daysUntilDue} gün kaldı`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div
              className={`font-black text-sm sm:text-base ${
                isIncome ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(item.amount)}
            </div>
          </div>

          {/* Toggle paid button for scheduled bills */}
          {item.type === 'bill' && item.originalItem && (
            <button
              title={item.isPaid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
              onClick={() => onTogglePaymentPaid(item.originalItem.id)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                item.isPaid
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          {item.type === 'bill' && item.originalItem && (
            <button
              title="Sil"
              onClick={() => {
                if (confirm('Bu hatırlatıcıyı silmek istediğinize emin misiniz?')) {
                  onDeleteScheduledPayment(item.originalItem.id);
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Ödeme & Gelir Takvimi
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kredi kartı son ödeme günleri, kredi taksitleri ve faturaların kronolojik akışı
          </p>
        </div>

        <button
          id="add-calendar-bill-btn"
          onClick={() => setOpenAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Fatura / Hatırlatıcı Ekle</span>
        </button>
      </div>

      {/* OVERDUE ALERTS SECTION */}
      {overdueItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-black uppercase tracking-wider">
              Dikkat: Gecikmiş Ödemeler ({overdueItems.length})
            </h2>
          </div>
          <p className="text-xs text-rose-700">
            Bu ödemelerin vadesi geçmiş durumda. Gecikme faizinden korunmak için öncelikle bu borçları kapatmanız önerilir.
          </p>
          <div className="space-y-2 pt-1">{overdueItems.map(renderEventCard)}</div>
        </div>
      )}

      {/* THIS WEEK SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Bu Hafta Bekleyenler ({thisWeekItems.length})
          </h3>
          <span className="text-xs text-slate-500">Önümüzdeki 7 gün</span>
        </div>

        {thisWeekItems.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Önümüzdeki 7 gün içinde bekleyen ödeme bulunmuyor.
          </div>
        ) : (
          <div className="space-y-2.5">{thisWeekItems.map(renderEventCard)}</div>
        )}
      </div>

      {/* THIS MONTH SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Bu Ayın Kalanı ({thisMonthItems.length})
          </h3>
          <span className="text-xs text-slate-500">8 - 30 gün arası</span>
        </div>

        {thisMonthItems.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Bu ayın devamında başka ödeme planlanmamış.
          </div>
        ) : (
          <div className="space-y-2.5">{thisMonthItems.map(renderEventCard)}</div>
        )}
      </div>

      {/* LATER SECTION */}
      {laterItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              İleri Tarihli ({laterItems.length})
            </h3>
            <span className="text-xs text-slate-500">Gelecek aylar</span>
          </div>
          <div className="space-y-2.5">{laterItems.map(renderEventCard)}</div>
        </div>
      )}

      {/* ADD BILL / REMINDER MODAL */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                Yeni Fatura / Hatırlatıcı Ekle
              </h3>
              <button
                onClick={() => setOpenAddModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ödeme Adı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ev İnterneti, Su Faturası, Sigorta"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tutar (₺)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Örn: 420"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Son Ödeme Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 outline-hidden"
                >
                  <option value="Fatura">Fatura (Elektrik / Su / Gaz)</option>
                  <option value="İnternet">İnternet & Telefon</option>
                  <option value="Kira">Kira</option>
                  <option value="Abonelik">Abonelik (Netflix vb.)</option>
                  <option value="Sigorta">Sigorta / Kasko</option>
                  <option value="Aidat">Site / Apartman Aidatı</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring-checkbox"
                  checked={billRecurring}
                  onChange={(e) => setBillRecurring(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="recurring-checkbox" className="text-xs text-slate-700 font-medium">
                  Her ay tekrarlansın (Düzenli Fatura)
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Hatırlatıcıyı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
