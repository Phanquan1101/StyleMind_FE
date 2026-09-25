import type { PropsWithChildren } from 'react'

import { DemoStoreProvider } from '@/app/store/DemoStoreProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return <DemoStoreProvider>{children}</DemoStoreProvider>
}
