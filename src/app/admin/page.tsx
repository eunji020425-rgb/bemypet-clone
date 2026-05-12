import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, nickname, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-[#2d2d2d] mb-2">접근 권한이 없습니다</h1>
        <p className="text-sm text-[#888] mb-6">이 페이지는 관리자 전용입니다.</p>
        <Link href="/" className="text-[#f5c518] font-bold hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    )
  }

  // 통계 데이터 병렬 조회
  const [
    usersRes, postsRes, commentsRes, chatRes,
    placeRulesRes, walkRulesRes, hospitalRulesRes,
    recentPostsRes, recentUsersRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
    supabase.from('place_rules').select('*', { count: 'exact', head: true }),
    supabase.from('walk_rules').select('*', { count: 'exact', head: true }),
    supabase.from('hospital_rules').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('id, title, user_id, created_at, profiles(nickname)').order('created_at', { ascending: false }).limit(20),
    supabase.from('profiles').select('id, email, nickname, is_admin, created_at').order('created_at', { ascending: false }).limit(20),
  ])

  const stats = {
    users: usersRes.count ?? 0,
    posts: postsRes.count ?? 0,
    comments: commentsRes.count ?? 0,
    chat: chatRes.count ?? 0,
    placeRules: placeRulesRes.count ?? 0,
    walkRules: walkRulesRes.count ?? 0,
    hospitalRules: hospitalRulesRes.count ?? 0,
  }

  return (
    <AdminDashboard
      stats={stats}
      currentUserId={user.id}
      adminNickname={profile.nickname}
      recentPosts={recentPostsRes.data ?? []}
      recentUsers={recentUsersRes.data ?? []}
    />
  )
}
