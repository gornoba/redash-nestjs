const DESTINATION_LOGO_PATHS: Record<string, string> = {
  discord: '/static/images/destinations/webhook.png',
  email: '/static/images/destinations/email.png',
  slack: '/static/images/destinations/slack.png',
  slack_bot: '/static/images/destinations/slack.png',
  telegram: '/static/images/redash_icon_small.png',
};

export function getDestinationLogoPath(type: string) {
  return DESTINATION_LOGO_PATHS[type] ?? '/static/images/redash_icon_small.png';
}
