import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Database,
  Building2,
  Wallet,
  Coins,
  ShieldCheck,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onCompleteQuickStart: (params: {
    name: string;
    monthlyIncome: number;
    initialBalance: number;
    initialDebt: number;
  }) => void;
  onLoadDemoData: () => void;
  onStartFresh: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onCompleteQuickStart,
  onLoadDemoData,
  onStartFresh,
}) => {
  const [step, setStep] = useState<'welcome' | 'form'>('welcome');
  const [name, setName] = useState('');
  const [incomeStr, setIncomeStr] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [debtStr, setDebtStr] = useState('');

  if (!isOpen) return null;

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteQuickStart({
      name: name.trim() || 'Kullanıcı',
      monthlyIncome: parseFloat(incomeStr) || 0,
      initialBalance: parseFloat(balanceStr) || 0,
      initialDebt: parseFloat(debtStr) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {step === 'welcome' ? (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-3xl flex items-center justify-center mx-auto shadow-md">
              C
            </div>

            <div>
              <span className="text-[11px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Kişisel Finans Koçu
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
                CEBİ'ye Hoş Geldin
              </h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Paranı kontrol et. Borçlarını, harcamalarını ve günlük güvenli harcama limitini anında gör.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                id="onboard-load-demo-btn"
                onClick={onLoadDemoData}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition" />
                <span>Örnek Demo Verilerle Başla (Önerilen)</span>
              </button>

              <button
                id="onboard-custom-start-btn"
                onClick={() => setStep('form')}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Hızlıca Kendi Bilgilerimle Başla</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="onboard-start-fresh-btn"
                onClick={onStartFresh}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer font-medium"
              >
                Tamamen Boş Başla (Tüm verileri kendim gireceğim)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} className="p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Temel Bilgilerin</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bütçe ve güvenli harcama hesaplamalarını başlatabilmemiz için birkaç sayı yeterli.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adınız veya Hitap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Aylık Net Geliriniz (₺)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Örn: 45000"
                  value={incomeStr}
                  onChange={(e) => setIncomeStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şu Anda Bankada / Nakit Toplam Paranız (₺)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Örn: 25000"
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Varsa Toplam Borcunuz (Kart + Kredi) (₺)
                </label>
                <input
                  type="number"
                  placeholder="Örn: 12000 (Yoksa 0)"
                  value={debtStr}
                  onChange={(e) => setDebtStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Geri
              </button>
              <button
                type="submit"
                className="flex-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                CEBİ'yi Başlat
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
