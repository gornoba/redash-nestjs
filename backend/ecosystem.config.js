module.exports = {
  apps: [
    {
      // 모노레포 환경에 맞춰 Docker 빌드 시 주입되는 APP_NAME을 사용합니다.
      name: process.env.APP_NAME || 'app',
      script: `dist/apps/${process.env.APP_NAME}/main.js`,
      
      // 클러스터 모드 비활성화
      instances: 1,
      exec_mode: 'fork',

      // 힙 메모리 누수(OOM) 방지 옵션
      // 컨테이너가 뻗기 전에 PM2가 먼저 프로세스를 안전하게 재시작합니다.
      max_memory_restart: '512M', 
      
      // Node.js V8 엔진의 자체 힙 메모리 한도를 명시적으로 제한
      // (가용 메모리에 따라 512, 1024 등으로 조절 가능)
      node_args: '--max-old-space-size=512',

      // 환경 변수 설정
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
