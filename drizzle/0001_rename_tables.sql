-- Rename all tables from ai-app-template_* to fouroneone_*
ALTER TABLE "ai-app-template_account" RENAME TO "fouroneone_account";
ALTER TABLE "ai-app-template_chat" RENAME TO "fouroneone_chat";
ALTER TABLE "ai-app-template_message" RENAME TO "fouroneone_message";
ALTER TABLE "ai-app-template_request" RENAME TO "fouroneone_request";
ALTER TABLE "ai-app-template_session" RENAME TO "fouroneone_session";
ALTER TABLE "ai-app-template_user" RENAME TO "fouroneone_user";
ALTER TABLE "ai-app-template_verification_token" RENAME TO "fouroneone_verification_token";

-- Update foreign key constraints
ALTER TABLE "fouroneone_account" DROP CONSTRAINT "ai-app-template_account_user_id_ai-app-template_user_id_fk";
ALTER TABLE "fouroneone_account" ADD CONSTRAINT "fouroneone_account_user_id_fouroneone_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "fouroneone_user"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "fouroneone_chat" DROP CONSTRAINT "ai-app-template_chat_user_id_ai-app-template_user_id_fk";
ALTER TABLE "fouroneone_chat" ADD CONSTRAINT "fouroneone_chat_user_id_fouroneone_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "fouroneone_user"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "fouroneone_message" DROP CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk";
ALTER TABLE "fouroneone_message" ADD CONSTRAINT "fouroneone_message_chat_id_fouroneone_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "fouroneone_chat"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "fouroneone_request" DROP CONSTRAINT "ai-app-template_request_user_id_ai-app-template_user_id_fk";
ALTER TABLE "fouroneone_request" ADD CONSTRAINT "fouroneone_request_user_id_fouroneone_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "fouroneone_user"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "fouroneone_session" DROP CONSTRAINT "ai-app-template_session_user_id_ai-app-template_user_id_fk";
ALTER TABLE "fouroneone_session" ADD CONSTRAINT "fouroneone_session_user_id_fouroneone_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "fouroneone_user"("id") ON DELETE no action ON UPDATE no action;

-- Update primary key constraints
ALTER TABLE "fouroneone_account" DROP CONSTRAINT "ai-app-template_account_provider_provider_account_id_pk";
ALTER TABLE "fouroneone_account" ADD CONSTRAINT "fouroneone_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id");

ALTER TABLE "fouroneone_verification_token" DROP CONSTRAINT "ai-app-template_verification_token_identifier_token_pk";
ALTER TABLE "fouroneone_verification_token" ADD CONSTRAINT "fouroneone_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token");