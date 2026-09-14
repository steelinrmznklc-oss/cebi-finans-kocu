import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Award,
  ArrowRight,
} from 'lucide-react';
import {
  FinancialSnapshot,
  Expense,
  ExpenseCategory,
} from './finance';
import {
  formatCurrency,
  formatTurkishMonth,
  calculateMonthlyExpenses,
  calculateCategoryBreakdown,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
} from './financialCalculations';

interface ReportsViewProps {
  snapshot: FinancialSnapshot;
  expenses: Expense[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ snapshot, expenses }) => {
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  // Generate 6 available months for selection (current month + 5 past months)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${d.getFullYear()}-${mm}`;
      const label = `${formatTurkishMonth(d)}${i === 0 ? ' (Güncel Ay)' : ''}`;
      list.push({ key, label });
    }
    return list;
  }, []);

  const selectedDate = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [selectedMonth]);

  const totalIncome = snapshot.monthlyIncome;
  const totalExpense = useMemo(() => {
    return calculateMonthlyExpenses(expenses, selectedDate);
  }, [expenses, selectedDate]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Calculate Financial Health Score (0-100)
  let healthScore = 70;
  if (savingsRate > 20) healthScore += 15;
  else if (savingsRate > 0) healthScore += 5;
  else healthScore -= 20;

  if (snapshot.debtRatio < 50) healthScore += 15;
  else if (snapshot.debtRatio < 100) healthScore += 5;
  else healthScore -= 15;

  if (snapshot.isOverBudget) healthScore -= 20;
  healthScore = Math.max(15, Math.min(98, healthScore));

  // Category percentages calculated specifically for the selected month
  const categories = useMemo(() => {
    return calculateCategoryBreakdown(expenses, selectedDate);
  }, [expenses, selectedDate]);

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Aylık Finansal Rapor
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gelir, harcama dağılımı ve finansal sağlık skoru analizi
          </p>
        </div>

        {/* Month Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            id="report-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition outline-hidden cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CORE 4 SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toplam Gelir
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Aylık net giriş</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toplam Harcama
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Şu ana kadar yapılan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Net Tasarruf / Açık
          </span>
          <div
            className={`text-xl sm:text-2xl font-black mt-1 ${
              netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {netSavings >= 0 ? '+' : ''}
            {formatCurrency(netSavings)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tasarruf Oranı:{' '}
            <strong className={savingsRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              %{savingsRate}
            </strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toplam Borç
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(snapshot.totalDebt)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Borç/Gelir: <strong>%{snapshot.debtRatio}</strong>
          </p>
        </div>
      </div>

      {/* HEALTH SCORE & INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Financial Health Score */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Finansal Sağlık Skoru
              </span>
              <Award className="w-5 h-5 text-amber-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{healthScore}</span>
              <span className="text-slate-400 text-sm font-bold">/ 100</span>
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 75
                    ? 'bg-emerald-500'
                    : healthScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${healthScore}%` }}
              ></div>
            </div>

            <p className="text-xs text-slate-300 mt-4 leading-relaxed">
              {healthScore >= 75
                ? 'Harika! Gelir ve harcama dengen sağlam. Ay sonuna kadar tasarruf potansiyelin yüksek.'
                : healthScore >= 50
                ? 'Dengeli bir durumdasın. Kredi kartı ve KMH faizlerine dikkat ederek tasarruf oranını artırabilirsin.'
                : 'Dikkat gerektiren bir durumdasın. Harcamaların gelire oranı riskli seviyede.'}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>CEBİ Algoritması</span>
            <span className="text-slate-200 font-bold">Güvenilir Değerlendirme</span>
          </div>
        </div>

        {/* Right 2 Cols: Category Spending Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Kategori Bazlı Harcama Dağılımı</h3>
            <span className="text-xs text-slate-500">
              Toplam {formatCurrency(totalExpense)}
            </span>
          </div>

          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Bu ay için harcama kaydı bulunamadı.
            </p>
          ) : (
            <div className="space-y-3.5 pt-2">
              {categories.map((cat) => {
                const label = EXPENSE_CATEGORY_LABELS[cat.category] || cat.category;
                const color = EXPENSE_CATEGORY_COLORS[cat.category] || '#64748B';

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-md"
                          style={{ backgroundColor: color }}
                        ></span>
                        <span className="font-bold text-slate-800">{label}</span>
                        <span className="text-slate-400">({cat.count} işlem)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-slate-500 font-semibold w-10 text-right">
                          %{cat.percentage}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(3, cat.percentage)}%`,
                          backgroundColor: color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
