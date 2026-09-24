import { useState, useRef, useEffect } from 'react'
import type { AppState, OutfitSuggestion } from '../types'
import { mockOutfitSuggestion, formatVND } from '../data/mockData'
import OutfitItemCard from '../components/fashion/OutfitItemCard'
import { OwnedBadge, ShopBadge } from '../components/ui/Badges'
import Button from '../components/ui/Button'
import Money from '../components/ui/Money'

const promptChips = [
  'Travel to Da Lat (4 days)',
  'Work meeting capsule',
  'Dinner date look',
  'Weekend café hopping',
  'Styling my cream blouse',
  'Rainy season layers',
]

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  outfit?: OutfitSuggestion
}

const initialMessages: Message[] = [
  {
    id: 'm1',
    role: 'ai',
    content:
      "Hello Lan. I'm ready to style you. Tell me where you're heading, what occasion you're preparing for, or ask how to style a specific piece in your wardrobe.",
  },
]

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function AIStylest({ onNavigate, app }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitSuggestion | null>(null)
  const [activeMobileView, setActiveMobileView] = useState<'chat' | 'outfit'>('chat')
  const [selectedShopPieces, setSelectedShopPieces] = useState<Set<string>>(new Set(['p1', 'p3']))
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // If navigated with an occasion parameter
  useEffect(() => {
    if (app?.opts?.occasion && messages.length === 1) {
      handleSendMessage(`I need an outfit for ${app.opts.occasion}`)
    }
  }, [app?.opts?.occasion])

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim() || isThinking) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsThinking(true)

    // Simulate grounded AI stylist response
    setTimeout(() => {
      setIsThinking(false)
      const isDaLat = query.toLowerCase().includes('da lat') || query.toLowerCase().includes('travel')

      const generatedOutfit: OutfitSuggestion = {
        ...mockOutfitSuggestion,
        title: isDaLat ? 'Feminine Minimalist — Da Lat Arrival' : `Curated Capsule — ${query}`,
        occasion: isDaLat ? 'Travel · Day 1 Arrival & Mountain Café' : query,
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: isDaLat
          ? "I've built a capsule specifically for Da Lat's mountain weather. To avoid unnecessary spending, you already own 3 of the 5 pieces (your silk blouse, linen trousers, and loafers). I've paired them with TOTÊME's Linen Blazer and an A.P.C. bag to add structure."
          : `Here is a curated look for "${query}". I maximized your wardrobe items so you only need to add 2 versatile pieces to complete the look.`,
        outfit: generatedOutfit,
      }

      setMessages(prev => [...prev, aiMsg])
      setSelectedOutfit(generatedOutfit)
      setActiveMobileView('outfit')
    }, 1200)
  }

  const toggleShopPiece = (id: string) => {
    setSelectedShopPieces(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddSelectedToCart = () => {
    if (!selectedOutfit || !app?.addToCart) return
    const shopItems = selectedOutfit.items.filter(
      item => item.status === 'shop' && item.productId && selectedShopPieces.has(item.productId)
    )

    shopItems.forEach(item => {
      app.addToCart({
        productId: item.productId!,
        name: item.name,
        brand: item.brand,
        size: item.size || 'M',
        color: item.color || 'Oat',
        colorHex: item.colorHex,
        price: item.price || 0,
        image: item.image,
        available: true,
        aiRec: `Recommended by StyleMind for ${selectedOutfit.occasion}`,
      })
    })

    onNavigate('cart')
  }

  const currentOutfit = selectedOutfit || mockOutfitSuggestion
  const ownedPieces = currentOutfit.items.filter(i => i.status === 'owned')
  const shopPieces = currentOutfit.items.filter(i => i.status === 'shop')

  const totalSelectedPrice = shopPieces.reduce((sum, item) => {
    if (item.productId && selectedShopPieces.has(item.productId) && item.price) {
      return sum + item.price
    }
    return sum
  }, 0)

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-[#FAF8F5]">
      {/* Mobile Toggle Bar */}
      <div className="lg:hidden flex border-b border-[#EEE8E1] bg-white sticky top-14 z-30">
        <button
          onClick={() => setActiveMobileView('chat')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeMobileView === 'chat'
              ? 'border-[#684B5A] text-[#684B5A]'
              : 'border-transparent text-[#6F6B67]'
          }`}
        >
          ✦ Stylist Chat
        </button>
        <button
          onClick={() => setActiveMobileView('outfit')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeMobileView === 'outfit'
              ? 'border-[#684B5A] text-[#684B5A]'
              : 'border-transparent text-[#6F6B67]'
          }`}
        >
          Curated Outfit ({currentOutfit.items.length})
        </button>
      </div>

      {/* Main Workspace: 2-Column Desktop Split View */}
      <div className="flex-1 grid lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_580px] overflow-hidden">
        {/* Left Column: Chat Conversation */}
        <div
          className={`flex flex-col border-r border-[#EEE8E1] bg-[#FAF8F5] ${
            activeMobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Stylist Header */}
          <div className="p-4 md:p-6 border-b border-[#EEE8E1] bg-white/70 backdrop-blur-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F4E7E8] text-[#684B5A] flex items-center justify-center font-bold text-sm">
                ✦
              </div>
              <div>
                <h1 className="font-display text-lg font-normal text-[#222222]">StyleMind AI Stylist</h1>
                <p className="text-xs text-[#6F6B67]">Grounded in your 8 wardrobe pieces</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#EAF2EC] text-[#48755A] font-semibold border border-[#48755A]/20">
              ● Online
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-[#684B5A] text-white flex items-center justify-center text-xs flex-none mt-1">
                    ✦
                  </div>
                )}
                <div
                  className={`max-w-xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#684B5A] text-white rounded-tr-xs'
                      : 'bg-white border border-[#EEE8E1] text-[#222222] shadow-2xs rounded-tl-xs'
                  }`}
                >
                  <p>{msg.content}</p>

                  {msg.outfit && (
                    <div className="mt-3 pt-3 border-t border-[#EEE8E1] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#684B5A]">
                        ✦ {msg.outfit.title}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedOutfit(msg.outfit!)
                          setActiveMobileView('outfit')
                        }}
                        className="text-xs font-semibold text-[#684B5A] underline hover:opacity-80"
                      >
                        Inspect Outfit →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-[#684B5A] text-white flex items-center justify-center text-xs flex-none mt-1">
                  ✦
                </div>
                <div className="bg-white border border-[#EEE8E1] rounded-2xl p-4 shadow-2xs text-xs text-[#6F6B67] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#684B5A] animate-ping" />
                  <span>Cross-referencing your wardrobe against catalog silhouettes...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 md:px-6 py-2 border-t border-[#EEE8E1] bg-white/50 overflow-x-auto">
            <div className="flex gap-2 pb-1" style={{ scrollbarWidth: 'none' }}>
              {promptChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="flex-none px-3 py-1.5 rounded-full text-xs font-medium bg-[#FAF8F5] border border-[#D8D0C6] text-[#3A3632] hover:bg-[#F4E7E8] hover:border-[#684B5A] transition-colors"
                >
                  ✦ {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 md:p-6 border-t border-[#EEE8E1] bg-white">
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="stylist-input" className="sr-only">Ask StyleMind for styling advice</label>
              <input
                id="stylist-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask StyleMind: 'Outfit for a weekend in Da Lat' or 'How to wear my camel coat'..."
                className="flex-1 px-4 py-3 rounded-full border border-[#D8D0C6] bg-[#FAF8F5] text-sm text-[#222222] outline-none focus:border-[#684B5A] focus:ring-2 focus:ring-[#684B5A]/20"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!input.trim() || isThinking}
              >
                Send
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Grounded Outfit Analysis Workspace */}
        <div
          className={`flex flex-col bg-[#FDFCFA] overflow-y-auto ${
            activeMobileView === 'outfit' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#EEE8E1] bg-white sticky top-0 z-20">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B98791]">
                {currentOutfit.occasion}
              </span>
              <div className="flex gap-2">
                <OwnedBadge label={`${ownedPieces.length} Owned`} />
                <ShopBadge label={`${shopPieces.length} To Buy`} price={totalSelectedPrice} />
              </div>
            </div>
            <h2 className="font-display text-2xl font-light text-[#222222]">
              {currentOutfit.title}
            </h2>
          </div>

          <div className="p-6 space-y-8 flex-1">
            {/* Stylist Reason Note */}
            <div className="p-4 rounded-2xl bg-[#F4E7E8] border border-[#684B5A]/20 text-xs text-[#3A3632] leading-relaxed">
              <p className="font-bold text-[#684B5A] mb-1">Stylist Note:</p>
              <p>{currentOutfit.notes}</p>
            </div>

            {/* ZONE 1: YOU ALREADY OWN (Principle 1) */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEE8E1]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EAF2EC] text-[#48755A] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#48755A]">
                    Already In Your Wardrobe ({ownedPieces.length} Items)
                  </h3>
                </div>
                <span className="text-xs text-[#6F6B67]">Zero additional spend</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ownedPieces.map(piece => (
                  <OutfitItemCard
                    key={piece.name}
                    item={piece}
                    onViewDetails={() => onNavigate('wardrobe')}
                  />
                ))}
              </div>
            </div>

            {/* ZONE 2: RECOMMENDED TO BUY (Principle 1 & 2) */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEE8E1]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F4E7E8] text-[#684B5A] flex items-center justify-center text-xs font-bold">
                    +
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#684B5A]">
                    Recommended To Complete Look ({shopPieces.length} Items)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#222222]">
                  Subtotal: <Money amount={totalSelectedPrice} />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {shopPieces.map(piece => (
                  <OutfitItemCard
                    key={piece.name}
                    item={piece}
                    selected={piece.productId ? selectedShopPieces.has(piece.productId) : false}
                    onToggleSelect={() => piece.productId && toggleShopPiece(piece.productId)}
                    onViewDetails={() => piece.productId && onNavigate('product-detail', { productId: piece.productId })}
                  />
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-[#EEE8E1] space-y-3">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleAddSelectedToCart}
                icon={<span>🛒</span>}
              >
                Add {selectedShopPieces.size} Selected to Bag · {formatVND(totalSelectedPrice)}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => onNavigate('outfit-result')}
                >
                  Full Breakdown
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => onNavigate('studio')}
                >
                  3D Studio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
