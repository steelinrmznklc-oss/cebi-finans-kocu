/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Receipt } from 'lucide-react';

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

import ReceiptScanner from './ReceiptScanner';
import ReceiptPreview from './ReceiptPreview';


// ==========================================================
// CEBİ — CLIENT-SIDE TRANSACTION PARSER
// Android APK backend'e ulaşamasa bile temel işlemleri kaydeder.
// ==========================================================

function cebiNormalizeTR(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function cebiParseAmount(text: string): number | null {
  const normalized = text.replace(/\s/g, ' ');

  const m =
    normalized.match(
      /(\d{1,3}(?:[. ]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s*)(?:tl|lira|₺)/i
    ) ||
    normalized.match(
      /(?:^|\s)(\d{2,7}(?:[.,]\d+)?)(?:\s|$)/i
    );

  if (!m) return null;

  let raw = m[1].replace(/ /g, '');

  if (raw.includes('.') && raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.');
  } else if (/^\d{1,3}\.\d{3}$/.test(raw)) {
    raw = raw.replace('.', '');
  }

  const n = Number(raw);

  return Number.isFinite(n) && n > 0 ? n : null;
}

function cebiExpenseCategory(text: string): string {
  const q = cebiNormalizeTR(text);

  if (/market|migros|carrefour|bim|a101|sok/.test(q)) {
    return 'market';
  }

  if (/restoran|lokanta|kafe|kahve|yemek|pizza|burger/.test(q)) {
    return 'yemek';
  }

  if (/benzin|mazot|akaryakit|petrol/.test(q)) {
    return 'akaryakit';
  }

  if (/fatura|elektrik|su fatur|dogalgaz|internet fatur/.test(q)) {
    return 'fatura';
  }

  if (/kira/.test(q)) {
    return 'kira';
  }

  if (/ulasim|otobus|metro|taksi|uber|yakıt/.test(q)) {
    return 'ulasim';
  }

  if (/saglik|eczane|doktor|ilac/.test(q)) {
    return 'saglik';
  }

  if (/giyim|elbise|ayakkabi/.test(q)) {
    return 'giyim';
  }

  if (/elektronik|telefon|laptop|bilgisayar/.test(q)) {
    return 'elektronik';
  }

  if (/abonelik|netflix|spotify/.test(q)) {
    return 'abonelik';
  }

  if (/egitim|kurs|okul/.test(q)) {
    return 'egitim';
  }

  if (/eglence|sinema|konser|oyun/.test(q)) {
    return 'eglence';
  }

  if (/alisveris|magaza|satın|satin|aldim/.test(q)) {
    return 'alisveris';
  }

  return 'diger';
}

function cebiExpenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    market: 'Market',
    yemek: 'Yemek',
    ulasim: 'Ulaşım',
    fatura: 'Fatura',
    kira: 'Kira',
    alisveris: 'Alışveriş',
    saglik: 'Sağlık',
    eglence: 'Eğlence',
    abonelik: 'Abonelik',
    egitim: 'Eğitim',
    akaryakit: 'Akaryakıt',
    ev: 'Ev',
    giyim: 'Giyim',
    elektronik: 'Elektronik',
    sigorta: 'Sigorta',
    vergi: 'Vergi',
    diger: 'Diğer',
  };

  return labels[category] || 'Diğer';
}

function cebiBuildExpenseSummary(
  text: string,
  category: string,
  sourceName: string
): string {
  const label = cebiExpenseCategoryLabel(category);
  const q = cebiNormalizeTR(text);

  const merchant =
    /migros|carrefour|bim|a101|sok/.test(q)
      ? 'Market alışverişi'
      : /netflix|spotify/.test(q)
        ? 'Abonelik ödemesi'
        : /opet|shell|bp|petrol/.test(q)
          ? 'Akaryakıt harcaması'
          : null;

  return `${merchant || `${label} harcaması`} • ${sourceName}`;
}

function cebiIsExpense(text: string): boolean {
  const q = cebiNormalizeTR(text);

  return (
    /\b(yaptim|harcadim|harcama yaptim|odeme yaptim|odedim|aldim|satın aldim|satin aldim|alisveris yaptim)\b/.test(
      q
    ) &&
    !/(yapacagim|harcayacagim|odeyecegim|alacagim|yapabilir miyim|harcayabilir miyim|alabilir miyim)/.test(
      q
    )
  );
}

function cebiFindExpenseSource(
  text: string,
  accounts: BankAccount[],
  cards: CreditCard[]
) {
  const q = cebiNormalizeTR(text);

  for (const card of cards) {
    const bank = cebiNormalizeTR(card.bank || '');
    const name = cebiNormalizeTR(card.cardName || '');

    if (
      (bank && q.includes(bank)) ||
      (name && q.includes(name))
    ) {
      return {
        id: card.id,
        name: `${card.bank} - ${card.cardName}`,
        type: 'credit_card' as const,
      };
    }
  }

  for (const account of accounts) {
    const bank = cebiNormalizeTR(account.bankName || '');
    const name = cebiNormalizeTR(account.accountName || '');

    if (
      (bank && q.includes(bank)) ||
      (name && q.includes(name))
    ) {
      return {
        id: account.id,
        name: `${account.bankName} - ${account.accountName}`,
        type: 'bank_account' as const,
      };
    }
  }

  if (/nakit|cash/.test(q)) {
    return {
      id: undefined,
      name: 'Nakit',
      type: 'nakit' as const,
    };
  }

  if (cards.length === 1 && /kart|kredi/.test(q)) {
    const card = cards[0];

    return {
      id: card.id,
      name: `${card.bank} - ${card.cardName}`,
      type: 'credit_card' as const,
    };
  }

  if (
    accounts.length === 1 &&
    /hesabimdan|bankadan|hesabim/.test(q)
  ) {
    const account = accounts[0];

    return {
      id: account.id,
      name: `${account.bankName} - ${account.accountName}`,
      type: 'bank_account' as const,
    };
  }

  return null;
}


