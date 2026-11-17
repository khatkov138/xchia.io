"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const lang = pathname?.startsWith("/ru") ? "ru" : "en";
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [pathname]);

  return null;
}
