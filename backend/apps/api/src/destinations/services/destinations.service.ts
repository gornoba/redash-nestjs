import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  decryptJsonValue,
  encryptJsonValue,
  normalizeEncryptedPayload,
} from '@app/common/utils/crypto.util';
import {
  DESTINATION_TYPE_DEFINITIONS,
  MASKED_SECRET_VALUE,
  getDestinationTypeDefinition,
  type DestinationTypeDefinition,
  type DestinationTypeSchemaProperty,
  type SupportedDestinationType,
} from '../destinations.constants';
import type { SaveDestinationRequestDto } from '../dto/destinations.dto';
import { DestinationsRepository } from '../repositories/destinations.repository';

type DestinationOptions = Record<string, unknown>;

@Injectable()
export class DestinationsService {
  constructor(
    private readonly destinationsRepository: DestinationsRepository,
  ) {}

  getTypes() {
    return DESTINATION_TYPE_DEFINITIONS;
  }

  async getDestinations(user: AuthenticatedUser) {
    const destinations = await this.destinationsRepository.getDestinations(
      user.orgId,
    );

    return destinations.map((destination) => ({
      id: destination.id,
      name: destination.name,
      type: destination.type,
    }));
  }

  async getDestination(user: AuthenticatedUser, destinationId: number) {
    const destination = await this.destinationsRepository.getDestinationById(
      user.orgId,
      destinationId,
    );

    return this.buildDetailResponse(destination);
  }

  async createDestination(
    user: AuthenticatedUser,
    payload: SaveDestinationRequestDto,
  ) {
    const definition = this.getDefinitionOrThrow(payload.type);
    const name = payload.name.trim();

    if (!name) {
      throw new BadRequestException('알림 대상 이름을 입력해주세요.');
    }

    await this.ensureUniqueName(user.orgId, name);

    const destination = this.destinationsRepository.createDestination({
      orgId: user.orgId,
      userId: user.id,
      name,
      type: payload.type,
      encryptedOptions: this.serializeOptions(
        this.normalizeOptions(definition, payload.options, {}),
      ),
    });

    const savedDestination =
      await this.destinationsRepository.saveDestination(destination);

    return this.buildDetailResponse(savedDestination);
  }

  async updateDestination(
    user: AuthenticatedUser,
    destinationId: number,
    payload: SaveDestinationRequestDto,
  ) {
    const destination = await this.destinationsRepository.getDestinationById(
      user.orgId,
      destinationId,
    );
    const definition = this.getDefinitionOrThrow(payload.type);
    const existingOptions = this.parseOptions(destination.encryptedOptions);
    const name = payload.name.trim();

    if (!name) {
      throw new BadRequestException('알림 대상 이름을 입력해주세요.');
    }

    await this.ensureUniqueName(user.orgId, name, destination.id);

    destination.name = name;
    destination.type = payload.type;
    destination.encryptedOptions = this.serializeOptions(
      this.normalizeOptions(definition, payload.options, existingOptions),
    );

    const savedDestination =
      await this.destinationsRepository.saveDestination(destination);

    return this.buildDetailResponse(savedDestination);
  }

  async deleteDestination(user: AuthenticatedUser, destinationId: number) {
    await this.destinationsRepository.getDestinationById(
      user.orgId,
      destinationId,
    );
    await this.destinationsRepository.deleteDestination(
      user.orgId,
      destinationId,
    );
  }

  private buildDetailResponse(destination: {
    encryptedOptions: string | Buffer;
    id: number;
    name: string;
    type: string;
  }) {
    const definition = this.getDefinitionOrThrow(destination.type);

    return {
      id: destination.id,
      name: destination.name,
      type: destination.type,
      options: this.maskSecretOptions(
        definition,
        this.parseOptions(destination.encryptedOptions),
      ),
    };
  }

  private getDefinitionOrThrow(type: string) {
    const definition = getDestinationTypeDefinition(type);

    if (!definition) {
      throw new BadRequestException(`지원하지 않는 알림 타입입니다: ${type}`);
    }

    return definition;
  }

  private async ensureUniqueName(
    orgId: number,
    name: string,
    excludeId?: number,
  ) {
    const existing = await this.destinationsRepository.findByName(
      orgId,
      name,
      excludeId,
    );

    if (existing) {
      throw new BadRequestException(
        `Alert Destination with the name ${name} already exists.`,
      );
    }
  }

