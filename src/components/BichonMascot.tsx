// 비숑 마스코트 - 모자/케이프/넥타이 제외, 캐릭터만
// (구매 라이선스 보유 캐릭터의 단순화 SVG 재현)

type Props = {
  size?: number
  className?: string
  /** 'default' | 'wave' | 'sit' */
  pose?: 'default' | 'wave' | 'sit'
}

export default function BichonMascot({ size = 120, className = '', pose = 'default' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="비숑 마스코트"
    >
      {/* 몸통 (둥근 흰 털) */}
      <ellipse cx="100" cy="148" rx="58" ry="42" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />

      {/* 다리 */}
      <ellipse cx="78" cy="180" rx="14" ry="10" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />
      <ellipse cx="122" cy="180" rx="14" ry="10" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />

      {/* 머리 (큰 동그라미) */}
      <circle cx="100" cy="82" r="56" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />

      {/* 귀 (양쪽 솜털) */}
      <ellipse cx="52" cy="78" rx="20" ry="26" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />
      <ellipse cx="148" cy="78" rx="20" ry="26" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />

      {/* 볼터럭 (얼굴 양쪽 솜) */}
      <circle cx="68" cy="100" r="14" fill="#ffffff" stroke="#2d6b2d" strokeWidth="2.5" />
      <circle cx="132" cy="100" r="14" fill="#ffffff" stroke="#2d6b2d" strokeWidth="2.5" />

      {/* 정수리 솜 */}
      <circle cx="85" cy="42" r="10" fill="#ffffff" stroke="#2d6b2d" strokeWidth="2.5" />
      <circle cx="115" cy="42" r="10" fill="#ffffff" stroke="#2d6b2d" strokeWidth="2.5" />
      <circle cx="100" cy="36" r="9" fill="#ffffff" stroke="#2d6b2d" strokeWidth="2.5" />

      {/* 눈 (까만 동그라미) */}
      <circle cx="82" cy="82" r="5" fill="#1a1a1a" />
      <circle cx="118" cy="82" r="5" fill="#1a1a1a" />
      {/* 눈 반사광 */}
      <circle cx="83.5" cy="80" r="1.5" fill="#ffffff" />
      <circle cx="119.5" cy="80" r="1.5" fill="#ffffff" />

      {/* 코 */}
      <ellipse cx="100" cy="100" rx="6" ry="4.5" fill="#1a1a1a" />

      {/* 입 (살짝 미소) */}
      <path d="M 100 105 Q 100 112 94 112" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 100 105 Q 100 112 106 112" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* 분홍 볼터치 */}
      <circle cx="72" cy="105" r="5" fill="#ffb4c8" opacity="0.7" />
      <circle cx="128" cy="105" r="5" fill="#ffb4c8" opacity="0.7" />

      {pose === 'wave' && (
        // 손 흔드는 포즈
        <g>
          <circle cx="50" cy="140" r="14" fill="#ffffff" stroke="#2d6b2d" strokeWidth="3" />
        </g>
      )}
    </svg>
  )
}
