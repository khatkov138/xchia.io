'use client'

import dynamic from 'next/dynamic'
import WalletGlobalLoading from './loading'

// 🚀 ОТКЛЮЧАЕМ SSR И ВШИВАЕМ НА ТИВНЫЙ ЛОАДЕР NEXT.JS
const WalletController = dynamic(
  () => import('./WalletController').then((mod) => mod.WalletController),
  { 
    ssr: false,
    loading: () => <WalletGlobalLoading /> // 🎯 Next.js сам покажет его вместо пустых черных окон!
  }
)

export default function WalletPage() {
  return <WalletController />
}
