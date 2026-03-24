import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { QueryEntity } from '@app/database/entities/query.entity';

@Injectable()
export class ScheduleQueryRepository {
  constructor(
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
  ) {}

  getScheduledQueries() {
    return this.queryRepository.find({
      where: {
        dataSourceId: Not(IsNull()),
        isArchived: false,
        schedule: Not(IsNull()),
      },
      order: {
        id: 'ASC',
      },
    });
  }
}
