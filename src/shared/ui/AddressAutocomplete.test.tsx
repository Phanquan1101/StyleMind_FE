import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import AddressAutocomplete from './AddressAutocomplete'

function Form() { const [value, setValue] = useState(''); return <AddressAutocomplete label="Địa chỉ" value={value} onChange={setValue} token="test-token" /> }
afterEach(() => vi.unstubAllGlobals())
it('gợi ý địa chỉ Việt Nam và điền địa chỉ đã chọn', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ place_id: '1', formatted: 'Quận 1, Thành phố Hồ Chí Minh, Việt Nam' }] }) })
  vi.stubGlobal('fetch', fetcher)
  render(<Form />)
  const user = userEvent.setup()
  await user.type(screen.getByRole('combobox', { name: 'Địa chỉ' }), 'Quận 1')
  const option = await screen.findByRole('option', { name: /Quận 1, Thành phố/ })
  const url = new URL(fetcher.mock.calls[0][0])
  expect(url.origin + url.pathname).toBe('https://api.geoapify.com/v1/geocode/autocomplete')
  expect(url.searchParams.get('filter')).toBe('countrycode:vn')
  expect(url.searchParams.get('lang')).toBe('vi')
  expect(url.searchParams.get('format')).toBe('json')
  expect(url.searchParams.get('limit')).toBe('5')
  expect(url.searchParams.get('apiKey')).toBe('test-token')
  expect(url.searchParams.get('text')).toBe('Quận 1')
  await user.click(option)
  expect(screen.getByRole('combobox', { name: 'Địa chỉ' })).toHaveValue('Quận 1, Thành phố Hồ Chí Minh, Việt Nam')
  await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument())
})
it('cho phép nhập tay nếu dịch vụ gợi ý lỗi', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
  render(<Form />)
  await userEvent.setup().type(screen.getByRole('combobox', { name: 'Địa chỉ' }), '123 đường')
  expect(await screen.findByText(/vẫn có thể nhập địa chỉ/)).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Địa chỉ' })).toHaveValue('123 đường')
})
it('giữ địa chỉ nhập tay khi Geoapify không có kết quả', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }))
  render(<Form />)
  await userEvent.setup().type(screen.getByRole('combobox', { name: 'Địa chỉ' }), '123 đường')
  expect(await screen.findByText(/Không tìm thấy gợi ý/)).toBeInTheDocument()
  expect(screen.queryByRole('option')).not.toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Địa chỉ' })).toHaveValue('123 đường')
})
it('xử lý phản hồi sai định dạng mà vẫn cho nhập địa chỉ', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }))
  render(<Form />)
  await userEvent.setup().type(screen.getByRole('combobox', { name: 'Địa chỉ' }), '123 đường')
  expect(await screen.findByText(/Không tải được gợi ý/)).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Địa chỉ' })).toHaveValue('123 đường')
})
it('chọn gợi ý Geoapify bằng bàn phím và bỏ qua mục không hợp lệ', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [null, {}, { formatted: ' ' }, { formatted: 'Hà Nội, Việt Nam' }] }) }))
  render(<Form />)
  const user = userEvent.setup()
  await user.type(screen.getByRole('combobox', { name: 'Địa chỉ' }), 'Hà Nội')
  await screen.findByRole('option', { name: 'Hà Nội, Việt Nam' })
  expect(screen.getAllByRole('option')).toHaveLength(1)
  await user.keyboard('{ArrowDown}{Enter}')
  expect(screen.getByRole('combobox', { name: 'Địa chỉ' })).toHaveValue('Hà Nội, Việt Nam')
  expect(screen.queryByRole('option')).not.toBeInTheDocument()
})
