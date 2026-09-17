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
 *
 * API anahtarı sadece server tarafında tutulur.
 * APK içine Gemini API key konmaz.
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

/**
 * HARCAMA EKLE
 */

const addExpenseTool = {
  name: "add_expense",

  description:
    "Kullanıcının GERÇEKTEN yaptığı bir tüketim harcamasını CEBİ'ye kaydetmek için kullanılır. " +
    "Kullanıcı gerçekten para harcadığını söylüyorsa ve tutar, kategori, tarih ve ödeme kaynağı yeterince belirliyse kullan. " +
    "Gelecekte yapılacak veya sadece planlanan harcamalarda kullanma. " +
    "Kredi kartı borcu, kredi taksiti, KMH veya başka borç kapatma işlemlerini bu tool ile kaydetme; bunlar make_debt_payment işlemidir.",

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
          "Harcamanın CEBİ içindeki kategori değeri.",
      },

      date: {
        type: Type.STRING,

        description:
          "Harcama tarihi. YYYY-MM-DD formatında. Kullanıcı tarih belirtmediyse bugünün tarihi.",
      },

      paymentSourceId: {
        type: Type.STRING,

        description:
          "Harcamanın yapıldığı CEBİ ödeme kaynağının GERÇEK ID'si. " +
          "Sadece gönderilen banka hesabı veya kredi kartı ID'lerinden biri kullanılabilir. " +
          "Nakit için yalnızca 'cash' kullanılabilir. ID uydurma.",
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
          "Kısa ve anlaşılır harcama açıklaması. Örneğin 'Market alışverişi'.",
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

/**
 * GELİR EKLE
 */

const addIncomeTool = {
  name: "add_income",

  description:
    "Kullanıcının GERÇEKTEN aldığı veya hesabına yatırılmış bir geliri CEBİ'ye kaydetmek için kullanılır. " +
    "Maaş, avans, freelance ödeme, kira geliri veya diğer gerçek gelirler için kullanılabilir. " +
    "Gelirin yatırıldığı banka hesabı belirtiliyorsa gerçek targetAccountId kullanılmalıdır.",

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
          "Gelirin hesaba geçtiği tarih. YYYY-MM-DD formatında.",
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
          "Aylık düzenli gelirlerde ödeme günü. Biliniyorsa 1-31 arası.",
      },

      targetAccountId: {
        type: Type.STRING,

        description:
          "Gelirin yatırıldığı CEBİ banka hesabının GERÇEK ID'si. " +
          "Sadece gönderilen accounts listesindeki ID'lerden biri kullanılabilir. ID uydurma.",
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

/**
 * BORÇ ÖDEME
 */

const makeDebtPaymentTool = {
  name: "make_debt_payment",

  description:
    "Kullanıcının GERÇEKTEN yaptığı kredi kartı, kredi, KMH veya diğer borç ödemesini CEBİ'ye kaydetmek için kullanılır. " +
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
          "Ödenen borcun CEBİ içindeki GERÇEK ID'si. ID uydurma.",
      },

      amount: {
        type: Type.NUMBER,

        description:
          "Ödenen borç tutarı. Türk Lirası cinsinden pozitif sayı.",
      },

      bankAccountId: {
        type: Type.STRING,

        description:
          "Ödemenin yapıldığı banka hesabının GERÇEK CEBİ ID'si. ID uydurma.",
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

/**
 * TOOL LİSTESİ
 */

const cebiTools = [
  addExpenseTool,
  addIncomeTool,
  makeDebtPaymentTool,
];

/**
 * =========================================================
 * GENEL YARDIMCI FONKSİYONLAR
 * =========================================================
 */

function safeNumber(value: unknown): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function todayTR(): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return formatter.format(now);
}

function formatTL(value: unknown): string {
  return safeNumber(value).toLocaleString(
    "tr-TR"
  );
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

function parseTurkishAmount(
  text: string
): number | null {
  const normalized = normalizeTR(text);

  /**
   * Örnekler:
   * 850 TL
   * 850tl
   * 850 lira
   * 850₺
   * 1.500 TL
   * 1,500 TL
   * 2.500,50 TL
   */

  const currencyMatch =
    normalized.match(
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

  let raw = rawMatch[1]
    .replace(/\s/g, "");

  if (
    raw.includes(".") &&
    raw.includes(",")
  ) {
    raw = raw
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  } else if (
    /^\d{1,3}\.\d{3}$/.test(raw)
  ) {
    raw = raw.replace(".", "");
  }

  const amount = Number(raw);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return amount;
}

/**
 * =========================================================
 * TÜRKÇE SAYI KELİMELERİ
 * =========================================================
 */

const TURKISH_NUMBER_VALUES: Record<
  string,
  number
> = {
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

function parseTurkishWords(
  text: string
): number | null {
  const q = normalizeTR(text);

  /**
   * Kelimeler arasında sayı ifadesi aranır.
   *
   * Örnek:
   * "sekiz yüz elli lira"
   * "iki bin beş yüz"
   * "bin iki yüz elli"
   */

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
    const value =
      TURKISH_NUMBER_VALUES[word];

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

function formatFinancialSources(
  body: any
): string {
  const accounts = Array.isArray(
    body?.accounts
  )
    ? body.accounts
    : [];

  const creditCards = Array.isArray(
    body?.creditCards
  )
    ? body.creditCards
    : [];

  const loans = Array.isArray(
    body?.loans
  )
    ? body.loans
    : [];

  const overdrafts = Array.isArray(
    body?.overdrafts
  )
    ? body.overdrafts
    : [];

  const otherDebts = Array.isArray(
    body?.otherDebts
  )
    ? body.otherDebts
    : [];

  const lines: string[] = [];

  lines.push(
    "=================================================="
  );
  lines.push("CEBİ GERÇEK FİNANSAL KAYNAKLARI");
  lines.push(
    "=================================================="
  );

  lines.push("");
  lines.push("BANKA HESAPLARI:");

  if (accounts.length === 0) {
    lines.push(
      "- Kayıtlı banka hesabı yok."
    );
  } else {
    for (const account of accounts) {
      lines.push(
        `- ID: ${String(
          account.id
        )} | Banka: ${
          account.bankName ||
          "Bilinmiyor"
        } | Hesap: ${
          account.accountName ||
          "Bilinmiyor"
        } | Bakiye: ${formatTL(
          account.balance
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("KREDİ KARTLARI:");

  if (creditCards.length === 0) {
    lines.push(
      "- Kayıtlı kredi kartı yok."
    );
  } else {
    for (const card of creditCards) {
      lines.push(
        `- ID: ${String(
          card.id
        )} | Banka: ${
          card.bank ||
          card.bankName ||
          "Bilinmiyor"
        } | Kart: ${
          card.cardName ||
          card.name ||
          "Bilinmiyor"
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
    lines.push(
      "- Kayıtlı kredi yok."
    );
  } else {
    for (const loan of loans) {
      lines.push(
        `- ID: ${String(
          loan.id
        )} | Banka: ${
          loan.bank ||
          "Bilinmiyor"
        } | Kredi: ${
          loan.loanName ||
          loan.name ||
          "Bilinmiyor"
        } | Kalan Anapara: ${formatTL(
          loan.remainingPrincipal
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("KMH / EK HESAP:");

  if (overdrafts.length === 0) {
    lines.push(
      "- Kayıtlı KMH yok."
    );
  } else {
    for (const overdraft of overdrafts) {
      lines.push(
        `- ID: ${String(
          overdraft.id
        )} | Banka: ${
          overdraft.bank ||
          "Bilinmiyor"
        } | Hesap: ${
          overdraft.accountName ||
          "Bilinmiyor"
        } | Kullanılan: ${formatTL(
          overdraft.usedAmount
        )} ₺`
      );
    }
  }

  lines.push("");
  lines.push("DİĞER BORÇLAR:");

  if (otherDebts.length === 0) {
    lines.push(
      "- Kayıtlı diğer borç yok."
    );
  } else {
    for (const debt of otherDebts) {
      lines.push(
        `- ID: ${String(
          debt.id
        )} | Borç: ${
          debt.debtName ||
          debt.name ||
          "Bilinmiyor"
        } | Tutar: ${formatTL(
          debt.amount
        )} ₺`
      );
    }
  }

  return lines.join("\n");
}

/**
 * =========================================================
 * SNAPSHOT FORMAT
 * =========================================================
 */

function formatSnapshot(
  snapshot: any
): string {
  const categoryBreakdown =
    Array.isArray(
      snapshot?.categoryBreakdown
    ) &&
    snapshot.categoryBreakdown.length > 0
      ? snapshot.categoryBreakdown
          .map(
            (c: any) =>
              `- ${c.name}: ${formatTL(
                c.amount
              )} ₺ (%${
                c.percentage || 0
              })`
          )
          .join("\n")
      : "Henüz harcama kaydı yok.";

  const debtDetails =
    Array.isArray(
      snapshot?.debtDetails
    ) &&
    snapshot.debtDetails.length > 0
      ? snapshot.debtDetails
          .map(
            (d: any) =>
              `- ${d.type} (${d.name}): Toplam Borç ${formatTL(
                d.amount
              )} ₺, Asgari/Taksit: ${formatTL(
                d.monthlyOrMin || 0
              )} ₺, Vade/Ödeme: ${
                d.dueDate ||
                "Belirtilmemiş"
              }`
          )
          .join("\n")
      : "Kayıtlı borç bulunmuyor.";

  const incomes =
    Array.isArray(
      snapshot?.incomes
    ) &&
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
                i.paymentDate ||
                "Belirtilmemiş"
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

- Kalan Gün: ${
    snapshot?.remainingDays || 0
  }

- Yaklaşan Zorunlu Ödemeler: ${formatTL(
    snapshot?.upcomingPaymentsTotal
  )} ₺

- Net Likit: ${formatTL(
    snapshot?.netLiquidAvailable ??
      safeNumber(
        snapshot?.totalBalance
      ) -
        safeNumber(
          snapshot?.upcomingPaymentsTotal
        )
  )} ₺

- Nakit Açığı: ${
    snapshot?.hasCashShortfall
      ? `${formatTL(
          snapshot?.cashShortfall
        )} ₺`
      : "Yok"
  }

- Günlük Güvenli Harcama: ${
    snapshot?.hasCashShortfall
      ? "0 ₺"
      : `${formatTL(
          snapshot?.dailySafeSpending
        )} ₺`
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

function getHistoryText(
  item: any
): string {
  return String(
    item?.text ||
      item?.content ||
      item?.message ||
      ""
  ).trim();
}

/**
 * Gemini'nin generateContent API'sine verilecek
 * çok turlu konuşma içeriğini oluşturur.
 */
function buildGeminiContents(
  conversationHistory: any,
  currentMessage: string
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  const history = Array.isArray(
    conversationHistory
  )
    ? conversationHistory
    : [];

  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const item of history.slice(-20)) {
    const text = getHistoryText(item);

    if (!text) {
      continue;
    }

    contents.push({
      role: normalizeHistoryRole(item),
      parts: [
        {
          text,
        },
      ],
    });
  }

  /**
   * Mevcut kullanıcı mesajını geçmişe ayrıca ekle.
   */
  if (currentMessage.trim()) {
    contents.push({
      role: "user",
      parts: [
        {
          text: currentMessage.trim(),
        },
      ],
    });
  }

  /**
   * Gemini tarafında ilk mesajın user olması
   * konuşma formatını daha güvenli tutar.
   */
  if (
    contents.length > 0 &&
    contents[0].role !== "user"
  ) {
    contents.unshift({
      role: "user",
      parts: [
        {
          text:
            "CEBİ finans koçu görüşmesi başlıyor.",
        },
      ],
    });
  }

  return contents;
}

/**
 * =========================================================
 * FALLBACK EXPENSE HELPERS
 * =========================================================
 */

function detectExpenseCategory(
  text: string
): string {
  const q = normalizeTR(text);

  if (
    /market|migros|carrefour|bim|a101|sok/.test(
      q
    )
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
    /ulasim|otobus|metro|taksi|uber|dolmus/.test(
      q
    )
  ) {
    return "ulasim";
  }

  if (
    /saglik|eczane|doktor|ilac|hastane/.test(
      q
    )
  ) {
    return "saglik";
  }

  if (
    /giyim|elbise|ayakkabi|pantolon|mont/.test(
      q
    )
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

  if (
    /egitim|kurs|okul|ders/.test(q)
  ) {
    return "egitim";
  }

  if (
    /eglence|sinema|konser|oyun/.test(
      q
    )
  ) {
    return "eglence";
  }

  if (
    /alisveris|magaza/.test(q)
  ) {
    return "alisveris";
  }

  if (
    /ev esyasi|mobilya|ev/.test(q)
  ) {
    return "ev";
  }

  if (
    /sigorta/.test(q)
  ) {
    return "sigorta";
  }

  if (
    /vergi/.test(q)
  ) {
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

  return (
    completed &&
    !futureOrQuestion
  );
}

function findExplicitExpenseSource(
  text: string,
  data: any
) {
  const q = normalizeTR(text);

  const cards = Array.isArray(
    data?.creditCards
  )
    ? data.creditCards
    : [];

  const accounts = Array.isArray(
    data?.accounts
  )
    ? data.accounts
    : [];

  /**
   * Önce kredi kartlarını kontrol et.
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
          card.cardName ||
          card.name ||
          ""
        }`.trim(),
      };
    }
  }

  /**
   * Sonra banka hesapları.
   */

  for (const account of accounts) {
    const bank = normalizeTR(
      String(
        account.bankName || ""
      )
    );

    const name = normalizeTR(
      String(
        account.accountName || ""
      )
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

  if (
    /nakit|cash/.test(q)
  ) {
    return {
      id: "cash",
      type: "cash",
      name: "Nakit",
    };
  }

  /**
   * Yalnızca bir kredi kartı varsa
   * "kartımla" gibi ifadelerde kullanılabilir.
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
        card.cardName ||
        card.name ||
        ""
      }`.trim(),
    };
  }

  /**
   * Yalnızca bir banka hesabı varsa
   * "hesabımdan" gibi ifadelerde kullanılabilir.
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
  if (
    !isCompletedExpenseStatement(text)
  ) {
    return null;
  }

  let amount =
    parseTurkishAmount(text);

  if (!amount) {
    amount =
      parseTurkishWords(text);
  }

  if (!amount) {
    return null;
  }

  const source =
    findExplicitExpenseSource(
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

  const remainingBudget =
    safeNumber(
      snapshot?.remainingBudget
    );

  const totalBalance =
    safeNumber(
      snapshot?.totalBalance
    );

  const totalDebt =
    safeNumber(
      snapshot?.totalDebt
    );

  const monthlyIncome =
    safeNumber(
      snapshot?.monthlyIncome
    );

  const monthlyExpenses =
    safeNumber(
      snapshot?.monthlyExpenses
    );

  const totalDebtRepayments =
    safeNumber(
      snapshot?.totalDebtRepayments
    );

  const upcomingPaymentsTotal =
    safeNumber(
      snapshot?.upcomingPaymentsTotal
    );

  const remainingDays =
    Math.max(
      1,
      safeNumber(
        snapshot?.remainingDays
      )
    );

  const hasCashShortfall =
    Boolean(
      snapshot?.hasCashShortfall ||
        (
          totalBalance <
            upcomingPaymentsTotal &&
          upcomingPaymentsTotal > 0
        )
    );

  const cashShortfall =
    safeNumber(
      snapshot?.cashShortfall ||
        (
          hasCashShortfall
            ? upcomingPaymentsTotal -
              totalBalance
            : 0
        )
    );

  const plannedDailyBudget =
    safeNumber(
      snapshot?.plannedDailyBudget
    );

  const debtDetails =
    Array.isArray(
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

    if (
      totalDebtRepayments > 0
    ) {
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

    if (
      debtDetails.length > 0
    ) {
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
    if (
      hasCashShortfall
    ) {
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
    if (
      totalDebt === 0
    ) {
      return `**Durumun:** Kayıtlı borcun bulunmuyor.\n\nBorçsuz durumunu korumaya ve acil durum fonu oluşturmaya odaklanabilirsin.`;
    }

    return `**Durumun:** Toplam kayıtlı borcun **${formatTL(
      totalDebt
    )} ₺**.\n\n**Dikkat etmen gereken:** Öncelikle gecikme riski olan zorunlu ödemeleri aksatma. Ardından maliyeti yüksek borçlara odaklan.`;
  }

  if (
    q.includes("alisveris") ||
    q.includes("alabilir miyim") ||
    q.includes("harcayabilir miyim")
  ) {
    const match =
      q.match(
        /(\d+[\d\.,]*)/
      );

    const amount =
      match
        ? parseFloat(
            match[1]
              .replace(/\./g, "")
              .replace(",", ".")
          )
        : 0;

    if (
      hasCashShortfall
    ) {
      return `Şu anda **${formatTL(
        cashShortfall
      )} ₺** nakit açığın var. Bu nedenle **${formatTL(
        amount
      )} ₺** harcamayı ertelemeni öneririm. Günlük güvenli harcama limitin 0 ₺.`;
    }

    if (
      snapshot?.isOverBudget ||
      amount > remainingBudget
    ) {
      return `Kalan bütçen **${formatTL(
        remainingBudget
      )} ₺**. ${formatTL(
        amount
      )} ₺ tutarındaki harcama bütçeni zorlayabilir.`;
    }

    return `Kalan bütçen **${formatTL(
      remainingBudget
    )} ₺**, günlük güvenli limitin **${formatTL(
      safeDaily
    )} ₺**. ${formatTL(
      amount
    )} ₺ harcama yapılabilir görünüyor ancak sonraki günlerdeki temponu korumalısın.`;
  }

  if (
    q.includes("fazla mi harcadim") ||
    q.includes("harcamalarimda sorun var mi")
  ) {
    const spentRatio =
      monthlyIncome > 0
        ? (
            monthlyExpenses /
            monthlyIncome
          ) * 100
        : 0;

    if (
      snapshot?.isOverBudget ||
      remainingBudget < 0
    ) {
      return `**Durumun:** Bu ay bütçeni yaklaşık **${formatTL(
        Math.abs(
          remainingBudget
        )
      )} ₺** aştın.\n\n**Dikkat etmen gereken:** Tüketim harcamaların **${formatTL(
        monthlyExpenses
      )} ₺** seviyesinde.\n\n**Bugün için:** Zorunlu olmayan harcamaları azaltmanı öneririm.`;
    }

    return `**Durumun:** Bu ay ${formatTL(
      monthlyIncome
    )} ₺ gelir karşılığında ${formatTL(
      monthlyExpenses
    )} ₺ tüketim harcaman var. Bu yaklaşık **%${Math.round(
      spentRatio
    )}**.\n\n**Bugün için:** Günlük güvenli limitin **${formatTL(
      safeDaily
    )} ₺**.`;
  }

  if (
    safeDaily > 0
  ) {
    return `**Durumun:** Toplam kullanılabilir paran **${formatTL(
      totalBalance
    )} ₺**, bu ayki tüketim harcaman **${formatTL(
      monthlyExpenses
    )} ₺**.\n\n**Bugün için:** Günlük güvenli harcama limitin **${formatTL(
      safeDaily
    )} ₺**.`;
  }

  return `**Durumun:** Bankadaki nakit bakiyen **${formatTL(
    totalBalance
  )} ₺**, bu ayki tüketim harcaman **${formatTL(
    monthlyExpenses
  )} ₺**.\n\n**Dikkat etmen gereken:** Yaklaşan zorunlu ödemelerin toplamı **${formatTL(
    upcomingPaymentsTotal
  )} ₺**.`;
}

/**
 * =========================================================
 * TOOL ACTION VALIDATION
 * =========================================================
 *
 * Gemini'nin döndürdüğü ID'lerin gerçekten CEBİ verisinde
 * bulunup bulunmadığını backend tarafında da kontrol ediyoruz.
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
        "Tool parametreleri bulunamadı.",
    };
  }

  if (
    actionName ===
    "add_expense"
  ) {
    const amount =
      safeNumber(args.amount);

    if (
      amount <= 0
    ) {
      return {
        valid: false,
        reason:
          "Harcama tutarı geçersiz.",
      };
    }

    const paymentSourceId =
      String(
        args.paymentSourceId ||
          ""
      ).trim();

    const paymentSourceType =
      String(
        args.paymentSourceType ||
          ""
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

    if (
      paymentSourceType ===
      "cash"
    ) {
      if (
        paymentSourceId !==
        "cash"
      ) {
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

    if (
      paymentSourceType ===
      "credit_card"
    ) {
      const exists =
        sourceData.creditCards.some(
          (card: any) =>
            String(
              card.id
            ) ===
            paymentSourceId
        );

      if (!exists) {
        return {
          valid: false,
          reason:
            "Gönderilen kredi kartı ID'si CEBİ kayıtlarında bulunamadı.",
        };
      }

      return {
        valid: true,
      };
    }

    if (
      paymentSourceType ===
      "bank_account"
    ) {
      const exists =
        sourceData.accounts.some(
          (account: any) =>
            String(
              account.id
            ) ===
            paymentSourceId
        );

      if (!exists) {
        return {
          valid: false,
          reason:
            "Gönderilen banka hesabı ID'si CEBİ kayıtlarında bulunamadı.",
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

  if (
    actionName ===
    "add_income"
  ) {
    const amount =
      safeNumber(args.amount);

    if (
      amount <= 0
    ) {
      return {
        valid: false,
        reason:
          "Gelir tutarı geçersiz.",
      };
    }

    const targetAccountId =
      String(
        args.targetAccountId ||
          ""
      ).trim();

    if (
      !targetAccountId
    ) {
      return {
        valid: false,
        reason:
          "Gelirin yatırıldığı banka hesabı belirtilmelidir.",
      };
    }

    const exists =
      sourceData.accounts.some(
        (account: any) =>
          String(
            account.id
          ) === targetAccountId
      );

    if (!exists) {
      return {
        valid: false,
        reason:
          "Gelir hesabı ID'si CEBİ kayıtlarında bulunamadı.",
      };
    }

    return {
      valid: true,
    };
  }

  if (
    actionName ===
    "make_debt_payment"
  ) {
    const amount =
      safeNumber(args.amount);

    if (
      amount <= 0
    ) {
      return {
        valid: false,
        reason:
          "Borç ödeme tutarı geçersiz.",
      };
    }

    const debtId =
      String(
        args.debtId ||
          ""
      ).trim();

    const bankAccountId =
      String(
        args.bankAccountId ||
          ""
      ).trim();

    if (
      !debtId ||
      !bankAccountId
    ) {
      return {
        valid: false,
        reason:
          "Borç ve ödeme hesabı belirtilmelidir.",
      };
    }

    const debtType =
      String(
        args.debtType ||
          ""
      ).trim();

    let debtExists = false;

    if (
      debtType ===
      "card"
    ) {
      debtExists =
        sourceData.creditCards.some(
          (card: any) =>
            String(
              card.id
            ) === debtId
        );
    } else if (
      debtType ===
      "loan"
    ) {
      debtExists =
        sourceData.loans.some(
          (loan: any) =>
            String(
              loan.id
            ) === debtId
        );
    } else if (
      debtType ===
      "kmh"
    ) {
      debtExists =
        sourceData.overdrafts.some(
          (item: any) =>
            String(
              item.id
            ) === debtId
        );
    } else if (
      debtType ===
      "other"
    ) {
      debtExists =
        sourceData.otherDebts.some(
          (item: any) =>
            String(
              item.id
            ) === debtId
        );
    }

    if (!debtExists) {
      return {
        valid: false,
        reason:
          "Gönderilen borç ID'si CEBİ kayıtlarında bulunamadı.",
      };
    }

    const accountExists =
      sourceData.accounts.some(
        (account: any) =>
          String(
            account.id
          ) ===
          bankAccountId
      );

    if (!accountExists) {
      return {
        valid: false,
        reason:
          "Gönderilen banka hesabı ID'si CEBİ kayıtlarında bulunamadı.",
      };
    }

    return {
      valid: true,
    };
  }

  return {
    valid: false,
    reason:
      "Bilinmeyen işlem.",
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
      const body =
        req.body || {};

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

      const queryText =
        String(
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

      /**
       * CEBİ finansal kaynakları.
       */

      const sourceData = {
        accounts:
          Array.isArray(accounts)
            ? accounts
            : [],

        creditCards:
          Array.isArray(
            creditCards
          )
            ? creditCards
            : [],

        loans:
          Array.isArray(loans)
            ? loans
            : [],

        overdrafts:
          Array.isArray(
            overdrafts
          )
            ? overdrafts
            : [],

        otherDebts:
          Array.isArray(
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
       * Eski frontend sürümlerini de destekle.
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

      const ai =
        getGenAI();

      if (!ai) {
        /**
         * Gemini yoksa açık ve tamamlanmış
         * harcamayı yine de yakalamaya çalış.
         */

        const directFallbackAction =
          tryBuildExpenseAction(
            queryText,
            date,
            sourceData
          );

        if (
          directFallbackAction
        ) {
          const actionAnswer =
            `Tamam. ${formatTL(
              directFallbackAction.args
                .amount
            )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

          res.json({
            answer:
              actionAnswer,

            reply:
              actionAnswer,

            isRuleBased:
              true,

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
          answer:
            fallbackReply,

          reply:
            fallbackReply,

          isRuleBased:
            true,

          action:
            null,
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

Sen sıradan bir komut botu değilsin.
Kullanıcı seninle doğal Türkçe konuşur.
Sen konuşmanın anlamını, önceki mesajları ve kullanıcının finansal verilerini birlikte değerlendirirsin.

AMAÇ:

Kullanıcının ne demek istediğini önce ANLA.
Sonra gerekiyorsa CEBİ finansal işlemlerinden birini gerçekleştir.
Eksik bilgi varsa yalnızca eksik bilgiyi sor.
Kullanıcı sadece soru soruyorsa hiçbir işlem oluşturma.

BUGÜN:
${date}

==================================================
KONUŞMA DAVRANIŞI
==================================================

1. Her zaman Türkçe konuş.

2. Kullanıcıyla doğal, samimi, kısa ve anlaşılır konuş.

3. Kullanıcının mesajını tek başına değerlendirme.
   Önceki konuşmayı da dikkate al.

4. Kullanıcı bir önceki mesajında söylediği işlemi
   sonraki kısa mesajıyla tamamlayabilir.

ÖRNEK:

Kullanıcı:
"Bugün markette 500 TL harcadım."

CEBİ:
"Hangi kart veya hesaptan ödedin?"

Kullanıcı:
"Garanti Bonus."

Bu ikinci mesaj tek başına anlamsız görünse bile,
önceki konuşma nedeniyle bunun ödeme kaynağı cevabı olduğunu anlayabilirsin.

5. Kullanıcının geçmişte söylediği bilgiler ile
   mevcut mesajını birleştir.

6. Kullanıcı "evet", "hayır", "Garanti", "nakit",
   "Bonus", "hesabımdan", "ondan", "evet o",
   gibi kısa cevaplar verirse önceki mesaj bağlamını değerlendir.

7. Ancak bağlam yeterli değilse tahmin yapma.
   Kullanıcıya kısa bir netleştirme sorusu sor.

==================================================
FİNANSAL İŞLEM KURALLARI
==================================================

8. GERÇEKTEN yapılmış bir tüketim harcaması varsa
   ve gerekli bilgiler mevcutsa add_expense kullan.

9. GERÇEKTEN alınmış/yatmış bir gelir varsa
   ve gerekli bilgiler mevcutsa add_income kullan.

10. GERÇEKTEN yapılmış bir borç ödemesi varsa
    make_debt_payment kullan.

11. Gelecekte yapılacak işlemleri gerçekleşmiş işlem olarak kaydetme.

12. "harcayacağım", "alacağım", "ödeyeceğim",
    "yapacağım", "alabilir miyim",
    "harcayabilir miyim" gibi ifadeler
    otomatik olarak gerçekleşmiş işlem değildir.

13. "harcadım", "aldım", "ödedim",
    "ödeme yaptım", "alışveriş yaptım",
    "yemek yedim" gibi ifadeler gerçekleşmiş
    işlem anlamına gelebilir.

==================================================
HARCAMA VE BORÇ ÖDEMESİ AYRIMI
==================================================

14. Tüketim harcaması ile borç ödemesini kesinlikle ayır.

Örnek tüketim:
- Marketten 500 TL alışveriş yaptım.
- Restoranda 800 TL yemek yedim.
- Benzine 1500 TL verdim.

Örnek borç ödemesi:
- Kredi kartı borcuma 5000 TL ödedim.
- Kredimin taksidini 10000 TL ödedim.
- KMH borcuma 2000 TL yatırdım.

Borç ödemesini add_expense ile kaydetme.

==================================================
ÖDEME KAYNAĞI
==================================================

15. Harcama kaydı için ödeme kaynağı gereklidir.

16. Kullanıcı:
"Markette 850 TL harcadım."

diyorsa ödeme kaynağı bilinmiyorsa tool çağırma.

Şunu sor:
"Hangi kart veya hesaptan ödedin?"

17. Kullanıcı:
"Markette 850 TL Garanti Bonus kartımla harcama yaptım."

diyorsa mevcut kredi kartları arasından uygun gerçek ID'yi seç.

18. Kullanıcı:
"Garanti kartımdan."

diyorsa önceki konuşmayı dikkate al.

19. Birden fazla uygun kart/hesap varsa tahmin yapma.

20. Yalnızca gönderilen finansal verilerde bulunan gerçek ID'leri kullan.

21. ASLA ID uydurma.

22. Nakit açıkça belirtilmişse:

paymentSourceId = "cash"
paymentSourceType = "cash"

kullan.

==================================================
GELİR
==================================================

23. Kullanıcı:
"Maaşım yattı 45000 TL."

diyorsa bunun gerçek gelir olduğunu değerlendir.

24. Gelirin hangi hesaba yattığı bilinmiyorsa
   targetAccountId uydurma.

25. Birden fazla banka hesabı varsa kullanıcıdan
   hangi hesaba yattığını sor.

==================================================
BORÇ ÖDEMESİ
==================================================

26. Kredi kartı borcu → debtType "card"

27. Kredi / taksit → debtType "loan"

28. KMH / ek hesap → debtType "kmh"

29. Diğer borç → debtType "other"

30. Borç ID'sini yalnızca gerçek finansal listeden seç.

31. Ödeme hesabı ID'sini yalnızca gerçek banka hesaplarından seç.

==================================================
TARİH
==================================================

32. Kullanıcı tarih belirtmezse:
${date}

33. "bugün" = ${date}

34. "dün" gibi göreli tarih ifadelerini bugünün tarihine göre hesapla.

35. Tool tarihi YYYY-MM-DD formatında vermelidir.

==================================================
KATEGORİLER
==================================================

36. Market, Migros, Carrefour, BİM, A101, Şok:
market

37. Restoran, lokanta, kafe, kahve, pizza, burger:
yemek

38. Benzin, mazot, akaryakıt:
akaryakit

39. Fatura, elektrik, su, doğalgaz, internet:
fatura

40. Kira:
kira

41. Ulaşım, otobüs, metro, taksi, dolmuş:
ulasim

42. Eczane, doktor, ilaç, hastane:
saglik

43. Giyim, elbise, ayakkabı:
giyim

44. Telefon, laptop, bilgisayar, elektronik:
elektronik

45. Netflix, Spotify, abonelik:
abonelik

46. Kurs, okul, eğitim:
egitim

47. Sinema, konser, oyun:
eglence

48. Mağaza veya genel alışveriş:
alisveris

49. Ev eşyası veya ev harcaması:
ev

50. Sigorta:
sigorta

51. Vergi:
vergi

==================================================
TUTARLAR
==================================================

52. Türkçe sayı ifadelerini anlayabil.

Örnek:
"850 TL" = 850
"850 lira" = 850
"850₺" = 850
"1.500 TL" = 1500
"2.500,50 TL" = 2500.50
"sekiz yüz elli lira" = 850
"iki bin beş yüz" = 2500
"bin iki yüz elli" = 1250

==================================================
SORU MU İŞLEM Mİ?
==================================================

53. Kullanıcı:
"500 TL harcasam olur mu?"

Bu işlem değildir.
Finansal durumunu analiz ederek cevap ver.

54. Kullanıcı:
"Bugün 500 TL harcadım."

Bu gerçekleşmiş işlem olabilir.
Gerekli bilgiler varsa add_expense kullan.

55. Kullanıcı:
"Market alışverişi yaptım ama kaç tuttuğunu hatırlamıyorum."

Tutar yoksa tool çağırma.
Tutarı sor.

56. Kullanıcı:
"Garanti kartımla markette 500 TL harcadım."

Gerekli bilgiler mevcutsa doğrudan add_expense kullan.

==================================================
FİNANSAL ANALİZ
==================================================

57. Finansal tavsiyeleri CEBİ snapshot verilerine dayandır.

58. Banka bakiyesi ile toplam borcu karıştırma.

59. Günlük güvenli harcama ile planlanan günlük bütçeyi karıştırma.

60. Nakit açığı varsa günlük güvenli harcamayı 0 ₺ kabul et.

61. Yatırım konusunda kesin kazanç garantisi verme.

62. CEBİ'nin banka sistemlerine canlı erişimi yoktur.
   Yalnızca gönderilen CEBİ verilerini kullan.

==================================================
CEBİ GERÇEK VERİLERİ
==================================================

Aşağıdaki banka, kart ve borç ID'leri GERÇEKTİR.

Tool çağırırken yalnızca bu listelerde bulunan ID'leri kullan.

${formattedSources}

==================================================
KULLANICI SNAPSHOT
==================================================

${formattedSnapshot}

==================================================
DİĞER KULLANICI VERİLERİ
==================================================

PROFİL:
${JSON.stringify(
  profile || {},
  null,
  2
)}

GELİRLER:
${JSON.stringify(
  Array.isArray(incomes)
    ? incomes.slice(0, 50)
    : [],
  null,
  2
)}

SON HARCAMALAR:
${JSON.stringify(
  Array.isArray(expenses)
    ? expenses.slice(0, 50)
    : [],
  null,
  2
)}

YAKLAŞAN / PLANLANAN ÖDEMELER:
${JSON.stringify(
  Array.isArray(
    scheduledPayments
  )
    ? scheduledPayments.slice(
        0,
        50
      )
    : [],
  null,
  2
)}

==================================================
ÖNCEKİ KONUŞMA
==================================================

Önceki mesajlar konuşmanın bağlamıdır.
Son kullanıcı mesajını bu bağlamla birlikte değerlendir.

==================================================
SON KURAL
==================================================

Önce ANLA.
Sonra GEREKİYORSA İŞLEM YAP.
Eksik bilgi varsa SOR.
Gereksiz işlem oluşturma.
ID UYDURMA.
Kullanıcının söylemediği finansal bilgileri uydurma.
`;

      /**
       * =====================================================
       * GEMINI CONTENTS
       * =====================================================
       */

      const contents =
        buildGeminiContents(
          rawHistory,
          queryText
        );

      /**
       * =====================================================
       * GEMINI
       * =====================================================
       */

      const response =
        await ai.models.generateContent(
          {
            model:
              "gemini-3.8-flash",

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
          }
        );

      /**
       * =====================================================
       * FUNCTION CALL
       * =====================================================
       */

      const functionCalls =
        response.functionCalls ||
        [];

      if (
        functionCalls.length > 0
      ) {
        /**
         * Şimdilik ilk tool çağrısını kullanıyoruz.
         * CEBİ frontend'i action'ı gerçek fonksiyona
         * bağlayacak.
         */

        const firstCall =
          functionCalls[0];

        const actionName =
          String(
            firstCall.name ||
              ""
          );

        const actionArgs =
          firstCall.args ||
          {};

        /**
         * Backend tarafında ikinci güvenlik kontrolü.
         */

        const validation =
          validateToolAction(
            actionName,
            actionArgs,
            sourceData
          );

        if (
          !validation.valid
        ) {
          /**
           * Tool çağrısı güvenli değilse
           * işlemi gerçekleştirmek yerine kullanıcıdan
           * eksik/geçersiz bilgiyi istemesi için
           * kısa cevap dön.
           */

          const clarification =
            validation.reason ||
            "İşlemi güvenli şekilde oluşturabilmem için bir bilgiyi netleştirmem gerekiyor.";

          res.json({
            answer:
              clarification,

            reply:
              clarification,

            isRuleBased:
              true,

            action:
              null,
          });

          return;
        }

        const action = {
          name:
            actionName,

          args:
            actionArgs,
        };

        let actionAnswer =
          "İşlemi CEBİ'ye aktarıyorum.";

        switch (
          actionName
        ) {
          case "add_expense":
            actionAnswer =
              `Tamam. ${formatTL(
                actionArgs.amount
              )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;
            break;

          case "add_income":
            actionAnswer =
              `Tamam. ${formatTL(
                actionArgs.amount
              )} ₺ tutarındaki geliri CEBİ'ye ekliyorum.`;
            break;

          case "make_debt_payment":
            actionAnswer =
              `Tamam. ${formatTL(
                actionArgs.amount
              )} ₺ tutarındaki borç ödemesini CEBİ'ye işliyorum.`;
            break;

          default:
            actionAnswer =
              "İşlemi CEBİ'ye aktarıyorum.";
        }

        res.json({
          answer:
            actionAnswer,

          reply:
            actionAnswer,

          isRuleBased:
            false,

          action,
        });

        return;
      }

      /**
       * =====================================================
       * NORMAL CHAT RESPONSE
       * =====================================================
       */

      const answer =
        response.text ||
        "Şu anda finansal verilerini analiz ederken bir sorun oluştu. Lütfen tekrar deneyin.";

      res.json({
        answer,
        reply:
          answer,
        isRuleBased:
          false,
        action:
          null,
      });
    } catch (
      error: any
    ) {
      console.error(
        "CEBİ Coach API error:",
        error
      );

      const body =
        req.body || {};

      const query =
        String(
          body.question ||
            body.message ||
            ""
        ).trim();

      /**
       * Gemini hata verirse son çare olarak
       * açık bir harcamayı yerel parser ile yakalamayı dene.
       */

      const sourceData = {
        accounts:
          Array.isArray(
            body.accounts
          )
            ? body.accounts
            : [],

        creditCards:
          Array.isArray(
            body.creditCards
          )
            ? body.creditCards
            : [],

        loans:
          Array.isArray(
            body.loans
          )
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

      if (
        fallbackAction
      ) {
        const actionAnswer =
          `Tamam. ${formatTL(
            fallbackAction.args
              .amount
          )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

        res.status(200).json({
          answer:
            actionAnswer,

          reply:
            actionAnswer,

          isRuleBased:
            true,

          action:
            fallbackAction,

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
        answer:
          fallbackReply,

        reply:
          fallbackReply,

        isRuleBased:
          true,

        action:
          null,

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
          middlewareMode:
            true,
        },

        appType: "spa",
      });

    app.use(
      vite.middlewares
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        "dist"
      );

    app.use(
      express.static(
        distPath
      )
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
