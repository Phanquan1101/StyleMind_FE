import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, MapPin, Package, Ruler, Save, Shirt, UserRound, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useDemoStore } from '@/app/store/DemoStoreProvider'
import { useAuth } from '@/features/auth'
import { identityApi, identityErrorMessage, type StyleProfilePayload } from '@/shared/api/identityApi'
import { apiMode } from '@/shared/api/http'
import { fieldErrorsFromProblem, focusFirstInvalid, mapFieldErrors, problemOf } from '@/shared/lib/apiFieldErrors'
import { Button } from '@/shared/ui'

import { BodyInfoForm } from '../components/BodyInfoForm'
import { ProfileForm } from '../components/ProfileForm'
import {
  hasErrors,
  validateProfileInput,
  validateStyleProfileInput,
  type FieldErrors,
  type ProfileInput,
  type StyleProfileInput,
} from '../model/validators'

const emptyStyleProfile: StyleProfileInput = {
  fitPreference: '',
  heightCm: '',
  weightKg: '',
  usualTopSize: '',
  usualBottomSize: '',
  shoeSize: '',
  styleCodes: '',
  colorCodes: '',
  brandIds: '',
}

const STYLE_FIELD_MAP: Record<string, keyof StyleProfileInput> = {
  fit_preference: 'fitPreference',
  height_cm: 'heightCm',
  weight_kg: 'weightKg',
  usual_top_size: 'usualTopSize',
  usual_bottom_size: 'usualBottomSize',
  shoe_size: 'shoeSize',
  style_codes: 'styleCodes',
  color_codes: 'colorCodes',
  brand_ids: 'brandIds',
}

function csvValues(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null
}

function profilePayload(value: StyleProfileInput): StyleProfilePayload {
  return {
    fit_preference: value.fitPreference.trim() || null,
    height_cm: nullableNumber(value.heightCm),
    weight_kg: nullableNumber(value.weightKg),
    usual_top_size: value.usualTopSize.trim() || null,
    usual_bottom_size: value.usualBottomSize.trim() || null,
    shoe_size: value.shoeSize.trim() || null,
    style_codes: csvValues(value.styleCodes),
    color_codes: csvValues(value.colorCodes),
    brand_ids: csvValues(value.brandIds),
  }
}

