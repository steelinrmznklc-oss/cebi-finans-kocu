import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, Upload } from 'lucide-react';

interface ReceiptScannerProps {
  onReceiptScanned: (imageData: string) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export default function ReceiptScanner({
  onReceiptScanned,
  onClose,
}: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir fotoğraf veya görsel dosyası seç.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Fotoğraf boyutu en fazla 15 MB olabilir.');
      return;
    }

    setIsReading(true);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === 'string') {
        onReceiptScanned(result);
      } else {
        setError('Fotoğraf okunamadı.');
      }

      setIsReading(false);
    };

    reader.onerror = () => {
      setError('Fotoğraf okunurken bir hata oluştu.');
      setIsReading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Fiş Tara
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Fişin fotoğrafını çek veya galeriden seç
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <ReceiptIcon />
            </div>

            <h3 className="font-semibold text-slate-900">
              Fiş fotoğrafını yükle
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              CEBİ fişteki tutar, tarih ve kategori bilgilerini
              otomatik olarak okumaya çalışacak.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Camera */}
            <button
              type="button"
              disabled={isReading}
              onClick={() => cameraInputRef.current?.click()}
              className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-7 w-7 text-emerald-600" />
              <span className="text-sm font-semibold">
                Kamerayla Çek
              </span>
            </button>

            {/* Gallery */}
            <button
              type="button"
              disabled={isReading}
              onClick={() => galleryInputRef.current?.click()}
              className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageIcon className="h-7 w-7 text-emerald-600" />
              <span className="text-sm font-semibold">
                Galeriden Seç
              </span>
            </button>
          </div>

          {isReading && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              Fotoğraf hazırlanıyor...
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Upload className="h-4 w-4" />
            <span>Desteklenen formatlar: JPG, PNG, WEBP</span>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function ReceiptIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </svg>
  );
}
