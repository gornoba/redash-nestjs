import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * data_source_groups.data_source_id 와 groups(org_id, name) 에 인덱스를 추가한다.
 * - data_source_groups.data_source_id: 목록/상세 조회 시 JOIN/WHERE 조건에 사용
 * - groups(org_id, name): getDefaultGroup 에서 org_id + name = 'default' 조건에 사용
 */
export class AddDataSourceQueryIndexes1742300000000 implements MigrationInterface {
  name = 'AddDataSourceQueryIndexes1742300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_data_source_groups_data_source_id" ON "data_source_groups" ("data_source_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_groups_org_id_name" ON "groups" ("org_id", "name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_groups_org_id_name"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_data_source_groups_data_source_id"`,
    );
  }
}
