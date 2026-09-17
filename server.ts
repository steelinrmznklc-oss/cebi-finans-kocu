import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));

/**
 * =========================================================
 * CEBİ — CORS
 * =========================================================
 */

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

/**
 * =========================================================
 * GEMINI
 * =========================================================
 */

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "cebi-finans-kocu",
        },
      },
    });
  }

  return aiClient;
}

/**
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * =========================================================
 * TOOL DEFINITIONS
 * =========================================================
 */

const addExpenseTool = {
  name: "add_expense",

  description:
    "Kullanıcının GERÇEKTEN yaptığı tüketim harcamasını CEBİ'ye kaydeder. " +
    "Kullanıcı geçmiş veya gerçekleşmiş bir harcamadan bahsediyorsa kullan. " +
    "Gelecekte yapılacak harcamalarda kullanma. " +
    "Kredi kartı borcu, kredi taksiti, KMH veya başka borç kapatma işlemlerinde kullanma. " +
    "Ödeme kaynağı bilinmiyorsa tool çağırma; önce kullanıcıya sor.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          "Harcama tutarı. Türk Lirası cinsinden pozitif sayı.",
      },

      category: {
        type: Type.STRING,
        enum: [
          "market",
          "yemek",
          "ulasim",
          "fatura",
          "kira",
          "alisveris",
          "saglik",
          "eglence",
          "abonelik",
          "egitim",
          "akaryakit",
          "ev",
          "giyim",
          "elektronik",
          "sigorta",
          "vergi",
          "diger",
        ],
        description:
          "Harcamanın CEBİ kategori değeri.",
      },

      date: {
        type: Type.STRING,
        description:
          "Harcama tarihi. YYYY-MM-DD formatında.",
      },

      paymentSourceId: {
        type: Type.STRING,
        description:
          "Harcamanın yapıldığı gerçek CEBİ ödeme kaynağı ID'si. " +
          "Yalnızca gönderilen finansal verilerdeki gerçek ID kullanılabilir. " +
          "Nakit için 'cash' kullan.",
      },

      paymentSourceType: {
        type: Type.STRING,
        enum: [
          "bank_account",
          "credit_card",
          "cash",
          "other",
        ],
        description:
          "Ödeme kaynağının tipi.",
      },

      note: {
        type: Type.STRING,
        description:
          "Kısa ve anlaşılır harcama açıklaması.",
      },
    },

    required: [
      "amount",
      "category",
      "date",
      "paymentSourceId",
      "paymentSourceType",
      "note",
    ],
  },
};

const addIncomeTool = {
  name: "add_income",

  description:
    "Kullanıcının GERÇEKTEN aldığı veya hesabına geçen geliri CEBİ'ye kaydeder. " +
    "Maaş, avans, freelance ödeme, kira geliri ve diğer gerçek gelirler için kullan. " +
    "Gelirin yatırıldığı banka hesabı bilinmiyorsa targetAccountId uydurma; önce sor.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          "Gelir tutarı. Türk Lirası cinsinden pozitif sayı.",
      },

      name: {
        type: Type.STRING,
        description:
          "Gelirin kısa adı. Örneğin Maaş, Avans veya Freelance ödeme.",
      },

      category: {
        type: Type.STRING,
        enum: [
          "maas",
          "avans",
          "freelance",
          "ticari",
          "kira",
          "diger",
        ],
        description:
          "Gelirin CEBİ kategori değeri.",
      },

      paymentDate: {
        type: Type.STRING,
        description:
          "Gelirin hesaba geçtiği tarih. YYYY-MM-DD.",
      },

      frequency: {
        type: Type.STRING,
        enum: [
          "monthly",
          "one_time",
          "biweekly",
          "weekly",
        ],
        description:
          "Gelirin tekrar sıklığı.",
      },

      isRecurring: {
        type: Type.BOOLEAN,
        description:
          "Gelir düzenli olarak tekrar ediyor mu?",
      },

      dayOfMonth: {
        type: Type.NUMBER,
        description:
          "Aylık düzenli gelirlerde ödeme günü.",
      },

      targetAccountId: {
        type: Type.STRING,
        description:
          "Gelirin yatırıldığı gerçek CEBİ banka hesabı ID'si.",
      },
    },

    required: [
      "amount",
      "name",
      "category",
      "paymentDate",
      "frequency",
      "isRecurring",
      "targetAccountId",
    ],
  },
};

const makeDebtPaymentTool = {
  name: "make_debt_payment",

  description:
    "Kullanıcının GERÇEKTEN yaptığı kredi kartı, kredi, KMH veya diğer borç ödemesini CEBİ'ye kaydeder. " +
    "Tüketim harcaması ile borç ödemesini birbirine karıştırma.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      debtType: {
        type: Type.STRING,
        enum: [
          "card",
          "loan",
          "kmh",
          "other",
        ],
        description:
          "Ödenen borcun tipi.",
      },

      debtId: {
        type: Type.STRING,
        description:
          "Ödenen borcun gerçek CEBİ ID'si.",
      },

      amount: {
        type: Type.NUMBER,
        description:
          "Ödenen borç tutarı.",
      },

      bankAccountId: {
        type: Type.STRING,
        description:
          "Ödemenin yapıldığı gerçek banka hesabı ID'si.",
      },
    },

    required: [
      "debtType",
      "debtId",
      "amount",
      "bankAccountId",
    ],
  },
};

const cebiTools = [
  addExpenseTool,
  addIncomeTool,
  makeDebtPaymentTool,
];

/**
 * =========================================================
 * GENEL YARDIMCILAR
 * =========================================================
 */

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function todayTR(): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

function formatTL(value: unknown): string {
  return safeNumber(value).toLocaleString("tr-TR");
}

