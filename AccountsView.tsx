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
  formatTurkishDate,
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

  return (
    <div className="space-y-8 pb-20 md:pb-10 max-w-7xl mx-auto">

      {/* SECTION 1: BANK ACCOUNTS */}
      <div className="space-y-4">
<div className="relative overflow-hidden rounded-3xl bg-[#0B1F33] p-6 sm:p-7 shadow-xl">
  <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
  <div className="absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-emerald-400/5 blur-2xl" />

  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
          <Building2 className="h-5 w-5 text-emerald-400" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
            CEBİ • Varlıklar
          </p>

          <h1 className="mt-0.5 text-xl sm:text-2xl font-black tracking-tight text-white">
            Banka Hesapları
          </h1>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-300">
        Tüm hesaplarınızdaki toplam likit varlık
      </p>

      <div className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">
        {formatCurrency(totalLiquid)}
      </div>
    </div>

    <button
      id="add-bank-account-btn"
      onClick={() => setOpenAccountModal(true)}
      className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 active:scale-[0.98] cursor-pointer"
    >
      <Plus className="h-4 w-4" />
      Yeni Hesap Ekle
    </button>
  </div>
</div>

        {accounts.length === 0 ? (
          <div className="p-10 bg-white rounded-2xl border border-dashed border-slate-200 text-center">

            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />

            <p className="text-sm font-bold text-slate-700">
              Henüz banka hesabı eklemediniz.
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Mevcut paranızı takip etmek için banka hesabınızı tanımlayın.
            </p>

            <button
              onClick={() => setOpenAccountModal(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              + İlk Hesabı Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-4"
              >

                <div>
                  <div className="flex items-start justify-between">

                    <div>
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100">
  {acc.accountType}
</span>

                      <h3 className="font-extrabold text-slate-900 text-base mt-2">
                        {acc.bankName}
                      </h3>

                      <p className="text-xs text-slate-500">
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
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {acc.notes && (
                    <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg">
                      {acc.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">

                  <span className="text-xs text-slate-500">
                    Bakiye
                  </span>

                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    {formatCurrency(acc.balance)}
                  </span>

                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* SECTION 2: INCOMES */}
      <div className="space-y-4 pt-4 border-t border-slate-200">

        <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-7 border border-slate-200 shadow-sm">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
  <TrendingUp className="w-5 h-5 text-emerald-600" />
</div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Düzenli ve Ek Gelirler
              </h2>

            </div>

            <p className="text-xs text-slate-500 mt-1">
              Maaş, yan gelir ve kira getirileri toplamı:{' '}
              <strong className="text-blue-700 font-extrabold text-sm">
                {formatCurrency(totalMonthlyIncome)}
              </strong>
            </p>

          </div>

          <button
            id="add-income-btn"
            onClick={() => setOpenIncomeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Gelir Ekle</span>
          </button>

        </div>

        {incomes.length === 0 ? (

          <div className="p-10 bg-white rounded-2xl border border-dashed border-slate-200 text-center">

            <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />

            <p className="text-sm font-bold text-slate-700">
              Henüz gelir tanımlanmadı.
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Bütçenizi ve günlük güvenli harcamanızı hesaplayabilmemiz için maaş veya gelirinizi ekleyin.
            </p>

            <button
              onClick={() => setOpenIncomeModal(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              + Gelir Ekle
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {incomes.map((inc) => (

              <div
                key={inc.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
              >

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    ₺
                  </div>

                  <div className="min-w-0">

                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {inc.name}
                    </h4>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">

                      <span className="font-medium text-slate-700">
                        {inc.isRecurring
                          ? 'Düzenli Gelir'
                          : 'Tek Seferlik'}
                      </span>

                      <span>•</span>

                      <span>
                        Her ayın {inc.dayOfMonth || 1}'i
                      </span>

                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-3 shrink-0">

                  <div className="text-right">

                    <div className="font-black text-base text-emerald-700">
                      +{formatCurrency(inc.amount)}
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
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* MODAL: ADD BANK ACCOUNT */}
      {openAccountModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">

          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">

              <h3 className="text-sm font-bold text-slate-900">
                Yeni Banka Hesabı Ekle
              </h3>

              <button
                onClick={() => setOpenAccountModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={handleSaveAccount}
              className="p-6 space-y-4"
            >

              <div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banka Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti BBVA, Ziraat, Yapı Kredi"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />

              </div>

              <div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hesap Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Vadesiz Maaş Hesabı"
                  value={accountName}
                  onChange={(e) =>
                    setAccountName(e.target.value)
                  }
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hesap Türü
                  </label>

                  <select
                    value={accountType}
                    onChange={(e) =>
                      setAccountType(
                        e.target.value as BankAccount['accountType']
                      )
                    }
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                  >
                    <option value="vadesiz">
                      Vadesiz TL
                    </option>

                    <option value="birikim">
                      Birikim / Fon
                    </option>

                    <option value="vadeli">
                      Vadeli Mevduat
                    </option>

                    <option value="doviz">
                      Döviz
                    </option>

                    <option value="altin">
                      Altın Hesabı
                    </option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Güncel Bakiye (₺)
                  </label>

                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={balanceStr}
                    onChange={(e) =>
                      setBalanceStr(e.target.value)
                    }
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                  />

                </div>

              </div>

              <div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Not / Açıklama (İsteğe Bağlı)
                </label>

                <input
                  type="text"
                  placeholder="Örn: Otomatik kira talimatı bu hesapta"
                  value={accountNotes}
                  onChange={(e) =>
                    setAccountNotes(e.target.value)
                  }
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />

              </div>

              <div className="pt-2 flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setOpenAccountModal(false)
                  }
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Hesabı Kaydet
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* MODAL: ADD INCOME */}
      {openIncomeModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">

          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">

              <h3 className="text-sm font-bold text-slate-900">
                Yeni Gelir Tanımla
              </h3>

              <button
                onClick={() =>
                  setOpenIncomeModal(false)
                }
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={handleSaveIncome}
              className="p-6 space-y-4"
            >

              <div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gelir Adı
                </label>

                <input
                  type="text"
                  required
                  placeholder="Örn: Şirket Maaşı, Kira Geliri, Freelance"
                  value={incomeName}
                  onChange={(e) =>
                    setIncomeName(e.target.value)
                  }
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
                  />

                </div>

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Yatış Günü (Ayın Kaçı?)
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={incomeDay}
                    onChange={(e) =>
                      setIncomeDay(e.target.value)
                    }
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
                  />

                </div>

              </div>

              <div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gelir Türü
                </label>

                <select
                  value={incomeCategory}
                  onChange={(e) =>
                    setIncomeCategory(
                      e.target.value as IncomeCategory
                    )
                  }
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
                >

                  <option value="maas">
                    Maaş
                  </option>

                  <option value="freelance">
                    Freelance / Proje
                  </option>

                  <option value="kira">
                    Kira Geliri
                  </option>

                  <option value="prim">
                    Prim / İkramiye
                  </option>

                  <option value="yatirim">
                    Yatırım Getirisi
                  </option>

                  <option value="diger">
                    Diğer
                  </option>

                </select>

              </div>

              <div className="pt-2 flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setOpenIncomeModal(false)
                  }
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
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
