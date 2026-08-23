# Personal Interviewer Pro User Manual

This repository contains source code for local use. It is not a hosted demo.

## 1. Local Setup

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Create `.env.local` from `.env.example`.
4. Add a Gemini and/or OpenAI key for the voice models you plan to use.
5. Run `npm run dev` and open the Vite URL.

The command starts both the browser app and a broker bound to `127.0.0.1`. The
broker converts long-lived provider keys into short-lived browser credentials.
Full voice keys are never stored in `localStorage` or sent to the Vite bundle.

The optional `curl` installer documented in `README.md` provides the same
loopback-only architecture through the `interview-pro` command.

## 2. Text Provider Keys

Open **Settings -> API keys** to configure the OpenRouter BYOK key used by the
Researcher, Planner, Analyst, and AI Candidate. This key remains in browser
`localStorage` and is sent directly to OpenRouter. Voice does not use it.

The **Local voice broker** status shows whether Gemini and OpenAI voice keys were
detected in `.env.local`. Restart `npm run dev` after changing that file.

## 3. Choose The Interviewer

Open **Settings -> Models** and select one of the voice presets:

- **Default:** Gemini 3.1 Flash Live, with configurable reasoning.
- **Expressive:** Gemini 2.5 Native Audio, with optional affective dialog.
- **Premium:** GPT Realtime 2.1 over WebRTC.
- **Economy:** GPT Realtime 2.1 mini over WebRTC.
- **Voice quality:** GPT Realtime 1.5 over WebRTC.

Preview badges identify models that are not generally available. Cost and
transport metadata appear below each voice model.

## 4. Prepare An Interview

Paste the complete job description and optionally your resume. Select:

- interview and report languages;
- a voice supported by the selected model;
- 15, 30, or 45 minutes;
- Fast, Balanced, or Deep reasoning when supported;
- Standard or Expressive delivery when supported;
- stress mode and scoring weights.

Changing the app language in the header translates the full interface and the
in-app manual. Interview and report languages remain independent.

## 5. Spectator Mode

Choose **AI candidate (spectator)** to listen while an AI answers from your
resume. A resume of at least 100 characters is required.

- **Text plus TTS:** recommended; OpenRouter writes the answer and Gemini TTS
  speaks it through the local broker.
- **Dual Gemini Live:** experimental; two Gemini sessions exchange audio and
  therefore the interviewer must also be a Gemini Live model.

The final report evaluates the AI candidate transcript, making it useful as a
reference before you run your own practice interview.

## 6. During The Interview

The app shows microphone level, remaining time, live transcript, and estimated
cost. You can mute, pause, resume, interrupt the interviewer, or end manually.
The interviewer can also call `end_interview` after its final goodbye.

OpenAI uses browser-native WebRTC audio and a data channel for events. Gemini
uses Live API audio, context compression, session resumption, and proactive
reconnection on `GoAway`.

## 7. Report

The Analyst scores only evidence present in the transcript. The report includes
strengths, gaps, key moments, competency scores, question feedback, and a
two-week practice plan. If generation fails, the transcript remains available
for retry or copy.

## 8. Privacy And Safety

The selected providers process the job description, resume, audio,
transcription, and report. Do not submit confidential documents, credentials,
trade secrets, or sensitive personal data. Configure provider spend limits and
restricted project keys.

For a public deployment, add authentication, quotas, rate limits, monitoring,
server-side text calls, and provider-specific ephemeral credentials. Do not
publish `.env.local` or expose the local broker to a public interface.
