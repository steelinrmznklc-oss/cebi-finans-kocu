import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Calculator,
  ShieldAlert,
  Check,
  X,
  FileJson,
} from 'lucide-react';
import {
  exportDataAsJSON,
  importDataFromJSON,
} from './storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDemo: () => void;
  onClearAll: () => void;
  onDataImported: () => void;
  onLoadSimulationScenario?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetDemo,
  onClearAll,
  onDataImported,
  onLoadSimulationScenario,
}) => {
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const jsonStr = exportDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cebi_finans_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Verileriniz JSON dosyası olarak başarıyla indirildi.');
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (content) {
          importDataFromJSON(content);
          setMessage('Dosyadan veriler başarıyla yüklendi!');
          setShowImportArea(false);
          setImportJsonText('');
          onDataImported();
        }
      } catch (err: any) {
        alert(`Hata: ${err.message || 'Geçersiz JSON dosyası'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      if (!importJsonText.trim()) return;
      importDataFromJSON(importJsonText.trim());
      setMessage('Veriler başarıyla yüklendi!');
      setShowImportArea(false);
      setImportJsonText('');
      onDataImported();
    } catch (err: any) {
      alert(`Hata: ${err.message || 'Geçersiz JSON verisi'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Ayarlar & Veri Yönetimi</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {/* SECTION 1: FORMULAS TRANSPARENCY */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>CEBİ Hesaplama Formülleri</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              CEBİ'de hiçbir matematiksel hesaplama yapay zekâya bırakılmaz. Tüm rakamlar yerleşik deterministik finansal motor ile hesaplanır:
            </p>
            <div className="space-y-1.5 pt-1 text-slate-700 font-mono text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>Kullanılabilir Bütçe</strong> = Aylık Gelir - Yapılan Harcamalar - Yaklaşan Zorunlu Ödemeler
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>Günlük Güvenli Harcama</strong> = Kullanılabilir Bütçe / Ay Sonuna Kalan Gün Sayısı
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>Borç Yükü Oranı</strong> = Toplam Borç / Aylık Net Gelir × 100
              </div>
            </div>
          </div>

          {/* SECTION 2: BACKUP & EXPORT */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Yedekleme & Aktarım</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Verileri Dışa Aktar (JSON)</span>
              </button>

              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Verileri İçe Aktar (JSON)</span>
              </button>
            </div>

            {showImportArea && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                {/* File Upload / Drag & Drop */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 transition bg-white cursor-pointer"
                  onClick={() => document.getElementById('json-file-input')?.click()}
                >
                  <FileJson className="w-8 h-8 text-blue-500 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700">JSON dosyasını sürükleyin veya seçin</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tıklayarak cihazınızdan dosya yükleyin (.json)</p>
                  <input
                    id="json-file-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 text-slate-400 my-1">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-[10px] font-bold uppercase">veya metin yapıştırın</span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <textarea
                  rows={3}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"profile": {...}, "accounts": [...] }'
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] outline-hidden focus:border-emerald-500"
                />
                <button
                  onClick={handleImport}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  Metin Yedeğini Yükle ve Uygula
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: DEMO & RESET */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Veri Sıfırlama & Test Senaryosu</h3>
            
            {onLoadSimulationScenario && (
              <button
                onClick={() => {
                  if (confirm('10 adımlı finansal simülasyon test senaryosu yüklensin mi?\n\n• Ziraat Bankası: 20.000 ₺\n• Kredi Kartı: 30.000 ₺ limit / 0 borç\n• Kredi: 60.000 ₺ / 5.000 ₺ taksit\n• Aylık Maaş: 35.000 ₺')) {
                    onLoadSimulationScenario();
                    onClose();
                  }
                }}
                className="w-full p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 font-bold text-indigo-900 flex items-center justify-center gap-2 transition cursor-pointer text-left"
              >
                <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">Finansal Simülasyon Test Senaryosunu Yükle</div>
                  <div className="text-[11px] text-indigo-700 font-normal">Ziraat 20k, Kredi 60k, Kart 30k limit, Maaş 35k</div>
                </div>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (confirm('Örnek demo verileri geri yüklemek istiyor musunuz?')) {
                    onResetDemo();
                    onClose();
                  }
                }}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 font-bold text-amber-900 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Örnek Demo Verileri Yükle</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Tüm finansal verileriniz silinecektir. Emin misiniz?')) {
                    onClearAll();
                    onClose();
                  }
                }}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 font-bold text-rose-800 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Tüm Verileri Temizle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
