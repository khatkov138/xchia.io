// src/app/public-zone/[lang]/icon.tsx
import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

interface IconProps {
  params: Promise<{ lang: string }>
}

export default async function Icon({ params }: IconProps) {
  // Железно дожидаемся параметров роута для Next.js 16/17
  await params

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0c0c0e', // Глубокий темный фон
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1px solid #1e1b21',
        }}
      >
        {/* Буква X с градиентом от розового к фиолетовому прямо как на лендинге */}
        <span
          style={{
            backgroundImage: 'linear-gradient(to right, #FF2E93, #8B5CF6)', // Твой градиент from-[#FF2E93] to-[#8B5CF6]
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontSize: '30px',
            fontWeight: 950,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transform: 'translateY(-0.5px)',
          }}
        >
          X
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
