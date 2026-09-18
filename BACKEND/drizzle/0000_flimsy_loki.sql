CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_handle_normalized" CHECK ("users"."handle" = LOWER(BTRIM("users"."handle"))),
	CONSTRAINT "users_handle_nonempty" CHECK (BTRIM("users"."handle") <> ''),
	CONSTRAINT "users_display_name_nonempty" CHECK (BTRIM("users"."display_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"text" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"reply_to_id" uuid,
	"repost_of_id" uuid,
	CONSTRAINT "posts_kind_check" CHECK ("posts"."kind" IN ('original', 'reply', 'repost')),
	CONSTRAINT "posts_kind_relationship_check" CHECK ((
        ("posts"."kind" = 'original'
          AND "posts"."reply_to_id" IS NULL
          AND "posts"."repost_of_id" IS NULL)

        OR

        ("posts"."kind" = 'reply'
          AND "posts"."reply_to_id" IS NOT NULL
          AND "posts"."repost_of_id" IS NULL)

        OR

        ("posts"."kind" = 'repost'
          AND "posts"."reply_to_id" IS NULL
          AND "posts"."repost_of_id" IS NOT NULL)
      )),
	CONSTRAINT "posts_text_check" CHECK ((
        (
          "posts"."kind" IN ('original', 'reply')
          AND "posts"."text" IS NOT NULL
          AND "posts"."text" = BTRIM("posts"."text")
          AND CHAR_LENGTH("posts"."text") BETWEEN 1 AND 280
        )
        OR
        (
          "posts"."kind" = 'repost'
          AND "posts"."text" IS NULL
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"small_url" text NOT NULL,
	"large_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt_text" text NOT NULL,
	CONSTRAINT "post_media_position_unique" UNIQUE("post_id","position"),
	CONSTRAINT "post_media_position_check" CHECK ("post_media"."position" BETWEEN 0 AND 3),
	CONSTRAINT "post_media_width_check" CHECK ("post_media"."width" > 0),
	CONSTRAINT "post_media_height_check" CHECK ("post_media"."height" > 0),
	CONSTRAINT "post_media_small_url_check" CHECK (BTRIM("post_media"."small_url") <> ''),
	CONSTRAINT "post_media_large_url_check" CHECK (BTRIM("post_media"."large_url") <> ''),
	CONSTRAINT "post_media_alt_text_check" CHECK (BTRIM("post_media"."alt_text") <> '')
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follows_no_self_follow" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reply_to_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_repost_of_fk" FOREIGN KEY ("repost_of_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_author_feed_idx" ON "posts" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_reply_idx" ON "posts" USING btree ("reply_to_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_repost_idx" ON "posts" USING btree ("repost_of_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "posts_unique_user_repost" ON "posts" USING btree ("author_id","repost_of_id") WHERE "posts"."kind" = 'repost';--> statement-breakpoint
CREATE INDEX "likes_post_idx" ON "likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");