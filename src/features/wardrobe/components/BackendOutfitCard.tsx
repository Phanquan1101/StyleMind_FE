import { Link } from 'react-router-dom'

import type { OutfitSummary } from '@/shared/api/wardrobeApi'
import { formatDate } from '@/shared/lib/formatDate'

import { outfitSourceLabel } from '../model/backendOutfit'

export function BackendOutfitCard({ outfit }: { outfit: OutfitSummary }) {
  return (
    <Link
      to={`/outfits/${outfit.outfit_id}`}
      className="rounded-lg border border-[#E3DAD0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#684B5A]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#222222]">{outfit.name}</h2>
        <span className="rounded-full bg-[#F4E7E8] px-3 py-1 text-xs font-semibold text-[#684B5A]">
          {outfitSourceLabel(outfit.creation_source)}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#3A3632]">
        <span>{outfit.item_count} món</span>
        <span>{formatDate(outfit.updated_at)}</span>
      </div>
    </Link>
  )
}
