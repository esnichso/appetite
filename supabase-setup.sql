-- Create tables for Meal Planner app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Meals table
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  recipe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT
);

-- Week plans table
CREATE TABLE week_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE
);

-- Shopping items table
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  quantity TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  is_checked BOOLEAN DEFAULT FALSE,
  week_start DATE NOT NULL
);

-- Enable Row Level Security
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meals
CREATE POLICY "Users can view own meals" ON meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals" ON meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals" ON meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals" ON meals
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ingredients
CREATE POLICY "Users can view own ingredients" ON ingredients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = ingredients.meal_id AND meals.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own ingredients" ON ingredients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = ingredients.meal_id AND meals.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own ingredients" ON ingredients
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = ingredients.meal_id AND meals.user_id = auth.uid())
  );

-- RLS Policies for week_plans
CREATE POLICY "Users can view own week plans" ON week_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own week plans" ON week_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own week plans" ON week_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for shopping_items
CREATE POLICY "Users can view own shopping items" ON shopping_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping items" ON shopping_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping items" ON shopping_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping items" ON shopping_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_meals_user_id ON meals(user_id);
CREATE INDEX idx_ingredients_meal_id ON ingredients(meal_id);
CREATE INDEX idx_week_plans_user_id_date ON week_plans(user_id, date);
CREATE INDEX idx_shopping_items_user_id_week_start ON shopping_items(user_id, week_start);
