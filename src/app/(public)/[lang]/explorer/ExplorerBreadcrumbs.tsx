import React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface ExplorerBreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function ExplorerBreadcrumbs({ items }: ExplorerBreadcrumbsProps) {
  return (
    <div className="space-y-1.5 text-left">
      <nav className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase select-none">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight size={10} className="text-zinc-600 shrink-0" />
            )}
            
            {item.href && !item.isActive ? (
              <Link 
                href={item.href} 
                className="text-zinc-500 hover:text-white transition-colors duration-150"
              >
                {item.label}
              </Link>
            ) : (
              <span className={item.isActive ? "text-zinc-400" : "text-zinc-500"}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  )
}
