import type { DemoDatabase } from '@/app/store/types'
import type { OutfitShare, WardrobePublicLink } from '@/entities/share/model/types'
import { selectOutfitDetail, type OutfitDetail } from '@/features/wardrobe/model/outfitSelectors'

export interface SharedOutfitDetail extends OutfitDetail {
  share: OutfitShare
}

export interface PublicWardrobeDetail {
  link: WardrobePublicLink
  ownerName: string
  outfits: OutfitDetail[]
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

export function selectPublicWardrobeByToken(database: DemoDatabase, token: string): PublicWardrobeDetail | null {
  const link = database.wardrobePublicLinks.find(item => item.token === token && item.active)
  if (!link) return null

  const owner = database.users.find(user => user.id === link.ownerId)
  const outfits = database.outfits
    .filter(outfit => outfit.ownerId === link.ownerId)
    .flatMap(outfit => {
      const detail = selectOutfitDetail(database, outfit.id)
      return detail ? [detail] : []
    })
    .sort((a, b) => b.outfit.updatedAt.localeCompare(a.outfit.updatedAt))

  if (!owner || outfits.length === 0) return null

  return {
    link,
    ownerName: owner.fullName,
    outfits,
  }
}

export function canViewSharedOutfit(database: DemoDatabase, outfitId: string, email: string): boolean {
  return database.outfitShares.some(
    share => share.outfitId === outfitId && share.active && share.viewerEmail.toLowerCase() === email.toLowerCase(),
  )
}
