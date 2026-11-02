ALTER TABLE "sessions" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;