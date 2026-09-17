import React, { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Pencil,
  Receipt,
  Store,
  Wallet,
  X,
} from "lucide-react";
import {
  BankAccount,
  CreditCard,
  Expense,
  ExpenseCategory,
} from "./finance";

export interface ReceiptItem {
  name: string;
  quantity: number;
  total: number;
}

export interface ReceiptPayment {
  bank: string | null;
  type: "credit_card" | "bank_account" | "cash" | "unknown";
  last4: string | null;
  confidence: "high" | "medium" | "low";
}

export interface ReceiptDraft {
  merchant: string | null;
  date: string | null;
  time: string | null;
  total: number | null;
  currency: "TRY";
  category: ExpenseCategory;
  categoryConfidence: "high" | "medium" | "low";
  payment: ReceiptPayment;
  items: ReceiptItem[];
  notes: string | null;
  needsUserConfirmation: boolean;
}

interface ReceiptPreviewProps {
  receipt: ReceiptDraft;
  imageUrl?: string;
  accounts: BankAccount[];
  creditCards: CreditCard[];
  onCancel: () => void;
  onConfirm: (expense: Omit<Expense, "id" | "createdAt">) => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  market: "Market",
  yemek: "Yemek",
  ulasim: "Ulaşım",
  fatura: "Fatura",
  kira: "Kira",
  alisveris: "Alışveriş",
  saglik: "Sağlık",
  eglence: "Eğlence",
  abonelik: "Abonelik",
  egitim: "Eğitim",
  diger: "Diğer",
};

