import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  AlertCircle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wallet,
  ShieldCheck,
  CreditCard,
  User,
} from 'lucide-react';
import {
  FinancialSnapshot,
  CoachMessage,
} from '../types/finance';
import { formatCurrency } from '../utils/financialCalculations';

interface CoachViewProps {
  snapshot: FinancialSnapshot;
  messages: CoachMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearHistory: () => void;
  isLoading: boolean;
}

const QUICK_QUESTIONS = [
  'Bu ay fazla mı harcadım?',
  'Bu ay 5.000 TL alışveriş yapabilir miyim?',
  'Önce hangi borcumu ödemeliyim?',
  'Bu ay param yeter mi?',
  'Harcamalarımda sorun var mı?',
  'Bu ay neye dikkat etmeliyim?',
];

export const CoachView: React.FC<CoachViewProps> = ({
  snapshot,
  messages,
  onSendMessage,
  onClearHistory,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [showSnapshotDrawer, setShowSnapshotDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    onSendMessage(text);
  };

  const handleQuickQuestion = (question: string) => {
    if (isLoading) return;
    onSendMessage(question);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-6rem)] max-w-5xl mx-auto pb-16 md:pb-2">
      {/* Top Coach Header */}
      <div className="bg-white p-4 rounded-t-2xl border-x border-t border-slate-200/90 shadow-xs flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900">CEBİ Finans Koçu</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Gemini AI Destekli
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kişiselleştirilmiş bütçe analizi, harcama rehberliği ve borç önceliklendirme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Snapshot Transparency */}
          <button
            id="toggle-snapshot-drawer-btn"
            onClick={() => setShowSnapshotDrawer(!showSnapshotDrawer)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Koçun gördüğü veriler"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Veri Görünümü</span>
            {showSnapshotDrawer ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Clear chat history */}
          <button
            id="clear-coach-history-btn"
            onClick={() => {
              if (confirm('Sohbet geçmişini temizlemek istiyor musunuz?')) {
                onClearHistory();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Sohbeti Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SNAPSHOT TRANSPARENCY DRAWER */}
      {showSnapshotDrawer && (
        <div className="bg-slate-50 border-x border-b border-slate-200 p-4 text-xs space-y-2.5 animate-fade-in shrink-0">
          <div className="flex items-center justify-between text-slate-700 font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Koçun Hesaplamalarda Kullandığı Anlık Veriler (Snapshot)
            </span>
            <span className="text-[10px] text-slate-400">
              *Tüm matematik koddadır, AI sadece yorumlar.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Mevcut Likit Para</span>
              <span className="font-bold">{formatCurrency(snapshot.totalBalance)}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Günlük Güvenli Harcama</span>
              <span className={`font-bold ${snapshot.hasCashShortfall ? 'text-rose-600' : 'text-emerald-700'}`}>
                {snapshot.hasCashShortfall ? '0 ₺ (Nakit Açığı)' : formatCurrency(snapshot.dailySafeSpending)}
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Planlanan Günlük Bütçe</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(snapshot.plannedDailyBudget)} / gün
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Yaklaşan Ödemeler</span>
              <span className="font-bold text-slate-900">{formatCurrency(snapshot.upcomingPaymentsTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50 border-x border-slate-200 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-600 text-white shadow-2xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>CEBİ düşünüyor ve hesaplamalarını analiz ediyor...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK QUESTIONS PILLS */}
      <div className="bg-white px-4 py-2 border-x border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Örnek Sorular:
          </span>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              disabled={isLoading}
              onClick={() => handleQuickQuestion(q)}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* INPUT FORM & DISCLAIMER */}
      <div className="bg-white p-4 rounded-b-2xl border-x border-b border-slate-200/90 shadow-xs shrink-0 space-y-2">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            id="coach-user-input"
            type="text"
            placeholder="Finansal bir soru sor (örn: Bu ay 5.000 TL alışveriş yapabilir miyim?)..."
            value={inputText}
            disabled={isLoading}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden disabled:opacity-50"
          />

          <button
            id="coach-send-message-btn"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 sm:px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gönder</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center">
          ⚠️ CEBİ bir yapay zekâ finansal rehberidir ve kesin yatırım tavsiyesi vermez. Kararlar kullanıcı sorumluluğundadır.
        </p>
      </div>
    </div>
  );
};
