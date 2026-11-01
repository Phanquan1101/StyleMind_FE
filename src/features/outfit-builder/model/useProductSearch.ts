import { useCallback, useEffect, useRef, useState } from 'react'

import { commerceCatalogApi, type CatalogProduct } from '@/shared/api/commerceCatalogApi'

export const PRODUCT_SEARCH_PAGE_SIZE = 12
export const PRODUCT_SEARCH_DEBOUNCE_MS = 300
export const PRODUCT_SEARCH_KEYWORD_MAX_LENGTH = 120

export type ProductSearchStatus = 'loading' | 'ready' | 'error'

export interface ProductSearchState {
  products: CatalogProduct[]
  status: ProductSearchStatus
  error: unknown
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  retry: () => void
}

function mergeProducts(current: CatalogProduct[], incoming: CatalogProduct[]): CatalogProduct[] {
  const merged = new Map(current.map(product => [product.product_id, product]))
  incoming.forEach(product => merged.set(product.product_id, product))
  return [...merged.values()]
}

/**
 * Debounced catalog search. Every new criteria aborts the previous request, and an answer that
 * belongs to an aborted request is never shown (the abort is detected from the signal because
 * the shared request helper wraps fetch failures in its own error type).
 */
export function useProductSearch(keyword: string, categoryId: string): ProductSearchState {
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword.trim())
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [status, setStatus] = useState<ProductSearchStatus>('loading')
  const [error, setError] = useState<unknown>(null)
  const [nextPage, setNextPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const loadingMoreRef = useRef(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim().slice(0, PRODUCT_SEARCH_KEYWORD_MAX_LENGTH)), PRODUCT_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    loadingMoreRef.current = false
    setLoadingMore(false)
    setStatus('loading')
    setError(null)
    setProducts([])
    setHasMore(false)

    commerceCatalogApi
      .searchProducts({ keyword: debouncedKeyword, categoryId, page: 0, size: PRODUCT_SEARCH_PAGE_SIZE, signal: current.signal })
      .then(response => {
        if (current.signal.aborted) return
        setProducts(mergeProducts([], response.items))
        setNextPage(response.page + 1)
        setHasMore(response.page + 1 < response.total_pages)
        setStatus('ready')
      })
      .catch(caught => {
        if (current.signal.aborted) return
        setError(caught)
        setStatus('error')
      })

    return () => current.abort()
  }, [debouncedKeyword, categoryId, attempt])

  const loadMore = useCallback(() => {
    const current = controller.current
    if (!current || loadingMoreRef.current || !hasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    setError(null)

    commerceCatalogApi
      .searchProducts({ keyword: debouncedKeyword, categoryId, page: nextPage, size: PRODUCT_SEARCH_PAGE_SIZE, signal: current.signal })
      .then(response => {
        if (current.signal.aborted) return
        setProducts(previous => mergeProducts(previous, response.items))
        setNextPage(response.page + 1)
        setHasMore(response.page + 1 < response.total_pages)
      })
      .catch(caught => {
        if (current.signal.aborted) return
        setError(caught)
      })
      .finally(() => {
        if (current.signal.aborted) return
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [categoryId, debouncedKeyword, hasMore, nextPage])

  const retry = useCallback(() => setAttempt(value => value + 1), [])

  return { products, status, error, hasMore, loadingMore, loadMore, retry }
}
