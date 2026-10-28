ALTER TABLE "posts" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "edited_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_version_check" CHECK ("posts"."version" >= 1);