import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acesso via rede local (para testar com celular)
    port: 5174
  }
})
