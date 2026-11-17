import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_LANGUAGE, isSupportedLanguage, WalletLanguage } from '@/config/i18n'
import { getServerSettings } from './lib/utils/server-utils'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 🎯 ШАГ 1: ДОБАВИЛИ ИСКЛЮЧЕНИЕ ДЛЯ /ws
  // Теперь мидлвара не трогает веб-сокеты и они летят прямиком в rewrites до порта 8000!
    // 🎯 ШАГ 1: ДОБАВИЛИ ИСКЛЮЧЕНИЕ ДЛЯ /ws, /sitemap.xml и /robots.txt
  if (
    pathname === '/wallet' || 
    pathname.startsWith('/wallet/') || 
    pathname.startsWith('/api/') ||
    pathname.startsWith('/ws') ||
    pathname === '/icon' ||
    pathname.startsWith('/icon/') ||
    pathname.startsWith('/apple-icon') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }


  // 2. Вычисляем язык
  const settings = await getServerSettings()
  const cookieLang = settings?.language
  let targetLang: WalletLanguage = DEFAULT_LANGUAGE
  if (cookieLang && isSupportedLanguage(cookieLang)) {
    targetLang = cookieLang
  } else {
    const acceptLanguage = request.headers.get('accept-language') || ''
    if (acceptLanguage.includes('ru')) targetLang = 'ru'
  }

  // 3. Если префикса нет
  if (!pathname.startsWith('/en') && !pathname.startsWith('/ru')) {
    // 🎯 ФИКС ДЛЯ ПРОДА: Формируем правильный URL с учетом протокола Cloudflare
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'xchia.io'
    
    const targetPath = pathname === '/' ? `/${targetLang}${search}` : `/${targetLang}${pathname}${search}`
    
    // Перенаправляем жестко по правильному протоколу, чтобы не было петли!
    return NextResponse.redirect(`${protocol}://${host}${targetPath}`)
  }

  return NextResponse.next()
}

export const config = {
  // Матчер оставляем исходный и безопасный (без yaml и без регулярок, ломающих дев-сервер)
  matcher: [
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
