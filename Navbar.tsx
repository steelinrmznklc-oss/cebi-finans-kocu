import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Bot,
  Plus,
  CalendarDays,
  BarChart3,
  Building2,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { formatCurrency } from './financialCalculations';

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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Genel Durum', icon: LayoutDashboard },
    { id: 'expenses', label: 'Harcamalar', icon: Receipt },
    { id: 'debts', label: 'Borçlar', icon: CreditCard },
    { id: 'coach', label: 'Finans Koçu', icon: Bot, highlight: true },
    { id: 'calendar', label: 'Takvim', icon: CalendarDays },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'accounts', label: 'Hesaplar & Gelir', icon: Building2 },
  ];

  const getStatusColor = () => {
    if (hasCashShortfall) return 'text-amber-600 bg-amber-50';
    if (isOverBudget) return 'text-rose-600 bg-rose-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const getStatusLabel = () => {
    if (isOverBudget) return 'Bütçe Aşıldı';
    if (hasCashShortfall) return '0 ₺ (Nakit Açığı)';
    return formatCurrency(dailySafeSpending);
  };

  return (
    <>
      {/* Desktop & Tablet Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <button
                id="brand-logo-btn"
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-2 group transition hover:opacity-80"
                title="CEBİ - Kişisel Finans Koçu"
              >
                {/* Logo Image */}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-sm">
                  C
                </div>
                
                <div className="hidden sm:flex flex-col">
                  <span className="text-base font-black text-slate-900 tracking-tight leading-none">
                    CEBİ
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Finans Koçu
                  </span>
                </div>
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navigationItems.slice(0, 4).map(({ id, label, icon: Icon, highlight }) => (
                  <button
                    key={id}
                    id={`nav-tab-${id}-desktop`}
                    onClick={() => {
                      onSelectTab(id as NavTab);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                      currentTab === id
                        ? highlight
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-white shadow-sm'
                        : highlight
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Daily Safe Spending Indicator (Desktop) */}
              <div className={`hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition ${getStatusColor()}`}>
                <span className="opacity-75">Günlük Güvenli:</span>
                <span className="font-black">{getStatusLabel()}</span>
              </div>

              {/* Quick Add Expense Button */}
              <button
                id="header-quick-expense-btn"
                onClick={onOpenQuickExpense}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Hızlı harcama ekle"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Harcama Ekle</span>
              </button>

              {/* Settings Button */}
              <button
                id="header-settings-btn"
                onClick={() => onSelectTab('settings')}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="Ayarlar ve Veri Yönetimi"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Mobile Menu Toggle */}
              <button
                id="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 py-3 px-2 bg-slate-50/50">
              <div className="space-y-1">
                {navigationItems.map(({ id, label, icon: Icon, highlight }) => (
                  <button
                    key={id}
                    id={`nav-tab-${id}-mobile-menu`}
                    onClick={() => {
                      onSelectTab(id as NavTab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-3 ${
                      currentTab === id
                        ? highlight
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white'
                        : highlight
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Compact Tab Bar) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* Dashboard */}
          <button
            id="mobile-nav-dashboard"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition ${
              currentTab === 'dashboard'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 font-medium'
            }`}
            title="Genel Durum"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] leading-tight">Ana Sayfa</span>
          </button>

          {/* Expenses */}
          <button
            id="mobile-nav-expenses"
            onClick={() => onSelectTab('expenses')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition ${
              currentTab === 'expenses'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 font-medium'
            }`}
            title="Harcamalar"
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[9px] leading-tight">Harcamalar</span>
          </button>

          {/* Quick Add FAB */}
          <div className="flex flex-col items-center justify-center -mt-4">
            <button
              id="mobile-nav-quick-add"
              onClick={onOpenQuickExpense}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-90 transition"
              title="Hızlı harcama ekle"
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className="text-[9px] font-bold text-emerald-700 mt-1 leading-tight">Ekle</span>
          </div>

          {/* Debts */}
          <button
            id="mobile-nav-debts"
            onClick={() => onSelectTab('debts')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition ${
              currentTab === 'debts'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 font-medium'
            }`}
            title="Borçlar"
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[9px] leading-tight">Borçlar</span>
          </button>

          {/* Coach */}
          <button
            id="mobile-nav-coach"
            onClick={() => onSelectTab('coach')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition ${
              currentTab === 'coach'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 font-medium'
            }`}
            title="Finans Koçu"
          >
            <Bot className="w-5 h-5" />
            <span className="text-[9px] leading-tight">Koç</span>
          </button>
        </div>
      </div>
    </>
  );
};
