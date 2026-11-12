import { useCallback, useEffect, useMemo, useState } from 'react'

import { commerceApi } from '@/api/commerce'
import type { Product } from '@/entities/product/model/types'
import { commerceProductToEntity } from '@/features/commerce/data/commerceEntityAdapters'
import { paginateProducts } from '@/features/catalog/model/paginateProducts'

import type { BuilderCategoryOption, BuilderPagination } from '../components/BuilderCatalogPanel'

export const BUILDER_PAGE_SIZE = 6
const SEARCH_DELAY_MS = 350

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function sellable(product: Product) {
  return product.active && product.variants.some(variant => variant.active)
}

function matchesSearch(product: Product, query: string) {
  const normalizedQuery = normalizeSearch(query.trim())
  if (!normalizedQuery) return true
  const searchable = normalizeSearch([product.name, product.brand, product.material, product.fit, product.pattern, ...product.tags].join(' '))
  return searchable.includes(normalizedQuery)
}

interface Options {
  /** Real API: the catalog is paged, searched and filtered by category on the server. Demo mode filters local data. */
  realMode: boolean
  demoProducts: Product[]
  demoCategories: BuilderCategoryOption[]
}

/** Catalog column of the outfit builder: keyword + multi-category filter + paging, one page at a time. */
export function useBuilderCatalog({ realMode, demoProducts, demoCategories }: Options) {
  const [search, setSearchValue] = useState('')
  const [query, setQuery] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [remote, setRemote] = useState<{ products: Product[]; totalPages: number; total: number }>({ products: [], totalPages: 1, total: 0 })
  const [remoteCategories, setRemoteCategories] = useState<BuilderCategoryOption[]>([])
  const [loading, setLoading] = useState(realMode)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!realMode) return
    let active = true
    void commerceApi.categories.list()
      .then(result => { if (active) setRemoteCategories(result.items.filter(category => category.is_active).map(category => ({ id: category.id, label: category.name }))) })
      .catch(() => { /* chips are optional: the catalog still works without them */ })
    return () => { active = false }
  }, [realMode])

  const categoryKey = categoryIds.join(',')
  useEffect(() => {
    if (!realMode) return
    let active = true
    setLoading(true); setError('')
    void commerceApi.products.list({
      keyword: query || undefined,
      category_id: categoryIds.length ? categoryIds : undefined,
      page: page - 1,
      size: BUILDER_PAGE_SIZE,
    }).then(result => {
      if (!active) return
      setRemote({
        products: result.items.map(commerceProductToEntity).filter(sellable),
        totalPages: Math.max(1, result.total_pages),
        total: result.total_elements,
      })
    }).catch(() => {
      if (active) setError('Không tải được sản phẩm. Vui lòng thử lại.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // categoryKey stands for categoryIds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realMode, query, categoryKey, page, revision])

  const local = useMemo(() => {
    if (realMode) return null
    const filtered = demoProducts
      .filter(sellable)
      .filter(product => categoryIds.length === 0 || categoryIds.includes(product.categoryId))
      .filter(product => matchesSearch(product, search))
    return { filtered, ...paginateProducts(filtered, page, BUILDER_PAGE_SIZE) }
  }, [realMode, demoProducts, categoryIds, search, page])

  const setSearch = useCallback((value: string) => { setSearchValue(value); setPage(1) }, [])
  const toggleCategory = useCallback((id: string) => {
    setCategoryIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
    setPage(1)
  }, [])
  const clearCategories = useCallback(() => { setCategoryIds([]); setPage(1) }, [])
  const retry = useCallback(() => setRevision(value => value + 1), [])

  const pagination: BuilderPagination = local
    ? { page: local.page, totalPages: local.totalPages, total: local.filtered.length }
    : { page, totalPages: remote.totalPages, total: remote.total }

  return {
    search,
    setSearch,
    categoryIds,
    toggleCategory,
    clearCategories,
    categories: realMode ? remoteCategories : demoCategories,
    products: local ? local.items : remote.products,
    pagination,
    setPage,
    loading: realMode ? loading : false,
    error: realMode ? error : '',
    retry,
  }
}
