import type { UIMessage } from "ai";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export { user, session, account, verification } from "./auth-schema";

export const cardSets = pgTable("card_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardSetId: uuid("card_set_id")
    .notNull()
    .references(() => cardSets.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// One conversation per user: the whole history lives in a single jsonb column,
// capped at the newest 20 messages on save.
export const chatHistory = pgTable("chat_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  messages: jsonb("messages").$type<UIMessage[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
