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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-[#6a7c95] py-8 mt-10">
          © 2024 PetTogether. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
