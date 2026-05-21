'use client'

import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface ToastState {
  id: number
  type: 'success' | 'error'
  message: string
}

/**
 * 가벼운 자체 토스트 훅
 * 사용: const { show, ToastHost } = useDangerToast()
 *       <ToastHost />
 *       show('성공!', 'success')
 */
export function useDangerToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToast({ id, type, message })
    window.setTimeout(() => {
      setToast(t => (t?.id === id ? null : t))
    }, 3000)
  }, [])

  const ToastHost = useCallback(() => {
    if (!toast) return null
    if (typeof document === 'undefined') return null
    return createPortal(
      <div
        style={{ zIndex: 10000 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 max-w-[440px] w-[calc(100%-32px)]"
      >
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span className="flex-1">{toast.message}</span>
        </div>
      </div>,
      document.body
    )
  }, [toast])

  return { show, ToastHost }
}
