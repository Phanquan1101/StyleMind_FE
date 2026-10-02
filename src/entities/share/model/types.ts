export interface OutfitShare {
  id: string
  outfitId: string
  ownerId: string
  viewerEmail: string
  permission: 'view'
  active: boolean
  createdAt: string
}
