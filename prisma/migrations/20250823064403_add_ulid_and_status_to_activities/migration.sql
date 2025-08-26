-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_activities" (
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
INSERT INTO "new_activities" ("amount", "baby_id", "category", "createdAt", "details", "from_date", "id", "recorder", "subtype", "to_date", "type", "unit", "updatedAt") SELECT "amount", "baby_id", "category", "createdAt", "details", "from_date", "id", "recorder", "subtype", "to_date", "type", "unit", "updatedAt" FROM "activities";
DROP TABLE "activities";
ALTER TABLE "new_activities" RENAME TO "activities";
CREATE UNIQUE INDEX "activities_ulid_key" ON "activities"("ulid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
