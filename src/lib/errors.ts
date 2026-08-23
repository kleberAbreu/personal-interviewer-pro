const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GEMINI_KEY]'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_API_KEY]'],
  [/\b(ghp|gho|github_pat)_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
  [/Bearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [REDACTED]'],
  [/openai-insecure-api-key\.[A-Za-z0-9._-]+/gi, 'openai-insecure-api-key.[REDACTED]'],
  [/([?&]key=)[^&\s]+/gi, '$1[REDACTED]'],
  [/(api[_-]?key["'\s:=]+)["']?[^"',\s]{12,}/gi, '$1[REDACTED]'],
]

export function sanitizeErrorMessage(message: string): string {
  return SECRET_PATTERNS.reduce(
    (safe, [pattern, replacement]) => safe.replace(pattern, replacement),
    message,
  )
}

export function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return sanitizeErrorMessage(error.message)
  if (typeof error === 'string' && error) return sanitizeErrorMessage(error)
  return fallback
}
