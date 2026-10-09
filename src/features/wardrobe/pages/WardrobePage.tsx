import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { WardrobeSharePanel } from '@/features/sharing/components/WardrobeSharePanel'

import { OutfitCard } from '../components/OutfitCard'
import { selectOwnedOutfits } from '../model/outfitSelectors'

export function WardrobePage() {
  const { state, dispatch } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const outfits = selectOwnedOutfits(state, currentUser.id)
  const ownedOutfitIds = new Set(outfits.map(outfit => outfit.id))
  const wardrobeShares = state.outfitShares.filter(
    share => share.ownerId === currentUser.id && share.active && ownedOutfitIds.has(share.outfitId),
  )
  const activePublicLink = state.wardrobePublicLinks.find(link => link.ownerId === currentUser.id && link.active)
  const publicPath = activePublicLink ? `/shared/wardrobes/${activePublicLink.token}` : ''
  const publicUrl = publicPath && typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath

  const grantWardrobeShare = (email: string) => {
    const createdAt = new Date().toISOString()

    outfits.forEach(outfit => {
      dispatch({
        type: 'share/granted',
        payload: {
          id: `share-${outfit.id}-${email}-${Date.now()}`,
          outfitId: outfit.id,
          ownerId: currentUser.id,
          viewerEmail: email,
          permission: 'view',
          active: true,
          createdAt,
        },
      })
    })
  }

  const revokeWardrobeShare = (email: string) => {
    wardrobeShares
      .filter(share => share.viewerEmail.toLowerCase() === email.toLowerCase())
      .forEach(share => {
        dispatch({ type: 'share/revoked', payload: { shareId: share.id } })
      })
  }

  const toggleWardrobePublic = (enabled: boolean) => {
    dispatch({
      type: 'wardrobe/publicToggled',
      payload: {
        ownerId: currentUser.id,
        enabled,
        token: `pub-wardrobe-${currentUser.id}`,
      },
    })
  }

  return (
    <section className="mx-auto grid max-w-[var(--container-wide)] gap-8 px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-[#222222]">Tủ đồ của tôi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Lưu outfit thủ công, outfit AI và các bộ phối bạn muốn dùng lại khi mua sắm.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <WardrobeSharePanel
            outfitCount={outfits.length}
            shares={wardrobeShares}
            publicUrl={publicUrl}
            onGrant={grantWardrobeShare}
            onRevokeEmail={revokeWardrobeShare}
            onTogglePublic={toggleWardrobePublic}
          />
          <Link to={ROUTES.outfitNew} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#222222]">
            Tạo tủ đồ
          </Link>
          <Link to={ROUTES.outfitNewAi} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#684B5A] px-4 text-sm font-semibold text-white">
            Tạo với AI
          </Link>
        </div>
      </div>

      {outfits.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outfits.map(outfit => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-[#D8D0C6] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#222222]">Tủ đồ đang trống</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6B67]">
            Tạo outfit đầu tiên để lưu các món bạn muốn phối cùng nhau.
          </p>
        </section>
      )}
    </section>
  )
}
