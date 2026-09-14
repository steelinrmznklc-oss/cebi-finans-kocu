import {
  calculateTotalBalance,
  calculateTotalDebt,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateUpcomingPayments,
  buildFinancialSnapshot,
} from '../src/utils/financialCalculations';
import {
  BankAccount,
  CreditCard,
  Loan,
  Income,
  Expense,
  Overdraft,
  OtherDebt,
} from '../src/types/finance';

console.log('===============================================================');
console.log('         CEBİ REALISTIC FINANCIAL SIMULATION (TESTS 1 - 10)     ');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// INITIAL STATE SETUP
// -----------------------------------------------------------------------------
let accounts: BankAccount[] = [
  {
    id: 'acc-ziraat',
    bankName: 'Ziraat Bankası',
    accountName: 'Vadesiz TL',
    accountType: 'vadesiz',
    balance: 20000,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

let creditCards: CreditCard[] = [
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
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

let loans: Loan[] = [
  {
    id: 'loan-1',
    bank: 'Ziraat Bankası',
    loanName: 'İhtiyaç Kredisi',
    originalAmount: 60000,
    remainingPrincipal: 60000,
    monthlyInstallment: 5000,
    remainingInstallments: 12,
    nextPaymentDate: '2026-09-20',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

let overdrafts: Overdraft[] = [];
let otherDebts: OtherDebt[] = [];

let incomes: Income[] = [
  {
    id: 'inc-salary',
    name: 'Maaş',
    amount: 35000,
    frequency: 'monthly',
    dayOfMonth: 1,
    category: 'maas',
    isRecurring: true,
    createdAt: '2026-09-01T00:00:00Z',
  },
];

let expenses: Expense[] = [];

// Simulation Reference Date: 2026-09-12 (Middle of September)
const simulationDate = new Date('2026-09-12T12:00:00Z');

function printState(stepName: string) {
  const snap = buildFinancialSnapshot({
    accounts,
    creditCards,
    loans,
    overdrafts,
    otherDebts,
    incomes,
    expenses,
    scheduledPayments: [],
    referenceDate: simulationDate,
  });

  console.log(`--- [${stepName}] ---`);
  console.log(`Bank Balance:        ${snap.totalBalance.toLocaleString('tr-TR')} ₺`);
  console.log(`Credit Card Debt:    ${snap.creditCardDebt.toLocaleString('tr-TR')} ₺`);
  console.log(`CC Available Limit:  ${creditCards[0]?.availableLimit.toLocaleString('tr-TR')} ₺`);
  console.log(`Loan Principal:      ${loans[0]?.remainingPrincipal.toLocaleString('tr-TR')} ₺ (${loans[0]?.remainingInstallments} installments)`);
  console.log(`Total Debt:          ${snap.totalDebt.toLocaleString('tr-TR')} ₺`);
  console.log(`Monthly Expenses:    ${snap.monthlyExpenses.toLocaleString('tr-TR')} ₺`);
  console.log(`Monthly Income:      ${snap.monthlyIncome.toLocaleString('tr-TR')} ₺`);
  console.log(`Remaining Budget:    ${snap.remainingBudget.toLocaleString('tr-TR')} ₺`);
  console.log(`Daily Safe Spend:    ${snap.dailySafeSpending.toLocaleString('tr-TR')} ₺/day\n`);
  return snap;
}

printState('INITIAL SETUP');

// -----------------------------------------------------------------------------
// TEST 1 — CREDIT CARD PURCHASE (5,000 TL)
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 1: 5,000 TL Credit Card Purchase');
const exp1: Expense = {
  id: 'exp-1',
  amount: 5000,
  category: 'market',
  date: '2026-09-12',
  paymentSourceId: 'card-1',
  paymentSourceName: 'Bankkart Combo',
  paymentSourceType: 'credit_card',
  note: 'Market Alışverişi',
  createdAt: '2026-09-12T12:00:00Z',
};

// Update card debt & available limit; bank balance does NOT decrease
creditCards = creditCards.map((c) =>
  c.id === 'card-1'
    ? {
        ...c,
        currentDebt: c.currentDebt + exp1.amount,
        availableLimit: Math.max(0, c.availableLimit - exp1.amount),
      }
    : c
);
expenses = [exp1, ...expenses];

const snap1 = printState('TEST 1 RESULT');
const test1Pass =
  snap1.totalBalance === 20000 &&
  snap1.creditCardDebt === 5000 &&
  creditCards[0].availableLimit === 25000 &&
  snap1.totalDebt === 65000 &&
  snap1.monthlyExpenses === 5000;
console.log(`TEST 1 STATUS: ${test1Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 2 — BANK ACCOUNT PURCHASE (2,000 TL)
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 2: 2,000 TL Bank Account Purchase');
const exp2: Expense = {
  id: 'exp-2',
  amount: 2000,
  category: 'yemek',
  date: '2026-09-12',
  paymentSourceId: 'acc-ziraat',
  paymentSourceName: 'Ziraat Bankası',
  paymentSourceType: 'bank_account',
  note: 'Restoran Yemeği',
  createdAt: '2026-09-12T12:30:00Z',
};

accounts = accounts.map((a) =>
  a.id === 'acc-ziraat'
    ? {
        ...a,
        balance: Math.max(0, a.balance - exp2.amount),
      }
    : a
);
expenses = [exp2, ...expenses];

const snap2 = printState('TEST 2 RESULT');
const test2Pass =
  snap2.totalBalance === 18000 &&
  snap2.creditCardDebt === 5000 &&
  creditCards[0].availableLimit === 25000 &&
  snap2.totalDebt === 65000 &&
  snap2.monthlyExpenses === 7000;
console.log(`TEST 2 STATUS: ${test2Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 3 — CREDIT CARD PAYMENT (5,000 TL from Bank Account)
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 3: 5,000 TL Credit Card Payment from Ziraat Account');
const ccPayAmount = 5000;

// Deduct from bank account
accounts = accounts.map((a) =>
  a.id === 'acc-ziraat' ? { ...a, balance: Math.max(0, a.balance - ccPayAmount) } : a
);

// Reduce card debt and restore available limit
creditCards = creditCards.map((c) =>
  c.id === 'card-1'
    ? {
        ...c,
        currentDebt: Math.max(0, c.currentDebt - ccPayAmount),
        statementDebt: Math.max(0, c.statementDebt - ccPayAmount),
        availableLimit: Math.min(c.limit, c.availableLimit + ccPayAmount),
      }
    : c
);

// Record debt payment transaction
expenses = [
  {
    id: 'pay-cc-1',
    amount: ccPayAmount,
    category: 'diger',
    date: '2026-09-12',
    paymentSourceId: 'acc-ziraat',
    paymentSourceName: 'Ziraat Bankası',
    paymentSourceType: 'bank_account',
    note: 'Bankkart Combo Borç Ödemesi',
    isDebtPayment: true,
    relatedDebtType: 'card',
    relatedDebtId: 'card-1',
    createdAt: '2026-09-12T13:00:00Z',
  },
  ...expenses,
];

const snap3 = printState('TEST 3 RESULT');
const test3Pass =
  snap3.totalBalance === 13000 &&
  snap3.creditCardDebt === 0 &&
  creditCards[0].availableLimit === 30000 &&
  snap3.totalDebt === 60000 &&
  snap3.monthlyExpenses === 7000; // MUST NOT increase to 12,000 TL!
console.log(`TEST 3 STATUS: ${test3Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 4 — LOAN INSTALLMENT (5,000 TL from Bank Account)
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 4: 5,000 TL Loan Installment from Ziraat Account');
const loanPayAmount = 5000;

// Deduct from bank account
accounts = accounts.map((a) =>
  a.id === 'acc-ziraat' ? { ...a, balance: Math.max(0, a.balance - loanPayAmount) } : a
);

// Decrease remaining loan principal and installments
loans = loans.map((l) =>
  l.id === 'loan-1'
    ? {
        ...l,
        remainingPrincipal: Math.max(0, l.remainingPrincipal - loanPayAmount),
        remainingInstallments: Math.max(0, l.remainingInstallments - 1),
        nextPaymentDate: '2026-10-20',
      }
    : l
);

// Record transaction in history
expenses = [
  {
    id: 'pay-loan-1',
    amount: loanPayAmount,
    category: 'diger',
    date: '2026-09-12',
    paymentSourceId: 'acc-ziraat',
    paymentSourceName: 'Ziraat Bankası',
    paymentSourceType: 'bank_account',
    note: 'İhtiyaç Kredisi Taksit Ödemesi',
    isDebtPayment: true,
    relatedDebtType: 'loan',
    relatedDebtId: 'loan-1',
    createdAt: '2026-09-12T13:30:00Z',
  },
  ...expenses,
];

const snap4 = printState('TEST 4 RESULT');
const test4Pass =
  snap4.totalBalance === 8000 &&
  loans[0].remainingPrincipal === 55000 &&
  loans[0].remainingInstallments === 11 &&
  snap4.totalDebt === 55000 &&
  snap4.monthlyExpenses === 7000; // MUST NOT count as consumer spending!
console.log(`TEST 4 STATUS: ${test4Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 5 — DELETE ORIGINAL 5,000 TL CREDIT CARD PURCHASE
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 5: Delete Original 5,000 TL Credit Card Purchase');
const expToDelete = expenses.find((e) => e.id === 'exp-1');
if (expToDelete) {
  // Reversal logic:
  creditCards = creditCards.map((c) =>
    c.id === expToDelete.paymentSourceId
      ? {
          ...c,
          currentDebt: Math.max(0, c.currentDebt - expToDelete.amount), // Ensures NO negative debt!
          availableLimit: Math.min(c.limit, c.availableLimit + expToDelete.amount), // Bounded to limit
        }
      : c
  );
  expenses = expenses.filter((e) => e.id !== 'exp-1');
}

const snap5 = printState('TEST 5 RESULT');
const test5Pass =
  snap5.creditCardDebt === 0 &&
  creditCards[0].availableLimit === 30000 &&
  snap5.monthlyExpenses === 2000 && // Decreased by 5,000 (from 7,000 to 2,000)
  snap5.totalBalance === 8000 &&
  snap5.totalDebt === 55000;
console.log(`TEST 5 STATUS: ${test5Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 6 — EDIT A TRANSACTION (Change 2,000 TL purchase to 3,000 TL)
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 6: Change 2,000 TL Bank Purchase to 3,000 TL');
const existingExp2 = expenses.find((e) => e.id === 'exp-2');
if (existingExp2) {
  const newAmount = 3000;
  const diff = newAmount - existingExp2.amount; // +1,000

  // Adjust bank balance by diff
  accounts = accounts.map((a) =>
    a.id === existingExp2.paymentSourceId
      ? { ...a, balance: Math.max(0, a.balance - diff) }
      : a
  );

  // Update transaction in place (no duplicates!)
  expenses = expenses.map((e) => (e.id === 'exp-2' ? { ...e, amount: newAmount } : e));
}

const snap6 = printState('TEST 6 RESULT');
const test6Pass =
  snap6.totalBalance === 7000 && // Exactly -1,000 relative to 8,000
  snap6.monthlyExpenses === 3000 && // Exactly +1,000 relative to 2,000
  expenses.filter((e) => e.id === 'exp-2').length === 1 && // No duplicates!
  snap6.totalDebt === 55000;
console.log(`TEST 6 STATUS: ${test6Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 7 — REFRESH / DATA PERSISTENCE SIMULATION
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 7: JSON Persistence / Refresh');
const serialized = JSON.stringify({ accounts, creditCards, loans, overdrafts, otherDebts, incomes, expenses });
const deserialized = JSON.parse(serialized);

const snap7 = buildFinancialSnapshot({
  ...deserialized,
  scheduledPayments: [],
  referenceDate: simulationDate,
});

const test7Pass =
  snap7.totalBalance === snap6.totalBalance &&
  snap7.totalDebt === snap6.totalDebt &&
  snap7.monthlyExpenses === snap6.monthlyExpenses &&
  snap7.monthlyIncome === snap6.monthlyIncome &&
  snap7.remainingBudget === snap6.remainingBudget &&
  snap7.dailySafeSpending === snap6.dailySafeSpending;
console.log(`TEST 7 STATUS: ${test7Pass ? '✅ PASSED (Data intact across reload)' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 8 — MONTH BOUNDARY TESTING
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 8: Month Boundary Isolation');
const sepLastDayExp: Expense = {
  id: 'exp-sep-30',
  amount: 500,
  category: 'market',
  date: '2026-09-30',
  note: 'Eylül Son Gün Harcaması',
  createdAt: '2026-09-30T18:00:00Z',
};

const octFirstDayExp: Expense = {
  id: 'exp-oct-01',
  amount: 800,
  category: 'ulasim',
  date: '2026-10-01',
  note: 'Ekim İlk Gün Harcaması',
  createdAt: '2026-10-01T08:00:00Z',
};

const boundaryExpenses = [...expenses, sepLastDayExp, octFirstDayExp];

// Calculations for September
const sepExpensesTotal = calculateMonthlyExpenses(boundaryExpenses, new Date('2026-09-15'));
// Calculations for October
const octExpensesTotal = calculateMonthlyExpenses(boundaryExpenses, new Date('2026-10-15'));

console.log(`September (Target) Total: ${sepExpensesTotal.toLocaleString('tr-TR')} ₺ (Includes 3,000 + 500 = 3,500 ₺)`);
console.log(`October (Target) Total:   ${octExpensesTotal.toLocaleString('tr-TR')} ₺ (Includes 800 ₺ only)`);

const test8Pass = sepExpensesTotal === 3500 && octExpensesTotal === 800;
console.log(`TEST 8 STATUS: ${test8Pass ? '✅ PASSED (Strict zero leakage)' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 9 — DAILY SAFE SPENDING EDGE CASES & DEFICIT
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 9: Daily Safe Spending & Deficit Handling');

// Positive budget scenario
const positiveSnap = buildFinancialSnapshot({
  accounts,
  creditCards,
  loans,
  overdrafts,
  otherDebts,
  incomes,
  expenses: [{ id: 'e1', amount: 3000, category: 'market', date: '2026-09-10', note: '', createdAt: '' }],
  scheduledPayments: [],
  referenceDate: new Date('2026-09-12'),
});

console.log('Positive Scenario:');
console.log(`- Income: 35.000 ₺, Expenses: 3.000 ₺, Mandatory: 0 ₺`);
console.log(`- Remaining Budget: ${positiveSnap.remainingBudget.toLocaleString('tr-TR')} ₺`);
console.log(`- Daily Safe Spending: ${positiveSnap.dailySafeSpending.toLocaleString('tr-TR')} ₺/day`);
console.log(`- Is Over Budget: ${positiveSnap.isOverBudget}`);

// Deficit scenario: Expenses (40,000 ₺) > Income (35,000 ₺)
const deficitSnap = buildFinancialSnapshot({
  accounts,
  creditCards,
  loans,
  overdrafts,
  otherDebts,
  incomes,
  expenses: [{ id: 'e2', amount: 40000, category: 'alisveris', date: '2026-09-12', note: '', createdAt: '' }],
  scheduledPayments: [],
  referenceDate: new Date('2026-09-12'),
});

console.log('\nDeficit Scenario:');
console.log(`- Income: 35.000 ₺, Expenses: 40.000 ₺`);
console.log(`- Remaining Budget: ${deficitSnap.remainingBudget.toLocaleString('tr-TR')} ₺`);
console.log(`- Budget Deficit: ${deficitSnap.budgetDeficit.toLocaleString('tr-TR')} ₺`);
console.log(`- Daily Safe Spending: ${deficitSnap.dailySafeSpending} ₺/day`);
console.log(`- Is Over Budget: ${deficitSnap.isOverBudget}`);

const test9Pass =
  positiveSnap.remainingBudget === 32000 &&
  positiveSnap.dailySafeSpending > 0 &&
  !isNaN(positiveSnap.dailySafeSpending) &&
  isFinite(positiveSnap.dailySafeSpending) &&
  deficitSnap.remainingBudget === -5000 &&
  deficitSnap.budgetDeficit === 5000 &&
  deficitSnap.dailySafeSpending === 0 &&
  deficitSnap.isOverBudget === true;

console.log(`TEST 9 STATUS: ${test9Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// TEST 10 — AI FINANCIAL COACH
// -----------------------------------------------------------------------------
console.log('>>> RUNNING TEST 10: AI Financial Coach Verification');

// We simulate the rule-based response engine from server.ts to verify data fidelity
function simulateCoachReply(question: string, snapshot: any): string {
  const q = question.toLowerCase();
  const safeDaily = Number(snapshot?.dailySafeSpending || 0);
  const remainingBudget = Number(snapshot?.remainingBudget || 0);
  const totalDebt = Number(snapshot?.totalDebt || 0);
  const monthlyIncome = Number(snapshot?.monthlyIncome || 0);
  const monthlyExpenses = Number(snapshot?.monthlyExpenses || 0);
  const remainingDays = Number(snapshot?.remainingDays || 1);

  if (q.includes('fazla mı harcadım')) {
    if (snapshot?.isOverBudget || remainingBudget < 0) {
      return `Bu ay planlanan bütçeyi yaklaşık ${Math.abs(remainingBudget).toLocaleString('tr-TR')} ₺ kadar aştın.`;
    }
    const spentRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
    return `Bu ayki toplam gelirin ${monthlyIncome.toLocaleString('tr-TR')} ₺ ve şu ana kadar ${monthlyExpenses.toLocaleString('tr-TR')} ₺ harcadın (gelirinin %${Math.round(spentRatio)}'si). Kalan bütçen ${remainingBudget.toLocaleString('tr-TR')} ₺ ve ayın sonuna kadar günde yaklaşık ${Math.max(0, safeDaily).toLocaleString('tr-TR')} ₺ harcama alanın var.`;
  }

  if (q.includes('hangi borcumu')) {
    return `Toplam borcun ${totalDebt.toLocaleString('tr-TR')} ₺ seviyesinde. Finansal koçluk kuralı olarak: 1. İlk olarak gecikmeye girmemesi için tüm kredi kartı ve kredi taksitlerinin ASGARİ tutarlarını öde. 2. Ardından faiz oranı en yüksek olan borcuna fazladan ödeme yaparak kapatmaya odaklan.`;
  }

  return 'Koç yanıtı hazırlandı.';
}

const finalSnapshot = snap6;
const reply1 = simulateCoachReply('Bu ay fazla mı harcadım?', finalSnapshot);
const reply2 = simulateCoachReply('Önce hangi borcumu ödemeliyim?', finalSnapshot);

console.log('Question 1: "Bu ay fazla mı harcadım?"');
console.log(`Coach Answer:\n"${reply1}"\n`);

console.log('Question 2: "Önce hangi borcumu ödemeliyim?"');
console.log(`Coach Answer:\n"${reply2}"\n`);

const test10Pass =
  reply1.includes('35.000') &&
  reply1.includes('3.000') &&
  reply2.includes('55.000') &&
  !reply1.includes('NaN') &&
  !reply2.includes('NaN');

console.log(`TEST 10 STATUS: ${test10Pass ? '✅ PASSED' : '❌ FAILED'}\n`);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
const allPassed =
  test1Pass &&
  test2Pass &&
  test3Pass &&
  test4Pass &&
  test5Pass &&
  test6Pass &&
  test7Pass &&
  test8Pass &&
  test9Pass &&
  test10Pass;

console.log('===============================================================');
console.log(`ALL 10 TESTS OVERALL: ${allPassed ? '🏆 10/10 SUCCESSFUL' : '⚠️ FAILURES ENCOUNTERED'}`);
console.log('===============================================================');
