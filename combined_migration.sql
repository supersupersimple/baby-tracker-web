-- Combined migration for Turso database
-- Creates all tables needed for the baby tracker application

-- CreateTable: users
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: accounts (NextAuth.js)
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: sessions (NextAuth.js)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: verification_tokens (NextAuth.js)
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable: babies
CREATE TABLE "babies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "owner_id" INTEGER NOT NULL,
    "baby_name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthday" DATETIME NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "babies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: baby_access
CREATE TABLE "baby_access" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "baby_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canInvite" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "baby_access_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "baby_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: activities
CREATE TABLE "activities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ulid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "baby_id" INTEGER NOT NULL,
    "recorder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "from_date" DATETIME NOT NULL,
    "to_date" DATETIME,
    "unit" TEXT,
    "amount" REAL,
    "category" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "activities_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activities_recorder_fkey" FOREIGN KEY ("recorder") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "babies_inviteCode_key" ON "babies"("inviteCode");
CREATE UNIQUE INDEX "baby_access_baby_id_user_id_key" ON "baby_access"("baby_id", "user_id");
CREATE UNIQUE INDEX "activities_baby_id_ulid_key" ON "activities"("baby_id", "ulid");