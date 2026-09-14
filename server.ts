import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));

// Lazy GoogleGenAI initialization
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
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Financial Coach AI endpoint
app.post("/api/coach", async (req: Request, res: Response) => {
  try {
    const { question, message, snapshot, conversationHistory, history } = req.body || {};
    const queryText = (question || message || "").trim();

    if (!queryText) {
      res.status(400).json({ error: "Soru metni belirtilmelidir." });
      return;
    }

    const ai = getGenAI();

    // Context formatting
    const formattedSnapshot = `
KULLANICI FİNANSAL ANLIK DURUMU (Özet):
- Toplam Mevcut Para (Banka Bakiyesi): ${Number(snapshot?.totalBalance || 0).toLocaleString("tr-TR")} ₺
- Aylık Planlanan Gelir: ${Number(snapshot?.monthlyIncome || 0).toLocaleString("tr-TR")} ₺
- Fiilen Yatan Gelir (Ay başından bugüne): ${Number(snapshot?.realizedMonthlyIncome ?? snapshot?.monthlyIncome ?? 0).toLocaleString("tr-TR")} ₺
- Beklenen Gelecek Gelir: ${Number(snapshot?.pendingMonthlyIncome || 0).toLocaleString("tr-TR")} ₺
- Bu Ayki Tüketim Harcamaları: ${Number(snapshot?.monthlyExpenses || 0).toLocaleString("tr-TR")} ₺
- Bu Ay Yapılan Borç Geri Ödemeleri: ${Number(snapshot?.totalDebtRepayments || 0).toLocaleString("tr-TR")} ₺
- Kalan Bütçe: ${Number(snapshot?.remainingBudget || 0).toLocaleString("tr-TR")} ₺
- Kalan Gün Sayısı: ${snapshot?.remainingDays || 0} gün
- Yaklaşan Zorunlu Ödemeler: ${Number(snapshot?.upcomingPaymentsTotal || 0).toLocaleString("tr-TR")} ₺
- Mevcut Nakit Güvenliği (Net Likit = Banka - Zorunlu Ödemeler): ${Number(snapshot?.netLiquidAvailable ?? (snapshot?.totalBalance || 0) - (snapshot?.upcomingPaymentsTotal || 0)).toLocaleString("tr-TR")} ₺
- Anlık Nakit Açığı Durumu: ${snapshot?.hasCashShortfall ? `AÇIK VAR (${Number(snapshot?.cashShortfall || 0).toLocaleString("tr-TR")} ₺ açık)` : "Açık yok, nakit yeterli"}
- GÜNLÜK GÜVENLİ HARCAMA (Mevcut Likit Nakitten): ${snapshot?.hasCashShortfall ? "0 ₺ (Nakit açığı nedeniyle harcama yapılamaz)" : `${Number(snapshot?.dailySafeSpending || 0).toLocaleString("tr-TR")} ₺ / gün`}
- PLANLANAN GÜNLÜK BÜTÇE (Beklenen Gelirler Dahil Aylık Plan): ${Number(snapshot?.plannedDailyBudget || 0).toLocaleString("tr-TR")} ₺ / gün
- Toplam Borç: ${Number(snapshot?.totalDebt || 0).toLocaleString("tr-TR")} ₺
  * Kredi Kartı Borcu: ${Number(snapshot?.creditCardDebt || 0).toLocaleString("tr-TR")} ₺
  * Kredi Anapara Borcu: ${Number(snapshot?.loanDebt || 0).toLocaleString("tr-TR")} ₺
  * KMH Borcu: ${Number(snapshot?.overdraftDebt || 0).toLocaleString("tr-TR")} ₺
  * Diğer Borçlar: ${Number(snapshot?.otherDebt || 0).toLocaleString("tr-TR")} ₺

HARCAMA KATEGORİ DAĞILIMI:
${Array.isArray(snapshot?.categoryBreakdown) && snapshot.categoryBreakdown.length > 0
  ? snapshot.categoryBreakdown.map((c: any) => `- ${c.name}: ${Number(c.amount).toLocaleString("tr-TR")} ₺ (%${c.percentage || 0})`).join("\n")
  : "Henüz harcama kaydı yok."}

BORÇ VE YAKLAŞAN ÖDEME DETAYLARI:
${Array.isArray(snapshot?.debtDetails) && snapshot.debtDetails.length > 0
  ? snapshot.debtDetails.map((d: any) => `- ${d.type} (${d.name}): Toplam Borç ${Number(d.amount).toLocaleString("tr-TR")} ₺, Asgari/Taksit: ${Number(d.monthlyOrMin || 0).toLocaleString("tr-TR")} ₺, Vade/Ödeme Günü: ${d.dueDate || "Belirtilmemiş"}`).join("\n")
  : "Kayıtlı borç bulunmuyor."}

GELİR DETAYLARI:
${Array.isArray(snapshot?.incomes) && snapshot.incomes.length > 0
  ? snapshot.incomes.map((i: any) => `- ${i.name}: ${Number(i.amount).toLocaleString("tr-TR")} ₺ (${i.isRecurring ? "Her ay düzenli" : "Tek seferlik"}, Ödeme Günü: ${i.paymentDate || "Ay başı"})`).join("\n")
  : "Kayıtlı gelir bulunmuyor."}
`;

    // If no API key is available, return an intelligent rule-based answer
    if (!ai) {
      const fallbackReply = generateFallbackCoachReply(queryText, snapshot);
      res.json({
        answer: fallbackReply,
        reply: fallbackReply,
        isRuleBased: true,
      });
      return;
    }

    const systemInstruction = `
Sen CEBİ adlı finans uygulamasının samimi, zeki, güvenilir, sakin ve yapıcı Finans Koçusun.
Türk kullanıcılarına kişisel bütçe ve para yönetimi konusunda rehberlik ediyorsun.

TEMEL VE KESİN PRENSİPLERİN:
1. Türkçe konuş, samimi ve güven veren bir dost gibi ol. Aşırı resmi veya soğuk bankacı dili kullanma.
2. Matematiksel hesaplamaları yalnızca sana verilen finansal anlık durum verilerine (snapshot) dayandır; rakamları ASLA uydurma veya bağımsız kafadan aritmetik yapma.
3. KESİNLİKLE GERÇEK BANKA SİSTEMİNE ERİŞİMİN YOKTUR: Kullanıcıya CEBİ uygulamasına girdiği veriler üzerinden rehberlik ettiğini, bankalara canlı API erişimin olmadığını gerektiğinde dürüstçe belirt.
4. BANKA BAKİYESİ VE TOPLAM BORÇ FARKINI KORU: Banka bakiyesi kullanıcının sahip olduğu nakit varlıktır; toplam borç ise bankalara ödenecek yükümlülüktür. Bunları asla birbirine karıştırma.
5. TÜKETİM HARCAMASI İLE BORÇ GERİ ÖDEMESİNİ KESİNLİKLE AYIR: Borç geri ödemesi (kredi kartı ödemesi, kredi taksiti vb.) bir bilanço hareketidir; aylık tüketim harcaması (market, yemek, fatura vb.) değildir. Borç ödemelerini tüketim harcaması olarak sayma.
6. Kredi kartı ödendiğinde ne olduğunu açıklarken: Borcun ve yaklaşan zorunlu ödemenin azaldığını, kullanılabilir kart limitinin açıldığını, banka bakiyesinin ödenen tutar kadar azaldığını fakat bunun bir tüketim harcaması OLMADIĞINI belirt.
7. GÜNLÜK GÜVENLİ HARCAMA İLE PLANLANAN GÜNLÜK BÜTÇEYİ ASLA KARIŞTIRMA:
   - "Günlük Güvenli Harcama": Kullanıcının şu an bankasındaki fiili likit nakitten yaklaşan zorunlu ödemeler ayrıldıktan sonra güvenle harcayabileceği tutardır. Henüz yatmamış gelecekteki maaş/avans gelirleri ASLA şimdiden mevcut nakit gibi harcanamaz.
   - KRİTİK KURAL (CASE A - CASH SHORTFALL): Eğer hasCashShortfall = true veya mevcut nakit yaklaşan zorunlu ödemeleri karşılamıyorsa; Günlük Güvenli Harcama KESİNLİKLE 0 ₺'dir! Kullanıcıya nakit açığını bildir, beklenen gelirlerin henüz yatmadığını vurgula ve ASLA "günde X TL harcayabilirsin" deme.
   - "Planlanan Günlük Bütçe": Ay sonuna kadar beklenen tüm gelirler hesaba yattığında teorik olarak gün başına düşen bütçedir. Henüz yatmamış para bugün harcanabilir nakit değildir.
8. YANIT YAPILANDIRMASI:
   Finansal değerlendirme veya tavsiye verirken yanıtını mümkün olduğunca şu 4 net başlıkla düzenle:
   **Durumun:** [Kısa ve net durum tespiti]
   **Dikkat etmen gereken:** [En kritik risk, nakit açığı veya harcama uyarısı]
   **Bugün için:** [Hemen uygulanabilecek pratik eylem, örn. harcama limiti]
   **Sonraki adım:** [Gelecek gelirler veya borç kapatma için kısa vadeli plan]
9. YASAL UYARI: Asla kesin yatırım getirisi vaat etme. Sen bir finans koçusun, lisanslı yatırım danışmanı değilsin.
`;

    const prompt = `
${formattedSnapshot}

KULLANICININ SORUSU VEYA TALEBİ:
"${queryText}"

Lütfen yukarıdaki gerçek finansal verilere göre kullanıcıya yardımcı, yapıcı, tutarlı ve yapılandırılmış bir cevap ver.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const answer = response.text || "Şu anda finansal verilerinizi analiz ederken bir sorun oluştu. Lütfen tekrar deneyin.";

    res.json({
      answer,
      reply: answer,
      isRuleBased: false,
    });
  } catch (error: any) {
    console.error("Coach API error:", error);
    // Graceful fallback if Gemini quota or connection error occurs
    const { question, message, snapshot } = req.body || {};
    const query = (question || message || "").trim();
    const fallbackReply = generateFallbackCoachReply(query, snapshot || {});
    res.json({
      answer: fallbackReply,
      reply: fallbackReply,
      isRuleBased: true,
      errorNotice: "Yapay zeka servisine geçici olarak ulaşılamadığı için CEBİ kural tabanlı finans motoru ile yanıtlandı.",
    });
  }
});

// Deterministic rule-based fallback response engine
function generateFallbackCoachReply(question: string, snapshot: any): string {
  const q = question.toLowerCase();
  const safeDaily = Number(snapshot?.dailySafeSpending || 0);
  const remainingBudget = Number(snapshot?.remainingBudget || 0);
  const totalBalance = Number(snapshot?.totalBalance || 0);
  const totalDebt = Number(snapshot?.totalDebt || 0);
  const monthlyIncome = Number(snapshot?.monthlyIncome || 0);
  const monthlyExpenses = Number(snapshot?.monthlyExpenses || 0);
  const totalDebtRepayments = Number(snapshot?.totalDebtRepayments || 0);
  const upcomingPaymentsTotal = Number(snapshot?.upcomingPaymentsTotal || 0);
  const remainingDays = Number(snapshot?.remainingDays || 1);
  const hasCashShortfall = Boolean(snapshot?.hasCashShortfall || (totalBalance < upcomingPaymentsTotal && upcomingPaymentsTotal > 0));
  const cashShortfall = Number(snapshot?.cashShortfall || (hasCashShortfall ? upcomingPaymentsTotal - totalBalance : 0));
  const plannedDailyBudget = Number(snapshot?.plannedDailyBudget || 0);
  const debtDetails = Array.isArray(snapshot?.debtDetails) ? snapshot.debtDetails : [];

  // Q1: "Bu ay toplam ne kadar harcadım?"
  if (q.includes("ne kadar harcadım") || q.includes("toplam harcamam") || q.includes("harcamalarım")) {
    let text = `Bu ay toplam **${monthlyExpenses.toLocaleString("tr-TR")} ₺** tüketim harcaması yaptın.`;
    if (totalDebtRepayments > 0) {
      text += `\n\nAyrıca borç kapatma ve taksit ödemeleri için **${totalDebtRepayments.toLocaleString("tr-TR")} ₺** ödeme gerçekleştirdin (Bu ödeme bir bilanço transferi olup tüketim harcamalarına dahil edilmez).`;
    }
    return text;
  }

  // Q2: "Şu anda bankada ne kadar param var?"
  if (q.includes("bankada ne kadar") || q.includes("hesabımda ne kadar") || q.includes("kaç param var") || q.includes("param var")) {
    return `CEBİ'ye kayıtlı banka hesaplarındaki toplam kullanılabilir nakit bakiyen **${totalBalance.toLocaleString("tr-TR")} ₺**'dir.\n\n*(Not: CEBİ bir açık bankacılık veya doğrudan banka bağlantı servisi değildir; girdiğin güncel hesap kayıtlarını esas alır).*`;
  }

  // Q3: "Toplam borcum ne kadar?"
  if (q.includes("toplam borcum") || (q.includes("borcum") && q.includes("ne kadar"))) {
    let reply = `Şu anki toplam kayıtlı borcun **${totalDebt.toLocaleString("tr-TR")} ₺** seviyesindedir.`;
    if (debtDetails.length > 0) {
      reply += "\n\nBorç Dağılımı:\n" + debtDetails.map((d: any) => `• ${d.name} (${d.type}): ${Number(d.amount).toLocaleString("tr-TR")} ₺`).join("\n");
    }
    reply += `\n\n*(Unutma: Bankadaki ${totalBalance.toLocaleString("tr-TR")} ₺ nakit bakiyen bir varlıktır, bu tutar ise gelecekte ödenecek toplam yükümlülüktür).*`;
    return reply;
  }

  // Q4: "Kredi kartımı ödersem ne olur?"
  if (q.includes("kredi kartımı ödersem") || q.includes("kartımı ödersem") || q.includes("borcumu ödersem")) {
    return `Kredi kartı borcunu ödediğinde:\n1. **Kredi kartı borcun azalır** ve ödediğin tutar kadar **kullanılabilir kart limitin açılır**.\n2. **Banka bakiyen ödediğin tutar kadar azalır**.\n3. **Bu işlem bir tüketim harcaması DEĞİLDİR**, bu yüzden aylık harcama grafiğini şişirmez.\n4. Yaklaşan zorunlu ödeme yükümlülüğün ortadan kalkar ve faiz yükünden korunursun.`;
  }

  // Q5: "Bugün güvenli olarak ne kadar harcayabilirim?"
  if (q.includes("güvenli olarak") || q.includes("güvenli harcama") || q.includes("bugün ne kadar")) {
    if (hasCashShortfall) {
      return `Şu anda banka hesabında **${totalBalance.toLocaleString("tr-TR")} ₺** nakit bulunurken, ay sonuna kadar **${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺** zorunlu ödeme yükümlülüğün var.\n\nBu sebeple mevcut nakdinde **-${cashShortfall.toLocaleString("tr-TR")} ₺ açık** bulunuyor ve bugünkü **Günlük Güvenli Harcama limitin 0 ₺**'dir.\n\nBeklenen gelirlerin (örneğin maaş/avans) hesabına fiilen yatana kadar serbest nakit harcaması yapmaman gerekir. Gelecek gelirlerin yattığında ise **Planlanan Günlük Bütçen ${plannedDailyBudget.toLocaleString("tr-TR")} ₺ / gün** seviyesine gelecektir.`;
    }

    if (snapshot?.isOverBudget || remainingBudget < 0) {
      return `Şu an aylık bütçende yaklaşık ${Math.abs(remainingBudget).toLocaleString("tr-TR")} ₺ açık bulunuyor. Bu nedenle bugünkü Günlük Güvenli Harcama limitin **0 ₺**'dir. Ay sonuna kadar zorunlu olmayan tüketim harcamalarını durdurmanı öneririm.`;
    }

    return `Bugün için Günlük Güvenli Harcama Limitin **${safeDaily.toLocaleString("tr-TR")} ₺**'dir.\n\nBanka bakiyenden yaklaşan zorunlu ödemelerin (${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺) düşülmüş ve serbest likit nakdin ${remainingDays} güne bölünmüştür. Ay boyunca beklenen gelirlerinle birlikte Planlanan Günlük Bütçen ise ${plannedDailyBudget.toLocaleString("tr-TR")} ₺ / gün'dür.`;
  }

  // Q6: "Önümüzdeki 30 gün içinde hangi ödemelerim var?"
  if (q.includes("30 gün") || q.includes("hangi ödemelerim") || q.includes("yaklaşan ödeme") || q.includes("ödemelerim var")) {
    if (upcomingPaymentsTotal === 0 || debtDetails.length === 0) {
      return `Önümüzdeki 30 gün için kayıtlı herhangi bir zorunlu ödemen bulunmuyor.`;
    }
    let reply = `Önümüzdeki dönemde toplam **${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺** tutarında zorunlu ödemen bulunuyor:\n\n`;
    reply += debtDetails.map((d: any) => `• ${d.name}: ${Number(d.monthlyOrMin || d.amount).toLocaleString("tr-TR")} ₺ (Vade: ${d.dueDate || "Tarih belirtilmemiş"})`).join("\n");
    return reply;
  }

  // CASE A: CASH SHORTFALL (Priority over general shopping or status queries)
  if (hasCashShortfall && (q.includes("durum") || q.includes("harcama") || q.includes("bütçe") || q.includes("alabilir miyim") || q.includes("para"))) {
    return `**Durumun:** Şu an hesaplarında ${totalBalance.toLocaleString("tr-TR")} ₺ bulunurken, ay sonuna kadar ${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺ zorunlu ödeme yükümlülüğün var.\n\n**Dikkat etmen gereken:** Mevcut nakdinde **-${cashShortfall.toLocaleString("tr-TR")} ₺ açık** bulunuyor. Bu nedenle bugünkü günlük güvenli harcama limitin **0 ₺**'dir.\n\n**Bugün için:** Beklenen gelirlerin fiilen hesabına geçene kadar zorunlu olmayan tüm nakit harcamalarını durdurmalısın.\n\n**Sonraki adım:** Gelirlerin hesabına geçtiğinde planlanan günlük bütçen ${plannedDailyBudget.toLocaleString("tr-TR")} ₺ / gün seviyesine gelecektir.`;
  }

  // CASE C: HIGH DEBT / DEBT PRIORITY
  if (q.includes("hangi borcumu") || q.includes("borç kapat") || q.includes("borç öde") || (q.includes("borç") && totalDebt > 0)) {
    if (totalDebt === 0) {
      return `**Durumun:** Harika haber! Kayıtlı hiçbir borcun bulunmuyor.\n\n**Dikkat etmen gereken:** Finansal serbestliğini korumak için acil durum fonu oluşturmalısın.\n\n**Bugün için:** Tasarruflarını likit vadeli veya güvenli yatırım araçlarında değerlendir.\n\n**Sonraki adım:** Uzun vadeli birikim planı hazırla.`;
    }
    return `**Durumun:** Toplam kayıtlı borcun **${totalDebt.toLocaleString("tr-TR")} ₺** seviyesindedir.\n\n**Dikkat etmen gereken:** Borçlarını öderken panik yapmadan iki adıma odaklanmalısın: Gecikme faizini önlemek ve en yüksek maliyetli borcu eritmek.\n\n**Bugün için:** Yaklaşan ${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺ tutarındaki zorunlu asgari ve kredi taksitlerini zamanında öde.\n\n**Sonraki adım:** Kalan serbest nakdini faiz maliyeti en yüksek olan borca (genellikle KMH veya kredi kartı dönem borcu) yönlendir.`;
  }

  // Specific purchase simulation (e.g., 5.000 TL alışveriş yapabilir miyim?)
  if (q.includes("alışveriş") || q.includes("alabilir miyim") || q.includes("harcayabilir miyim") || q.includes("5.000")) {
    const match = q.match(/(\d+[\d\.,]*)/);
    const amount = match ? parseFloat(match[1].replace(".", "").replace(",", ".")) : 5000;
    
    if (hasCashShortfall) {
      return `**Durumun:** Şu an nakit açığın (${cashShortfall.toLocaleString("tr-TR")} ₺) bulunuyor.\n\n**Dikkat etmen gereken:** ${amount.toLocaleString("tr-TR")} ₺ harcama yapmak nakit açığını büyütecektir.\n\n**Bugün için:** Bu harcamayı kesinlikle ertelemeni öneririm. Bugünkü güvenli harcama limitin 0 ₺'dir.\n\n**Sonraki adım:** Gelirlerin hesabına yattıktan sonra bütçeni tekrar gözden geçir.`;
    }

    if (snapshot?.isOverBudget || amount > remainingBudget) {
      return `**Durumun:** Kalan bütçen ${remainingBudget.toLocaleString("tr-TR")} ₺.\n\n**Dikkat etmen gereken:** ${amount.toLocaleString("tr-TR")} ₺ tutarındaki bu harcama bütçe açığı yaratabilir.\n\n**Bugün için:** Harcamayı önümüzdeki aya ertelemek bütçeni koruyacaktır.\n\n**Sonraki adım:** Zorunlu olmayan diğer kategorileri kısıtla.`;
    }

    return `**Durumun:** Kalan bütçen ${remainingBudget.toLocaleString("tr-TR")} ₺ ve günlük güvenli limitin ${safeDaily.toLocaleString("tr-TR")} ₺.\n\n**Dikkat etmen gereken:** ${amount.toLocaleString("tr-TR")} ₺ harcama sonrası kalan ${remainingDays} gündeki günlük limitin düşecektir.\n\n**Bugün için:** İhtiyaçsa yapılabilir, ancak sonraki günlerde daha tutumlu olmalısın.\n\n**Sonraki adım:** Harcamayı yaptıktan sonra CEBİ'ye kaydederek bakiyeni güncelle.`;
  }

  // CASE D: HIGH CONSUMER SPENDING
  if (q.includes("fazla mı harcadım") || q.includes("harcamalarımda sorun var mı")) {
    if (snapshot?.isOverBudget || remainingBudget < 0) {
      return `**Durumun:** Bu ay planlanan bütçeyi yaklaşık ${Math.abs(remainingBudget).toLocaleString("tr-TR")} ₺ aştın.\n\n**Dikkat etmen gereken:** Tüketim harcamaların ${monthlyExpenses.toLocaleString("tr-TR")} ₺ seviyesine ulaştı.\n\n**Bugün için:** Kalan ${remainingDays} gün boyunca zorunlu olmayan tüm harcamaları durdur.\n\n**Sonraki adım:** Yaklaşan ${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺ zorunlu ödemelerin için gereken nakdi koru.`;
    }
    const spentRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
    return `**Durumun:** Bu ayki toplam gelirin ${monthlyIncome.toLocaleString("tr-TR")} ₺, tüketim harcaman ${monthlyExpenses.toLocaleString("tr-TR")} ₺ (gelirin %${Math.round(spentRatio)}'si).\n\n**Dikkat etmen gereken:** Kalan bütçen ${remainingBudget.toLocaleString("tr-TR")} ₺ ve güvenli harcama tempon dengeli görünüyor.\n\n**Bugün için:** Günlük güvenli harcama limitin **${Math.max(0, safeDaily).toLocaleString("tr-TR")} ₺**'dir.\n\n**Sonraki adım:** Bu tempoyu koruyarak ayı bütçe içinde kapat.`;
  }

  // CASE B & E: HEALTHY CASH / GENERAL FINANCIAL STATUS
  if (safeDaily > 0) {
    return `**Durumun:** Toplam kullanılabilir paran ${totalBalance.toLocaleString("tr-TR")} ₺, bu ayki tüketim harcaman ${monthlyExpenses.toLocaleString("tr-TR")} ₺.\n\n**Dikkat etmen gereken:** Yaklaşan ${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺ zorunlu ödemen nakit bakiyenden ayrılmıştır.\n\n**Bugün için:** Günlük güvenli harcama limitin **${safeDaily.toLocaleString("tr-TR")} ₺**'dir.\n\n**Sonraki adım:** Planlanan günlük bütçen (${plannedDailyBudget.toLocaleString("tr-TR")} ₺ / gün) doğrultusunda acil durum fonu ve düzenli birikim yapabilirsin.`;
  }

  return `**Durumun:** Bankadaki nakit bakiyen ${totalBalance.toLocaleString("tr-TR")} ₺, bu ayki tüketim harcaman ${monthlyExpenses.toLocaleString("tr-TR")} ₺.\n\n**Dikkat etmen gereken:** Yaklaşan zorunlu ödemelerin toplamı ${upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺ seviyesindedir.\n\n**Bugün için:** Günlük güvenli harcama limitin **${safeDaily.toLocaleString("tr-TR")} ₺**'dir.\n\n**Sonraki adım:** Planına sadık kalarak harcamalarını kontrol altında tutabilirsin.`;
}

// Development Vite integration or Production static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CEBİ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
