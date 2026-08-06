/*
# Add replace_default_chart_template function

## What this does
Adds a new function `replace_default_chart_template()` that DELETES the calling
user's existing chart_accounts rows, then calls `seed_default_chart_template()`
to insert the full hierarchical chart fresh.

## Why
The "Load Default" button only appears when the chart is empty. Users who already
seeded the old template cannot re-seed. This function lets the UI offer a
"Replace with full chart" action that wipes the old chart and loads the new one.

## Security
- SECURITY DEFINER, scoped to auth.uid() via WHERE user_id = auth.uid().
- Only deletes the calling user's own rows — never touches other tenants.
- Safe to re-run.

## Notes
- Idempotent.
- Also deletes cost_centers for the user so the new seed inserts cleanly.
*/

CREATE OR REPLACE FUNCTION public.replace_default_chart_template()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  DELETE FROM chart_accounts WHERE user_id = v_uid;
  DELETE FROM cost_centers WHERE user_id = v_uid;

  PERFORM public.seed_default_chart_template();
END;
$$;
