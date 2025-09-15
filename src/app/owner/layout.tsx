import OwnerGuard from '@/components/OwnerGuard'

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OwnerGuard>
      {children}
    </OwnerGuard>
  )
}
