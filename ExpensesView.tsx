import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  Building2,
  Wallet,
  X,
  Check,
  TrendingDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  BankAccount,
  CreditCard as CreditCardType,
} from './finance';
import {
  formatCurrency,
  formatTurkishDate,
  formatShortDate,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
} from './financialCalculations';
import { getTransactionBadge } from './DashboardView';

interface ExpensesViewProps {
  expenses: Expense[];
  accounts: BankAccount[];
  creditCards: CreditCardType[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (id: string, updated: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  onOpenQuickExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  accounts,
  creditCards,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenQuickExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
        const note = (exp.note || '').toLowerCase();
        const catLabel = (EXPENSE_CATEGORY_LABELS[exp.category as ExpenseCategory] || '').toLowerCase();
        const src = (exp.paymentSourceName || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        const matchesSearch = !search || note.includes(search) || catLabel.includes(search) || src.includes(search);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedCategory, searchTerm]);

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const consumerSpendingTotal = useMemo(() => {
    return expenses
      .filter((e) => !e.isDebtPayment)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const debtPaymentTotal = useMemo(() => {
    return expenses
      .filter((e) => e.isDebtPayment)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    onUpdateExpense(editingExpense.id, {
      amount: editingExpense.amount,
      note: editingExpense.note,
      category: editingExpense.category,
      date: editingExpense.date,
    });
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. PREMIUM HEADER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Harcama Yönetimi
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Tüm Harcamalarını Takip Et
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              Harcamalarını kategorize et, düzenle ve kontrol et
            </p>
          </div>

          <button
            id="expenses-add-btn"
            onClick={onOpenQuickExpense}
            className="px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold flex items-center gap-2 transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Harcama</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Toplam İşlem</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {expenses.length}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Tüketim Harcaması</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatCurrency(consumerSpendingTotal)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Borç Ödemeleri</span>
            <span className="text-xl sm:text-2xl font-black text-purple-400">
              {formatCurrency(debtPaymentTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Filtrele & Ara</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="expenses-search-input"
              type="text"
              placeholder="Harcama adı, kategori veya kaynak ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                title="Temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              id="expenses-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium transition outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Tümü
          </button>
          {['market', 'yemek', 'ulasim', 'fatura', 'kira', 'alisveris', 'abonelik'].map((cat) => {
            const isSelected = selectedCategory === cat;
            const catColor = EXPENSE_CATEGORY_COLORS[cat as ExpenseCategory];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                style={isSelected ? { backgroundColor: catColor } : undefined}
              >
                {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. EXPENSES LIST */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Harcama Bulunamadı</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              {searchTerm || selectedCategory !== 'all'
                ? 'Arama kriterlerinize uyan harcama yok. Filtreleri temizlemeyi deneyin.'
                : 'Henüz harcama kaydınız yok. İlk harcamayı ekleyerek başlayın.'}
            </p>
            <button
              id="empty-add-expense-btn"
              onClick={onOpenQuickExpense}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition"
            >
              + İlk Harcamayı Ekle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => {
              const label = EXPENSE_CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category;
              const color = EXPENSE_CATEGORY_COLORS[exp.category as ExpenseCategory] || '#64748B';
              const badge = getTransactionBadge(exp);

              return (
                <div
                  key={exp.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left Side - Category Icon & Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={label}
                    >
                      {label.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-900 truncate max-w-[200px]">
                          {exp.note || label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                        <span className="font-medium text-slate-600">{label}</span>
                        <span>•</span>
                        <span>{formatShortDate(exp.date)}</span>
                        {exp.paymentSourceName && (
                          <>
                            <span>•</span>
                            <span className="truncate text-slate-600">
                              {exp.paymentSourceType === 'credit_card' ? '💳' : '🏦'} {exp.paymentSourceName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="text-right">
                      <div className={`font-black text-lg sm:text-base ${exp.isDebtPayment ? 'text-purple-600' : 'text-slate-900'}`}>
                        −{formatCurrency(exp.amount)}
                      </div>
                      {exp.isDebtPayment && (
                        <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                          Borç Ödemesi
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 sm:opacity-100 group-hover:opacity-100 transition">
                      <button
                        id={`expense-edit-${exp.id}`}
                        title="Düzenle"
                        onClick={() => setEditingExpense(exp)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        id={`expense-delete-${exp.id}`}
                        title="Sil"
                        onClick={() => {
                          if (confirm('Bu harcamayı silmek istediğinize emin misiniz?')) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. EDIT EXPENSE MODAL */}
      {/* ========================================================================= */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Harcamayı Düzenle</h3>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-amount" className="block text-xs font-bold text-slate-700 mb-2">
                  Tutar (₺)
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  step="any"
                  value={editingExpense.amount}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-lg font-bold border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="edit-note" className="block text-xs font-bold text-slate-700 mb-2">
                  Açıklama
                </label>
                <input
                  id="edit-note"
                  type="text"
                  placeholder="Örn: Market alışverişi"
                  value={editingExpense.note}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, note: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-xs font-bold text-slate-700 mb-2">
                  Kategori
                </label>
                <select
                  id="edit-category"
                  value={editingExpense.category}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                >
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-date" className="block text-xs font-bold text-slate-700 mb-2">
                  Tarih
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, date: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
