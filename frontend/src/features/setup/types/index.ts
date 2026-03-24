export interface SetupStateResponse {
  isSetupRequired: boolean;
  defaults: {
    securityNotifications: boolean;
    newsletter: boolean;
  };
}

export interface SetupFormValues {
  name: string;
  email: string;
  password: string;
  orgName: string;
  securityNotifications: boolean;
  newsletter: boolean;
}
