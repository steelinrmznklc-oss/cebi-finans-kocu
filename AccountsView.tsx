import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  BankAccount,
  Income,
  IncomeFrequency,
  IncomeCategory,
} from './finance';

import {
  formatCurrency,
} from './financialCalculations';

interface AccountsViewProps {
  accounts: BankAccount[];
  incomes: Income[];
  onAddAccount: (
    acc: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onUpdateAccount: (
    id: string,
    acc: Partial<BankAccount>
  ) => void;
  onDeleteAccount: (id: string) => void;
  onAddIncome: (
    inc: Omit<Income, 'id' | 'createdAt'>
  ) => void;
  onUpdateIncome: (
    id: string,
    inc: Partial<Income>
  ) => void;
  onDeleteIncome: (id: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  incomes,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
}) => {
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [openIncomeModal, setOpenIncomeModal] = useState(false);

  // Account form
  const [bankName, setBankName] = useState('Garanti BBVA');
  const [accountName, setAccountName] = useState('Vadesiz TL Hesabı');
  const [accountType, setAccountType] =
    useState<BankAccount['accountType']>('vadesiz');
  const [balanceStr, setBalanceStr] = useState('');
  const [accountNotes, setAccountNotes] = useState('');

  // Income form
  const [incomeName, setIncomeName] = useState('Aylık Maaş');
  const [incomeAmountStr, setIncomeAmountStr] = useState('');
  const [incomeFrequency, setIncomeFrequency] =
    useState<IncomeFrequency>('monthly');
  const [incomeDay, setIncomeDay] = useState('1');
  const [incomeCategory, setIncomeCategory] =
    useState<IncomeCategory>('maas');
  const [incomeIsRecurring, setIncomeIsRecurring] = useState(true);

  const totalLiquid = accounts.reduce(
    (s, a) => s + a.balance,
    0
  );

  const totalMonthlyIncome = incomes
    .filter((i) => i.isRecurring || i.frequency === 'monthly')
    .reduce((s, i) => s + i.amount, 0);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    const balance = parseFloat(balanceStr) || 0;

    onAddAccount({
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      accountType,
      balance,
      notes: accountNotes.trim(),
    });

    setOpenAccountModal(false);
    setBalanceStr('');
    setAccountNotes('');
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(incomeAmountStr) || 0;
    const day = parseInt(incomeDay, 10) || 1;

    onAddIncome({
      name: incomeName.trim(),
      amount,
      frequency: incomeFrequency,
      dayOfMonth: day,
      category: incomeCategory,
      isRecurring: incomeIsRecurring,
      paymentDate: `2026-09-${String(day).padStart(2, '0')}`,
    });

    setOpenIncomeModal(false);
    setIncomeAmountStr('');
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

  const incomeInputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

  const labelClass =
    'mb-1.5 block text-xs font-bold text-slate-700';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-10 text-slate-900">

      {/* =========================================================
          SECTION 1: BANK ACCOUNTS
      ========================================================== */}
      <div className="space-y-4">

        <div className="relative overflow-hidden rounded-3xl bg-[#0B1F33] p-6 shadow-xl sm:p-7">

          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-emerald-400/5 blur-2xl" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                    CEBİ • Varlıklar
                  </p>

                  <h1 className="mt-0.5 text-xl font-black tracking-tight text-white sm:text-2xl">
                    Banka Hesapları
                  </h1>
                </div>

              </div>

              <p className="mt-4 text-xs text-slate-300">
                Tüm hesaplarınızdaki toplam likit varlık
              </p>

              <div className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {formatCurrency(totalLiquid)}
              </div>

            </div>

            <button
              id="add-bank-account-btn"
              onClick={() => setOpenAccountModal(true)}
              className="relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Yeni Hesap Ekle
            </button>

          </div>
        </div>

        {accounts.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">

            <Building2 className="mx-auto mb-2 h-10 w-10 text-slate-400" />

            <p className="text-sm font-bold text-slate-800">
              Henüz banka hesabı eklemediniz.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Mevcut paranızı takip etmek için banka hesabınızı tanımlayın.
            </p>

            <button
              onClick={() => setOpenAccountModal(true)}
              className="mt-3 cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              + İlk Hesabı Ekle
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {accounts.map((acc) => (

              <div
                key={acc.id}
                className="group flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
              >

                <div>

                  <div className="flex items-start justify-between">

                    <div className="min-w-0">

                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100">
                        {acc.accountType}
                      </span>

                      <h3 className="mt-2 truncate text-base font-extrabold text-slate-900">
                        {acc.bankName}
                      </h3>

                      <p className="truncate text-xs text-slate-500">
                        {acc.accountName}
                      </p>

                    </div>

                    <button
                      title="Sil"
                      onClick={() => {
                        if (
                          confirm(
                            'Bu hesabı silmek istediğinize emin misiniz?'
                          )
                        ) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="ml-2 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                  </div>

                  {acc.notes && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
                      {acc.notes}
                    </p>
                  )}

                </div>

                <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">

                  <span className="text-xs font-medium text-slate-500">
                    Bakiye
                  </span>

                  <span className="shrink-0 whitespace-nowrap text-lg font-black text-slate-900 sm:text-xl">
                    {formatCurrency(acc.balance)}
                  </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =========================================================
          SECTION 2: INCOMES
      ========================================================== */}
      <div className="space-y-4 border-t border-slate-200 pt-4">

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>

                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Düzenli ve Ek Gelirler
                </h2>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                Maaş, yan gelir ve kira getirileri toplamı:{' '}
                <strong className="text-sm font-extrabold text-blue-700">
                  {formatCurrency(totalMonthlyIncome)}
                </strong>
              </p>

            </div>

            <button
              id="add-income-btn"
              onClick={() => setOpenIncomeModal(true)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Gelir Ekle</span>
            </button>

          </div>

        </div>

        {incomes.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">

            <TrendingUp className="mx-auto mb-2 h-10 w-10 text-slate-400" />

            <p className="text-sm font-bold text-slate-800">
              Henüz gelir tanımlanmadı.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Bütçenizi ve günlük güvenli harcamanızı hesaplayabilmemiz için
              maaş veya gelirinizi ekleyin.
            </p>

            <button
              onClick={() => setOpenIncomeModal(true)}
              className="mt-3 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              + Gelir Ekle
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {incomes.map((inc) => (

              <div
                key={inc.id}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {inc.name}
                    </p>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">

                      <span>
                        {inc.frequency === 'monthly'
                          ? 'Aylık'
                          : inc.frequency === 'weekly'
                            ? 'Haftalık'
                            : inc.frequency === 'yearly'
                              ? 'Yıllık'
                              : 'Tek seferlik'}
                      </span>

                      {inc.dayOfMonth && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>Ayın {inc.dayOfMonth}. günü</span>
                        </>
                      )}

                    </div>

                    <p className="mt-1 text-sm font-black text-emerald-700">
                      {formatCurrency(inc.amount)}
                    </p>

                  </div>

                </div>

                <button
                  title="Sil"
                  onClick={() => {
                    if (
                      confirm(
                        'Bu geliri silmek istediğinize emin misiniz?'
                      )
                    ) {
                      onDeleteIncome(inc.id);
                    }
                  }}
                  className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =========================================================
          MODAL: ADD BANK ACCOUNT
      ========================================================== */}
      {openAccountModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">

              <h3 className="text-sm font-bold text-slate-900">
                Yeni Banka Hesabı Ekle
              </h3>

              <button
                onClick={() => setOpenAccountModal(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <form
              onSubmit={handleSaveAccount}
              className="space-y-4 p-6"
            >

              <div>

                <label className={labelClass}>
                  Banka Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti BBVA, Ziraat, Yapı Kredi"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                />

              </div>

              <div>

                <label className={labelClass}>
                  Hesap Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Vadesiz Maaş Hesabı"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className={inputClass}
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className={labelClass}>
                    Hesap Türü
                  </label>

                  <select
                    value={accountType}
                    onChange={(e) =>
                      setAccountType(
                        e.target.value as BankAccount['accountType']
                      )
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option
                      value="vadesiz"
                      className="bg-white text-slate-900"
                    >
                      Vadesiz TL
                    </option>

                    <option
                      value="birikim"
                      className="bg-white text-slate-900"
                    >
                      Birikim / Fon
                    </option>

                    <option
                      value="vadeli"
                      className="bg-white text-slate-900"
                    >
                      Vadeli Mevduat
                    </option>

                    <option
                      value="doviz"
                      className="bg-white text-slate-900"
                    >
                      Döviz
                    </option>

                    <option
                      value="altin"
                      className="bg-white text-slate-900"
                    >
                      Altın Hesabı
                    </option>
                  </select>

                </div>

                <div>

                  <label className={labelClass}>
                    Güncel Bakiye (₺)
                  </label>

                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={balanceStr}
                    onChange={(e) => setBalanceStr(e.target.value)}
                    className={inputClass}
                  />

                </div>

              </div>

              <div>

                <label className={labelClass}>
                  Not / Açıklama (İsteğe Bağlı)
                </label>

                <input
                  type="text"
                  placeholder="Örn: Otomatik kira talimatı bu hesapta"
                  value={accountNotes}
                  onChange={(e) => setAccountNotes(e.target.value)}
                  className={inputClass}
                />

              </div>

              <div className="flex gap-2 pt-2">

                <button
                  type="button"
                  onClick={() => setOpenAccountModal(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Hesabı Kaydet
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =========================================================
          MODAL: ADD INCOME
      ========================================================== */}
      {openIncomeModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">

              <h3 className="text-sm font-bold text-slate-900">
                Yeni Gelir Tanımla
              </h3>

              <button
                onClick={() => setOpenIncomeModal(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <form
              onSubmit={handleSaveIncome}
              className="space-y-4 p-6"
            >

              <div>

                <label className={labelClass}>
                  Gelir Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Şirket Maaşı, Kira Geliri, Freelance"
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  className={incomeInputClass}
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className={labelClass}>
                    Net Tutar (₺)
                  </label>

                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Örn: 45000"
                    value={incomeAmountStr}
                    onChange={(e) =>
                      setIncomeAmountStr(e.target.value)
                    }
                    className={incomeInputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Yatış Günü (Ayın Kaçı?)
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={incomeDay}
                    onChange={(e) => setIncomeDay(e.target.value)}
                    className={incomeInputClass}
                  />

                </div>

              </div>

              <div>

                <label className={labelClass}>
                  Gelir Türü
                </label>

                <select
                  value={incomeCategory}
                  onChange={(e) =>
                    setIncomeCategory(
                      e.target.value as IncomeCategory
                    )
                  }
                  className={`${incomeInputClass} cursor-pointer`}
                >

                  <option
                    value="maas"
                    className="bg-white text-slate-900"
                  >
                    Maaş
                  </option>

                  <option
                    value="freelance"
                    className="bg-white text-slate-900"
                  >
                    Freelance / Proje
                  </option>

                  <option
                    value="kira"
                    className="bg-white text-slate-900"
                  >
                    Kira Geliri
                  </option>

                  <option
                    value="prim"
                    className="bg-white text-slate-900"
                  >
                    Prim / İkramiye
                  </option>

                  <option
                    value="yatirim"
                    className="bg-white text-slate-900"
                  >
                    Yatırım Getirisi
                  </option>

                  <option
                    value="diger"
                    className="bg-white text-slate-900"
                  >
                    Diğer
                  </option>

                </select>

              </div>

              <div className="flex gap-2 pt-2">

                <button
                  type="button"
                  onClick={() => setOpenIncomeModal(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="flex-1 cursor-pointer rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Geliri Kaydet
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};
