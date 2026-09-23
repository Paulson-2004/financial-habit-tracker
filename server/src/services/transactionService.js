import { AppError } from '../utils/AppError.js';
import * as transactionsDb from '../db/queries/transactions.js';
import * as categoriesDb from '../db/queries/categories.js';
import { computeCategoryPercent, computeNetSavings, computeSavingsRate } from '../calc/summary.js';
import { currentMonth, monthEnd, monthEndExclusive, monthStart } from '../utils/dates.js';

function toPublicTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    date: row.transactionDate,
    category: { id: row.categoryId, name: row.categoryName, color: row.categoryColor },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Throws 400 VALIDATION_ERROR if categoryId isn't usable by this user or doesn't match `type`. */
async function assertCategoryMatchesType(userId, categoryId, type) {
  const category = await categoriesDb.findUsableCategory(categoryId, userId);
  if (!category || category.type !== type) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid category for this transaction type.', [
      { field: 'categoryId', message: 'Choose a category that matches the transaction type.' },
    ]);
  }
}

export async function listCategories(type) {
  // categoriesDb.listCategories also accepts a userId for future per-user categories;
  // Day 2 only has system categories, so no user filtering is needed here yet.
  return categoriesDb.listCategories(null, { type });
}

export async function listTransactions(userId, query) {
  const { month, startDate, endDate, ...rest } = query;
  // listTransactions' filters compare with <= (see db/queries/transactions.js buildFilters),
  // so a month resolves to its inclusive last day here - NOT monthEndExclusive, which
  // would wrongly also match the 1st of the following month.
  const range = month ? { startDate: monthStart(month), endDate: monthEnd(month) } : { startDate, endDate };

  const { rows, total, totals } = await transactionsDb.listTransactions(userId, { ...rest, ...range });
  const { page, pageSize } = query;

  return {
    data: rows.map(toPublicTransaction),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    totals: {
      income: totals.income,
      expenses: totals.expenses,
      netSavings: computeNetSavings(totals.income, totals.expenses),
    },
  };
}

export async function getTransaction(userId, id) {
  const row = await transactionsDb.findTransactionById(userId, id);
  // Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Transaction not found.');
  return toPublicTransaction(row);
}

export async function createTransaction(userId, body) {
  await assertCategoryMatchesType(userId, body.categoryId, body.type);
  const id = await transactionsDb.insertTransaction(userId, body);
  return getTransaction(userId, id);
}

export async function updateTransaction(userId, id, body) {
  await assertCategoryMatchesType(userId, body.categoryId, body.type);
  const updatedId = await transactionsDb.updateTransactionById(userId, id, body);
  if (!updatedId) throw new AppError(404, 'NOT_FOUND', 'Transaction not found.');
  return getTransaction(userId, updatedId);
}

export async function deleteTransaction(userId, id) {
  const deleted = await transactionsDb.deleteTransactionById(userId, id);
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Transaction not found.');
}

/** Splits the flat category-totals rows into ranked incomeByCategory/expensesByCategory arrays. */
function splitCategoryBreakdown(categoryRows, income, expenses) {
  const incomeByCategory = [];
  const expensesByCategory = [];

  for (const row of categoryRows) {
    const bucket = row.type === 'income' ? incomeByCategory : expensesByCategory;
    const typeTotal = row.type === 'income' ? income : expenses;
    bucket.push({
      categoryId: row.categoryId,
      name: row.name,
      color: row.color,
      amount: row.amount,
      percent: computeCategoryPercent(row.amount, typeTotal),
    });
  }
  return { incomeByCategory, expensesByCategory };
}

export async function getMonthlySummary(userId, month = currentMonth()) {
  const startDate = monthStart(month);
  const endDate = monthEndExclusive(month);

  const [totals, categoryRows] = await Promise.all([
    transactionsDb.getMonthlyTotals(userId, startDate, endDate),
    transactionsDb.getMonthlyCategoryTotals(userId, startDate, endDate),
  ]);

  const { income, expenses, transactionCount } = totals;
  const netSavings = computeNetSavings(income, expenses);
  const { incomeByCategory, expensesByCategory } = splitCategoryBreakdown(categoryRows, income, expenses);

  return {
    month,
    income,
    expenses,
    netSavings,
    savingsRate: computeSavingsRate(income, netSavings),
    transactionCount,
    incomeByCategory,
    expensesByCategory,
  };
}
