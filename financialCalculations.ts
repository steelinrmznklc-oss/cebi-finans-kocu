import {
  BankAccount,
  CreditCard,
  Loan,
  Overdraft,
  OtherDebt,
  Income,
  Expense,
  ScheduledPayment,
  FinancialSnapshot,
  CategoryStat,
  DebtDetailItem,
  ExpenseCategory,
  AppData,
} from '../types/finance';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  market: 'Market & Gıda',
  yemek: 'Yeme & İçme',
  ulasim: 'Ulaşım & Yakıt',
  fatura: 'Faturalar',
  kira: 'Kira & Konut',
  alisveris: 'Alışveriş & Giyim',
  saglik: 'Sağlık',
  eglence: 'Eğlence & Sosyal',
  abonelik: 'Abonelikler',
  egitim: 'Eğitim',
  diger: 'Diğer Harcamalar',
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  market: '#10B981', // Emerald
  yemek: '#F59E0B', // Amber
  ulasim: '#3B82F6', // Blue
  fatura: '#EF4444', // Red
  kira: '#8B5CF6', // Purple
  alisveris: '#EC4899', // Pink
  saglik: '#06B6D4', // Cyan
  eglence: '#F97316', // Orange
  abonelik: '#6366F1', // Indigo
  egitim: '#14B8A6', // Teal
  diger: '#64748B', // Slate
};

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  maas: 'Maaş',
  avans: 'Avans',
  freelance: 'Freelance / Proje',
  ticari: 'Ticari Kazanç',
  kira: 'Kira Geliri',
  diger: 'Diğer Gelir',
};

/**
 * Format a number into clean Turkish Lira currency display: e.g. 12.500 ₺
 */
export function formatCurrency(amount: number | undefined | null, includeFraction = false): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: includeFraction ? 2 : 0,
      maximumFractionDigits: includeFraction ? 2 : 0,
    }).format(num) + ' ₺'
  );
}

/**
 * Format a date string into readable Turkish format: e.g. "12 Eylül 2026"
 */
export function formatTurkishDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Safe date parser that avoids UTC timezone date shifts (e.g. 2026-09-01 turning into August 31)
 */
export function parseDateSafe(dateInput: string | Date | undefined | null): { year: number; month: number; day: number } | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return {
      year: dateInput.getFullYear(),
      month: dateInput.getMonth(),
      day: dateInput.getDate(),
    };
  }
  if (typeof dateInput === 'string') {
    const clean = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.slice(0, 10).split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m - 1, day: d };
      }
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
      };
    }
  }
  return null;
}

/**
 * Format a month and year in Turkish (e.g. "Eylül 2026")
 */
export function formatTurkishMonth(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Güncel Dönem';
  }
}

/**
 * Format short Turkish date: "12 Eyl"
 */
export function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const parsed = parseDateSafe(dateStr);
    if (!parsed) return dateStr;
    const d = new Date(parsed.year, parsed.month, parsed.day);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Calculate days remaining in the given month from referenceDate
 */
export function getMonthDaysInfo(referenceDate: Date = new Date()) {
  const parsed = parseDateSafe(referenceDate) || {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth(),
    day: referenceDate.getDate(),
  };
  const year = parsed.year;
  const month = parsed.month; // 0-indexed
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDayOfMonth = parsed.day;
  // remaining days including today
  const remainingDays = Math.max(1, totalDaysInMonth - currentDayOfMonth + 1);

  return {
    totalDaysInMonth,
    currentDayOfMonth,
    remainingDays,
    year,
    month,
  };
}

/**
 * Relative days badge helper: "Bugün", "3 gün sonra", "Gecikmiş (5 gün)"
 */
