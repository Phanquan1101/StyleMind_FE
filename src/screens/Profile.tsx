import { useState } from 'react'
import type { AppState } from '../types'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ColorSwatch from '../components/fashion/ColorSwatch'

const sections = [
  { key: 'style', label: 'Style Profile', icon: '✦' },
  { key: 'fit', label: 'Body & Fit (Optional)', icon: '◎' },
  { key: 'brands', label: 'Favorite Brands', icon: '⊕' },
  { key: 'colors', label: 'Color Preferences', icon: '◐' },
  { key: 'account', label: 'Account & Addresses', icon: '○' },
]

const styleChips = ['Minimalist', 'Classic', 'Feminine', 'Smart Casual', 'Editorial', 'Bohemian', 'Streetwear', 'Tailored']
const brandOptions = ['TOTÊME', 'COS', 'A.P.C.', '& Other Stories', 'Massimo Dutti', 'Arket', 'Uniqlo', 'Mango', 'Reformation']

const colorPalette = [
  { name: 'Ivory', hex: '#F5EDD8' },
  { name: 'Oat Sand', hex: '#E8DDD2' },
  { name: 'Camel', hex: '#C8A882' },
  { name: 'Deep Plum', hex: '#684B5A' },
  { name: 'Muted Rose', hex: '#B98791' },
  { name: 'Charcoal Black', hex: '#222222' },
  { name: 'Navy Slate', hex: '#2B3A54' },
  { name: 'Sage Green', hex: '#8FA87A' },
]

interface Props {
  onNavigate: (screen: string, opts?: any) => void
  app?: AppState
}

