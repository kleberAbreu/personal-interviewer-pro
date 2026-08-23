import { config } from 'dotenv'
import { createVoiceBroker } from './voiceBroker'

config({ path: '.env.local', quiet: true })

const host = '127.0.0.1'
const port = Number(process.env.VOICE_BROKER_PORT ?? 8787)

createVoiceBroker().listen(port, host, () => {
  console.info(`[voice-broker] listening on http://${host}:${port}`)
})
