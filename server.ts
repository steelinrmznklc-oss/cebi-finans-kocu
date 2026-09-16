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
 * CEBİ V2
 * Mobil APK / Render / GitHub Pages / Local geliştirme için CORS
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
 * Gemini istemcisini gerektiğinde oluştur.
 * API anahtarı hiçbir şekilde APK içine konmaz.
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
 * Sağlık kontrolü
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   CEBİ V2 — AI TOOL DEFINITIONS
   ========================================================= */

/**
 * HARCAMA EKLE
 *
 * AI bu fonksiyonu seçer.
 * Gerçek kaydı React uygulaması yapar.
 */
const addExpenseTool = {
  name: "add_expense",
  description:
    "Kullanıcının GERÇEKTEN yaptığı bir harcamayı CEBİ'ye kaydetmek için kullanılır. " +
    "Kullanıcı geçmişte veya bugün gerçekten harcama yaptığını söylüyorsa kullan. " +
    "Sadece gelecekte yapmayı düşündüğü harcamalarda kullanma. " +
    "Tutar, kategori, tarih ve ödeme kaynağı yeterince belirliyse işlem oluştur.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      amount: {
        type: Type.NUMBER,
        description: "Harcama tutarı. Türk Lirası cinsinden.",
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
          "Harcamanın CEBİ içindeki kategorisi.",
      },

      date: {
        type: Type.STRING,
        description:
          "Harcama tarihi. YYYY-MM-DD formatında. Kullanıcı tarih belirtmediyse bugün.",
      },

      paymentSourceId: {
        type: Type.STRING,
        description:
          "Harcamanın yapıldığı CEBİ ödeme kaynağının ID'si. " +
          "Banka hesabı veya kredi kartı ID'si kullanılmalı. " +
          "Nakit için 'cash' kullanılabilir.",
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
          "Harcamanın kısa açıklaması. Örneğin 'Market alışverişi'.",
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
    "Kullanıcının GERÇEKTEN aldığı veya hesabına yatan bir geliri CEBİ'ye kaydetmek için kullanılır. " +
    "Maaş, avans, freelance ödeme, kira geliri veya diğer gerçek gelirler için kullanılabilir. " +
    "Kullanıcı gelirinin yatırıldığı banka hesabını belirtiyorsa targetAccountId olarak gerçek hesap ID'sini kullan.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      amount: {
        type: Type.NUMBER,
        description: "Gelir tutarı. Türk Lirası cinsinden pozitif sayı.",
      },

      name: {
        type: Type.STRING,
        description:
          "Gelirin adı. Örneğin 'Maaş', 'Avans', 'Freelance ödeme'.",
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
        description: "Gelirin CEBİ kategori değeri.",
      },

      paymentDate: {
        type: Type.STRING,
        description:
          "Gelirin hesaba geçtiği tarih. YYYY-MM-DD formatında. Kullanıcı tarih belirtmezse bugünün tarihini kullan.",
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
          "Gelirin tekrarlanma sıklığı. Maaş gibi düzenli gelirlerde monthly, tek seferlik gelirlerde one_time kullan.",
      },

      isRecurring: {
        type: Type.BOOLEAN,
        description:
          "Gelir düzenli olarak tekrar ediyor mu?",
      },

      dayOfMonth: {
        type: Type.NUMBER,
        description:
          "Düzenli aylık gelirlerde ödeme günü. 1 ile 31 arasında.",
      },

      targetAccountId: {
        type: Type.STRING,
        description:
          "Gelirin yatırıldığı CEBİ banka hesabının gerçek ID değeri. Kullanıcı hesap belirttiyse accounts listesinden doğru ID'yi seç. ID uydurma.",
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
    "Kullanıcının GERÇEKTEN yaptığı bir kredi kartı, kredi, KMH veya diğer borç ödemesini CEBİ'ye kaydetmek için kullanılır. " +
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
        description: "Ödenen borcun tipi.",
      },

      debtId: {
        type: Type.STRING,
        description:
          "Ödenen borcun CEBİ içindeki ID'si.",
      },

      amount: {
        type: Type.NUMBER,
        description:
          "Ödenen borç tutarı. Türk Lirası.",
      },

      bankAccountId: {
        type: Type.STRING,
        description:
          "Ödemenin yapıldığı banka hesabının CEBİ ID'si.",
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
 * =========================================================
 * TOOL LİSTESİ
 * =========================================================
 */
const cebiTools = [
  addExpenseTool,
  addIncomeTool,
  makeDebtPaymentTool,
];

/**
 * =========================================================
 * YARDIMCI FONKSİYONLAR
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

/**
 * Hesapları/kartları Gemini'nin kolay anlayacağı metne çevirir.
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

  lines.push("BANKA HESAPLARI:");

  if (accounts.length === 0) {
    lines.push("- Kayıtlı banka hesabı yok.");
  } else {
    for (const account of accounts) {
      lines.push(
        `- ID: ${account.id} | Banka: ${
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
        `- ID: ${card.id} | Banka: ${
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
        `- ID: ${loan.id} | Banka: ${
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
        `- ID: ${overdraft.id} | Banka: ${
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
        `- ID: ${debt.id} | Borç: ${
          debt.debtName || debt.name || "Bilinmiyor"
        } | Tutar: ${formatTL(
          debt.amount
        )} ₺`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Snapshot'ı AI için okunabilir hale getirir.
 */
function formatSnapshot(snapshot: any): string {
  const categoryBreakdown =
    Array.isArray(snapshot?.categoryBreakdown) &&
    snapshot.categoryBreakdown.length > 0
      ? snapshot.categoryBreakdown
          .map(
            (c: any) =>
              `- ${c.name}: ${formatTL(c.amount)} ₺ (%${
                c.percentage || 0
              })`
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
              `- ${i.name}: ${formatTL(i.amount)} ₺ (${
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
 * Sohbet geçmişini güvenli şekilde metne çevir.
 */
function formatConversationHistory(
  conversationHistory: any,
  history: any
): string {
  const source =
    Array.isArray(conversationHistory)
      ? conversationHistory
      : Array.isArray(history)
      ? history
      : [];

  if (source.length === 0) {
    return "Önceki konuşma bulunmuyor.";
  }

  return source
    .slice(-10)
    .map((item: any) => {
      const role =
        item.sender === "user" ||
        item.role === "user"
          ? "Kullanıcı"
          : "CEBİ Koç";

      const text =
        item.text ||
        item.content ||
        item.message ||
        "";

      return `${role}: ${text}`;
    })
    .join("\n");
}

/* =========================================================
   FALLBACK
   ========================================================= */

function generateFallbackCoachReply(
  question: string,
  snapshot: any
): string {
  const q = question.toLowerCase();

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
      (totalBalance < upcomingPaymentsTotal &&
        upcomingPaymentsTotal > 0)
  );

  const cashShortfall = safeNumber(
    snapshot?.cashShortfall ||
      (hasCashShortfall
        ? upcomingPaymentsTotal - totalBalance
        : 0)
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
    q.includes("ne kadar harcadım") ||
    q.includes("toplam harcamam") ||
    q.includes("harcamalarım")
  ) {
    let text = `Bu ay toplam **${formatTL(
      monthlyExpenses
    )} ₺** tüketim harcaması yaptın.`;

    if (totalDebtRepayments > 0) {
      text += `\n\nAyrıca borç kapatma ve taksit ödemeleri için **${formatTL(
        totalDebtRepayments
      )} ₺** ödeme gerçekleştirdin. Bu tüketim harcaması değildir.`;
    }

    return text;
  }

  if (
    q.includes("bankada ne kadar") ||
    q.includes("hesabımda ne kadar") ||
    q.includes("kaç param var") ||
    q.includes("param var")
  ) {
    return `CEBİ'ye kayıtlı banka hesaplarındaki toplam kullanılabilir nakit bakiyen **${formatTL(
      totalBalance
    )} ₺**.`;
  }

  if (
    q.includes("toplam borcum") ||
    (q.includes("borcum") &&
      q.includes("ne kadar"))
  ) {
    let reply = `Şu anki toplam kayıtlı borcun **${formatTL(
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
    q.includes("güvenli olarak") ||
    q.includes("güvenli harcama") ||
    q.includes("bugün ne kadar")
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
    q.includes("borç kapat") ||
    q.includes("borç öde")
  ) {
    if (totalDebt === 0) {
      return `**Durumun:** Kayıtlı borcun bulunmuyor.\n\nBorçsuz durumunu korumaya ve acil durum fonu oluşturmaya odaklanabilirsin.`;
    }

    return `**Durumun:** Toplam kayıtlı borcun **${formatTL(
      totalDebt
    )} ₺**.\n\n**Dikkat etmen gereken:** Öncelikle gecikme riski olan zorunlu ödemeleri aksatma. Ardından maliyeti yüksek borçlara odaklan.`;
  }

  if (
    q.includes("alışveriş") ||
    q.includes("alabilir miyim") ||
    q.includes("harcayabilir miyim")
  ) {
    const match = q.match(/(\d+[\d\.,]*)/);

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
    q.includes("fazla mı harcadım") ||
    q.includes("harcamalarımda sorun var mı")
  ) {
    const spentRatio =
      monthlyIncome > 0
        ? (monthlyExpenses / monthlyIncome) * 100
        : 0;

    if (
      snapshot?.isOverBudget ||
      remainingBudget < 0
    ) {
      return `**Durumun:** Bu ay bütçeni yaklaşık **${formatTL(
        Math.abs(remainingBudget)
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

  if (safeDaily > 0) {
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

/* =========================================================
   CEBİ KOÇ API
   ========================================================= */



/* =========================================================
   CEBİ — DETERMINISTIC TRANSACTION PARSER
   Gemini'ye ulaşmadan önce açık işlem cümlelerini yakalar.
   ========================================================= */
function normalizeTR(value: string): string {
  return value.toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ö/g, "o").replace(/ç/g, "c").trim();
}
function parseTurkishAmount(text: string): number | null {
  const m = text.match(/(\d{1,3}(?:[. ]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s*)(?:tl|lira|₺)/i)
    || text.match(/(?:^|\s)(\d{2,7}(?:[.,]\d+)?)(?:\s|$)/i);
  if (!m) return null;
  let raw = m[1].replace(/ /g, "");
  if (raw.includes(".") && raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (raw.includes(",")) raw = raw.replace(",", ".");
  else if (/^\d{1,3}\.\d{3}$/.test(raw)) raw = raw.replace(".", "");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function detectExpenseCategory(text: string): string {
  const q = normalizeTR(text);
  if (/market|migros|carrefour|bim|a101|sok/.test(q)) return "market";
  if (/restoran|lokanta|kafe|kahve|yemek|pizza|burger/.test(q)) return "yemek";
  if (/benzin|mazot|akaryakit|petrol/.test(q)) return "akaryakit";
  if (/fatura|elektrik|su fatur|dogalgaz|internet fatur/.test(q)) return "fatura";
  if (/kira/.test(q)) return "kira";
  if (/ulasim|otobus|metro|taksi|uber/.test(q)) return "ulasim";
  if (/saglik|eczane|doktor|ilac/.test(q)) return "saglik";
  if (/giyim|elbise|ayakkabi/.test(q)) return "giyim";
  if (/elektronik|telefon|laptop|bilgisayar/.test(q)) return "elektronik";
  if (/abonelik|netflix|spotify/.test(q)) return "abonelik";
  if (/egitim|kurs|okul/.test(q)) return "egitim";
  if (/eglence|sinema|konser|oyun/.test(q)) return "eglence";
  if (/alisveris|magaza/.test(q)) return "alisveris";
  return "diger";
}
function isCompletedExpenseStatement(text: string): boolean {
  const q = normalizeTR(text);
  return /\b(yaptim|harcadim|harcama yaptim|odeme yaptim|odedim|aldim|satin aldim|alisveris yaptim)\b/.test(q)
    && !/(yapacagim|harcayacagim|odeyecegim|alacagim|yapabilir miyim|harcayabilir miyim|alabilir miyim)/.test(q);
}
function findExplicitExpenseSource(text: string, data: any) {
  const q = normalizeTR(text);
  const cards = Array.isArray(data?.creditCards) ? data.creditCards : [];
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  for (const c of cards) {
    const bank = normalizeTR(String(c.bank || c.bankName || ""));
    const name = normalizeTR(String(c.cardName || c.name || ""));
    if ((bank && q.includes(bank)) || (name && q.includes(name))) return { id: String(c.id), type: "credit_card", name: `${c.bank || c.bankName} - ${c.cardName || c.name}` };
  }
  for (const a of accounts) {
    const bank = normalizeTR(String(a.bankName || ""));
    const name = normalizeTR(String(a.accountName || ""));
    if ((bank && q.includes(bank)) || (name && q.includes(name))) return { id: String(a.id), type: "bank_account", name: `${a.bankName} - ${a.accountName}` };
  }
  if (/nakit|cash/.test(q)) return { id: "cash", type: "cash", name: "Nakit" };
  if (cards.length === 1 && /kart|kredi/.test(q)) {
    const c = cards[0]; return { id: String(c.id), type: "credit_card", name: `${c.bank || c.bankName} - ${c.cardName || c.name}` };
  }
  if (accounts.length === 1 && /hesabimdan|bankadan|hesabim/.test(q)) {
    const a = accounts[0]; return { id: String(a.id), type: "bank_account", name: `${a.bankName} - ${a.accountName}` };
  }
  return null;
}
function tryBuildExpenseAction(text: string, date: string, data: any) {
  if (!isCompletedExpenseStatement(text)) return null;
  const amount = parseTurkishAmount(text);
  if (!amount) return null;
  const source = findExplicitExpenseSource(text, data);
  if (!source) return null;
  return {
    name: "add_expense",
    args: {
      amount,
      category: detectExpenseCategory(text),
      date,
      paymentSourceId: source.id,
      paymentSourceType: source.type,
      note: text.trim(),
    },
  };
}

app.post(
  "/api/coach",
  async (req: Request, res: Response) => {
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
        today,
      } = body;

      const queryText = String(
        question || message || ""
      ).trim();

      if (!queryText) {
        res.status(400).json({
          error: "Soru veya mesaj metni belirtilmelidir.",
        });

        return;
      }

      const currentDate =
        String(today || "").trim() || todayTR();

      const ai = getGenAI();

      /**
       * Uygulama verilerinin kaynakları.
       *
       * Hem doğrudan gelen body alanlarını hem de
       * gelecekte snapshot içine konulabilecek verileri
       * destekliyoruz.
       */
      const sourceData = {
        accounts: Array.isArray(accounts)
          ? accounts
          : [],
        creditCards: Array.isArray(creditCards)
          ? creditCards
          : [],
        loans: Array.isArray(loans)
          ? loans
          : [],
        overdrafts: Array.isArray(overdrafts)
          ? overdrafts
          : [],
        otherDebts: Array.isArray(otherDebts)
          ? otherDebts
          : [],
      };

      // Açık ve tamamlanmış harcamaları Gemini'den bağımsız yakala.
      // Böylece model function calling yapmasa bile işlem kaydı çalışır.
      const directExpenseAction = tryBuildExpenseAction(
        queryText,
        currentDate,
        sourceData
      );

      if (directExpenseAction) {
        const amount = safeNumber(directExpenseAction.args.amount);
        const actionAnswer =
          `Tamam. ${formatTL(amount)} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

        res.json({
          answer: actionAnswer,
          reply: actionAnswer,
          isRuleBased: true,
          action: directExpenseAction,
        });
        return;
      }

      const formattedSnapshot =
        formatSnapshot(snapshot || {});

      const formattedSources =
        formatFinancialSources(sourceData);

      const formattedHistory =
        formatConversationHistory(
          conversationHistory,
          history
        );

      /**
       * Gemini yoksa güvenli fallback.
       */
      if (!ai) {
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

      /* =====================================================
         SYSTEM INSTRUCTION
         ===================================================== */

      const systemInstruction = `
Sen CEBİ adlı kişisel finans uygulamasının yapay zekâ Finans Koçusun.

Sen sadece konuşan bir chatbot değilsin.
Gerektiğinde CEBİ içindeki gerçek finansal işlemlerin oluşturulmasına yardımcı olan bir asistansın.

BUGÜN:
${currentDate}

TEMEL KURALLAR:

1. Her zaman Türkçe konuş.

2. Samimi, net, sakin ve güvenilir ol.
   Gereksiz uzun cevaplar verme.

3. Kullanıcının CEBİ'ye girdiği verileri esas al.
   Bankaların canlı sistemlerine erişimin yok.

4. Banka bakiyesi ile borcu birbirine karıştırma.

5. TÜKETİM HARCAMASI ile BORÇ ÖDEMESİNİ kesinlikle ayır.

6. Kullanıcı GERÇEKTEN bir harcama yaptığını söylüyorsa
   ve gerekli bilgiler mevcutsa "add_expense" aracını kullan.

7. Kullanıcı GERÇEKTEN gelir aldığını veya hesabına gelir yattığını
   söylüyorsa ve gerekli bilgiler mevcutsa "add_income" aracını kullan.

8. Kullanıcı GERÇEKTEN bir borç ödemesi yaptığını söylüyorsa
   "make_debt_payment" aracını kullan.

9. Gelecekte yapılması planlanan harcamaları gerçekleşmiş harcama olarak kaydetme.

10. Kullanıcı yalnızca:
    "Markette 850 TL harcadım."
    diyorsa ve ödeme kaynağı belirtilmiyorsa,
    ödeme kaynağını sormadan kayıt oluşturma.

11. Kullanıcı:
    "Markette 850 TL harcadım Garanti kredi kartımdan."
    diyorsa uygun Garanti kredi kartını bul ve add_expense kullan.

12. Kullanıcı "Garanti kartımdan" gibi bir ifade kullanırsa
    mevcut KREDİ KARTLARI listesindeki en uygun kartı seç.

13. Birden fazla aynı isimde veya benzer ödeme kaynağı varsa
    tahmin etmek yerine kullanıcıya sor.

14. Kullanıcı tarih belirtmezse BUGÜNÜ kullan:
    ${currentDate}

15. Türkçe doğal dil ifadelerini doğru yorumla:
    - market
    - market alışverişi
    - migros
    - carrefour
    - bim
    - a101
    - şok
    gibi ifadeler genellikle "market" kategorisidir.

16. "yemek yedim", "restoranda", "lokantada", "kafede"
    gibi ifadeler genellikle "yemek" kategorisidir.

17. "benzin", "mazot", "akaryakıt"
    gibi ifadeler "akaryakit" kategorisidir.

18. "fatura ödedim" tüketim faturası ise fatura kategorisidir.
    Ancak kredi kartı borcu, kredi taksiti veya KMH borcu ödeme işlemi
    borç ödemesidir ve tüketim harcaması değildir.

19. Kullanıcı tutarı Türkçe kelimelerle söylese bile anlayabil:
    "sekiz yüz elli lira" = 850
    "iki bin beş yüz" = 2500
    "bin iki yüz elli" = 1250

20. Kullanıcı "850", "850 TL", "850 lira", "850₺"
    gibi ifadeleri aynı tutar olarak kabul et.

21. İşlem oluşturduğunda kullanıcıya kısa ve açık cevap ver.

22. Bir işlem için gerekli bilgi eksikse işlem aracını çağırma.
    Kullanıcıya sadece eksik bilgiyi sor.

23. Finansal tavsiye verirken gerçek snapshot verilerine dayan.

24. Günlük güvenli harcama ile planlanan günlük bütçeyi karıştırma.

25. Nakit açığı varsa günlük güvenli harcamayı 0 ₺ kabul et.

26. Yatırım getirisi konusunda kesin kazanç vaadi verme.

ÖNEMLİ:
Bir tool çağrısı yaptığında, tool parametrelerindeki ID'ler
mutlaka aşağıda verilen CEBİ kayıtlarından seçilmelidir.
Uydurma ID üretme.

${formattedSources}

${formattedSnapshot}

ÖNCEKİ KONUŞMA:
${formattedHistory}
`;

      /* =====================================================
         USER PROMPT
         ===================================================== */

      const prompt = `
Kullanıcının son mesajı:

"${queryText}"

Bu mesajı dikkatlice analiz et.

Eğer kullanıcı gerçek bir finansal işlem yaptıysa ve gerekli
bilgiler mevcutsa uygun CEBİ aracını çağır.

Eğer gerekli bilgi eksikse araç çağırma ve eksik bilgiyi sor.

Eğer kullanıcı yalnızca soru soruyorsa araç çağırma;
finansal verileri analiz ederek cevap ver.

Cevabın doğal Türkçe olsun.
`;

      /* =====================================================
         GEMINI
         ===================================================== */

      const response =
        await ai.models.generateContent({
          model: "gemini-3.8-flash",

          contents: prompt,

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
       * Gemini'nin function calling sonucu.
       */
      const functionCalls =
        response.functionCalls || [];

      if (functionCalls.length > 0) {
        const firstCall = functionCalls[0];

        /**
         * CEBİ frontend'ine doğrudan şu yapıyı gönderiyoruz:
         *
         * {
         *   action: {
         *      name: "add_expense",
         *      args: {...}
         *   }
         * }
         *
         * React tarafı bu action'ı gerçek finans fonksiyonuna
         * bağlayacak.
         */
        const action = {
          name: firstCall.name,
          args: firstCall.args || {},
        };

        let actionAnswer = "";

        switch (firstCall.name) {
          case "add_expense":
            actionAnswer =
              `Tamam. ${formatTL(
                firstCall.args?.amount
              )} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;
            break;

          case "add_income":
            actionAnswer =
              `Tamam. ${formatTL(
                firstCall.args?.amount
              )} ₺ tutarındaki geliri CEBİ'ye ekliyorum.`;
            break;

          case "make_debt_payment":
            actionAnswer =
              `Tamam. ${formatTL(
                firstCall.args?.amount
              )} ₺ tutarındaki borç ödemesini CEBİ'ye işliyorum.`;
            break;

          default:
            actionAnswer =
              "İşlemi CEBİ'ye aktarıyorum.";
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
       * Normal sohbet cevabı.
       */
      const answer =
        response.text ||
        "Şu anda finansal verilerinizi analiz ederken bir sorun oluştu. Lütfen tekrar deneyin.";

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

/* =========================================================
   VITE / PRODUCTION SERVER
   ========================================================= */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },

      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      "dist"
    );

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(
        path.join(
          distPath,
          "index.html"
        )
      );
    });
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
