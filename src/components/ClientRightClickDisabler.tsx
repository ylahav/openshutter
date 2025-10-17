'use client'

import dynamic from 'next/dynamic'

// Dynamically import RightClickDisabler to ensure it only runs on client side
const RightClickDisabler = dynamic(() => import('@/components/RightClickDisabler'), {
  ssr: false
})

interface ClientRightClickDisablerProps {
  enabled?: boolean
  showWarning?: boolean
  warningMessage?: string
}

export default function ClientRightClickDisabler(props: ClientRightClickDisablerProps) {
  return <RightClickDisabler {...props} />
}

