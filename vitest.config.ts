import { defineConfig } from 'vitest/config'
import path from 'path'

// Fixed, non-secret test fixtures (32-byte hex where a key is required).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    env: {
      ENCRYPTION_KEY: 'a'.repeat(64),
      BLIND_INDEX_SECRET: 'b'.repeat(64),
      UNSUBSCRIBE_TOKEN_SECRET: 'c'.repeat(64),
      NOTIFICATION_TOKEN_SECRET: 'd'.repeat(64),
    },
  },
})