export default function Profile({ onNavigate, app }: Props) {
  const [activeSection, setActiveSection] = useState('style')
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set(['Minimalist', 'Feminine', 'Classic']))
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set(['TOTÊME', 'COS', 'A.P.C.', 'Arket']))
  const [fitPreference, setFitPreference] = useState('Relaxed')
  const [savedFeedback, setSavedFeedback] = useState(false)

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => {
      const next = new Set(prev)
      next.has(style) ? next.delete(style) : next.add(style)
      return next
    })
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev)
      next.has(brand) ? next.delete(brand) : next.add(brand)
      return next
    })
  }

  const handleSave = () => {
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh' }}>
      <PageHeader
        category="Personal Preferences"
        title="Style & Fit Profile"
        subtitle="Manage your style preferences, preferred fits, and brand affinities to tune StyleMind recommendations."
      />

      {/* User Hero Card */}
      <div className="px-6 md:px-16 mb-8">
        <div className="p-6 rounded-3xl bg-[#EEE8E1] border border-[#D8D0C6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#684B5A] text-white flex items-center justify-center font-display text-2xl font-semibold shadow-xs">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-normal text-[#222222]">Nguyen Thi Lan</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4E7E8] text-[#684B5A]">
                  StyleMind Member
                </span>
              </div>
              <p className="text-xs text-[#6F6B67]">lan.nguyen@email.com · Member since 2024</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={() => onNavigate('orders')}
          >
            View Order History →
          </Button>
        </div>
      </div>

      <div className="px-6 md:px-16 pb-24 grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Navigation Sidebar */}
        <nav className="p-3 rounded-2xl bg-white border border-[#EEE8E1] space-y-1" aria-label="Profile navigation">
          {sections.map(s => {
            const isActive = activeSection === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-[#F4E7E8] text-[#684B5A] font-semibold'
                    : 'text-[#6F6B67] hover:text-[#222222] hover:bg-[#FAF8F5]'
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Content Pane */}
        <div className="space-y-6">
          {/* SECTION 1: STYLE PROFILE */}
          {activeSection === 'style' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-6 fade-in">
              <div>
                <h3 className="font-display text-2xl font-light text-[#222222] mb-1">
                  Style Aesthetics
                </h3>
                <p className="text-xs text-[#6F6B67]">
                  Select the aesthetics that represent how you enjoy dressing.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {styleChips.map(chip => {
                  const isSelected = selectedStyles.has(chip)
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleStyle(chip)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-[#684B5A] text-white border-[#684B5A] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#3A3632] border-[#D8D0C6] hover:border-[#684B5A]'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{chip}
                    </button>
                  )
                })}
              </div>

              <div className="pt-6 border-t border-[#EEE8E1]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9D9894] mb-3">
                  Preferred Fit Silhouette
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Slim', 'Regular', 'Relaxed', 'Oversized'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFitPreference(f)}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                        fitPreference === f
                          ? 'bg-[#684B5A] text-white border-[#684B5A] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#3A3632] border-[#D8D0C6] hover:bg-[#EEE8E1]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="primary" size="md" onClick={handleSave}>
                  {savedFeedback ? '✓ Saved!' : 'Save Style Profile'}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 2: BODY & FIT (Principle 74: Respectful, optional, non-judgmental) */}
          {activeSection === 'fit' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-6 fade-in">
              <div>
                <h3 className="font-display text-2xl font-light text-[#222222] mb-1">
                  Body & Fit Profile (Optional)
                </h3>
                <p className="text-xs text-[#6F6B67]">
                  Helps StyleMind suggest sizing without requiring manual chart checking.
                </p>
              </div>

              {/* Principle 74: Respectful explanation alert */}
              <div className="p-4 rounded-2xl bg-[#F4E7E8] border border-[#684B5A]/20 flex items-start gap-3">
                <span className="text-[#684B5A] font-bold text-base mt-0.5">✦</span>
                <p className="text-xs text-[#3A3632] leading-relaxed">
                  <strong>Our sizing philosophy:</strong> Sizing measurements are entirely optional, skippable, and editable at any time. StyleMind uses these exclusively to anticipate garment drape and suggest comfortable sizes. We never rank or label body shapes.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Height (Optional)
                  </label>
                  <input
                    defaultValue="163 cm"
                    placeholder="e.g. 163 cm"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-xs outline-none bg-[#FAF8F5] focus:border-[#684B5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Usual Top Size
                  </label>
                  <input
                    defaultValue="S (EU 36)"
                    placeholder="e.g. S, 36"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-xs outline-none bg-[#FAF8F5] focus:border-[#684B5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Usual Bottom Size
                  </label>
                  <input
                    defaultValue="S / 27 inch"
                    placeholder="e.g. 27 inch"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-xs outline-none bg-[#FAF8F5] focus:border-[#684B5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6F6B67] mb-1">
                    Shoe Size
                  </label>
                  <input
                    defaultValue="37 EU"
                    placeholder="e.g. 37 EU"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D0C6] text-xs outline-none bg-[#FAF8F5] focus:border-[#684B5A]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => alert('Measurements cleared')}
                  className="text-xs text-[#9D9894] hover:text-[#A94B4B] underline"
                >
                  Clear all measurements
                </button>
                <Button variant="primary" size="md" onClick={handleSave}>
                  {savedFeedback ? '✓ Saved!' : 'Save Fit Profile'}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 3: FAVORITE BRANDS */}
          {activeSection === 'brands' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-6 fade-in">
              <div>
                <h3 className="font-display text-2xl font-light text-[#222222] mb-1">
                  Brand Affinities
                </h3>
                <p className="text-xs text-[#6F6B67]">
                  Tell StyleMind which designers align with your quality and aesthetic standards.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {brandOptions.map(brand => {
                  const isSelected = selectedBrands.has(brand)
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className={`p-3.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#684B5A] text-white border-[#684B5A] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#3A3632] border-[#D8D0C6] hover:bg-[#EEE8E1]'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{brand}
                    </button>
                  )
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="primary" size="md" onClick={handleSave}>
                  {savedFeedback ? '✓ Saved!' : 'Save Brand Preferences'}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 4: COLOR PREFERENCES */}
          {activeSection === 'colors' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-6 fade-in">
              <div>
                <h3 className="font-display text-2xl font-light text-[#222222] mb-1">
                  Palette Preferences
                </h3>
                <p className="text-xs text-[#6F6B67]">
                  StyleMind builds wardrobe capsules using these preferred tonal foundations.
                </p>
              </div>

              <ColorSwatch
                colors={colorPalette}
                showLabels={true}
                size="md"
              />

              <div className="pt-4 flex justify-end">
                <Button variant="primary" size="md" onClick={handleSave}>
                  {savedFeedback ? '✓ Saved!' : 'Save Color Preferences'}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 5: ACCOUNT & ADDRESSES */}
          {activeSection === 'account' && (
            <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EEE8E1] shadow-2xs space-y-6 fade-in">
              <div>
                <h3 className="font-display text-2xl font-light text-[#222222] mb-1">
                  Account Details
                </h3>
                <p className="text-xs text-[#6F6B67]">Manage your profile and default shipping locations.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EEE8E1] space-y-2 text-xs">
                <p><strong>Name:</strong> Nguyen Thi Lan</p>
                <p><strong>Email:</strong> lan.nguyen@email.com</p>
                <p><strong>Primary Address:</strong> 47 Đường Trần Thái Tông, Cầu Giấy, Hà Nội</p>
              </div>

              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => alert('Editing address')}>
                  Edit Default Address
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
