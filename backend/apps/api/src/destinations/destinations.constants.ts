export const MASKED_SECRET_VALUE = '******';

export type SupportedDestinationType =
  | 'discord'
  | 'email'
  | 'slack'
  | 'slack_bot'
  | 'telegram';

export interface DestinationTypeSchemaProperty {
  default?: unknown;
  description?: string;
  extendedEnum?: Array<{ name: string; value: string }>;
  options?: Array<{ name: string; value: string }>;
  title?: string;
  type: string;
}

export interface DestinationConfigurationSchema {
  extra_options?: string[];
  order?: string[];
  properties: Record<string, DestinationTypeSchemaProperty>;
  required?: string[];
  secret?: string[];
  type: string;
}

export interface DestinationTypeDefinition {
  configuration_schema: DestinationConfigurationSchema;
  name: string;
  type: SupportedDestinationType;
}

const EMAIL_CONFIGURATION_SCHEMA: DestinationConfigurationSchema = {
  type: 'object',
  properties: {
    addresses: { type: 'string', title: 'Email Addresses' },
    subject_template: {
      type: 'string',
      title: 'Subject Template',
      default: '({state}) {alert_name}',
      description:
        '메일 제목 템플릿입니다.\n\n사용 가능한 문법은 2가지입니다. 둘 중 하나로만 쓰면 됩니다.\n\n구문 1. 레거시 문법\n- {state}: 알림 상태. 예: TRIGGERED, OK\n- {alert_name}: 알림 제목 전체\n- {query_name}: 쿼리 제목\n- {query_result_value}: 최신 결과의 값\n\n구문 2. 이중 중괄호 문법\n- {{ALERT_STATUS}}: 알림 상태\n- {{ALERT_NAME}}: 알림 제목 전체\n- {{QUERY_NAME}}: 쿼리 제목\n- {{QUERY_RESULT_VALUE}}: 최신 결과의 값\n\n예시에서 가정한 값\n- alert_name = 주문 수 이상 감지\n- query_name = 테스트3\n- query_result_value = 278671\n- state = TRIGGERED\n\n예시 1\n입력: ({state}) {alert_name}\n결과: (TRIGGERED) 주문 수 이상 감지\n\n예시 2\n입력: [{{ALERT_STATUS}}] {{QUERY_NAME}} - {{QUERY_RESULT_VALUE}}\n결과: [TRIGGERED] 테스트3 - 278671',
    },
  },
  required: ['addresses'],
  extra_options: ['subject_template'],
};

const SLACK_CONFIGURATION_SCHEMA: DestinationConfigurationSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', title: 'Slack Incoming Webhook URL' },
  },
  required: ['url'],
  secret: ['url'],
};

const SLACK_BOT_CONFIGURATION_SCHEMA: DestinationConfigurationSchema = {
  type: 'object',
  properties: {
    bot_token: {
      type: 'string',
      title: 'Bot Token',
      description: 'xoxb- 로 시작하는 Slack Bot User OAuth Token을 입력하세요.',
    },
    channel: {
      type: 'string',
      title: 'Channel',
      description: '메시지를 보낼 채널 ID를 입력하세요. 예: C0123456789',
    },
    username: {
      type: 'string',
      title: 'Username',
      description:
        '메시지 표시 이름입니다. 적용하려면 bot token에 chat:write.customize 권한이 필요하고, 앱 재설치 후 새 xoxb 토큰을 사용해야 합니다.',
    },
    icon_emoji: {
      type: 'string',
      title: 'Icon (Emoji)',
      description:
        '예: :rotating_light:. icon_url과 동시에 쓰지 마세요. 적용하려면 chat:write.customize 권한이 필요합니다.',
    },
    icon_url: {
      type: 'string',
      title: 'Icon (URL)',
      description:
        '직접 이미지 URL을 입력하세요. icon_emoji와 동시에 쓰지 마세요. 적용하려면 chat:write.customize 권한이 필요합니다.',
    },
  },
  order: ['bot_token', 'channel', 'username', 'icon_emoji', 'icon_url'],
  required: ['bot_token', 'channel'],
  secret: ['bot_token'],
};

const DISCORD_CONFIGURATION_SCHEMA: DestinationConfigurationSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', title: 'Discord Webhook URL' },
    username: { type: 'string', title: 'Username' },
    avatar_url: {
      type: 'string',
      title: 'Avatar URL',
      description:
        'Discord가 접근 가능한 직접 이미지 URL이어야 합니다. 웹페이지 URL은 적용되지 않습니다.',
    },
  },
  required: ['url'],
  secret: ['url'],
};

const TELEGRAM_CONFIGURATION_SCHEMA: DestinationConfigurationSchema = {
  type: 'object',
  properties: {
    bot_token: { type: 'string', title: 'Bot Token' },
    chat_id: { type: 'string', title: 'Chat ID' },
    message_thread_id: { type: 'string', title: 'Message Thread ID' },
    parse_mode: {
      type: 'string',
      title: 'Parse Mode',
      description:
        'None은 일반 텍스트, Markdown/HTML은 텔레그램 형식 문법으로 전송됩니다.',
      extendedEnum: [
        { name: 'None', value: '' },
        { name: 'Markdown', value: 'Markdown' },
        { name: 'HTML', value: 'HTML' },
      ],
      default: '',
    },
  },
  order: ['bot_token', 'chat_id', 'message_thread_id'],
  required: ['bot_token', 'chat_id'],
  secret: ['bot_token'],
  extra_options: ['message_thread_id', 'parse_mode'],
};

export const DESTINATION_TYPE_DEFINITIONS: DestinationTypeDefinition[] = [
  {
    type: 'email',
    name: 'Email',
    configuration_schema: EMAIL_CONFIGURATION_SCHEMA,
  },
  {
    type: 'slack',
    name: 'Slack',
    configuration_schema: SLACK_CONFIGURATION_SCHEMA,
  },
  {
    type: 'slack_bot',
    name: 'Slack Bot',
    configuration_schema: SLACK_BOT_CONFIGURATION_SCHEMA,
  },
  {
    type: 'discord',
    name: 'Discord',
    configuration_schema: DISCORD_CONFIGURATION_SCHEMA,
  },
  {
    type: 'telegram',
    name: 'Telegram',
    configuration_schema: TELEGRAM_CONFIGURATION_SCHEMA,
  },
];

export function getDestinationTypeDefinition(type: string) {
  return DESTINATION_TYPE_DEFINITIONS.find((item) => item.type === type);
}
