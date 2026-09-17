import React, { useState } from 'react';
import {
  CreditCard as CreditCardIcon,
  Landmark,
  PiggyBank,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';

import {
  CreditCard,
  Loan,
  Overdraft,
  OtherDebt,
  BankAccount,
  FinancialSnapshot,
} from './finance';

import {
  formatCurrency,
  formatTurkishDate,
  getRelativeDaysInfo,
} from './financialCalculations';

interface DebtsViewProps {
  creditCards: CreditCard[];
  loans: Loan[];
  overdrafts: Overdraft[];
  otherDebts: OtherDebt[];
  snapshot: FinancialSnapshot;
  accounts?: BankAccount[];

  onAddCreditCard: (acc: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
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

  onMakeDebtPayment?: (
    type: 'card' | 'loan' | 'kmh' | 'other',
    id: string,
    amount: number,
    bankAccountId?: string
  ) => void;
}

type DebtTab = 'all' | 'cards' | 'loans' | 'kmh' | 'other';
type DebtModalType = 'card' | 'loan' | 'kmh' | 'other';

const CEBI_NAVY = '#0B1F33';
const CEBI_GREEN = '#10B981';

function parseMoney(value: string): number {
  if (!value) return 0;

  let normalized = value.trim().replace(/\s/g, '').replace(/₺/gi, '');
  if (!normalized) return 0;

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  } else if (hasDot) {
    const parts = normalized.split('.');
    if (
      parts.length === 2 &&
      parts[1].length === 3 &&
      /^\d+$/.test(parts[0]) &&
      /^\d+$/.test(parts[1])
    ) {
      normalized = normalized.replace('.', '');
    }
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
}

function parseInteger(value: string): number {
  if (!value) return 0;
  const normalized = value.trim().replace(/\./g, '').replace(/,/g, '');
  const result = Number.parseInt(normalized, 10);
  return Number.isFinite(result) ? result : 0;
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#10B981] focus:bg-white focus:ring-4 focus:ring-emerald-500/10';

const labelClass =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500';

const actionButtonClass =
  'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer';

export function DebtsView({
  creditCards,
  loans,
  overdrafts,
  otherDebts,
  snapshot,
  accounts = [],
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
}: DebtsViewProps) {
  const [activeTab, setActiveTab] = useState<DebtTab>('all');
  const [openModalType, setOpenModalType] = useState<DebtModalType | null>(null);
  const [editingItem, setEditingItem] = useState<{
    type: DebtModalType;
    data: CreditCard | Loan | Overdraft | OtherDebt;
  } | null>(null);

  const [payingDebt, setPayingDebt] = useState<{
    type: 'card' | 'loan' | 'kmh' | 'other';
    id: string;
    title: string;
    currentDebtOrAmount: number;
    minOrInstallment?: number;
    statementDebt?: number;
  } | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const [formBank, setFormBank] = useState('Ziraat Bankası');
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

  const closeAllModals = () => {
    setOpenModalType(null);
    setEditingItem(null);
    setPayingDebt(null);
  };

  const resetForm = () => {
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

  const openAddModal = (type: DebtModalType) => {
    resetForm();
    setEditingItem(null);
    setOpenModalType(type);
  };

  const openEditCard = (card: CreditCard) => {
    setEditingItem({ type: 'card', data: card });
    setFormBank(card.bank || 'Ziraat Bankası');
    setFormName(card.cardName || '');
    setFormLimit(String(card.limit ?? ''));
    setFormAvailable(String(card.availableLimit ?? ''));
    setFormCurrentDebt(String(card.currentDebt ?? ''));
    setFormStatementDebt(String(card.statementDebt ?? ''));
    setFormMinPayment(String(card.minimumPayment ?? ''));
    setFormDueDate(card.paymentDueDate || '');
    setOpenModalType('card');
  };

  const openEditLoan = (loan: Loan) => {
    setEditingItem({ type: 'loan', data: loan });
    setFormBank(loan.bank || 'Ziraat Bankası');
    setFormName(loan.loanName || '');
    setFormOriginalAmount(String(loan.originalAmount ?? ''));
    setFormCurrentDebt(String(loan.remainingPrincipal ?? ''));
    setFormInstallment(String(loan.monthlyInstallment ?? ''));
    setFormRemainingCount(String(loan.remainingInstallments ?? ''));
    setFormDueDate(loan.nextPaymentDate || '');
    setOpenModalType('loan');
  };

  const openEditKmh = (kmh: Overdraft) => {
    setEditingItem({ type: 'kmh', data: kmh });
    setFormBank(kmh.bank || 'Ziraat Bankası');
    setFormName(kmh.accountName || '');
    setFormLimit(String(kmh.limit ?? ''));
    setFormCurrentDebt(String(kmh.usedAmount ?? ''));
    setFormInterestRate(String(kmh.interestRate ?? 5));
    setFormDueDate(kmh.paymentDate || '');
    setOpenModalType('kmh');
  };

  const openEditOtherDebt = (debt: OtherDebt) => {
    setEditingItem({ type: 'other', data: debt });
    setFormName(debt.debtName || '');
    setFormCurrentDebt(String(debt.amount ?? ''));
    setFormDueDate(debt.dueDate || '');
    setFormDesc(debt.description || '');
    setOpenModalType('other');
  };

  const openPayModal = (
    type: 'card' | 'loan' | 'kmh' | 'other',
    id: string,
    title: string,
    currentDebtOrAmount: number,
    minOrInstallment?: number,
    statementDebt?: number
  ) => {
    setPayingDebt({ type, id, title, currentDebtOrAmount, minOrInstallment, statementDebt });

    let initialAmount = safeNumber(currentDebtOrAmount);

    if (type === 'loan' && minOrInstallment && minOrInstallment > 0) {
      initialAmount = minOrInstallment;
    } else if (type === 'card') {
      if (statementDebt && statementDebt > 0) initialAmount = statementDebt;
      else if (currentDebtOrAmount > 0) initialAmount = currentDebtOrAmount;
    }

    setPaymentAmount(initialAmount > 0 ? String(initialAmount) : '');
    setPaymentAccountId(accounts[0]?.id || '');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !onMakeDebtPayment) return;

    const num = parseMoney(paymentAmount);
    if (!Number.isFinite(num) || num <= 0) return;

    const maximumPayment = safeNumber(payingDebt.currentDebtOrAmount);
    const finalAmount = maximumPayment > 0 ? Math.min(num, maximumPayment) : num;

    onMakeDebtPayment(
      payingDebt.type,
      payingDebt.id,
      finalAmount,
      paymentAccountId || accounts[0]?.id
    );

    setPayingDebt(null);
    setPaymentAmount('');
    setPaymentAccountId('');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openModalType) return;

    if (openModalType === 'card') {
      const limit = parseMoney(formLimit);
      const currentDebt = parseMoney(formCurrentDebt);
      const statementDebt = parseMoney(formStatementDebt);
      const minimumPaymentInput = parseMoney(formMinPayment);
      const minimumPayment = minimumPaymentInput > 0 ? minimumPaymentInput : Math.round(statementDebt * 0.2 * 100) / 100;
      const availableInput = parseMoney(formAvailable);
      const availableLimit = availableInput > 0 ? Math.min(availableInput, Math.max(0, limit - currentDebt)) : Math.max(0, limit - currentDebt);

      if (editingItem?.type === 'card') {
        onUpdateCreditCard(editingItem.data.id, {
          bank: formBank.trim() || 'Banka',
          cardName: formName.trim() || 'Kredi Kartı',
          limit,
          availableLimit,
          currentDebt,
          statementDebt,
          minimumPayment,
          paymentDueDate: formDueDate,
        });
      } else {
        onAddCreditCard({
          bank: formBank.trim() || 'Banka',
          cardName: formName.trim() || 'Kredi Kartı',
          limit,
          availableLimit,
          currentDebt,
          statementDebt,
          minimumPayment,
          paymentDueDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    }

    if (openModalType === 'loan') {
      const originalAmount = parseMoney(formOriginalAmount);
      const remainingPrincipalInput = parseMoney(formCurrentDebt);
      const remainingPrincipal = remainingPrincipalInput > 0 ? remainingPrincipalInput : originalAmount;
      const monthlyInstallment = parseMoney(formInstallment);
      const remainingInstallments = parseInteger(formRemainingCount) || 12;

      if (editingItem?.type === 'loan') {
        onUpdateLoan(editingItem.data.id, {
          bank: formBank.trim() || 'Banka',
          loanName: formName.trim() || 'İhtiyaç Kredisi',
          originalAmount,
          remainingPrincipal,
          monthlyInstallment,
          remainingInstallments,
          nextPaymentDate: formDueDate,
        });
      } else {
        onAddLoan({
          bank: formBank.trim() || 'Banka',
          loanName: formName.trim() || 'Banka Kredisi',
          originalAmount,
          remainingPrincipal,
          monthlyInstallment,
          remainingInstallments,
          nextPaymentDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    }

    if (openModalType === 'kmh') {
      const limit = parseMoney(formLimit);
      const usedAmount = parseMoney(formCurrentDebt);
      const remainingAvailable = Math.max(0, limit - usedAmount);
      const interestRate = parseMoney(formInterestRate);

      if (editingItem?.type === 'kmh') {
        onUpdateOverdraft(editingItem.data.id, {
          bank: formBank.trim() || 'Banka',
          accountName: formName.trim() || 'KMH / Ek Hesap',
          limit,
          usedAmount,
          remainingAvailable,
          interestRate: interestRate > 0 ? interestRate : 5,
          paymentDate: formDueDate,
        });
      } else {
        onAddOverdraft({
          bank: formBank.trim() || 'Banka',
          accountName: formName.trim() || 'Avans / Artı Para Hesabı',
          limit,
          usedAmount,
          remainingAvailable,
          interestRate: interestRate > 0 ? interestRate : 5,
          paymentDate: formDueDate || new Date().toISOString().slice(0, 10),
        });
      }
    }

    if (openModalType === 'other') {
      const amount = parseMoney(formCurrentDebt);

      if (editingItem?.type === 'other') {
        onUpdateOtherDebt(editingItem.data.id, {
          debtName: formName.trim() || 'Elden Borç',
          amount,
          dueDate: formDueDate,
          description: formDesc.trim(),
        });
      } else {
        onAddOtherDebt({
          debtName: formName.trim() || 'Şahsi Borç',
          amount,
          dueDate: formDueDate,
          description: formDesc.trim(),
        });
      }
    }

    closeAllModals();
  };

  const totalCount = creditCards.length + loans.length + overdrafts.length + otherDebts.length;

  const tabs: { id: DebtTab; label: string; count: number }[] = [
    { id: 'all', label: 'Tümü', count: totalCount },
    { id: 'cards', label: 'Kredi Kartları', count: creditCards.length },
    { id: 'loans', label: 'Krediler', count: loans.length },
    { id: 'kmh', label: 'KMH', count: overdrafts.length },
    { id: 'other', label: 'Diğer', count: otherDebts.length },
  ];

  const debtStatus =
    snapshot.debtRatio > 70
      ? { label: 'Yüksek borç yükü', className: 'border-rose-400/30 bg-rose-500/10 text-rose-200' }
      : snapshot.debtRatio > 40
      ? { label: 'Dikkatli takip', className: 'border-amber-400/30 bg-amber-500/10 text-amber-200' }
      : { label: 'Kontrollü', className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' };

  const sectionHeader = (icon: React.ReactNode, title: string, count: number, onAdd: () => void) => (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">{icon}</div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{count} kayıt</p>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
      >
        <Plus className="h-3.5 w-3.5" />
        Ekle
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden pb-24 md:pb-10">
      <section
        className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-xl sm:p-7"
        style={{ background: `linear-gradient(135deg, ${CEBI_NAVY} 0%, #102D46 60%, #0B2439 100%)` }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <CreditCardIcon className="h-3.5 w-3.5 shrink-0" style={{ color: CEBI_GREEN }} />
              <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">CEBİ Finansal Kontrol</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Borç Yönetimi</h1>
            <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm">
              Kredi kartı, kredi, KMH ve şahsi borçlarını tek ekrandan takip et ve ödeme planını kontrol altında tut.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button id="add-card-btn" onClick={() => openAddModal('card')} className={`${actionButtonClass} bg-white text-slate-900 hover:bg-emerald-50`}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Kredi Kartı</span>
            </button>
            <button id="add-loan-btn" onClick={() => openAddModal('loan')} className={`${actionButtonClass} border border-white/10 bg-white/10 text-white hover:bg-white/15`}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Kredi</span>
            </button>
            <button id="add-kmh-btn" onClick={() => openAddModal('kmh')} className={`${actionButtonClass} border border-white/10 bg-white/10 text-white hover:bg-white/15`}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>KMH</span>
            </button>
            <button id="add-other-debt-btn" onClick={() => openAddModal('other')} className={`${actionButtonClass} border border-white/10 bg-white/10 text-white hover:bg-white/15`}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Diğer</span>
            </button>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] bg-[#0B1F33] p-5 text-white shadow-lg sm:p-6">
        <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Toplam Borç Yükü</span>

              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${debtStatus.className}`}>{debtStatus.label}</span>
            </div>

            <div className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{formatCurrency(snapshot.totalDebt)}</div>

            <div className="mt-3 flex min-w-0 items-center gap-3">
              <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${snapshot.debtRatio > 70 ? 'bg-rose-400' : snapshot.debtRatio > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(Math.max(snapshot.debtRatio, 0), 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-300">%{snapshot.debtRatio}</span>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">Aylık gelire göre borç yükü oranı</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:border-l lg:border-white/10 lg:pl-6">
            {[
              ['Kart', snapshot.creditCardDebt],
              ['Kredi', snapshot.loanDebt],
              ['KMH', snapshot.overdraftDebt],
              ['Diğer', snapshot.otherDebt],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.04] p-3">
                <span className="block text-[10px] font-medium text-slate-500">{label}</span>
                <span className="mt-1 block truncate text-sm font-black text-white">{formatCurrency(Number(value))}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${active ? 'bg-[#0B1F33] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {tab.label}
                <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        {(activeTab === 'all' || activeTab === 'cards') && (
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {sectionHeader(<CreditCardIcon className="h-5 w-5 text-emerald-600" />, 'Kredi Kartları', creditCards.length, () => openAddModal('card'))}

            {creditCards.length === 0 ? (
              <EmptyState icon={<CreditCardIcon className="h-5 w-5" />} text="Henüz kredi kartı eklenmedi." onAdd={() => openAddModal('card')} />
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {creditCards.map((card) => {
                  const rel = getRelativeDaysInfo(card.paymentDueDate);
                  const utilization = card.limit > 0 ? (card.currentDebt / card.limit) * 100 : 0;

                  return (
                    <div key={card.id} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md">
                      <div className="h-1 bg-gradient-to-r from-[#10B981] to-emerald-300" />

                      <div className="min-w-0 p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex max-w-full rounded-lg bg-[#0B1F33] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                              <span className="truncate">{card.bank}</span>
                            </span>
                            <h3 className="mt-2 truncate text-sm font-black text-slate-900">{card.cardName}</h3>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {onMakeDebtPayment && (
                              <button title="Borç Öde" onClick={() => openPayModal('card', card.id, `${card.bank} ${card.cardName}`, card.currentDebt, card.minimumPayment, card.statementDebt)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Öde
                              </button>
                            )}

                            <button title="Düzenle" onClick={() => openEditCard(card)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                              <FileText className="h-3.5 w-3.5" />
                            </button>

                            <button title="Sil" onClick={() => { if (confirm('Bu kartı silmek istediğinize emin misiniz?')) onDeleteCreditCard(card.id); }} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-[#0B1F33] p-4 text-white">
                          <span className="text-[10px] font-medium text-slate-500">Güncel Borç</span>
                          <div className="mt-1 break-words text-2xl font-black tracking-tight">{formatCurrency(card.currentDebt)}</div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(Math.max(utilization, 0), 100)}%` }} />
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span>Limit</span>
                            <span className="truncate font-bold text-slate-300">{formatCurrency(card.limit)}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Metric label="Ekstre" value={formatCurrency(card.statementDebt)} />
                          <Metric label="Asgari" value={formatCurrency(card.minimumPayment)} accent="amber" />
                          <Metric label="Kullanılabilir" value={formatCurrency(card.availableLimit)} accent="green" />
                          <Metric label="Son Ödeme" value={formatTurkishDate(card.paymentDueDate)} />
                        </div>

                        <div className={`mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold ${rel.isOverdue ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <span className="shrink-0">Ödeme durumu</span>
                          <span className="truncate text-right">{rel.isOverdue ? `Gecikmiş · ${rel.text}` : rel.text}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'loans') && (
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {sectionHeader(<Landmark className="h-5 w-5 text-blue-600" />, 'Banka Kredileri', loans.length, () => openAddModal('loan'))}

            {loans.length === 0 ? (
              <EmptyState icon={<Landmark className="h-5 w-5" />} text="Henüz kayıtlı kredi yok." onAdd={() => openAddModal('loan')} />
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {loans.map((loan) => {
                  const rel = getRelativeDaysInfo(loan.nextPaymentDate);

                  return (
                    <div key={loan.id} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md">
                      <div className="h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />

                      <div className="p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex max-w-full rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                              <span className="truncate">{loan.bank}</span>
                            </span>
                            <h3 className="mt-2 truncate text-sm font-black text-slate-900">{loan.loanName}</h3>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {onMakeDebtPayment && (
                              <button title="Taksit Öde" onClick={() => openPayModal('loan', loan.id, `${loan.bank} ${loan.loanName}`, loan.remainingPrincipal, loan.monthlyInstallment)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Öde
                              </button>
                            )}

                            <button title="Düzenle" onClick={() => openEditLoan(loan)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                              <FileText className="h-3.5 w-3.5" />
                            </button>

                            <button title="Sil" onClick={() => { if (confirm('Bu krediyi silmek istediğinize emin misiniz?')) onDeleteLoan(loan.id); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="col-span-2 rounded-2xl bg-blue-50 p-4">
                            <span className="text-[10px] font-bold text-blue-600">Kalan Anapara</span>
                            <div className="mt-1 break-words text-2xl font-black text-slate-900">{formatCurrency(loan.remainingPrincipal)}</div>
                          </div>

                          <Metric label="Aylık Taksit" value={formatCurrency(loan.monthlyInstallment)} accent="blue" />
                          <Metric label="Kalan Taksit" value={`${loan.remainingInstallments} ay`} />
                          <Metric label="Başlangıç" value={formatCurrency(loan.originalAmount)} />
                          <Metric label="Sonraki Ödeme" value={formatTurkishDate(loan.nextPaymentDate)} />
                        </div>

                        <div className={`mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold ${rel.isOverdue ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <span className="shrink-0">Ödeme durumu</span>
                          <span className="truncate text-right">{rel.isOverdue ? `Ödeme gecikmiş · ${rel.text}` : `Sonraki taksit · ${rel.text}`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'kmh') && (
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {sectionHeader(<PiggyBank className="h-5 w-5 text-amber-600" />, 'KMH / Kredili Mevduat', overdrafts.length, () => openAddModal('kmh'))}

            {overdrafts.length === 0 ? (
              <EmptyState icon={<PiggyBank className="h-5 w-5" />} text="Henüz kayıtlı KMH hesabı yok." onAdd={() => openAddModal('kmh')} />
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {overdrafts.map((kmh) => (
                  <div key={kmh.id} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-white hover:shadow-md">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-400" />

                    <div className="p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex max-w-full rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                            <span className="truncate">{kmh.bank}</span>
                          </span>
                          <h3 className="mt-2 truncate text-sm font-black text-slate-900">{kmh.accountName || 'Avans Hesap (KMH)'}</h3>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {onMakeDebtPayment && (
                            <button title="Borç Kapat" onClick={() => openPayModal('kmh', kmh.id, `${kmh.bank} KMH`, kmh.usedAmount)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Öde
                            </button>
                          )}

                          <button title="Düzenle" onClick={() => openEditKmh(kmh)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          <button title="Sil" onClick={() => { if (confirm('Bu KMH hesabını silmek istediğinize emin misiniz?')) onDeleteOverdraft(kmh.id); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                        <span className="text-[10px] font-bold text-amber-700">Kullanılan Borç</span>
                        <div className="mt-1 break-words text-2xl font-black text-slate-900">{formatCurrency(kmh.usedAmount)}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Metric label="Kullanılabilir" value={formatCurrency(kmh.remainingAvailable)} accent="green" />
                        <Metric label="Limit" value={formatCurrency(kmh.limit)} />
                        <Metric label="Faiz" value={`%${kmh.interestRate || 5}`} accent="amber" />
                      </div>

                      {kmh.paymentDate && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
                          <span>Ödeme tarihi</span>
                          <span className="truncate text-right">{formatTurkishDate(kmh.paymentDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'other') && (
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {sectionHeader(<FileText className="h-5 w-5 text-purple-600" />, 'Diğer Şahsi Borçlar', otherDebts.length, () => openAddModal('other'))}

            {otherDebts.length === 0 ? (
              <EmptyState icon={<FileText className="h-5 w-5" />} text="Henüz kayıtlı şahsi borç yok." onAdd={() => openAddModal('other')} />
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {otherDebts.map((debt) => (
                  <div key={debt.id} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-white hover:shadow-md">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-fuchsia-400" />

                    <div className="p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-slate-900">{debt.debtName}</h3>
                          {debt.description && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{debt.description}</p>}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {onMakeDebtPayment && (
                            <button title="Borç Öde" onClick={() => openPayModal('other', debt.id, debt.debtName, debt.amount)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Öde
                            </button>
                          )}

                          <button title="Düzenle" onClick={() => openEditOtherDebt(debt)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          <button title="Sil" onClick={() => { if (confirm('Bu borcu silmek istediğinize emin misiniz?')) onDeleteOtherDebt(debt.id); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-purple-50 p-4">
                        <span className="text-[10px] font-bold text-purple-700">Borç Tutarı</span>
                        <div className="mt-1 break-words text-2xl font-black text-slate-900">{formatCurrency(debt.amount)}</div>
                      </div>

                      {debt.dueDate && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
                          <span>Vade</span>
                          <span className="truncate text-right">{formatTurkishDate(debt.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {openModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1F33]/70 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeAllModals(); }}
        >
          <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between bg-[#0B1F33] px-5 py-4 text-white sm:px-6">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">CEBİ · Borç Yönetimi</div>
                <h3 className="mt-1 truncate text-base font-black">
                  {editingItem ? 'Borç Kaydını Düzenle' : openModalType === 'card' ? 'Kredi Kartı Ekle' : openModalType === 'loan' ? 'Banka Kredisi Ekle' : openModalType === 'kmh' ? 'KMH / Ek Hesap Ekle' : 'Diğer Borç Ekle'}
                </h3>
              </div>

              <button onClick={closeAllModals} className="ml-3 shrink-0 rounded-xl bg-white/10 p-2 text-slate-300 transition hover:bg-white/15 hover:text-white" aria-label="Kapat">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                {openModalType !== 'other' && (
                  <div>
                    <label className={labelClass}>Banka Adı</label>
                    <input type="text" required autoComplete="organization" placeholder="Örn: Garanti BBVA" value={formBank} onChange={(e) => setFormBank(e.target.value)} className={inputClass} />
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    {openModalType === 'card' ? 'Kart Adı' : openModalType === 'loan' ? 'Kredi Adı' : openModalType === 'kmh' ? 'Hesap Adı' : 'Borç Adı / Kime'}
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder={openModalType === 'card' ? 'Örn: Bonus' : openModalType === 'loan' ? 'Örn: İhtiyaç Kredisi' : openModalType === 'kmh' ? 'Örn: Avans Hesap' : 'Örn: Ahmet'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {openModalType === 'card' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Kart Limiti (₺)" type="text" inputMode="decimal" placeholder="50000" value={formLimit} onChange={setFormLimit} />
                      <Field label="Güncel Borç (₺)" type="text" inputMode="decimal" placeholder="14500" value={formCurrentDebt} onChange={setFormCurrentDebt} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Ekstre Borcu (₺)" type="text" inputMode="decimal" placeholder="9200" value={formStatementDebt} onChange={setFormStatementDebt} />
                      <Field label="Asgari Ödeme (₺)" type="text" inputMode="decimal" placeholder="1840" value={formMinPayment} onChange={setFormMinPayment} />
                    </div>
                    <Field label="Kullanılabilir Limit (₺)" type="text" inputMode="decimal" placeholder="Boş bırakılırsa otomatik hesaplanır" value={formAvailable} onChange={setFormAvailable} />
                    <Field label="Son Ödeme Tarihi" type="date" required value={formDueDate} onChange={setFormDueDate} />
                    <InfoBox>Kullanılabilir limit boş bırakılırsa <strong>kart limiti − güncel borç</strong> olarak otomatik hesaplanır.</InfoBox>
                  </>
                )}

                {openModalType === 'loan' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Toplam Kredi Tutarı" type="text" inputMode="decimal" placeholder="100000" value={formOriginalAmount} onChange={setFormOriginalAmount} />
                      <Field label="Kalan Anapara" type="text" inputMode="decimal" required placeholder="65000" value={formCurrentDebt} onChange={setFormCurrentDebt} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Aylık Taksit" type="text" inputMode="decimal" placeholder="5000" value={formInstallment} onChange={setFormInstallment} />
                      <Field label="Kalan Taksit" type="text" inputMode="numeric" placeholder="12" value={formRemainingCount} onChange={setFormRemainingCount} />
                    </div>
                    <Field label="Sonraki Ödeme Tarihi" type="date" value={formDueDate} onChange={setFormDueDate} />
                  </>
                )}

                {openModalType === 'kmh' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="KMH Limiti" type="text" inputMode="decimal" placeholder="25000" value={formLimit} onChange={setFormLimit} />
                      <Field label="Kullanılan Borç" type="text" inputMode="decimal" placeholder="5000" value={formCurrentDebt} onChange={setFormCurrentDebt} />
                    </div>
                    <Field label="Aylık Akdi Faiz (%)" type="text" inputMode="decimal" placeholder="5.0" value={formInterestRate} onChange={setFormInterestRate} />
                    <Field label="Ödeme Tarihi" type="date" value={formDueDate} onChange={setFormDueDate} />
                  </>
                )}

                {openModalType === 'other' && (
                  <>
                    <Field label="Borç Tutarı (₺)" type="text" inputMode="decimal" required placeholder="10000" value={formCurrentDebt} onChange={setFormCurrentDebt} />
                    <Field label="Vade Tarihi" type="date" value={formDueDate} onChange={setFormDueDate} />
                    <div>
                      <label className={labelClass}>Açıklama</label>
                      <textarea rows={3} placeholder="İsteğe bağlı açıklama..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className={`${inputClass} resize-none`} />
                    </div>
                  </>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeAllModals} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Vazgeç</button>
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1F33] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#102D46] sm:w-auto">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {editingItem ? 'Değişiklikleri Kaydet' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {payingDebt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1F33]/70 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPayingDebt(null); }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="bg-[#0B1F33] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">CEBİ · Ödeme</div>
                  <h3 className="mt-1 text-lg font-black">Borç Ödemesi</h3>
                </div>

                <button onClick={() => setPayingDebt(null)} className="shrink-0 rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/15 hover:text-white" aria-label="Ödeme penceresini kapat">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 truncate text-xs text-slate-300">{payingDebt.title}</p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mevcut Borç</span>

                <div className="mt-1 break-words text-xl font-black text-slate-900">
                  {formatCurrency(payingDebt.currentDebtOrAmount)}
                </div>

                {payingDebt.type === 'card' && payingDebt.statementDebt && payingDebt.statementDebt > 0 && (
                  <p className="mt-1 text-[10px] font-medium text-slate-600">
                    Ekstre: {formatCurrency(payingDebt.statementDebt)}
                    {payingDebt.minOrInstallment && payingDebt.minOrInstallment > 0 && (
                      <> · Asgari: {formatCurrency(payingDebt.minOrInstallment)}</>
                    )}
                  </p>
                )}

                {payingDebt.type === 'loan' && payingDebt.minOrInstallment && payingDebt.minOrInstallment > 0 && (
                  <p className="mt-1 text-[10px] font-medium text-slate-600">
                    Aylık taksit: {formatCurrency(payingDebt.minOrInstallment)}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Ödeme Tutarı (₺)</label>

                <input
                  type="text"
                  inputMode="decimal"
                  min="0.01"
                  required
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Örn: 2500"
                  className={`${inputClass} text-lg font-black`}
                />

                <p className="mt-1.5 text-[10px] text-slate-600">
                  Türkçe format da kullanabilirsin: <strong>2.500</strong> veya <strong>2.500,50</strong>
                </p>
              </div>

              {accounts.length > 0 ? (
                <div>
                  <label className={labelClass}>Ödeme Yapılacak Hesap</label>

                  <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className={inputClass}>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName} - {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <InfoBox variant="warning">
                  Ödeme kaynağı olarak kullanabileceğin bir banka hesabı bulunmuyor. Önce bir banka hesabı eklemen gerekebilir.
                </InfoBox>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setPayingDebt(null)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:w-auto">
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={!onMakeDebtPayment || parseMoney(paymentAmount) <= 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ödemeyi Kaydet
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = 'default',
}: {
  label: string;
  value: string;
  accent?: 'default' | 'green' | 'amber' | 'blue';
}) {
  const valueClass =
    accent === 'green'
      ? 'text-emerald-700'
      : accent === 'amber'
      ? 'text-amber-700'
      : accent === 'blue'
      ? 'text-blue-700'
      : 'text-slate-900';

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`mt-1 block truncate text-xs font-black ${valueClass}`} title={value}>{value}</span>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  onAdd,
}: {
  icon: React.ReactNode;
  text: string;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">{icon}</div>
      <p className="mt-3 text-xs font-semibold text-slate-600">{text}</p>

      <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0B1F33] px-3.5 py-2 text-[10px] font-bold text-white transition hover:bg-[#102D46]">
        <Plus className="h-3.5 w-3.5" />
        İlk kaydı ekle
      </button>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  step,
  inputMode,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  step?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        required={required}
        step={step}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function InfoBox({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-[10px] leading-5 ${
        variant === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {children}
    </div>
  );
}
