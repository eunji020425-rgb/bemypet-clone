import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

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
          href="https://cdn.jsdelivr.net/gh/fonts-archive/Cafe24Ssurround/Cafe24Ssurround.woff2"
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-[#6b7560] py-8 mt-10">
          © 2024 PetTogether. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
