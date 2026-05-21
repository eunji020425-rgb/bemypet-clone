-- =============================================================
-- Storage RLS Policies
-- 적용 위치: Supabase 콘솔 → SQL Editor → New query → 붙여넣고 Run
-- =============================================================

-- 1. post-images 버킷: 누구나 읽기 가능 (이미 public bucket이지만 명시)
CREATE POLICY "post-images public read"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'post-images' );

-- 2. post-images 버킷: 로그인한 사용자만 업로드 가능
CREATE POLICY "post-images authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'post-images' );

-- 3. post-images 버킷: 본인 업로드만 삭제 가능
CREATE POLICY "post-images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- 4. avatars 버킷: 누구나 읽기
CREATE POLICY "avatars public read"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );

-- 5. avatars 버킷: 로그인한 사용자 업로드
CREATE POLICY "avatars authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 6. avatars 버킷: 본인 것만 수정/삭제
CREATE POLICY "avatars owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "avatars owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