export function getRelativeDaysInfo(dueDateStr: string | undefined, today: Date = new Date()): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
  days: number;
} {
  if (!dueDateStr) {
    return { text: 'Tarih Yok', isOverdue: false, isToday: false, days: 0 };
  }

  const parsedToday = parseDateSafe(today);
  const parsedDue = parseDateSafe(dueDateStr);

  if (!parsedToday || !parsedDue) {
    return { text: dueDateStr, isOverdue: false, isToday: false, days: 0 };
  }

  const todayStart = new Date(parsedToday.year, parsedToday.month, parsedToday.day).getTime();
  const dueTime = new Date(parsedDue.year, parsedDue.month, parsedDue.day).getTime();

  const diffMs = dueTime - todayStart;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: 'Bugün', isOverdue: false, isToday: true, days: 0 };
  } else if (diffDays === 1) {
    return { text: 'Yarın', isOverdue: false, isToday: false, days: 1 };
  } else if (diffDays > 1) {
    return { text: `${diffDays} gün sonra`, isOverdue: false, isToday: false, days: diffDays };
  } else {
    const overdueDays = Math.abs(diffDays);
    return { text: `Gecikmiş (${overdueDays} gün)`, isOverdue: true, isToday: false, days: diffDays };
  }
}

/**
 * Calculate total available liquid balance across bank accounts
 */
export function calculateTotalBalance(accounts: BankAccount[] = []): number {
  if (!Array.isArray(accounts)) return 0;
  return accounts.reduce((sum, acc) => {
    const b = Number(acc.balance);
    return sum + (isNaN(b) ? 0 : b);
  }, 0);
}

/**
 * Calculate total debts across cards, loans, overdrafts, and other debts
 */
export function calculateTotalDebt(
  creditCards: CreditCard[] = [],
  loans: Loan[] = [],
  overdrafts: Overdraft[] = [],
  otherDebts: OtherDebt[] = []
): {
  totalDebt: number;
  creditCardDebt: number;
  loanDebt: number;
  overdraftDebt: number;
  otherDebt: number;
} {
  const creditCardDebt = (creditCards || []).reduce((sum, c) => {
    // If currentDebt is explicitly set (even 0), use it. Do NOT let 0 fall back to statementDebt!
    const amt =
      c.currentDebt !== undefined && !isNaN(Number(c.currentDebt))
        ? Number(c.currentDebt)
        : Number(c.statementDebt || 0);
    return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
  }, 0);

  const loanDebt = (loans || []).reduce((sum, l) => {
    const amt = Number(l.remainingPrincipal || 0);
    return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
  }, 0);

  const overdraftDebt = (overdrafts || []).reduce((sum, o) => {
    const amt = Number(o.usedAmount || 0);
    return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
  }, 0);

  const otherDebt = (otherDebts || []).reduce((sum, d) => {
    const amt = Number(d.amount || 0);
    return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
  }, 0);

  const totalDebt = creditCardDebt + loanDebt + overdraftDebt + otherDebt;

  return {
    totalDebt,
    creditCardDebt,
    loanDebt,
    overdraftDebt,
    otherDebt,
  };
}

/**
 * Calculate monthly income for the target month
 */
export function calculateMonthlyIncome(incomes: Income[] = [], targetDate: Date = new Date()): number {
  if (!Array.isArray(incomes)) return 0;
  const parsedTarget = parseDateSafe(targetDate) || {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth(),
    day: targetDate.getDate(),
  };

  return incomes.reduce((sum, item) => {
    const amount = Number(item.amount);
    if (isNaN(amount) || amount <= 0) return sum;

    if (item.isRecurring || item.frequency === 'monthly') {
      return sum + amount;
    }

    if (item.frequency === 'biweekly') {
      return sum + amount * 2;
    }

    if (item.frequency === 'weekly') {
      return sum + amount * 4;
    }

    // One-time check date
    if (item.paymentDate) {
      const parsedItem = parseDateSafe(item.paymentDate);
      if (parsedItem && parsedItem.year === parsedTarget.year && parsedItem.month === parsedTarget.month) {
        return sum + amount;
      }
    }

    return sum;
  }, 0);
}

/**
 * Calculate monthly actual expenses for the target month
 */
