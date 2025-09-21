import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ alias: string }>
}

export default async function Page({ params }: PageProps) {
  const { alias } = await params
  
  // Redirect to query parameter format
  redirect(`/page?alias=${encodeURIComponent(alias)}`)
}
