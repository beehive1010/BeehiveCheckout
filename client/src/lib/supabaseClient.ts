import { createClient } from "@supabase/supabase-js";
import type { Database } from "../contexts"; // 用 supabase CLI 生成的类型

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
