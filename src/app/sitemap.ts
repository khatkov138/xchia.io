import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://xchia.io'
  const languages = ['en', 'ru']

  // Основные страницы из вашей структуры src/app/(public)/[lang] и /wallet
  const localizedRoutes = [
    '',
    '/explorer',
    '/explorer/mainnet',
    '/explorer/testnet11',
    
  ]

  const entries: MetadataRoute.Sitemap = [
    // Страница кошелька (судя по вашему proxy.ts, она идет без префикса языка)
    {
      url: `${baseUrl}/wallet`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  // Генерируем ссылки для английской и русской версий
  for (const lang of languages) {
    for (const route of localizedRoutes) {
      entries.push({
        url: `${baseUrl}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: route.includes('/explorer') || route === '/nodes' ? 'hourly' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      })
    }
  }

  return entries
}
