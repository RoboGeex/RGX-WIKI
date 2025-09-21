import dynamic from 'next/dynamic'

const PropertiesForm = dynamic(() => import('@/components/editor/PropertiesForm'), { ssr: false })

export default function PropertiesPage() {
  return <PropertiesForm />
}