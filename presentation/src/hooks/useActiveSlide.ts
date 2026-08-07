import { useState, useEffect, useRef, useCallback } from 'react'

export function useActiveSlide(slideIds: string[]) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slideIds.indexOf(entry.target.id)
            if (idx !== -1) setActiveIndex(idx)
          }
        }
      },
      { threshold: 0.5 }
    )

    const container = containerRef.current
    if (!container) return

    for (const id of slideIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [slideIds])

  const scrollTo = useCallback((index: number) => {
    const el = document.getElementById(slideIds[index])
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [slideIds])

  return { activeIndex, scrollTo, containerRef }
}
