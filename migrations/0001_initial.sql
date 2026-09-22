PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) <= 20),
  course TEXT NOT NULL CHECK (course IN ('Voorgerecht', 'Hoofdgerecht', 'Nagerecht')),
  description TEXT,
  calories_per_100g INTEGER CHECK (calories_per_100g >= 0),
  photo_key TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS dish_tags (
  dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (dish_id, tag_id)
);

CREATE TABLE IF NOT EXISTS freezer_batches (
  id TEXT PRIMARY KEY,
  dish_id TEXT NOT NULL REFERENCES dishes(id),
  frozen_at TEXT NOT NULL,
  original_portions INTEGER NOT NULL CHECK (original_portions > 0),
  available_portions INTEGER NOT NULL CHECK (available_portions >= 0),
  people_per_portion INTEGER NOT NULL CHECK (people_per_portion > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_entries (
  id TEXT PRIMARY KEY,
  dish_id TEXT NOT NULL REFERENCES dishes(id),
  source TEXT NOT NULL CHECK (source IN ('vers', 'vriezer')),
  reserved_batch_id TEXT REFERENCES freezer_batches(id),
  created_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((source = 'vers' AND reserved_batch_id IS NULL) OR (source = 'vriezer' AND reserved_batch_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS meal_bookings (
  id TEXT PRIMARY KEY,
  dish_id TEXT NOT NULL REFERENCES dishes(id),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('gegeten', 'ingevroren', 'vriezer')),
  eaten_at TEXT NOT NULL,
  planner_entry_id TEXT REFERENCES planner_entries(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS freezer_movements (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES freezer_batches(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('toevoegen', 'reserveren', 'vrijgeven', 'afboeken')),
  portions INTEGER NOT NULL CHECK (portions > 0),
  booking_id TEXT REFERENCES meal_bookings(id),
  planner_entry_id TEXT REFERENCES planner_entries(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friend_dinners (
  id TEXT PRIMARY KEY,
  dinner_date TEXT NOT NULL,
  people TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friend_dinner_dishes (
  friend_dinner_id TEXT NOT NULL REFERENCES friend_dinners(id) ON DELETE CASCADE,
  dish_id TEXT NOT NULL REFERENCES dishes(id),
  PRIMARY KEY (friend_dinner_id, dish_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_freezer_batches_fifo ON freezer_batches(frozen_at, created_at);
CREATE INDEX IF NOT EXISTS idx_planner_entries_order ON planner_entries(created_order);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_date ON meal_bookings(eaten_at DESC);
