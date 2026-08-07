import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ParkMan2's tables live in their own `parkman2` Postgres schema, not
// `public` -- it shares a Supabase project with Hub for now (see
// PROJECT-BRIEF.md), so this keeps every query scoped there without
// needing "parkman2." prefixes throughout the app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "parkman2" },
});
