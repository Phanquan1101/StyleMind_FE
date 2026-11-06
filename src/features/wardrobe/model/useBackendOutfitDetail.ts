import { useCallback, useEffect, useRef, useState } from 'react'

import { IdentityApiError } from '@/shared/api/identityApi'
import { wardrobeApi, type OutfitDetailResponse } from '@/shared/api/wardrobeApi'

export type OutfitDetailStatus = 'loading' | 'ready' | 'error' | 'not-found' | 'forbidden'

/** One request at a time: the id of the action in flight ("rename", "delete" or "remove:<itemId>"), or null. */
export type OutfitPendingAction = string | null

export interface BackendOutfitDetailState {
  detail: OutfitDetailResponse | null
  status: OutfitDetailStatus
  error: unknown
  pending: OutfitPendingAction
  reload: () => void
  rename: (name: string) => Promise<void>
  addItem: (variantId: string) => Promise<void>
  changeItemVariant: (outfitItemId: string, variantId: string) => Promise<void>
  removeItem: (outfitItemId: string) => Promise<void>
  deleteOutfit: () => Promise<void>
}

function statusFromError(error: unknown): OutfitDetailStatus {
  if (error instanceof IdentityApiError) {
    if (error.status === 403) return 'forbidden'
    if (error.status === 404 || error.code === 'RESOURCE_NOT_FOUND') return 'not-found'
  }
  return 'error'
}

export function useBackendOutfitDetail(outfitId: string): BackendOutfitDetailState {
  const [detail, setDetail] = useState<OutfitDetailResponse | null>(null)
  const [status, setStatus] = useState<OutfitDetailStatus>('loading')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState<OutfitPendingAction>(null)
  const generation = useRef(0)
  const busy = useRef(false)

  const load = useCallback(async () => {
    const current = generation.current
    setStatus('loading')
    setError(null)
    try {
      const response = await wardrobeApi.getOutfit(outfitId)
      if (current !== generation.current) return
      setDetail(response)
      setStatus('ready')
    } catch (caught) {
      if (current !== generation.current) return
      setError(caught)
      setStatus(statusFromError(caught))
    }
  }, [outfitId])

  useEffect(() => {
    generation.current += 1
    const current = generation.current
    busy.current = false
    setDetail(null)
    setPending(null)
    void load()
    return () => {
      if (generation.current === current) generation.current += 1
    }
  }, [load])

  /** Runs an API action once at a time; the error is rethrown so the page can show it next to the control. */
  const run = useCallback(async (action: string, task: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    const current = generation.current
    setPending(action)
    try {
      await task()
    } finally {
      busy.current = false
      if (current === generation.current) setPending(null)
    }
  }, [])

  const rename = useCallback(
    (name: string) =>
      run('rename', async () => {
        const summary = await wardrobeApi.renameOutfit(outfitId, name)
        // PATCH returns the summary: update the name in place instead of reloading the detail (and Commerce).
        setDetail(previous => (previous ? { ...previous, name: summary.name, updated_at: summary.updated_at } : previous))
      }),
    [outfitId, run],
  )

  // POST items and PATCH item answer with the full OutfitDetail, so the detail is replaced instead of reloaded.
  const addItem = useCallback(
    (variantId: string) =>
      run('add', async () => {
        setDetail(await wardrobeApi.addOutfitItem(outfitId, variantId))
      }),
    [outfitId, run],
  )

  const changeItemVariant = useCallback(
    (outfitItemId: string, variantId: string) =>
      run(`change:${outfitItemId}`, async () => {
        setDetail(await wardrobeApi.changeOutfitItemVariant(outfitId, outfitItemId, variantId))
      }),
    [outfitId, run],
  )

  const removeItem = useCallback(
    (outfitItemId: string) =>
      run(`remove:${outfitItemId}`, async () => {
        await wardrobeApi.removeOutfitItem(outfitId, outfitItemId)
        setDetail(previous =>
          previous
            ? {
                ...previous,
                items: previous.items.filter(item => item.outfit_item_id !== outfitItemId),
                updated_at: new Date().toISOString(),
              }
            : previous,
        )
      }),
    [outfitId, run],
  )

  const deleteOutfit = useCallback(() => run('delete', () => wardrobeApi.deleteOutfit(outfitId)), [outfitId, run])

  return { detail, status, error, pending, reload: () => void load(), rename, addItem, changeItemVariant, removeItem, deleteOutfit }
}
