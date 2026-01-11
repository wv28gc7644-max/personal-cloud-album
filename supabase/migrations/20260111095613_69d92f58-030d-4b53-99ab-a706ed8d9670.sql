-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile viewing to authenticated users only
-- This prevents user enumeration and data scraping by unauthenticated users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy: Only authenticated users can view profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);