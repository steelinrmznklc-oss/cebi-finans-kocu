import {
  buildFinancialSnapshot,
  calculateMonthlyExpenses,
  calculateMonthlyDebtRepayments,
  processRecurringIncomeDeposits,
} from '../src/utils/financialCalculations';
import {
  AppData,
  BankAccount,
  CreditCard,
  Loan,
  Income,
  Expense,
  ScheduledPayment,
  UserProfile,
} from '../src/types/finance';

const mockProfile: UserProfile = {
  name: 'Test Kullanıcı',
  hasCompletedOnboarding: true,
  currency: 'TRY',
  createdAt: '2026-09-01T00:00:00Z',
};

function createAccount(id: string, name: string, balance: number): BankAccount {
  return {
    id,
    bankName: name,
    accountName: 'Vadesiz TL',
    accountType: 'vadesiz',
    balance,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  assertions: string[];
  outputData?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string, list: string[]) {
  if (condition) {
    list.push(`  [PASS] ${msg}`);
  } else {
    list.push(`  [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('===============================================================');
console.log('CEBİ - FINAL FINANCIAL LOGIC VALIDATION SUITE (TEST 1 - 7)');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: CURRENT CASH SAFETY vs PLANNED BUDGET
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-12T10:00:00Z'); // 19 days remaining
    const account = createAccount('acc-1', 'Ziraat Bankası', 7000);
    const card: CreditCard = {
      id: 'cc-1',
      bank: 'Garanti BBVA',
      cardName: 'Bonus',
      limit: 30000,
      currentDebt: 8000,
      statementDebt: 8000,
      minimumPayment: 3200,
      availableLimit: 22000,
      paymentDueDate: '2026-09-18', // 8,000 TL mandatory payment
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    const loan: Loan = {
      id: 'loan-1',
      bank: 'İş Bankası',
      loanName: 'İhtiyaç Kredisi',
      originalAmount: 60000,
      remainingPrincipal: 55000,
      monthlyInstallment: 5000,
      remainingInstallments: 11,
      nextPaymentDate: '2026-09-25', // 5,000 TL mandatory installment
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    const incomes: Income[] = [
      {
        id: 'inc-salary',
        name: 'Maaş',
        amount: 35000,
        frequency: 'monthly',
        dayOfMonth: 5,
        category: 'maas',
        isRecurring: true,
        targetAccountId: 'acc-1',
        processedMonths: ['2026-09'],
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'inc-adv',
        name: 'Avans',
        amount: 5000,
        frequency: 'monthly',
        dayOfMonth: 20,
        category: 'avans',
        isRecurring: true,
        targetAccountId: 'acc-1',
        processedMonths: [],
        createdAt: '2026-09-01T00:00:00Z',
      },
    ];

    const appData: AppData = {
      accounts: [account],
      creditCards: [card],
      loans: [loan],
      overdrafts: [],
      otherDebts: [],
      incomes,
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    const snapshot = buildFinancialSnapshot(appData, refDate);

    assert(snapshot.totalBalance === 7000, `Current cash = 7,000 TL (Found: ${snapshot.totalBalance})`, assertions);
    assert(snapshot.upcomingPaymentsTotal === 13000, `Upcoming mandatory payments = 13,000 TL (Found: ${snapshot.upcomingPaymentsTotal})`, assertions);
    assert(snapshot.currentCashSafety === -6000, `Current cash safety shortfall = -6,000 TL (Found: ${snapshot.currentCashSafety})`, assertions);
    assert(snapshot.hasCashShortfall === true, `hasCashShortfall is true`, assertions);
    assert(snapshot.cashShortfall === 6000, `cashShortfall is 6,000 TL`, assertions);
    assert(snapshot.dailySafeSpending === 0, `Daily Safe Spending (Current Cash) is 0 TL/day, NOT 1,421 TL (Found: ${snapshot.dailySafeSpending})`, assertions);
    assert(snapshot.plannedDailyBudget === 1421, `Planned Daily Budget is 1,421 TL/day (Found: ${snapshot.plannedDailyBudget})`, assertions);
    assert(snapshot.remainingBudget === 27000, `Planned Discretionary Budget is 27,000 TL (Found: ${snapshot.remainingBudget})`, assertions);

    results.push({
      testId: 'TEST 1',
      name: 'Current Cash Safety vs Planned Budget',
      passed: true,
      assertions,
      outputData: {
        totalBalance: snapshot.totalBalance,
        upcomingPayments: snapshot.upcomingPaymentsTotal,
        currentCashSafety: snapshot.currentCashSafety,
        dailySafeSpending: snapshot.dailySafeSpending,
        plannedDailyBudget: snapshot.plannedDailyBudget,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 1', name: 'Current Cash Safety vs Planned Budget', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 2: ZERO INCOME + CASH
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-12T10:00:00Z'); // 19 days remaining
    const account = createAccount('acc-1', 'Banka', 19000);
    const card: CreditCard = {
      id: 'cc-1',
      bank: 'Banka',
      cardName: 'Kart',
      limit: 50000,
      currentDebt: 15000,
      statementDebt: 15000,
      minimumPayment: 6000,
      availableLimit: 35000,
      paymentDueDate: '2026-09-20', // 15,000 TL mandatory payment
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const appData: AppData = {
      accounts: [account],
      creditCards: [card],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [], // Zero income
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    const snapshot = buildFinancialSnapshot(appData, refDate);

    assert(snapshot.totalBalance === 19000, `Current cash = 19,000 TL`, assertions);
    assert(snapshot.monthlyIncome === 0, `Expected future income = 0 TL`, assertions);
    assert(snapshot.upcomingPaymentsTotal === 15000, `Upcoming mandatory payments = 15,000 TL (Found: ${snapshot.upcomingPaymentsTotal})`, assertions);
    assert(snapshot.remainingDays === 19, `Remaining days = 19`, assertions);
    assert(snapshot.currentCashSafety === 4000, `Discretionary cash = 19,000 - 15,000 = 4,000 TL (Found: ${snapshot.currentCashSafety})`, assertions);
    assert(snapshot.dailySafeSpending === 210, `Daily safe spending is 210 TL/day (4,000 / 19 = 210.5 -> 210), NOT 1,000 TL (Found: ${snapshot.dailySafeSpending})`, assertions);
    assert(snapshot.dailySafeSpending !== 1000, `Must NOT return 1,000 TL/day`, assertions);

    results.push({
      testId: 'TEST 2',
      name: 'Zero Income + Cash Discretionary Calculation',
      passed: true,
      assertions,
      outputData: {
        totalBalance: snapshot.totalBalance,
        upcoming: snapshot.upcomingPaymentsTotal,
        safeCash: snapshot.currentCashSafety,
        dailySafeSpending: snapshot.dailySafeSpending,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 2', name: 'Zero Income + Cash Discretionary Calculation', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 3: CURRENT CASH ABOVE OBLIGATIONS
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-11T10:00:00Z'); // 20 days remaining in 30-day Sept
    const account = createAccount('acc-1', 'Banka', 30000);
    const card: CreditCard = {
      id: 'cc-1',
      bank: 'Banka',
      cardName: 'Kart',
      limit: 50000,
      currentDebt: 10000,
      statementDebt: 10000,
      minimumPayment: 4000,
      availableLimit: 40000,
      paymentDueDate: '2026-09-22', // 10,000 TL mandatory payment
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const appData: AppData = {
      accounts: [account],
      creditCards: [card],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [],
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    const snapshot = buildFinancialSnapshot(appData, refDate);

    assert(snapshot.totalBalance === 30000, `Current cash = 30,000 TL`, assertions);
    assert(snapshot.upcomingPaymentsTotal === 10000, `Upcoming payments = 10,000 TL (Found: ${snapshot.upcomingPaymentsTotal})`, assertions);
    assert(snapshot.remainingDays === 20, `Remaining days = 20`, assertions);
    assert(snapshot.currentCashSafety === 20000, `Discretionary cash = 30,000 - 10,000 = 20,000 TL`, assertions);
    assert(snapshot.dailySafeSpending === 1000, `Daily safe spending is exactly 1,000 TL/day (20,000 / 20 = 1,000) (Found: ${snapshot.dailySafeSpending})`, assertions);

    results.push({
      testId: 'TEST 3',
      name: 'Current Cash Above Obligations',
      passed: true,
      assertions,
      outputData: {
        totalBalance: snapshot.totalBalance,
        upcoming: snapshot.upcomingPaymentsTotal,
        currentCashSafety: snapshot.currentCashSafety,
        dailySafeSpending: snapshot.dailySafeSpending,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 3', name: 'Current Cash Above Obligations', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 4: EXPECTED INCOME BEFORE PAYMENT DATE
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-12T10:00:00Z'); // Today = 12th
    const account = createAccount('acc-1', 'Banka', 5000);
    const card: CreditCard = {
      id: 'cc-1',
      bank: 'Banka',
      cardName: 'Kart',
      limit: 30000,
      currentDebt: 8000,
      statementDebt: 8000,
      minimumPayment: 3200,
      availableLimit: 22000,
      paymentDueDate: '2026-09-18', // Due 18th, before salary
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    const income: Income = {
      id: 'inc-1',
      name: 'Maaş',
      amount: 35000,
      frequency: 'monthly',
      dayOfMonth: 20, // Payment date = 20th
      category: 'maas',
      isRecurring: true,
      targetAccountId: 'acc-1',
      processedMonths: [], // Not yet received
      createdAt: '2026-09-01T00:00:00Z',
    };

    const appData: AppData = {
      accounts: [account],
      creditCards: [card],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [income],
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    const snapshot = buildFinancialSnapshot(appData, refDate);

    assert(snapshot.totalBalance === 5000, `Current available cash = 5,000 TL`, assertions);
    assert(snapshot.monthlyIncome === 35000, `Expected future salary = 35,000 TL`, assertions);
    assert(snapshot.realizedMonthlyIncome === 0, `Realized income = 0 TL (salary not received yet)`, assertions);
    assert(snapshot.pendingMonthlyIncome === 35000, `Pending expected income = 35,000 TL`, assertions);
    assert(snapshot.upcomingPaymentsTotal === 8000, `Mandatory payment due before salary = 8,000 TL (Found: ${snapshot.upcomingPaymentsTotal})`, assertions);
    assert(snapshot.currentCashSafety === -3000, `Cash shortfall before salary = -3,000 TL (5,000 - 8,000)`, assertions);
    assert(snapshot.hasCashShortfall === true, `hasCashShortfall = true`, assertions);
    assert(snapshot.cashShortfall === 3000, `cashShortfall = 3,000 TL`, assertions);
    assert(snapshot.dailySafeSpending === 0, `Daily Safe Spending is 0 TL/day (cannot spend future salary)`, assertions);
    assert(snapshot.plannedDailyBudget === 1421, `Planned Daily Budget is 1,421 TL/day (35,000 - 8,000 / 19)`, assertions);

    results.push({
      testId: 'TEST 4',
      name: 'Expected Income Before Payment Date',
      passed: true,
      assertions,
      outputData: {
        currentCash: snapshot.totalBalance,
        expectedSalary: snapshot.monthlyIncome,
        cashShortfall: snapshot.cashShortfall,
        dailySafeSpending: snapshot.dailySafeSpending,
        plannedDailyBudget: snapshot.plannedDailyBudget,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 4', name: 'Expected Income Before Payment Date', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 5: EXPECTED INCOME AFTER PAYMENT DATE (IDEMPOTENCY & NO DOUBLE COUNTING)
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const today = new Date('2026-09-12T10:00:00Z'); // 12th
    const initialCash = 5000;
    const initialAccount = createAccount('acc-1', 'Banka', initialCash);

    const salaryIncome: Income = {
      id: 'inc-salary',
      name: 'Maaş',
      amount: 35000,
      frequency: 'monthly',
      dayOfMonth: 5, // Payment day was Sept 5th
      category: 'maas',
      isRecurring: true,
      targetAccountId: 'acc-1',
      processedMonths: [], // Not yet run
      createdAt: '2026-09-01T00:00:00Z',
    };

    const initialAppData: AppData = {
      accounts: [initialAccount],
      creditCards: [],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [salaryIncome],
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    // First deposit run:
    const step1Data = processRecurringIncomeDeposits(initialAppData, today);
    assert(step1Data.accounts[0].balance === 40000, `Salary processed: bank balance is 40,000 TL (5,000 + 35,000) (Found: ${step1Data.accounts[0].balance})`, assertions);
    assert(step1Data.incomes[0].processedMonths?.includes('2026-09') === true, `processedMonths contains '2026-09'`, assertions);

    // Second deposit run (refresh / subsequent check on same day or later):
    const step2Data = processRecurringIncomeDeposits(step1Data, today);
    assert(step2Data.accounts[0].balance === 40000, `Second check does NOT double deposit: bank balance remains 40,000 TL`, assertions);

    // Build snapshot on step2Data:
    const snapshot = buildFinancialSnapshot(step2Data, today);
    assert(snapshot.totalBalance === 40000, `Snapshot bank balance = 40,000 TL`, assertions);
    assert(snapshot.realizedMonthlyIncome === 35000, `Realized monthly income = 35,000 TL`, assertions);
    assert(snapshot.pendingMonthlyIncome === 0, `Pending income = 0 TL`, assertions);

    results.push({
      testId: 'TEST 5',
      name: 'Expected Income After Payment Date (No Double Count)',
      passed: true,
      assertions,
      outputData: {
        initialCash,
        finalCash: step2Data.accounts[0].balance,
        realizedIncome: snapshot.realizedMonthlyIncome,
        pendingIncome: snapshot.pendingMonthlyIncome,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 5', name: 'Expected Income After Payment Date (No Double Count)', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 6: UPCOMING PAYMENT ALREADY PAID
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-12T10:00:00Z');
    const initialCash = 20000;
    const initialAccount = createAccount('acc-1', 'Banka', initialCash);

    const rentPayment: ScheduledPayment = {
      id: 'pay-rent',
      name: 'Kira Ödemesi',
      amount: 5000,
      dueDate: '2026-09-15',
      category: 'rent',
      type: 'rent',
      isRecurring: true,
      isPaid: false,
      createdAt: '2026-09-01T00:00:00Z',
    };

    // Phase A: Before payment
    const appDataBefore: AppData = {
      accounts: [initialAccount],
      creditCards: [],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [],
      expenses: [],
      scheduledPayments: [rentPayment],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };
    const snapshotBefore = buildFinancialSnapshot(appDataBefore, refDate);
    assert(snapshotBefore.totalBalance === 20000, `Before pay: bank balance = 20,000 TL`, assertions);
    assert(snapshotBefore.upcomingPaymentsTotal === 5000, `Before pay: upcoming payments = 5,000 TL`, assertions);
    assert(snapshotBefore.currentCashSafety === 15000, `Before pay: current cash safety = 15,000 TL (20,000 - 5,000)`, assertions);
    assert(snapshotBefore.dailySafeSpending === Math.floor(15000 / 19), `Before pay: daily safe spending = 789 TL/day`, assertions);

    // Phase B: Mark as paid (bank balance decreases by 5,000 TL, payment is marked isPaid = true)
    const updatedAccount = { ...initialAccount, balance: initialAccount.balance - 5000 };
    const paidRentPayment: ScheduledPayment = { ...rentPayment, isPaid: true };

    const appDataAfter: AppData = {
      accounts: [updatedAccount],
      creditCards: [],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [],
      expenses: [],
      scheduledPayments: [paidRentPayment],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };
    const snapshotAfter = buildFinancialSnapshot(appDataAfter, refDate);

    assert(snapshotAfter.totalBalance === 15000, `After pay: bank balance = 15,000 TL`, assertions);
    assert(snapshotAfter.upcomingPaymentsTotal === 0, `After pay: upcoming payments = 0 TL (no longer reserved)`, assertions);
    assert(snapshotAfter.currentCashSafety === 15000, `After pay: current cash safety = 15,000 TL`, assertions);
    assert(snapshotAfter.dailySafeSpending === Math.floor(15000 / 19), `After pay: daily safe spending = 789 TL/day`, assertions);
    assert(snapshotAfter.currentCashSafety !== 10000, `Not double deducted (would be 10,000 if double deducted)`, assertions);

    results.push({
      testId: 'TEST 6',
      name: 'Upcoming Payment Already Paid (No Double Deduction)',
      passed: true,
      assertions,
      outputData: {
        beforeUpcoming: snapshotBefore.upcomingPaymentsTotal,
        afterUpcoming: snapshotAfter.upcomingPaymentsTotal,
        beforeCashSafety: snapshotBefore.currentCashSafety,
        afterCashSafety: snapshotAfter.currentCashSafety,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 6', name: 'Upcoming Payment Already Paid (No Double Deduction)', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// TEST 7: CREDIT CARD PURCHASE VS PAYMENT
// -----------------------------------------------------------------------------
{
  const assertions: string[] = [];
  try {
    const refDate = new Date('2026-09-12T10:00:00Z');
    const account = createAccount('acc-1', 'Banka', 20000);
    const card: CreditCard = {
      id: 'cc-1',
      bank: 'Garanti BBVA',
      cardName: 'Bonus',
      limit: 30000,
      currentDebt: 5000, // after purchase
      statementDebt: 5000,
      minimumPayment: 2000,
      availableLimit: 25000,
      paymentDueDate: '2026-09-20',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    // 1. Credit card purchase: 5,000 TL
    const ccPurchase: Expense = {
      id: 'exp-purchase',
      amount: 5000,
      category: 'market',
      note: 'Elektronik Alışverişi',
      date: '2026-09-05',
      paymentSourceType: 'credit_card',
      paymentSourceId: 'cc-1',
      isDebtPayment: false,
      createdAt: '2026-09-05T10:00:00Z',
    };

    // 2. Credit card debt repayment from bank: 5,000 TL
    const ccDebtPayment: Expense = {
      id: 'exp-payment',
      amount: 5000,
      category: 'diger',
      note: 'Kredi Kartı Borç Kapatma',
      date: '2026-09-10',
      paymentSourceType: 'bank_account',
      paymentSourceId: 'acc-1',
      isDebtPayment: true,
      relatedDebtType: 'card',
      relatedDebtId: 'cc-1',
      createdAt: '2026-09-10T10:00:00Z',
    };

    const expenses = [ccPurchase, ccDebtPayment];
    const monthlyExpenses = calculateMonthlyExpenses(expenses, refDate);
    const totalDebtRepayments = calculateMonthlyDebtRepayments(expenses, refDate);

    // Bank outflow check:
    const bankOutflows = expenses
      .filter((e) => e.paymentSourceType === 'bank_account')
      .reduce((sum, e) => sum + e.amount, 0);

    assert(monthlyExpenses === 5000, `Consumer spending = 5,000 TL (Found: ${monthlyExpenses})`, assertions);
    assert(totalDebtRepayments === 5000, `Debt repayment = 5,000 TL (Found: ${totalDebtRepayments})`, assertions);
    assert(bankOutflows === 5000, `Bank cash outflow from payment = 5,000 TL (Found: ${bankOutflows})`, assertions);
    assert(monthlyExpenses !== 10000, `Card payment does NOT create another 5,000 TL consumer expense (Total consumer expense is NOT 10,000 TL)`, assertions);

    results.push({
      testId: 'TEST 7',
      name: 'Credit Card Purchase vs Payment',
      passed: true,
      assertions,
      outputData: {
        consumerSpending: monthlyExpenses,
        debtRepayment: totalDebtRepayments,
        bankCashOutflow: bankOutflows,
      },
    });
  } catch (err: any) {
    results.push({ testId: 'TEST 7', name: 'Credit Card Purchase vs Payment', passed: false, assertions: [...assertions, `[ERR] ${err.message}`] });
  }
}

// -----------------------------------------------------------------------------
// PRINT AUDIT REPORT
// -----------------------------------------------------------------------------
console.log('---------------------------------------------------------------');
console.log('SONUÇ VE DETAYLAR (SUMMARY)');
console.log('---------------------------------------------------------------');
let passed = 0;
for (const r of results) {
  const status = r.passed ? 'PASSED' : 'FAILED';
  console.log(`\n[${status}] ${r.testId}: ${r.name}`);
  for (const a of r.assertions) {
    console.log(a);
  }
  if (r.outputData) {
    console.log(`  Veri:`, JSON.stringify(r.outputData));
  }
  if (r.passed) passed++;
}

console.log('\n===============================================================');
console.log(`FINAL SKOR: ${passed} / ${results.length} TEST BAŞARIYLA TAMAMLANDI`);
console.log('===============================================================');

if (passed !== results.length) {
  process.exit(1);
}
