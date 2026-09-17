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

export type NavTab =
  | 'dashboard'
  | 'expenses'
  | 'debts'
  | 'coach'
  | 'more'
  | 'accounts'
  | 'calendar'
  | 'reports'
  | 'settings';

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
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Genel Durum',
      icon: LayoutDashboard,
    },
    {
      id: 'expenses',
      label: 'Harcamalar',
      icon: Receipt,
    },
    {
      id: 'debts',
      label: 'Borçlar',
      icon: CreditCard,
    },
    {
      id: 'coach',
      label: 'Finans Koçu',
      icon: Bot,
      highlight: true,
    },
    {
      id: 'calendar',
      label: 'Takvim',
      icon: CalendarDays,
    },
    {
      id: 'reports',
      label: 'Raporlar',
      icon: BarChart3,
    },
    {
      id: 'accounts',
      label: 'Hesaplar & Gelir',
      icon: Building2,
    },
  ];

  const getStatusColor = () => {
    if (hasCashShortfall) {
      return 'text-amber-600 bg-amber-50';
    }

    if (isOverBudget) {
      return 'text-rose-600 bg-rose-50';
    }

    return 'text-emerald-600 bg-emerald-50';
  };

  const getStatusLabel = () => {
    if (isOverBudget) {
      return 'Bütçe Aşıldı';
    }

    if (hasCashShortfall) {
      return '0 ₺ (Nakit Açığı)';
    }

    return formatCurrency(dailySafeSpending);
  };

  return (
    <>
      {/* ================================================================ */}
      {/* DESKTOP / TABLET TOP BAR                                        */}
      {/* ================================================================ */}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          <div className="h-16 flex items-center justify-between gap-2">

            {/* ======================================================== */}
            {/* LOGO + BRAND                                             */}
            {/* ======================================================== */}

            <div className="flex items-center gap-4 sm:gap-8 min-w-0">

              <button
                id="brand-logo-btn"
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-2.5 group transition hover:opacity-80 min-w-0"
                title="CEBİ - Kişisel Finans Koçu"
                aria-label="CEBİ Finans Koçu - Ana Sayfa"
              >

                {/* Logo */}

                <div
                  className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden rounded-xl bg-white flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                  }}
                >
                  <img
                    src="./cebi-icon.png"
                    alt="CEBİ"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>

                {/* 
                  ÖNEMLİ:
                  Eskiden:
                    hidden sm:flex

                  vardı.

                  Android'de sm altındaki ekranlarda yazı tamamen
                  kayboluyordu.

                  Artık mobilde de görünür.
                */}

                <div
                  className="flex flex-col min-w-0"
                  style={{
                    display: 'flex',
                  }}
                >
                  <span
                    className="text-sm sm:text-base font-black tracking-tight leading-none whitespace-nowrap"
                    style={{
                      color: '#0f172a',
                    }}
                  >
                    CEBİ
                  </span>

                  <span
                    className="text-[9px] sm:text-[10px] font-semibold mt-0.5 whitespace-nowrap"
                    style={{
                      color: '#64748b',
                    }}
                  >
                    Finans Koçu
                  </span>
                </div>
              </button>

              {/* ====================================================== */}
              {/* DESKTOP NAVIGATION                                    */}
              {/* ====================================================== */}

              <nav className="hidden lg:flex items-center gap-1">
                {navigationItems
                  .slice(0, 4)
                  .map(({ id, label, icon: Icon, highlight }) => (
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

            {/* ======================================================== */}
            {/* RIGHT ACTIONS                                            */}
            {/* ======================================================== */}

            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 flex-shrink-0">

              {/* Daily Safe Spending */}

              <div
                className={`hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition ${getStatusColor()}`}
              >
                <span className="opacity-75">
                  Günlük Güvenli:
                </span>

                <span className="font-black">
                  {getStatusLabel()}
                </span>
              </div>

              {/* Quick Expense */}

              <button
                id="header-quick-expense-btn"
                onClick={onOpenQuickExpense}
                className="px-2.5 sm:px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Hızlı harcama ekle"
                aria-label="Hızlı harcama ekle"
              >
                <Plus className="w-4 h-4" />

                <span className="hidden sm:inline">
                  Harcama Ekle
                </span>
              </button>

              {/* Settings */}

              <button
                id="header-settings-btn"
                onClick={() => onSelectTab('settings')}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="Ayarlar ve Veri Yönetimi"
                aria-label="Ayarlar"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Mobile Menu */}

              <button
                id="mobile-menu-toggle"
                onClick={() =>
                  setMobileMenuOpen((prev) => !prev)
                }
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                aria-label={
                  mobileMenuOpen
                    ? 'Menüyü kapat'
                    : 'Menüyü aç'
                }
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* MOBILE DROPDOWN                                            */}
          {/* ========================================================== */}

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 py-3 px-2 bg-slate-50/50">
              <div className="space-y-1">

                {navigationItems.map(
                  ({
                    id,
                    label,
                    icon: Icon,
                    highlight,
                  }) => (
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
                  )
                )}

              </div>
            </div>
          )}
        </div>
      </header>

      {/* ================================================================ */}
      {/* MOBILE BOTTOM NAVIGATION                                         */}
      {/* ================================================================ */}

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

            <span className="text-[9px] leading-tight">
              Ana Sayfa
            </span>
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

            <span className="text-[9px] leading-tight">
              Harcamalar
            </span>
          </button>

          {/* Quick Add */}

          <div className="flex flex-col items-center justify-center -mt-4">

            <button
              id="mobile-nav-quick-add"
              onClick={onOpenQuickExpense}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-90 transition"
              title="Hızlı harcama ekle"
              aria-label="Hızlı harcama ekle"
            >
              <Plus className="w-6 h-6" />
            </button>

            <span className="text-[9px] font-bold text-emerald-700 mt-1 leading-tight">
              Ekle
            </span>
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

            <span className="text-[9px] leading-tight">
              Borçlar
            </span>
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

            <span className="text-[9px] leading-tight">
              Koç
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
