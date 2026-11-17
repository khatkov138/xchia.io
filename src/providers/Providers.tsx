'use client';

import { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface ProvidersProps {
  children: ReactNode;
}

// 🎯 ИЗОЛИРОВАННЫЙ ДЕМОН: запускает сокет в фоне. 
// Возвращает null, благодаря чему вообще не триггерит ререндер основного дерева UI.

export function Providers({ children }: ProvidersProps) {
  // Инициализируем QueryClient внутри useState, чтобы кэш не шарился между 
  // разными пользователями при SSR (Server-Side Rendering)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Отключаем лишние перезапросы при потере фокуса окна в режиме разработки
            refetchOnWindowFocus: false, 
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* 🚀 Запускаем единственный фоновый вебсокет-поток */}
  
      {children}
      
      {/* 
        Интегрируем DevTools. 
        Панель по умолчанию скрыта, кнопка вызова будет аккуратно находиться 
        в правом нижнем углу экрана и не перекроет финтех-дизайн.
      */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
