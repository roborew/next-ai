-- Cards created before card sets were related cannot be adopted automatically,
-- so the orphaned dev rows are cleared before the NOT NULL column is added.
DELETE FROM "cards";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "card_set_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_card_set_id_card_sets_id_fkey" FOREIGN KEY ("card_set_id") REFERENCES "card_sets"("id") ON DELETE CASCADE;