export function AccountPage() {
  const { state } = useDemoStore()
  const auth = useAuth()
  const currentUser = auth.currentUser
  const userId = currentUser?.id ?? ''
  const [profileDraft, setProfileDraft] = useState<ProfileInput>({ displayName: '' })
  const [styleDraft, setStyleDraft] = useState<StyleProfileInput>(emptyStyleProfile)
  const [profileErrors, setProfileErrors] = useState<FieldErrors<ProfileInput>>({})
  const [styleErrors, setStyleErrors] = useState<FieldErrors<StyleProfileInput>>({})
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingStyle, setSavingStyle] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const [profileMessage, setProfileMessage] = useState('')
  const [styleMessage, setStyleMessage] = useState('')
  const [addressCount, setAddressCount] = useState(0)
  const profileSection = useRef<HTMLElement>(null)
  const styleSection = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    setLoadError('')
    void Promise.all([identityApi.getMyProfile(), identityApi.getStyleProfile(), identityApi.listAddresses()])
      .then(([profile, style, addresses]) => {
        if (!active) return
        setProfileDraft({ displayName: profile.profile?.display_name ?? currentUser?.fullName ?? '' })
        setAddressCount(addresses.addresses.length)
        const value = style.style_profile
        setStyleDraft(value ? {
          fitPreference: value.fit_preference ?? '',
          heightCm: value.height_cm == null ? '' : String(value.height_cm),
          weightKg: value.weight_kg == null ? '' : String(value.weight_kg),
          usualTopSize: value.usual_top_size ?? '',
          usualBottomSize: value.usual_bottom_size ?? '',
          shoeSize: value.shoe_size ?? '',
          styleCodes: value.style_codes.join(', '),
          colorCodes: value.color_codes.join(', '),
          brandIds: value.brand_ids.join(', '),
        } : emptyStyleProfile)
      })
      .catch(error => {
        if (active) setLoadError(identityErrorMessage(error, 'Không thể tải thông tin tài khoản.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, loadVersion])

  if (!currentUser) return null

  const orders = state.orders.filter(order => order.userId === currentUser.id)
  const outfits = state.outfits.filter(outfit => outfit.ownerId === currentUser.id)

  const handleProfileSave = async () => {
    const nextErrors = validateProfileInput(profileDraft)
    setProfileErrors(nextErrors)
    setProfileMessage('')
    if (hasErrors(nextErrors)) { setTimeout(() => focusFirstInvalid(profileSection.current), 0); return }

    setSavingProfile(true)
    try {
      await auth.updateDisplayName(profileDraft.displayName.trim())
      setProfileMessage('Đã cập nhật hồ sơ cá nhân.')
    } catch (error) {
      const { fields } = mapFieldErrors<keyof ProfileInput>(fieldErrorsFromProblem(problemOf(error)), { display_name: 'displayName' })
      if (hasErrors(fields)) {
        setProfileErrors(fields)
        setTimeout(() => focusFirstInvalid(profileSection.current), 0)
      } else {
        setProfileMessage(identityErrorMessage(error, 'Không thể cập nhật hồ sơ.'))
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handleStyleSave = async () => {
    const nextErrors = validateStyleProfileInput(styleDraft)
    setStyleErrors(nextErrors)
    setStyleMessage('')
    if (hasErrors(nextErrors)) { setTimeout(() => focusFirstInvalid(styleSection.current), 0); return }

    setSavingStyle(true)
    try {
      const saved = await auth.updateStyleProfile(profilePayload(styleDraft))
      const value = saved.style_profile
      if (value) {
        setStyleDraft({
          fitPreference: value.fit_preference ?? '',
          heightCm: value.height_cm == null ? '' : String(value.height_cm),
          weightKg: value.weight_kg == null ? '' : String(value.weight_kg),
          usualTopSize: value.usual_top_size ?? '',
          usualBottomSize: value.usual_bottom_size ?? '',
          shoeSize: value.shoe_size ?? '',
          styleCodes: value.style_codes.join(', '),
          colorCodes: value.color_codes.join(', '),
          brandIds: value.brand_ids.join(', '),
        })
      }
      setStyleMessage('Đã cập nhật thông tin vóc dáng và phong cách.')
    } catch (error) {
      const { fields } = mapFieldErrors<keyof StyleProfileInput>(fieldErrorsFromProblem(problemOf(error)), STYLE_FIELD_MAP)
      if (hasErrors(fields)) {
        setStyleErrors(fields)
        setTimeout(() => focusFirstInvalid(styleSection.current), 0)
      } else {
        setStyleMessage(identityErrorMessage(error, 'Không thể cập nhật thông tin phong cách.'))
      }
    } finally {
      setSavingStyle(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 md:space-y-8 md:py-10">
      <header className="flex flex-col gap-5 border-b border-[#E3E2E2] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5E5F5D]">Cài đặt tài khoản</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#222222] sm:text-4xl">Hồ sơ cá nhân</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5E5F5D]">
            Quản lý thông tin hồ sơ, số đo và lựa chọn phong cách của bạn.
          </p>
        </div>
        <Link
          to={ROUTES.addresses}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-[#1C1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#444746] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2 sm:self-auto"
        >
          <MapPin size={16} aria-hidden="true" />
          Quản lý địa chỉ{!loading && !loadError ? ` (${addressCount})` : ''}
        </Link>
      </header>

      {loading && (
        <div className="rounded-xl border border-[#E3E2E2] bg-white px-5 py-6 text-sm text-[#5E5F5D]" role="status" aria-live="polite">
          Đang tải thông tin tài khoản…
        </div>
      )}

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7BABA] bg-[#FCEAEA] px-5 py-4">
          <p role="alert" className="text-sm font-semibold text-[#8E3535]">{loadError}</p>
          <Button type="button" variant="secondary" onClick={() => setLoadVersion(value => value + 1)}>Thử tải lại</Button>
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.5fr)] lg:gap-6">
            <div className="space-y-5">
              <section className="rounded-xl border border-[#E3E2E2] bg-white p-5 sm:p-6" aria-label="Tóm tắt tài khoản">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#EFEDED] font-display text-2xl font-semibold text-[#222222]" aria-hidden="true">
                    {currentUser.avatarInitials || 'SM'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5E5F5D]">
                      {currentUser.role === 'admin' ? 'Tài khoản quản trị' : 'Thành viên StyleMind'}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-[#222222]">{profileDraft.displayName || currentUser.fullName}</h2>
                    <p className="mt-1 truncate text-sm text-[#5E5F5D]">{currentUser.email}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-lg bg-[#F5F3F3] px-4 py-3">
                  <UserRound size={17} className="mt-0.5 shrink-0 text-[#3A3632]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-[#3A3632]">
                    Tên hiển thị và email được lấy từ hồ sơ tài khoản của bạn.
                  </p>
                </div>
              </section>

              <section ref={profileSection} className="rounded-xl border border-[#E3E2E2] bg-white p-5 sm:p-6" aria-labelledby="account-profile-heading">
                <ProfileForm
                  value={profileDraft}
                  email={currentUser.email}
                  errors={profileErrors}
                  onChange={setProfileDraft}
                />
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="button" loading={savingProfile} disabled={loading} icon={<Save size={16} />} onClick={handleProfileSave}>
                    Lưu hồ sơ
                  </Button>
                  {profileMessage && <p className="text-sm font-semibold text-[#3A3632]" role="status">{profileMessage}</p>}
                </div>
              </section>
            </div>

            <section ref={styleSection} className="rounded-xl border border-[#E3E2E2] bg-white p-5 sm:p-6 lg:p-7" aria-labelledby="style-profile-heading">
              <div className="mb-6 flex items-start gap-3 border-b border-[#E3E2E2] pb-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EFEDED] text-[#222222]">
                  <Ruler size={18} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="style-profile-heading" className="font-display text-2xl font-semibold leading-tight text-[#222222]">Vóc dáng &amp; phong cách</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5E5F5D]">
                    Số đo và kích cỡ giúp hoàn thiện hồ sơ gợi ý trang phục. Các mục đều có thể để trống.
                  </p>
                </div>
              </div>
              <BodyInfoForm value={styleDraft} errors={styleErrors} onChange={setStyleDraft} />
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E3E2E2] pt-5">
                <Button type="button" loading={savingStyle} disabled={loading} icon={<Save size={16} />} onClick={handleStyleSave}>
                  Lưu thông tin vóc dáng
                </Button>
                {styleMessage && <p className="text-sm font-semibold text-[#3A3632]" role="status">{styleMessage}</p>}
              </div>
            </section>
          </div>

          <section aria-labelledby="quick-access-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="quick-access-heading" className="font-display text-2xl font-semibold text-[#222222]">Truy cập nhanh</h2>
              <p className="text-sm text-[#5E5F5D]">Các mục thường dùng trong tài khoản</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Shortcut
                label="Địa chỉ giao hàng"
                value={`${addressCount} địa chỉ`}
                description="Quản lý nơi nhận đơn hàng"
                to={ROUTES.addresses}
                Icon={MapPin}
              />
              <Shortcut
                label="Đơn hàng"
                value={apiMode() ? 'Theo dõi đơn' : `${orders.length} đơn`}
                description="Xem trạng thái và lịch sử mua hàng"
                to={ROUTES.orders}
                Icon={Package}
              />
              <Shortcut
                label="Tủ đồ cá nhân"
                value={apiMode() ? 'Mở tủ đồ' : `${outfits.length} outfit`}
                description="Quản lý outfit đã lưu"
                to={ROUTES.wardrobes}
                Icon={Shirt}
              />
            </div>
          </section>
        </>
      )}
    </section>
  )
}

function Shortcut({ label, value, description, to, Icon }: {
  label: string
  value: string
  description: string
  to: string
  Icon: LucideIcon
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-32 items-start gap-4 rounded-xl border border-[#E3E2E2] bg-white p-5 transition-colors hover:border-[#777777] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F5F3F3] text-[#222222]" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-[#222222]">{label}</span>
          <span className="rounded bg-[#F5F3F3] px-2 py-0.5 text-xs font-medium text-[#3A3632]">{value}</span>
        </span>
        <span className="mt-2 block text-sm leading-5 text-[#5E5F5D]">{description}</span>
      </span>
      <ArrowUpRight size={17} className="mt-1 shrink-0 text-[#5E5F5D] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
    </Link>
  )
}
