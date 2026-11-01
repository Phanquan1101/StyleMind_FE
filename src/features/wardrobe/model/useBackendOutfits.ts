import { useCallback, useEffect, useRef, useState } from 'react'

import { IdentityApiError } from '@/shared/api/identityApi'
import { wardrobeApi, type OutfitSummary } from '@/shared/api/wardrobeApi'

import { mergeOutfitPage } from './backendOutfit'

export const OUTFIT_PAGE_SIZE = 20

export type OutfitListStatus = 'loading' | 'ready' | 'error' | 'forbidden'

export interface BackendOutfitsState {
  outfits: OutfitSummary[]
  status: OutfitListStatus
  error: unknown
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  retry: () => void
}

/** Loads the signed-in customer's outfits from the backend, 20 per page, de-duplicated by outfit_id. */
export function useBackendOutfits(accountId: string | undefined): BackendOutfitsState {
  const [outfits, setOutfits] = useState<OutfitSummary[]>([])
  const [status, setStatus] = useState<OutfitListStatus>('loading')
  const [error, setError] = useState<unknown>(null)
  const [nextPage, setNextPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const generation = useRef(0)
  const busy = useRef(false)

  const loadPage = useCallback(async (page: number, replace: boolean) => {
    if (busy.current) return
    busy.current = true
    const current = generation.current
    setError(null)
    if (replace) {
      setStatus('loading')
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await wardrobeApi.listOutfits(page, OUTFIT_PAGE_SIZE)
      if (current !== generation.current) return
      setOutfits(previous => (replace ? mergeOutfitPage([], response.items) : mergeOutfitPage(previous, response.items)))
      setNextPage(response.page + 1)
      setHasMore(response.page + 1 < response.total_pages)
      setStatus('ready')
    } catch (caught) {
      if (current !== generation.current) return
      setError(caught)
      if (replace) setStatus(caught instanceof IdentityApiError && caught.status === 403 ? 'forbidden' : 'error')
    } finally {
      if (current === generation.current) {
        busy.current = false
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    generation.current += 1
    busy.current = false
    setOutfits([])
    setHasMore(false)
    setNextPage(0)
    if (!accountId) return undefined
    void loadPage(0, true)
    return () => {
      generation.current += 1
    }
  }, [accountId, loadPage])

  const loadMore = useCallback(() => {
    if (hasMore) void loadPage(nextPage, false)
  }, [hasMore, loadPage, nextPage])

  const retry = useCallback(() => {
    void loadPage(0, true)
  }, [loadPage])

  return { outfits, status, error, hasMore, loadingMore, loadMore, retry }
}
