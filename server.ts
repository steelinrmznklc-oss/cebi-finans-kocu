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
       * Açık ve tamamlanmış tüketim harcamalarını önce CEBİ tarafında
       * deterministik olarak yakala. Böylece Gemini normal sohbet cevabı
       * üretse bile gerçek bir harcama kaydı kaçırılmaz.
       *
       * Örnek:
       * "Bugün markette 500 TL Garanti kartımla harcama yaptım."
       * -> add_expense
       */
      const directExpenseAction = tryBuildExpenseAction(
        queryText,
        currentDate,
        sourceData
      );

      if (directExpenseAction) {
        const amount = safeNumber(
          directExpenseAction.args.amount
        );

        const actionAnswer =
          `Tamam. ${formatTL(amount)} ₺ tutarındaki harcamayı CEBİ'ye ekliyorum.`;

        res.json({
          answer: actionAnswer,
          reply: actionAnswer,
          isRuleBased: false,
          action: directExpenseAction,
        });

        return;
      }

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

6. GERÇEKLEŞMİŞ İŞLEM KURALI — ÇOK ÖNEMLİ:
   Kullanıcı "harcadım", "yaptım", "aldım", "ödedim", "alışveriş yaptım"
   gibi geçmişte veya bugün gerçekleşmiş bir işlem bildiriyorsa bunu
   yalnızca tavsiye sorusu olarak yorumlama. Gerekli bilgiler mevcutsa
   ilgili CEBİ aracını MUTLAKA çağır.

7. Gerçek bir tüketim harcaması için "add_expense" kullan.
   Kullanıcının cümlesi açıkça gerçekleşmiş harcamayı bildiriyorsa
   normal finansal analiz cevabı vermek yerine önce işlemi kaydet.

8. Gerçek bir gelir için "add_income" kullan.

9. Gerçek bir kredi kartı, kredi, KMH veya diğer borç ödemesi için
   "make_debt_payment" kullan. Tüketim harcaması ile borç ödemesini
   birbirine karıştırma.

10. Gelecekte yapılması planlanan harcamaları gerçekleşmiş harcama
    olarak kaydetme. "yapacağım", "harcayacağım", "alacağım",
    "ödeyeceğim", "alabilir miyim", "harcayabilir miyim" gibi ifadeler
    geleceğe dönükse işlem aracı çağırma.

11. Gerçekleşmiş harcama örneği:
    "Bugün markette 500 TL Garanti kartımla harcama yaptım."
    Bu cümlede:
    - amount = 500
    - category = market
    - date = ${currentDate}
    - paymentSourceType = credit_card
    - paymentSourceId = aşağıdaki KREDİ KARTLARI listesindeki gerçek
      Garanti kartının ID'si
    olacak şekilde add_expense çağır.

12. Kullanıcı "Garanti kartımla", "Garanti kartımdan",
    "Garanti kredi kartımla" gibi bir ifade kullanırsa aşağıdaki
    KREDİ KARTLARI listesinden banka/kart adı eşleşen gerçek kartı bul.
    paymentSourceId olarak yalnızca listedeki gerçek ID'yi kullan.
    ID uydurma.

13. Kullanıcı ödeme kaynağını belirtmiyorsa add_expense çağırma.
    Eksik bilgi olarak yalnızca ödeme kaynağını sor.

14. Birden fazla aynı isimde veya benzer ödeme kaynağı eşleşiyorsa
    tahmin etme; kullanıcıdan hangi kart/hesap olduğunu sor.

15. Kullanıcı tarih belirtmezse BUGÜNÜ kullan:
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

ÖNCE İŞLEM NİYETİNİ BELİRLE:

- Kullanıcı gerçekten bir harcama yaptığını bildiriyorsa ve tutar,
  kategori, tarih ve ödeme kaynağı belli ise add_expense çağır.
- "Bugün markette 500 TL Garanti kartımla harcama yaptım" gibi bir
  cümle kesinlikle gerçekleşmiş işlem kabul edilir; normal koç analizi
  cevabı üretme, add_expense çağrısı yap.
- Kullanıcının söylediği banka/kart adı aşağıdaki finansal kaynaklar
  içinde varsa paymentSourceId olarak o kaydın GERÇEK ID'sini kullan.
- Ödeme kaynağı yoksa işlemi kaydetme; sadece ödeme kaynağını sor.
- Gerçek gelirde add_income, gerçek borç ödemesinde
  make_debt_payment kullan.
- Geleceğe dönük plan veya "yapabilir miyim?" sorularında işlem aracı
  çağırma.
- Araç çağırdığında tüm zorunlu parametreleri doldur ve gerçek kayıt
  ID'leri dışında ID kullanma.

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

startServer()
/**
 * Kullanıcının açıkça GERÇEKLEŞMİŞ bir tüketim harcaması söylediğini
 * hızlıca tespit eder. Bu katman özellikle mobil uygulamada Gemini'nin
 * bazen normal sohbet cevabı vermesi durumunda add_expense işleminin
 * kaçırılmasını önler.
 */
