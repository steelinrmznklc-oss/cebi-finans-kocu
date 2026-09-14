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
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  BankAccount,
  CreditCard as CreditCardType,
} from '../types/finance';
import {
  formatCurrency,
  formatTurkishDate,
  formatShortDate,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
} from '../utils/financialCalculations';
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
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Harcama Yönetimi
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Toplam {expenses.length} işlem kaydı • Tüketim harcamaları:{' '}
            <strong className="text-slate-900">{formatCurrency(consumerSpendingTotal)}</strong>
            {totalFilteredAmount !== consumerSpendingTotal && (
              <span className="ml-1 text-slate-400">
                (Filtrelenen tüm işlemler: {formatCurrency(totalFilteredAmount)})
              </span>
            )}
          </p>
        </div>

        <button
          id="expenses-add-btn"
          onClick={onOpenQuickExpense}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Yeni Harcama Ekle</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="expenses-search-input"
              type="text"
              placeholder="Açıklama, kategori veya ödeme kaynağında ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 transition outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              id="expenses-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 font-medium transition outline-hidden"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Tümü
          </button>
          {['market', 'yemek', 'ulasim', 'fatura', 'kira', 'alisveris', 'abonelik'].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Harcama Bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Arama kriterlerinize uyan bir harcama kaydı yok veya henüz harcama eklemediniz.
            </p>
            <button
              id="empty-add-expense-btn"
              onClick={onOpenQuickExpense}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              + İlk Harcamayı Ekle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => {
              const label = EXPENSE_CATEGORY_LABELS[exp.category as ExpenseCategory] || exp.category;
              const color = EXPENSE_CATEGORY_COLORS[exp.category as ExpenseCategory] || '#64748B';

              return (
                <div
                  key={exp.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-xs"
                      style={{ backgroundColor: color }}
                    >
                      {label.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {exp.note || label}
                        </span>
                        {(() => {
                          const badge = getTransactionBadge(exp);
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span>•</span>
                        <span>{formatTurkishDate(exp.date)}</span>
                        {exp.paymentSourceName && (
                          <>
                            <span>•</span>
                            <span className="truncate text-slate-600">
                              💳 {exp.paymentSourceName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base text-slate-900">
                        -{formatCurrency(exp.amount)}
                      </div>
                      {exp.isDebtPayment && (
                        <div className="text-[10px] text-purple-600 font-medium">
                          Borç Transferi
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        title="Düzenle"
                        onClick={() => setEditingExpense(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Sil"
                        onClick={() => {
                          if (confirm('Bu harcamayı silmek istediğinize emin misiniz?')) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Harcamayı Düzenle</h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tutar (₺)</label>
                <input
                  type="number"
                  step="any"
                  value={editingExpense.amount}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-lg font-bold border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={editingExpense.note}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, note: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={editingExpense.category}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                >
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) =>
                    setEditingExpense({ ...editingExpense, date: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
