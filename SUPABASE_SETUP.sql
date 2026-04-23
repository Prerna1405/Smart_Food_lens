-- Supabase Setup Script for NutriScan AI

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  age INTEGER,
  weight FLOAT,
  height FLOAT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')),
  health_goals TEXT,
  dietary_preferences TEXT[],
  restrictions TEXT[],
  daily_calorie_target INTEGER DEFAULT 2000,
  daily_protein_target INTEGER DEFAULT 150,
  daily_carb_target INTEGER DEFAULT 250,
  daily_fat_target INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scans Table
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  calories FLOAT DEFAULT 0,
  protein FLOAT DEFAULT 0,
  carbs FLOAT DEFAULT 0,
  fat FLOAT DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Scans Policies
CREATE POLICY "Users can view own scans" ON scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scans" ON scans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scans" ON scans FOR DELETE USING (auth.uid() = user_id);

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS scans_user_id_date_idx ON scans (user_id, date);
