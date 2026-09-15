import React, { useState } from 'react';
import {
  X,
  Plus,
  ShoppingBag,
  Utensils,
  Car,
  ReceiptText,
  Home,
  Shirt,
  HeartPulse,
  Tv,
  Film,
  GraduationCap,
  Sparkles,
  CreditCard as CreditCardIcon,
  Building2,
  Wallet,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  BankAccount,
  CreditCard,
} from './finance';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from './financialCalculations';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  accounts: BankAccount[];
  creditCards: CreditCard[];
}

const CATEGORIES: { key: ExpenseCategory; icon: React.FC<{ className?: string }> }[] = [
  { key: 'market', icon: ShoppingBag },
  { key: 'yemek', icon: Utensils },
  { key: 'ulasim', icon: Car },
  { key: 'fatura', icon: ReceiptText },
  { key: 'kira', icon: Home },
  { key: 'alisveris', icon: Shirt },
  { key: 'saglik', icon: HeartPulse },
  { key: 'eglence', icon: Film },
  { key: 'abonelik', icon: Tv },
  { key: 'egitim', icon: GraduationCap },
  { key: 'diger', icon: Sparkles },
];

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  accounts,
  creditCards,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('market');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('cash');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickAddAmount = (addValue: number) => {
    const curr = parseFloat(amountStr) || 0;
    setAmountStr(String(curr + addValue));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) {
      setError('Lütfen geçerli bir harcama tutarı giriniz.');
      return;
    }

    let paymentSourceName = 'Nakit';
    let paymentSourceType: 'bank_account' | 'credit_card' | 'nakit' | 'diger' = 'nakit';
    let paymentSourceId: string | undefined = undefined;

    if (selectedSourceId.startsWith('acc-')) {
      const acc = accounts.find((a) => a.id === selectedSourceId);
      if (acc) {
        paymentSourceName = `${acc.bankName} (${acc.accountName})`;
        paymentSourceType = 'bank_account';
        paymentSourceId = acc.id;
      }
    } else if (selectedSourceId.startsWith('card-')) {
      const card = creditCards.find((c) => c.id === selectedSourceId);
      if (card) {
        paymentSourceName = `${card.bank} ${card.cardName}`;
        paymentSourceType = 'credit_card';
        paymentSourceId = card.id;
      }
    }

    onAddExpense({
      amount,
      category,
      date,
      paymentSourceId,
      paymentSourceName,
      paymentSourceType,
      note: note.trim() || EXPENSE_CATEGORY_LABELS[category],
    });

    // Reset and close
    setAmountStr('');
    setNote('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="quick-expense-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hızlı Harcama Ekle</h2>
            <p className="text-xs text-slate-500">Saniyeler içinde harcamanı kaydet</p>
          </div>
          <button
            id="close-quick-expense-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Amount Display & Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Harcama Tutarı (₺)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                ₺
              </span>
              <input
                id="quick-expense-amount-input"
                type="number"
                step="any"
                min="0"
                autoFocus
                placeholder="0"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-11 pr-4 py-3.5 text-2xl font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition outline-hidden"
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[50, 100, 250, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  +{val} ₺
                </button>
              ))}
            </div>
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kategori
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(({ key, icon: IconComponent }) => {
                const isSelected = category === key;
                const label = EXPENSE_CATEGORY_LABELS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[key] }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold truncate w-full">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ödeme Kaynağı
            </label>
            <select
              id="quick-expense-source-select"
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
            >
              <option value="cash">💵 Nakit</option>
              {accounts.length > 0 && (
                <optgroup label="Banka Hesapları">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      🏦 {acc.bankName} - {acc.accountName} ({acc.balance.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </optgroup>
              )}
              {creditCards.length > 0 && (
                <optgroup label="Kredi Kartları">
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      💳 {card.bank} {card.cardName} (Kullanılabilir: {card.availableLimit.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Note and Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Açıklama (İsteğe Bağlı)
              </label>
              <input
                id="quick-expense-note-input"
                type="text"
                placeholder="Örn: Market alışverişi"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 transition outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tarih
              </label>
              <input
                id="quick-expense-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 transition outline-hidden"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="submit-quick-expense-btn"
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Harcamayı Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
