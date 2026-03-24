import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { createTypeOrmOptions } from './typeorm.config';

const env = dotenv.config();
const configService = new ConfigService(env.parsed ?? {});

export default new DataSource(createTypeOrmOptions(configService));
