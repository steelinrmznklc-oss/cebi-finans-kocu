import React, { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  Receipt,
  AlertCircle,
} from 'lucide-react';

interface ReceiptScannerProps {
  onReceiptScanned: (imageData: string) => void;
  onClose: () => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onReceiptScanned,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const processImage = (file: File) => {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir görüntü dosyası seçin.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Fiş fotoğrafı 15 MB'dan küçük olmalıdır.');
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        setError('Fotoğraf okunamadı.');
        setIsProcessing(false);
        return;
      }

      /*
       * Görsel doğrudan base64/data URL olarak ReceiptPreview'a aktarılır.
       * OCR işlemi server.ts tarafından yapılacaktır.
       */
      onReceiptScanned(result);
      setIsProcessing(false);
    };

    reader.onerror = () => {
      setError('Fotoğraf okunurken bir hata oluştu.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      processImage(file);
    }

    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
              <Receipt className="h-6 w-6 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Fiş Tara
              </h2>
              <p className="text-xs text-gray-500">
                Fişi CEBİ okusun
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

        {/* Content */}
        <div className="p-5">
          <div className="mb-5 rounded-2xl bg-gray-50 p-4 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Receipt className="h-8 w-8 text-emerald-600" />
            </div>

            <h3 className="font-semibold text-gray-900">
              Fiş fotoğrafını seç
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              CEBİ fişteki tutar, tarih ve ürün bilgilerini
              otomatik olarak okuyacak.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-600" />

              <p className="font-medium text-gray-900">
                Fotoğraf hazırlanıyor...
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Lütfen bekleyin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl bg-emerald-600 px-5 py-4 text-left text-white transition hover:bg-emerald-700 active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Camera className="h-6 w-6" />
                </div>

                <div>
                  <div className="font-semibold">
                    Kamerayla Fiş Çek
                  </div>

                  <div className="text-xs text-emerald-100">
                    Yeni bir fiş fotoğrafı çek
                  </div>
                </div>
              </button>

              {/* Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left text-gray-900 transition hover:bg-gray-50 active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <ImageIcon className="h-6 w-6 text-gray-600" />
                </div>

                <div>
                  <div className="font-semibold">
                    Galeriden Seç
                  </div>

                  <div className="text-xs text-gray-500">
                    Daha önce çekilmiş fiş fotoğrafını kullan
                  </div>
                </div>
              </button>

              {/* Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
              >
                <Upload className="h-4 w-4" />
                Dosyadan yükle
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-gray-400">
            Daha doğru sonuç için fişin tamamının net ve okunabilir
            olduğundan emin olun.
          </p>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ReceiptScanner;
