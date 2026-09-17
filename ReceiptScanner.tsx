import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Receipt,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  BankAccount,
  CreditCard,
  Expense,
} from "./finance";
import {
  ReceiptDraft,
  ReceiptPreview,
} from "./ReceiptPreview";

interface ReceiptScannerProps {
  accounts: BankAccount[];
  creditCards: CreditCard[];
  onConfirmExpense: (
    expense: Omit<Expense, "id" | "createdAt">
  ) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  accounts,
  creditCards,
  onConfirmExpense,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);

    setSelectedFile(null);
    setImageUrl(null);
    setDraft(null);
    setError(null);
    setIsAnalyzing(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;

    setError(null);
    setDraft(null);

    if (!file.type.startsWith("image/")) {
      setError("Lütfen fişin fotoğrafını seç.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Fotoğraf 10 MB'dan küçük olmalı.");
      return;
    }

    if (imageUrl) URL.revokeObjectURL(imageUrl);

    setSelectedFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result);
      };

      reader.onerror = () =>
        reject(new Error("Fotoğraf okunamadı."));
      reader.readAsDataURL(file);
    });

  const analyzeReceipt = async () => {
    if (!selectedFile) {
      setError("Önce fiş fotoğrafını seç.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const dataUrl = await fileToBase64(selectedFile);

      const response = await fetch("/api/receipt/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: dataUrl,
          mimeType: selectedFile.type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || `Sunucu ${response.status} döndürdü.`
        );
      }

      if (!result?.receipt) {
        throw new Error("Fiş analizi sonucu alınamadı.");
      }

      setDraft(result.receipt as ReceiptDraft);
    } catch (err: any) {
      console.error("Receipt scanner error:", err);
      setError(
        err?.message ||
          "Fiş analiz edilirken bir sorun oluştu. Tekrar deneyin."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmed = (
    expense: Omit<Expense, "id" | "createdAt">
  ) => {
    onConfirmExpense(expense);
    onClose();
    reset();
  };

  if (draft) {
    return (
      <ReceiptPreview
        receipt={draft}
        imageUrl={imageUrl || undefined}
        accounts={accounts}
        creditCards={creditCards}
        onCancel={() => setDraft(null)}
        onConfirm={handleConfirmed}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <h2 className="font-extrabold text-slate-900">
                Fişten Harcama Ekle
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fotoğrafı gönder, CEBİ fişi okuyup taslak hazırlasın.
            </p>
          </div>

          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!imageUrl ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-emerald-600" />
              </div>

              <h3 className="font-extrabold text-slate-900">
                Fiş fotoğrafını seç
              </h3>

              <p className="text-sm text-slate-500 mt-2 mb-5">
                Telefonda kamerayı açabilir veya galeriden mevcut bir fiş
                fotoğrafını seçebilirsin.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Fotoğraf çek
                </button>

                <button
                  onClick={() => inputRef.current?.click()}
                  className="py-3 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-5 h-5" />
                  Galeriden seç
                </button>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={imageUrl}
                  alt="Fiş önizleme"
                  className="w-full max-h-[55vh] object-contain"
                />

                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/95 shadow flex items-center justify-center text-slate-700"
                  title="Fotoğrafı değiştir"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Upload className="w-4 h-4" />
                <span>{selectedFile?.name}</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={analyzeReceipt}
                disabled={isAnalyzing}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fiş okunuyor...
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    Fişi Oku
                  </>
                )}
              </button>
            </>
          )}

          {!imageUrl && error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-700 mb-2">
              CEBİ güvenlik kuralı
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Gemini'nin okuduğu bilgi doğrudan kaydedilmez. Önce sana
              gösterilir; işletme, tutar, tarih, kategori ve ödeme kaynağını
              kontrol edip <strong>Onayla ve Kaydet</strong> dediğinde mevcut
              harcama akışına gönderilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
