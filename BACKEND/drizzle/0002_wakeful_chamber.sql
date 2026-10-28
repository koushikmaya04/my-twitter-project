ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_small_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_large_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL;