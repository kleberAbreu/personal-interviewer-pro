import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const brokerPort = Number(env.VOICE_BROKER_PORT || 8787)
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${brokerPort}`,
      },
    },
  }
})
