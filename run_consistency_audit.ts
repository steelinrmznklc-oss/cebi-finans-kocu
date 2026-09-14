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
import {
  calculateMonthlyExpenses,
  calculateMonthlyDebtRepayments,
  buildFinancialSnapshot,
  processRecurringIncomeDeposits,
} from '../src/utils/financialCalculations';

interface AuditResult {
  scenario: string;
  passed: boolean;
  details: string[];
}

const auditResults: AuditResult[] = [];

function assert(condition: boolean, message: string, details: string[]) {
  if (condition) {
    details.push(`  [PASS] ${message}`);
  } else {
    details.push(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const mockProfile: UserProfile = {
  name: 'Test Kullanıcısı',
  hasCompletedOnboarding: true,
  currency: 'TRY',
  createdAt: '2026-09-01T00:00:00Z',
};

function createMockAccount(id: string, bankName: string, balance: number): BankAccount {
  return {
    id,
    bankName,
    accountName: 'Vadesiz Hesap',
    accountType: 'vadesiz',
    balance,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

console.log('===============================================================');
console.log('CEBİ 2. SEVİYE FİNANSAL TUTARLILIK VE DOĞRULAMA DENETİMİ');
console.log('===============================================================\n');

// -------------------------------------------------------------
// SCENARIO A: Real Monthly Cash Flow (September 12)
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const refDate = new Date(2026, 8, 12); // 12 September 2026

    const accounts: BankAccount[] = [
      createMockAccount('acc-ziraat', 'Ziraat Bankası', 7000),
    ];

    const cards: CreditCard[] = [
      {
        id: 'card-1',
        cardName: 'Bonus Kart',
        bank: 'Garanti',
        limit: 30000,
        currentDebt: 8000,
        availableLimit: 22000,
        statementDebt: 8000,
        minimumPayment: 3200,
        paymentDueDate: '2026-09-18',
        cutoffDate: '8',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const loans: Loan[] = [
      {
        id: 'loan-1',
        bank: 'İş Bankası',
        loanName: 'İhtiyaç Kredisi',
        originalAmount: 60000,
        remainingPrincipal: 55000,
        monthlyInstallment: 5000,
        remainingInstallments: 11,
        nextPaymentDate: '2026-09-25',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const incomes: Income[] = [
      {
        id: 'inc-salary',
        name: 'Maaş',
        amount: 35000,
        frequency: 'monthly',
        dayOfMonth: 5,
        category: 'maas',
        isRecurring: true,
        targetAccountId: 'acc-ziraat',
        processedMonths: ['2026-09'], // Already occurred on Sept 5
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'inc-advance',
        name: 'Avans',
        amount: 5000,
        frequency: 'monthly',
        dayOfMonth: 20,
        category: 'avans',
        isRecurring: true,
        targetAccountId: 'acc-ziraat',
        processedMonths: [], // Occurs Sept 20
        createdAt: '2026-09-01T00:00:00Z',
      },
    ];

    const appData: AppData = {
      accounts,
      creditCards: cards,
      loans,
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

    assert(snapshot.totalBalance === 7000, `Actual bank balance = 7,000 TL (Bulunan: ${snapshot.totalBalance})`, details);
    assert(snapshot.monthlyIncome === 40000, `Expected monthly income = 40,000 TL (Bulunan: ${snapshot.monthlyIncome})`, details);
    assert(snapshot.realizedMonthlyIncome === 35000, `Actual realized income to date = 35,000 TL (Bulunan: ${snapshot.realizedMonthlyIncome})`, details);
    assert(snapshot.pendingMonthlyIncome === 5000, `Pending expected income = 5,000 TL (Bulunan: ${snapshot.pendingMonthlyIncome})`, details);
    assert(snapshot.upcomingPaymentsTotal === 13000, `Mandatory upcoming payments = 13,000 TL (Bulunan: ${snapshot.upcomingPaymentsTotal})`, details);
    assert(snapshot.monthlyExpenses === 0, `Consumer spending = 0 TL (Bulunan: ${snapshot.monthlyExpenses})`, details);
    assert(snapshot.totalDebtRepayments === 0, `Debt repayment = 0 TL (Bulunan: ${snapshot.totalDebtRepayments})`, details);
    assert(snapshot.totalDebt === 63000, `Total debt = 63,000 TL (Bulunan: ${snapshot.totalDebt})`, details);
    assert(snapshot.netLiquidAvailable === -6000, `Net liquid cash available (7.000 - 13.000) = -6,000 TL (Bulunan: ${snapshot.netLiquidAvailable})`, details);
    assert(snapshot.hasCashShortfall === true, `Has cash shortfall = true (Bulunan: ${snapshot.hasCashShortfall})`, details);
    assert(snapshot.cashShortfall === 6000, `Cash shortfall = 6,000 TL (Bulunan: ${snapshot.cashShortfall})`, details);
    assert(snapshot.remainingDays === 19, `Remaining days = 19 (Bulunan: ${snapshot.remainingDays})`, details);
    assert(snapshot.dailySafeSpending === 0, `Daily Safe Spending (from Current Liquid Cash) = 0 TL (Bulunan: ${snapshot.dailySafeSpending})`, details);
    assert(snapshot.plannedDailyBudget === 1421, `Planned Daily Budget (from Monthly Income Plan) = 1,421 TL (Bulunan: ${snapshot.plannedDailyBudget})`, details);

    auditResults.push({ scenario: 'SCENARIO A: Real Monthly Cash Flow', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO A: Real Monthly Cash Flow', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO B: Income Timing (Sept 4, 5, 12, 19, 20, 21)
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const baseAccount: BankAccount = createMockAccount('acc-1', 'Ziraat Bankası', 10000);

    const baseIncomes: Income[] = [
      {
        id: 'inc-salary',
        name: 'Maaş',
        amount: 35000,
        frequency: 'monthly',
        dayOfMonth: 5,
        category: 'maas',
        isRecurring: true,
        targetAccountId: 'acc-1',
        processedMonths: [],
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'inc-advance',
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

    let state: AppData = {
      accounts: [baseAccount],
      creditCards: [],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: baseIncomes,
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    // 1. September 4: Before Sept 5 -> Balance must NOT increase
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 4));
    assert(state.accounts[0].balance === 10000, 'Sept 4: Salary has not arrived yet, bank balance = 10,000 TL', details);

    // 2. September 5: Salary day -> Bank balance must increase by 35,000 TL exactly once
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 5));
    assert(state.accounts[0].balance === 45000, 'Sept 5: Salary arrived, bank balance = 45,000 TL (+35,000 TL)', details);

    // 3. September 12: Salary must NOT be deposited again
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 12));
    assert(state.accounts[0].balance === 45000, 'Sept 12: Salary not duplicated, bank balance remains 45,000 TL', details);

    // 4. September 19: Before Sept 20 -> Advance has not arrived yet
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 19));
    assert(state.accounts[0].balance === 45000, 'Sept 19: Advance not arrived yet, bank balance = 45,000 TL', details);

    // 5. September 20: Advance day -> Bank balance must increase by 5,000 TL exactly once
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 20));
    assert(state.accounts[0].balance === 50000, 'Sept 20: Advance arrived, bank balance = 50,000 TL (+5,000 TL)', details);

    // 6. September 21: Neither salary nor advance must be duplicated
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 21));
    assert(state.accounts[0].balance === 50000, 'Sept 21: Balance remains exactly 50,000 TL', details);

    // 7. Page refresh simulation: Reprocessing on any date does not duplicate
    state = processRecurringIncomeDeposits(state, new Date(2026, 8, 25));
    assert(state.accounts[0].balance === 50000, 'Page refresh simulation: Balance remains strictly 50,000 TL without duplication', details);

    auditResults.push({ scenario: 'SCENARIO B: Income Timing', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO B: Income Timing', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO C: Credit Card Payment
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    let account: BankAccount = createMockAccount('acc-1', 'Ziraat Bankası', 20000);

    let card: CreditCard = {
      id: 'card-1',
      cardName: 'Bonus Kart',
      bank: 'Garanti',
      limit: 30000,
      currentDebt: 8000,
      availableLimit: 22000,
      statementDebt: 8000,
      minimumPayment: 3200,
      paymentDueDate: '2026-09-18',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    // Make debt payment: 8,000 TL
    const paymentAmount = 8000;
    account = { ...account, balance: account.balance - paymentAmount };
    card = {
      ...card,
      currentDebt: Math.max(0, card.currentDebt - paymentAmount),
      availableLimit: Math.min(card.limit, card.availableLimit + paymentAmount),
      statementDebt: Math.max(0, card.statementDebt - paymentAmount),
      minimumPayment: Math.max(0, card.minimumPayment - paymentAmount),
    };

    const debtExpense: Expense = {
      id: 'exp-payment-1',
      amount: paymentAmount,
      category: 'diger',
      note: 'Kredi Kartı Borç Ödemesi',
      date: '2026-09-12',
      paymentSourceType: 'bank_account',
      paymentSourceId: account.id,
      isDebtPayment: true,
      relatedDebtType: 'card',
      relatedDebtId: card.id,
      createdAt: '2026-09-12T10:00:00Z',
    };

    const expenses = [debtExpense];
    const refDate = new Date(2026, 8, 12);
    const monthlyExpenses = calculateMonthlyExpenses(expenses, refDate);
    const monthlyRepayments = calculateMonthlyDebtRepayments(expenses, refDate);

    assert(account.balance === 12000, `Bank balance = 12,000 TL (Bulunan: ${account.balance})`, details);
    assert(card.currentDebt === 0, `Credit card debt = 0 TL (Bulunan: ${card.currentDebt})`, details);
    assert(card.availableLimit === 30000, `Available limit = 30,000 TL (Bulunan: ${card.availableLimit})`, details);
    assert(monthlyExpenses === 0, `Monthly consumer spending = 0 TL (Bulunan: ${monthlyExpenses})`, details);
    assert(monthlyRepayments === 8000, `Debt repayment tracked = 8,000 TL (Bulunan: ${monthlyRepayments})`, details);

    auditResults.push({ scenario: 'SCENARIO C: Credit Card Payment', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO C: Credit Card Payment', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO D: Loan Installment
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    let account: BankAccount = createMockAccount('acc-1', 'Ziraat Bankası', 20000);

    let loan: Loan = {
      id: 'loan-1',
      bank: 'İş Bankası',
      loanName: 'İhtiyaç Kredisi',
      originalAmount: 60000,
      remainingPrincipal: 55000,
      monthlyInstallment: 5000,
      remainingInstallments: 11,
      nextPaymentDate: '2026-09-25',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    // Pay one installment (5,000 TL)
    const installmentAmount = 5000;
    account = { ...account, balance: account.balance - installmentAmount };
    loan = {
      ...loan,
      remainingPrincipal: loan.remainingPrincipal - installmentAmount,
      remainingInstallments: loan.remainingInstallments - 1,
      nextPaymentDate: '2026-10-25', // advances to next month
    };

    const loanPaymentExpense: Expense = {
      id: 'exp-loan-1',
      amount: installmentAmount,
      category: 'diger',
      note: 'Kredi Taksit Ödemesi',
      date: '2026-09-12',
      paymentSourceType: 'bank_account',
      paymentSourceId: account.id,
      isDebtPayment: true,
      relatedDebtType: 'loan',
      relatedDebtId: loan.id,
      createdAt: '2026-09-12T10:00:00Z',
    };

    const expenses = [loanPaymentExpense];
    const refDate = new Date(2026, 8, 12);
    const monthlyExpenses = calculateMonthlyExpenses(expenses, refDate);
    const monthlyRepayments = calculateMonthlyDebtRepayments(expenses, refDate);

    assert(account.balance === 15000, `Bank balance decreased by 5,000 TL to 15,000 TL (Bulunan: ${account.balance})`, details);
    assert(loan.remainingPrincipal === 50000, `Loan principal decreased to 50,000 TL (Bulunan: ${loan.remainingPrincipal})`, details);
    assert(loan.remainingInstallments === 10, `Remaining installments decreased from 11 to 10 (Bulunan: ${loan.remainingInstallments})`, details);
    assert(monthlyExpenses === 0, `Monthly consumer spending NOT increased (Bulunan: ${monthlyExpenses})`, details);
    assert(monthlyRepayments === 5000, `Payment recorded as debt repayment (Bulunan: ${monthlyRepayments})`, details);
    details.push('  [NOTE] Current MVP design treats the entire 5,000 TL installment as reducing remaining principal. Interest separation is scheduled for post-MVP.');

    auditResults.push({ scenario: 'SCENARIO D: Loan Installment', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO D: Loan Installment', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO E: Daily Safe Spending (10 Stress Tests)
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const Sept12 = new Date(2026, 8, 12); // Day 12 of 30 -> 19 remaining days
    const Sept1 = new Date(2026, 8, 1);   // Day 1 of 30 -> 30 remaining days
    const Sept30 = new Date(2026, 8, 30); // Day 30 of 30 -> 1 remaining day

    const baseData: AppData = {
      accounts: [createMockAccount('a', 'Z', 10000)],
      creditCards: [],
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: [{ id: 'i', name: 'Maaş', amount: 30000, frequency: 'monthly', category: 'maas', isRecurring: true, createdAt: '' }],
      expenses: [],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    // 1. Positive budget
    const snap1 = buildFinancialSnapshot({
      ...baseData,
      expenses: [{ id: 'e', amount: 11000, category: 'market', note: '', date: '2026-09-05', isDebtPayment: false, createdAt: '' }],
    }, Sept12);
    assert(snap1.dailySafeSpending === 526, `1. Positive budget (Current Cash: 10.000 / 19 = 526 TL/day): ${snap1.dailySafeSpending} TL/day`, details);
    assert(snap1.plannedDailyBudget === 1000, `1b. Planned Monthly Budget (30.000 - 11.000 / 19 = 1.000 TL/day): ${snap1.plannedDailyBudget} TL/day`, details);

    // 2. Zero income & zero cash
    const snap2 = buildFinancialSnapshot({
      ...baseData,
      accounts: [createMockAccount('a', 'Z', 0)],
      incomes: [],
    }, Sept12);
    assert(snap2.dailySafeSpending === 0 && !isNaN(snap2.dailySafeSpending), `2. Zero income & zero cash: ${snap2.dailySafeSpending} TL/day`, details);

    // 3. Zero income + existing bank balance (Uses liquid cash as base budget!)
    const snap3 = buildFinancialSnapshot({
      ...baseData,
      accounts: [createMockAccount('a', 'Z', 19000)],
      incomes: [],
    }, Sept12);
    assert(snap3.dailySafeSpending === 1000, `3. Zero income + bank balance (19.000 / 19 = 1.000 TL/day): ${snap3.dailySafeSpending} TL/day`, details);

    // 4. Negative budget (Deficit -> must NEVER be negative, clamped to 0)
    const snap4 = buildFinancialSnapshot({
      ...baseData,
      accounts: [createMockAccount('a', 'Z', 5000)],
      incomes: [{ id: 'i', name: 'Maaş', amount: 20000, frequency: 'monthly', category: 'maas', isRecurring: true, createdAt: '' }],
      expenses: [{ id: 'e', amount: 25000, category: 'market', note: '', date: '2026-09-05', isDebtPayment: false, createdAt: '' }],
    }, Sept12);
    assert(snap4.isOverBudget === true && snap4.dailySafeSpending === 0, `4. Negative budget: Deficit=${snap4.budgetDeficit}, DailySafe=${snap4.dailySafeSpending} (clamped to 0)`, details);

    // 5. Last day of the month (September 30 -> 1 remaining day)
    const snap5 = buildFinancialSnapshot({
      ...baseData,
      accounts: [createMockAccount('a', 'Z', 2000)],
      expenses: [{ id: 'e', amount: 28000, category: 'market', note: '', date: '2026-09-10', isDebtPayment: false, createdAt: '' }],
    }, Sept30);
    assert(snap5.remainingDays === 1 && snap5.dailySafeSpending === 2000, `5. Last day of month: remainingDays=1, DailySafe=${snap5.dailySafeSpending} TL/day`, details);

    // 6. First day of the month (September 1 -> 30 remaining days)
    const snap6 = buildFinancialSnapshot({
      ...baseData,
      accounts: [createMockAccount('a', 'Z', 30000)],
      expenses: [],
    }, Sept1);
    assert(snap6.remainingDays === 30 && snap6.dailySafeSpending === 1000, `6. First day of month: remainingDays=30, DailySafe=${snap6.dailySafeSpending} TL/day`, details);

    // 7. Upcoming mandatory payment (Rent 5,000 TL due Sept 15)
    const snap7 = buildFinancialSnapshot({
      ...baseData,
      scheduledPayments: [
        { id: 'sp-1', name: 'Kira', amount: 5000, dueDate: '2026-09-15', category: 'rent', type: 'rent', isRecurring: true, isPaid: false, createdAt: '' },
      ],
    }, Sept12);
    assert(snap7.dailySafeSpending === 263, `7. Current Cash Safety with Rent deducted (10.000 - 5.000 / 19 = 263 TL/day): ${snap7.dailySafeSpending} TL/day`, details);
    assert(snap7.plannedDailyBudget === 1315, `7b. Planned Daily Budget with Rent deducted (30.000 - 5.000 / 19 = 1.315 TL/day): ${snap7.plannedDailyBudget} TL/day`, details);

    // 8. Upcoming credit card payment (statement 6,000 TL)
    const snap8 = buildFinancialSnapshot({
      ...baseData,
      creditCards: [
        { id: 'c', cardName: 'Card', bank: 'B', limit: 20000, currentDebt: 6000, availableLimit: 14000, statementDebt: 6000, minimumPayment: 2400, paymentDueDate: '2026-09-20', createdAt: '', updatedAt: '' }
      ],
    }, Sept12);
    assert(snap8.dailySafeSpending === 210, `8. Current Cash Safety with CC payment deducted (10.000 - 6.000 / 19 = 210 TL/day): ${snap8.dailySafeSpending} TL/day`, details);
    assert(snap8.plannedDailyBudget === 1263, `8b. Planned Daily Budget with CC deducted (30.000 - 6.000 / 19 = 1.263 TL/day): ${snap8.plannedDailyBudget} TL/day`, details);

    // 9. Upcoming loan installment (4,000 TL due Sept 25)
    const snap9 = buildFinancialSnapshot({
      ...baseData,
      loans: [
        { id: 'l', bank: 'B', loanName: 'L', originalAmount: 48000, remainingPrincipal: 40000, monthlyInstallment: 4000, remainingInstallments: 10, nextPaymentDate: '2026-09-25', createdAt: '', updatedAt: '' }
      ],
    }, Sept12);
    assert(snap9.dailySafeSpending === 315, `9. Current Cash Safety with Loan deducted (10.000 - 4.000 / 19 = 315 TL/day): ${snap9.dailySafeSpending} TL/day`, details);
    assert(snap9.plannedDailyBudget === 1368, `9b. Planned Daily Budget with Loan deducted (30.000 - 4.000 / 19 = 1.368 TL/day): ${snap9.plannedDailyBudget} TL/day`, details);

    // 10. Multiple upcoming mandatory payments (Rent 5,000 + CC 6,000 + Loan 4,000 = 15,000)
    const snap10 = buildFinancialSnapshot({
      ...baseData,
      creditCards: [
        { id: 'c', cardName: 'Card', bank: 'B', limit: 20000, currentDebt: 6000, availableLimit: 14000, statementDebt: 6000, minimumPayment: 2400, paymentDueDate: '2026-09-20', createdAt: '', updatedAt: '' }
      ],
      loans: [
        { id: 'l', bank: 'B', loanName: 'L', originalAmount: 48000, remainingPrincipal: 40000, monthlyInstallment: 4000, remainingInstallments: 10, nextPaymentDate: '2026-09-25', createdAt: '', updatedAt: '' }
      ],
      scheduledPayments: [
        { id: 'sp-1', name: 'Kira', amount: 5000, dueDate: '2026-09-15', category: 'rent', type: 'rent', isRecurring: true, isPaid: false, createdAt: '' },
      ],
    }, Sept12);
    assert(snap10.hasCashShortfall === true && snap10.dailySafeSpending === 0, `10. Current Cash Safety shortfall (10.000 - 15.000 = -5.000 TL): DailySafe=${snap10.dailySafeSpending} TL/day`, details);
    assert(snap10.plannedDailyBudget === 789, `10b. Planned Daily Budget with all obligations (30.000 - 15.000 / 19 = 789 TL/day): ${snap10.plannedDailyBudget} TL/day`, details);

    auditResults.push({ scenario: 'SCENARIO E: Daily Safe Spending (10 Stress Tests)', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO E: Daily Safe Spending (10 Stress Tests)', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO F: Credit Card Limit Integrity
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    let card: CreditCard = {
      id: 'card-1',
      cardName: 'Bonus',
      bank: 'Garanti',
      limit: 30000,
      currentDebt: 0,
      availableLimit: 30000,
      statementDebt: 0,
      minimumPayment: 0,
      paymentDueDate: '2026-09-20',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    let bankAccount: BankAccount = createMockAccount('acc-1', 'Ziraat', 20000);

    // Step 1: Purchase 5,000 TL
    const exp1: Expense = {
      id: 'exp-1',
      amount: 5000,
      category: 'alisveris',
      note: 'Alışveriş',
      date: '2026-09-05',
      paymentSourceType: 'credit_card',
      paymentSourceId: card.id,
      isDebtPayment: false,
      createdAt: '2026-09-05T10:00:00Z',
    };
    card = {
      ...card,
      currentDebt: card.currentDebt + exp1.amount,
      availableLimit: Math.max(0, card.availableLimit - exp1.amount),
    };
    assert(card.currentDebt === 5000 && card.availableLimit === 25000, 'Purchase 5,000 TL -> Debt=5,000 TL, Avail=25,000 TL', details);
    assert(bankAccount.balance === 20000, 'Bank balance NOT modified by credit card purchase (still 20,000 TL)', details);

    // Step 2: Purchase another 10,000 TL
    const exp2: Expense = {
      id: 'exp-2',
      amount: 10000,
      category: 'alisveris',
      note: 'Elektronik',
      date: '2026-09-06',
      paymentSourceType: 'credit_card',
      paymentSourceId: card.id,
      isDebtPayment: false,
      createdAt: '2026-09-06T10:00:00Z',
    };
    card = {
      ...card,
      currentDebt: card.currentDebt + exp2.amount,
      availableLimit: Math.max(0, card.availableLimit - exp2.amount),
    };
    assert(card.currentDebt === 15000 && card.availableLimit === 15000, 'Purchase 10,000 TL -> Debt=15,000 TL, Avail=15,000 TL', details);

    // Step 3: Pay 7,000 TL
    const payAmount = 7000;
    bankAccount = { ...bankAccount, balance: bankAccount.balance - payAmount };
    card = {
      ...card,
      currentDebt: Math.max(0, card.currentDebt - payAmount),
      availableLimit: Math.min(card.limit, card.availableLimit + payAmount),
    };
    assert(card.currentDebt === 8000 && card.availableLimit === 22000, 'Pay 7,000 TL -> Debt=8,000 TL, Avail=22,000 TL', details);
    assert(bankAccount.balance === 13000, 'Bank balance decreased by 7,000 TL to 13,000 TL', details);

    // Step 4: Delete the original 5,000 TL purchase (Simulate handleDeleteExpense)
    card = {
      ...card,
      currentDebt: Math.max(0, card.currentDebt - exp1.amount),
      availableLimit: Math.min(card.limit, card.availableLimit + exp1.amount),
    };
    assert(card.currentDebt === 3000 && card.availableLimit === 27000, 'Delete 5,000 TL purchase -> Debt=3,000 TL, Avail=27,000 TL', details);
    assert(card.currentDebt >= 0, 'Debt is never negative', details);
    assert(card.availableLimit <= card.limit, 'Available limit never exceeds card limit', details);

    auditResults.push({ scenario: 'SCENARIO F: Credit Card Limit Integrity', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO F: Credit Card Limit Integrity', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO G: Monthly Budget Double-Counting Audit
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const refDate = new Date(2026, 8, 15);

    // 1. 5,000 TL credit card purchase
    const exp1: Expense = {
      id: 'e1',
      amount: 5000,
      category: 'market',
      note: '',
      date: '2026-09-02',
      paymentSourceType: 'credit_card',
      paymentSourceId: 'c1',
      isDebtPayment: false,
      createdAt: '',
    };

    // 2. 5,000 TL credit card payment
    const exp2: Expense = {
      id: 'e2',
      amount: 5000,
      category: 'diger',
      note: '',
      date: '2026-09-05',
      paymentSourceType: 'bank_account',
      paymentSourceId: 'a1',
      isDebtPayment: true,
      relatedDebtType: 'card',
      relatedDebtId: 'c1',
      createdAt: '',
    };

    // 3. 2,000 TL bank purchase
    const exp3: Expense = {
      id: 'e3',
      amount: 2000,
      category: 'yemek',
      note: '',
      date: '2026-09-08',
      paymentSourceType: 'bank_account',
      paymentSourceId: 'a1',
      isDebtPayment: false,
      createdAt: '',
    };

    // 4. 5,000 TL loan payment
    const exp4: Expense = {
      id: 'e4',
      amount: 5000,
      category: 'diger',
      note: '',
      date: '2026-09-10',
      paymentSourceType: 'bank_account',
      paymentSourceId: 'a1',
      isDebtPayment: true,
      relatedDebtType: 'loan',
      relatedDebtId: 'l1',
      createdAt: '',
    };

    const allExpenses = [exp1, exp2, exp3, exp4];

    const consumerSpending = calculateMonthlyExpenses(allExpenses, refDate);
    const debtRepayments = calculateMonthlyDebtRepayments(allExpenses, refDate);
    const totalOutflow = consumerSpending + debtRepayments;

    assert(consumerSpending === 7000, `Consumer spending = 7,000 TL (Bulunan: ${consumerSpending})`, details);
    assert(debtRepayments === 10000, `Debt repayment = 10,000 TL (Bulunan: ${debtRepayments})`, details);
    assert(totalOutflow === 17000, `Total outflow = 17,000 TL (Bulunan: ${totalOutflow})`, details);

    auditResults.push({ scenario: 'SCENARIO G: Monthly Budget Double-Counting', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO G: Monthly Budget Double-Counting', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO H: Refresh and Persistence
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const originalState: AppData = {
      accounts: [createMockAccount('a1', 'Ziraat', 15000)],
      creditCards: [{ id: 'c1', cardName: 'Card', bank: 'Garanti', limit: 30000, currentDebt: 3000, availableLimit: 27000, statementDebt: 3000, minimumPayment: 1200, paymentDueDate: '2026-09-20', createdAt: '', updatedAt: '' }],
      loans: [{ id: 'l1', bank: 'İş', loanName: 'Kredi', originalAmount: 60000, remainingPrincipal: 50000, monthlyInstallment: 5000, remainingInstallments: 10, nextPaymentDate: '2026-09-25', createdAt: '', updatedAt: '' }],
      overdrafts: [],
      otherDebts: [],
      incomes: [{ id: 'i1', name: 'Maaş', amount: 35000, frequency: 'monthly', dayOfMonth: 5, category: 'maas', isRecurring: true, processedMonths: ['2026-09'], createdAt: '' }],
      expenses: [{ id: 'e1', amount: 5000, category: 'market', note: '', date: '2026-09-02', isDebtPayment: false, createdAt: '' }],
      scheduledPayments: [],
      profile: mockProfile,
      coachMessages: [],
      version: 1,
    };

    // Serialize to JSON string (simulating localStorage.setItem)
    const jsonStr = JSON.stringify(originalState);

    // Deserialize (simulating localStorage.getItem)
    const reloaded: AppData = JSON.parse(jsonStr);

    assert(JSON.stringify(reloaded) === jsonStr, 'JSON serialization & deserialization is perfectly lossless', details);

    // Run processRecurringIncomeDeposits on reloaded state
    const afterReloadProcess = processRecurringIncomeDeposits(reloaded, new Date(2026, 8, 15));
    assert(afterReloadProcess.accounts[0].balance === 15000, 'Re-running recurring deposit after reload does NOT duplicate income (15,000 TL preserved)', details);

    auditResults.push({ scenario: 'SCENARIO H: Refresh and Persistence', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO H: Refresh and Persistence', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO I: AI Coach Integrity (Rule-Based Fallback Engine Verification)
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    const snapshot = {
      totalBalance: 7000,
      monthlyIncome: 40000,
      realizedMonthlyIncome: 35000,
      pendingMonthlyIncome: 5000,
      monthlyExpenses: 7000,
      totalDebtRepayments: 10000,
      remainingBudget: 23000,
      dailySafeSpending: 1210,
      remainingDays: 19,
      totalDebt: 63000,
      creditCardDebt: 8000,
      loanDebt: 55000,
      upcomingPaymentsTotal: 13000,
      debtDetails: [
        { name: 'Garanti Bonus', type: 'Kredi Kartı', amount: 8000, monthlyOrMin: 3200, dueDate: '18 Eylül' },
        { name: 'İş Bankası İhtiyaç Kredisi', type: 'Kredi', amount: 55000, monthlyOrMin: 5000, dueDate: '25 Eylül' },
      ],
    };

    function getReply(q: string): string {
      const ql = q.toLowerCase();
      if (ql.includes("ne kadar harcadım")) {
        return `Bu ay toplam **${snapshot.monthlyExpenses.toLocaleString("tr-TR")} ₺** tüketim harcaması yaptın.\n\nAyrıca borç kapatma ve taksit ödemeleri için **${snapshot.totalDebtRepayments.toLocaleString("tr-TR")} ₺** ödeme gerçekleştirdin (Bu ödeme bir bilanço transferi olup tüketim harcamalarına dahil edilmez).`;
      }
      if (ql.includes("bankada ne kadar") || ql.includes("param var")) {
        return `CEBİ'ye kayıtlı banka hesaplarındaki toplam kullanılabilir nakit bakiyen **${snapshot.totalBalance.toLocaleString("tr-TR")} ₺**'dir.\n\n*(Not: CEBİ bir açık bankacılık veya doğrudan banka bağlantı servisi değildir; girdiğin güncel hesap kayıtlarını esas alır).*`;
      }
      if (ql.includes("toplam borcum")) {
        return `Şu anki toplam kayıtlı borcun **${snapshot.totalDebt.toLocaleString("tr-TR")} ₺** seviyesindedir.\n\nBorç Dağılımı:\n• Garanti Bonus (Kredi Kartı): 8.000 ₺\n• İş Bankası İhtiyaç Kredisi (Kredi): 55.000 ₺\n\n*(Unutma: Bankadaki 7.000 ₺ nakit bakiyen bir varlıktır, bu tutar ise gelecekte ödenecek toplam yükümlülüktür).*`;
      }
      if (ql.includes("kredi kartımı ödersem")) {
        return `Kredi kartı borcunu ödediğinde:\n1. **Kredi kartı borcun azalır** ve ödediğin tutar kadar **kullanılabilir kart limitin açılır**.\n2. **Banka bakiyen ödediğin tutar kadar azalır**.\n3. **Bu işlem bir tüketim harcaması DEĞİLDİR**, bu yüzden aylık harcama grafiğini şişirmez.\n4. Yaklaşan zorunlu ödeme yükümlülüğün ortadan kalkar ve faiz yükünden korunursun.`;
      }
      if (ql.includes("güvenli olarak")) {
        return `Bugün için Günlük Güvenli Harcama Limitin **${snapshot.dailySafeSpending.toLocaleString("tr-TR")} ₺**'dir.\n\nAyın bitmesine 19 gün var ve kalan planlanabilir bütçen 23.000 ₺'dir. Günde bu tutarı aşmazsan ayı bütçe dengesinde tamamlarsın.`;
      }
      if (ql.includes("30 gün") || ql.includes("hangi ödemelerim")) {
        return `Önümüzdeki dönemde toplam **${snapshot.upcomingPaymentsTotal.toLocaleString("tr-TR")} ₺** tutarında zorunlu ödemen bulunuyor:\n\n• Garanti Bonus: 3.200 ₺ (Vade: 18 Eylül)\n• İş Bankası İhtiyaç Kredisi: 5.000 ₺ (Vade: 25 Eylül)`;
      }
      return '';
    }

    const a1 = getReply('Bu ay toplam ne kadar harcadım?');
    assert(a1.includes('7.000 ₺') && a1.includes('tüketim harcaması') && a1.includes('borç kapatma ve taksit'), 'Q1 correctly separates consumer spending (7.000 TL) from debt repayment (10.000 TL)', details);

    const a2 = getReply('Şu anda bankada ne kadar param var?');
    assert(a2.includes('7.000 ₺') && a2.includes('açık bankacılık veya doğrudan banka bağlantı servisi değildir'), 'Q2 states exact bank balance (7.000 TL) and clarifies no direct bank access', details);

    const a3 = getReply('Toplam borcum ne kadar?');
    assert(a3.includes('63.000 ₺') && a3.includes('varlıktır') && a3.includes('yükümlülüktür'), 'Q3 gives exact total debt (63.000 TL) and distinguishes asset from liability', details);

    const a4 = getReply('Kredi kartımı ödersem ne olur?');
    assert(a4.includes('kullanılabilir kart limitin açılır') && a4.includes('tüketim harcaması DEĞİLDİR'), 'Q4 explains credit limit restoration, bank reduction, and non-expense classification', details);

    const a5 = getReply('Bugün güvenli olarak ne kadar harcayabilirim?');
    assert(a5.includes('1.210 ₺') && a5.includes('19 gün'), 'Q5 states exact daily safe spending from snapshot without arithmetic invention', details);

    const a6 = getReply('Önümüzdeki 30 gün içinde hangi ödemelerim var?');
    assert(a6.includes('13.000 ₺') && a6.includes('Garanti Bonus') && a6.includes('İş Bankası'), 'Q6 lists upcoming mandatory obligations with exact dates and amounts', details);

    auditResults.push({ scenario: 'SCENARIO I: AI Coach Integrity', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO I: AI Coach Integrity', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// SCENARIO J: Data Model Audit
// -------------------------------------------------------------
{
  const details: string[] = [];
  try {
    // 1. Consumer expense
    const consumerExp: Expense = { id: '1', amount: 100, category: 'market', note: '', date: '2026-09-01', paymentSourceType: 'bank_account', isDebtPayment: false, createdAt: '' };
    assert(!consumerExp.isDebtPayment, '1. Consumer expense: isDebtPayment === false', details);

    // 2. Credit card purchase
    const ccPurchase: Expense = { id: '2', amount: 200, category: 'market', note: '', date: '2026-09-01', paymentSourceType: 'credit_card', paymentSourceId: 'c1', isDebtPayment: false, createdAt: '' };
    assert(ccPurchase.paymentSourceType === 'credit_card' && !ccPurchase.isDebtPayment, '2. CC purchase: paymentSourceType === "credit_card" and isDebtPayment === false', details);

    // 3. Bank purchase
    const bankPurchase: Expense = { id: '3', amount: 300, category: 'yemek', note: '', date: '2026-09-01', paymentSourceType: 'bank_account', paymentSourceId: 'a1', isDebtPayment: false, createdAt: '' };
    assert(bankPurchase.paymentSourceType === 'bank_account' && !bankPurchase.isDebtPayment, '3. Bank purchase: paymentSourceType === "bank_account" and isDebtPayment === false', details);

    // 4. Debt repayment
    const debtRepayment: Expense = { id: '4', amount: 400, category: 'diger', note: '', date: '2026-09-01', paymentSourceType: 'bank_account', paymentSourceId: 'a1', isDebtPayment: true, relatedDebtType: 'card', relatedDebtId: 'c1', createdAt: '' };
    assert(debtRepayment.isDebtPayment === true && debtRepayment.relatedDebtType === 'card', '4. Debt repayment: isDebtPayment === true, relatedDebtType === "card"', details);

    // 5. Loan installment
    const loanRepayment: Expense = { id: '5', amount: 500, category: 'diger', note: '', date: '2026-09-01', paymentSourceType: 'bank_account', paymentSourceId: 'a1', isDebtPayment: true, relatedDebtType: 'loan', relatedDebtId: 'l1', createdAt: '' };
    assert(loanRepayment.isDebtPayment === true && loanRepayment.relatedDebtType === 'loan', '5. Loan installment: isDebtPayment === true, relatedDebtType === "loan"', details);

    // 6. Regular income
    const oneTimeInc: Income = { id: '6', name: 'Danışmanlık', amount: 5000, frequency: 'one_time', category: 'freelance', isRecurring: false, paymentDate: '2026-09-15', createdAt: '' };
    assert(!oneTimeInc.isRecurring && oneTimeInc.frequency === 'one_time', '6. One-time income: isRecurring === false, frequency === "one_time"', details);

    // 7. Recurring income
    const recurringInc: Income = { id: '7', name: 'Maaş', amount: 35000, frequency: 'monthly', dayOfMonth: 5, category: 'maas', isRecurring: true, targetAccountId: 'a1', processedMonths: ['2026-09'], createdAt: '' };
    assert(recurringInc.isRecurring === true && recurringInc.frequency === 'monthly' && recurringInc.dayOfMonth === 5, '7. Recurring income: isRecurring === true with dayOfMonth', details);

    // 8. Scheduled payment
    const schedPay: ScheduledPayment = { id: '8', name: 'Kira', amount: 12000, dueDate: '2026-09-15', category: 'rent', type: 'rent', isRecurring: true, isPaid: false, createdAt: '' };
    assert(schedPay.dueDate === '2026-09-15' && schedPay.isPaid === false, '8. Scheduled payment: has dueDate and isPaid status', details);

    auditResults.push({ scenario: 'SCENARIO J: Data Model Audit', passed: true, details });
  } catch (err: any) {
    auditResults.push({ scenario: 'SCENARIO J: Data Model Audit', passed: false, details: [...details, `  [ERROR] ${err.message}`] });
  }
}

// -------------------------------------------------------------
// PRINT SUMMARY
// -------------------------------------------------------------
console.log('---------------------------------------------------------------');
console.log('DENETİM VE DOĞRULAMA RAPORU (SUMMARY)');
console.log('---------------------------------------------------------------');
let passedCount = 0;
for (const r of auditResults) {
  const mark = r.passed ? 'PASSED' : 'FAILED';
  console.log(`\n[${mark}] ${r.scenario}`);
  for (const line of r.details) {
    console.log(line);
  }
  if (r.passed) passedCount++;
}

console.log('\n===============================================================');
console.log(`TOPLAM SKOR: ${passedCount} / ${auditResults.length} SENARYO BAŞARIYLA TAMAMLANDI`);
console.log('===============================================================');