function normalizeTR(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function parseTurkishAmount(text: string): number | null {
  const match = text.match(
    /(?:^|\s)(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s*(?:tl|lira|₺))?(?=\s|$|[.,])/i
  );

  if (!match) return null;

  let raw = match[1].replace(/\s/g, "");

  if (raw.includes(".") && raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  } else if ((raw.match(/\./g) || []).length > 0) {
    const parts = raw.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      raw = raw.replace(/\./g, "");
    }
  }

  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function detectExpenseCategory(text: string): string | null {
  const q = normalizeTR(text);

  const categories: Array<[string, string[]]> = [
    ["market", ["market", "market alisverisi", "migros", "carrefour", "bim", "a101", "sok"]],
    ["yemek", ["yemek", "restoran", "restoranda", "lokanta", "lokantada", "kafe", "cafede", "cafe"]],
    ["ulasim", ["ulasim", "otobus", "metro", "taksi", "taxi", "uber"]],
    ["fatura", ["fatura", "elektrik faturasi", "su faturasi", "internet faturasi", "telefon faturasi"]],
    ["kira", ["kira"]],
    ["alisveris", ["alisveris", "magaza", "magazada"]],
    ["saglik", ["saglik", "eczane", "doktor", "hastane"]],
    ["eglence", ["eglence", "sinema", "konser"]],
    ["abonelik", ["abonelik", "netflix", "spotify"]],
    ["egitim", ["egitim", "kurs", "okul"]],
    ["akaryakit", ["benzin", "mazot", "akaryakit", "yakit", "petrol"]],
    ["ev", ["ev esyasi", "ev icin"]],
    ["giyim", ["giyim", "kiyafet", "elbise", "ayakkabi"]],
    ["elektronik", ["elektronik", "telefon", "bilgisayar", "laptop"]],
    ["sigorta", ["sigorta"]],
    ["vergi", ["vergi"]],
  ];

  for (const [category, words] of categories) {
    if (words.some((word) => q.includes(word))) {
      return category;
    }
  }

  return null;
}

function detectExpenseDate(text: string, currentDate: string): string {
  const q = normalizeTR(text);

  if (q.includes("dun")) {
    const date = new Date(`${currentDate}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  return currentDate;
}

function isCompletedExpenseStatement(text: string): boolean {
  const q = normalizeTR(text);

  const completed =
    /\b(yaptim|harcadim|aldim|odedim|odeme yaptim|harcama yaptim|alisveris yaptim)\b/i.test(q);

  const futureOrQuestion =
    /\b(yapacagim|harcayacagim|alacagim|odeyecegim|yapabilir miyim|harcayabilir miyim|alabilir miyim|odemeli miyim)\b/i.test(q);

  return completed && !futureOrQuestion;
}

function findExplicitExpenseSource(
  text: string,
  sourceData: {
    accounts: any[];
    creditCards: any[];
    loans: any[];
    overdrafts: any[];
    otherDebts: any[];
  }
): { id: string; type: "bank_account" | "credit_card" | "cash" | "other" } | null {
  const q = normalizeTR(text);

  if (
    /\b(nakit|nakitle|nakitten|nakit olarak)\b/i.test(q)
  ) {
    return { id: "cash", type: "cash" };
  }

  const candidates: Array<{
    id: string;
    type: "bank_account" | "credit_card";
    label: string;
  }> = [];

  for (const card of sourceData.creditCards) {
    candidates.push({
      id: String(card.id),
      type: "credit_card",
      label: normalizeTR(
        `${card.bank || card.bankName || ""} ${card.cardName || card.name || ""} kart`
      ),
    });
  }

  for (const account of sourceData.accounts) {
    candidates.push({
      id: String(account.id),
      type: "bank_account",
      label: normalizeTR(
        `${account.bankName || ""} ${account.accountName || ""} hesap banka hesab`
      ),
    });
  }

  const explicitSource =
    /\b(kartimdan|kartimla|karttan|kredi kartimdan|kredi kartimla|hesabimdan|hesabimla|banka hesabimdan|banka hesabimla|hesaptan|hesapla)\b/i.test(q);

  if (!explicitSource) {
    return null;
  }

  const mentioned = candidates.filter((candidate) => {
    const words = candidate.label
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    return words.some((word) => q.includes(word));
  });

  if (mentioned.length === 1) {
    return {
      id: mentioned[0].id,
      type: mentioned[0].type,
    };
  }

  // "kartımla" denmiş ama banka adı verilmemişse ve tek kayıtlı kart varsa
  // o kartı kullan. Birden fazla kart varsa tahmin etme.
  if (
    mentioned.length === 0 &&
    explicitSource &&
    /\b(kartimdan|kartimla|karttan|kredi kartimdan|kredi kartimla)\b/i.test(q)
  ) {
    const cards = sourceData.creditCards;
    if (cards.length === 1) {
      return {
        id: String(cards[0].id),
        type: "credit_card",
      };
    }
  }

  return null;
}

function tryBuildExpenseAction(
  text: string,
  currentDate: string,
  sourceData: {
    accounts: any[];
    creditCards: any[];
    loans: any[];
    overdrafts: any[];
    otherDebts: any[];
  }
): { name: "add_expense"; args: Record<string, unknown> } | null {
  if (!isCompletedExpenseStatement(text)) {
    return null;
  }

  const amount = parseTurkishAmount(text);
  const category = detectExpenseCategory(text);
  const source = findExplicitExpenseSource(text, sourceData);

  if (!amount || !category || !source) {
    return null;
  }

  return {
    name: "add_expense",
    args: {
      amount,
      category,
      date: detectExpenseDate(text, currentDate),
      paymentSourceId: source.id,
      paymentSourceType: source.type,
      note: text.trim(),
    },
  };
}

;
