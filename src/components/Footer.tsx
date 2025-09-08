'use client'

import { useI18n } from '@/hooks/useI18n'

export default function Footer() {
  const { t } = useI18n()
  
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-300">
            © {new Date().getFullYear()} OpenShutter. {t('footer.allRightsReserved')}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {t('footer.systemDescription')}
          </p>
        </div>
      </div>
    </footer>
  )
}
