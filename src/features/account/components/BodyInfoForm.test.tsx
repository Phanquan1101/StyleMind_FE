import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it } from 'vitest'
import { validateStyleProfileInput, type StyleProfileInput } from '../model/validators'
import { BodyInfoForm } from './BodyInfoForm'

const base: StyleProfileInput = { fitPreference: 'SLIM', heightCm: '', weightKg: '', usualTopSize: '', usualBottomSize: '', shoeSize: '', styleCodes: 'CASUAL', colorCodes: 'NAVY', brandIds: '' }

function renderForm(initial: StyleProfileInput = base) {
  let latest = initial
  function Harness() {
    const [value, setValue] = useState(initial)
    latest = value
    return <BodyInfoForm value={value} errors={{}} onChange={setValue} />
  }
  render(<Harness />)
  return () => latest
}

it('uses dropdowns for sizes and keeps codes it does not edit unchanged', async () => {
  const user = userEvent.setup()
  const current = renderForm()
  await user.selectOptions(screen.getByLabelText('Cỡ áo thường dùng'), '2XL')
  await user.selectOptions(screen.getByLabelText('Cỡ giày'), '40')
  await user.type(screen.getByLabelText('Chiều cao (cm)'), '165')
  expect(current()).toMatchObject({ usualTopSize: '2XL', shoeSize: '40', heightCm: '165', fitPreference: 'SLIM', styleCodes: 'CASUAL', colorCodes: 'NAVY' })
  // Style/colour/fit codes have no source list, so they are not editable inputs.
  expect(screen.queryByLabelText(/Mã phong cách/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/Mã màu/)).not.toBeInTheDocument()
})

it('shows an old size that is no longer allowed instead of hiding it, and validation asks to choose again', () => {
  renderForm({ ...base, usualTopSize: 'Rộng' })
  expect(screen.getByRole('option', { name: /Rộng \(giá trị cũ/ })).toBeInTheDocument()
  expect(validateStyleProfileInput({ ...base, usualTopSize: 'Rộng' }).usualTopSize).toMatch(/chọn lại/)
})

it('validates height and weight against the server ranges', () => {
  const errors = validateStyleProfileInput({ ...base, heightCm: '99', weightKg: '201' })
  expect(errors.heightCm).toBe('Chiều cao phải từ 100 đến 230')
  expect(errors.weightKg).toBe('Cân nặng phải từ 30 đến 200')
  expect(validateStyleProfileInput({ ...base, heightCm: '165', weightKg: '52.5', usualBottomSize: '30', shoeSize: '38' })).toMatchObject({ heightCm: undefined, weightKg: undefined })
})
