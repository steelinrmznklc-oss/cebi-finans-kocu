import React, { useState } from 'react';
import {
  CreditCard as CreditCardIcon,
  Landmark,
  PiggyBank,
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  X,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  CreditCard,
  Loan,
  Overdraft,
  OtherDebt,
  BankAccount,
  FinancialSnapshot,
} from '../types/finance';
import {
  formatCurrency,
  formatTurkishDate,
  getRelativeDaysInfo,
} from '../utils/financialCalculations';

interface DebtsViewProps {
  creditCards: CreditCard[];
  loans: Loan[];
  overdrafts: Overdraft[];
  otherDebts: OtherDebt[];
  snapshot: FinancialSnapshot;
  accounts?: BankAccount[];
  onAddCreditCard: (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCreditCard: (id: string, card: Partial<CreditCard>) => void;
  onDeleteCreditCard: (id: string) => void;
  onAddLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateLoan: (id: string, loan: Partial<Loan>) => void;
  onDeleteLoan: (id: string) => void;
  onAddOverdraft: (kmh: Omit<Overdraft, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateOverdraft: (id: string, kmh: Partial<Overdraft>) => void;
  onDeleteOverdraft: (id: string) => void;
  onAddOtherDebt: (debt: Omit<OtherDebt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateOtherDebt: (id: string, debt: Partial<OtherDebt>) => void;
  onDeleteOtherDebt: (id: string) => void;
  onMakeDebtPayment?: (type: 'card' | 'loan' | 'kmh' | 'other', id: string, amount: number, bankAccountId?: string) => void;
}

type DebtModalType = 'card' | 'loan' | 'kmh' | 'other' | null;

export const DebtsView: React.FC<DebtsViewProps> = ({
  creditCards,
  loans,
  overdrafts,
  otherDebts,
  snapshot,
  onAddCreditCard,
  onUpdateCreditCard,
  onDeleteCreditCard,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onAddOverdraft,
  onUpdateOverdraft,
  onDeleteOverdraft,
  onAddOtherDebt,
  onUpdateOtherDebt,
  onDeleteOtherDebt,
  onMakeDebtPayment,
  accounts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'cards' | 'loans' | 'kmh' | 'other'>('all');
  const [openModalType, setOpenModalType] = useState<DebtModalType>(null);
  const [editingItem, setEditingItem] = useState<{ type: DebtModalType; data: any } | null>(null);

  // Payment state for Debt Repayment Modal
  const [payingDebt, setPayingDebt] = useState<{
    type: 'card' | 'loan' | 'kmh' | 'other';
    id: string;
    title: string;
    currentDebtOrAmount: number;
    minOrInstallment?: number;
    statementDebt?: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');

  const openPayModal = (
    type: 'card' | 'loan' | 'kmh' | 'other',
    id: string,
    title: string,
    currentDebtOrAmount: number,
    minOrInstallment?: number,
    statementDebt?: number
  ) => {
    setPayingDebt({
      type,
      id,
      title,
      currentDebtOrAmount,
      minOrInstallment,
      statementDebt,
    });
    // Set default suggested payment amount
    let initialAmount = currentDebtOrAmount;
    if (type === 'loan' && minOrInstallment && minOrInstallment > 0) {
      initialAmount = minOrInstallment;
    } else if (type === 'card') {
      if (statementDebt && statementDebt > 0) {
        initialAmount = statementDebt;
      } else if (currentDebtOrAmount > 0) {
        initialAmount = currentDebtOrAmount;
      }
    }
    setPaymentAmount(String(initialAmount || ''));
    setPaymentAccountId(accounts[0]?.id || '');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !onMakeDebtPayment) return;
    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) return;
    onMakeDebtPayment(payingDebt.type, payingDebt.id, num, paymentAccountId || accounts[0]?.id);
    setPayingDebt(null);
  };

  // Form states for Modal
  const [formBank, setFormBank] = useState('Garanti BBVA');
  const [formName, setFormName] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formAvailable, setFormAvailable] = useState('');
  const [formCurrentDebt, setFormCurrentDebt] = useState('');
  const [formStatementDebt, setFormStatementDebt] = useState('');
  const [formMinPayment, setFormMinPayment] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formOriginalAmount, setFormOriginalAmount] = useState('');
  const [formInstallment, setFormInstallment] = useState('');
  const [formRemainingCount, setFormRemainingCount] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('5.0');
  const [formDesc, setFormDesc] = useState('');

  const openAddModal = (type: DebtModalType) => {
    setEditingItem(null);
    setOpenModalType(type);
    setFormBank('Ziraat Bankası');
    setFormName('');
    setFormLimit('');
    setFormAvailable('');
    setFormCurrentDebt('');
    setFormStatementDebt('');
    setFormMinPayment('');
    setFormDueDate('');
    setFormOriginalAmount('');
    setFormInstallment('');
    setFormRemainingCount('');
    setFormInterestRate('5.0');
    setFormDesc('');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openModalType) return;

    if (openModalType === 'card') {
      const limit = parseFloat(formLimit) || 0;
      const currentDebt = parseFloat(formCurrentDebt) || 0;
      const statementDebt = parseFloat(formStatementDebt) || 0;
      const minimumPayment = parseFloat(formMinPayment) || Math.round(statementDebt * 0.2);
      const availableLimit = parseFloat(formAvailable) || Math.max(0, limit - currentDebt);

      if (editingItem?.data?.id) {
        onUpdateCreditCard(editingItem.data.id, {
          bank: formBank,
          cardName: formName || 'Kredi Kartı',
          limit,
          availableLimit,
          currentDebt,
          statementDebt,
          minimumPayment,
          paymentDueDate: formDueDate,
        });
      } else {
        onAddCreditCard({
          bank: formBank,
          cardName: formName || 'Bonus / Maximum',
          limit,
          availableLimit,
          currentDebt,
          statementDebt,
          minimumPayment,
          paymentDueDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    } else if (openModalType === 'loan') {
      const originalAmount = parseFloat(formOriginalAmount) || 0;
      const remainingPrincipal = parseFloat(formCurrentDebt) || originalAmount;
      const monthlyInstallment = parseFloat(formInstallment) || 0;
      const remainingInstallments = parseInt(formRemainingCount, 10) || 12;

      if (editingItem?.data?.id) {
        onUpdateLoan(editingItem.data.id, {
          bank: formBank,
          loanName: formName || 'İhtiyaç Kredisi',
          originalAmount,
          remainingPrincipal,
          monthlyInstallment,
          remainingInstallments,
          nextPaymentDate: formDueDate,
        });
      } else {
        onAddLoan({
          bank: formBank,
          loanName: formName || 'Banka Kredisi',
          originalAmount,
          remainingPrincipal,
          monthlyInstallment,
          remainingInstallments,
          nextPaymentDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    } else if (openModalType === 'kmh') {
      const limit = parseFloat(formLimit) || 0;
      const usedAmount = parseFloat(formCurrentDebt) || 0;
      const remainingAvailable = Math.max(0, limit - usedAmount);

      if (editingItem?.data?.id) {
        onUpdateOverdraft(editingItem.data.id, {
          bank: formBank,
          accountName: formName || 'KMH / Ek Hesap',
          limit,
          usedAmount,
          remainingAvailable,
          interestRate: parseFloat(formInterestRate) || 5.0,
          paymentDate: formDueDate,
        });
      } else {
        onAddOverdraft({
          bank: formBank,
          accountName: formName || 'Avans / Artı Para Hesabı',
          limit,
          usedAmount,
          remainingAvailable,
          interestRate: parseFloat(formInterestRate) || 5.0,
          paymentDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    } else if (openModalType === 'other') {
      const amount = parseFloat(formCurrentDebt) || 0;

      if (editingItem?.data?.id) {
        onUpdateOtherDebt(editingItem.data.id, {
          debtName: formName || 'Elden Borç',
          amount,
          dueDate: formDueDate,
          description: formDesc,
        });
      } else {
        onAddOtherDebt({
          debtName: formName || 'Şahsi Borç',
          amount,
          dueDate: formDueDate,
          description: formDesc,
        });
      }
    }

    setOpenModalType(null);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Borç Yönetimi & Planlama
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tüm kredi kartı, kredi, KMH ve şahsi borçlarının şeffaf dökümü
          </p>
        </div>

        {/* Add Dropdown or Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="add-card-btn"
            onClick={() => openAddModal('card')}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Kredi Kartı</span>
          </button>
          <button
            id="add-loan-btn"
            onClick={() => openAddModal('loan')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Kredi</span>
          </button>
          <button
            id="add-kmh-btn"
            onClick={() => openAddModal('kmh')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ KMH</span>
          </button>
          <button
            id="add-other-debt-btn"
            onClick={() => openAddModal('other')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Diğer Borç</span>
          </button>
        </div>
      </div>

      {/* TOTAL DEBT HERO CARD */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Toplam Borç Yükü
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
              {formatCurrency(snapshot.totalDebt)}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-300">
                Aylık gelirinize oranı: <strong>%{snapshot.debtRatio}</strong>
              </span>
              {snapshot.debtRatio > 70 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Yüksek Borç Oranı
                </span>
              )}
            </div>
          </div>

          {/* Sub Totals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6 text-xs">
            <div>
              <span className="text-slate-400 block">Kredi Kartları</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(snapshot.creditCardDebt)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Banka Kredileri</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(snapshot.loanDebt)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">KMH (Ek Hesap)</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(snapshot.overdraftDebt)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Diğer Borçlar</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(snapshot.otherDebt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `Tümü (${creditCards.length + loans.length + overdrafts.length + otherDebts.length})` },
          { id: 'cards', label: `Kredi Kartları (${creditCards.length})` },
          { id: 'loans', label: `Krediler (${loans.length})` },
          { id: 'kmh', label: `KMH (${overdrafts.length})` },
          { id: 'other', label: `Diğer Borçlar (${otherDebts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LIST SECTIONS */}
      <div className="space-y-6">
        {/* 1. CREDIT CARDS */}
        {(activeTab === 'all' || activeTab === 'cards') && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Kredi Kartları</h2>
              </div>
              <button
                onClick={() => openAddModal('card')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kart Ekle</span>
              </button>
            </div>

            {creditCards.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Henüz kredi kartı eklenmedi.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creditCards.map((card) => {
                  const rel = getRelativeDaysInfo(card.paymentDueDate);
                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                            {card.bank}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 mt-1">
                            {card.cardName}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onMakeDebtPayment && (
                            <button
                              title="Borç Öde"
                              onClick={() =>
                                openPayModal(
                                  'card',
                                  card.id,
                                  `${card.bank} ${card.cardName}`,
                                  card.currentDebt,
                                  card.minimumPayment,
                                  card.statementDebt
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Borç Öde</span>
                            </button>
                          )}
                          <button
                            title="Sil"
                            onClick={() => {
                              if (confirm('Bu kartı silmek istediğinize emin misiniz?')) {
                                onDeleteCreditCard(card.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Details: Current debt vs Statement debt vs Minimum payment */}
                      <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Güncel Borç</span>
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(card.currentDebt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Ekstre Borcu</span>
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(card.statementDebt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Asgari Tutar</span>
                          <span className="font-extrabold text-amber-700">
                            {formatCurrency(card.minimumPayment)}
                          </span>
                        </div>
                      </div>

                      {/* Limit and Due Date Footer */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">
                          Limit: <strong>{formatCurrency(card.limit)}</strong> (Kalan:{' '}
                          {formatCurrency(card.availableLimit)})
                        </span>

                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                            rel.isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Son Ödeme: {formatTurkishDate(card.paymentDueDate)} ({rel.text})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. LOANS */}
        {(activeTab === 'all' || activeTab === 'loans') && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Banka Kredileri</h2>
              </div>
              <button
                onClick={() => openAddModal('loan')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kredi Ekle</span>
              </button>
            </div>

            {loans.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Henüz kayıtlı kredi yok.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loans.map((loan) => {
                  const rel = getRelativeDaysInfo(loan.nextPaymentDate);
                  return (
                    <div
                      key={loan.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                            {loan.bank}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 mt-1">
                            {loan.loanName}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onMakeDebtPayment && (
                            <button
                              title="Taksit Öde"
                              onClick={() =>
                                openPayModal(
                                  'loan',
                                  loan.id,
                                  `${loan.bank} ${loan.loanName}`,
                                  loan.remainingPrincipal,
                                  loan.monthlyInstallment
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Taksit Öde</span>
                            </button>
                          )}
                          <button
                            title="Sil"
                            onClick={() => {
                              if (confirm('Bu krediyi silmek istediğinize emin misiniz?')) {
                                onDeleteLoan(loan.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Kalan Anapara</span>
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(loan.remainingPrincipal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Aylık Taksit</span>
                          <span className="font-extrabold text-blue-700">
                            {formatCurrency(loan.monthlyInstallment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Kalan Taksit</span>
                          <span className="font-extrabold text-slate-900">
                            {loan.remainingInstallments} ay
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">
                          Başlangıç: <strong>{formatCurrency(loan.originalAmount)}</strong>
                        </span>

                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                            rel.isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Taksit: {formatTurkishDate(loan.nextPaymentDate)} ({rel.text})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. OVERDRAFTS (KMH) */}
        {(activeTab === 'all' || activeTab === 'kmh') && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">KMH / Kredili Mevduat Hesabı</h2>
              </div>
              <button
                onClick={() => openAddModal('kmh')}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>KMH Ekle</span>
              </button>
            </div>

            {overdrafts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Henüz kayıtlı KMH (ek hesap) yok.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overdrafts.map((kmh) => (
                  <div
                    key={kmh.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          {kmh.bank}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">
                          {kmh.accountName || 'Avans Hesap (KMH)'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onMakeDebtPayment && (
                          <button
                            title="Borç Kapat / Öde"
                            onClick={() =>
                              openPayModal(
                                'kmh',
                                kmh.id,
                                `${kmh.bank} KMH`,
                                kmh.usedAmount
                              )
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Borç Kapat</span>
                          </button>
                        )}
                        <button
                          title="Sil"
                          onClick={() => {
                            if (confirm('Bu KMH hesabını silmek istediğinize emin misiniz?')) {
                              onDeleteOverdraft(kmh.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Kullanılan (Borç)</span>
                        <span className="font-extrabold text-rose-700">
                          {formatCurrency(kmh.usedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Kullanılabilir</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(kmh.remainingAvailable)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Toplam Limit</span>
                        <span className="font-extrabold text-slate-900">
                          {formatCurrency(kmh.limit)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">
                        Aylık Akdi Faiz: <strong>%{kmh.interestRate || 5.0}</strong>
                      </span>

                      {kmh.paymentDate && (
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          Ödeme: {formatTurkishDate(kmh.paymentDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. OTHER DEBTS */}
        {(activeTab === 'all' || activeTab === 'other') && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-slate-900">Diğer Şahsi Borçlar</h2>
              </div>
              <button
                onClick={() => openAddModal('other')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Borç Ekle</span>
              </button>
            </div>

            {otherDebts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Henüz kayıtlı şahsi borç yok.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{debt.debtName}</h3>
                        {debt.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{debt.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onMakeDebtPayment && (
                          <button
                            title="Borç Öde"
                            onClick={() =>
                              openPayModal(
                                'other',
                                debt.id,
                                debt.debtName,
                                debt.amount
                              )
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Öde</span>
                          </button>
                        )}
                        <button
                          title="Sil"
                          onClick={() => {
                            if (confirm('Bu borcu silmek istediğinize emin misiniz?')) {
                              onDeleteOtherDebt(debt.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Borç Tutarı</span>
                        <span className="font-extrabold text-base text-slate-900">
                          {formatCurrency(debt.amount)}
                        </span>
                      </div>

                      {debt.dueDate && (
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          Vade: {formatTurkishDate(debt.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL FOR ADDING/EDITING DEBT */}
      {openModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {openModalType === 'card' && 'Kredi Kartı Ekle'}
                {openModalType === 'loan' && 'Banka Kredisi Ekle'}
                {openModalType === 'kmh' && 'KMH (Ek Hesap) Ekle'}
                {openModalType === 'other' && 'Diğer Borç Ekle'}
              </h3>
              <button
                onClick={() => setOpenModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {/* Bank Name (Cards, Loans, KMH) */}
              {openModalType !== 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banka Adı
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Garanti BBVA, Ziraat Bankası, İş Bankası"
                    value={formBank}
                    onChange={(e) => setFormBank(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                  />
                </div>
              )}

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {openModalType === 'card' && 'Kart Adı (Örn: Bonus Platinum)'}
                  {openModalType === 'loan' && 'Kredi Adı (Örn: İhtiyaç Kredisi)'}
                  {openModalType === 'kmh' && 'Hesap Adı (Örn: Avans Hesap)'}
                  {openModalType === 'other' && 'Borç Adı / Kime (Örn: Elden Borç)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Başlık giriniz"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              {/* Fields for Credit Card */}
              {openModalType === 'card' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kart Limiti (₺)
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 50000"
                        value={formLimit}
                        onChange={(e) => setFormLimit(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Güncel Borç (₺)
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 14500"
                        value={formCurrentDebt}
                        onChange={(e) => setFormCurrentDebt(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ekstre Borcu (₺)
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 9200"
                        value={formStatementDebt}
                        onChange={(e) => setFormStatementDebt(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Asgari Ödeme (₺)
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 1840"
                        value={formMinPayment}
                        onChange={(e) => setFormMinPayment(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Son Ödeme Tarihi
                    </label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </>
              )}

              {/* Fields for Loan */}
              {openModalType === 'loan' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Toplam Kredi Tutarı
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 100000"
                        value={formOriginalAmount}
                        onChange={(e) => setFormOriginalAmount(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kalan Anapara Borcu
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Örn: 65000"
                        value={formCurrentDebt}
                        onChange={(e) => setFormCurrentDebt(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Aylık Taksit Tutarı
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Örn: 5200"
                        value={formInstallment}
                        onChange={(e) => setFormInstallment(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kalan Taksit Sayısı
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 14"
                        value={formRemainingCount}
                        onChange={(e) => setFormRemainingCount(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sonraki Taksit Tarihi
                    </label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </>
              )}

              {/* Fields for KMH */}
              {openModalType === 'kmh' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        KMH Limiti (₺)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Örn: 20000"
                        value={formLimit}
                        onChange={(e) => setFormLimit(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kullanılan Tutar / Borç
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Örn: 4500"
                        value={formCurrentDebt}
                        onChange={(e) => setFormCurrentDebt(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Aylık Faiz Oranı (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formInterestRate}
                        onChange={(e) => setFormInterestRate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Faiz/Ödeme Tarihi
                      </label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Fields for Other Debt */}
              {openModalType === 'other' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Borç Tutarı (₺)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Örn: 5000"
                      value={formCurrentDebt}
                      onChange={(e) => setFormCurrentDebt(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vade Tarihi (İsteğe Bağlı)
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Açıklama / Not
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Ekim başında ödenecek"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenModalType(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment / Debt Repayment Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {payingDebt.title} Ödemesi
                </h3>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="text-slate-500">Mevcut Borç / Tutar:</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(payingDebt.currentDebtOrAmount)}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Hızlı Tutar Seçimi:
                </label>
                <div className="flex flex-wrap gap-2">
                  {payingDebt.type === 'card' && payingDebt.minOrInstallment !== undefined && payingDebt.minOrInstallment > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(payingDebt.minOrInstallment))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    >
                      Asgari ({formatCurrency(payingDebt.minOrInstallment)})
                    </button>
                  )}
                  {payingDebt.type === 'card' && payingDebt.statementDebt !== undefined && payingDebt.statementDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(payingDebt.statementDebt))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Ekstre ({formatCurrency(payingDebt.statementDebt)})
                    </button>
                  )}
                  {payingDebt.type === 'loan' && payingDebt.minOrInstallment !== undefined && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(payingDebt.minOrInstallment))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Aylık Taksit ({formatCurrency(payingDebt.minOrInstallment)})
                    </button>
                  )}
                  {payingDebt.currentDebtOrAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(payingDebt.currentDebtOrAmount))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Tüm Borç ({formatCurrency(payingDebt.currentDebtOrAmount)})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ödenecek Tutar (₺) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              {/* Source Bank Account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ödeme Yapılacak Banka Hesabı *
                </label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-rose-600">
                    Ödeme yapabilmek için önce Hesaplarım sekmesinden bir banka hesabı eklemelisiniz.
                  </p>
                ) : (
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden bg-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountName} (Bakiye: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={accounts.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Ödemeyi Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
