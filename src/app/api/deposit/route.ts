// src/app/api/deposit/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // 🎯 Твоя партнерская реф-ссылка на BingX
  const BINGX_REF_URL = "https://bingxdao.com/invite/XSUFVW/" 
  
  // Возвращаем временный 307-редирект. 
  // Браузер пользователя мгновенно перейдет на биржу, 
  // а строгая CSP кошелька (connect-src) не выдаст никаких ошибок.
  return NextResponse.redirect(BINGX_REF_URL, 307)
}
