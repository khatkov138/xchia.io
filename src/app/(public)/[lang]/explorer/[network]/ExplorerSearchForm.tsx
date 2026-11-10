'use client'

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { WalletLanguage } from "@/config/i18n"

interface SearchFormProps {
  lang: WalletLanguage
  net: string
  placeholder: string
  btnText: string
}

export function ExplorerSearchForm({ lang, net, placeholder, btnText }: SearchFormProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = query.trim()
    if (!val || isSearching) return

    setIsSearching(true)
    setSearchError(null)

    try {
      // Стучимся к обновленному эндпоинту
      // Изменяем строку fetch запроса внутри handleSearch:
const response = await fetch(`/api/v1/search?q=${encodeURIComponent(val)}&network=${net}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Not found")
      }

      const data = await response.json() // Получаем { entity_type, redirect_url }
      
      // 🔥 Мега-фикс склейки роута: убираем лишние слэши, если они есть в начале redirect_url
      const cleanPath = data.redirect_url.startsWith("/") ? data.redirect_url : `/${data.redirect_url}`
      
      // Мягкий SPA редирект с учетом текущего языка
      router.push(`/${lang}${cleanPath}`)
      
    } catch (err: any) {
      console.error("Search error:", err)
      setSearchError(
        lang === "ru" 
          ? `Сущность не найдена в сети ${net.toUpperCase()}`
          : `Object not found in ${net.toUpperCase()} network`
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (searchError) setSearchError(null)
    setQuery(e.target.value)
  }

  return (
    <div className="w-full space-y-2 selection:bg-[#FF2E93]/30">
      <form 
        onSubmit={handleSearch} 
        className={`w-full flex items-center bg-zinc-900/40 border rounded-xl p-1.5 transition-all duration-200 backdrop-blur-sm ${
          searchError 
            ? "border-red-500/50 focus-within:border-red-500 shadow-lg shadow-red-500/5" 
            : "border-zinc-800/80 focus-within:border-zinc-700 focus-within:bg-zinc-900/60 focus-within:shadow-[0_0_20px_rgba(255,46,147,0.05)]"
        }`}
      >
        <div className="pl-3 text-zinc-500 shrink-0">
          {isSearching ? <Loader2 size={13} className="animate-spin text-zinc-400" /> : <Search size={13} />}
        </div>

        <input 
          type="text" 
          value={query} 
          onChange={handleInputChange} 
          disabled={isSearching}
          placeholder={placeholder} 
          className="w-full bg-transparent border-0 outline-none px-2.5 text-white text-[12px] font-medium placeholder-zinc-500 font-mono disabled:opacity-50" 
        />

        <button 
          type="submit" 
          disabled={isSearching || !query.trim()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-[10px] font-bold uppercase rounded-lg border border-zinc-700/50 transition-all active:scale-98 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-1.5 min-w-[85px] justify-center"
        >
          {isSearching ? (
            <span className="text-[9px] text-zinc-400">{lang === "ru" ? "ПОИСК..." : "SEARCH..."}</span>
          ) : (
            <span>{btnText}</span>
          )}
        </button>
      </form>

      {searchError && (
        <div className="flex items-center gap-1.5 pl-3 text-red-400 font-bold uppercase text-[9px] animate-in slide-in-from-top-1 duration-150">
          <AlertCircle size={11} />
          <span>{searchError}</span>
        </div>
      )}
    </div>
  )
}
