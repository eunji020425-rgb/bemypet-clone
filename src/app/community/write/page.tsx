'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, X } from 'lucide-react'

export default function WritePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    let imageUrl: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `posts/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, imageFile)
      if (uploadError) {
        setError('이미지 업로드에 실패했습니다.')
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('posts').insert({
      user_id: user.id,
      title,
      content,
      image_url: imageUrl,
    })

    setLoading(false)
    if (insertError) {
      setError('게시글 작성에 실패했습니다.')
    } else {
      router.push('/community')
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-[#2a3a55] mb-6">글쓰기</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#d6e6ff] p-6 flex flex-col gap-4">
        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full border-b border-[#d6e6ff] pb-3 text-base font-medium outline-none focus:border-[#3a7ab8]"
        />
        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          rows={8}
          className="w-full text-sm outline-none resize-none text-[#444] leading-relaxed"
        />

        {/* 이미지 첨부 */}
        {imagePreview ? (
          <div className="relative w-fit">
            <img src={imagePreview} alt="미리보기" className="max-h-48 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-[#aaa] hover:text-[#3a7ab8] transition-colors w-fit"
          >
            <ImagePlus size={18} />
            사진 첨부
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 text-sm text-[#888] border border-[#d6e6ff] rounded-full hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-bold bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white rounded-full transition disabled:opacity-60"
          >
            {loading ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
