import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_LANGUAGE, isSupportedLanguage, WalletLanguage } from '@/config/i18n'
import { getServerSettings } from './lib/utils/server-utils'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const fullUrl = `${pathname}${search}`
  const method = request.method

  // 🎯 ЛОГИРОВАНИЕ: Фильтруем ассеты, поисковых ботов и внутренние запросы самого сервера
  const isSystemAsset = 
    pathname === '/icon' ||
    pathname.startsWith('/icon/') ||
    pathname.startsWith('/apple-icon') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'

  if (!isSystemAsset) {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'

    // Отсеиваем внутренних "ботов" (SSR самого Next.js) и поисковых краулеров
    const isInternalRequest = ip === '::1' || ip === '127.0.0.1' || ua === 'node'
    const isBot = /bot|crawler|spider|googleother|bingpreview|slurp|duckduckbot|yandex|baiduspider|facebookexternalhit|twitterbot|telegrambot|discordbot|whatsapp|ahrefs|semrush|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|curl|wget|python-requests/i.test(ua)

    if (!isInternalRequest && !isBot) {
      const tag = pathname.startsWith('/api/') || pathname.startsWith('/ws') ? '[API/WS]' : '[PAGE]'
      console.log(`${tag} ${method} ${fullUrl} | IP: ${ip} | UA: ${ua}`)
    }
  }

  // 🎯 ШАГ 1: ДОБАВИЛИ ИСКЛЮЧЕНИЕ ДЛЯ /ws, /sitemap.xml и /robots.txt
  if (
    pathname === '/wallet' || 
    pathname.startsWith('/wallet/') || 
    pathname.startsWith('/api/') ||
    pathname.startsWith('/ws') ||
    isSystemAsset
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
  // Убрали 'api' из исключений, чтобы API-запросы попадали в логи (редирект их всё равно пропустит в Шаге 1)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
