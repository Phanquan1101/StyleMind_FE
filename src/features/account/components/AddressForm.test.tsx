import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { AddressForm } from './AddressForm'

const setup = (props: Partial<Parameters<typeof AddressForm>[0]> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<AddressForm provinces={[]} wards={[]} wardLoading={false} saving={false} onProvinceChange={vi.fn()} onCancel={vi.fn()} onSubmit={onSubmit} {...props} />)
  return { onSubmit, user: userEvent.setup() }
}
const fill = async (user: ReturnType<typeof userEvent.setup>, values: { name?: string; phone?: string; line?: string }) => {
  if (values.name !== undefined) await user.type(screen.getByLabelText(/^Tên người nhận/), values.name)
  if (values.phone !== undefined) await user.type(screen.getByLabelText(/^Số điện thoại Việt Nam/), values.phone)
  if (values.line !== undefined) await user.type(screen.getByLabelText(/^Địa chỉ \(số nhà/), values.line)
}

it('shows an error under every invalid field, focuses the first one and does not submit', async () => {
  const { onSubmit, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))
  expect(screen.getByText('Vui lòng nhập tên người nhận.')).toBeInTheDocument()
  expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeInTheDocument()
  expect(screen.getByText('Vui lòng nhập địa chỉ giao hàng.')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Tên người nhận/)).toHaveFocus()
  expect(screen.getByLabelText(/^Số điện thoại Việt Nam/)).toHaveAttribute('aria-invalid', 'true')
  expect(onSubmit).not.toHaveBeenCalled()
})

it('flags a malformed phone number under the phone field and focuses it', async () => {
  const { onSubmit, user } = setup()
  await fill(user, { name: 'Nguyễn Văn A', phone: 'abc', line: '12 Nguyễn Trãi' })
  await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))
  const phone = screen.getByLabelText(/^Số điện thoại Việt Nam/)
  expect(phone).toHaveFocus()
  expect(phone).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText(/chỉ gồm chữ số/)).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

it('clears a field error as soon as the user edits that field and submits a valid address', async () => {
  const { onSubmit, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))
  await fill(user, { name: 'Nguyễn Văn A', phone: '0912345678', line: '12 Nguyễn Trãi, Quận 1' })
  expect(screen.queryByText('Vui lòng nhập tên người nhận.')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ recipientName: 'Nguyễn Văn A', recipientPhone: '0912345678' }))
})

it('shows the server message inside the form when the save is rejected', () => {
  setup({ serverError: 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.' })
  expect(screen.getByRole('alert')).toHaveTextContent('Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.')
})

it('filters provinces without accents and loads wards only after selection', async () => {
  const onProvinceChange = vi.fn()
  const { user } = setup({
    provinces: [{ code: '01', name: 'Hà Nội' }, { code: '48', name: 'Đà Nẵng' }],
    onProvinceChange,
  })
  const province = screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ })
  await user.type(province, 'da nang')
  expect(screen.getByRole('option', { name: 'Đà Nẵng' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Hà Nội' })).not.toBeInTheDocument()
  expect(onProvinceChange).not.toHaveBeenCalled()
  await user.click(screen.getByRole('option', { name: 'Đà Nẵng' }))
  expect(onProvinceChange).toHaveBeenCalledWith('48')
  expect(province).toHaveValue('Đà Nẵng')
  expect(screen.getByLabelText('Phường/xã (không bắt buộc)')).toBeEnabled()
})

it('supports province keyboard selection and clearing the optional province', async () => {
  const onProvinceChange = vi.fn()
  const { user } = setup({ provinces: [{ code: '01', name: 'Hà Nội' }], onProvinceChange })
  const province = screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ })
  await user.type(province, 'ha noi')
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
  expect(province).toHaveValue('Hà Nội')
  expect(onProvinceChange).toHaveBeenLastCalledWith('01')
  await user.click(province)
  await user.click(screen.getByRole('option', { name: 'Không chọn tỉnh/thành' }))
  expect(province).toHaveValue('')
  expect(onProvinceChange).toHaveBeenLastCalledWith('')
  expect(screen.getByLabelText('Phường/xã (không bắt buộc)')).toBeDisabled()
})

it('keeps the selected province when an unmatched search loses focus', async () => {
  const onProvinceChange = vi.fn()
  const { user } = setup({ provinces: [{ code: '01', name: 'Hà Nội' }], onProvinceChange })
  const province = screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ })
  await user.click(province)
  await user.click(screen.getByRole('option', { name: 'Hà Nội' }))
  await user.click(province)
  await user.type(province, 'khong ton tai')
  expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy kết quả phù hợp.')
  await user.tab()
  expect(province).toHaveValue('Hà Nội')
  expect(onProvinceChange).toHaveBeenCalledTimes(1)
})

it('searches wards without accents and submits the selected ward code', async () => {
  const { onSubmit, user } = setup({
    provinces: [{ code: '01', name: 'Hà Nội' }],
    wards: [{ code: '00001', name: 'Phường Ba Đình' }, { code: '00002', name: 'Phường Hoàn Kiếm' }],
  })
  await fill(user, { name: 'Nguyễn Văn A', phone: '0912345678', line: '12 Nguyễn Trãi' })
  await user.click(screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ }))
  await user.click(screen.getByRole('option', { name: 'Hà Nội' }))
  const ward = screen.getByRole('combobox', { name: 'Phường/xã (không bắt buộc)' })
  await user.type(ward, 'ba dinh')
  expect(screen.queryByRole('option', { name: /Hoàn Kiếm/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Phường Ba Đình (00001)' }))
  expect(ward).toHaveValue('Phường Ba Đình (00001)')
  await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ wardCode: '00001' }))
})

it('clears the previous ward when the province changes', async () => {
  const { user } = setup({
    provinces: [{ code: '01', name: 'Hà Nội' }, { code: '48', name: 'Đà Nẵng' }],
    wards: [{ code: '00001', name: 'Phường Ba Đình' }],
  })
  const province = screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ })
  await user.click(province)
  await user.click(screen.getByRole('option', { name: 'Hà Nội' }))
  await user.type(screen.getByRole('combobox', { name: 'Phường/xã (không bắt buộc)' }), 'ba dinh')
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
  expect(screen.getByLabelText('Phường/xã (không bắt buộc)')).toHaveValue('Phường Ba Đình (00001)')
  await user.click(province)
  await user.click(screen.getByRole('option', { name: 'Đà Nẵng' }))
  expect(screen.getByLabelText('Phường/xã (không bắt buộc)')).toHaveValue('')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it('disables ward search while its options are loading', async () => {
  const { user } = setup({ provinces: [{ code: '01', name: 'Hà Nội' }], wardLoading: true })
  await user.click(screen.getByRole('combobox', { name: /Tỉnh\/thành để tra cứu/ }))
  await user.click(screen.getByRole('option', { name: 'Hà Nội' }))
  expect(screen.getByRole('combobox', { name: 'Phường/xã (không bắt buộc)' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh sách phường/xã…')
})
