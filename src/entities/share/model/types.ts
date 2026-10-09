export interface OutfitShare {
  id: string
  outfitId: string
  ownerId: string
  viewerEmail: string
  permission: 'view'
  active: boolean
  createdAt: string
}

export interface WardrobePublicLink {
  id: string
  ownerId: string
  token: string
  active: boolean
  createdAt: string
  disabledAt?: string
}
