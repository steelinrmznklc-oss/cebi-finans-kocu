import { AppData, BankAccount, CreditCard, Loan, Overdraft, OtherDebt, Income, Expense, ScheduledPayment, CoachMessage } from '../types/finance';

const STORAGE_KEY = 'cebi_finance_app_v1';

export function getInitialDemoData(): AppData {
  const accounts: BankAccount[] = [
    {
      id: 'acc-1',
      bankName: 'Garanti BBVA',
      accountName: 'Vadesiz Maaş Hesabı',
      accountType: 'vadesiz',
      balance: 14200,
      notes: 'Maaş ve otomatik ödeme hesabı',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
    {
      id: 'acc-2',
      bankName: 'Ziraat Bankası',
      accountName: 'Vadesiz TL Hesabı',
      accountType: 'vadesiz',
      balance: 11800,
      notes: 'Kira ve fatura ödemeleri',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
    {
      id: 'acc-3',
      bankName: 'İş Bankası',
      accountName: 'Acil Durum Fonu (Birikim)',
      accountType: 'birikim',
      balance: 22000,
      notes: 'Zor günler için ayrılan birikim',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  ];

  const creditCards: CreditCard[] = [
    {
      id: 'card-1',
      bank: 'Garanti BBVA',
      cardName: 'Bonus Platinum',
      limit: 60000,
      availableLimit: 42300,
      currentDebt: 17700,
      statementDebt: 12400,
      minimumPayment: 2480,
      paymentDueDate: '2026-09-20',
      cutoffDate: '10',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
    {
      id: 'card-2',
      bank: 'Yapı Kredi',
      cardName: 'Worldcard Gold',
      limit: 40000,
      availableLimit: 31500,
      currentDebt: 8500,
      statementDebt: 6200,
      minimumPayment: 1240,
      paymentDueDate: '2026-09-25',
      cutoffDate: '15',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  ];

  const loans: Loan[] = [
    {
      id: 'loan-1',
      loanName: 'İhtiyaç Kredisi',
      bank: 'Ziraat Bankası',
      originalAmount: 100000,
      remainingPrincipal: 62000,
      monthlyInstallment: 5120,
      remainingInstallments: 14,
      nextPaymentDate: '2026-09-18',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  ];

  const overdrafts: Overdraft[] = [
    {
      id: 'kmh-1',
      bank: 'Garanti BBVA',
      accountName: 'Avans Hesap (KMH)',
      limit: 15000,
      usedAmount: 3200,
      remainingAvailable: 11800,
      interestRate: 5.0,
      paymentDate: '2026-09-28',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  ];

  const otherDebts: OtherDebt[] = [
    {
      id: 'debt-1',
      debtName: 'Elden Borç (Kardeşime)',
      amount: 4000,
      dueDate: '2026-10-05',
      description: 'Ekim başında ödenecek elden emanet borç',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  ];

  const incomes: Income[] = [
    {
      id: 'inc-1',
      name: 'Aylık Şirket Maaşı',
      amount: 48500,
      frequency: 'monthly',
      dayOfMonth: 1,
      category: 'maas',
      paymentDate: '2026-09-01',
      isRecurring: true,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'inc-2',
      name: 'Danışmanlık / Freelance',
      amount: 7500,
      frequency: 'one_time',
      category: 'freelance',
      paymentDate: '2026-09-15',
      isRecurring: false,
      createdAt: '2026-09-05T08:00:00.000Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      amount: 14500,
      category: 'kira',
      date: '2026-09-02',
      paymentSourceName: 'Ziraat Bankası',
      paymentSourceType: 'bank_account',
      note: 'Eylül ayı ev kirası',
      createdAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'exp-2',
      amount: 2450,
      category: 'market',
      date: '2026-09-04',
      paymentSourceName: 'Garanti Bonus Platinum',
      paymentSourceType: 'credit_card',
      note: 'Haftalık büyük market alışverişi',
      createdAt: '2026-09-04T14:30:00.000Z',
    },
    {
      id: 'exp-3',
      amount: 1280,
      category: 'fatura',
      date: '2026-09-05',
      paymentSourceName: 'Garanti BBVA',
      paymentSourceType: 'bank_account',
      note: 'Elektrik & Doğalgaz faturası',
      createdAt: '2026-09-05T09:15:00.000Z',
    },
    {
      id: 'exp-4',
      amount: 1650,
      category: 'ulasim',
      date: '2026-09-07',
      paymentSourceName: 'Garanti Bonus Platinum',
      paymentSourceType: 'credit_card',
      note: 'Benzin dolumu (Opet)',
      createdAt: '2026-09-07T18:20:00.000Z',
    },
    {
      id: 'exp-5',
      amount: 920,
      category: 'yemek',
      date: '2026-09-09',
      paymentSourceName: 'Worldcard Gold',
      paymentSourceType: 'credit_card',
      note: 'Dışarıda akşam yemeği',
      createdAt: '2026-09-09T20:45:00.000Z',
    },
    {
      id: 'exp-6',
      amount: 390,
      category: 'abonelik',
      date: '2026-09-10',
      paymentSourceName: 'Garanti Bonus Platinum',
      paymentSourceType: 'credit_card',
      note: 'Netflix & Spotify aile paketi',
      createdAt: '2026-09-10T08:00:00.000Z',
    },
    {
      id: 'exp-7',
      amount: 850,
      category: 'market',
      date: '2026-09-11',
      paymentSourceName: 'Worldcard Gold',
      paymentSourceType: 'credit_card',
      note: 'Şarküteri ve manav alışverişi',
      createdAt: '2026-09-11T16:10:00.000Z',
    },
  ];

  const scheduledPayments: ScheduledPayment[] = [
    {
      id: 'bill-1',
      name: 'Turkcell Ev İnterneti',
      amount: 440,
      dueDate: '2026-09-16',
      category: 'Fatura',
      type: 'bill',
      isPaid: false,
      isRecurring: true,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'bill-2',
      name: 'İSKİ Su Faturası',
      amount: 290,
      dueDate: '2026-09-22',
      category: 'Fatura',
      type: 'bill',
      isPaid: false,
      isRecurring: true,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
  ];

  const coachMessages: CoachMessage[] = [
    {
      id: 'msg-welcome',
      sender: 'coach',
      text: 'Merhaba! Ben CEBİ finans koçun. 🤝\n\nSenin bütçeni, borçlarını ve harcamalarını anbean takip edip paranı güvenle yönetmene yardımcı oluyorum. Bu ayki durumun gayet dengeli görünüyor! "Bu ay fazla mı harcadım?" veya "Önce hangi borcumu ödemeliyim?" gibi dilediğin soruyu bana sorabilirsin.',
      timestamp: '2026-09-12T08:00:00.000Z',
    },
  ];

  return {
    profile: {
      name: 'Ahmet Yılmaz',
      hasCompletedOnboarding: true,
      currency: 'TRY',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    accounts,
    creditCards,
    loans,
    overdrafts,
    otherDebts,
    incomes,
    expenses,
    scheduledPayments,
    coachMessages,
    version: 1,
  };
}

export function getCleanEmptyData(): AppData {
  return {
    profile: {
      name: 'Kullanıcı',
      hasCompletedOnboarding: false,
      currency: 'TRY',
      createdAt: new Date().toISOString(),
    },
    accounts: [],
    creditCards: [],
    loans: [],
    overdrafts: [],
    otherDebts: [],
    incomes: [],
    expenses: [],
    scheduledPayments: [],
    coachMessages: [
      {
        id: 'msg-clean-welcome',
        sender: 'coach',
        text: 'Hoş geldin! Ben CEBİ finans koçun. Banka hesaplarını, gelirlerini ve varsa borçlarını ekleyerek başlayabilirsin. İhtiyacın olan her an sana rehberlik edeceğim.',
        timestamp: new Date().toISOString(),
      },
    ],
    version: 1,
  };
}

export function getSimulationScenarioData(): AppData {
  const accounts: BankAccount[] = [
    {
      id: 'acc-ziraat',
      bankName: 'Ziraat Bankası',
      accountName: 'Vadesiz TL',
      accountType: 'vadesiz',
      balance: 20000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const creditCards: CreditCard[] = [
    {
      id: 'card-1',
      bank: 'Ziraat Bankası',
      cardName: 'Bankkart Combo',
      limit: 30000,
      availableLimit: 30000,
      currentDebt: 0,
      statementDebt: 0,
      minimumPayment: 0,
      paymentDueDate: '2026-09-25',
      cutoffDate: '15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const loans: Loan[] = [
    {
      id: 'loan-1',
      bank: 'Ziraat Bankası',
      loanName: 'İhtiyaç Kredisi',
      originalAmount: 60000,
      remainingPrincipal: 60000,
      monthlyInstallment: 5000,
      remainingInstallments: 12,
      nextPaymentDate: '2026-09-20',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const incomes: Income[] = [
    {
      id: 'inc-salary',
      name: 'Aylık Maaş',
      amount: 35000,
      frequency: 'monthly',
      dayOfMonth: 1,
      category: 'maas',
      isRecurring: true,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    profile: {
      name: 'Simülasyon Test Kullanıcısı',
      hasCompletedOnboarding: true,
      currency: 'TRY',
      createdAt: new Date().toISOString(),
    },
    accounts,
    creditCards,
    loans,
    overdrafts: [],
    otherDebts: [],
    incomes,
    expenses: [],
    scheduledPayments: [],
    coachMessages: [
      {
        id: 'msg-sim-welcome',
        sender: 'coach',
        text: 'Simülasyon test senaryosu yüklendi (Ziraat: 20.000 ₺ bakiye, Kredi Kartı: 30.000 ₺ limit/0 borç, Kredi: 60.000 ₺ anapara / 5.000 ₺ taksit, Maaş: 35.000 ₺). Test işlemlerini doğrudan arayüzden uygulayabilir ve tüm göstergelerin anlık değişimini takip edebilirsiniz.',
        timestamp: new Date().toISOString(),
      },
    ],
    version: 1,
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = getInitialDemoData();
      saveAppData(demo);
      return demo;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return getInitialDemoData();
    }
    // ensure arrays exist
    return {
      profile: parsed.profile || { name: 'Kullanıcı', hasCompletedOnboarding: true, currency: 'TRY', createdAt: new Date().toISOString() },
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      creditCards: Array.isArray(parsed.creditCards) ? parsed.creditCards : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      overdrafts: Array.isArray(parsed.overdrafts) ? parsed.overdrafts : [],
      otherDebts: Array.isArray(parsed.otherDebts) ? parsed.otherDebts : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      scheduledPayments: Array.isArray(parsed.scheduledPayments) ? parsed.scheduledPayments : [],
      coachMessages: Array.isArray(parsed.coachMessages) ? parsed.coachMessages : [],
      version: parsed.version || 1,
    };
  } catch (err) {
    console.error('Error loading CEBİ app data:', err);
    return getInitialDemoData();
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving CEBİ app data:', err);
  }
}

export function exportDataAsJSON(): string {
  const data = loadAppData();
  return JSON.stringify(data, null, 2);
}

export function importDataFromJSON(jsonString: string): AppData {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Geçersiz veri formatı');
  }
  const cleanData: AppData = {
    profile: parsed.profile || { name: 'Kullanıcı', hasCompletedOnboarding: true, currency: 'TRY', createdAt: new Date().toISOString() },
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    creditCards: Array.isArray(parsed.creditCards) ? parsed.creditCards : [],
    loans: Array.isArray(parsed.loans) ? parsed.loans : [],
    overdrafts: Array.isArray(parsed.overdrafts) ? parsed.overdrafts : [],
    otherDebts: Array.isArray(parsed.otherDebts) ? parsed.otherDebts : [],
    incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    scheduledPayments: Array.isArray(parsed.scheduledPayments) ? parsed.scheduledPayments : [],
    coachMessages: Array.isArray(parsed.coachMessages) ? parsed.coachMessages : [],
    version: 1,
  };
  saveAppData(cleanData);
  return cleanData;
}
