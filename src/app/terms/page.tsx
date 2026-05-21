export const metadata = { title: '이용약관 - PetTogether' }

export default function TermsPage() {
  return (
    <div className="px-4 py-6 prose prose-sm max-w-none text-[#2a3a55]">
      <h1 className="text-xl font-bold mb-4">이용약관</h1>
      <p className="text-xs text-[#94a3b8] mb-6">시행일: 2026년 5월 21일</p>

      <h2 className="text-base font-bold mt-6 mb-2">제1조 (목적)</h2>
      <p className="text-sm leading-relaxed">
        이 약관은 PetTogether(이하 "회사")이 제공하는 반려동물 동반 장소 추천,
        산책로 안내, 커뮤니티, 위치기반 서비스(이하 "서비스") 이용에 관한
        조건 및 절차, 회사와 이용자의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
      </p>

      <h2 className="text-base font-bold mt-6 mb-2">제2조 (서비스의 내용)</h2>
      <ol className="text-sm leading-relaxed list-decimal pl-5 space-y-1">
        <li>반려동물 동반 가능 장소 검색 및 지도 표시</li>
        <li>산책로 추천 및 실시간 산책 기록</li>
        <li>위치기반 길찾기 (도보)</li>
        <li>회원 간 커뮤니티 게시판 및 실시간 채팅</li>
        <li>기타 회사가 추가로 개발하거나 제휴를 통해 제공하는 서비스</li>
      </ol>

      <h2 className="text-base font-bold mt-6 mb-2">제3조 (정보의 정확성 및 면책)</h2>
      <ol className="text-sm leading-relaxed list-decimal pl-5 space-y-1">
        <li>
          산책로의 <strong>반려동물 동반 규정·목줄·배변 의무·위험 요소</strong> 등
          상세 정보는 한국관광공사 등 공공 데이터, AI(생성형 모델)에 의한 추정,
          이용자 제보를 결합하여 표시되며, <strong>참고용</strong>입니다.
        </li>
        <li>
          AI가 추정한 정보에는 <strong>"AI 추정"</strong> 등의 배지가 표시되며,
          이용자는 현지 안내판 및 관리 기관 공지를 우선 확인해야 합니다.
        </li>
        <li>
          회사는 정보의 정확성을 보장하지 않으며, 잘못된 정보로 인한 직접·간접
          손해에 대해 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
        </li>
      </ol>

      <h2 className="text-base font-bold mt-6 mb-2">제4조 (이용자의 의무)</h2>
      <ol className="text-sm leading-relaxed list-decimal pl-5 space-y-1">
        <li>관계 법령(동물보호법 등) 및 본 약관을 준수할 것</li>
        <li>반려동물 외출 시 목줄·배변봉투 등 법정 안전조치를 이행할 것</li>
        <li>타인의 명예를 훼손하거나 음란·폭력적 게시물을 등록하지 말 것</li>
        <li>고의로 잘못된 정보를 제보하지 말 것</li>
      </ol>

      <h2 className="text-base font-bold mt-6 mb-2">제5조 (서비스 변경·중단)</h2>
      <p className="text-sm leading-relaxed">
        회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를
        변경하거나 중단할 수 있으며, 이로 인해 이용자에게 발생한 손해에
        대해 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
      </p>

      <h2 className="text-base font-bold mt-6 mb-2">제6조 (저작권)</h2>
      <p className="text-sm leading-relaxed">
        서비스 내 콘텐츠 중 외부 출처는 다음과 같이 표시됩니다.
      </p>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li>장소 검색·지도 표시: 카카오 Local API</li>
        <li>관광지 정보: 한국관광공사 TourAPI</li>
        <li>지도 타일: © OpenStreetMap contributors</li>
        <li>도보 경로 계산: OSRM (Open Source Routing Machine)</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">제7조 (분쟁 해결)</h2>
      <p className="text-sm leading-relaxed">
        본 약관에 명시되지 않은 사항은 관계 법령 및 일반 상관례에 따르며,
        서비스 이용으로 발생한 분쟁의 관할 법원은 회사 소재지 관할
        법원으로 합니다.
      </p>

      <hr className="my-8 border-[#e6effc]" />
      <p className="text-xs text-[#94a3b8]">
        본 약관은 사업 운영 상황에 따라 변경될 수 있으며, 변경 시
        서비스 내 공지를 통해 사전에 안내합니다.
      </p>
    </div>
  )
}
