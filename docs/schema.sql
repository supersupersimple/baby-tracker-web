-- Baby Tracker Database Schema
-- Generated from Prisma schema

-- Users table - records website users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Babies table - records baby info and which user created this baby
CREATE TABLE babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    baby_name TEXT NOT NULL,
    gender TEXT NOT NULL, -- 'male', 'female', 'other'
    birthday DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table - records baby activities like feeding/sleeping
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    recorder INTEGER NOT NULL, -- user id who recorded this activity
    type TEXT NOT NULL, -- 'FEEDING', 'SLEEPING', 'DIAPERING', 'GROWTH', 'HEALTH', 'LEISURE'
    subtype TEXT, -- 'BOTTLE', 'MEAL', 'PEE', 'PEEPOO', 'GROWTH_WEIGHT', 'HEALTH_MEDICATIONS', 'LEISURE_TUMMY', etc.
    from_date DATETIME NOT NULL,
    to_date DATETIME,
    unit TEXT, -- 'MILLILITRES', 'OUNCES', 'KILOGRAMS', 'CENTIMETERS', 'CELSIUS', 'NONE'
    amount REAL, -- quantity: 160.0 (ML), 3.5 (kg), 37.5 (°C), etc.
    category TEXT, -- 'FORMULA', 'BREAST_MILK', 'NONE'
    details TEXT, -- free text field
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorder) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_babies_user_id ON babies(user_id);
CREATE INDEX idx_activities_baby_id ON activities(baby_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_from_date ON activities(from_date);
CREATE INDEX idx_activities_recorder ON activities(recorder);

-- Sample data insertion queries

-- Insert sample users
INSERT INTO users (email) VALUES 
('parent1@example.com'),
('parent2@example.com');

-- Insert sample babies
INSERT INTO babies (user_id, baby_name, gender, birthday) VALUES
(1, 'Emma', 'female', '2024-01-15'),
(2, 'Oliver', 'male', '2024-03-22');

-- Insert sample activities
INSERT INTO activities (baby_id, recorder, type, subtype, from_date, to_date, unit, amount, category, details) VALUES
-- Feeding activities
(1, 1, 'FEEDING', 'BOTTLE', '2024-07-29 08:00:00', '2024-07-29 08:20:00', 'MILLILITRES', 120.0, 'FORMULA', 'Morning feeding - good appetite'),
(1, 1, 'FEEDING', 'MEAL', '2024-07-29 12:00:00', NULL, 'NONE', NULL, 'NONE', 'Pureed carrots and sweet potato'),
(1, 1, 'FEEDING', 'LEFT_BREAST', '2024-07-29 15:00:00', '2024-07-29 15:15:00', 'NONE', NULL, 'BREAST_MILK', 'Afternoon feeding session'),

-- Sleeping activities
(1, 1, 'SLEEPING', 'NONE', '2024-07-29 09:00:00', '2024-07-29 10:30:00', 'NONE', NULL, 'NONE', 'Morning nap in crib'),

-- Diapering activities
(1, 1, 'DIAPERING', 'PEE', '2024-07-29 08:25:00', NULL, 'NONE', NULL, 'NONE', 'After feeding'),
(1, 1, 'DIAPERING', 'POO', '2024-07-29 14:00:00', NULL, 'NONE', NULL, 'NONE', 'Normal consistency'),
(1, 1, 'DIAPERING', 'PEEPOO', '2024-07-29 16:30:00', NULL, 'NONE', NULL, 'NONE', 'Both wet and soiled'),

-- Growth activities
(1, 1, 'GROWTH', 'GROWTH_WEIGHT', '2024-07-29 10:00:00', NULL, 'KILOGRAMS', 3.5, 'NONE', 'Weekly weigh-in'),
(1, 1, 'GROWTH', 'GROWTH_HEIGHT', '2024-07-29 10:05:00', NULL, 'CENTIMETERS', 52.3, 'NONE', 'Height measurement'),
(1, 1, 'GROWTH', 'GROWTH_HEAD', '2024-07-29 10:10:00', NULL, 'CENTIMETERS', 35.2, 'NONE', 'Head circumference check'),

-- Health activities
(1, 1, 'HEALTH', 'HEALTH_MEDICATIONS', '2024-07-29 08:00:00', NULL, 'NONE', NULL, 'NONE', 'Daily vitamin D drops'),
(1, 1, 'HEALTH', 'HEALTH_TEMPERATURE', '2024-07-29 18:00:00', NULL, 'CELSIUS', 37.2, 'NONE', 'Evening temperature check'),
(1, 1, 'HEALTH', 'HEALTH_VACCINATIONS', '2024-07-29 11:00:00', NULL, 'NONE', NULL, 'NONE', '2-month vaccination appointment'),

-- Leisure activities
(1, 1, 'LEISURE', 'LEISURE_TUMMY', '2024-07-29 13:00:00', '2024-07-29 13:10:00', 'NONE', NULL, 'NONE', 'Daily tummy time session'),
(1, 1, 'LEISURE', 'LEISURE_BATH', '2024-07-29 19:00:00', '2024-07-29 19:15:00', 'NONE', NULL, 'NONE', 'Evening bath before bed'),
(1, 1, 'LEISURE', 'LEISURE_WALK', '2024-07-29 16:00:00', '2024-07-29 16:30:00', 'NONE', NULL, 'NONE', 'Afternoon stroller walk in park');

-- Useful queries for reporting

-- Get all activities for a baby on a specific date
-- SELECT * FROM activities 
-- WHERE baby_id = 1 
-- AND date(from_date) = '2024-07-29' 
-- ORDER BY from_date;

-- Get feeding summary for a baby
-- SELECT 
--     date(from_date) as feed_date,
--     COUNT(*) as feeding_count,
--     SUM(amount) as total_amount,
--     unit
-- FROM activities 
-- WHERE baby_id = 1 AND type = 'FEEDING' AND amount IS NOT NULL
-- GROUP BY date(from_date), unit;

-- Get sleep duration for a baby
-- SELECT 
--     date(from_date) as sleep_date,
--     SUM(
--         CASE 
--             WHEN to_date IS NOT NULL 
--             THEN (julianday(to_date) - julianday(from_date)) * 24 * 60 
--             ELSE 0 
--         END
--     ) as total_sleep_minutes
-- FROM activities 
-- WHERE baby_id = 1 AND type = 'SLEEPING'
-- GROUP BY date(from_date);

-- Get growth measurements over time
-- SELECT 
--     date(from_date) as measurement_date,
--     subtype,
--     amount,
--     unit
-- FROM activities 
-- WHERE baby_id = 1 AND type = 'GROWTH'
-- ORDER BY from_date, subtype;

-- Get health records summary
-- SELECT 
--     date(from_date) as health_date,
--     subtype,
--     amount,
--     unit,
--     details
-- FROM activities 
-- WHERE baby_id = 1 AND type = 'HEALTH'
-- ORDER BY from_date;

-- Get leisure activity duration summary
-- SELECT 
--     subtype,
--     COUNT(*) as session_count,
--     AVG(
--         CASE 
--             WHEN to_date IS NOT NULL 
--             THEN (julianday(to_date) - julianday(from_date)) * 24 * 60 
--             ELSE 0 
--         END
--     ) as avg_duration_minutes
-- FROM activities 
-- WHERE baby_id = 1 AND type = 'LEISURE'
-- GROUP BY subtype;
