-- Baby Tracker Database Schema for Turso
-- Based on Prisma schema

-- Users table (for NextAuth.js)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    emailVerified DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table (for NextAuth.js OAuth)
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table (for NextAuth.js)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Verification tokens table (for NextAuth.js)
CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires DATETIME NOT NULL
);

-- Babies table
CREATE TABLE babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    baby_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    birthday DATETIME NOT NULL,
    description TEXT,
    avatar TEXT,
    isPublic BOOLEAN DEFAULT 0,
    inviteCode TEXT UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Baby access permissions table
CREATE TABLE baby_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    canEdit BOOLEAN DEFAULT 1,
    canView BOOLEAN DEFAULT 1,
    canInvite BOOLEAN DEFAULT 0,
    canManage BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    recorder INTEGER NOT NULL,
    type TEXT NOT NULL,
    subtype TEXT,
    from_date DATETIME NOT NULL,
    to_date DATETIME,
    unit TEXT,
    amount REAL,
    category TEXT,
    details TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorder) REFERENCES users(id)
);

-- Create unique constraints
CREATE UNIQUE INDEX accounts_provider_provider_account_id_key ON accounts(provider, provider_account_id);
CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON verification_tokens(identifier, token);
CREATE UNIQUE INDEX baby_access_baby_id_user_id_key ON baby_access(baby_id, user_id);

-- Create performance indexes
CREATE INDEX idx_babies_owner_id ON babies(owner_id);
CREATE INDEX idx_baby_access_baby_id ON baby_access(baby_id);
CREATE INDEX idx_baby_access_user_id ON baby_access(user_id);
CREATE INDEX idx_activities_baby_id ON activities(baby_id);
CREATE INDEX idx_activities_recorder ON activities(recorder);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_from_date ON activities(from_date);