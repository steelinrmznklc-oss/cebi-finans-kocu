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
} from './types/finance';
import {
  loadAppData,
  saveAppData,
  getInitialDemoData,
  getCleanEmptyData,
  getSimulationScenarioData,
} from '.storageService';
import {
  buildFinancialSnapshot,
  processRecurringIncomeDeposits,
} from './financialCalculations';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { DebtsView } from './components/DebtsView';
import { AccountsView } from './components/AccountsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { CoachView } from './components/CoachView';
import { QuickExpenseModal } from './components/QuickExpenseModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';

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
  const handleSendMessageToCoach = async (userText: string) => {
    const userMsg: CoachMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    // Add user message to state
    const updatedMessages = [...appData.coachMessages, userMsg];
    setAppData((prev) => ({
      ...prev,
      coachMessages: updatedMessages,
    }));

    setIsCoachLoading(true);

    try {
      // Call backend /api/coach
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          message: userText,
          snapshot,
          history: updatedMessages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      const replyText = result.answer || result.reply || 'Cevap alınamadı.';

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
      console.error('Coach API call failed, using client-side smart fallback:', err);
      // Fallback response grounded in calculated snapshot
      let fallbackText = '';
      if (snapshot.hasCashShortfall) {
        fallbackText = `**Durumun:** Şu an hesaplarında ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺ bulunurken, ay sonuna kadar ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödeme yükümlülüğün var.\n\n**Dikkat etmen gereken:** Mevcut nakdinde ${snapshot.cashShortfall.toLocaleString('tr-TR')} ₺ açık bulunuyor. Bu nedenle bugünkü günlük güvenli harcama limitin **0 ₺**'dir.\n\n**Bugün için:** Beklenen gelirlerin fiilen hesabına geçene kadar zorunlu olmayan tüm nakit harcamalarını durdurmalısın.\n\n**Sonraki adım:** Gelirlerin yattığında planlanan günlük bütçen ${snapshot.plannedDailyBudget.toLocaleString('tr-TR')} ₺ / gün seviyesine gelecektir.`;
      } else if (userText.includes('5.000') || userText.includes('alışveriş')) {
        fallbackText = snapshot.isOverBudget
          ? `**Durumun:** Bu ay planlanan bütçeni ${snapshot.budgetDeficit.toLocaleString('tr-TR')} ₺ aştın.\n\n**Dikkat etmen gereken:** 5.000 TL yeni harcama bütçe açığını daha da büyütecektir.\n\n**Bugün için:** Bu harcamayı önümüzdeki aya ertelemeni tavsiye ederim.\n\n**Sonraki adım:** Kalan günlerde zorunlu ödemelere odaklanalım.`
          : snapshot.dailySafeSpending >= 5000 / Math.max(1, snapshot.remainingDays)
          ? `**Durumun:** Kullanılabilir bütçen ${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺ ve günlük güvenli harcaman ${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺.\n\n**Dikkat etmen gereken:** Bu harcama sonrası kalan günlerdeki günlük limitin bir miktar düşecektir.\n\n**Bugün için:** Acil bir ihtiyaçsa bütçen dahilinde karşılanabilir.\n\n**Sonraki adım:** Harcama sonrası bütçeni yeniden kontrol et.`
          : `**Durumun:** Kalan bütçen (${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺) bu harcama için sınırda.\n\n**Dikkat etmen gereken:** 5.000 TL harcama ay sonunda nakit açığına yol açabilir.\n\n**Bugün için:** Harcamayı bölmeyi veya ertelemeyi değerlendir.\n\n**Sonraki adım:** İhtiyaç dışı kalemleri gözden geçir.`;
      } else if (userText.includes('borç') || userText.includes('önce')) {
        fallbackText = `**Durumun:** Toplam kayıtlı borcun ${snapshot.totalDebt.toLocaleString('tr-TR')} ₺ seviyesindedir.\n\n**Dikkat etmen gereken:** Faiz maliyeti en yüksek olan KMH ve kredi kartı dönem borçları ilk önceliğin olmalıdır.\n\n**Bugün için:** Yaklaşan asgari ve taksit ödemelerini zamanında yaparak gecikme zammından korun.\n\n**Sonraki adım:** Kalan serbest nakdini faizi en yüksek borca yönlendir.`;
      } else {
        fallbackText = `**Durumun:** Toplam kullanılabilir paran ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺, bu ayki tüketim harcaman ${snapshot.monthlyExpenses.toLocaleString('tr-TR')} ₺.\n\n**Dikkat etmen gereken:** Yaklaşan ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödemen için nakit ayrılmıştır.\n\n**Bugün için:** Günlük güvenli harcama limitin **${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺**'dir.\n\n**Sonraki adım:** Bu harcama limitine sadık kalarak ayı bütçe içinde kapatabilirsin.`;
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

