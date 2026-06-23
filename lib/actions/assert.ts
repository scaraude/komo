import type { PostgrestError } from '@supabase/supabase-js'

export function mustSucceed<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  message: string,
): T[] {
  if (result.error || !result.data || result.data.length === 0) throw new Error(message)
  return result.data
}
