interface ChatPeerLabelProps {
  email?: string | null
  displayName?: string | null
}

export default function ChatPeerLabel({ email, displayName }: ChatPeerLabelProps) {
  const address = email?.trim()
  const name = displayName?.trim()
  return (
    <span className="block min-w-0 text-left">
      <span className="block break-words text-sm font-semibold [overflow-wrap:anywhere]">
        {address || name || 'Bạn bè'}
      </span>
      {address && name && <>
        {' '}
        <span className="mt-1 block break-words text-xs font-normal opacity-75">{name}</span>
      </>}
    </span>
  )
}
