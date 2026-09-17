import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  Loader2,
  Receipt,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

import { Expense, ExpenseCategory } from './finance';

interface ReceiptData {
  total?: number | null;
  date?: string;
  merchant?: string;
  category?: ExpenseCategory;
  categoryConfidence?: 'high' | 'medium' | 'low' | string;
  notes?: string;
  time?: string;
  currency?: string;
  payment?: unknown;
  items?: unknown[];
  needsUserConfirmation?: boolean;
}

interface ReceiptApiResult {
  receipt?: ReceiptData;

  // Eski/fallback API yapısı
  amount?: number;
  date?: string;
  category?: ExpenseCategory;
  merchant?: string;
  note?: string;
  confidence?: number;
  rawText?: string;

  error?: string;
  message?: string;
}

interface ReceiptPreviewProps {
  imageData: string;
  onConfirm: (expense: Expense) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS: {
  value: ExpenseCategory;
  label: string;
}[] = [
  { value: 'market', label: 'Market' },
  { value: 'yemek', label: 'Yemek' },
  { value: 'ulasim', label: 'Ulaşım' },
  { value: 'fatura', label: 'Fatura' },
  { value: 'kira', label: 'Kira' },
  { value: 'alisveris', label: 'Alışveriş' },
  { value: 'saglik', label: 'Sağlık' },
  { value: 'eglence', label: 'Eğlence' },
  { value: 'abonelik', label: 'Abonelik' },
  { value: 'egitim', label: 'Eğitim' },
  { value: 'diger', label: 'Diğer' },
];

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  imageData,
  onConfirm,
  onClose,
}) => {
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] =
    useState<ExpenseCategory>('market');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] =
    useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;

    const scanReceipt = async () => {
      setIsScanning(true);
      setError('');

      try {
        const apiBase =
          'https://cebi-finans-api.onrender.com';

        const mimeMatch = imageData.match(
          /^data:(image\/[^;]+);base64,/i
        );

        const mimeType =
          mimeMatch?.[1] || 'image/jpeg';

        const response = await fetch(
          `${apiBase}/api/receipt/analyze`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: imageData,
              mimeType,
            }),
          }
        );

        const contentType =
          response.headers.get('content-type') || '';

        if (!response.ok) {
          let message =
            `Fiş analiz sunucusu hata döndürdü (${response.status}).`;

          if (contentType.includes('application/json')) {
            try {
              const errorData = await response.json();

              if (errorData?.error) {
                message = String(errorData.error);
              } else if (errorData?.message) {
                message = String(errorData.message);
              }
            } catch {
              // Varsayılan hata mesajı kullanılır.
            }
          }

          throw new Error(message);
        }

        if (!contentType.includes('application/json')) {
          const text = await response.text();

          console.error(
            'Receipt API returned non-JSON response:',
            text.slice(0, 500)
          );

          throw new Error(
            'Fiş analiz sunucusu JSON yerine farklı bir yanıt döndürdü.'
          );
        }

        const result: ReceiptApiResult =
          await response.json();

        if (cancelled) return;

        /*
         * Güncel server:
         *
         * {
         *   receipt: {
         *     total,
         *     date,
         *     merchant,
         *     category,
         *     categoryConfidence,
         *     notes
         *   }
         * }
         *
         * Eğer receipt varsa onu kullan.
         * Yoksa eski düz API formatını dönüştür.
         */
        const receipt: ReceiptData =
          result.receipt ?? {
            total: result.amount,
            date: result.date,
            merchant: result.merchant,
            category: result.category,
            categoryConfidence: undefined,
            notes: result.note,
          };

        /*
         * Tutar
         */
        if (
          typeof receipt.total === 'number' &&
          Number.isFinite(receipt.total)
        ) {
          setAmount(
            receipt.total
              .toFixed(2)
              .replace('.', ',')
          );
        }

        /*
         * Tarih
         */
        if (receipt.date) {
          setDate(receipt.date);
        }

        /*
         * Kategori
         */
        if (
          receipt.category &&
          CATEGORY_OPTIONS.some(
            (item) =>
              item.value === receipt.category
          )
        ) {
          setCategory(
            receipt.category
          );
        }

        /*
         * İşletme / market
         */
        if (receipt.merchant) {
          setMerchant(receipt.merchant);
        }

        /*
         * Not
         */
        if (receipt.notes) {
          setNote(receipt.notes);
        }

        /*
         * Kategori güven seviyesi
         */
        if (receipt.categoryConfidence) {
          const confidenceMap: Record<
            string,
            number
          > = {
            high: 0.95,
            medium: 0.75,
            low: 0.5,
          };

          const mapped =
            confidenceMap[
              String(
                receipt.categoryConfidence
              ).toLowerCase()
            ];

          if (mapped !== undefined) {
            setConfidence(mapped);
          }
        }

        /*
         * Eski API confidence alanı
         */
        if (
          confidence === undefined &&
          typeof result.confidence === 'number'
        ) {
          setConfidence(result.confidence);
        }

        /*
         * Tutar okunamadıysa kullanıcıya bildir.
         */
        if (
          typeof receipt.total !== 'number' ||
          !Number.isFinite(receipt.total)
        ) {
          setError(
            'Fiş okundu ancak toplam tutar belirlenemedi. Lütfen tutarı kontrol edin.'
          );
        }
      } catch (scanError) {
        if (cancelled) return;

        console.error(
          'Receipt scan error:',
          scanError
        );

        setError(
          scanError instanceof Error
            ? scanError.message
            : 'Fiş okunurken bir hata oluştu.'
        );
      } finally {
        if (!cancelled) {
          setIsScanning(false);
        }
      }
    };

    scanReceipt();

    return () => {
      cancelled = true;
    };
  }, [imageData]);

  const parseAmount = (value: string): number => {
    const cleaned = value
      .replace(/[₺TLtl\s]/g, '')
      .trim();

    if (!cleaned) return 0;

    if (
      cleaned.includes('.') &&
      cleaned.includes(',')
    ) {
      return Number(
        cleaned
          .replace(/\./g, '')
          .replace(',', '.')
      );
    }

    if (cleaned.includes(',')) {
      return Number(
        cleaned.replace(',', '.')
      );
    }

    return Number(cleaned);
  };

  const handleConfirm = () => {
    const parsedAmount = parseAmount(amount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setError(
        'Geçerli bir fiş tutarı girin.'
      );
      return;
    }

    if (!date) {
      setError('Fiş tarihini girin.');
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      category,
      date,
      paymentSourceId: undefined,
      paymentSourceName: undefined,
      paymentSourceType: 'diger',
      note:
        note.trim() ||
        (merchant.trim()
          ? `${merchant.trim()} fiş`
          : 'Fişten eklenen harcama'),
      isDebtPayment: false,
      relatedDebtType: undefined,
      relatedDebtId: undefined,
      createdAt: new Date().toISOString(),
    };

    onConfirm(expense);
  };

  const handleRetry = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
              <Receipt className="h-6 w-6 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Fiş Önizleme
              </h2>

              <p className="text-xs text-gray-500">
                Bilgileri kontrol et ve kaydet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-5 p-5 md:grid-cols-2">

            {/* Receipt Image */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Fiş Fotoğrafı
                </span>

                {confidence !== undefined && (
                  <span className="text-xs text-gray-400">
                    Güven: %
                    {Math.round(
                      confidence * 100
                    )}
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <img
                  src={imageData}
                  alt="Taranan fiş"
                  className="max-h-[55vh] w-full object-contain"
                />
              </div>
            </div>

            {/* Form */}
            <div>

              {isScanning && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Fiş okunuyor...
                    </p>

                    <p className="text-xs text-emerald-700">
                      Tutar, tarih ve kategori belirleniyor.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">

                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Toplam Tutar
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value)
                      }
                      placeholder="0,00"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-lg font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      ₺
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tarih
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {/* Merchant */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    İşletme / Market
                  </label>

                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) =>
                      setMerchant(e.target.value)
                    }
                    placeholder="Örn. Migros"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Kategori
                  </label>

                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as ExpenseCategory
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    {CATEGORY_OPTIONS.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Not
                  </label>

                  <textarea
                    value={note}
                    onChange={(e) =>
                      setNote(e.target.value)
                    }
                    rows={3}
                    placeholder="İstersen fişle ilgili not ekle..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Yeniden Tara
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isScanning}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Harcamayı Kaydet
          </button>

        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;
