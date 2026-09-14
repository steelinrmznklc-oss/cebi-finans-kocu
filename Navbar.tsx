import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Bot,
  MoreHorizontal,
  Plus,
  Wallet,
  CalendarDays,
  BarChart3,
  Building2,
  Settings,
} from 'lucide-react';
import { formatCurrency } from '../financialCalculations';

export type NavTab = 'dashboard' | 'expenses' | 'debts' | 'coach' | 'more' | 'accounts' | 'calendar' | 'reports' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickExpense: () => void;
  dailySafeSpending: number;
  isOverBudget: boolean;
  hasCashShortfall?: boolean;
  totalBalance: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickExpense,
  dailySafeSpending,
  isOverBudget,
  hasCashShortfall = false,
  totalBalance,
}) => {
  return (
    <>
      {/* Desktop & Tablet Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              id="brand-logo-btn"
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:bg-emerald-700 transition">
                C
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">CEBİ</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Koç
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Kişisel Finans Koçu</p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <button
                id="nav-tab-dashboard-desktop"
                onClick={() => onSelectTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Genel Durum
              </button>

              <button
                id="nav-tab-expenses-desktop"
                onClick={() => onSelectTab('expenses')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'expenses'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Harcamalar
              </button>

              <button
                id="nav-tab-debts-desktop"
                onClick={() => onSelectTab('debts')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'debts'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Borçlar
              </button>

              <button
                id="nav-tab-coach-desktop"
                onClick={() => onSelectTab('coach')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'coach'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80'
                }`}
              >
                <Bot className="w-4 h-4" />
                Finans Koçu
              </button>

              <button
                id="nav-tab-calendar-desktop"
                onClick={() => onSelectTab('calendar')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'calendar'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Takvim
              </button>

              <button
                id="nav-tab-reports-desktop"
                onClick={() => onSelectTab('reports')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'reports'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Raporlar
              </button>

              <button
                id="nav-tab-accounts-desktop"
                onClick={() => onSelectTab('accounts')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  currentTab === 'accounts'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Hesaplar & Gelir
              </button>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Safe Daily Spending Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Günlük Güvenli:</span>
              <span
                className={`font-bold ${
                  isOverBudget || hasCashShortfall ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {isOverBudget
                  ? 'Bütçe Aşıldı'
                  : hasCashShortfall
                  ? '0 ₺ (Nakit Açığı)'
                  : formatCurrency(dailySafeSpending)}
              </span>
            </div>

            {/* Quick Add Expense Button */}
            <button
              id="header-quick-expense-btn"
              onClick={onOpenQuickExpense}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Harcama Ekle</span>
            </button>

            {/* Settings button */}
            <button
              id="header-settings-btn"
              onClick={() => onSelectTab('settings')}
              title="Ayarlar ve Veri Yönetimi"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            id="mobile-nav-dashboard"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full transition ${
              currentTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Ana Sayfa</span>
          </button>

          <button
            id="mobile-nav-expenses"
            onClick={() => onSelectTab('expenses')}
            className={`flex flex-col items-center justify-center h-full transition ${
              currentTab === 'expenses' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-1">Harcamalar</span>
          </button>

          {/* Quick Expense Center FAB */}
          <div className="flex flex-col items-center justify-center">
            <button
              id="mobile-nav-quick-add"
              onClick={onOpenQuickExpense}
              className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md active:scale-90 transition -mt-5 cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-[10px] font-bold text-emerald-700 mt-1">Ekle</span>
          </div>

          <button
            id="mobile-nav-debts"
            onClick={() => onSelectTab('debts')}
            className={`flex flex-col items-center justify-center h-full transition ${
              currentTab === 'debts' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Borçlar</span>
          </button>

          <button
            id="mobile-nav-coach"
            onClick={() => onSelectTab('coach')}
            className={`flex flex-col items-center justify-center h-full transition ${
              currentTab === 'coach' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px] mt-1">Koç</span>
          </button>
        </div>
      </div>
    </>
  );
};
