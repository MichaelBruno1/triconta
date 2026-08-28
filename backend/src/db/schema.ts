import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 10 }).notNull().default('💰'),
  isDefault: boolean('is_default').notNull().default(false),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  paidById: uuid('paid_by').notNull().references(() => members.id),
  description: varchar('description', { length: 500 }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  expenseDate: date('expense_date').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  splitType: varchar('split_type', { length: 20 }).notNull().default('equal'),
  installments: integer('installments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const expenseSplits = pgTable('expense_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id),
  amountCents: integer('amount_cents').notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
});

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  fromMemberId: uuid('from_member_id').notNull().references(() => members.id),
  toMemberId: uuid('to_member_id').notNull().references(() => members.id),
  amountCents: integer('amount_cents').notNull(),
  settlementDate: date('settlement_date').notNull(),
  notes: varchar('notes', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(members),
  expenses: many(expenses),
  categories: many(categories),
  settlements: many(settlements),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  group: one(groups, { fields: [members.groupId], references: [groups.id] }),
  expensesPaid: many(expenses),
  splits: many(expenseSplits),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  paidBy: one(members, { fields: [expenses.paidById], references: [members.id] }),
  category: one(categories, { fields: [expenses.categoryId], references: [categories.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  member: one(members, { fields: [expenseSplits.memberId], references: [members.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
  fromMember: one(members, { fields: [settlements.fromMemberId], references: [members.id] }),
  toMember: one(members, { fields: [settlements.toMemberId], references: [members.id] }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  group: one(groups, { fields: [categories.groupId], references: [groups.id] }),
}));
