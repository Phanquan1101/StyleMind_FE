import type { OutfitItemView } from '@/shared/api/wardrobeApi'
import { commerceImageUrl } from '@/shared/lib/commerceImageUrl'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { Button } from '@/shared/ui'

interface BackendOutfitItemCardProps {
  item: OutfitItemView
  removeDisabled: boolean
  removing: boolean
  onRemove: (outfitItemId: string) => void
}

// TODO: thêm "Thêm vào giỏ" và link sang /products/:id khi Shop/Cart nối thật (hiện catalog và giỏ vẫn là demo).
export function BackendOutfitItemCard({ item, removeDisabled, removing, onRemove }: BackendOutfitItemCardProps) {
  const name = item.product_name ?? 'Sản phẩm không còn trong catalog'
  const image = commerceImageUrl(item.image_url)
  const variantLabel = [item.color, item.size].filter(Boolean).join(' · ')

  return (
    <article className={`overflow-hidden rounded-lg border bg-white shadow-sm ${item.available ? 'border-[#E3DAD0]' : 'border-dashed border-[#D8D0C6]'}`}>
      {image && <img src={image} alt={name} className="aspect-[4/5] w-full object-cover" />}
      <div className="p-4">
        <h2 className="font-semibold text-[#222222]">{name}</h2>
        {variantLabel && <p className="mt-1 text-sm text-[#6F6B67]">{variantLabel}</p>}
        {item.available && item.unit_price_vnd !== null ? (
          <p className="mt-3 font-semibold text-[#222222]">{formatCurrency(item.unit_price_vnd)}</p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[#A94B4B]">Ngừng bán</p>
        )}
      </div>
      <div className="border-t border-[#EEE8E1] p-4">
        <Button
          variant="danger-soft"
          size="sm"
          disabled={removeDisabled}
          loading={removing}
          aria-label={`Xóa món ${name}`}
          onClick={() => onRemove(item.outfit_item_id)}
        >
          Xóa món
        </Button>
      </div>
    </article>
  )
}