export function calculateMonthlyExpenses(expenses: Expense[] = [], targetDate: Date = new Date()): number {
  if (!Array.isArray(expenses)) return 0;
  const parsedTarget = parseDateSafe(targetDate) || {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth(),
    day: targetDate.getDate(),
  };

  return expenses.reduce((sum, exp) => {
    // Debt repayment is a balance sheet movement (Cash -> Debt), NOT consumer spending
    if (exp.isDebtPayment) return sum;

    const amount = Number(exp.amount);
    if (isNaN(amount) || amount <= 0) return sum;

    if (exp.date) {
      const parsedExp = parseDateSafe(exp.date);
      if (parsedExp && parsedExp.year === parsedTarget.year && parsedExp.month === parsedTarget.month) {
        return sum + amount;
      }
    }
    return sum;
  }, 0);
}

/**
 * Calculate total debt repayments made in the target month (balance sheet transfers, not consumer spending)
 */
export function calculateMonthlyDebtRepayments(expenses: Expense[] = [], targetDate: Date = new Date()): number {
  if (!Array.isArray(expenses)) return 0;
  const parsedTarget = parseDateSafe(targetDate) || {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth(),
    day: targetDate.getDate(),
  };

  return expenses.reduce((sum, exp) => {
    if (!exp.isDebtPayment) return sum;

    const amount = Number(exp.amount);
    if (isNaN(amount) || amount <= 0) return sum;

    if (exp.date) {
      const parsedExp = parseDateSafe(exp.date);
      if (parsedExp && parsedExp.year === parsedTarget.year && parsedExp.month === parsedTarget.month) {
        return sum + amount;
      }
    }
    return sum;
  }, 0);
}

/**
 * Distinguish realized income to date vs pending income for the target month
 */
export function calculateRealizedAndPendingIncome(
  incomes: Income[] = [],
  targetDate: Date = new Date()
): {
  totalExpected: number;
  realizedIncome: number;
  pendingIncome: number;
} {
  if (!Array.isArray(incomes)) {
    return { totalExpected: 0, realizedIncome: 0, pendingIncome: 0 };
  }

  const parsedTarget = parseDateSafe(targetDate) || {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth(),
    day: targetDate.getDate(),
  };
  const currentDay = parsedTarget.day;

  let totalExpected = 0;
  let realizedIncome = 0;
  let pendingIncome = 0;

  for (const item of incomes) {
    const amount = Number(item.amount);
    if (isNaN(amount) || amount <= 0) continue;

    if (item.isRecurring || item.frequency === 'monthly') {
      totalExpected += amount;
      const paymentDay = item.dayOfMonth || (item.paymentDate ? parseDateSafe(item.paymentDate)?.day || 1 : 1);
      if (currentDay >= paymentDay) {
        realizedIncome += amount;
      } else {
        pendingIncome += amount;
      }
    } else if (item.frequency === 'biweekly') {
      totalExpected += amount * 2;
      realizedIncome += amount;
    } else if (item.frequency === 'weekly') {
      totalExpected += amount * 4;
      realizedIncome += amount * Math.min(4, Math.ceil(currentDay / 7));
    } else if (item.paymentDate) {
      const parsedItem = parseDateSafe(item.paymentDate);
      if (parsedItem && parsedItem.year === parsedTarget.year && parsedItem.month === parsedTarget.month) {
        totalExpected += amount;
        if (currentDay >= parsedItem.day) {
          realizedIncome += amount;
        } else {
          pendingIncome += amount;
        }
      }
    }
  }

  return { totalExpected, realizedIncome, pendingIncome };
}

/**
 * Process recurring income deposits into bank accounts according to payment dates.
 * Idempotent: Tracks processed months so refreshing or re-evaluating NEVER duplicates deposits!
 */
