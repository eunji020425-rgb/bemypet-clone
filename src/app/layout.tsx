import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "PetTogether - 반려동물과의 평화로운 일상",
  description: "반려동물 커뮤니티 - 정보 공유, 자유게시판, 실시간 채팅, 동물병원 찾기, AI닥터",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/2403-2@1.0/TTLaundryGothicR.woff2"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        {/* 모바일 앱 프레임: 가운데 정렬 최대 480px, 데스크탑은 양쪽에 그라디언트 배경 */}
        <div className="mx-auto max-w-[480px] min-h-screen bg-[#f0f6ff]/40 shadow-[0_0_40px_rgba(58,122,184,0.08)] flex flex-col relative">
          <Header />
          <main className="flex-1 pb-20">{children}</main>
          <footer className="text-center text-[10px] text-[#94a3b8] py-6 pb-20 px-4 space-y-2">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="/terms" className="hover:text-[#3a7ab8] hover:underline">이용약관</a>
              <span className="text-[#cbd5e1]">·</span>
              <a href="/privacy" className="hover:text-[#3a7ab8] hover:underline font-bold">개인정보처리방침</a>
              <span className="text-[#cbd5e1]">·</span>
              <a href="/disclaimer" className="hover:text-[#3a7ab8] hover:underline">정보 면책</a>
            </div>
            <p className="text-[9px] text-[#cbd5e1] leading-relaxed">
              자료: 카카오 · 한국관광공사 TourAPI · © OpenStreetMap contributors · OSRM
            </p>
            <p>© 2026 PetTogether</p>
          </footer>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
