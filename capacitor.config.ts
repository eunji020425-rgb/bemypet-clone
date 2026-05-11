import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bemypet.clone',
  appName: 'Bemypet',
  // 개발 중: Vercel URL 또는 로컬 서버 주소를 사용
  // 배포 후: webDir 대신 server.url을 Vercel 배포 URL로 설정
  webDir: 'out',
  server: {
    // 개발 시 아래 주석을 해제하고 로컬 서버 주소 입력
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
};

export default config;