export function processRecurringIncomeDeposits(data: AppData, referenceDate: Date = new Date()): AppData {
  if (!data || !Array.isArray(data.incomes) || !Array.isArray(data.accounts) || data.accounts.length === 0) {
    return data;
  }

  const parsed = parseDateSafe(referenceDate) || {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth(),
    day: referenceDate.getDate(),
  };
  const monthKey = `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;
  const currentDay = parsed.day;

  let hasChanges = false;
  const updatedAccounts = data.accounts.map((acc) => ({ ...acc }));
  const updatedIncomes = data.incomes.map((inc) => ({ ...inc }));

  for (let i = 0; i < updatedIncomes.length; i++) {
    const inc = updatedIncomes[i];
    if (!inc.isRecurring && inc.frequency !== 'monthly') continue;

    const paymentDay = inc.dayOfMonth || (inc.paymentDate ? parseDateSafe(inc.paymentDate)?.day || 1 : 1);
    const processedList = Array.isArray(inc.processedMonths) ? inc.processedMonths : [];

    // If payment date has arrived and not yet deposited for this month
    if (currentDay >= paymentDay && !processedList.includes(monthKey)) {
      const targetAccId = inc.targetAccountId || updatedAccounts[0]?.id;
      const targetAccIndex = updatedAccounts.findIndex((a) => a.id === targetAccId);

      if (targetAccIndex !== -1) {
        updatedAccounts[targetAccIndex] = {
          ...updatedAccounts[targetAccIndex],
          balance: updatedAccounts[targetAccIndex].balance + inc.amount,
          updatedAt: new Date().toISOString(),
        };
        updatedIncomes[i] = {
          ...inc,
          processedMonths: [...processedList, monthKey],
          updatedAt: new Date().toISOString(),
        };
        hasChanges = true;
      }
    }
  }

  if (!hasChanges) return data;

  return {
    ...data,
    accounts: updatedAccounts,
    incomes: updatedIncomes,
  };
}

/**
 * Calculate category breakdown stats for the given month
 */
export function calculateCategoryBreakdown(expenses: Expense[] = [], targetDate: Date = new Date()): CategoryStat[] {
  if (!Array.isArray(expenses)) return [];
  const parsedTarget = parseDateSafe(targetDate) || {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth(),
    day: targetDate.getDate(),
  };

  const currentMonthExpenses = expenses.filter((e) => {
    if (e.isDebtPayment) return false;
    if (!e.date) return false;
    const parsedExp = parseDateSafe(e.date);
    return parsedExp && parsedExp.year === parsedTarget.year && parsedExp.month === parsedTarget.month;
  });

  const totalsByCategory: Record<string, { amount: number; count: number }> = {};
  let overallTotal = 0;

  for (const exp of currentMonthExpenses) {
    const amt = Number(exp.amount) || 0;
    const cat = exp.category || 'diger';
    overallTotal += amt;

    if (!totalsByCategory[cat]) {
      totalsByCategory[cat] = { amount: 0, count: 0 };
    }
    totalsByCategory[cat].amount += amt;
    totalsByCategory[cat].count += 1;
  }

  const breakdown: CategoryStat[] = Object.entries(totalsByCategory).map(([catKey, data]) => {
    const label = EXPENSE_CATEGORY_LABELS[catKey as ExpenseCategory] || catKey;
    const color = EXPENSE_CATEGORY_COLORS[catKey as ExpenseCategory] || '#64748B';
    const percentage = overallTotal > 0 ? Math.round((data.amount / overallTotal) * 100) : 0;
    return {
      category: catKey,
      name: label,
      amount: data.amount,
      percentage,
      color,
      count: data.count,
    };
  });

  // Sort by amount descending
  return breakdown.sort((a, b) => b.amount - a.amount);
}

/**
 * Compile detailed list of debts for the coach and views
 */
export function getDebtDetailItems(
  creditCards: CreditCard[] = [],
  loans: Loan[] = [],
  overdrafts: Overdraft[] = [],
  otherDebts: OtherDebt[] = [],
  today: Date = new Date()
): DebtDetailItem[] {
  const items: DebtDetailItem[] = [];

  for (const card of creditCards) {
    const amt = Number(card.currentDebt || card.statementDebt || 0);
    if (amt > 0) {
      const cardDueDate = card.paymentDueDate || (card as any).dueDate;
      const rel = getRelativeDaysInfo(cardDueDate, today);
      items.push({
        id: card.id,
        name: card.cardName || 'Kredi Kartı',
        type: 'Kredi Kartı',
        bank: card.bank,
        amount: amt,
        monthlyOrMin: Number(card.minimumPayment || 0),
        dueDate: cardDueDate,
        isOverdue: rel.isOverdue,
        daysUntilDue: rel.days,
      });
    }
  }

  for (const loan of loans) {
    const principal = Number(loan.remainingPrincipal || 0);
    if (principal > 0) {
      const rel = getRelativeDaysInfo(loan.nextPaymentDate, today);
      items.push({
        id: loan.id,
        name: loan.loanName || 'Banka Kredisi',
        type: 'Kredi Taksiti',
        bank: loan.bank,
        amount: principal,
        monthlyOrMin: Number(loan.monthlyInstallment || 0),
        dueDate: loan.nextPaymentDate,
        isOverdue: rel.isOverdue,
        daysUntilDue: rel.days,
      });
    }
  }

  for (const kmh of overdrafts) {
    const used = Number(kmh.usedAmount || 0);
    if (used > 0) {
      const rel = getRelativeDaysInfo(kmh.paymentDate, today);
      items.push({
        id: kmh.id,
        name: kmh.bank ? `${kmh.bank} KMH` : 'KMH / Ek Hesap',
        type: 'KMH Borcu',
        bank: kmh.bank,
        amount: used,
        monthlyOrMin: used,
        dueDate: kmh.paymentDate,
        isOverdue: rel.isOverdue,
        daysUntilDue: rel.days,
      });
    }
  }

  for (const other of otherDebts) {
    const amt = Number(other.amount || 0);
    if (amt > 0) {
      const rel = getRelativeDaysInfo(other.dueDate, today);
      items.push({
        id: other.id,
        name: other.debtName || 'Diğer Borç',
        type: 'Şahsi / Diğer Borç',
        amount: amt,
        monthlyOrMin: amt,
        dueDate: other.dueDate,
        isOverdue: rel.isOverdue,
        daysUntilDue: rel.days,
      });
    }
  }

  return items.sort((a, b) => {
    // Sort overdue first, then by daysUntilDue
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999);
  });
}

/**
 * Calculate upcoming payments within the current month or next 35 days
 */
export function calculateUpcomingPayments(
  creditCards: CreditCard[] = [],
  loans: Loan[] = [],
  overdrafts: Overdraft[] = [],
  otherDebts: OtherDebt[] = [],
  scheduledPayments: ScheduledPayment[] = [],
  today: Date = new Date()
): {
  totalUpcoming: number;
  thisMonthUpcomingTotal: number;
  upcomingList: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    type: string;
    isOverdue: boolean;
    isToday: boolean;
    relativeText: string;
    days: number;
    entityId?: string;
  }[];
} {
  const parsedToday = parseDateSafe(today) || {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  };

  const list: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    type: string;
    isOverdue: boolean;
    isToday: boolean;
    relativeText: string;
    days: number;
    isThisMonth: boolean;
    entityId?: string;
  }[] = [];

  // 1. Credit Cards statement / minimum payments
  for (const card of creditCards) {
    const amt = Number(card.statementDebt || card.minimumPayment || 0);
    const cardDueDate = card.paymentDueDate || (card as any).dueDate;
    if (amt > 0 && cardDueDate) {
      const rel = getRelativeDaysInfo(cardDueDate, today);
      const parsedDue = parseDateSafe(cardDueDate);
      const isThisMonth = Boolean(
        rel.isOverdue || (parsedDue && parsedDue.year === parsedToday.year && parsedDue.month === parsedToday.month)
      );

      // within next 35 days or overdue
      if (rel.days <= 35) {
        list.push({
          id: `card-${card.id}`,
          title: `${card.bank} ${card.cardName} Ekstre`,
          amount: amt,
          dueDate: cardDueDate,
          type: 'Kredi Kartı',
          isOverdue: rel.isOverdue,
          isToday: rel.isToday,
          relativeText: rel.text,
          days: rel.days,
          isThisMonth,
          entityId: card.id,
        });
      }
    }
  }

  // 2. Loan Installments
  for (const loan of loans) {
    const installment = Number(loan.monthlyInstallment || 0);
    if (installment > 0 && loan.nextPaymentDate) {
      const rel = getRelativeDaysInfo(loan.nextPaymentDate, today);
      const parsedDue = parseDateSafe(loan.nextPaymentDate);
      const isThisMonth = Boolean(
        rel.isOverdue || (parsedDue && parsedDue.year === parsedToday.year && parsedDue.month === parsedToday.month)
      );

      if (rel.days <= 35) {
        list.push({
          id: `loan-${loan.id}`,
          title: `${loan.bank} ${loan.loanName} Taksiti`,
          amount: installment,
          dueDate: loan.nextPaymentDate,
          type: 'Kredi Taksiti',
          isOverdue: rel.isOverdue,
          isToday: rel.isToday,
          relativeText: rel.text,
          days: rel.days,
          isThisMonth,
          entityId: loan.id,
        });
      }
    }
  }

  // 3. Overdrafts
  for (const kmh of overdrafts) {
    const used = Number(kmh.usedAmount || 0);
    if (used > 0 && kmh.paymentDate) {
      const rel = getRelativeDaysInfo(kmh.paymentDate, today);
      const parsedDue = parseDateSafe(kmh.paymentDate);
      const isThisMonth = Boolean(
        rel.isOverdue || (parsedDue && parsedDue.year === parsedToday.year && parsedDue.month === parsedToday.month)
      );

      if (rel.days <= 35) {
        list.push({
          id: `kmh-${kmh.id}`,
          title: `${kmh.bank} KMH Kullanımı`,
          amount: used,
          dueDate: kmh.paymentDate,
          type: 'KMH',
          isOverdue: rel.isOverdue,
          isToday: rel.isToday,
          relativeText: rel.text,
          days: rel.days,
          isThisMonth,
          entityId: kmh.id,
        });
      }
    }
  }

  // 4. Scheduled bills & payments (unpaid)
  for (const sp of scheduledPayments) {
    if (!sp.isPaid && sp.dueDate) {
      const rel = getRelativeDaysInfo(sp.dueDate, today);
      const parsedDue = parseDateSafe(sp.dueDate);
      const isThisMonth = Boolean(
        rel.isOverdue || (parsedDue && parsedDue.year === parsedToday.year && parsedDue.month === parsedToday.month)
      );

      if (rel.days <= 35) {
        list.push({
          id: `sp-${sp.id}`,
          title: sp.name,
          amount: Number(sp.amount || 0),
          dueDate: sp.dueDate,
          type: sp.category || 'Fatura / Ödeme',
          isOverdue: rel.isOverdue,
          isToday: rel.isToday,
          relativeText: rel.text,
          days: rel.days,
          isThisMonth,
          entityId: sp.id,
        });
      }
    }
  }

  // 5. Other Debts with dueDate
  for (const od of otherDebts) {
    const amt = Number(od.amount || 0);
    if (amt > 0 && od.dueDate) {
      const rel = getRelativeDaysInfo(od.dueDate, today);
      const parsedDue = parseDateSafe(od.dueDate);
      const isThisMonth = Boolean(
        rel.isOverdue || (parsedDue && parsedDue.year === parsedToday.year && parsedDue.month === parsedToday.month)
      );

      if (rel.days <= 35) {
        list.push({
          id: `other-${od.id}`,
          title: od.debtName,
          amount: amt,
          dueDate: od.dueDate,
          type: 'Diğer Borç',
          isOverdue: rel.isOverdue,
          isToday: rel.isToday,
          relativeText: rel.text,
          days: rel.days,
          isThisMonth,
          entityId: od.id,
        });
      }
    }
  }

  // Sort chronologically (overdue first, then soonest)
  list.sort((a, b) => a.days - b.days);

  const totalUpcoming = list.reduce((sum, item) => sum + item.amount, 0);
  const thisMonthUpcomingTotal = list
    .filter((item) => item.isThisMonth)
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    totalUpcoming,
    thisMonthUpcomingTotal,
    upcomingList: list,
  };
}

/**
 * Construct the full financial snapshot for application UI & AI Coach
 * Supports passing either an AppData container object OR individual arrays
 */
export function buildFinancialSnapshot(
  dataOrAccounts: any = [],
  creditCardsOrRefDate?: any,
  loansList?: Loan[],
  overdraftsList?: Overdraft[],
  otherDebtsList?: OtherDebt[],
  incomesList?: Income[],
  expensesList?: Expense[],
  scheduledPaymentsList?: ScheduledPayment[],
  referenceDateInput?: Date
): FinancialSnapshot {
  let accounts: BankAccount[] = [];
  let creditCards: CreditCard[] = [];
  let loans: Loan[] = [];
  let overdrafts: Overdraft[] = [];
  let otherDebts: OtherDebt[] = [];
  let incomes: Income[] = [];
  let expenses: Expense[] = [];
  let scheduledPayments: ScheduledPayment[] = [];
  let referenceDate: Date = new Date();

  // If first parameter is an AppData or container object
  if (dataOrAccounts && typeof dataOrAccounts === 'object' && !Array.isArray(dataOrAccounts)) {
    accounts = Array.isArray(dataOrAccounts.accounts) ? dataOrAccounts.accounts : [];
    creditCards = Array.isArray(dataOrAccounts.creditCards) ? dataOrAccounts.creditCards : [];
    loans = Array.isArray(dataOrAccounts.loans) ? dataOrAccounts.loans : [];
    overdrafts = Array.isArray(dataOrAccounts.overdrafts) ? dataOrAccounts.overdrafts : [];
    otherDebts = Array.isArray(dataOrAccounts.otherDebts) ? dataOrAccounts.otherDebts : [];
    incomes = Array.isArray(dataOrAccounts.incomes) ? dataOrAccounts.incomes : [];
    expenses = Array.isArray(dataOrAccounts.expenses) ? dataOrAccounts.expenses : [];
    scheduledPayments = Array.isArray(dataOrAccounts.scheduledPayments) ? dataOrAccounts.scheduledPayments : [];
    referenceDate = creditCardsOrRefDate instanceof Date ? creditCardsOrRefDate : new Date();
  } else {
    accounts = Array.isArray(dataOrAccounts) ? dataOrAccounts : [];
    creditCards = Array.isArray(creditCardsOrRefDate) ? creditCardsOrRefDate : [];
    loans = Array.isArray(loansList) ? loansList : [];
    overdrafts = Array.isArray(overdraftsList) ? overdraftsList : [];
    otherDebts = Array.isArray(otherDebtsList) ? otherDebtsList : [];
    incomes = Array.isArray(incomesList) ? incomesList : [];
    expenses = Array.isArray(expensesList) ? expensesList : [];
    scheduledPayments = Array.isArray(scheduledPaymentsList) ? scheduledPaymentsList : [];
    referenceDate = referenceDateInput instanceof Date ? referenceDateInput : new Date();
  }

  const { totalDaysInMonth, currentDayOfMonth, remainingDays } = getMonthDaysInfo(referenceDate);

  const totalBalance = calculateTotalBalance(accounts);
  const debtBreakdown = calculateTotalDebt(creditCards, loans, overdrafts, otherDebts);
  const monthlyIncome = calculateMonthlyIncome(incomes, referenceDate);
  const incomeBreakdown = calculateRealizedAndPendingIncome(incomes, referenceDate);
  const monthlyExpenses = calculateMonthlyExpenses(expenses, referenceDate);
  const totalDebtRepayments = calculateMonthlyDebtRepayments(expenses, referenceDate);
  const upcomingInfo = calculateUpcomingPayments(creditCards, loans, overdrafts, otherDebts, scheduledPayments, referenceDate);
  const thisMonthUpcomingTotal = upcomingInfo.thisMonthUpcomingTotal;

  // 1. MEVCUT LİKİT NAKİT GÜVENLİĞİ (Current Cash Safety):
  // Banka hesaplarındaki fiili nakitten, bu ay ödenmesi zorunlu yükümlülüklerin ayrılması
  const currentCashSafety = totalBalance - thisMonthUpcomingTotal;
  const netLiquidAvailable = currentCashSafety;
  const hasCashShortfall = currentCashSafety < 0;
  const cashShortfall = hasCashShortfall ? Math.abs(currentCashSafety) : 0;

  // 2. PLANLANAN AYLIK BÜTÇE & PLANLANAN GÜNLÜK BÜTÇE (Planned Daily Discretionary Budget):
  // Ay boyunca beklenen tüm gelirler gerçekleştiğinde teorik olarak kalacak bütçe ve günlük dağılımı
  const baseBudget = monthlyIncome > 0 ? monthlyIncome : totalBalance;
  const remainingBudget = baseBudget - monthlyExpenses - thisMonthUpcomingTotal;
  const plannedDiscretionaryBudget = remainingBudget;

  const isOverBudget = remainingBudget < 0;
  const budgetDeficit = isOverBudget ? Math.abs(remainingBudget) : 0;

  let plannedDailyBudget = 0;
  if (!isOverBudget && remainingBudget > 0 && remainingDays > 0) {
    plannedDailyBudget = Math.floor(remainingBudget / remainingDays);
  }

  // 3. GÜNLÜK GÜVENLİ HARCAMA (Daily Safe Spending):
  // Kullanıcının fiilen elinde olan serbest likit nakitten bugün güvenle harcayabileceği tutar.
  // Kesin kural: Henüz hesaba yatmamış gelecekteki gelirler ASLA anlık nakit gibi harcanamaz!
  // Eğer bütçe açığı varsa (isOverBudget) veya mevcut nakit zorunlu ödemeleri bile karşılamıyorsa günlük güvenli harcama 0 ₺'dir.
  let dailySafeSpending = 0;
  if (!isOverBudget && !hasCashShortfall && currentCashSafety > 0 && remainingDays > 0) {
    dailySafeSpending = Math.floor(currentCashSafety / remainingDays);
  }

  const debtRatio = monthlyIncome > 0 ? Math.round((debtBreakdown.totalDebt / monthlyIncome) * 100) : 0;
  const categoryBreakdown = calculateCategoryBreakdown(expenses, referenceDate);
  const debtDetails = getDebtDetailItems(creditCards, loans, overdrafts, otherDebts, referenceDate);

  const formattedIncomes = (incomes || []).map((i) => ({
    id: i.id,
    name: i.name,
    amount: Number(i.amount) || 0,
    isRecurring: Boolean(i.isRecurring),
    paymentDate: i.paymentDate,
  }));

  return {
    totalBalance,
    totalDebt: debtBreakdown.totalDebt,
    creditCardDebt: debtBreakdown.creditCardDebt,
    loanDebt: debtBreakdown.loanDebt,
    overdraftDebt: debtBreakdown.overdraftDebt,
    otherDebt: debtBreakdown.otherDebt,
    monthlyIncome,
    realizedMonthlyIncome: incomeBreakdown.realizedIncome,
    pendingMonthlyIncome: incomeBreakdown.pendingIncome,
    monthlyExpenses,
    totalDebtRepayments,
    netLiquidAvailable,
    currentCashSafety,
    hasCashShortfall,
    cashShortfall,
    upcomingPaymentsTotal: upcomingInfo.totalUpcoming,
    thisMonthUpcomingTotal,
    remainingBudget,
    plannedDiscretionaryBudget,
    dailySafeSpending,
    plannedDailyBudget,
    isOverBudget,
    budgetDeficit,
    remainingDays,
    totalDaysInMonth,
    currentDayOfMonth,
    debtRatio,
    categoryBreakdown,
    debtDetails,
    incomes: formattedIncomes,
    lastUpdated: new Date().toISOString(),
  };
}
