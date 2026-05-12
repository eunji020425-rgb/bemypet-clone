'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, MessageSquare, MessagesSquare, Database, Trash2, Shield, ShieldOff,
  FileText, BarChart3, AlertTriangle, Eye, EyeOff,
} from 'lucide-react'

interface Stats {
  users: number
  posts: number
  comments: number
  chat: number
  placeRules: number
  walkRules: number
  hospitalRules: number
}

interface RecentPost {
  id: string
  title: string
  user_id: string
  created_at: string
  profiles?: any
}

interface RecentUser {
  id: string
  email: string
  nickname: string
  is_admin: boolean
  created_at: string
}

interface ChatMsg {
  id: string
  content: string
  user_id: string
  hidden: boolean
  created_at: string
  profiles?: any
}

interface RecentComment {
  id: string
  content: string
  post_id: string
  user_id: string
  created_at: string
  profiles?: any
  posts?: any
}

interface Props {
  stats: Stats
  currentUserId: string
  adminNickname: string
  recentPosts: RecentPost[]
  recentUsers: RecentUser[]
  recentChat: ChatMsg[]
  recentComments: RecentComment[]
}

type Tab = 'overview' | 'posts' | 'comments' | 'users' | 'chat' | 'cache'

export default function AdminDashboard({
  stats,
  currentUserId,
  adminNickname,
  recentPosts: initialPosts,
  recentUsers: initialUsers,
  recentChat: initialChat,
  recentComments: initialComments,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [posts, setPosts] = useState(initialPosts)
  const [users, setUsers] = useState(initialUsers)
  const [chat, setChat] = useState(initialChat)
  const [comments, setComments] = useState(initialComments)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const deletePost = async (id: string, title: string) => {
    if (!confirm(`"${title}" 게시글을 삭제하시겠습니까?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
        showMessage('게시글이 삭제되었습니다.')
      } else {
        showMessage('삭제에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleAdmin = async (id: string, currentIsAdmin: boolean, nickname: string) => {
    const action = currentIsAdmin ? '해제' : '부여'
    if (!confirm(`${nickname}님의 관리자 권한을 ${action}하시겠습니까?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-admin`, { method: 'POST' })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, is_admin: !currentIsAdmin } : u))
        showMessage(`관리자 권한이 ${action}되었습니다.`)
      } else {
        showMessage('실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async (type: 'place' | 'walk' | 'hospital') => {
    if (!confirm(`${type} 캐시를 모두 비우시겠습니까? (다음 방문 시 재분석됩니다)`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cache/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`${data.deleted}개의 캐시가 삭제되었습니다.`)
        router.refresh()
      } else {
        showMessage('실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteComment = async (id: string) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id))
        showMessage('댓글이 삭제되었습니다.')
      } else {
        showMessage('삭제에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleHideChat = async (id: string, currentlyHidden: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/chat/${id}/toggle-hide`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setChat(prev => prev.map(c => c.id === id ? { ...c, hidden: data.hidden } : c))
        showMessage(currentlyHidden ? '메시지가 다시 표시됩니다.' : '메시지가 숨김 처리되었습니다.')
      } else {
        showMessage('실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const cleanOldCache = async () => {
    if (!confirm('30일 이상된 캐시를 정리하시겠습니까?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cache/clean`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showMessage(`${data.deleted}개의 오래된 캐시가 정리되었습니다.`)
        router.refresh()
      } else {
        showMessage('실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="text-[#f5c518]" size={22} />
          <h1 className="text-xl font-bold text-[#2d2d2d]">운영자 대시보드</h1>
          <span className="text-xs text-[#aaa] ml-1">{adminNickname}님 안녕하세요</span>
        </div>
      </div>

      {/* 메시지 토스트 */}
      {message && (
        <div className="fixed top-20 right-4 z-50 bg-[#2d2d2d] text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {message}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 border-b border-[#ececec] mb-6">
        {[
          { id: 'overview' as const, label: '개요', icon: BarChart3 },
          { id: 'posts' as const, label: '게시글', icon: FileText },
          { id: 'comments' as const, label: '댓글', icon: MessageSquare },
          { id: 'users' as const, label: '사용자', icon: Users },
          { id: 'chat' as const, label: '실시간채팅', icon: MessagesSquare },
          { id: 'cache' as const, label: '캐시', icon: Database },
        ].map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#f5c518] text-[#f5c518]'
                  : 'border-transparent text-[#888] hover:text-[#444]'
              }`}
            >
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* 개요 탭 */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="가입자" value={stats.users} icon={Users} color="bg-blue-50 text-blue-600" />
          <StatCard label="게시글" value={stats.posts} icon={FileText} color="bg-amber-50 text-amber-600" />
          <StatCard label="댓글" value={stats.comments} icon={MessageSquare} color="bg-green-50 text-green-600" />
          <StatCard label="채팅 메시지" value={stats.chat} icon={MessagesSquare} color="bg-purple-50 text-purple-600" />
          <StatCard label="장소 캐시" value={stats.placeRules} icon={Database} color="bg-orange-50 text-orange-600" />
          <StatCard label="산책로 캐시" value={stats.walkRules} icon={Database} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="병원 캐시" value={stats.hospitalRules} icon={Database} color="bg-rose-50 text-rose-600" />
          <StatCard label="총 AI 분석" value={stats.placeRules + stats.walkRules + stats.hospitalRules} icon={BarChart3} color="bg-indigo-50 text-indigo-600" />
        </div>
      )}

      {/* 게시글 관리 탭 */}
      {tab === 'posts' && (
        <div className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#ececec] text-sm font-bold text-[#2d2d2d]">
            최근 게시글 ({posts.length})
          </div>
          <div className="divide-y divide-[#ececec]">
            {posts.length === 0 && <p className="text-center py-10 text-sm text-[#aaa]">게시글이 없습니다.</p>}
            {posts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2d2d2d] truncate">{p.title}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">
                    {(p.profiles as any)?.nickname ?? '익명'} · {new Date(p.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => deletePost(p.id, p.title)}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition disabled:opacity-50"
                >
                  <Trash2 size={12} />삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 댓글 관리 탭 */}
      {tab === 'comments' && (
        <div className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#ececec] text-sm font-bold text-[#2d2d2d]">
            최근 댓글 ({comments.length})
          </div>
          <div className="divide-y divide-[#ececec]">
            {comments.length === 0 && <p className="text-center py-10 text-sm text-[#aaa]">댓글이 없습니다.</p>}
            {comments.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#f5e97a] text-[#7a6a00] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(c.profiles as any)?.nickname?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-[#2d2d2d]">{(c.profiles as any)?.nickname ?? '익명'}</p>
                      <p className="text-xs text-[#aaa]">{new Date(c.created_at).toLocaleString('ko-KR')}</p>
                    </div>
                    {(c.posts as any)?.title && (
                      <p className="text-xs text-[#aaa] mt-0.5">📄 <a href={`/community/${c.post_id}`} target="_blank" className="hover:underline">{(c.posts as any).title}</a></p>
                    )}
                    <p className="text-sm text-[#444] mt-1 break-words">{c.content}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteComment(c.id)}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition disabled:opacity-50 flex-shrink-0"
                >
                  <Trash2 size={12} />삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용자 관리 탭 */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#ececec] text-sm font-bold text-[#2d2d2d]">
            최근 가입자 ({users.length})
          </div>
          <div className="divide-y divide-[#ececec]">
            {users.length === 0 && <p className="text-center py-10 text-sm text-[#aaa]">사용자가 없습니다.</p>}
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.is_admin ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.nickname?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#2d2d2d] truncate">{u.nickname}</p>
                      {u.is_admin && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1">
                          <Shield size={10} />관리자
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#aaa]">{u.email} · {new Date(u.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
                {u.id !== currentUserId && (
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin, u.nickname)}
                    disabled={loading}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition disabled:opacity-50 ${
                      u.is_admin
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {u.is_admin ? (<><ShieldOff size={12} />권한 해제</>) : (<><Shield size={12} />관리자 부여</>)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실시간 채팅 관리 탭 */}
      {tab === 'chat' && (
        <div className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#ececec] flex items-center justify-between">
            <p className="text-sm font-bold text-[#2d2d2d]">최근 채팅 메시지 ({chat.length})</p>
            <p className="text-xs text-[#aaa]">숨김 처리하면 일반 사용자에게 즉시 안 보이게 됩니다</p>
          </div>
          <div className="divide-y divide-[#ececec]">
            {chat.length === 0 && <p className="text-center py-10 text-sm text-[#aaa]">채팅 메시지가 없습니다.</p>}
            {chat.map(c => (
              <div key={c.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${c.hidden ? 'bg-gray-50' : ''}`}>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.hidden ? 'bg-gray-200 text-gray-500' : 'bg-[#f5e97a] text-[#7a6a00]'}`}>
                    {(c.profiles as any)?.nickname?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-[#2d2d2d]">{(c.profiles as any)?.nickname ?? '익명'}</p>
                      <p className="text-xs text-[#aaa]">{new Date(c.created_at).toLocaleString('ko-KR')}</p>
                      {c.hidden && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                          <EyeOff size={10} />숨김
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 break-words ${c.hidden ? 'text-[#aaa] line-through' : 'text-[#444]'}`}>{c.content}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleHideChat(c.id, c.hidden)}
                  disabled={loading}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition disabled:opacity-50 flex-shrink-0 ${
                    c.hidden
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {c.hidden ? (<><Eye size={12} />다시 표시</>) : (<><EyeOff size={12} />숨김</>)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 캐시 관리 탭 */}
      {tab === 'cache' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p>캐시를 비우면 다음 방문 시 모든 장소를 AI가 재분석합니다. Gemini API 사용량이 일시적으로 증가합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CacheCard label="장소 캐시 (식당/카페/운동장)" count={stats.placeRules} onClear={() => clearCache('place')} loading={loading} />
            <CacheCard label="산책로 캐시" count={stats.walkRules} onClear={() => clearCache('walk')} loading={loading} />
            <CacheCard label="병원 캐시" count={stats.hospitalRules} onClear={() => clearCache('hospital')} loading={loading} />
          </div>

          <button
            onClick={cleanOldCache}
            disabled={loading}
            className="w-full bg-[#2d2d2d] hover:bg-black text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50"
          >
            🗑 30일 이상된 오래된 캐시만 정리하기 (권장)
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ececec] p-4">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-[#888]">{label}</p>
      <p className="text-2xl font-bold text-[#2d2d2d] mt-1">{value.toLocaleString()}</p>
    </div>
  )
}

function CacheCard({ label, count, onClear, loading }: { label: string; count: number; onClear: () => void; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ececec] p-4">
      <p className="text-xs text-[#888]">{label}</p>
      <p className="text-2xl font-bold text-[#2d2d2d] mt-1 mb-3">{count.toLocaleString()}개</p>
      <button
        onClick={onClear}
        disabled={loading || count === 0}
        className="w-full text-xs text-red-600 border border-red-200 hover:bg-red-50 rounded-full py-1.5 transition disabled:opacity-50"
      >
        전체 비우기
      </button>
    </div>
  )
}
