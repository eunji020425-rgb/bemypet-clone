'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, X, Check } from 'lucide-react'

export default function EditNickname({ currentNickname }: { currentNickname: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentNickname)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const save = async () => {
    const trimmed = value.trim()
    if (trimmed.length < 2) { setErr('2자 이상'); return }
    if (trimmed.length > 20) { setErr('20자 이내'); return }
    setLoading(true)
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('profiles').update({ nickname: trimmed }).eq('id', user.id)
    setLoading(false)
    if (error) {
      setErr('저장 실패')
    } else {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="p-2 text-[#94a3b8] hover:text-[#3a7ab8]"
        aria-label="닉네임 수정"
      >
        <Pencil size={14} />
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={20}
          disabled={loading}
          className="w-28 border border-[#d6e6ff] rounded-lg px-2 py-1 text-sm outline-none focus:border-[#3a7ab8] text-right"
        />
        <button onClick={save} disabled={loading} className="p-1.5 text-[#22c55e] hover:bg-[#dcfce7] rounded">
          <Check size={14} />
        </button>
        <button
          onClick={() => { setEditing(false); setValue(currentNickname); setErr('') }}
          className="p-1.5 text-[#94a3b8] hover:bg-[#f1f5f9] rounded"
        >
          <X size={14} />
        </button>
      </div>
      {err && <p className="text-[10px] text-red-500">{err}</p>}
    </div>
  )
}
