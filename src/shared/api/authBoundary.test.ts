import { expect, it, vi } from 'vitest'
import { apiMode } from './http'

it('keeps live community mode disabled until shared Auth is integrated', () => {
  vi.stubEnv('VITE_COMMUNITY_MODE', 'api')
  expect(apiMode()).toBe(false)
  vi.unstubAllEnvs()
})
