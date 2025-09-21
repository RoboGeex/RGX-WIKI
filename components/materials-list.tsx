import type { Material } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

export default function MaterialsList({ materials, locale }: { materials: Material[]; locale: Locale }) {
  return (
    <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-3">
      <h3 className="font-semibold text-sm">Materials</h3>
      {materials.map((m, i) => (
        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
          <div>
            {locale === 'ar' ? m.name_ar : m.name_en}
            {m.sku && <span className="block text-[10px] text-gray-500">SKU: {m.sku}</span>}
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
            {m.qty}x
          </span>
        </div>
      ))}
    </div>
  )
}
