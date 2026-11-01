import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { upsertableChatSession } from '@/features/messages/model/chatSelectors'
import { WardrobeSharePanel } from '@/features/sharing/components/WardrobeSharePanel'
import { getWardrobeSettings, getWardrobeVisibilityLabel, selectActiveWardrobeSharesForOwner } from '@/features/sharing/model/shareSelectors'
import type { WardrobeVisibility } from '@/entities/share/model/types'

import { BackendOutfitList } from '../components/BackendOutfitList'
import { selectOwnedOutfits } from '../model/outfitSelectors'

export function WardrobePage() {
  const { state, dispatch } = useDemoStore()
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const outfits = selectOwnedOutfits(state, currentUser.id)
  const wardrobeSettings = getWardrobeSettings(state, currentUser.id)
  const wardrobeShares = selectActiveWardrobeSharesForOwner(state, currentUser.id)
  const activePublicLink = state.wardrobePublicLinks.find(link => link.ownerId === currentUser.id && link.active)
  const publicPath = wardrobeSettings.visibility === 'public' && activePublicLink ? `/shared/wardrobes/${activePublicLink.token}` : ''
  const publicUrl = publicPath && typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath

  const grantWardrobeShare = (email: string) => {
    const createdAt = new Date().toISOString()
    const normalizedEmail = email.toLowerCase()

    dispatch({
      type: 'wardrobeShare/granted',
      payload: {
        id: `wardrobe-share-${currentUser.id}-${normalizedEmail}`,
        ownerId: currentUser.id,
        viewerEmail: normalizedEmail,
        permission: 'view',
        active: true,
        createdAt,
      },
    })
    dispatch({ type: 'chat/sessionUpserted', payload: upsertableChatSession(currentUser.id, normalizedEmail, createdAt) })
    outfits.forEach(outfit => {
      dispatch({
        type: 'share/granted',
        payload: {
          id: `share-${outfit.id}-${normalizedEmail}-${Date.now()}`,
          outfitId: outfit.id,
          ownerId: currentUser.id,
          viewerEmail: normalizedEmail,
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
        dispatch({ type: 'wardrobeShare/revoked', payload: { shareId: share.id } })
      })
    state.outfitShares
      .filter(share => share.ownerId === currentUser.id && share.viewerEmail.toLowerCase() === email.toLowerCase() && share.active)
      .forEach(share => dispatch({ type: 'share/revoked', payload: { shareId: share.id } }))
  }

  const changeWardrobeVisibility = (visibility: WardrobeVisibility) => {
    dispatch({
      type: 'wardrobe/visibilityChanged',
      payload: {
        ownerId: currentUser.id,
        visibility,
        publicToken: `pub-wardrobe-${currentUser.id}`,
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
          <p className="mt-3 inline-flex rounded-md bg-[#F4E7E8] px-3 py-1 text-xs font-semibold text-[#684B5A]">
            {getWardrobeVisibilityLabel(wardrobeSettings.visibility)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <WardrobeSharePanel
            outfitCount={outfits.length}
            shares={wardrobeShares}
            visibility={wardrobeSettings.visibility}
            publicUrl={publicUrl}
            accessUrl={ROUTES.wardrobeAccess}
            onGrant={grantWardrobeShare}
            onRevokeEmail={revokeWardrobeShare}
            onVisibilityChange={changeWardrobeVisibility}
          />
          <Link to={ROUTES.wardrobeAccess} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#222222]">
            Quyền truy cập
          </Link>
          <Link to={ROUTES.outfitNew} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#EEE8E1] px-4 text-sm font-semibold text-[#222222]">
            Tạo tủ đồ
          </Link>
          {/* TODO: mở lại lối vào "Tạo với AI" khi có AI Stylist BE. */}
        </div>
      </div>

      <BackendOutfitList />
    </section>
  )
}
