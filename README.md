# Personal Interviewer Pro

Source-only, multi-provider AI interview practice app. Paste a job description,
run a real-time voice interview, and receive an evidence-based performance
report with strengths, gaps, transcript quotes, and a two-week practice plan.
Spectator mode can also run an AI candidate from your resume while you listen to
the interview and compare its answers with your own practice sessions.

> This public repository is intended for study, portfolio, and local use. There
> is no official hosted demo. A public multi-user deployment needs its own
> authenticated backend, abuse controls, spend limits, and ephemeral voice
> credentials.

## Voice Models

| Preset | Model | Best for | Transport |
| --- | --- | --- | --- |
| Default | `gemini-3.1-flash-live-preview` | Adaptive interviews and configurable reasoning | Gemini Live WebSocket |
| Expressive | `gemini-2.5-flash-native-audio-preview-12-2025` | Optional affective dialog | Gemini Live WebSocket |
| Premium | `gpt-realtime-2.1` | Reasoning, noise, silence, and interruption handling | WebRTC |
| Economy | `gpt-realtime-2.1-mini` | Lower-cost OpenAI voice with 128k context | WebRTC |
| Voice quality | `gpt-realtime-1.5` | Natural delivery without configurable reasoning | WebRTC |

The app supports all 30 Gemini Live voices and the current OpenAI Realtime voice
set. `Kore` and `marin` are the provider defaults. The deprecated
`gpt-realtime` preference is migrated automatically to `gpt-realtime-2.1`.

## Text Models

Text agents run through OpenRouter. The catalog includes moving `Latest`
aliases plus fixed releases so users can choose automatic upgrades or stable
model IDs:

| Family | Available choices | Typical use |
| --- | --- | --- |
| Claude Sonnet | Sonnet Latest, Sonnet 5, Sonnet 4.6 | Planning and low-latency AI candidate turns |
| Claude Opus | Opus Latest, Opus 5, Opus 5 Fast, Opus 4.8 | Demanding analysis and high-quality candidate answers |
| OpenAI GPT | GPT Latest, GPT-5.6 Sol, Terra, Luna, GPT-5.5 | Flagship, balanced, and economy text workloads |
| Other | Gemini, Claude Fable, DeepSeek, OpenRouter Auto | Existing defaults and cost-sensitive alternatives |

Prices shown in Settings are the current per-million-token OpenRouter rates.
Long prompts may be subject to provider-specific pricing tiers.

## Run Locally

Prerequisite: Node.js 20 or newer.

```bash
npm ci
npm run dev
```

`npm run dev` starts Vite and a loopback-only broker on `127.0.0.1`. Vite proxies
`/api` to the broker. Open **Settings -> API keys** to configure OpenRouter for
text agents and OpenAI and/or Gemini for voice. The voice fields save directly
to `.env.local`; editing that file manually remains an optional alternative.

Voice keys exist briefly in the password fields while entered, but are never
stored in `localStorage`, included in the Vite bundle, or returned by the
broker. The broker saves `.env.local` with owner-only permissions and uses the
long-lived keys only to issue browser-safe credentials:

- OpenAI voice receives a short-lived Realtime client secret and connects with
  WebRTC using the GA interface.
- Gemini voice receives a one-use token restricted to a new session window and
  the selected Live model.

The OpenRouter key entered in **Settings -> API keys** remains the browser BYOK
path for Researcher, Planner, Analyst, and AI Candidate text calls. It is not
used for voice sessions. Gemini candidate TTS also runs through the broker, so a
full Gemini key never enters `localStorage`.

## Local Installer

The repository includes a local-only installer that builds the app, preserves
`.env.local` during upgrades, starts the loopback broker, and opens the browser:

```bash
curl -fsSL https://raw.githubusercontent.com/kleberAbreu/personal-interviewer-pro/main/scripts/install.sh | bash
interview-pro
```

The default installation lives at `~/.local/share/personal-interviewer-pro`.
Add the selected keys through **Settings -> API keys** before starting an
interview.

## Spectator Mode

Select **AI candidate (spectator)** in setup to let an AI answer from your
resume while you listen. The recommended engine uses an OpenRouter text model
plus Gemini TTS. The experimental dual-live engine connects two Gemini Live
sessions and therefore requires a Gemini interviewer.

## Privacy And Cost

Job descriptions, resumes, microphone audio, transcripts, and reports are sent
to the providers selected for each pipeline role. Avoid confidential documents,
trade secrets, credentials, and sensitive personal data.

Set provider-side spend limits and use restricted project keys. Voice cost uses
provider token metadata when available. Documented fallbacks are 25 audio
tokens/second for Gemini and 10 input / 20 output audio tokens/second for
OpenAI.

## Project Structure

```text
server/             Loopback voice credential broker
src/agents/         Researcher, Planner, Analyst, and AI Candidate orchestration
src/components/     Setup, live/spectator interview, settings, manual, and report UI
src/config/         Model catalog, capabilities, voices, and prompts
src/providers/      Browser BYOK OpenRouter text calls
src/services/       Token-based cost calculation
src/voice/          Gemini Live, OpenAI WebRTC, TTS, and spectator adapters
```

## Quality Checks

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Provider credential canaries for all five voice models are opt-in and require
local keys:

```bash
RUN_VOICE_E2E=1 npm test
```

See [MANUAL.md](MANUAL.md) for the full English user guide and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.
