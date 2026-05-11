export type Profile = {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  title: string
  content: string
  image_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  profiles?: Profile
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export type ChatMessage = {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}
