/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';

import {
  AppData,
  Expense,
  BankAccount,
  CreditCard,
  Loan,
  Overdraft,
  OtherDebt,
  Income,
  ScheduledPayment,
  CoachMessage,
} from './finance';

import {
  loadAppData,
  saveAppData,
  getInitialDemoData,
  getCleanEmptyData,
  getSimulationScenarioData,
} from './storageService';

import {
  buildFinancialSnapshot,
  processRecurringIncomeDeposits,
} from './financialCalculations';

import { Navbar, NavTab } from './Navbar';
import { DashboardView } from './DashboardView';
import { ExpensesView } from './ExpensesView';
import { DebtsView } from './DebtsView';
import { AccountsView } from './AccountsView';
import { CalendarView } from './CalendarView';
import { ReportsView } from './ReportsView';
import { CoachView } from './CoachView';
import { QuickExpenseModal } from './QuickExpenseModal';
import { OnboardingModal } from './OnboardingModal';
import { SettingsModal } from './SettingsModal';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => {
    const loaded = loadAppData();
    return processRecurringIncomeDeposits(loaded, new Date());
  });
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Sync state to local storage
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Reactive financial calculations snapshot
  const snapshot = useMemo(() => {
    return buildFinancialSnapshot(appData);
  }, [appData]);

  // Handle Tab Selection
  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };

  // ==========================================
  // EXPENSE HANDLERS
  // ==========================================
  const handleAddExpense = (newExpData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setAppData((prev) => {
      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];

      // If paid via bank account, decrease account balance
      if (newExpData.paymentSourceType === 'bank_account' && newExpData.paymentSourceId) {
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === newExpData.paymentSourceId) {
            return {
              ...acc,
              balance: Math.max(0, acc.balance - newExpData.amount),
              updatedAt: new Date().toISOString(),
            };
          }
          return acc;
        });
      }

      // If paid via credit card, increase current debt and decrease available limit
      if (newExpData.paymentSourceType === 'credit_card' && newExpData.paymentSourceId) {
        updatedCards = updatedCards.map((card) => {
          if (card.id === newExpData.paymentSourceId) {
            const newDebt = card.currentDebt + newExpData.amount;
            const newAvail = Math.max(0, card.availableLimit - newExpData.amount);
            return {
              ...card,
              currentDebt: newDebt,
              availableLimit: newAvail,
              updatedAt: new Date().toISOString(),
            };
          }
          return card;
        });
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        creditCards: updatedCards,
        expenses: [newExpense, ...prev.expenses],
      };
    });
  };

  const handleUpdateExpense = (id: string, updatedFields: Partial<Expense>) => {
    setAppData((prev) => {
      const existing = prev.expenses.find((e) => e.id === id);
      if (!existing) return prev;

      const newAmount = updatedFields.amount !== undefined ? Number(updatedFields.amount) : existing.amount;
      const diff = newAmount - existing.amount;

      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];

      if (!existing.isDebtPayment && diff !== 0) {
        if (existing.paymentSourceType === 'bank_account' && existing.paymentSourceId) {
          updatedAccounts = updatedAccounts.map((acc) => {
            if (acc.id === existing.paymentSourceId) {
              return {
                ...acc,
                balance: Math.max(0, acc.balance - diff),
                updatedAt: new Date().toISOString(),
              };
            }
            return acc;
          });
        } else if (existing.paymentSourceType === 'credit_card' && existing.paymentSourceId) {
          updatedCards = updatedCards.map((card) => {
            if (card.id === existing.paymentSourceId) {
              const newDebt = Math.max(0, card.currentDebt + diff);
              const newAvail = Math.min(card.limit, Math.max(0, card.availableLimit - diff));
              return {
                ...card,
                currentDebt: newDebt,
                availableLimit: newAvail,
                updatedAt: new Date().toISOString(),
              };
            }
            return card;
          });
        }
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        creditCards: updatedCards,
        expenses: prev.expenses.map((exp) =>
          exp.id === id ? { ...exp, ...updatedFields } : exp
        ),
      };
    });
  };

  const handleDeleteExpense = (id: string) => {
    setAppData((prev) => {
      const expenseToDelete = prev.expenses.find((exp) => exp.id === id);
      if (!expenseToDelete) return prev;

      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];

      // Revert account / card balances if consumer expense
      if (!expenseToDelete.isDebtPayment) {
        if (expenseToDelete.paymentSourceType === 'bank_account' && expenseToDelete.paymentSourceId) {
          updatedAccounts = updatedAccounts.map((acc) => {
            if (acc.id === expenseToDelete.paymentSourceId) {
              return {
                ...acc,
                balance: acc.balance + expenseToDelete.amount,
                updatedAt: new Date().toISOString(),
              };
            }
            return acc;
          });
        } else if (expenseToDelete.paymentSourceType === 'credit_card' && expenseToDelete.paymentSourceId) {
          updatedCards = updatedCards.map((card) => {
            if (card.id === expenseToDelete.paymentSourceId) {
              const newDebt = Math.max(0, card.currentDebt - expenseToDelete.amount);
              const newAvail = Math.min(card.limit, card.availableLimit + expenseToDelete.amount);
              return {
                ...card,
                currentDebt: newDebt,
                availableLimit: newAvail,
                updatedAt: new Date().toISOString(),
              };
            }
            return card;
          });
        }
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        creditCards: updatedCards,
        expenses: prev.expenses.filter((exp) => exp.id !== id),
      };
    });
  };

  const handleMakeDebtPayment = (
    type: 'card' | 'loan' | 'kmh' | 'other',
    debtId: string,
    amount: number,
    bankAccountId?: string
  ) => {
    if (isNaN(amount) || amount <= 0) return;

    setAppData((prev) => {
      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];
      let updatedLoans = [...prev.loans];
      let updatedOverdrafts = [...prev.overdrafts];
      let updatedOtherDebts = [...prev.otherDebts];

      const targetAccountId = bankAccountId || (prev.accounts[0]?.id ?? '');
      const payingAccount = prev.accounts.find((a) => a.id === targetAccountId);
      const paymentSourceName = payingAccount ? `${payingAccount.bankName}` : 'Banka Hesabı';

      // 1. Deduct from bank account
      if (targetAccountId) {
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === targetAccountId) {
            return {
              ...acc,
              balance: Math.max(0, acc.balance - amount),
              updatedAt: new Date().toISOString(),
            };
          }
          return acc;
        });
      }

      let debtName = 'Borç';

      // 2. Reduce specific debt
      if (type === 'card') {
        updatedCards = updatedCards.map((c) => {
          if (c.id === debtId) {
            debtName = `${c.bank} ${c.cardName}`;
            const newDebt = Math.max(0, c.currentDebt - amount);
            const newStatement = Math.max(0, c.statementDebt - amount);
            const newMin = Math.max(0, c.minimumPayment - amount);
            const newAvail = Math.min(c.limit, c.availableLimit + amount);
            return {
              ...c,
              currentDebt: newDebt,
              statementDebt: newStatement,
              minimumPayment: newMin,
              availableLimit: newAvail,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
      } else if (type === 'loan') {
        updatedLoans = updatedLoans.map((l) => {
          if (l.id === debtId) {
            debtName = `${l.bank} ${l.loanName}`;
            const newRemaining = Math.max(0, l.remainingPrincipal - amount);
            const newInstallments = Math.max(0, l.remainingInstallments - 1);
            let nextDate = l.nextPaymentDate;
            if (nextDate) {
              const d = new Date(nextDate);
              d.setMonth(d.getMonth() + 1);
              nextDate = d.toISOString().slice(0, 10);
            }
            return {
              ...l,
              remainingPrincipal: newRemaining,
              remainingInstallments: newInstallments,
              nextPaymentDate: nextDate,
              updatedAt: new Date().toISOString(),
            };
          }
          return l;
        });
      } else if (type === 'kmh') {
        updatedOverdrafts = updatedOverdrafts.map((k) => {
          if (k.id === debtId) {
            debtName = `${k.bank} KMH`;
            const newUsed = Math.max(0, k.usedAmount - amount);
            const newAvail = Math.min(k.limit, k.remainingAvailable + amount);
            return {
              ...k,
              usedAmount: newUsed,
              remainingAvailable: newAvail,
              updatedAt: new Date().toISOString(),
            };
          }
          return k;
        });
      } else if (type === 'other') {
        updatedOtherDebts = updatedOtherDebts.map((d) => {
          if (d.id === debtId) {
            debtName = d.debtName;
            return {
              ...d,
              amount: Math.max(0, d.amount - amount),
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        });
      }

      // 3. Record transaction in expenses with isDebtPayment: true (does NOT count towards consumer expenses)
      const paymentTx: Expense = {
        id: `debt-pay-${Date.now()}`,
        amount,
        category: 'diger',
        date: new Date().toISOString().slice(0, 10),
        paymentSourceId: targetAccountId,
        paymentSourceName,
        paymentSourceType: 'bank_account',
        note: `${debtName} Ödemesi`,
        isDebtPayment: true,
        relatedDebtType: type,
        relatedDebtId: debtId,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        accounts: updatedAccounts,
        creditCards: updatedCards,
        loans: updatedLoans,
        overdrafts: updatedOverdrafts,
        otherDebts: updatedOtherDebts,
        expenses: [paymentTx, ...prev.expenses],
      };
    });
  };

  // ==========================================
  // DEBT HANDLERS
  // ==========================================
  const handleAddCreditCard = (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCard: CreditCard = {
      ...card,
      id: `card-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
    }));
  };

  const handleUpdateCreditCard = (id: string, updated: Partial<CreditCard>) => {
    setAppData((prev) => ({
      ...prev,
      creditCards: prev.creditCards.map((c) =>
        c.id === id ? { ...c, ...updated, updatedAt: new Date().toISOString() } : c
      ),
    }));
  };

  const handleDeleteCreditCard = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      creditCards: prev.creditCards.filter((c) => c.id !== id),
    }));
  };

  const handleAddLoan = (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLoan: Loan = {
      ...loan,
      id: `loan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      loans: [...prev.loans, newLoan],
    }));
  };

  const handleUpdateLoan = (id: string, updated: Partial<Loan>) => {
    setAppData((prev) => ({
      ...prev,
      loans: prev.loans.map((l) =>
        l.id === id ? { ...l, ...updated, updatedAt: new Date().toISOString() } : l
      ),
    }));
  };

  const handleDeleteLoan = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      loans: prev.loans.filter((l) => l.id !== id),
    }));
  };

  const handleAddOverdraft = (kmh: Omit<Overdraft, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newKMH: Overdraft = {
      ...kmh,
      id: `kmh-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      overdrafts: [...prev.overdrafts, newKMH],
    }));
  };

  const handleUpdateOverdraft = (id: string, updated: Partial<Overdraft>) => {
    setAppData((prev) => ({
      ...prev,
      overdrafts: prev.overdrafts.map((k) =>
        k.id === id ? { ...k, ...updated, updatedAt: new Date().toISOString() } : k
      ),
    }));
  };

  const handleDeleteOverdraft = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      overdrafts: prev.overdrafts.filter((k) => k.id !== id),
    }));
  };

  const handleAddOtherDebt = (debt: Omit<OtherDebt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDebt: OtherDebt = {
      ...debt,
      id: `debt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      otherDebts: [...prev.otherDebts, newDebt],
    }));
  };

  const handleUpdateOtherDebt = (id: string, updated: Partial<OtherDebt>) => {
    setAppData((prev) => ({
      ...prev,
      otherDebts: prev.otherDebts.map((d) =>
        d.id === id ? { ...d, ...updated, updatedAt: new Date().toISOString() } : d
      ),
    }));
  };

  const handleDeleteOtherDebt = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      otherDebts: prev.otherDebts.filter((d) => d.id !== id),
    }));
  };

  // ==========================================
  // BANK ACCOUNTS & INCOMES HANDLERS
  // ==========================================
  const handleAddAccount = (acc: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAcc: BankAccount = {
      ...acc,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAcc],
    }));
  };

  const handleUpdateAccount = (id: string, updated: Partial<BankAccount>) => {
    setAppData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === id ? { ...a, ...updated, updatedAt: new Date().toISOString() } : a
      ),
    }));
  };

  const handleDeleteAccount = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
    }));
  };

  const handleAddIncome = (inc: Omit<Income, 'id' | 'createdAt'>) => {
    const newIncome: Income = {
      ...inc,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      incomes: [...prev.incomes, newIncome],
    }));
  };

  const handleUpdateIncome = (id: string, updated: Partial<Income>) => {
    setAppData((prev) => ({
      ...prev,
      incomes: prev.incomes.map((i) => (i.id === id ? { ...i, ...updated } : i)),
    }));
  };

  const handleDeleteIncome = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((i) => i.id !== id),
    }));
  };

  // ==========================================
  // SCHEDULED PAYMENTS / CALENDAR HANDLERS
  // ==========================================
  const handleAddScheduledPayment = (payment: Omit<ScheduledPayment, 'id' | 'createdAt'>) => {
    const newPayment: ScheduledPayment = {
      ...payment,
      id: `bill-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      scheduledPayments: [...prev.scheduledPayments, newPayment],
    }));
  };

  const handleTogglePaymentPaid = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      scheduledPayments: prev.scheduledPayments.map((p) =>
        p.id === id ? { ...p, isPaid: !p.isPaid } : p
      ),
    }));
  };

  const handleDeleteScheduledPayment = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      scheduledPayments: prev.scheduledPayments.filter((p) => p.id !== id),
    }));
  };

  // ==========================================
  // FINANCIAL COACH (GEMINI API) HANDLER
  // ==========================================
  // ==========================================
  // FINANCIAL COACH (GEMINI API) HANDLER
  // ==========================================
  const handleSendMessageToCoach = async (userText: string) => {
    const cleanText = userText.trim();

    if (!cleanText) return;

    const userMsg: CoachMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: cleanText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...appData.coachMessages, userMsg];

    setAppData((prev) => ({
      ...prev,
      coachMessages: updatedMessages,
    }));

    setIsCoachLoading(true);

    try {
      // Backend'e CEBİ'nin finansal kaynaklarını da gönderiyoruz.
      // Gemini bu ID'leri kullanarak doğru hesap/kart/borcu seçebilir.
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: cleanText,
            message: cleanText,

            snapshot,

            accounts: appData.accounts,
            creditCards: appData.creditCards,
            loans: appData.loans,
            overdrafts: appData.overdrafts,
            otherDebts: appData.otherDebts,

            history: updatedMessages.slice(-8).map((m) => ({
              role: m.sender === 'user' ? 'user' : 'model',
              text: m.text,
            })),
          }),
        }
      );

            if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      // =====================================================
      // GEMINI ACTION ENGINE
      // =====================================================

      const action = result?.action;

      // =====================================================
      // HARCAMA EKLEME ACTION
      // =====================================================

      if (action?.name === 'add_expense') {
        const args = action.args || {};

        const amount = Number(args.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Geçersiz harcama tutarı.');
        }

        const validCategories = [
          'market',
          'yemek',
          'ulasim',
          'fatura',
          'kira',
          'alisveris',
          'saglik',
          'eglence',
          'abonelik',
          'egitim',
          'diger',
        ] as const;

        type ValidExpenseCategory =
          (typeof validCategories)[number];

        const categoryCandidate = String(
          args.category || 'diger'
        )
          .trim()
          .toLowerCase();

        const category: ValidExpenseCategory =
          validCategories.includes(
            categoryCandidate as ValidExpenseCategory
          )
            ? (categoryCandidate as ValidExpenseCategory)
            : 'diger';

        let paymentSourceId: string | undefined;
        let paymentSourceName: string | undefined;

        let paymentSourceType:
          | 'bank_account'
          | 'credit_card'
          | 'nakit'
          | 'diger' = 'diger';

        // ------------------------------------------
        // BANKA HESABI
        // ------------------------------------------

        if (args.paymentSourceType === 'bank_account') {
          const account = appData.accounts.find(
            (acc) =>
              acc.id === String(args.paymentSourceId)
          );

          if (!account) {
            throw new Error(
              'AI bir banka hesabı seçti fakat bu hesap CEBİ içinde bulunamadı.'
            );
          }

          paymentSourceType = 'bank_account';
          paymentSourceId = account.id;
          paymentSourceName =
            `${account.bankName} - ${account.accountName}`;
        }

        // ------------------------------------------
        // KREDİ KARTI
        // ------------------------------------------

        else if (
          args.paymentSourceType === 'credit_card'
        ) {
          const card = appData.creditCards.find(
            (c) =>
              c.id === String(args.paymentSourceId)
          );

          if (!card) {
            throw new Error(
              'AI bir kredi kartı seçti fakat bu kart CEBİ içinde bulunamadı.'
            );
          }

          paymentSourceType = 'credit_card';
          paymentSourceId = card.id;
          paymentSourceName =
            `${card.bank} - ${card.cardName}`;
        }

        // ------------------------------------------
        // NAKİT
        // ------------------------------------------

        else if (
          args.paymentSourceType === 'cash' ||
          args.paymentSourceType === 'nakit'
        ) {
          paymentSourceType = 'nakit';
          paymentSourceId = undefined;
          paymentSourceName = 'Nakit';
        }

        // ------------------------------------------
        // DİĞER
        // ------------------------------------------

        else {
          paymentSourceType = 'diger';
          paymentSourceId = undefined;
          paymentSourceName = 'Diğer';
        }

        const expenseDate =
          typeof args.date === 'string' &&
          args.date.trim()
            ? args.date.trim()
            : new Date()
                .toISOString()
                .slice(0, 10);

        const note =
          typeof args.note === 'string' &&
          args.note.trim()
            ? args.note.trim()
            : `CEBİ AI: ${cleanText}`;

        handleAddExpense({
          amount,
          category,
          date: expenseDate,
          paymentSourceId,
          paymentSourceName,
          paymentSourceType,
          note,
          isDebtPayment: false,
        });

        const formattedAmount =
          amount.toLocaleString('tr-TR');

        const confirmationMessage =
          paymentSourceName &&
          paymentSourceType === 'credit_card'
            ? `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName} üzerinden kaydettim. Kredi kartı borcunu ve kullanılabilir limitini güncelledim.`
            : paymentSourceName &&
                paymentSourceType === 'bank_account'
              ? `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName} üzerinden kaydettim. Hesap bakiyeni güncelledim.`
              : `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName || 'Diğer'} olarak kaydettim.`;

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            coachMsg,
          ],
        }));

        return;
      }

      // =====================================================
      // GELİR EKLEME ACTION
      // =====================================================

      if (action?.name === 'add_income') {
        const args = action.args || {};

        const amount = Number(args.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Geçersiz gelir tutarı.');
        }

        // ------------------------------------------
        // GELİR KATEGORİSİ
        // ------------------------------------------

        const validIncomeCategories = [
          'maas',
          'avans',
          'freelance',
          'ticari',
          'kira',
          'diger',
        ] as const;

        type ValidIncomeCategory =
          (typeof validIncomeCategories)[number];

        const categoryCandidate = String(
          args.category || 'diger'
        )
          .trim()
          .toLowerCase();

        const category: ValidIncomeCategory =
          validIncomeCategories.includes(
            categoryCandidate as ValidIncomeCategory
          )
            ? (categoryCandidate as ValidIncomeCategory)
            : 'diger';

        // ------------------------------------------
        // GELİR ADI
        // ------------------------------------------

        const incomeName =
          typeof args.name === 'string' &&
          args.name.trim()
            ? args.name.trim()
            : 'AI Geliri';

        // ------------------------------------------
        // HEDEF BANKA HESABI
        // ------------------------------------------

        const targetAccountId =
          typeof args.targetAccountId === 'string'
            ? args.targetAccountId.trim()
            : '';

        let targetAccountName = 'Banka hesabı';

        if (targetAccountId) {
          const account = appData.accounts.find(
            (acc) => acc.id === targetAccountId
          );

          if (!account) {
            throw new Error(
              'AI gelir hesabını seçti fakat bu banka hesabı CEBİ içinde bulunamadı.'
            );
          }

          targetAccountName =
            `${account.bankName} - ${account.accountName}`;
        }

        // ------------------------------------------
        // TEKRARLAMA BİLGİSİ
        // ------------------------------------------

        const frequencyValues = [
          'monthly',
          'one_time',
          'biweekly',
          'weekly',
        ] as const;

        type ValidIncomeFrequency =
          (typeof frequencyValues)[number];

        const frequencyCandidate = String(
          args.frequency || 'one_time'
        )
          .trim()
          .toLowerCase();

        const frequency: ValidIncomeFrequency =
          frequencyValues.includes(
            frequencyCandidate as ValidIncomeFrequency
          )
            ? (frequencyCandidate as ValidIncomeFrequency)
            : 'one_time';

        const isRecurring =
          typeof args.isRecurring === 'boolean'
            ? args.isRecurring
            : frequency !== 'one_time';

        // ------------------------------------------
        // TARİH
        // ------------------------------------------

        const paymentDate =
          typeof args.paymentDate === 'string' &&
          args.paymentDate.trim()
            ? args.paymentDate.trim()
            : new Date()
                .toISOString()
                .slice(0, 10);

        // ------------------------------------------
        // AYIN GÜNÜ
        // ------------------------------------------

        let dayOfMonth: number | undefined;

        if (
          args.dayOfMonth !== undefined &&
          args.dayOfMonth !== null
        ) {
          const parsedDay = Number(args.dayOfMonth);

          if (
            Number.isInteger(parsedDay) &&
            parsedDay >= 1 &&
            parsedDay <= 31
          ) {
            dayOfMonth = parsedDay;
          }
        }

        // Tarihten gün çıkarılabiliyorsa kullan.
        if (
          dayOfMonth === undefined &&
          paymentDate
        ) {
          const parsedDate = new Date(
            `${paymentDate}T00:00:00`
          );

          if (!Number.isNaN(parsedDate.getTime())) {
            dayOfMonth = parsedDate.getDate();
          }
        }

        // ------------------------------------------
        // MEVCUT CEBİ GELİR MOTORU
        // ------------------------------------------

        handleAddIncome({
          name: incomeName,
          amount,
          frequency,
          dayOfMonth,
          category,
          paymentDate,
          isRecurring,
          targetAccountId:
            targetAccountId || undefined,
          processedMonths: [],
        });

        const formattedAmount =
          amount.toLocaleString('tr-TR');

        const frequencyText =
          frequency === 'monthly'
            ? 'aylık'
            : frequency === 'weekly'
              ? 'haftalık'
              : frequency === 'biweekly'
                ? 'iki haftada bir'
                : 'tek seferlik';

        const confirmationMessage =
          `✅ ${formattedAmount} ₺ ${incomeName} gelirini ${targetAccountName} hesabına ${frequencyText} olarak kaydettim.`;

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            coachMsg,
          ],
        }));

        return;
      }

      // =====================================================
      // BORÇ ÖDEME ACTION
      // =====================================================

      if (action?.name === 'make_debt_payment') {
        const args = action.args || {};

        const amount = Number(args.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(
            'Geçersiz borç ödeme tutarı.'
          );
        }

        const debtType = String(
          args.debtType || ''
        )
          .trim()
          .toLowerCase();

        const debtId = String(
          args.debtId || ''
        ).trim();

        if (!debtId) {
          throw new Error(
            'AI borç ödeme için borç seçemedi.'
          );
        }

        // ------------------------------------------
        // ÖDEME YAPILACAK BANKA HESABI
        // ------------------------------------------

        let bankAccountId = String(
          args.bankAccountId || ''
        ).trim();

        if (!bankAccountId) {
          bankAccountId =
            appData.accounts[0]?.id || '';
        }

        if (!bankAccountId) {
          throw new Error(
            'Borç ödemesi için CEBİ içinde banka hesabı bulunamadı.'
          );
        }

        const bankAccount = appData.accounts.find(
          (acc) => acc.id === bankAccountId
        );

        if (!bankAccount) {
          throw new Error(
            'AI borç ödemesi için seçtiği banka hesabı CEBİ içinde bulunamadı.'
          );
        }

        // ------------------------------------------
        // BORÇ ADINI BUL
        // ------------------------------------------

        let debtName = 'Borç';

        if (debtType === 'card') {
          const card = appData.creditCards.find(
            (c) => c.id === debtId
          );

          if (!card) {
            throw new Error(
              'AI bir kredi kartı borcu seçti fakat bu kart CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            `${card.bank} - ${card.cardName}`;
        }

        else if (debtType === 'loan') {
          const loan = appData.loans.find(
            (l) => l.id === debtId
          );

          if (!loan) {
            throw new Error(
              'AI bir kredi borcu seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            `${loan.bank} - ${loan.loanName}`;
        }

        else if (debtType === 'kmh') {
          const overdraft =
            appData.overdrafts.find(
              (o) => o.id === debtId
            );

          if (!overdraft) {
            throw new Error(
              'AI bir KMH borcu seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            overdraft.accountName
              ? `${overdraft.bank} - ${overdraft.accountName}`
              : `${overdraft.bank} - KMH`;
        }

        else if (debtType === 'other') {
          const otherDebt =
            appData.otherDebts.find(
              (d) => d.id === debtId
            );

          if (!otherDebt) {
            throw new Error(
              'AI bir diğer borç seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName = otherDebt.debtName;
        }

        else {
          throw new Error(
            'AI geçersiz bir borç türü gönderdi.'
          );
        }

        // ------------------------------------------
        // MEVCUT CEBİ BORÇ ÖDEME MOTORU
        // ------------------------------------------

        handleMakeDebtPayment({
          debtType: debtType as
            | 'card'
            | 'loan'
            | 'kmh'
            | 'other',
          debtId,
          amount,
          bankAccountId,
        });

        const formattedAmount =
          amount.toLocaleString('tr-TR');

        const confirmationMessage =
          `✅ ${formattedAmount} ₺ ${debtName} borcunu ${bankAccount.bankName} - ${bankAccount.accountName} hesabından ödedim.`;

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            coachMsg,
          ],
        }));

        return;
      }

      // =====================================================
      // NORMAL GEMINI CEVABI
      // =====================================================

      const aiReply =
        result?.reply ||
        result?.answer ||
        'İşlemi anlayamadım. Biraz daha açık anlatır mısın?';

      const coachMsg: CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text: aiReply,
        timestamp: new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [
          ...prev.coachMessages,
          coachMsg,
        ],
      }));
        );

        if (!account) {
          throw new Error(
            'AI gelir hesabını seçti fakat bu banka hesabı CEBİ içinde bulunamadı.'
          );
        }

        const validIncomeCategories = [
          'maas',
          'avans',
          'freelance',
          'ticari',
          'kira',
          'diger',
        ] as const;

        const categoryCandidate = String(
          args.category || 'diger'
        )
          .trim()
          .toLowerCase();

        const category = validIncomeCategories.includes(
          categoryCandidate as (typeof validIncomeCategories)[number]
        )
          ? categoryCandidate
          : 'diger';

        const incomeDate =
          typeof args.date === 'string' && args.date.trim()
            ? args.date.trim()
            : new Date().toISOString().slice(0, 10);

        const incomeName =
          typeof args.name === 'string' && args.name.trim()
            ? args.name.trim()
            : 'AI Geliri';

        // Mevcut CEBİ gelir motorunu çalıştır.
        handleAddIncome({
          amount,
          name: incomeName,
          category: category as any,
          date: incomeDate,
          targetAccountId,
        } as any);

        const formattedAmount =
          amount.toLocaleString('tr-TR');

        const accountName =
          `${account.bankName} - ${account.accountName}`;

        const confirmationMessage =
          `✅ ${formattedAmount} ₺ ${incomeName} gelirini ${accountName} hesabına kaydettim.`;

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            coachMsg,
          ],
        }));

        return;
      }

      // =====================================================
      // BORÇ ÖDEME ACTION
      // =====================================================

      if (action?.name === 'make_debt_payment') {
        const args = action.args || {};

        const amount = Number(args.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Geçersiz borç ödeme tutarı.');
        }

        const debtType = String(
          args.debtType || ''
        ).toLowerCase();

        const debtId = String(
          args.debtId || ''
        );

        if (!debtId) {
          throw new Error(
            'AI borç ödeme için borç seçemedi.'
          );
        }

        // ------------------------------------------
        // ÖDEME YAPILACAK BANKA HESABI
        // ------------------------------------------

        let bankAccountId = String(
          args.bankAccountId || ''
        );

        // Hesap belirtilmemişse ilk banka hesabını kullan.
        if (!bankAccountId) {
          bankAccountId =
            appData.accounts[0]?.id || '';
        }

        if (!bankAccountId) {
          throw new Error(
            'Borç ödemesi için CEBİ içinde banka hesabı bulunamadı.'
          );
        }

        const bankAccount = appData.accounts.find(
          (acc) => acc.id === bankAccountId
        );

        if (!bankAccount) {
          throw new Error(
            'AI borç ödemesi için seçtiği banka hesabı CEBİ içinde bulunamadı.'
          );
        }

        // ------------------------------------------
        // BORÇ KAYNAĞINI BUL
        // ------------------------------------------

        let debtName = 'Borç';

        if (debtType === 'card') {
          const card = appData.creditCards.find(
            (c) => c.id === debtId
          );

          if (!card) {
            throw new Error(
              'AI bir kredi kartı borcu seçti fakat bu kart CEBİ içinde bulunamadı.'
            );
          }

          debtName = `${card.bank} - ${card.cardName}`;
        }

        else if (debtType === 'loan') {
          const loan = appData.loans.find(
            (l) => l.id === debtId
          );

          if (!loan) {
            throw new Error(
              'AI bir kredi/kredi borcu seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            (loan as any).name ||
            (loan as any).bankName ||
            'Kredi';
        }

        else if (debtType === 'kmh') {
          const overdraft = appData.overdrafts.find(
            (o) => o.id === debtId
          );

          if (!overdraft) {
            throw new Error(
              'AI bir KMH borcu seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            (overdraft as any).name ||
            (overdraft as any).bankName ||
            'KMH';
        }

        else if (debtType === 'other') {
          const otherDebt = appData.otherDebts.find(
            (d) => d.id === debtId
          );

          if (!otherDebt) {
            throw new Error(
              'AI bir diğer borç seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            (otherDebt as any).name ||
            'Diğer Borç';
        }

        else {
          throw new Error(
            'AI geçersiz bir borç türü gönderdi.'
          );
        }

        // ------------------------------------------
        // MEVCUT CEBİ BORÇ ÖDEME MOTORU
        // ------------------------------------------

        handleMakeDebtPayment({
          debtType: debtType as any,
          debtId,
          amount,
          bankAccountId,
        } as any);

        const formattedAmount =
          amount.toLocaleString('tr-TR');

        const confirmationMessage =
          `✅ ${formattedAmount} ₺ ${debtName} borcunu ${bankAccount.bankName} - ${bankAccount.accountName} hesabından ödedim.`;

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            coachMsg,
          ],
        }));

        return;
      }

      // =====================================================
      // NORMAL GEMINI CEVABI
      // =====================================================

      const aiReply =
        result?.reply ||
        result?.answer ||
        'İşlemi anlayamadım. Biraz daha açık anlatır mısın?';

      const coachMsg: CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text: aiReply,
        timestamp: new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [
          ...prev.coachMessages,
          coachMsg,
        ],
      }));

  const validIncomeCategories = [
    'maas',
    'avans',
    'freelance',
    'ticari',
    'kira',
    'diger',
  ] as const;

  type ValidIncomeCategory = (typeof validIncomeCategories)[number];

  const categoryCandidate = String(
    args.category || 'diger'
  ).toLowerCase();

  const category: ValidIncomeCategory =
    validIncomeCategories.includes(
      categoryCandidate as ValidIncomeCategory
    )
      ? (categoryCandidate as ValidIncomeCategory)
      : 'diger';

  const incomeName =
    typeof args.name === 'string' && args.name.trim()
      ? args.name.trim()
      : 'Gelir';

  const incomeDate =
    typeof args.date === 'string' && args.date.trim()
      ? args.date
      : new Date().toISOString().slice(0, 10);

  handleAddIncome({
    amount,
    name: incomeName,
    frequency: 'once',
    dayOfMonth: new Date(incomeDate).getDate(),
    category,
    paymentDate: incomeDate,
    isRecurring: false,
  });

  // Gerçekten hesaba yatan gelirse banka bakiyesini de artır.
  setAppData((prev) => ({
    ...prev,
    accounts: prev.accounts.map((acc) =>
      acc.id === account.id
        ? {
            ...acc,
            balance: acc.balance + amount,
            updatedAt: new Date().toISOString(),
          }
        : acc
    ),
  }));

  const formattedAmount = amount.toLocaleString('tr-TR');

  const coachMsg: CoachMessage = {
    id: `msg-coach-${Date.now()}`,
    sender: 'coach',
    text: `✅ ${formattedAmount} ₺ ${incomeName} gelirini ${account.bankName} - ${account.accountName} hesabına kaydettim. Hesap bakiyeni güncelledim.`,
    timestamp: new Date().toISOString(),
  };

  setAppData((prev) => ({
    ...prev,
    coachMessages: [...prev.coachMessages, coachMsg],
  }));

  return;
}
      
      if (action?.name === 'make_debt_payment') {
        const args = action.args || {};

        const amount = Number(args.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Geçersiz borç ödeme tutarı.');
        }

        const debtType = String(args.debtType || '').toLowerCase();

        const allowedDebtTypes = ['card', 'loan', 'kmh', 'other'];

        if (!allowedDebtTypes.includes(debtType)) {
          throw new Error('Geçersiz borç tipi.');
        }

        const debtId = String(args.debtId || '');

        if (!debtId) {
          throw new Error('Borç ID bilgisi eksik.');
        }

        let debtExists = false;

        if (debtType === 'card') {
          debtExists = appData.creditCards.some((c) => c.id === debtId);
        } else if (debtType === 'loan') {
          debtExists = appData.loans.some((l) => l.id === debtId);
        } else if (debtType === 'kmh') {
          debtExists = appData.overdrafts.some((k) => k.id === debtId);
        } else if (debtType === 'other') {
          debtExists = appData.otherDebts.some((d) => d.id === debtId);
        }

        if (!debtExists) {
          throw new Error(
            'AI bir borç seçti fakat bu borç CEBİ içinde bulunamadı.'
          );
        }

        let bankAccountId: string | undefined;

        if (args.bankAccountId) {
          const account = appData.accounts.find(
            (acc) => acc.id === String(args.bankAccountId)
          );

          if (!account) {
            throw new Error(
              'AI ödeme hesabını seçti fakat bu banka hesabı CEBİ içinde bulunamadı.'
            );
          }

          bankAccountId = account.id;
        } else {
          // Kullanıcı özellikle hesap söylemediyse mevcut ilk banka hesabını kullan.
          bankAccountId = appData.accounts[0]?.id;
        }

        if (!bankAccountId) {
          throw new Error(
            'Borç ödemesi için CEBİ içinde kayıtlı bir banka hesabı bulunamadı.'
          );
        }

        handleMakeDebtPayment(
          debtType as 'card' | 'loan' | 'kmh' | 'other',
          debtId,
          amount,
          bankAccountId
        );

        const formattedAmount = amount.toLocaleString('tr-TR');

        let debtName = 'borç';

        if (debtType === 'card') {
          const card = appData.creditCards.find((c) => c.id === debtId);
          if (card) {
            debtName = `${card.bank} ${card.cardName}`;
          }
        } else if (debtType === 'loan') {
          const loan = appData.loans.find((l) => l.id === debtId);
          if (loan) {
            debtName = `${loan.bank} ${loan.loanName}`;
          }
        } else if (debtType === 'kmh') {
          const kmh = appData.overdrafts.find((k) => k.id === debtId);
          if (kmh) {
            debtName = `${kmh.bank} KMH`;
          }
        } else if (debtType === 'other') {
          const other = appData.otherDebts.find((d) => d.id === debtId);
          if (other) {
            debtName = other.debtName;
          }
        }

        const coachMsg: CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: `✅ ${debtName} için ${formattedAmount} ₺ borç ödemesini kaydettim. Ödeme hesabındaki bakiyeyi ve ilgili borcu güncelledim.`,
          timestamp: new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [...prev.coachMessages, coachMsg],
        }));

        return;
      }

      // =====================================================
      // NORMAL AI CEVABI
      // =====================================================

      const replyText =
        result?.answer ||
        result?.reply ||
        'Cevap alınamadı.';

      const coachMsg: CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        timestamp: new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [...prev.coachMessages, coachMsg],
      }));
    } catch (err) {
      console.error(
        'Coach API call failed, using client-side smart fallback:',
        err
      );

      // =====================================================
      // CLIENT-SIDE FALLBACK
      // =====================================================

      let fallbackText = '';

      if (snapshot.hasCashShortfall) {
        fallbackText = `**Durumun:** Şu an hesaplarında ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺ bulunurken, ay sonuna kadar ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödeme yükümlülüğün var.

