import type { DemoDatabase } from '@/app/store/types'
import type { OutfitShare } from '@/entities/share/model/types'
import { selectOutfitDetail, type OutfitDetail } from '@/features/wardrobe/model/outfitSelectors'

export interface SharedOutfitDetail extends OutfitDetail {
  share: OutfitShare
}

export function selectSharesForOutfit(database: DemoDatabase, outfitId: string): OutfitShare[] {
  return database.outfitShares
    .filter(share => share.outfitId === outfitId && share.active)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function selectOutfitsSharedWithEmail(database: DemoDatabase, email: string): SharedOutfitDetail[] {
  const normalizedEmail = email.toLowerCase()

  return database.outfitShares
    .filter(share => share.active && share.viewerEmail.toLowerCase() === normalizedEmail)
    .flatMap(share => {
      const detail = selectOutfitDetail(database, share.outfitId)
      return detail ? [{ ...detail, share }] : []
    })
    .sort((a, b) => b.share.createdAt.localeCompare(a.share.createdAt))
}

export function selectPublicOutfitByToken(database: DemoDatabase, token: string): OutfitDetail | null {
  const outfit = database.outfits.find(item => item.publicToken === token && item.visibility === 'public')
  return outfit ? selectOutfitDetail(database, outfit.id) : null
}

export function canViewSharedOutfit(database: DemoDatabase, outfitId: string, email: string): boolean {
  return database.outfitShares.some(
    share => share.outfitId === outfitId && share.active && share.viewerEmail.toLowerCase() === email.toLowerCase(),
  )
}
