-- Chicken-and-egg fix: a buyer cannot set buyer_user_id on their own system_clients
-- row because the UPDATE RLS policy requires auth.uid() = buyer_user_id, which is
-- NULL before it is set. This SECURITY DEFINER function breaks the cycle by
-- running with elevated privileges, matching the caller's email to a system_clients
-- row with a NULL buyer_user_id, and linking it.

CREATE OR REPLACE FUNCTION public.ensure_buyer_linked()
RETURNS TABLE (
  id uuid,
  name text,
  password_set boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid uuid := auth.uid();
  caller_email text;
  linked_id uuid;
BEGIN
  IF caller_uid IS NULL THEN
    RETURN;
  END IF;

  -- Get the caller's email from auth.users
  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = caller_uid;

  IF caller_email IS NULL THEN
    RETURN;
  END IF;

  -- Find an unlinked system_clients row matching this email
  SELECT id INTO linked_id
  FROM system_clients
  WHERE email = caller_email
    AND buyer_user_id IS NULL
  LIMIT 1;

  IF linked_id IS NULL THEN
    RETURN;
  END IF;

  -- Link it
  UPDATE system_clients
  SET buyer_user_id = caller_uid
  WHERE id = linked_id;

  -- Return the linked record
  RETURN QUERY
  SELECT id, name, password_set
  FROM system_clients
  WHERE id = linked_id;
END;
$$;

-- Allow authenticated users to call it
GRANT EXECUTE ON FUNCTION public.ensure_buyer_linked() TO authenticated;
