import { describe, expect, it } from 'vitest'
import { sanitizeErrorMessage } from './errors'

describe('error sanitization', () => {
  it('redacts provider keys, bearer tokens, and query-string keys', () => {
    const unsafe = [
      'Bearer ',
      'abcdefghijklmnopqrstuvwxyz',
      ' sk-',
      'abcdefghijklmnopqrstuvwxyz123456',
      ' ?key=',
      'AIza',
      'SyExampleSecretValue123456789',
    ].join('')
    const safe = sanitizeErrorMessage(unsafe)
    expect(safe).not.toContain('abcdefghijklmnopqrstuvwxyz')
    expect(safe).not.toContain('AIza')
    expect(safe).toContain('[REDACTED]')
  })
})
