import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "PetTogether - 우리 아이의 시간을 더 행복하게",
  description: "반려동물 커뮤니티 - 정보 공유, 자유게시판, 실시간 채팅, 동물병원 찾기, AI닥터",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fdf8f0]">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-[#aaa] py-6 border-t border-[#ececec] mt-10">
          © 2024 PetTogether. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
