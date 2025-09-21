import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ alias: string }>
}

export default async function AliasPage({ params }: PageProps) {
  const { alias } = await params
  
  // Skip if it's a known route
  const knownRoutes = ['admin', 'api', 'login', 'albums', 'photos', 'owner', 'page']
  if (knownRoutes.includes(alias)) {
    return null
  }
  
  // Redirect to query parameter format
  redirect(`/page?alias=${encodeURIComponent(alias)}`)
}
