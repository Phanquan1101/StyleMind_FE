import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiOutfitManagement, OUTFIT_GRID_CLASS, OutfitItemsTotal } from '../components/ApiOutfitManagement'
import { OutfitCartActions } from '../components/OutfitCartActions'
import { communityApi, type OutfitDetailDto, type OutfitSummaryDto, type SharingDto, type Visibility } from '@/shared/api/communityApi'
import { ApiError } from '@/shared/api/http'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { categoryCountsOfSummary, formatOutfitSummary } from '../model/outfitCategories'
import { outfitErrorMessage } from '../model/outfitErrors'
import { useApiQuery } from '@/shared/api/useApiQuery'
import { ApiModal, ApiPagination, ApiSection, ApiState } from '@/shared/api/ApiUi'
import { Button } from '@/shared/ui'
import { ArrowLeft, ArrowRight, Plus, Shirt, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { friendLabel } from '@/features/friends/model/friendLabel'

const label: Record<Visibility, string> = { PRIVATE: 'Riêng tư', FRIENDS: 'Bạn bè', PUBLIC: 'Công khai' }
export function ApiWardrobePage() {
  const [page, setPage] = useState(0)
  const query = useApiQuery(`own-outfits:${page}`, signal => communityApi.outfits(page, signal))
  const [deleteTarget, setDeleteTarget] = useState<OutfitSummaryDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true); setDeleteError('')
    try {
      await communityApi.deleteOutfit(target.outfit_id)
    } catch (error) {
      // 404: it is already gone (deleted elsewhere); treat like a success and refresh.
      if (!(error instanceof ApiError && error.status === 404)) { setDeleteError(outfitErrorMessage(error)); setDeleting(false); return }
    }
    setDeleting(false); setDeleteTarget(null)
    setRemovedIds(previous => new Set(previous).add(target.outfit_id))
    // Last outfit of a later page gone: step back so the page is not empty.
    if (page > 0 && (query.data?.items.filter(item => !removedIds.has(item.outfit_id)).length ?? 0) <= 1) setPage(page - 1); else query.refresh()
  }
  const items = query.data?.items.filter(item => !removedIds.has(item.outfit_id)) ?? []
  return <ApiSection title="Tủ đồ của tôi"><div className="mt-4 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-sm leading-6 text-[#5E5F5D]">Lưu lại những cách phối đồ yêu thích và chia sẻ phong cách của bạn.</p><Link to="/wardrobes/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1C1B1B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#444746] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"><Plus size={16} aria-hidden="true" />Tạo Outfit</Link></div><ApiState {...query} retry={query.refresh} />{query.data && <><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(o => <article className="group relative overflow-hidden rounded-[24px] border border-[#E3E2E2] bg-white transition hover:shadow-lg" key={o.outfit_id}><Link className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]" to={`/outfits/${o.outfit_id}`}><div className="grid aspect-[16/10] place-items-center bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={48} strokeWidth={1} aria-hidden="true" /></div><div className="flex items-end justify-between gap-4 p-6"><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-[#5E5F5D]">{label[o.visibility]}</p><h2 className="mt-2 break-words font-display text-2xl">{o.name}</h2><p className="mt-2 text-sm text-[#5E5F5D]">{formatOutfitSummary(o.item_count, categoryCountsOfSummary(o.category_counts))}</p></div><ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" /></div></Link><button type="button" aria-label={`Xóa outfit ${o.name}`} title="Xóa outfit" onClick={() => { setDeleteError(''); setDeleteTarget(o) }} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#A94B4B] shadow-sm transition hover:bg-[#FCEAEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94B4B]"><Trash2 size={16} aria-hidden="true" /></button></article>)}</div>{!items.length && <div className="mt-8 rounded-[24px] border border-dashed border-[#C4C7C7] bg-white p-10 text-center"><Shirt className="mx-auto text-[#C4C7C7]" size={36} aria-hidden="true" /><p className="mt-4 font-display text-2xl font-semibold">Chưa có Outfit.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5E5F5D]">Tạo outfit đầu tiên: chọn vài món trong cửa hàng để phối thành một bộ, lưu lại và chia sẻ với bạn bè.</p><Link to="/wardrobes/new" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1C1B1B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#444746] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B]"><Plus size={16} aria-hidden="true" />Tạo outfit đầu tiên</Link></div>}<ApiPagination data={query.data} setPage={setPage} /></>}<ConfirmDeleteDialog open={deleteTarget !== null} title="Xóa outfit" message={`Xóa outfit “${deleteTarget?.name ?? ''}”?`} busy={deleting} error={deleteError} onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError('') } }} onConfirm={() => void confirmDelete()} /></ApiSection>
}
export function ApiSharedWithMePage() {
  const [page, setPage] = useState(0), query = useApiQuery(`friends:${page}`, signal => communityApi.friends(page, signal))
  return <ApiSection title="Outfit bạn bè"><ApiState {...query} retry={query.refresh} />{query.data && <><div className="mt-6 grid gap-4 md:grid-cols-2">{query.data.items.map(f => <Link className="rounded-lg border border-[#E3E2E2] bg-white p-5" key={f.friendship_id} to={`/shared-with-me/${f.friend_account_id}`}><h2 className="break-words font-display text-2xl">Tủ đồ của {friendLabel(f)}</h2><span className="mt-3 inline-block text-sm text-[#1C1B1B]">Xem Outfit</span></Link>)}</div>{!query.data.items.length && <p className="mt-6">Chưa có bạn bè.</p>}<ApiPagination data={query.data} setPage={setPage} /></>}</ApiSection>
}
export function ApiFriendWardrobePage() {
  const { ownerId = '' } = useParams(), [page, setPage] = useState(0)
  const query = useApiQuery(`friend-outfits:${ownerId}:${page}`, signal => communityApi.friendOutfits(ownerId, page, signal))
  return <ApiSection title="Outfit bạn bè"><Link to="/shared-with-me" className="mt-3 inline-block text-sm text-[#1C1B1B] hover:underline">Quay lại</Link><ApiState {...query} retry={query.refresh} />{query.data && <><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{query.data.items.map(o => <Link className="group overflow-hidden rounded-[24px] border border-[#E3E2E2] bg-white transition hover:shadow-lg" key={o.outfit_id} to={`/shared-with-me/${ownerId}/outfits/${o.outfit_id}`}><div className="grid aspect-[16/10] place-items-center bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={48} strokeWidth={1} aria-hidden="true" /></div><div className="flex items-end justify-between gap-4 p-6"><div><p className="text-xs uppercase tracking-wider text-[#5E5F5D]">{label[o.visibility]}</p><h2 className="mt-2 break-words font-display text-2xl">{o.name}</h2><p className="mt-2 text-sm text-[#5E5F5D]">{o.item_count} món</p></div><ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" /></div></Link>)}</div>{!query.data.items.length && <div className="mt-8 rounded-[24px] border border-dashed border-[#C4C7C7] bg-white p-10 text-center"><Shirt className="mx-auto text-[#C4C7C7]" size={36} aria-hidden="true" /><p className="mt-4">Chưa có Outfit để xem.</p></div>}<ApiPagination data={query.data} setPage={setPage} /></>}</ApiSection>
}
function Items({ detail }: { detail: OutfitDetailDto }) {
  return <><div className={OUTFIT_GRID_CLASS}>{detail.items.map(item => <article key={item.outfit_item_id} className="grid min-w-0 content-start gap-3 overflow-hidden rounded-xl border border-[#E3E2E2] bg-white p-3">
    {item.available && item.image_url ? <img src={item.image_url} alt="" className="aspect-[3/4] w-full rounded-lg bg-[#F5F3F3] object-cover" /> : <div className="grid aspect-[3/4] place-items-center rounded-lg bg-[#F5F3F3] text-[#C4C7C7]"><Shirt size={36} strokeWidth={1} aria-hidden="true" /></div>}
    <div className="min-w-0">
      <h2 className="line-clamp-2 break-words text-sm font-semibold text-[#222222]">{item.product_name || 'Sản phẩm không còn khả dụng'}</h2>
      {item.available && <p className="mt-1 text-xs text-[#5E5F5D]">{[item.color, item.size].filter(Boolean).join(' · ')}</p>}
      {item.available && item.unit_price_vnd != null && <p className="mt-1 text-sm font-semibold text-[#222222]">{formatCurrency(item.unit_price_vnd)}</p>}
    </div>
  </article>)}</div><OutfitItemsTotal items={detail.items} /></>
}
function Sharing({ outfitId, settings, refresh }: { outfitId: string; settings: SharingDto; refresh: () => void }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState<Visibility>(settings.visibility), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copy, setCopy] = useState('')
  const url = settings.public_enabled && settings.public_token ? `${window.location.origin}/shared/outfits/${encodeURIComponent(settings.public_token)}` : ''
  const save = async () => { setBusy(true); setError(''); try { if (draft === 'PUBLIC') await communityApi.enablePublicLink(outfitId); else if (draft === 'PRIVATE' && settings.visibility === 'PUBLIC') await communityApi.disablePublicLink(outfitId); else await communityApi.changeSharing(outfitId, draft); setOpen(false); refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được chế độ.') } finally { setBusy(false) } }
  return <><Button onClick={() => { setDraft(settings.visibility); setError(''); setCopy(''); setOpen(true) }}>Chia sẻ outfit</Button><ApiModal open={open} title="Chia sẻ outfit" onClose={() => { if (!busy) setOpen(false) }}><fieldset className="grid gap-3">{(['PRIVATE', 'FRIENDS', 'PUBLIC'] as const).map(v => <label key={v} className="rounded-lg border border-[#E3E2E2] p-4"><input type="radio" name="visibility" checked={draft === v} onChange={() => setDraft(v)} /> {label[v]}</label>)}</fieldset><p className="mt-4 text-sm">Bạn bè có thể xem Outfit Bạn bè. Mời bạn không tự đổi chế độ.</p>{url && draft === 'PUBLIC' && <div><label className="mt-4 grid gap-2 text-sm">Liên kết công khai<input readOnly value={url} className="min-w-0 rounded border p-2" onFocus={e => e.currentTarget.select()} /></label><Button variant="secondary" className="mt-3" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopy('Đã sao chép') } catch { setCopy('Hãy chọn liên kết và sao chép thủ công.') } }}>Sao chép liên kết</Button><p role="status" className="mt-2 text-xs">{copy}</p></div>}{error && <p role="alert" className="mt-4 text-sm text-[#A94B4B]">{error}</p>}<div className="mt-5 flex justify-end gap-3"><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Hủy</Button><Button loading={busy} onClick={() => void save()}>Lưu chế độ</Button></div></ApiModal></>
}
function CopyPublicLink({ settings }: { settings: SharingDto }) {
  const [message, setMessage] = useState('')
  if (!settings.public_enabled || !settings.public_token) return null
  const url = `${window.location.origin}/shared/outfits/${encodeURIComponent(settings.public_token)}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMessage('Đã sao chép liên kết công khai.') } catch { setMessage(`Không sao chép tự động được. Hãy sao chép liên kết: ${url}`) }
  }
  return <><Button variant="secondary" onClick={() => void copy()}>Sao chép liên kết công khai</Button><span role="status" className="min-w-0 break-all text-xs text-[#5E5F5D]">{message}</span></>
}
export function ApiOutfitDetailPage({ kind }: { kind: 'owner' | 'friend' | 'public' }) {
  const { outfitId = '', ownerId = '', token = '' } = useParams()
  const navigate = useNavigate()
  const query = useApiQuery(`${kind}:${ownerId}:${outfitId}:${token}`, signal => kind === 'public' ? communityApi.publicOutfit(token, signal) : kind === 'friend' ? communityApi.friendOutfit(ownerId, outfitId, signal) : communityApi.outfit(outfitId, signal), kind === 'public')
  const settings = useApiQuery(`sharing:${outfitId}`, signal => kind === 'owner' ? communityApi.sharing(outfitId, signal) : Promise.resolve(null), kind !== 'owner')
  return <main className="min-h-screen bg-[#FBF9F9]"><ApiSection title={query.data?.name || 'Outfit'}>{kind !== 'public' && <Link to={kind === 'owner' ? '/wardrobes' : `/shared-with-me/${ownerId}`} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[#1C1B1B] hover:underline"><ArrowLeft size={16} aria-hidden="true" />{kind === 'owner' ? 'Tủ đồ' : 'Outfit bạn bè'}</Link>}<ApiState {...query} retry={query.refresh} />{query.data && <>{kind === 'owner' && <><ApiState {...settings} retry={settings.refresh} />{settings.data && <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-[#E3E2E2] pb-5"><span className="rounded-full bg-[#EFEDED] px-3 py-1 text-sm font-semibold">{label[settings.data.visibility]}</span><Sharing outfitId={outfitId} settings={settings.data} refresh={() => { settings.refresh(); query.refresh() }} /><CopyPublicLink settings={settings.data} /></div>}</>}{kind === 'owner' ? <><ApiOutfitManagement key={outfitId} detail={query.data} refresh={query.refresh} onDeleted={() => navigate('/wardrobes')} /><OutfitCartActions key={`cart-${outfitId}`} items={query.data.items} /></> : <Items detail={query.data} />}</>}</ApiSection></main>
}

