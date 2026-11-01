import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { installCommerceMockBackend, resetCommerceMockBackend } from './commerceMockBackend'
import { installIdentityMockBackend, resetIdentityMockBackend } from './identityMockBackend'
import { installWardrobeMockBackend, resetWardrobeMockBackend } from './wardrobeMockBackend'

installIdentityMockBackend()
installWardrobeMockBackend()
installCommerceMockBackend()

afterEach(() => {
  cleanup()
  resetIdentityMockBackend()
  resetWardrobeMockBackend()
  resetCommerceMockBackend()
})
