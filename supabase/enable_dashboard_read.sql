-- OPTIONAL: run only if these budget tables are approved for public read access.
-- This exposes every column in each listed table through the Supabase Data API
-- to anyone holding the project's publishable key. Do not run for private data.
-- Safe to re-run: it only creates this named SELECT policy when it is absent.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'budget_items',
    'budget_acts',
    'entities',
    'sections',
    'chapters'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
        AND policyname = 'budget_dashboard_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY budget_dashboard_read ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        target_table
      );
    END IF;
  END LOOP;
END;
$$;
