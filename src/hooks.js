import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Persiste un estado en localStorage
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage lleno o no disponible: ignoramos
    }
  }, [key, value])

  return [value, setValue]
}

// Mide el tamaño real (en px) de un elemento y se actualiza al redimensionar
export function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Reaccionar también al resize/orientación de la ventana (red de seguridad)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return [ref, size]
}

// Genera ids únicos sin dependencias externas
export function useIdFactory() {
  const counter = useRef(0)
  return useCallback(() => {
    counter.current += 1
    return `${Date.now().toString(36)}-${counter.current}`
  }, [])
}
