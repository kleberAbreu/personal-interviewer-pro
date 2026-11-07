// Playwright CLI run-code callback. Requires npm run dev and configured voice keys.
// Feed this file to playwright-cli run-code; it starts an asynchronous test.
// Read window.voiceSmoke to inspect progress. No keys or transcripts are recorded.
async (page) => page.evaluate(async () => {
  const { startVoiceSession } = await import('/src/voice/index.ts')
  const state = window.voiceSmoke = { results: [], errors: [], finished: false }
  const run = async (provider, model, rounds, spacing) => {
    const result = { provider, model, rounds: 0, audioBytes: 0, opens: 0, errors: [], elapsedMs: 0 }
    state.results.push(result)
    const started = Date.now()
    let completeTurn
    const session = await startVoiceSession({ provider, model }, {
      model, voiceName: provider === 'gemini' ? 'Kore' : 'marin', language: 'en-US',
      durationMinutes: 15, reasoningMode: 'fast', expressiveness: 'standard',
      systemInstruction: 'Ask one short spoken interview question per candidate message.',
      captureMic: false, kickoff: false, enableEndTool: false,
    }, {
      onOpen: () => { result.opens++ }, onAudioLevel: () => {}, onTranscript: () => {},
      onUsage: () => {}, onEndRequested: () => {}, onClose: () => {},
      onAudioChunk: bytes => { result.audioBytes += bytes.length },
      onError: error => result.errors.push(error),
      onTurnComplete: () => { result.rounds++; completeTurn?.() },
    })
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      for (let turn = 0; turn < rounds; turn++) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(Error(`${provider}: response timeout`)), 60000)
          completeTurn = () => { clearTimeout(timeout); resolve() }
          session.sendText('I improved credit policy with risk and product teams. Ask the next question.')
        })
        session.setPaused(true)
        await new Promise(resolve => setTimeout(resolve, 200))
        session.setPaused(false)
        session.setMuted(true)
        session.setMuted(false)
        await new Promise(resolve => setTimeout(resolve, spacing))
      }
    } finally {
      session.stop()
      result.elapsedMs = Date.now() - started
    }
  }
  window.voiceSmokeJob = (async () => {
    await run('gemini', 'gemini-3.8-live', 5, 5000)
    await run('openai', 'gpt-realtime-2.1', 5, 5000)
    await run('gemini', 'gemini-3.8-live', 12, 60000)
  })().catch(error => state.errors.push(error.message)).finally(() => { state.finished = true })
  return { started: true }
})
