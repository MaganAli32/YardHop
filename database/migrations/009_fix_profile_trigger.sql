-- Fix profile creation trigger for signup
-- This ensures the trigger can create profiles during signup despite RLS policies

-- Drop and recreate the trigger function with proper permissions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the function with SECURITY DEFINER and proper grants
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id,
    email,
    name,
    avatar_url,
    role,
    verified,
    safe_meet_only,
    notifications_enabled,
    rating_average,
    rating_count
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'username',
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'User'
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'Buyer'),
    COALESCE((NEW.raw_user_meta_data->>'verified')::boolean, false),
    true, -- safe_meet_only default
    true, -- notifications_enabled default
    0,    -- rating_average default
    0     -- rating_count default
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate insert errors
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT INSERT ON public.profiles TO postgres, service_role;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add/Update RLS policy to allow trigger to insert profiles
-- The trigger function uses SECURITY DEFINER, so it bypasses RLS,
-- but we should have a policy as a fallback
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also allow service role to insert (for trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure the function owner has necessary permissions
-- In Supabase, the postgres role should own the function
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Verify the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was not created';
  END IF;
END $$;

