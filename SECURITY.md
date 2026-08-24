# Security Policy

## Reporting a vulnerability

Please do not open a public issue with secrets, API keys, private logs,
interview transcripts, resumes, job descriptions, or provider responses that
may contain personal information.

If you find a vulnerability, report it privately through GitHub's private
vulnerability reporting flow when available, or contact the maintainer directly
through the GitHub profile for this repository.

## Handling sensitive data

This project is source code for personal/local use. Gemini and OpenAI voice keys
entered in Settings exist briefly in browser memory and are sent only to a
loopback-only broker. The broker stores them in `.env.local` with owner-only
permissions, never returns their values, and issues short-lived browser
credentials for voice sessions. Text-agent BYOK keys still use browser
`localStorage` and go directly to OpenRouter. Gemini candidate TTS is proxied by
the loopback broker, so its long-lived key is never persisted in browser
storage.
Before sharing logs or reproduction steps, remove:

- API keys, tokens, cookies, and authorization headers.
- Job descriptions, resumes, interview transcripts, and generated reports.
- Provider request or response bodies that contain personal data.

Never expose the local broker on `0.0.0.0` or commit `.env.local`. For a hosted
production deployment, move all provider calls behind an authenticated backend,
use ephemeral credentials, add rate limits and quotas, and keep standard
provider API keys server-side only.
