export interface AlertListUserSummary {
  id: number;
  name: string;
}

export interface AlertQuerySummary {
  id: number;
  schedule: Record<string, unknown> | null;
  name: string;
}

export interface AlertListItem {
  id: number;
  muted: boolean;
  name: string;
  state: string;
  updated_at: string;
  created_at: string;
  user: AlertListUserSummary;
}

export interface AlertDetailUserSummary {
  id: number;
}

export interface AlertDetail {
  id: number;
  name: string;
  options: Record<string, unknown>;
  state: string;
  last_triggered_at: string | null;
  updated_at: string;
  created_at: string;
  rearm: number | null;
  query: AlertQuerySummary;
  user: AlertDetailUserSummary;
}

export interface SaveAlertPayload {
  name: string;
  options: Record<string, unknown>;
  query_id: number;
  rearm: number | null;
}

export interface AlertSubscriptionItem {
  id: number;
  user: {
    id: number;
    email: string;
  };
  destination?: {
    id: number;
    name: string;
    type: string;
  };
}
