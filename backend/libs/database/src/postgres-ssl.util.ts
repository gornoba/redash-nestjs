export function isAwsRdsPostgresHost(host: string) {
  return host.toLowerCase().includes('rds.amazonaws.com');
}

export function resolvePostgresSslOption(host: string) {
  // 운영에서 AWS RDS를 사용할 때만 pg SSL을 강제해 로컬/사설망 DB 설정을 단순하게 유지합니다.
  if (isAwsRdsPostgresHost(host)) {
    return {
      rejectUnauthorized: false,
    };
  }

  return false;
}