export default function App() {
  const [appData, setAppData] = useState<AppData>(() => {
    const loaded = loadAppData();

    return processRecurringIncomeDeposits(
      loaded,
      new Date()
    );
  });

  const [currentTab, setCurrentTab] =
    useState<NavTab>('dashboard');

  const [isQuickExpenseOpen, setIsQuickExpenseOpen] =
    useState(false);

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isCoachLoading, setIsCoachLoading] =
    useState(false);

  // ==========================================================
  // RECEIPT SCANNER STATE
  // ==========================================================

  const [isReceiptScannerOpen, setIsReceiptScannerOpen] =
    useState(false);

  const [receiptImageData, setReceiptImageData] =
    useState<string | null>(null);


  // ==========================================================
  // SYNC STATE TO LOCAL STORAGE
  // ==========================================================

  useEffect(() => {
    saveAppData(appData);
  }, [appData]);


  // ==========================================================
  // REACTIVE FINANCIAL CALCULATIONS SNAPSHOT
  // ==========================================================

  const snapshot = useMemo(() => {
    return buildFinancialSnapshot(appData);
  }, [appData]);


  // ==========================================================
  // HANDLE TAB SELECTION
  // ==========================================================

  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };


  // ==========================================================
  // EXPENSE HANDLERS
  // ==========================================================

  const handleAddExpense = (
    newExpData: Omit<Expense, 'id' | 'createdAt'>
  ) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setAppData((prev) => {
      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];

      // Bank account payment
      if (
        newExpData.paymentSourceType === 'bank_account' &&
        newExpData.paymentSourceId
      ) {
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === newExpData.paymentSourceId) {
            return {
              ...acc,
              balance: Math.max(
                0,
                acc.balance - newExpData.amount
              ),
              updatedAt: new Date().toISOString(),
            };
          }

          return acc;
        });
      }

      // Credit card payment
      if (
        newExpData.paymentSourceType === 'credit_card' &&
        newExpData.paymentSourceId
      ) {
        updatedCards = updatedCards.map((card) => {
          if (card.id === newExpData.paymentSourceId) {
            const newDebt =
              card.currentDebt + newExpData.amount;

            const newAvail = Math.max(
              0,
              card.availableLimit - newExpData.amount
            );

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
        expenses: [
          newExpense,
          ...prev.expenses,
        ],
      };
    });
  };


  // ==========================================================
  // RECEIPT SCANNER HANDLERS
  // ==========================================================

  const handleReceiptScanned = (
    imageData: string
  ) => {
    setReceiptImageData(imageData);
    setIsReceiptScannerOpen(false);
  };


  const handleReceiptConfirm = (
    expense: Expense
  ) => {
    handleAddExpense({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paymentSourceId:
        expense.paymentSourceId,
      paymentSourceName:
        expense.paymentSourceName,
      paymentSourceType:
        expense.paymentSourceType,
      note: expense.note,
      isDebtPayment: false,
      relatedDebtType: undefined,
      relatedDebtId: undefined,
    });

    setReceiptImageData(null);
  };


  const handleReceiptPreviewClose = () => {
    setReceiptImageData(null);
  };


  // ==========================================================
  // UPDATE EXPENSE
  // ==========================================================

  const handleUpdateExpense = (
    id: string,
    updatedFields: Partial<Expense>
  ) => {
    setAppData((prev) => {
      const existing = prev.expenses.find(
        (e) => e.id === id
      );

      if (!existing) return prev;

      const newAmount =
        updatedFields.amount !== undefined
          ? Number(updatedFields.amount)
          : existing.amount;

      const diff =
        newAmount - existing.amount;

      let updatedAccounts = [...prev.accounts];
      let updatedCards = [...prev.creditCards];

      if (
        !existing.isDebtPayment &&
        diff !== 0
      ) {
        if (
          existing.paymentSourceType === 'bank_account' &&
          existing.paymentSourceId
        ) {
          updatedAccounts =
            updatedAccounts.map((acc) => {
              if (
                acc.id ===
                existing.paymentSourceId
              ) {
                return {
                  ...acc,
                  balance: Math.max(
                    0,
                    acc.balance - diff
                  ),
                  updatedAt:
                    new Date().toISOString(),
                };
              }

              return acc;
            });
        } else if (
          existing.paymentSourceType ===
            'credit_card' &&
          existing.paymentSourceId
        ) {
          updatedCards =
            updatedCards.map((card) => {
              if (
                card.id ===
                existing.paymentSourceId
              ) {
                const newDebt =
                  Math.max(
                    0,
                    card.currentDebt + diff
                  );

                const newAvail =
                  Math.min(
                    card.limit,
                    Math.max(
                      0,
                      card.availableLimit - diff
                    )
                  );

                return {
                  ...card,
                  currentDebt: newDebt,
                  availableLimit: newAvail,
                  updatedAt:
                    new Date().toISOString(),
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
        expenses: prev.expenses.map(
          (exp) =>
            exp.id === id
              ? {
                  ...exp,
                  ...updatedFields,
                }
              : exp
        ),
      };
    });
  };


  // ==========================================================
  // DELETE EXPENSE
  // ==========================================================

  const handleDeleteExpense = (
    id: string
  ) => {
    setAppData((prev) => {
      const expenseToDelete =
        prev.expenses.find(
          (exp) => exp.id === id
        );

      if (!expenseToDelete) {
        return prev;
      }

      let updatedAccounts =
        [...prev.accounts];

      let updatedCards =
        [...prev.creditCards];

      if (
        !expenseToDelete.isDebtPayment
      ) {
        if (
          expenseToDelete.paymentSourceType ===
            'bank_account' &&
          expenseToDelete.paymentSourceId
        ) {
          updatedAccounts =
            updatedAccounts.map((acc) => {
              if (
                acc.id ===
                expenseToDelete.paymentSourceId
              ) {
                return {
                  ...acc,
                  balance:
                    acc.balance +
                    expenseToDelete.amount,
                  updatedAt:
                    new Date().toISOString(),
                };
              }

              return acc;
            });
        } else if (
          expenseToDelete.paymentSourceType ===
            'credit_card' &&
          expenseToDelete.paymentSourceId
        ) {
          updatedCards =
            updatedCards.map((card) => {
              if (
                card.id ===
                expenseToDelete.paymentSourceId
              ) {
                const newDebt =
                  Math.max(
                    0,
                    card.currentDebt -
                      expenseToDelete.amount
                  );

                const newAvail =
                  Math.min(
                    card.limit,
                    card.availableLimit +
                      expenseToDelete.amount
                  );

                return {
                  ...card,
                  currentDebt: newDebt,
                  availableLimit: newAvail,
                  updatedAt:
                    new Date().toISOString(),
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
        expenses:
          prev.expenses.filter(
            (exp) => exp.id !== id
          ),
      };
    });
  };


  // ==========================================================
  // DEBT PAYMENT
  // ==========================================================

  const handleMakeDebtPayment = (
    type:
      | 'card'
      | 'loan'
      | 'kmh'
      | 'other',
    debtId: string,
    amount: number,
    bankAccountId?: string
  ) => {
    if (
      isNaN(amount) ||
      amount <= 0
    ) {
      return;
    }

    setAppData((prev) => {
      let updatedAccounts =
        [...prev.accounts];

      let updatedCards =
        [...prev.creditCards];

      let updatedLoans =
        [...prev.loans];

      let updatedOverdrafts =
        [...prev.overdrafts];

      let updatedOtherDebts =
        [...prev.otherDebts];

      const targetAccountId =
        bankAccountId ||
        (prev.accounts[0]?.id ?? '');

      const payingAccount =
        prev.accounts.find(
          (a) =>
            a.id === targetAccountId
        );

      const paymentSourceName =
        payingAccount
          ? `${payingAccount.bankName}`
          : 'Banka Hesabı';

      // Deduct from bank account
      if (targetAccountId) {
        updatedAccounts =
          updatedAccounts.map((acc) => {
            if (
              acc.id === targetAccountId
            ) {
              return {
                ...acc,
                balance: Math.max(
                  0,
                  acc.balance - amount
                ),
                updatedAt:
                  new Date().toISOString(),
              };
            }

            return acc;
          });
      }

      let debtName = 'Borç';

      // Credit card
      if (type === 'card') {
        updatedCards =
          updatedCards.map((c) => {
            if (c.id === debtId) {
              debtName =
                `${c.bank} ${c.cardName}`;

              const newDebt =
                Math.max(
                  0,
                  c.currentDebt - amount
                );

              const newStatement =
                Math.max(
                  0,
                  c.statementDebt - amount
                );

              const newMin =
                Math.max(
                  0,
                  c.minimumPayment - amount
                );

              const newAvail =
                Math.min(
                  c.limit,
                  c.availableLimit + amount
                );

              return {
                ...c,
                currentDebt: newDebt,
                statementDebt:
                  newStatement,
                minimumPayment:
                  newMin,
                availableLimit:
                  newAvail,
                updatedAt:
                  new Date().toISOString(),
              };
            }

            return c;
          });
      }

      // Loan
      else if (type === 'loan') {
        updatedLoans =
          updatedLoans.map((l) => {
            if (l.id === debtId) {
              debtName =
                `${l.bank} ${l.loanName}`;

              const newRemaining =
                Math.max(
                  0,
                  l.remainingPrincipal -
                    amount
                );

              const newInstallments =
                Math.max(
                  0,
                  l.remainingInstallments -
                    1
                );

              let nextDate =
                l.nextPaymentDate;

              if (nextDate) {
                const d =
                  new Date(nextDate);

                d.setMonth(
                  d.getMonth() + 1
                );

                nextDate =
                  d.toISOString()
                    .slice(0, 10);
              }

              return {
                ...l,
                remainingPrincipal:
                  newRemaining,
                remainingInstallments:
                  newInstallments,
                nextPaymentDate:
                  nextDate,
                updatedAt:
                  new Date().toISOString(),
              };
            }

            return l;
          });
      }

      // KMH
      else if (type === 'kmh') {
        updatedOverdrafts =
          updatedOverdrafts.map(
            (k) => {
              if (k.id === debtId) {
                debtName =
                  `${k.bank} KMH`;

                const newUsed =
                  Math.max(
                    0,
                    k.usedAmount - amount
                  );

                const newAvail =
                  Math.min(
                    k.limit,
                    k.remainingAvailable +
                      amount
                  );

                return {
                  ...k,
                  usedAmount: newUsed,
                  remainingAvailable:
                    newAvail,
                  updatedAt:
                    new Date().toISOString(),
                };
              }

              return k;
            }
          );
      }

      // Other debt
      else if (type === 'other') {
        updatedOtherDebts =
          updatedOtherDebts.map(
            (d) => {
              if (d.id === debtId) {
                debtName =
                  d.debtName;

                return {
                  ...d,
                  amount: Math.max(
                    0,
                    d.amount - amount
                  ),
                  updatedAt:
                    new Date().toISOString(),
                };
              }

              return d;
            }
          );
      }

      const paymentTx: Expense = {
        id: `debt-pay-${Date.now()}`,
        amount,
        category: 'diger',
        date: new Date()
          .toISOString()
          .slice(0, 10),
        paymentSourceId:
          targetAccountId,
        paymentSourceName,
        paymentSourceType:
          'bank_account',
        note:
          `${debtName} Ödemesi`,
        isDebtPayment: true,
        relatedDebtType: type,
        relatedDebtId: debtId,
        createdAt:
          new Date().toISOString(),
      };

      return {
        ...prev,
        accounts: updatedAccounts,
        creditCards: updatedCards,
        loans: updatedLoans,
        overdrafts:
          updatedOverdrafts,
        otherDebts:
          updatedOtherDebts,
        expenses: [
          paymentTx,
          ...prev.expenses,
        ],
      };
    });
  };


  // ==========================================================
  // CREDIT CARD HANDLERS
  // ==========================================================

  const handleAddCreditCard = (
    card: Omit<
      CreditCard,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newCard: CreditCard = {
      ...card,
      id: `card-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      creditCards: [
        ...prev.creditCards,
        newCard,
      ],
    }));
  };


  const handleUpdateCreditCard = (
    id: string,
    updated: Partial<CreditCard>
  ) => {
    setAppData((prev) => ({
      ...prev,
      creditCards:
        prev.creditCards.map(
          (c) =>
            c.id === id
              ? {
                  ...c,
                  ...updated,
                  updatedAt:
                    new Date().toISOString(),
                }
              : c
        ),
    }));
  };


  const handleDeleteCreditCard = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      creditCards:
        prev.creditCards.filter(
          (c) => c.id !== id
        ),
    }));
  };


  // ==========================================================
  // LOAN HANDLERS
  // ==========================================================

  const handleAddLoan = (
    loan: Omit<
      Loan,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newLoan: Loan = {
      ...loan,
      id: `loan-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      loans: [
        ...prev.loans,
        newLoan,
      ],
    }));
  };


  const handleUpdateLoan = (
    id: string,
    updated: Partial<Loan>
  ) => {
    setAppData((prev) => ({
      ...prev,
      loans:
        prev.loans.map(
          (l) =>
            l.id === id
              ? {
                  ...l,
                  ...updated,
                  updatedAt:
                    new Date().toISOString(),
                }
              : l
        ),
    }));
  };


  const handleDeleteLoan = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      loans:
        prev.loans.filter(
          (l) => l.id !== id
        ),
    }));
  };


  // ==========================================================
  // OVERDRAFT / KMH HANDLERS
  // ==========================================================

  const handleAddOverdraft = (
    kmh: Omit<
      Overdraft,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newKMH: Overdraft = {
      ...kmh,
      id: `kmh-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      overdrafts: [
        ...prev.overdrafts,
        newKMH,
      ],
    }));
  };


  const handleUpdateOverdraft = (
    id: string,
    updated: Partial<Overdraft>
  ) => {
    setAppData((prev) => ({
      ...prev,
      overdrafts:
        prev.overdrafts.map(
          (k) =>
            k.id === id
              ? {
                  ...k,
                  ...updated,
                  updatedAt:
                    new Date().toISOString(),
                }
              : k
        ),
    }));
  };


  const handleDeleteOverdraft = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      overdrafts:
        prev.overdrafts.filter(
          (k) => k.id !== id
        ),
    }));
  };


  // ==========================================================
  // OTHER DEBT HANDLERS
  // ==========================================================

  const handleAddOtherDebt = (
    debt: Omit<
      OtherDebt,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newDebt: OtherDebt = {
      ...debt,
      id: `debt-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      otherDebts: [
        ...prev.otherDebts,
        newDebt,
      ],
    }));
  };


  const handleUpdateOtherDebt = (
    id: string,
    updated: Partial<OtherDebt>
  ) => {
    setAppData((prev) => ({
      ...prev,
      otherDebts:
        prev.otherDebts.map(
          (d) =>
            d.id === id
              ? {
                  ...d,
                  ...updated,
                  updatedAt:
                    new Date().toISOString(),
                }
              : d
        ),
    }));
  };


  const handleDeleteOtherDebt = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      otherDebts:
        prev.otherDebts.filter(
          (d) => d.id !== id
        ),
    }));
  };


  // ==========================================================
  // BANK ACCOUNTS
  // ==========================================================

  const handleAddAccount = (
    acc: Omit<
      BankAccount,
      'id' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newAcc: BankAccount = {
      ...acc,
      id: `acc-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      accounts: [
        ...prev.accounts,
        newAcc,
      ],
    }));
  };


  const handleUpdateAccount = (
    id: string,
    updated: Partial<BankAccount>
  ) => {
    setAppData((prev) => ({
      ...prev,
      accounts:
        prev.accounts.map(
          (a) =>
            a.id === id
              ? {
                  ...a,
                  ...updated,
                  updatedAt:
                    new Date().toISOString(),
                }
              : a
        ),
    }));
  };


  const handleDeleteAccount = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      accounts:
        prev.accounts.filter(
          (a) => a.id !== id
        ),
    }));
  };


  // ==========================================================
  // INCOME HANDLERS
  // ==========================================================

  const handleAddIncome = (
    inc: Omit<
      Income,
      'id' | 'createdAt'
    >
  ) => {
    const newIncome: Income = {
      ...inc,
      id: `inc-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    setAppData((prev) => {
      let updatedAccounts =
        prev.accounts;

      if (inc.targetAccountId) {
        updatedAccounts =
          prev.accounts.map(
            (account) => {
              if (
                account.id !==
                inc.targetAccountId
              ) {
                return account;
              }

              return {
                ...account,
                balance:
                  account.balance +
                  inc.amount,
                updatedAt:
                  new Date().toISOString(),
              };
            }
          );
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        incomes: [
          ...prev.incomes,
          newIncome,
        ],
      };
    });
  };


  const handleUpdateIncome = (
    id: string,
    updated: Partial<Income>
  ) => {
    setAppData((prev) => ({
      ...prev,
      incomes:
        prev.incomes.map(
          (i) =>
            i.id === id
              ? {
                  ...i,
                  ...updated,
                }
              : i
        ),
    }));
  };


  const handleDeleteIncome = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      incomes:
        prev.incomes.filter(
          (i) => i.id !== id
        ),
    }));
  };


  // ==========================================================
  // SCHEDULED PAYMENTS / CALENDAR
  // ==========================================================

  const handleAddScheduledPayment = (
    payment: Omit<
      ScheduledPayment,
      'id' | 'createdAt'
    >
  ) => {
    const newPayment:
      ScheduledPayment = {
      ...payment,
      id: `bill-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
    };

    setAppData((prev) => ({
      ...prev,
      scheduledPayments: [
        ...prev.scheduledPayments,
        newPayment,
      ],
    }));
  };


  const handleTogglePaymentPaid = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      scheduledPayments:
        prev.scheduledPayments.map(
          (p) =>
            p.id === id
              ? {
                  ...p,
                  isPaid: !p.isPaid,
                }
              : p
        ),
    }));
  };


  const handleDeleteScheduledPayment = (
    id: string
  ) => {
    setAppData((prev) => ({
      ...prev,
      scheduledPayments:
        prev.scheduledPayments.filter(
          (p) => p.id !== id
        ),
    }));
  };


  // ==========================================================
  // FINANCIAL COACH
  // ==========================================================

  const handleSendMessageToCoach = async (
    userText: string
  ) => {
    const cleanText =
      userText.trim();

    if (!cleanText) return;

    const userMsg: CoachMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: cleanText,
      timestamp:
        new Date().toISOString(),
    };

    const updatedMessages = [
      ...appData.coachMessages,
      userMsg,
    ];

    setAppData((prev) => ({
      ...prev,
      coachMessages:
        updatedMessages,
    }));

    setIsCoachLoading(true);

    const previousUserMessage =
      [...appData.coachMessages]
        .reverse()
        .find(
          (m) =>
            m.sender === 'user'
        )?.text || '';

    const combinedPendingExpenseText =
      previousUserMessage &&
      cebiIsExpense(
        previousUserMessage
      ) &&
      !cebiFindExpenseSource(
        previousUserMessage,
        appData.accounts,
        appData.creditCards
      )
        ? `${previousUserMessage} ${cleanText}`
        : '';

    const pendingExpenseText =
      combinedPendingExpenseText ||
      cleanText;


    // ========================================================
    // CLIENT-SIDE EXPENSE FALLBACK
    // ========================================================

    if (
      cebiIsExpense(
        pendingExpenseText
      )
    ) {
      const amount =
        cebiParseAmount(
          pendingExpenseText
        );

      const source =
        cebiFindExpenseSource(
          pendingExpenseText,
          appData.accounts,
          appData.creditCards
        );

      if (amount && source) {
        handleAddExpense({
          amount,
          category:
            cebiExpenseCategory(
              pendingExpenseText
            ) as any,
          date:
            new Date()
              .toISOString()
              .slice(0, 10),
          paymentSourceId:
            source.id,
          paymentSourceName:
            source.name,
          paymentSourceType:
            source.type as any,
          note:
            cebiBuildExpenseSummary(
              pendingExpenseText,
              cebiExpenseCategory(
                pendingExpenseText
              ),
              source.name
            ),
          isDebtPayment: false,
        });

        const msg:
          CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text:
            `✅ ${amount.toLocaleString(
              'tr-TR'
            )} ₺ ${cebiExpenseCategoryLabel(
              cebiExpenseCategory(
                pendingExpenseText
              )
            )} harcamasını ${source.name} üzerinden kaydettim.`,
          timestamp:
            new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            msg,
          ],
        }));

        setIsCoachLoading(false);
        return;
      }

      if (amount && !source) {
        const msg:
          CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text:
            'Harcama tutarını anladım. Hangi banka hesabı veya kredi kartından ödediğini de yazarsan hemen kaydedebilirim.',
          timestamp:
            new Date().toISOString(),
        };

        setAppData((prev) => ({
          ...prev,
          coachMessages: [
            ...prev.coachMessages,
            msg,
          ],
        }));

        setIsCoachLoading(false);
        return;
      }
    }


    // ========================================================
    // GEMINI API
    // ========================================================

    try {
      const apiBase =
        (
          import.meta.env.VITE_API_URL ||
          localStorage.getItem(
            'CEBI_API_URL'
          ) ||
          ''
        ).replace(/\/$/, '');

      const response =
        await fetch(
          `${apiBase}/api/coach`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              question: cleanText,
              message: cleanText,
              snapshot,
              accounts:
                appData.accounts,
              creditCards:
                appData.creditCards,
              loans:
                appData.loans,
              overdrafts:
                appData.overdrafts,
              otherDebts:
                appData.otherDebts,
              history:
                updatedMessages
                  .slice(-8)
                  .map((m) => ({
                    role:
                      m.sender ===
                      'user'
                        ? 'user'
                        : 'model',
                    text: m.text,
                  })),
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const result =
        await response.json();

      const action =
        result?.action;


      // ======================================================
      // AI — ADD EXPENSE
      // ======================================================

      if (
        action?.name ===
        'add_expense'
      ) {
        const args =
          action.args || {};

        const amount =
          Number(args.amount);

        if (
          !Number.isFinite(
            amount
          ) ||
          amount <= 0
        ) {
          throw new Error(
            'Geçersiz harcama tutarı.'
          );
        }

        const validCategories =
          [
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

        const categoryCandidate =
          String(
            args.category ||
              'diger'
          )
            .trim()
            .toLowerCase();

        const category:
          ValidExpenseCategory =
          validCategories.includes(
            categoryCandidate as ValidExpenseCategory
          )
            ? (categoryCandidate as ValidExpenseCategory)
            : 'diger';

        let paymentSourceId:
          | string
          | undefined;

        let paymentSourceName:
          | string
          | undefined;

        let paymentSourceType:
          | 'bank_account'
          | 'credit_card'
          | 'nakit'
          | 'diger' =
          'diger';

        if (
          args.paymentSourceType ===
          'bank_account'
        ) {
          const account =
            appData.accounts.find(
              (acc) =>
                acc.id ===
                String(
                  args.paymentSourceId
                )
            );

          if (!account) {
            throw new Error(
              'AI bir banka hesabı seçti fakat bu hesap CEBİ içinde bulunamadı.'
            );
          }

          paymentSourceType =
            'bank_account';

          paymentSourceId =
            account.id;

          paymentSourceName =
            `${account.bankName} - ${account.accountName}`;
        }

        else if (
          args.paymentSourceType ===
          'credit_card'
        ) {
          const card =
            appData.creditCards.find(
              (c) =>
                c.id ===
                String(
                  args.paymentSourceId
                )
            );

          if (!card) {
            throw new Error(
              'AI bir kredi kartı seçti fakat bu kart CEBİ içinde bulunamadı.'
            );
          }

          paymentSourceType =
            'credit_card';

          paymentSourceId =
            card.id;

          paymentSourceName =
            `${card.bank} - ${card.cardName}`;
        }

        else if (
          args.paymentSourceType ===
            'cash' ||
          args.paymentSourceType ===
            'nakit'
        ) {
          paymentSourceType =
            'nakit';

          paymentSourceName =
            'Nakit';
        }

        else {
          paymentSourceType =
            'diger';

          paymentSourceName =
            'Diğer';
        }

        const expenseDate =
          typeof args.date ===
            'string' &&
          args.date.trim()
            ? args.date.trim()
            : new Date()
                .toISOString()
                .slice(0, 10);

        const actionSummary =
          cebiBuildExpenseSummary(
            cleanText,
            category,
            paymentSourceName ||
              'Ödeme kaynağı belirtilmedi'
          );

        handleAddExpense({
          amount,
          category,
          date: expenseDate,
          paymentSourceId,
          paymentSourceName,
          paymentSourceType,
          note:
            actionSummary,
          isDebtPayment:
            false,
        });

        const formattedAmount =
          amount.toLocaleString(
            'tr-TR'
          );

        const confirmationMessage =
          paymentSourceType ===
          'credit_card'
            ? `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName} üzerinden kaydettim. Kredi kartı borcunu ve kullanılabilir limitini güncelledim.`
            : paymentSourceType ===
                'bank_account'
              ? `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName} üzerinden kaydettim. Hesap bakiyeni güncelledim.`
              : `✅ ${formattedAmount} ₺ ${category} harcamasını ${paymentSourceName || 'Diğer'} olarak kaydettim.`;

        const coachMsg:
          CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text:
            confirmationMessage,
          timestamp:
            new Date().toISOString(),
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


      // ======================================================
      // AI — ADD INCOME
      // ======================================================

      if (
        action?.name ===
        'add_income'
      ) {
        const args =
          action.args || {};

        const amount =
          Number(args.amount);

        if (
          !Number.isFinite(
            amount
          ) ||
          amount <= 0
        ) {
          throw new Error(
            'Geçersiz gelir tutarı.'
          );
        }

        const validIncomeCategories =
          [
            'maas',
            'avans',
            'freelance',
            'ticari',
            'kira',
            'diger',
          ] as const;

        type ValidIncomeCategory =
          (typeof validIncomeCategories)[number];

        const categoryCandidate =
          String(
            args.category ||
              'diger'
          )
            .trim()
            .toLowerCase();

        const category:
          ValidIncomeCategory =
          validIncomeCategories.includes(
            categoryCandidate as ValidIncomeCategory
          )
            ? (categoryCandidate as ValidIncomeCategory)
            : 'diger';

        const incomeName =
          typeof args.name ===
            'string' &&
          args.name.trim()
            ? args.name.trim()
            : 'AI Geliri';

        const targetAccountId =
          typeof args.targetAccountId ===
          'string'
            ? args.targetAccountId.trim()
            : '';

        if (!targetAccountId) {
          throw new Error(
            'Gelirin yatırılacağı banka hesabı belirtilmedi.'
          );
        }

        const account =
          appData.accounts.find(
            (acc) =>
              acc.id ===
              targetAccountId
          );

        if (!account) {
          throw new Error(
            'AI gelir hesabını seçti fakat bu banka hesabı CEBİ içinde bulunamadı.'
          );
        }

        const frequencyValues =
          [
            'monthly',
            'one_time',
            'biweekly',
            'weekly',
          ] as const;

        type ValidIncomeFrequency =
          (typeof frequencyValues)[number];

        const frequencyCandidate =
          String(
            args.frequency ||
              'one_time'
          )
            .trim()
            .toLowerCase();

        const frequency:
          ValidIncomeFrequency =
          frequencyValues.includes(
            frequencyCandidate as ValidIncomeFrequency
          )
            ? (frequencyCandidate as ValidIncomeFrequency)
            : 'one_time';

        const isRecurring =
          typeof args.isRecurring ===
          'boolean'
            ? args.isRecurring
            : frequency !==
              'one_time';

        const paymentDate =
          typeof args.paymentDate ===
            'string' &&
          args.paymentDate.trim()
            ? args.paymentDate.trim()
            : new Date()
                .toISOString()
                .slice(0, 10);

        let dayOfMonth:
          | number
          | undefined;

        if (
          args.dayOfMonth !==
            undefined &&
          args.dayOfMonth !== null
        ) {
          const parsedDay =
            Number(
              args.dayOfMonth
            );

          if (
            Number.isInteger(
              parsedDay
            ) &&
            parsedDay >= 1 &&
            parsedDay <= 31
          ) {
            dayOfMonth =
              parsedDay;
          }
        }

        if (
          dayOfMonth ===
            undefined &&
          isRecurring
        ) {
          const parsedDate =
            new Date(
              `${paymentDate}T00:00:00`
            );

          if (
            !Number.isNaN(
              parsedDate.getTime()
            )
          ) {
            dayOfMonth =
              parsedDate.getDate();
          }
        }

        handleAddIncome({
          name: incomeName,
          amount,
          frequency,
          dayOfMonth,
          category,
          paymentDate,
          isRecurring,
          targetAccountId,
          processedMonths: [],
        });

        const formattedAmount =
          amount.toLocaleString(
            'tr-TR'
          );

        const frequencyText =
          frequency ===
          'monthly'
            ? 'aylık'
            : frequency ===
                'weekly'
              ? 'haftalık'
              : frequency ===
                  'biweekly'
                ? 'iki haftada bir'
                : 'tek seferlik';

        const confirmationMessage =
          `✅ ${formattedAmount} ₺ ${incomeName} gelirini ${account.bankName} - ${account.accountName} hesabına ${frequencyText} olarak kaydettim.`;

        const coachMsg:
          CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text:
            confirmationMessage,
          timestamp:
            new Date().toISOString(),
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


      // ======================================================
      // AI — DEBT PAYMENT
      // ======================================================

      if (
        action?.name ===
        'make_debt_payment'
      ) {
        const args =
          action.args || {};

        const amount =
          Number(args.amount);

        if (
          !Number.isFinite(
            amount
          ) ||
          amount <= 0
        ) {
          throw new Error(
            'Geçersiz borç ödeme tutarı.'
          );
        }

        const debtType =
          String(
            args.debtType || ''
          )
            .trim()
            .toLowerCase();

        if (
          ![
            'card',
            'loan',
            'kmh',
            'other',
          ].includes(debtType)
        ) {
          throw new Error(
            'AI geçersiz bir borç türü gönderdi.'
          );
        }

        const debtId =
          String(
            args.debtId || ''
          ).trim();

        if (!debtId) {
          throw new Error(
            'AI borç ödeme için borç seçemedi.'
          );
        }

        let debtName =
          'Borç';

        if (
          debtType ===
          'card'
        ) {
          const card =
            appData.creditCards.find(
              (c) =>
                c.id === debtId
            );

          if (!card) {
            throw new Error(
              'AI bir kredi kartı borcu seçti fakat bu kart CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            `${card.bank} - ${card.cardName}`;
        }

        else if (
          debtType ===
          'loan'
        ) {
          const loan =
            appData.loans.find(
              (l) =>
                l.id === debtId
            );

          if (!loan) {
            throw new Error(
              'AI bir kredi borcu seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            `${loan.bank} - ${loan.loanName}`;
        }

        else if (
          debtType ===
          'kmh'
        ) {
          const overdraft =
            appData.overdrafts.find(
              (o) =>
                o.id === debtId
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

        else {
          const otherDebt =
            appData.otherDebts.find(
              (d) =>
                d.id === debtId
            );

          if (!otherDebt) {
            throw new Error(
              'AI bir diğer borç seçti fakat bu borç CEBİ içinde bulunamadı.'
            );
          }

          debtName =
            otherDebt.debtName;
        }

        let bankAccountId =
          String(
            args.bankAccountId ||
              ''
          ).trim();

        if (!bankAccountId) {
          bankAccountId =
            appData.accounts[0]?.id ||
            '';
        }

        if (!bankAccountId) {
          throw new Error(
            'Borç ödemesi için CEBİ içinde banka hesabı bulunamadı.'
          );
        }

        const bankAccount =
          appData.accounts.find(
            (acc) =>
              acc.id ===
              bankAccountId
          );

        if (!bankAccount) {
          throw new Error(
            'AI ödeme hesabını seçti fakat bu banka hesabı CEBİ içinde bulunamadı.'
          );
        }

        handleMakeDebtPayment(
          debtType as
            | 'card'
            | 'loan'
            | 'kmh'
            | 'other',
          debtId,
          amount,
          bankAccountId
        );

        const formattedAmount =
          amount.toLocaleString(
            'tr-TR'
          );

        const coachMsg:
          CoachMessage = {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text:
            `✅ ${formattedAmount} ₺ ${debtName} borcunu ${bankAccount.bankName} - ${bankAccount.accountName} hesabından ödedim. Ödeme hesabındaki bakiyeyi ve ilgili borcu güncelledim.`,
          timestamp:
            new Date().toISOString(),
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


      // ======================================================
      // NORMAL GEMINI RESPONSE
      // ======================================================

      const aiReply =
        result?.reply ||
        result?.answer ||
        'İşlemi anlayamadım. Biraz daha açık anlatır mısın?';

      const coachMsg:
        CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text: aiReply,
        timestamp:
          new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [
          ...prev.coachMessages,
          coachMsg,
        ],
      }));
    }

    catch (err) {
      console.error(
        'Coach API call failed, using client-side smart fallback:',
        err
      );

      let fallbackText =
        '';

      if (
        snapshot.hasCashShortfall
      ) {
        fallbackText =
          `**Durumun:** Şu an hesaplarında ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺ bulunurken, ay sonuna kadar ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödeme yükümlülüğün var.\n\n` +
          `**Dikkat etmen gereken:** Mevcut nakdinde ${snapshot.cashShortfall.toLocaleString('tr-TR')} ₺ açık bulunuyor. Bu nedenle bugünkü günlük güvenli harcama limitin **0 ₺**'dir.\n\n` +
          `**Bugün için:** Beklenen gelirlerin fiilen hesabına geçene kadar zorunlu olmayan tüm nakit harcamalarını durdurmalısın.\n\n` +
          `**Sonraki adım:** Gelirlerin yattığında planlanan günlük bütçen ${snapshot.plannedDailyBudget.toLocaleString('tr-TR')} ₺ / gün seviyesine gelecektir.`;
      }

      else if (
        cleanText.includes('5.000') ||
        cleanText
          .toLowerCase()
          .includes(
            'alışveriş'
          )
      ) {
        fallbackText =
          snapshot.isOverBudget
            ? `**Durumun:** Bu ay planlanan bütçeni ${snapshot.budgetDeficit.toLocaleString('tr-TR')} ₺ aştın.\n\n` +
              `**Dikkat etmen gereken:** 5.000 TL yeni harcama bütçe açığını daha da büyütecektir.\n\n` +
              `**Bugün için:** Bu harcamayı önümüzdeki aya ertelemeni tavsiye ederim.\n\n` +
              `**Sonraki adım:** Kalan günlerde zorunlu ödemelere odaklanalım.`
            : snapshot.dailySafeSpending >=
                5000 /
                  Math.max(
                    1,
                    snapshot.remainingDays
                  )
              ? `**Durumun:** Kullanılabilir bütçen ${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺ ve günlük güvenli harcaman ${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺.\n\n` +
                `**Dikkat etmen gereken:** Bu harcama sonrası kalan günlerdeki günlük limitin bir miktar düşecektir.\n\n` +
                `**Bugün için:** Acil bir ihtiyaçsa bütçen dahilinde karşılanabilir.\n\n` +
                `**Sonraki adım:** Harcama sonrası bütçeni yeniden kontrol et.`
              : `**Durumun:** Kalan bütçen (${snapshot.remainingBudget.toLocaleString('tr-TR')} ₺) bu harcama için sınırda.\n\n` +
                `**Dikkat etmen gereken:** 5.000 TL harcama ay sonunda nakit açığına yol açabilir.\n\n` +
                `**Bugün için:** Harcamayı bölmeyi veya ertelemeyi değerlendir.`;
      }

      else if (
        cleanText
          .toLowerCase()
          .includes('borç') ||
        cleanText
          .toLowerCase()
          .includes('önce')
      ) {
        fallbackText =
          `**Durumun:** Toplam kayıtlı borcun ${snapshot.totalDebt.toLocaleString('tr-TR')} ₺ seviyesindedir.\n\n` +
          `**Dikkat etmen gereken:** Faiz maliyeti en yüksek olan KMH ve kredi kartı dönem borçları ilk önceliğin olmalıdır.\n\n` +
          `**Bugün için:** Yaklaşan asgari ve taksit ödemelerini zamanında yaparak gecikme zammından korun.\n\n` +
          `**Sonraki adım:** Kalan serbest nakdini faizi en yüksek borca yönlendir.`;
      }

      else {
        fallbackText =
          `**Durumun:** Toplam kullanılabilir paran ${snapshot.totalBalance.toLocaleString('tr-TR')} ₺, bu ayki tüketim harcaman ${snapshot.monthlyExpenses.toLocaleString('tr-TR')} ₺.\n\n` +
          `**Dikkat etmen gereken:** Yaklaşan ${snapshot.upcomingPaymentsTotal.toLocaleString('tr-TR')} ₺ zorunlu ödemen için nakit ayrılmıştır.\n\n` +
          `**Bugün için:** Günlük güvenli harcama limitin **${snapshot.dailySafeSpending.toLocaleString('tr-TR')} ₺**'dir.\n\n` +
          `**Sonraki adım:** Bu harcama limitine sadık kalarak ayı bütçe içinde kapatabilirsin.`;
      }

      const coachMsg:
        CoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach',
        text:
          fallbackText,
        timestamp:
          new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        coachMessages: [
          ...prev.coachMessages,
          coachMsg,
        ],
      }));
    }

    finally {
      setIsCoachLoading(false);
    }
  };


  // ==========================================================
  // CLEAR COACH HISTORY
  // ==========================================================

  const handleClearCoachHistory =
    () => {
      setAppData((prev) => ({
        ...prev,
        coachMessages: [
          {
            id: 'msg-cleared',
            sender: 'coach',
            text:
              'Sohbet geçmişi temizlendi. Nasıl yardımcı olabilirim?',
            timestamp:
              new Date().toISOString(),
          },
        ],
      }));
    };


  // ==========================================================
  // RESET / ONBOARDING
  // ==========================================================

  const handleResetToDemo =
    () => {
      const demo =
        getInitialDemoData();

      setAppData(demo);
      saveAppData(demo);
    };


  const handleClearAllData =
    () => {
      const clean =
        getCleanEmptyData();

      setAppData(clean);
      saveAppData(clean);
    };


  const handleLoadSimulationScenario =
    () => {
      const simData =
        getSimulationScenarioData();

      setAppData(simData);
      saveAppData(simData);
    };


  // ==========================================================
  // QUICK START
  // ==========================================================

  const handleCompleteQuickStart =
    ({
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
      const newAccounts:
        BankAccount[] =
        initialBalance > 0
          ? [
              {
                id: `acc-${Date.now()}`,
                bankName:
                  'Ana Banka Hesabım',
                accountName:
                  'Vadesiz Hesap',
                accountType:
                  'vadesiz',
                balance:
                  initialBalance,
                createdAt:
                  new Date().toISOString(),
                updatedAt:
                  new Date().toISOString(),
              },
            ]
          : [];

      const newIncomes:
        Income[] =
        monthlyIncome > 0
          ? [
              {
                id: `inc-${Date.now()}`,
                name:
                  'Aylık Net Maaş',
                amount:
                  monthlyIncome,
                frequency:
                  'monthly',
                dayOfMonth: 1,
                category:
                  'maas',
                paymentDate:
                  '2026-09-01',
                isRecurring:
                  true,
                createdAt:
                  new Date().toISOString(),
              },
            ]
          : [];

      const newCards:
        CreditCard[] =
        initialDebt > 0
          ? [
              {
                id: `card-${Date.now()}`,
                bank: 'Banka',
                cardName:
                  'Kredi Kartı',
                limit:
                  initialDebt * 2,
                availableLimit:
                  initialDebt,
                currentDebt:
                  initialDebt,
                statementDebt:
                  initialDebt,
                minimumPayment:
                  Math.round(
                    initialDebt *
                      0.2
                  ),
                paymentDueDate:
                  '2026-09-25',
                createdAt:
                  new Date().toISOString(),
                updatedAt:
                  new Date().toISOString(),
              },
            ]
          : [];

      const initializedData:
        AppData = {
        profile: {
          name,
          hasCompletedOnboarding:
            true,
          currency:
            'TRY',
          createdAt:
            new Date().toISOString(),
        },

        accounts:
          newAccounts,

        creditCards:
          newCards,

        loans: [],

        overdrafts: [],

        otherDebts: [],

        incomes:
          newIncomes,

        expenses: [],

        scheduledPayments: [],

        coachMessages: [
          {
            id: 'msg-start',
            sender:
              'coach',
            text:
              `Merhaba ${name}! CEBİ'ye hoş geldin. Bilgilerin sisteme kaydedildi. Artık günlük güvenli harcama sınırını takip edebilir, harcamalarını kaydedebilir ve aklına takılan her şeyi bana sorabilirsin.`,
            timestamp:
              new Date().toISOString(),
          },
        ],

        version: 1,
      };

      setAppData(
        initializedData
      );

      saveAppData(
        initializedData
      );
    };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">

      <style>{`
        .bg-slate-900 .text-slate-900,
        .bg-slate-950 .text-slate-900,
        .bg-slate-900 .text-slate-800,
        .bg-slate-950 .text-slate-800,
        .bg-slate-900 .text-slate-700,
        .bg-slate-950 .text-slate-700 {
          color: #f8fafc !important;
        }

        .bg-slate-900 .text-slate-600,
        .bg-slate-950 .text-slate-600 {
          color: #cbd5e1 !important;
        }
      `}</style>


      <style>{`
        .cebi-dashboard-shell {
          overflow-x: hidden;
        }

        .cebi-dashboard-shell * {
          min-width: 0;
        }

        .cebi-dashboard-shell [class*="text-right"] {
          min-width: 0 !important;
          max-width: 100% !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }

        .cebi-dashboard-shell [class*="bg-slate-900"],
        .cebi-dashboard-shell [class*="bg-slate-950"],
        .cebi-dashboard-shell [class*="bg-[#0f172a]"],
        .cebi-dashboard-shell [class*="bg-[#111827]"] {
          color: #ffffff !important;
        }

        .cebi-dashboard-shell
          [class*="bg-slate-900"]
          [class*="text-slate-900"],
        .cebi-dashboard-shell
          [class*="bg-slate-950"]
          [class*="text-slate-900"],
        .cebi-dashboard-shell
          [class*="bg-[#0f172a]"]
          [class*="text-slate-900"],
        .cebi-dashboard-shell
          [class*="bg-[#111827]"]
          [class*="text-slate-900"] {
          color: #ffffff !important;
        }

        .cebi-mobile-brand {
          display: none;
        }

        @media (max-width: 640px) {
          .cebi-mobile-brand {
            display: block;
            position: absolute;
            top: 22px;
            left: 82px;
            z-index: 40;
            font-weight: 800;
            font-size: 16px;
            line-height: 1.1;
            color: #0f1b33;
            pointer-events: none;
          }
        }
      `}</style>


      <div className="cebi-mobile-brand">
        CEBİ Finans Koçu
      </div>


      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickExpense={() =>
          setIsQuickExpenseOpen(true)
        }
        dailySafeSpending={
          snapshot.dailySafeSpending
        }
        isOverBudget={
          snapshot.isOverBudget
        }
        hasCashShortfall={
          snapshot.hasCashShortfall
        }
        totalBalance={
          snapshot.totalBalance
        }
      />


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ==================================================
            RECEIPT SCAN BUTTON
        =================================================== */}

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              setIsReceiptScannerOpen(
                true
              )
            }
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Receipt className="h-4 w-4" />

            Fiş Tara
          </button>
        </div>


        {/* ==================================================
            DASHBOARD
        =================================================== */}

        {currentTab ===
          'dashboard' && (
          <div className="cebi-dashboard-shell">
            <DashboardView
              snapshot={snapshot}
              expenses={
                appData.expenses
              }
              accounts={
                appData.accounts
              }
              incomes={
                appData.incomes
              }
              scheduledPayments={
                appData.scheduledPayments
              }
              onSelectTab={
                handleSelectTab
              }
              onOpenQuickExpense={() =>
                setIsQuickExpenseOpen(
                  true
                )
              }
            />
          </div>
        )}


        {/* ==================================================
            EXPENSES
        =================================================== */}

        {currentTab ===
          'expenses' && (
          <ExpensesView
            expenses={
              appData.expenses
            }
            accounts={
              appData.accounts
            }
            creditCards={
              appData.creditCards
            }
            onAddExpense={
              handleAddExpense
            }
            onUpdateExpense={
              handleUpdateExpense
            }
            onDeleteExpense={
              handleDeleteExpense
            }
            onOpenQuickExpense={() =>
              setIsQuickExpenseOpen(
                true
              )
            }
          />
        )}


        {/* ==================================================
            DEBTS
        =================================================== */}

        {currentTab ===
          'debts' && (
          <DebtsView
            creditCards={
              appData.creditCards
            }
            loans={
              appData.loans
            }
            overdrafts={
              appData.overdrafts
            }
            otherDebts={
              appData.otherDebts
            }
            snapshot={
              snapshot
            }
            accounts={
              appData.accounts
            }
            onMakeDebtPayment={
              handleMakeDebtPayment
            }
            onAddCreditCard={
              handleAddCreditCard
            }
            onUpdateCreditCard={
              handleUpdateCreditCard
            }
            onDeleteCreditCard={
              handleDeleteCreditCard
            }
            onAddLoan={
              handleAddLoan
            }
            onUpdateLoan={
              handleUpdateLoan
            }
            onDeleteLoan={
              handleDeleteLoan
            }
            onAddOverdraft={
              handleAddOverdraft
            }
            onUpdateOverdraft={
              handleUpdateOverdraft
            }
            onDeleteOverdraft={
              handleDeleteOverdraft
            }
            onAddOtherDebt={
              handleAddOtherDebt
            }
            onUpdateOtherDebt={
              handleUpdateOtherDebt
            }
            onDeleteOtherDebt={
              handleDeleteOtherDebt
            }
          />
        )}


        {/* ==================================================
            ACCOUNTS
        =================================================== */}

        {currentTab ===
          'accounts' && (
          <AccountsView
            accounts={
              appData.accounts
            }
            incomes={
              appData.incomes
            }
            onAddAccount={
              handleAddAccount
            }
            onUpdateAccount={
              handleUpdateAccount
            }
            onDeleteAccount={
              handleDeleteAccount
            }
            onAddIncome={
              handleAddIncome
            }
            onUpdateIncome={
              handleUpdateIncome
            }
            onDeleteIncome={
              handleDeleteIncome
            }
          />
        )}


        {/* ==================================================
            CALENDAR
        =================================================== */}

        {currentTab ===
          'calendar' && (
          <CalendarView
            snapshot={
              snapshot
            }
            scheduledPayments={
              appData.scheduledPayments
            }
            onAddScheduledPayment={
              handleAddScheduledPayment
            }
            onTogglePaymentPaid={
              handleTogglePaymentPaid
            }
            onDeleteScheduledPayment={
              handleDeleteScheduledPayment
            }
          />
        )}


        {/* ==================================================
            REPORTS
        =================================================== */}

        {currentTab ===
          'reports' && (
          <ReportsView
            snapshot={
              snapshot
            }
            expenses={
              appData.expenses
            }
          />
        )}


        {/* ==================================================
            FINANCIAL COACH
        =================================================== */}

        {currentTab ===
          'coach' && (
          <CoachView
            snapshot={
              snapshot
            }
            messages={
              appData.coachMessages
            }
            onSendMessage={
              handleSendMessageToCoach
            }
            onClearHistory={
              handleClearCoachHistory
            }
            isLoading={
              isCoachLoading
            }
          />
        )}

      </main>


      {/* =====================================================
          QUICK EXPENSE MODAL
      ====================================================== */}

      <QuickExpenseModal
        isOpen={
          isQuickExpenseOpen
        }
        onClose={() =>
          setIsQuickExpenseOpen(
            false
          )
        }
        onAddExpense={
          handleAddExpense
        }
        accounts={
          appData.accounts
        }
        creditCards={
          appData.creditCards
        }
      />


      {/* =====================================================
          ONBOARDING MODAL
      ====================================================== */}

      <OnboardingModal
        isOpen={
          !appData.profile
            .hasCompletedOnboarding
        }
        onCompleteQuickStart={
          handleCompleteQuickStart
        }
        onLoadDemoData={
          handleResetToDemo
        }
        onStartFresh={
          handleClearAllData
        }
      />


      {/* =====================================================
          SETTINGS MODAL
      ====================================================== */}

      <SettingsModal
        isOpen={
          isSettingsOpen
        }
        onClose={() =>
          setIsSettingsOpen(
            false
          )
        }
        onResetDemo={
          handleResetToDemo
        }
        onClearAll={
          handleClearAllData
        }
        onLoadSimulationScenario={
          handleLoadSimulationScenario
        }
        onDataImported={() =>
          setAppData(
            loadAppData()
          )
        }
      />


      {/* =====================================================
          RECEIPT SCANNER
      ====================================================== */}

      {isReceiptScannerOpen && (
        <ReceiptScanner
          onReceiptScanned={
            handleReceiptScanned
          }
          onClose={() =>
            setIsReceiptScannerOpen(
              false
            )
          }
        />
      )}


      {/* =====================================================
          RECEIPT PREVIEW / OCR RESULT
      ====================================================== */}

      {receiptImageData && (
        <ReceiptPreview
          imageData={
            receiptImageData
          }
          onConfirm={
            handleReceiptConfirm
          }
          onClose={
            handleReceiptPreviewClose
          }
        />
      )}

    </div>
  );
}