**Dikkat etmen gereken:** Mevcut nakdinde ${snapshot.cashShortfall.toLocaleString('tr-TR')} ₺ açık bulunuyor. Bu nedenle bugünkü günlük güvenli harcama limitin **0 ₺**'dir.

**Bugün için:** Beklenen gelirlerin fiilen hesabına geçene kadar zorunlu olmayan tüm nakit harcamalarını durdurmalısın.

**Sonraki adım:** Gelirlerin yattığında planlanan günlük bütçen ${snapshot.plannedDailyBudget.toLocaleString('tr-TR')} ₺ / gün seviyesine gelecektir.`;
      } else if (
        cleanText.includes('5.000') ||
        cleanText.toLowerCase().includes('alışveriş')
      ) {
        fallbackText = snapshot.isOverBudget
          ? `**Durumun:** Bu ay planlanan bütçeni ${snapshot.budgetDeficit.toLocaleString('tr-TR')} ₺ aştın.

**Dikkat etmen gereken:** 5.000 TL yeni harcama bütçe açığını daha da büyütecektir.

**Bugün için:** Bu harcamayı önümüzdeki aya ertelemeni tavsiye ederim.

**Sonraki adım:** Kalan günlerde zorunlu ödemelere odaklanalım.`
          : snapshot.dailySafeSpending >=
              5000 / Math.max(1, snapshot.remainingDays)
            ? `**Durumun:** Kullanılabilir bütçen ${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺ ve günlük güvenli harcaman ${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺.

**Dikkat etmen gereken:** Bu harcama sonrası kalan günlerdeki günlük limitin bir miktar düşecektir.

**Bugün için:** Acil bir ihtiyaçsa bütçen dahilinde karşılanabilir.

**Sonraki adım:** Harcama sonrası bütçeni yeniden kontrol et.`
            : `**Durumun:** Kalan bütçen (${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺) bu harcama için sınırda.

**Dikkat etmen gereken:** 5.000 TL harcama ay sonunda nakit açığına yol açabilir.

**Bugün için:** Harcamayı bölmeyi veya ertelemeyi değerlendir.`;
      } else if (
        cleanText.toLowerCase().includes('borç') ||
        cleanText.toLowerCase().includes('önce')
      ) {
        fallbackText = `**Durumun:** Toplam kayıtlı borcun ${snapshot.totalDebt.toLocaleString('tr-TR')} ₺ seviyesindedir.

**Dikkat etmen gereken:** Faiz maliyeti en yüksek olan KMH ve kredi kartı dönem borçları ilk önceliğin olmalıdır.

**Bugün için:** Yaklaşan asgari ve taksit ödemelerini zamanında yaparak gecikme zammından korun.

**Sonraki adım:** Kalan serbest nakdini faizi en yüksek borca yönlendir.`;
      } else {
        fallbackText = `**Durumun:** Toplam kullanılabilir paran ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺, bu ayki tüketim harcaman ${snapshot.monthlyExpenses.toLocaleString('tr-TR')} ₺.

**Dikkat etmen gereken:** Yaklaşan ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödemen için nakit ayrılmıştır.

**Bugün için:** Günlük güvenli harcama limitin **${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺**'dir.

**Sonraki adım:** Bu harcama limitine sadık kalarak ayı bütçe içinde kapatabilirsin.`;
      }

      const coachMsg: CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text: fallbackText,
        timestamp: new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [...prev.coachMessages, coachMsg],
      }));
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleClearCoachHistory = () => {
    setAppData((prev) => ({
      ...prev,
      coachMessages: [
        {
          id: 'msg-cleared',
          sender: 'coach',
          text: 'Sohbet geçmişi temizlendi. Nasıl yardımcı olabilirim?',
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  };

  // ==========================================
  // RESET / ONBOARDING HANDLERS
  // ==========================================
  const handleResetToDemo = () => {
    const demo = getInitialDemoData();
    setAppData(demo);
    saveAppData(demo);
  };

  const handleClearAllData = () => {
    const clean = getCleanEmptyData();
    setAppData(clean);
    saveAppData(clean);
  };

  const handleLoadSimulationScenario = () => {
    const simData = getSimulationScenarioData();
    setAppData(simData);
    saveAppData(simData);
  };

  const handleCompleteQuickStart = ({
    name,
    monthlyIncome,
    initialBalance,
    initialDebt,
  }: {
    name: string;
    monthlyIncome: number;
    initialBalance: number;
    initialDebt: number;
  }) => {
    const newAccounts: BankAccount[] = initialBalance > 0
      ? [
          {
            id: `acc-${Date.now()}`,
            bankName: 'Ana Banka Hesabım',
            accountName: 'Vadesiz Hesap',
            accountType: 'vadesiz',
            balance: initialBalance,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      : [];

    const newIncomes: Income[] = monthlyIncome > 0
      ? [
          {
            id: `inc-${Date.now()}`,
            name: 'Aylık Net Maaş',
            amount: monthlyIncome,
            frequency: 'monthly',
            dayOfMonth: 1,
            category: 'maas',
            paymentDate: '2026-09-01',
            isRecurring: true,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

    const newCards: CreditCard[] = initialDebt > 0
      ? [
          {
            id: `card-${Date.now()}`,
            bank: 'Banka',
            cardName: 'Kredi Kartı',
            limit: initialDebt * 2,
            availableLimit: initialDebt,
            currentDebt: initialDebt,
            statementDebt: initialDebt,
            minimumPayment: Math.round(initialDebt * 0.2),
            paymentDueDate: '2026-09-25',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      : [];

    const initializedData: AppData = {
      profile: {
        name,
        hasCompletedOnboarding: true,
        currency: 'TRY',
        createdAt: new Date().toISOString(),
      },
      accounts: newAccounts,
      creditCards: newCards,
      loans: [],
      overdrafts: [],
      otherDebts: [],
      incomes: newIncomes,
      expenses: [],
      scheduledPayments: [],
      coachMessages: [
        {
          id: 'msg-start',
          sender: 'coach',
          text: `Merhaba ${name}! CEBİ'ye hoş geldin. Bilgilerin sisteme kaydedildi. Artık günlük güvenli harcama sınırını takip edebilir, harcamalarını kaydedebilir ve aklına takılan her şeyi bana sorabilirsin.`,
          timestamp: new Date().toISOString(),
        },
      ],
      version: 1,
    };

    setAppData(initializedData);
    saveAppData(initializedData);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Bars */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        dailySafeSpending={snapshot.dailySafeSpending}
        isOverBudget={snapshot.isOverBudget}
        hasCashShortfall={snapshot.hasCashShortfall}
        totalBalance={snapshot.totalBalance}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            snapshot={snapshot}
            expenses={appData.expenses}
            accounts={appData.accounts}
            incomes={appData.incomes}
            scheduledPayments={appData.scheduledPayments}
            onSelectTab={handleSelectTab}
            onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesView
            expenses={appData.expenses}
            accounts={appData.accounts}
            creditCards={appData.creditCards}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
          />
        )}

        {currentTab === 'debts' && (
          <DebtsView
            creditCards={appData.creditCards}
            loans={appData.loans}
            overdrafts={appData.overdrafts}
            otherDebts={appData.otherDebts}
            snapshot={snapshot}
            accounts={appData.accounts}
            onMakeDebtPayment={handleMakeDebtPayment}
            onAddCreditCard={handleAddCreditCard}
            onUpdateCreditCard={handleUpdateCreditCard}
            onDeleteCreditCard={handleDeleteCreditCard}
            onAddLoan={handleAddLoan}
            onUpdateLoan={handleUpdateLoan}
            onDeleteLoan={handleDeleteLoan}
            onAddOverdraft={handleAddOverdraft}
            onUpdateOverdraft={handleUpdateOverdraft}
            onDeleteOverdraft={handleDeleteOverdraft}
            onAddOtherDebt={handleAddOtherDebt}
            onUpdateOtherDebt={handleUpdateOtherDebt}
            onDeleteOtherDebt={handleDeleteOtherDebt}
          />
        )}

        {currentTab === 'accounts' && (
          <AccountsView
            accounts={appData.accounts}
            incomes={appData.incomes}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            snapshot={snapshot}
            scheduledPayments={appData.scheduledPayments}
            onAddScheduledPayment={handleAddScheduledPayment}
            onTogglePaymentPaid={handleTogglePaymentPaid}
            onDeleteScheduledPayment={handleDeleteScheduledPayment}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            snapshot={snapshot}
            expenses={appData.expenses}
          />
        )}

        {currentTab === 'coach' && (
          <CoachView
            snapshot={snapshot}
            messages={appData.coachMessages}
            onSendMessage={handleSendMessageToCoach}
            onClearHistory={handleClearCoachHistory}
            isLoading={isCoachLoading}
          />
        )}
      </main>

      {/* Quick Expense Modal */}
      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onAddExpense={handleAddExpense}
        accounts={appData.accounts}
        creditCards={appData.creditCards}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={!appData.profile.hasCompletedOnboarding}
        onCompleteQuickStart={handleCompleteQuickStart}
        onLoadDemoData={handleResetToDemo}
        onStartFresh={handleClearAllData}
      />

      {/* Settings & Data Management Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetDemo={handleResetToDemo}
        onClearAll={handleClearAllData}
        onLoadSimulationScenario={handleLoadSimulationScenario}
        onDataImported={() => setAppData(loadAppData())}
      />
    </div>
  );
}

