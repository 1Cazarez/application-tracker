// Supabase errors aren't always Error instances, but they all carry a message.
export function errorMessage(err: unknown) {
  const message = (err as { message?: unknown } | null)?.message
  return typeof message === 'string' ? message : String(err)
}
