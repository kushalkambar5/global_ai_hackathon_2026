CREATE TABLE "general_patterns" (
	"pattern_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern" real[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "general_patterns_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "today_patterns" (
	"pattern_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern" real[] NOT NULL,
	"pattern_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_user_pattern_date" UNIQUE("user_id","pattern_date")
);
--> statement-breakpoint
ALTER TABLE "general_patterns" ADD CONSTRAINT "general_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "today_patterns" ADD CONSTRAINT "today_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;