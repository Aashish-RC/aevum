CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brain_id" uuid,
	"key_hash" text NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event" varchar(50) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"scope" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "jwks_key" (
	"kid" varchar(50) PRIMARY KEY NOT NULL,
	"kty" varchar(10) NOT NULL,
	"public_key_pem" text NOT NULL,
	"private_key_encrypted" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"scopes_granted" text[] DEFAULT '{}'::text[] NOT NULL,
	"scopes_requested" text[] DEFAULT '{}'::text[] NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	CONSTRAINT "oauth_link_provider_user_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "product_registration" (
	"product_id" varchar(50) PRIMARY KEY NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"webhook_url" text,
	"allowed_scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_ai" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tone" varchar(20) DEFAULT 'balanced' NOT NULL,
	"formality" varchar(20) DEFAULT 'neutral' NOT NULL,
	"preferred_modalities" text[] DEFAULT ARRAY['text']::text[] NOT NULL,
	"expertise_level" varchar(20) DEFAULT 'intermediate' NOT NULL,
	"preferred_response_language" varchar(10),
	"custom_instructions" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"device_id" varchar(255),
	"user_agent" text,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"dek_wrapped" "bytea",
	"dek_version" integer DEFAULT 1 NOT NULL,
	"dek_created_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_link" ADD CONSTRAINT "oauth_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_ai" ADD CONSTRAINT "profile_ai_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;