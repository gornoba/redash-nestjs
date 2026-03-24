const DATA_SOURCE_LOGO_MAP: Record<string, string> = {
  'aurora-mysql': 'rds_mysql',
  'aurora-postgres': 'pg',
  cockroachdb: 'cockroach',
  mariadb: 'mysql',
  sqlite: 'sqlite',
};

export function getDataSourceLogoPath(type: string) {
  const logoName = DATA_SOURCE_LOGO_MAP[type] ?? type;

  return `/static/images/db-logos/${logoName}.png`;
}