  private parseOptions(
    value: string | Buffer | null | undefined,
  ): DestinationOptions {
    const normalizedValue = normalizeEncryptedPayload(value);

    if (!normalizedValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(normalizedValue) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as DestinationOptions;
      }

      return {};
    } catch {
      const decrypted = decryptJsonValue<DestinationOptions>(normalizedValue);

      if (decrypted) {
        return decrypted;
      }

      return {};
    }
  }

  private serializeOptions(value: DestinationOptions) {
    const encrypted = encryptJsonValue(value);

    if (!encrypted) {
      throw new InternalServerErrorException(
        '알림 대상 옵션 암호화에 실패했습니다.',
      );
    }

    return encrypted;
  }

  private maskSecretOptions(
    definition: DestinationTypeDefinition,
    options: DestinationOptions,
  ) {
    const secretKeys = definition.configuration_schema.secret ?? [];
    const nextOptions = { ...options };

    for (const secretKey of secretKeys) {
      if (
        nextOptions[secretKey] !== undefined &&
        nextOptions[secretKey] !== null &&
        nextOptions[secretKey] !== ''
      ) {
        nextOptions[secretKey] = MASKED_SECRET_VALUE;
      }
    }

    return nextOptions;
  }

  private normalizeOptions(
    definition: DestinationTypeDefinition,
    options: DestinationOptions,
    existingOptions: DestinationOptions,
  ) {
    const properties = definition.configuration_schema.properties;
    const requiredKeys = definition.configuration_schema.required ?? [];
    const secretKeys = definition.configuration_schema.secret ?? [];
    const nextOptions: DestinationOptions = {};

    for (const [key, property] of Object.entries(properties)) {
      const normalizedValue = this.normalizePropertyValue(
        property,
        options[key],
        existingOptions[key],
        secretKeys.includes(key),
      );

      if (normalizedValue !== undefined) {
        nextOptions[key] = normalizedValue;
      }
    }

    for (const requiredKey of requiredKeys) {
      const value = nextOptions[requiredKey];

      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`${requiredKey} is required.`);
      }
    }

    this.validateOptions(definition.type, nextOptions);

    return nextOptions;
  }

  private normalizePropertyValue(
    property: DestinationTypeSchemaProperty,
    value: unknown,
    previousValue: unknown,
    isSecret: boolean,
  ) {
    if (isSecret && value === MASKED_SECRET_VALUE) {
      return previousValue;
    }

    if (value === '' || value === null) {
      return undefined;
    }

    if (value === undefined) {
      return previousValue;
    }

    if (property.type === 'number') {
      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const nextValue = Number(value);

        if (Number.isNaN(nextValue)) {
          throw new BadRequestException('숫자 필드 형식이 올바르지 않습니다.');
        }

        return nextValue;
      }
    }

    if (property.type === 'boolean') {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        if (value === 'true') {
          return true;
        }

        if (value === 'false') {
          return false;
        }
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    throw new BadRequestException('필드 형식이 올바르지 않습니다.');
  }

  private validateOptions(
    type: SupportedDestinationType,
    options: DestinationOptions,
  ) {
    if (type === 'email') {
      const addresses = this.getStringOption(options, 'addresses').trim();

      if (!addresses) {
        throw new BadRequestException('addresses is required.');
      }
    }

    if (type === 'slack' || type === 'discord') {
      const url = this.getStringOption(options, 'url').trim();

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestException('Webhook URL 형식이 올바르지 않습니다.');
      }
    }

    if (type === 'slack_bot') {
      const botToken = this.getStringOption(options, 'bot_token').trim();
      const channel = this.getStringOption(options, 'channel').trim();

      if (!botToken || !channel) {
        throw new BadRequestException('bot_token and channel are required.');
      }

      if (!botToken.startsWith('xoxb-')) {
        throw new BadRequestException(
          'Slack Bot Token 형식이 올바르지 않습니다.',
        );
      }
    }

    if (type === 'telegram') {
      const botToken = this.getStringOption(options, 'bot_token').trim();
      const chatId = this.getStringOption(options, 'chat_id').trim();

      if (!botToken || !chatId) {
        throw new BadRequestException('bot_token and chat_id are required.');
      }
    }
  }

  private getStringOption(
    options: DestinationOptions,
    key: string,
    fallback = '',
  ) {
    const value = options[key];
    return typeof value === 'string' ? value : fallback;
  }
}
