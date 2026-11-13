import { TextField } from '@/shared/ui'
import { LockKeyhole } from 'lucide-react'

import type { FieldErrors, ProfileInput } from '../model/validators'

interface ProfileFormProps {
  value: ProfileInput
  email: string
  errors: FieldErrors<ProfileInput>
  onChange: (value: ProfileInput) => void
}

export function ProfileForm({ value, email, errors, onChange }: ProfileFormProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 id="account-profile-heading" className="font-display text-2xl font-semibold text-[#222222]">Thông tin cá nhân</h2>
        <p className="mt-1 text-sm leading-6 text-[#5E5F5D]">Tên hiển thị của bạn trên StyleMind.</p>
      </div>
      <div className="grid gap-4">
        <TextField
          label="Tên hiển thị"
          value={value.displayName}
          error={errors.displayName}
          onChange={event => onChange({ ...value, displayName: event.target.value })}
        />
        <label className="grid gap-2 text-sm font-semibold text-[#3A3632]" htmlFor="account-email">
          Email đăng nhập
          <span className="relative block">
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              className="min-h-11 w-full rounded-lg border border-[#E3E2E2] bg-[#F5F3F3] px-3 pr-10 text-sm font-medium text-[#5E5F5D] outline-none"
            />
            <LockKeyhole size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5E5F5D]" aria-hidden="true" />
          </span>
          <span className="text-xs font-normal leading-5 text-[#5E5F5D]">Email này đang dùng để đăng nhập và hiện chưa thể đổi tại trang này.</span>
        </label>
      </div>
    </div>
  )
}