function formatTRY(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";

  return `${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function confidenceLabel(value: "high" | "medium" | "low") {
  if (value === "high") return "Yüksek güven";
  if (value === "medium") return "Orta güven";
  return "Kontrol et";
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receipt,
  imageUrl,
  accounts,
  creditCards,
  onCancel,
  onConfirm,
}) => {
  const [merchant, setMerchant] = React.useState(receipt.merchant || "");
  const [amount, setAmount] = React.useState(
    receipt.total !== null ? String(receipt.total) : ""
  );
  const [date, setDate] = React.useState(receipt.date || "");
  const [category, setCategory] = React.useState<ExpenseCategory>(
    receipt.category || "diger"
  );

  // "cash", account id, or card id.
  const [paymentSourceId, setPaymentSourceId] = React.useState(
    receipt.payment.type === "cash" ? "cash" : ""
  );

  const [paymentSourceType, setPaymentSourceType] = React.useState<
    "bank_account" | "credit_card" | "nakit"
  >(
    receipt.payment.type === "credit_card"
      ? "credit_card"
      : receipt.payment.type === "bank_account"
        ? "bank_account"
        : "nakit"
  );

  const [error, setError] = React.useState<string | null>(null);

  const suggestedCards = useMemo(() => {
    if (!receipt.payment.bank && !receipt.payment.last4) return [];

    return creditCards.filter((card) => {
      const bankMatches = receipt.payment.bank
        ? card.bank.toLocaleLowerCase("tr-TR").includes(
            receipt.payment.bank!.toLocaleLowerCase("tr-TR")
          ) ||
          receipt.payment.bank!
            .toLocaleLowerCase("tr-TR")
            .includes(card.bank.toLocaleLowerCase("tr-TR"))
        : true;

      // Current CreditCard model does not contain last4, so last4 is
      // intentionally only displayed as a clue, never used for auto-selection.
      return bankMatches;
    });
  }, [creditCards, receipt.payment.bank, receipt.payment.last4]);

  const paymentDisplay = useMemo(() => {
    if (paymentSourceType === "nakit") return "Nakit";

    if (paymentSourceType === "bank_account") {
      const account = accounts.find((a) => a.id === paymentSourceId);
      return account
        ? `${account.bankName} — ${account.accountName}`
        : "Banka hesabı seç";
    }

    const card = creditCards.find((c) => c.id === paymentSourceId);
    return card ? `${card.bank} — ${card.cardName}` : "Kredi kartı seç";
  }, [
    accounts,
    creditCards,
    paymentSourceId,
    paymentSourceType,
  ]);

  const handleConfirm = () => {
    setError(null);

    const normalizedAmount = Number(
      String(amount).replace(/\./g, "").replace(",", ".")
    );

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError("Geçerli bir toplam tutar gir.");
      return;
    }

    if (!date) {
      setError("Fiş tarihini kontrol et.");
      return;
    }

    if (!paymentSourceId) {
      setError("Ödemenin hangi CEBİ hesabından yapıldığını seç.");
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === paymentSourceId);
    const selectedCard = creditCards.find((c) => c.id === paymentSourceId);

    const paymentSourceName =
      paymentSourceType === "nakit"
        ? "Nakit"
        : paymentSourceType === "bank_account"
          ? selectedAccount
            ? `${selectedAccount.bankName} — ${selectedAccount.accountName}`
            : "Banka Hesabı"
          : selectedCard
            ? `${selectedCard.bank} — ${selectedCard.cardName}`
            : "Kredi Kartı";

    const expense: Omit<Expense, "id" | "createdAt"> = {
      amount: normalizedAmount,
      category,
      date,
      paymentSourceId: paymentSourceId === "cash" ? undefined : paymentSourceId,
      paymentSourceName,
      paymentSourceType,
      note: merchant.trim() || "Fişten eklenen harcama",
      isDebtPayment: false,
    };

    onConfirm(expense);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <h2 className="font-extrabold text-slate-900">
                Fişi böyle okudum
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kaydetmeden önce bilgileri kontrol et.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={imageUrl}
                alt="Yüklenen fiş"
                className="w-full max-h-72 object-contain"
              />
            </div>
          )}

          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Gemini fişi analiz etti
            </div>

            {receipt.notes && (
              <p className="mt-2 text-xs text-emerald-800">
                Not: {receipt.notes}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">
                İşletme
              </span>
              <div className="relative mt-1.5">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                  placeholder="BİM, Migros..."
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">
                Toplam
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="mt-1.5 w-full px-3 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-extrabold"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">
                Tarih
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">
                Kategori
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory)
                }
                className="mt-1.5 w-full px-3 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Ödeme kaynağı
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Fişten görülen bilgi sadece öneridir. CEBİ hesabını sen
                  seçiyorsun.
                </div>
              </div>

              <Wallet className="w-5 h-5 text-slate-400" />
            </div>

            {receipt.payment.bank || receipt.payment.last4 ? (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Fişten görülen ödeme bilgisi
                </div>
                <div className="mt-1">
                  {receipt.payment.bank || "Banka okunamadı"}
                  {receipt.payment.last4
                    ? ` •••• ${receipt.payment.last4}`
                    : ""}
                  {" — "}
                  {confidenceLabel(receipt.payment.confidence)}
                </div>
              </div>
            ) : null}

            {suggestedCards.length > 0 && (
              <div className="mb-3 text-xs text-slate-500">
                Yapılandırılmış CEBİ kartlarından banka eşleşmesi bulundu;
                yine de otomatik seçim yapılmadı.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => {
                  setPaymentSourceType("nakit");
                  setPaymentSourceId("cash");
                }}
                className={`p-3 rounded-xl border text-left ${
                  paymentSourceType === "nakit"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >
                <Wallet className="w-4 h-4 mb-1 text-slate-500" />
                <div className="text-xs font-bold">Nakit</div>
              </button>

              <button
                onClick={() => {
                  setPaymentSourceType("bank_account");
                  setPaymentSourceId("");
                }}
                className={`p-3 rounded-xl border text-left ${
                  paymentSourceType === "bank_account"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >
                <Wallet className="w-4 h-4 mb-1 text-slate-500" />
                <div className="text-xs font-bold">Banka hesabı</div>
              </button>

              <button
                onClick={() => {
                  setPaymentSourceType("credit_card");
                  setPaymentSourceId("");
                }}
                className={`p-3 rounded-xl border text-left ${
                  paymentSourceType === "credit_card"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >
                <CreditCardIcon className="w-4 h-4 mb-1 text-slate-500" />
                <div className="text-xs font-bold">Kredi kartı</div>
              </button>
            </div>

            {paymentSourceType === "bank_account" && (
              <select
                value={paymentSourceId}
                onChange={(e) => setPaymentSourceId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200"
              >
                <option value="">Banka hesabı seç...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} — {account.accountName}
                  </option>
                ))}
              </select>
            )}

            {paymentSourceType === "credit_card" && (
              <select
                value={paymentSourceId}
                onChange={(e) => setPaymentSourceId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200"
              >
                <option value="">Kredi kartı seç...</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.bank} — {card.cardName}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-3 text-xs text-slate-500">
              Seçilen kaynak:{" "}
              <span className="font-bold text-slate-700">
                {paymentDisplay}
              </span>
            </div>
          </div>

          {receipt.items.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm text-slate-900">
                  Okunan ürünler
                </div>
                <Pencil className="w-4 h-4 text-slate-400" />
              </div>

              <div className="divide-y divide-slate-100">
                {receipt.items.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Adet: {item.quantity}
                      </div>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      {formatTRY(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onCancel}
              className="py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Vazgeç
            </button>

            <button
              onClick={handleConfirm}
              className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Onayla ve Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
