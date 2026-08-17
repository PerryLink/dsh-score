import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    pool: 'forks',
    // Dimension and probe specs observe shared scripted process state; keep
    // spec files from running concurrently so their scripts stay deterministic.
    fileParallelism: false,
  },
})
