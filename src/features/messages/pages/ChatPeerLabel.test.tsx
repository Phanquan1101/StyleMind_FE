import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import ChatPeerLabel from './ChatPeerLabel'

it('places the email above the display name in separate blocks', () => {
  render(<ChatPeerLabel email="peer@example.test" displayName="TinTran" />)
  const email = screen.getByText('peer@example.test')
  const name = screen.getByText('TinTran')
  expect(email).toHaveClass('block')
  expect(name).toHaveClass('block')
  expect(email.nextElementSibling).toBe(name)
  expect(screen.queryByText('peer@example.test (TinTran)')).not.toBeInTheDocument()
})

it('shows the available identity when one field is missing', () => {
  const { rerender } = render(<ChatPeerLabel email="peer@example.test" displayName={null} />)
  expect(screen.getByText('peer@example.test')).toBeVisible()
  rerender(<ChatPeerLabel email={null} displayName="TinTran" />)
  expect(screen.getByText('TinTran')).toBeVisible()
  rerender(<ChatPeerLabel />)
  expect(screen.getByText('Bạn bè')).toBeVisible()
})
