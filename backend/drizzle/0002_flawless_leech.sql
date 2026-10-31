CREATE TYPE "public"."chat_sender" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TABLE "ai_chats" (
	"chat_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chat_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_user_ai_chat" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "conversation_transcription" text;--> statement-breakpoint
ALTER TABLE "ai_chats" ADD CONSTRAINT "ai_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;