function normalizeTR(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/**
 * =========================================================
 * TÜRKÇE TUTAR PARSER
 * =========================================================
 */

function parseTurkishAmount(text: string): number | null {
  const normalized = normalizeTR(text);

  const currencyMatch = normalized.match(
    /(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)[\s]*(?:tl|lira|₺)\b/i
  );

  const rawMatch =
    currencyMatch ||
    normalized.match(
      /(?:^|\s)(\d{2,7}(?:[.,]\d+)?)(?:\s|$)/i
    );

  if (!rawMatch) {
    return null;
  }

  let raw = rawMatch[1].replace(/\s/g, "");

  if (raw.includes(".") && raw.includes(",")) {
    raw = raw
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  } else if (/^\d{1,3}\.\d{3}$/.test(raw)) {
    raw = raw.replace(".", "");
  }

  const amount = Number(raw);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

/**
 * =========================================================
 * TÜRKÇE SAYI KELİMELERİ
 * =========================================================
 */

const TURKISH_NUMBER_VALUES: Record<string, number> = {
  sifir: 0,
  bir: 1,
  iki: 2,
  uc: 3,
  dort: 4,
  bes: 5,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kirk: 40,
  elli: 50,
  altmis: 60,
  yetmis: 70,
  seksen: 80,
  doksan: 90,
  yuz: 100,
  bin: 1000,
  milyon: 1000000,
  milyar: 1000000000,
};

function parseTurkishWords(text: string): number | null {
  const q = normalizeTR(text);

  const match = q.match(
    /((?:sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bin|milyon|milyar)(?:\s+(?:sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bin|milyon|milyar))*)\s*(?:tl|lira|₺)?/
  );

  if (!match) {
    return null;
  }

  const words = match[1].split(/\s+/);

  let total = 0;
  let current = 0;

  for (const word of words) {
    const value = TURKISH_NUMBER_VALUES[word];

    if (value === undefined) {
      continue;
    }

    if (
      word === "bin" ||
      word === "milyon" ||
      word === "milyar"
    ) {
      if (current === 0) {
        current = 1;
      }

      current *= value;
      total += current;
      current = 0;
    } else if (word === "yuz") {
      if (current === 0) {
        current = 1;
      }

      current *= 100;
    } else {
      current += value;
    }
  }

  total += current;

  return total > 0 ? total : null;
}

/**
 * =========================================================
 * FİNANSAL KAYNAKLAR
 * =========================================================
 */

function formatFinancialSources(body: any): string {
  const accounts = Array.isArray(body?.accounts)
    ? body.accounts
    : [];

  const creditCards = Array.isArray(body?.creditCards)
    ? body.creditCards
    : [];

  const loans = Array.isArray(body?.loans)
    ? body.loans
    : [];

  const overdrafts = Array.isArray(body?.overdrafts)
    ? body.overdrafts
    : [];

  const otherDebts = Array.isArray(body?.otherDebts)
    ? body.otherDebts
    : [];

  const lines: string[] = [];

  lines.push("==================================================");
  lines.push("CEBİ GERÇEK FİNANSAL KAYNAKLARI");
  lines.push("==================================================");

  lines.push("");
  lines.push("BANKA HESAPLARI:");

  if (accounts.length === 0) {
    lines.push("- Kayıtlı banka hesabı yok.");
  } else {
    for (const account of accounts) {
      lines.push(
        `- ID: ${String(account.id)} | Banka: ${
          account.bankName || "Bilinmiyor"
        } | Hesap: ${
          account.accountName || "Bilinmiyor"
        } | Bakiye: ${formatTL(account.balance)} ₺`
      );
    }
  }

  lines.push("");
  lines.push("KREDİ KARTLARI:");

  if (creditCards.length === 0) {
    lines.push("- Kayıtlı kredi kartı yok.");
  } else {
    for (const card of creditCards) {
      lines.push(
        `- ID: ${String(card.id)} | Banka: ${
          card.bank || card.bankName || "Bilinmiyor"
        } | Kart: ${
          card.cardName || card.name || "Bilinmiyor"
        } | Mevcut Borç: ${formatTL(
          card.currentDebt
        )} ₺ | Kullanılabilir Limit: ${formatTL(
          card.availableLimit
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("KREDİLER:");

  if (loans.length === 0) {
    lines.push("- Kayıtlı kredi yok.");
  } else {
    for (const loan of loans) {
      lines.push(
        `- ID: ${String(loan.id)} | Banka: ${
          loan.bank || "Bilinmiyor"
        } | Kredi: ${
          loan.loanName || loan.name || "Bilinmiyor"
        } | Kalan Anapara: ${formatTL(
          loan.remainingPrincipal
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("KMH / EK HESAP:");

  if (overdrafts.length === 0) {
    lines.push("- Kayıtlı KMH yok.");
  } else {
    for (const overdraft of overdrafts) {
      lines.push(
        `- ID: ${String(overdraft.id)} | Banka: ${
          overdraft.bank || "Bilinmiyor"
        } | Hesap: ${
          overdraft.accountName || "Bilinmiyor"
        } | Kullanılan: ${formatTL(
          overdraft.usedAmount
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("DİĞER BORÇLAR:");

  if (otherDebts.length === 0) {
    lines.push("- Kayıtlı diğer borç yok.");
  } else {
    for (const debt of otherDebts) {
      lines.push(
        `- ID: ${String(debt.id)} | Borç: ${
          debt.debtName || debt.name || "Bilinmiyor"
        } | Tutar: ${formatTL(debt.amount)} ₺`
      );
    }
  }

  return lines.join("\n");
}

/**
 * =========================================================
 * SNAPSHOT
 * =========================================================
 */

function formatSnapshot(snapshot: any): string {
  const categoryBreakdown =
    Array.isArray(snapshot?.categoryBreakdown) &&
    snapshot.categoryBreakdown.length > 0
      ? snapshot.categoryBreakdown
          .map(
            (c: any) =>
              `- ${c.name}: ${formatTL(
                c.amount
              )} ₺ (%${c.percentage || 0})`
          )
          .join("\n")
      : "Henüz harcama kaydı yok.";

  const debtDetails =
    Array.isArray(snapshot?.debtDetails) &&
    snapshot.debtDetails.length > 0
      ? snapshot.debtDetails
          .map(
            (d: any) =>
              `- ${d.type} (${d.name}): Toplam Borç ${formatTL(
                d.amount
              )} ₺, Asgari/Taksit: ${formatTL(
                d.monthlyOrMin || 0
              )} ₺, Vade/Ödeme: ${
                d.dueDate || "Belirtilmemiş"
              }`
          )
          .join("\n")
      : "Kayıtlı borç bulunmuyor.";

  const incomes =
    Array.isArray(snapshot?.incomes) &&
    snapshot.incomes.length > 0
      ? snapshot.incomes
          .map(
            (i: any) =>
              `- ${i.name}: ${formatTL(
                i.amount
              )} ₺ (${
                i.isRecurring
                  ? "Her ay düzenli"
                  : "Tek seferlik"
              }, Ödeme Günü: ${
                i.paymentDate || "Belirtilmemiş"
              })`
          )
          .join("\n")
      : "Kayıtlı gelir bulunmuyor.";

  return `
KULLANICI FİNANSAL ANLIK DURUMU:

- Toplam Mevcut Para / Banka Bakiyesi: ${formatTL(
    snapshot?.totalBalance
  )} ₺

- Aylık Planlanan Gelir: ${formatTL(
    snapshot?.monthlyIncome
  )} ₺

- Fiilen Yatan Gelir: ${formatTL(
    snapshot?.realizedMonthlyIncome ??
      snapshot?.monthlyIncome
  )} ₺

- Beklenen Gelecek Gelir: ${formatTL(
    snapshot?.pendingMonthlyIncome
  )} ₺

- Bu Ay Tüketim Harcamaları: ${formatTL(
    snapshot?.monthlyExpenses
  )} ₺

- Bu Ay Borç Geri Ödemeleri: ${formatTL(
    snapshot?.totalDebtRepayments
  )} ₺

- Kalan Bütçe: ${formatTL(
    snapshot?.remainingBudget
  )} ₺

- Kalan Gün: ${snapshot?.remainingDays || 0}

- Yaklaşan Zorunlu Ödemeler: ${formatTL(
    snapshot?.upcomingPaymentsTotal
  )} ₺

- Net Likit: ${formatTL(
    snapshot?.netLiquidAvailable ??
      safeNumber(snapshot?.totalBalance) -
        safeNumber(snapshot?.upcomingPaymentsTotal)
  )} ₺

- Nakit Açığı: ${
    snapshot?.hasCashShortfall
      ? `${formatTL(snapshot?.cashShortfall)} ₺`
      : "Yok"
  }

- Günlük Güvenli Harcama: ${
    snapshot?.hasCashShortfall
      ? "0 ₺"
      : `${formatTL(snapshot?.dailySafeSpending)} ₺`
  }

- Planlanan Günlük Bütçe: ${formatTL(
    snapshot?.plannedDailyBudget
  )} ₺

- Toplam Borç: ${formatTL(
    snapshot?.totalDebt
  )} ₺

- Kredi Kartı Borcu: ${formatTL(
    snapshot?.creditCardDebt
  )} ₺

- Kredi Anapara Borcu: ${formatTL(
    snapshot?.loanDebt
  )} ₺

- KMH Borcu: ${formatTL(
    snapshot?.overdraftDebt
  )} ₺

- Diğer Borçlar: ${formatTL(
    snapshot?.otherDebt
  )} ₺

HARCAMA KATEGORİ DAĞILIMI:
${categoryBreakdown}

BORÇ VE YAKLAŞAN ÖDEME DETAYLARI:
${debtDetails}

GELİR DETAYLARI:
${incomes}
`;
}

/**
 * =========================================================
 * KONUŞMA GEÇMİŞİ
 * =========================================================
 */

function normalizeHistoryRole(
  item: any
): "user" | "model" {
  if (
    item?.role === "user" ||
    item?.sender === "user"
  ) {
    return "user";
  }

  return "model";
}

function getHistoryText(item: any): string {
  return String(
    item?.text ||
      item?.content ||
      item?.message ||
      ""
  ).trim();
}

/**
 * Gemini'ye gidecek konuşma geçmişini temizler.
 *
 * ÖNEMLİ:
 * App.tsx bazı sürümlerde mevcut kullanıcı mesajını
 * history içinde de gönderiyor.
 *
 * Bu fonksiyon mevcut mesajı history'den ayırır.
 */
function buildGeminiContents(
  conversationHistory: any,
  currentMessage: string
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  const history = Array.isArray(conversationHistory)
    ? conversationHistory
    : [];

  const current = currentMessage.trim();

  const cleaned: Array<{
    role: "user" | "model";
    text: string;
  }> = [];

  for (const item of history.slice(-20)) {
    const text = getHistoryText(item);

    if (!text) {
      continue;
    }

    const role = normalizeHistoryRole(item);

    /**
     * Eğer frontend son kullanıcı mesajını history içinde
     * zaten gönderdiyse, aşağıda currentMessage olarak
     * tekrar eklememek için son eşleşmeyi atlıyoruz.
     */
    if (
      role === "user" &&
      text === current &&
      item === history[history.length - 1]
    ) {
      continue;
    }

    cleaned.push({
      role,
      text,
    });
  }

  /**
   * Gemini konuşması user mesajıyla başlamalı.
   */
  if (
    cleaned.length > 0 &&
    cleaned[0].role !== "user"
  ) {
    cleaned.unshift({
      role: "user",
      text: "CEBİ finans koçu görüşmesi başlıyor.",
    });
  }

  /**
   * Art arda aynı role sahip mesajları birleştir.
   *
   * Böylece:
   * user
   * user
   *
   * yerine tek user mesajı gider.
   */
  const merged: Array<{
    role: "user" | "model";
    text: string;
  }> = [];

  for (const item of cleaned) {
    const last = merged[merged.length - 1];

    if (last && last.role === item.role) {
      last.text = `${last.text}\n${item.text}`;
    } else {
      merged.push({
        role: item.role,
        text: item.text,
      });
    }
  }

  /**
   * Güncel kullanıcı mesajını en sona ekle.
   */
  if (current) {
    const last = merged[merged.length - 1];

    if (last?.role === "user") {
      /**
       * Eğer history'de son mesaj zaten current ise
       * tekrar ekleme.
       */
      if (
        normalizeTR(last.text) !==
        normalizeTR(current)
      ) {
        last.text = `${last.text}\n${current}`;
      }
    } else {
      merged.push({
        role: "user",
        text: current,
      });
    }
  }

  return merged.map((item) => ({
    role: item.role,
    parts: [
      {
        text: item.text,
      },
    ],
  }));
}

/**
 * =========================================================
 * FALLBACK EXPENSE HELPERS
 * =========================================================
 */

function detectExpenseCategory(text: string): string {
  const q = normalizeTR(text);

  if (
    /market|migros|carrefour|bim|a101|sok/.test(q)
  ) {
    return "market";
  }

  if (
    /restoran|lokanta|kafe|kahve|yemek|pizza|burger/.test(
      q
    )
  ) {
    return "yemek";
  }

  if (
    /benzin|mazot|akaryakit|petrol|opet|shell|bp/.test(
      q
    )
  ) {
    return "akaryakit";
  }

  if (
    /fatura|elektrik|su fatur|dogalgaz|internet fatur/.test(
      q
    )
  ) {
    return "fatura";
  }

  if (/kira/.test(q)) {
    return "kira";
  }

  if (
    /ulasim|otobus|metro|taksi|uber|dolmus/.test(q)
  ) {
    return "ulasim";
  }

  if (
    /saglik|eczane|doktor|ilac|hastane/.test(q)
  ) {
    return "saglik";
  }

  if (
    /giyim|elbise|ayakkabi|pantolon|mont/.test(q)
  ) {
    return "giyim";
  }

  if (
    /elektronik|telefon|laptop|bilgisayar|tablet/.test(
      q
    )
  ) {
    return "elektronik";
  }

  if (
    /abonelik|netflix|spotify|youtube premium/.test(
      q
    )
  ) {
    return "abonelik";
  }

  if (/egitim|kurs|okul|ders/.test(q)) {
    return "egitim";
  }

  if (
    /eglence|sinema|konser|oyun/.test(q)
  ) {
    return "eglence";
  }

  if (/alisveris|magaza/.test(q)) {
    return "alisveris";
  }

  if (
    /ev esyasi|mobilya|ev/.test(q)
  ) {
    return "ev";
  }

  if (/sigorta/.test(q)) {
    return "sigorta";
  }

  if (/vergi/.test(q)) {
    return "vergi";
  }

  return "diger";
}

function isCompletedExpenseStatement(
  text: string
): boolean {
  const q = normalizeTR(text);

  const completed =
    /\b(yaptim|harcadim|harcama yaptim|odeme yaptim|odedim|aldim|satin aldim|alisveris yaptim|harcadik|aldik)\b/.test(
      q
    );

  const futureOrQuestion =
    /(yapacagim|harcayacagim|odeyecegim|alacagim|yapabilir miyim|harcayabilir miyim|alabilir miyim|yapsam|alsam|harcasam)/.test(
      q
    );

  return completed && !futureOrQuestion;
}

function findExplicitExpenseSource(
  text: string,
  data: any
) {
  const q = normalizeTR(text);

  const cards = Array.isArray(data?.creditCards)
    ? data.creditCards
    : [];

  const accounts = Array.isArray(data?.accounts)
    ? data.accounts
    : [];

  /**
   * Kredi kartları.
   */
  for (const card of cards) {
    const bank = normalizeTR(
      String(
        card.bank ||
          card.bankName ||
          ""
      )
    );

    const name = normalizeTR(
      String(
        card.cardName ||
          card.name ||
          ""
      )
    );

    if (
      (bank && q.includes(bank)) ||
      (name && q.includes(name))
    ) {
      return {
        id: String(card.id),
        type: "credit_card",
        name: `${card.bank || card.bankName || ""} - ${
          card.cardName || card.name || ""
        }`.trim(),
      };
    }
  }

  /**
   * Banka hesapları.
   */
  for (const account of accounts) {
    const bank = normalizeTR(
      String(account.bankName || "")
    );

    const name = normalizeTR(
      String(account.accountName || "")
    );

    if (
      (bank && q.includes(bank)) ||
      (name && q.includes(name))
    ) {
      return {
        id: String(account.id),
        type: "bank_account",
        name: `${account.bankName || ""} - ${
          account.accountName || ""
        }`.trim(),
      };
    }
  }

  /**
   * Nakit.
   */
  if (/nakit|cash/.test(q)) {
    return {
      id: "cash",
      type: "cash",
      name: "Nakit",
    };
  }

  /**
   * Tek kart varsa "kartımla" gibi ifadeler.
   */
  if (
    cards.length === 1 &&
    /kart|kredi/.test(q)
  ) {
    const card = cards[0];

    return {
      id: String(card.id),
      type: "credit_card",
      name: `${card.bank || card.bankName || ""} - ${
        card.cardName || card.name || ""
      }`.trim(),
    };
  }

  /**
   * Tek banka hesabı varsa "hesabımdan" gibi ifadeler.
   */
  if (
    accounts.length === 1 &&
    /hesabimdan|bankadan|hesabim/.test(q)
  ) {
    const account = accounts[0];

    return {
      id: String(account.id),
      type: "bank_account",
      name: `${account.bankName || ""} - ${
        account.accountName || ""
      }`.trim(),
    };
  }

  return null;
}

function tryBuildExpenseAction(
  text: string,
  date: string,
  data: any
) {
  if (!isCompletedExpenseStatement(text)) {
    return null;
  }

  let amount = parseTurkishAmount(text);

  if (!amount) {
    amount = parseTurkishWords(text);
  }

  if (!amount) {
    return null;
  }

  const source = findExplicitExpenseSource(
    text,
    data
  );

  if (!source) {
    return null;
  }

  return {
    name: "add_expense",

    args: {
      amount,

      category:
        detectExpenseCategory(text),

      date,

      paymentSourceId:
        source.id,

      paymentSourceType:
        source.type,

      note:
        text.trim(),
    },
  };
}

/**
 * =========================================================
 * FALLBACK COACH
 * =========================================================
 */

function generateFallbackCoachReply(
  question: string,
  snapshot: any
): string {
  const q = normalizeTR(question);

  const safeDaily = safeNumber(
    snapshot?.dailySafeSpending
  );

  const remainingBudget = safeNumber(
    snapshot?.remainingBudget
  );

  const totalBalance = safeNumber(
    snapshot?.totalBalance
  );

  const totalDebt = safeNumber(
    snapshot?.totalDebt
  );

  const monthlyIncome = safeNumber(
    snapshot?.monthlyIncome
  );

  const monthlyExpenses = safeNumber(
    snapshot?.monthlyExpenses
  );

  const totalDebtRepayments = safeNumber(
    snapshot?.totalDebtRepayments
  );

  const upcomingPaymentsTotal = safeNumber(
    snapshot?.upcomingPaymentsTotal
  );

  const remainingDays = Math.max(
    1,
    safeNumber(snapshot?.remainingDays)
  );

  const hasCashShortfall = Boolean(
    snapshot?.hasCashShortfall ||
      (
        totalBalance <
          upcomingPaymentsTotal &&
        upcomingPaymentsTotal > 0
      )
  );

  const cashShortfall = safeNumber(
    snapshot?.cashShortfall ||
      (
        hasCashShortfall
          ? upcomingPaymentsTotal -
            totalBalance
          : 0
      )
  );

  const plannedDailyBudget = safeNumber(
    snapshot?.plannedDailyBudget
  );

  const debtDetails = Array.isArray(
    snapshot?.debtDetails
  )
    ? snapshot.debtDetails
    : [];

  if (
    q.includes("ne kadar harcadim") ||
    q.includes("toplam harcamam") ||
    q.includes("harcamalarim")
  ) {
    let text =
      `Bu ay toplam **${formatTL(
        monthlyExpenses
      )} ₺** tüketim harcaması yaptın.`;

    if (totalDebtRepayments > 0) {
      text +=
        `\n\nAyrıca borç kapatma ve taksit ödemeleri için **${formatTL(
          totalDebtRepayments
        )} ₺** ödeme gerçekleştirdin. Bu tüketim harcaması değildir.`;
    }

    return text;
  }

  if (
    q.includes("bankada ne kadar") ||
    q.includes("hesabimda ne kadar") ||
    q.includes("kac param var") ||
    q.includes("param var")
  ) {
    return `CEBİ'ye kayıtlı banka hesaplarındaki toplam kullanılabilir nakit bakiyen **${formatTL(
      totalBalance
    )} ₺**.`;
  }

  if (
    q.includes("toplam borcum") ||
    (
      q.includes("borcum") &&
      q.includes("ne kadar")
    )
  ) {
    let reply =
      `Şu anki toplam kayıtlı borcun **${formatTL(
        totalDebt
      )} ₺** seviyesinde.`;

    if (debtDetails.length > 0) {
      reply +=
        "\n\nBorç Dağılımı:\n" +
        debtDetails
          .map(
            (d: any) =>
              `• ${d.name} (${d.type}): ${formatTL(
                d.amount
              )} ₺`
          )
          .join("\n");
    }

    return reply;
  }

  if (
    q.includes("guvenli olarak") ||
    q.includes("guvenli harcama") ||
    q.includes("bugun ne kadar")
  ) {
    if (hasCashShortfall) {
      return `Şu anda banka hesabında **${formatTL(
        totalBalance
      )} ₺** nakit bulunurken, ay sonuna kadar **${formatTL(
        upcomingPaymentsTotal
      )} ₺** zorunlu ödeme yükümlülüğün var.\n\nBu nedenle mevcut nakdinde **-${formatTL(
        cashShortfall
      )} ₺** açık bulunuyor. Bugünkü **Günlük Güvenli Harcama limitin 0 ₺**.`;
    }

    return `Bugün için Günlük Güvenli Harcama Limitin **${formatTL(
      safeDaily
    )} ₺**. Kalan ${remainingDays} güne göre mevcut likit durumun bu seviyeyi gösteriyor.\n\nPlanlanan günlük bütçen ise **${formatTL(
      plannedDailyBudget
    )} ₺**.`;
  }

  if (
    q.includes("hangi borcumu") ||
    q.includes("borc kapat") ||
    q.includes("borc ode")
  ) {
    if (totalDebt === 0) {
      return `**Durumun:** Kayıtlı borcun bulunmuyor.`;
    }

    return `**Durumun:** Toplam kayıtlı borcun **${formatTL(
      totalDebt
    )} ₺**.\n\nÖncelikle gecikme riski olan zorunlu ödemeleri dikkate al.`;
  }

  if (
    q.includes("alisveris") ||
    q.includes("alabilir miyim") ||
    q.includes("harcayabilir miyim")
  ) {
    const match = q.match(
      /(\d+[\d\.,]*)/
    );

    const amount = match
      ? parseFloat(
          match[1]
            .replace(/\./g, "")
            .replace(",", ".")
        )
      : 0;

    if (hasCashShortfall) {
      return `Şu anda **${formatTL(
        cashShortfall
      )} ₺** nakit açığın var. Günlük güvenli harcama limitin 0 ₺.`;
    }

    if (
      snapshot?.isOverBudget ||
      amount > remainingBudget
    ) {
      return `Kalan bütçen **${formatTL(
        remainingBudget
      )} ₺**. ${formatTL(
        amount
      )} ₺ tutarındaki harcama bütçeni aşabilir.`;
    }

    return `Kalan bütçen **${formatTL(
      remainingBudget
    )} ₺**, günlük güvenli limitin **${formatTL(
      safeDaily
    )} ₺**.`;
  }

  if (
    q.includes("fazla mi harcadim") ||
    q.includes("harcamalarimda sorun var mi")
  ) {
    const spentRatio =
      monthlyIncome > 0
        ? (monthlyExpenses / monthlyIncome) * 100
        : 0;

    if (
      snapshot?.isOverBudget ||
      remainingBudget < 0
    ) {
      return `Bu ay bütçeni yaklaşık **${formatTL(
        Math.abs(remainingBudget)
      )} ₺** aşmış görünüyorsun.\n\nTüketim harcamaların **${formatTL(
        monthlyExpenses
      )} ₺** seviyesinde.`;
    }

    return `Bu ay ${formatTL(
      monthlyIncome
    )} ₺ gelir karşılığında ${formatTL(
      monthlyExpenses
    )} ₺ tüketim harcaman var. Bu yaklaşık **%${Math.round(
      spentRatio
    )}**.\n\nGünlük güvenli limitin **${formatTL(
      safeDaily
    )} ₺**.`;
  }

  if (safeDaily > 0) {
    return `Toplam kullanılabilir paran **${formatTL(
      totalBalance
    )} ₺**, bu ayki tüketim harcaman **${formatTL(
      monthlyExpenses
    )} ₺**.\n\nGünlük güvenli harcama limitin **${formatTL(
      safeDaily
    )} ₺**.`;
  }

  return `Bankadaki nakit bakiyen **${formatTL(
    totalBalance
  )} ₺**, bu ayki tüketim harcaman **${formatTL(
    monthlyExpenses
  )} ₺**.\n\nYaklaşan zorunlu ödemelerin toplamı **${formatTL(
    upcomingPaymentsTotal
  )} ₺**.`;
}

/**
 * =========================================================
 * TOOL ACTION VALIDATION
 * =========================================================
 */

function validateToolAction(
  actionName: string,
  args: any,
  sourceData: any
): {
  valid: boolean;
  reason?: string;
} {
  if (!args) {
    return {
      valid: false,
      reason:
        "İşlem parametreleri bulunamadı.",
    };
  }

  if (actionName === "add_expense") {
    const amount = safeNumber(args.amount);

    if (amount <= 0) {
      return {
        valid: false,
        reason:
          "Harcama tutarı geçersiz.",
      };
    }

    const paymentSourceId = String(
      args.paymentSourceId || ""
    ).trim();

    const paymentSourceType = String(
      args.paymentSourceType || ""
    ).trim();

    if (
      !paymentSourceId ||
      !paymentSourceType
    ) {
      return {
        valid: false,
        reason:
          "Harcama ödeme kaynağı belirtilmeden oluşturulamaz.",
      };
    }

    if (paymentSourceType === "cash") {
      if (paymentSourceId !== "cash") {
        return {
          valid: false,
          reason:
            "Nakit ödeme kaynağı için paymentSourceId 'cash' olmalıdır.",
        };
      }

      return {
        valid: true,
      };
    }

    if (paymentSourceType === "credit_card") {
      const exists =
        sourceData.creditCards.some(
          (card: any) =>
            String(card.id) ===
            paymentSourceId
        );

      if (!exists) {
        return {
          valid: false,
          reason:
            "Seçilen kredi kartı CEBİ kayıtlarında bulunamadı.",
        };
      }

      return {
        valid: true,
      };
    }

    if (paymentSourceType === "bank_account") {
      const exists =
        sourceData.accounts.some(
          (account: any) =>
            String(account.id) ===
            paymentSourceId
        );

      if (!exists) {
        return {
          valid: false,
          reason:
            "Seçilen banka hesabı CEBİ kayıtlarında bulunamadı.",
        };
      }

      return {
        valid: true,
      };
    }

    return {
      valid: true,
    };
  }

  if (actionName === "add_income") {
    const amount = safeNumber(args.amount);

    if (amount <= 0) {
      return {
        valid: false,
        reason:
          "Gelir tutarı geçersiz.",
      };
    }

    const targetAccountId = String(
      args.targetAccountId || ""
    ).trim();

    if (!targetAccountId) {
      return {
        valid: false,
        reason:
          "Gelirin yatırıldığı banka hesabı belirtilmelidir.",
      };
    }

    const exists =
      sourceData.accounts.some(
        (account: any) =>
          String(account.id) ===
          targetAccountId
      );

    if (!exists) {
      return {
        valid: false,
        reason:
          "Gelir hesabı CEBİ kayıtlarında bulunamadı.",
      };
    }

    return {
      valid: true,
    };
  }

  if (actionName === "make_debt_payment") {
    const amount = safeNumber(args.amount);

    if (amount <= 0) {
      return {
        valid: false,
        reason:
          "Borç ödeme tutarı geçersiz.",
      };
    }

    const debtId = String(
      args.debtId || ""
    ).trim();

    const bankAccountId = String(
      args.bankAccountId || ""
    ).trim();

    const debtType = String(
      args.debtType || ""
    ).trim();

    if (!debtId || !bankAccountId) {
      return {
        valid: false,
        reason:
          "Borç ve ödeme hesabı belirtilmelidir.",
      };
    }

    let debtExists = false;

    if (debtType === "card") {
      debtExists =
        sourceData.creditCards.some(
          (card: any) =>
            String(card.id) ===
            debtId
        );
    } else if (debtType === "loan") {
      debtExists =
        sourceData.loans.some(
          (loan: any) =>
            String(loan.id) ===
            debtId
        );
    } else if (debtType === "kmh") {
      debtExists =
        sourceData.overdrafts.some(
          (item: any) =>
            String(item.id) ===
            debtId
        );
    } else if (debtType === "other") {
      debtExists =
        sourceData.otherDebts.some(
          (item: any) =>
            String(item.id) ===
            debtId
        );
    }

    if (!debtExists) {
      return {
        valid: false,
        reason:
          "Seçilen borç CEBİ kayıtlarında bulunamadı.",
      };
    }

    const accountExists =
      sourceData.accounts.some(
        (account: any) =>
          String(account.id) ===
          bankAccountId
      );

    if (!accountExists) {
      return {
        valid: false,
        reason:
          "Seçilen banka hesabı CEBİ kayıtlarında bulunamadı.",
      };
    }

    return {
      valid: true,
    };
  }

  return {
    valid: false,
    reason:
      "Bilinmeyen finansal işlem.",
  };
}

/**
 * =========================================================
 * CEBİ COACH API
 * =========================================================
 */

app.post(
  "/api/coach",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const body = req.body || {};

      const {
        question,
        message,
        snapshot,

        conversationHistory,
        history,

        accounts,
        creditCards,
        loans,
        overdrafts,
        otherDebts,

        incomes,
        expenses,
        scheduledPayments,

        profile,

        today,
        currentDate,
      } = body;

      const queryText = String(
        question ||
          message ||
          ""
      ).trim();

      if (!queryText) {
        res.status(400).json({
          error:
            "Soru veya mesaj metni belirtilmelidir.",
        });

        return;
      }

      const date =
        String(
          currentDate ||
            today ||
            ""
        ).trim() ||
        todayTR();

      const sourceData = {
        accounts: Array.isArray(accounts)
          ? accounts
          : [],

        creditCards: Array.isArray(
          creditCards
        )
          ? creditCards
          : [],

        loans: Array.isArray(loans)
          ? loans
          : [],

        overdrafts: Array.isArray(
          overdrafts
        )
          ? overdrafts
          : [],

        otherDebts: Array.isArray(
          otherDebts
        )
          ? otherDebts
          : [],
      };

      const formattedSnapshot =
        formatSnapshot(
          snapshot || {}
        );

      const formattedSources =
        formatFinancialSources(
          sourceData
        );

      /**
       * Eski ve yeni frontend formatlarını destekle.
       */
      const rawHistory =
        Array.isArray(
          conversationHistory
        )
          ? conversationHistory
          : Array.isArray(history)
          ? history
          : [];

      /**
       * =====================================================
       * GEMINI YOKSA FALLBACK
       * =====================================================
       */

      const ai = getGenAI();

      if (!ai) {
        const directFallbackAction =
          tryBuildExpenseAction(
            queryText,
            date,
            sourceData
          );

        if (directFallbackAction) {
          const actionAnswer =
            `Tamam. ${formatTL(
              directFallbackAction.args
                .amount
            )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

          res.json({
            answer: actionAnswer,
            reply: actionAnswer,
            isRuleBased: true,
            action:
              directFallbackAction,
          });

          return;
        }

        const fallbackReply =
          generateFallbackCoachReply(
            queryText,
            snapshot || {}
          );

        res.json({
          answer: fallbackReply,
          reply: fallbackReply,
          isRuleBased: true,
          action: null,
        });

        return;
      }

      /**
       * =====================================================
       * SYSTEM INSTRUCTION
       * =====================================================
       */

      const systemInstruction = `
Sen CEBİ adlı kişisel finans uygulamasının yapay zekâ Finans Koçusun.

Sen basit bir komut botu değilsin.
Kullanıcı seninle doğal Türkçe konuşur.

Görevin:
1. Kullanıcının ne demek istediğini anlamak.
2. Önceki konuşmaları dikkate almak.
3. CEBİ'nin gerçek finansal verilerini dikkate almak.
4. Gerekiyorsa finansal işlem tool'u çağırmak.
5. Eksik kritik bilgi varsa kısa bir netleştirme sorusu sormak.
6. Kullanıcı sadece soru soruyorsa hiçbir finansal işlem oluşturmamak.

BUGÜN:
${date}

==================================================
1 — DOĞAL KONUŞMA
==================================================

Her zaman Türkçe konuş.

Kullanıcı sana doğal, eksik veya kısa cümlelerle yazabilir.

Örnek:

Kullanıcı:
"Bugün markette 500 TL harcadım."

Sen:
"Hangi kart veya hesaptan ödedin?"

Kullanıcı:
"Garanti Bonus."

Bu ikinci mesajı önceki mesajdan bağımsız değerlendirme.

"Garanti Bonus" ifadesinin önceki harcamanın ödeme kaynağı olduğunu anla.

Benzer şekilde:

"nakit"
"ondan"
"evet"
"hayır"
"Bonus"
"Garanti"
"hesabımdan"
"o kart"
"evet o"
"aynen"

gibi kısa cevaplarda önceki konuşmayı kullan.

Ancak bağlam yeterli değilse tahmin etme.

==================================================
2 — KONUŞMA BAĞLAMI
==================================================

Son mesajı tek başına değerlendirme.

Önceki kullanıcı ve asistan mesajlarını birlikte değerlendir.

Kullanıcı önceki mesajında söylediği bir işlemi sonraki mesajında tamamlayabilir.

Örneğin:

Kullanıcı:
"Markette 500 TL harcadım."

CEBİ:
"Hangi kartla?"

Kullanıcı:
"Bonus."

Burada ikinci mesajın anlamı:
"Harcamayı Bonus kartla yaptım."

Bunu doğal konuşma bağlamından çıkar.

==================================================
3 — GERÇEKLEŞMİŞ İŞLEM
==================================================

Gerçekten gerçekleşmiş finansal işlemleri tool ile kaydet.

Örneğin:

"500 TL harcadım."
"Marketten 500 TL alışveriş yaptım."
"Bugün 800 TL yemek yedim."
"45000 TL maaşım yattı."
"Kredi kartı borcuma 5000 TL ödedim."

Bunlar gerçekleşmiş işlem olabilir.

Gelecek zamanlı işlemleri gerçekleşmiş işlem olarak kaydetme.

Örneğin:

"500 TL harcayacağım."
"Yarın 1000 TL ödeyeceğim."
"Bu karttan alacağım."
"500 TL harcasam olur mu?"
"1000 TL harcayabilir miyim?"

Bunlarda işlem oluşturma.

==================================================
4 — HARCAMA VE BORÇ ÖDEMESİ
==================================================

Tüketim harcaması ile borç ödemesini kesinlikle ayır.

TÜKETİM:

"Marketten 500 TL alışveriş yaptım."
"Restoranda 800 TL yemek yedim."
"Benzine 1500 TL verdim."

Bunlar add_expense işlemidir.

BORÇ ÖDEMESİ:

"Kredi kartı borcuma 5000 TL ödedim."
"Kredimin taksidini 10000 TL ödedim."
"KMH borcuma 2000 TL yatırdım."

Bunlar make_debt_payment işlemidir.

Borç ödemesini add_expense ile kaydetme.

==================================================
5 — HARCAMA ÖDEME KAYNAĞI
==================================================

Harcama kaydında ödeme kaynağı zorunludur.

Örneğin:

"Markette 850 TL harcadım."

Ödeme kaynağı bilinmiyorsa tool çağırma.

Sor:

"Hangi kart veya hesaptan ödedin?"

Kullanıcı:

"Garanti Bonus."

Önceki mesajla birleştir ve uygun gerçek kredi kartı ID'sini seç.

Kullanıcı:

"Garanti kartımdan."

Önceki konuşmadaki harcama ile birleştir.

Birden fazla uygun kart veya hesap varsa tahmin etme.

Kullanıcıya sor.

ASLA ID UYDURMA.

Yalnızca CEBİ tarafından gönderilen gerçek ID'leri kullan.

Nakit açıkça belirtilmişse:

paymentSourceId = "cash"
paymentSourceType = "cash"

==================================================
6 — GELİR
==================================================

Örneğin:

"Maaşım yattı 45000 TL."

Gerçekleşmiş gelir olarak değerlendir.

Ancak gelirin hangi banka hesabına yattığı bilinmiyorsa targetAccountId uydurma.

Birden fazla hesap varsa kullanıcıya sor.

==================================================
7 — BORÇ ÖDEMESİ
==================================================

Kredi kartı borcu:
debtType = "card"

Kredi veya kredi taksiti:
debtType = "loan"

KMH veya ek hesap:
debtType = "kmh"

Diğer borç:
debtType = "other"

Borç ID'sini yalnızca gerçek CEBİ verilerinden seç.

Ödeme hesabı ID'sini yalnızca gerçek banka hesaplarından seç.

==================================================
8 — TARİH
==================================================

Kullanıcı tarih belirtmezse:
${date}

"bugün" = ${date}

"dün" = bugünden bir gün önce.

"yarın" = bugünden bir gün sonra.

Tool'a her zaman YYYY-MM-DD formatında tarih gönder.

==================================================
9 — KATEGORİLER
==================================================

Market, Migros, Carrefour, BİM, A101, Şok:
market

Restoran, lokanta, kafe, kahve, pizza, burger:
yemek

Benzin, mazot, akaryakıt, petrol:
akaryakit

Fatura, elektrik, su, doğalgaz, internet:
fatura

Kira:
kira

Otobüs, metro, taksi, ulaşım:
ulasim

Eczane, doktor, ilaç, hastane:
saglik

Giyim, elbise, ayakkabı:
giyim

Telefon, laptop, bilgisayar, elektronik:
elektronik

Netflix, Spotify, abonelik:
abonelik

Kurs, okul, eğitim:
egitim

Sinema, konser, oyun:
eglence

Mağaza veya genel alışveriş:
alisveris

Ev eşyası veya ev harcaması:
ev

Sigorta:
sigorta

Vergi:
vergi

==================================================
10 — TÜRKÇE TUTARLAR
==================================================

850 TL = 850

850 lira = 850

850₺ = 850

1.500 TL = 1500

2.500,50 TL = 2500.50

sekiz yüz elli lira = 850

iki bin beş yüz = 2500

bin iki yüz elli = 1250

==================================================
11 — SORU MU, İŞLEM Mİ?
==================================================

"500 TL harcasam olur mu?"

Bu işlem değildir.

Finansal duruma göre cevap ver.

"Bugün 500 TL harcadım."

Bu gerçekleşmiş işlemdir.

Gerekli bilgiler varsa add_expense kullan.

"Market alışverişi yaptım ama kaç tuttuğunu hatırlamıyorum."

Tutar yoktur.

Tool çağırma.

Tutarı sor.

"Garanti kartımla markette 500 TL harcadım."

Gerekli bilgiler varsa doğrudan add_expense kullan.

==================================================
12 — FİNANSAL ANALİZ
==================================================

Finansal cevaplarını CEBİ snapshot verilerine dayandır.

Banka bakiyesi ile borcu birbirine karıştırma.

Tüketim harcaması ile borç ödemesini birbirine karıştırma.

Günlük güvenli harcama ile planlanan günlük bütçeyi birbirine karıştırma.

Nakit açığı varsa günlük güvenli harcamayı 0 ₺ kabul et.

CEBİ banka sistemlerine canlı erişmez.

Sadece gönderilen CEBİ verilerini kullan.

Kullanıcının söylemediği finansal bilgileri uydurma.

==================================================
13 — GERÇEK CEBİ VERİLERİ
==================================================

Aşağıdaki ID'ler gerçek CEBİ ID'leridir.

Tool çağrılarında yalnızca bu ID'leri kullan.

${formattedSources}

==================================================
14 — KULLANICI SNAPSHOT
==================================================

${formattedSnapshot}

==================================================
15 — PROFİL
==================================================

${JSON.stringify(
  profile || {},
  null,
  2
)}

==================================================
16 — GELİRLER
==================================================

${JSON.stringify(
  Array.isArray(incomes)
    ? incomes.slice(0, 50)
    : [],
  null,
  2
)}

==================================================
17 — SON HARCAMALAR
==================================================

${JSON.stringify(
  Array.isArray(expenses)
    ? expenses.slice(0, 50)
    : [],
  null,
  2
)}

==================================================
18 — PLANLANAN ÖDEMELER
==================================================

${JSON.stringify(
  Array.isArray(scheduledPayments)
    ? scheduledPayments.slice(0, 50)
    : [],
  null,
  2
)}

==================================================
19 — SON KARAR KURALI
==================================================

Önce kullanıcının niyetini ANLA.

Sonra:

- Finansal soruysa cevapla.
- Gerçekleşmiş işlemse gerekli bilgiler mevcutsa tool çağır.
- Kritik bilgi eksikse yalnızca eksik bilgiyi sor.
- Önceki mesajlarla bağlantıyı mutlaka değerlendir.
- Kısa cevapları önceki konuşmayla birleştir.
- ID uydurma.
- Kullanıcının söylemediği finansal bilgileri uydurma.
- Gelecek işlemleri gerçekleşmiş işlem olarak kaydetme.
`;

      /**
       * =====================================================
       * GEMINI CONTENTS
       * =====================================================
       */

      const contents = buildGeminiContents(
        rawHistory,
        queryText
      );

      /**
       * =====================================================
       * GEMINI
       * =====================================================
       */

      const response =
        await ai.models.generateContent({
          model: "gemini-3.8-flash",

          contents,

          config: {
            systemInstruction,

            tools: [
              {
                functionDeclarations:
                  cebiTools,
              },
            ],
          },
        });

      /**
       * =====================================================
       * FUNCTION CALL
       * =====================================================
       */

      const functionCalls =
        response.functionCalls || [];

      if (functionCalls.length > 0) {
        const firstCall =
          functionCalls[0];

        const actionName =
          String(
            firstCall.name || ""
          ).trim();

        const actionArgs =
          firstCall.args || {};

        /**
         * Backend güvenlik kontrolü.
         */
        const validation =
          validateToolAction(
            actionName,
            actionArgs,
            sourceData
          );

        if (!validation.valid) {
          const clarification =
            validation.reason ||
            "İşlemi oluşturabilmem için bir bilgiyi netleştirmem gerekiyor.";

          res.json({
            answer: clarification,
            reply: clarification,
            isRuleBased: true,
            action: null,
          });

          return;
        }

        const action = {
          name: actionName,
          args: actionArgs,
        };

        let actionAnswer =
          "İşlemi CEBİ'ye aktarıyorum.";

        if (actionName === "add_expense") {
          actionAnswer =
            `Tamam. ${formatTL(
              actionArgs.amount
            )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;
        }

        if (actionName === "add_income") {
          actionAnswer =
            `Tamam. ${formatTL(
              actionArgs.amount
            )} ₺ tutarındaki geliri CEBİ'ye ekliyorum.`;
        }

        if (
          actionName ===
          "make_debt_payment"
        ) {
          actionAnswer =
            `Tamam. ${formatTL(
              actionArgs.amount
            )} ₺ tutarındaki borç ödemesini CEBİ'ye işliyorum.`;
        }

        res.json({
          answer: actionAnswer,
          reply: actionAnswer,
          isRuleBased: false,
          action,
        });

        return;
      }

      /**
       * =====================================================
       * NORMAL CHAT
       * =====================================================
       */

      const answer =
        response.text ||
        "Şu anda finansal verilerini analiz ederken bir sorun oluştu. Lütfen tekrar deneyin.";

      res.json({
        answer,
        reply: answer,
        isRuleBased: false,
        action: null,
      });
    } catch (error: any) {
      console.error(
        "CEBİ Coach API error:",
        error
      );

      const body = req.body || {};

      const query = String(
        body.question ||
          body.message ||
          ""
      ).trim();

      const sourceData = {
        accounts:
          Array.isArray(body.accounts)
            ? body.accounts
            : [],

        creditCards:
          Array.isArray(
            body.creditCards
          )
            ? body.creditCards
            : [],

        loans:
          Array.isArray(body.loans)
            ? body.loans
            : [],

        overdrafts:
          Array.isArray(
            body.overdrafts
          )
            ? body.overdrafts
            : [],

        otherDebts:
          Array.isArray(
            body.otherDebts
          )
            ? body.otherDebts
            : [],
      };

      /**
       * Gemini hata verirse son çare:
       * açık ve tamamlanmış harcamayı yerel parser
       * ile yakala.
       */
      const fallbackAction =
        tryBuildExpenseAction(
          query,
          String(
            body.currentDate ||
              body.today ||
              ""
          ).trim() ||
            todayTR(),
          sourceData
        );

      if (fallbackAction) {
        const actionAnswer =
          `Tamam. ${formatTL(
            fallbackAction.args.amount
          )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

        res.status(200).json({
          answer: actionAnswer,
          reply: actionAnswer,
          isRuleBased: true,
          action: fallbackAction,
          errorNotice:
            "Yapay zeka servisine geçici olarak ulaşılamadığı için açık işlem CEBİ yerel işlem motoru ile algılandı.",
        });

        return;
      }

      const fallbackReply =
        generateFallbackCoachReply(
          query,
          body.snapshot || {}
        );

      res.status(200).json({
        answer: fallbackReply,
        reply: fallbackReply,
        isRuleBased: true,
        action: null,
        errorNotice:
          "Yapay zeka servisine geçici olarak ulaşılamadığı için CEBİ kural tabanlı finans motoru ile yanıtlandı.",
      });
    }
  }
);

/**
 * =========================================================
 * VITE / PRODUCTION SERVER
 * =========================================================
 */

async function startServer() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: "spa",
      });

    app.use(vite.middlewares);
  } else {
    const distPath =
      path.join(
        process.cwd(),
        "dist"
      );

    app.use(
      express.static(distPath)
    );

    app.get(
      "*",
      (_req, res) => {
        res.sendFile(
          path.join(
            distPath,
            "index.html"
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `CEBİ server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

startServer();
