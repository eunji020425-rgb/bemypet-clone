export const metadata = { title: '정보 면책 - PetTogether' }

export default function DisclaimerPage() {
  return (
    <div className="px-4 py-6 max-w-none text-[#2a3a55]">
      <h1 className="text-xl font-bold mb-4">정보 안내 및 면책 고지</h1>
      <p className="text-xs text-[#94a3b8] mb-6">시행일: 2026년 5월 21일</p>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-sm leading-relaxed text-amber-900">
          본 서비스에서 제공하는 산책로의 <strong>반려동물 동반 규정·목줄 길이·배변 의무·위험 요소 등 상세 정보</strong>는
          한국관광공사 공공 데이터, AI(생성형 인공지능)에 의한 추정,
          이용자 제보를 결합하여 표시되며 <strong>참고용</strong>입니다.
        </p>
      </div>

      <h2 className="text-base font-bold mt-6 mb-2">1. 정보 출처 및 신뢰도 표시</h2>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
        <li><strong>🟢 공식 자료</strong>: 한국관광공사 등 공공기관 API로 확인된 정보</li>
        <li><strong>🟡 AI 추정</strong>: Google Gemini 등 생성형 AI가 공개 정보로부터 추론한 내용</li>
        <li><strong>👥 사용자 확인</strong>: 다수 이용자의 제보로 검증된 정보</li>
        <li><strong>⚪ 확인 필요</strong>: 정보가 부족하거나 다수 제보로 신뢰도 하락</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">2. 이용자가 확인해야 할 사항</h2>
      <ol className="text-sm leading-relaxed list-decimal pl-5 space-y-1">
        <li>방문 전 해당 시설의 <strong>공식 홈페이지 / 안내 전화</strong>로 최신 규정 재확인 권장</li>
        <li>현지 도착 시 <strong>출입구 안내판</strong> 우선 준수</li>
        <li>동물보호법(목줄 의무, 배변봉투 휴대 등) 및 지자체 조례 준수</li>
        <li>위험 요소(진드기·뱀·야생동물 등) 경고 시 별도 안전조치</li>
      </ol>

      <h2 className="text-base font-bold mt-6 mb-2">3. 회사의 면책 범위</h2>
      <p className="text-sm leading-relaxed">
        회사는 다음 사항에 대해 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
      </p>
      <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1 mt-2">
        <li>정보의 정확성·완전성·최신성에 대한 어떠한 보증도 제공하지 않습니다.</li>
        <li>이용자가 잘못된 정보로 인해 입은 직접·간접 손해</li>
        <li>외부 서비스(카카오·한국관광공사·OSM 등) 장애로 인한 일시적 정보 누락</li>
        <li>이용자의 부주의(목줄 미착용 등)로 인한 사고</li>
      </ul>

      <h2 className="text-base font-bold mt-6 mb-2">4. 잘못된 정보 신고</h2>
      <p className="text-sm leading-relaxed">
        산책로 상세 화면의 <strong>"🚩 달라요"</strong> 버튼을 통해 즉시 신고하실 수 있으며,
        다수 이용자가 동일하게 신고한 정보는 자동으로 "확인 필요" 상태로 전환됩니다.
      </p>

      <hr className="my-8 border-[#e6effc]" />
      <p className="text-xs text-[#94a3b8]">
        본 고지는 「이용약관 제3조」 및 「개인정보처리방침」의 일부를 구성합니다.
      </p>
    </div>
  )
}
