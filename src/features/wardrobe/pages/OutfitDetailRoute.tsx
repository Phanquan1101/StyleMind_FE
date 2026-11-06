import { useParams } from 'react-router-dom'

import { isUuid } from '../model/backendOutfit'
import { BackendOutfitDetailPage } from './BackendOutfitDetailPage'
import { OutfitDetailPage } from './OutfitDetailPage'

// TODO: gỡ nhánh demo khi sharing nối BE
export function OutfitDetailRoute() {
  const { outfitId } = useParams()

  return isUuid(outfitId) ? <BackendOutfitDetailPage outfitId={outfitId} /> : <OutfitDetailPage />
}
