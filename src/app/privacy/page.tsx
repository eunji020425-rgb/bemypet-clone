export const metadata = { title: '개인정보처리방침 - PetTogether' }

export default function PrivacyPage() {
  return (
    <div className="px-4 py-6 max-w-none text-[#2a3a55]">
      <h1 className="text-xl font-bold mb-4">개인정보처리방침</h1>
      <p className="text-xs text-[#94a3b8] mb-6">시행일: 2026년 5월 21일</p>

      <p className="text-sm leading-relaxed mb-4">
        PetTogether(이하 "회사")는 「개인정보 보호법」 및 「위치정보의 보호 및 이용 등에 관한 법률」을 준수하며,
        이용자의 개인정보를 다음과 같이 처리합니다.
      </p>

      <h2 className="text-base font-bold mt-6 mb-2">1. 수집하는 개인정보 항목</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li><strong>회원가입 시</strong>: 이메일, 닉네임, 비밀번호(암호화) 또는 구글 계정 정보</li>
        <li><strong>서비스 이용 시</strong>: 산책 위치(GPS), 산책 시간·거리·경로</li>
        <li><strong>커뮤니티 이용 시</strong>: 게시글·댓글 내용, 업로드 이미지</li>
        <li><strong>자동 수집</strong>: 접속 IP, 브라우저 정보, 쿠키</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li>회원 식별 및 본인 확인</li>
        <li>반려동물 동반 장소·산책로 추천 (위치 기반)</li>
        <li>실시간 산책 인원 표시(닉네임만 노출, 정확한 좌표 비공개)</li>
        <li>커뮤니티 서비스 제공</li>
        <li>서비스 개선 및 통계 분석</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li>회원 탈퇴 시 즉시 파기</li>
        <li>관계 법령에 따른 보존 의무가 있는 경우 해당 기간 보관</li>
        <li>산책 위치 이력: 본인 요청 시 즉시 삭제 가능</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">4. 위치정보 처리 (위치기반 서비스 이용약관 준용)</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li>사용자가 "산책 시작"을 누른 동안만 위치를 수집합니다.</li>
        <li>수집된 위치는 본인 산책 기록(<code>walk_sessions</code>)에만 저장되며,
            다른 사용자에게는 <strong>닉네임과 인원수만</strong> 표시되고 정확한 좌표는 공개되지 않습니다.</li>
        <li>4시간 동안 종료되지 않은 산책은 자동으로 종료 처리됩니다.</li>
        <li>위치 권한은 언제든 브라우저/기기 설정에서 철회할 수 있습니다.</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">5. 개인정보의 제3자 제공</h2>
      <p className="text-sm leading-relaxed">
        회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
        단, 다음 외부 서비스를 통해 일부 정보가 처리됩니다.
      </p>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1 mt-2">
        <li><strong>Supabase</strong>: 회원/게시글/산책 데이터 보관 (인프라)</li>
        <li><strong>Vercel</strong>: 서비스 호스팅</li>
        <li><strong>Google</strong>: 구글 로그인, Gemini AI 분석 (장소명·주소만 전송, 개인정보 미포함)</li>
        <li><strong>카카오</strong>: 장소 검색 (좌표·검색어, 개인정보 미포함)</li>
        <li><strong>한국관광공사 TourAPI</strong>: 관광지 정보 조회 (좌표·이름, 개인정보 미포함)</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">6. 이용자의 권리</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li>본인 정보 열람·정정·삭제·처리정지 요구 가능 (마이페이지에서 즉시 가능)</li>
        <li>회원 탈퇴 시 모든 개인정보 즉시 삭제</li>
        <li>위치 정보 수집 거부: 브라우저 권한 차단</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">7. 개인정보 보호 책임자</h2>
      <p className="text-sm leading-relaxed">
        문의: 서비스 내 문의하기 또는 (대표 이메일은 추후 등록)
      </p>

      <hr className="my-8 border-[#e6effc]" />
      <p className="text-xs text-[#94a3b8]">
        본 방침은 법령·서비스 정책에 따라 변경될 수 있으며 변경 시 서비스 내 공지합니다.
      </p>
    </div>
  )
}
