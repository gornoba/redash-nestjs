BEGIN;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" SERIAL NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "settings" text NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "groups" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "type" varchar(255) NOT NULL DEFAULT 'regular',
  "name" varchar(100) NOT NULL,
  "permissions" varchar(255)[],
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_groups_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_groups_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "name" varchar(320) NOT NULL,
  "email" varchar(320) NOT NULL,
  "profile_image_url" varchar(320),
  "password_hash" varchar(128),
  "groups" integer[],
  "api_key" varchar(40) NOT NULL,
  "disabled_at" TIMESTAMPTZ,
  "details" json DEFAULT '{}'::json,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_users_api_key" UNIQUE ("api_key"),
  CONSTRAINT "FK_users_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
);

CREATE TABLE IF NOT EXISTS "access_permissions" (
  "id" SERIAL NOT NULL,
  "object_type" varchar(255) NOT NULL,
  "object_id" integer NOT NULL,
  "access_type" varchar(255) NOT NULL,
  "grantor_id" integer NOT NULL,
  "grantee_id" integer NOT NULL,
  CONSTRAINT "PK_access_permissions_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_access_permissions_grantor_id" FOREIGN KEY ("grantor_id") REFERENCES "users"("id"),
  CONSTRAINT "FK_access_permissions_grantee_id" FOREIGN KEY ("grantee_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "changes" (
  "id" SERIAL NOT NULL,
  "object_type" varchar(255) NOT NULL,
  "object_id" integer NOT NULL,
  "object_version" integer NOT NULL DEFAULT 0,
  "user_id" integer NOT NULL,
  "change" text NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_changes_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_changes_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "data_sources" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" varchar(255) NOT NULL,
  "encrypted_options" text NOT NULL,
  "queue_name" varchar(255) NOT NULL DEFAULT 'queries',
  "scheduled_queue_name" varchar(255) NOT NULL DEFAULT 'scheduled_queries',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_data_sources_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_data_sources_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
);

CREATE TABLE IF NOT EXISTS "data_source_groups" (
  "id" SERIAL NOT NULL,
  "data_source_id" integer NOT NULL,
  "group_id" integer NOT NULL,
  "view_only" boolean NOT NULL DEFAULT false,
  CONSTRAINT "PK_data_source_groups_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_data_source_groups_data_source_id" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id"),
  CONSTRAINT "FK_data_source_groups_group_id" FOREIGN KEY ("group_id") REFERENCES "groups"("id")
);

CREATE TABLE IF NOT EXISTS "query_results" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "data_source_id" integer NOT NULL,
  "query_hash" varchar(32) NOT NULL,
  "query" text NOT NULL,
  "data" text NOT NULL,
  "runtime" double precision NOT NULL,
  "retrieved_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PK_query_results_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_query_results_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_query_results_data_source_id" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id")
);

CREATE TABLE IF NOT EXISTS "queries" (
  "id" SERIAL NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "org_id" integer NOT NULL,
  "data_source_id" integer,
  "latest_query_data_id" integer,
  "name" varchar(255) NOT NULL,
  "description" varchar(4096),
  "query" text NOT NULL,
  "query_hash" varchar(32) NOT NULL,
  "api_key" varchar(40) NOT NULL,
  "user_id" integer NOT NULL,
  "last_modified_by_id" integer,
  "is_archived" boolean NOT NULL DEFAULT false,
  "is_draft" boolean NOT NULL DEFAULT true,
  "schedule" text,
  "schedule_failures" integer NOT NULL DEFAULT 0,
  "options" text NOT NULL DEFAULT '{}',
  "search_vector" tsvector,
  "tags" text[],
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_queries_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_queries_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_queries_data_source_id" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id"),
  CONSTRAINT "FK_queries_latest_query_data_id" FOREIGN KEY ("latest_query_data_id") REFERENCES "query_results"("id"),
  CONSTRAINT "FK_queries_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "FK_queries_last_modified_by_id" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "favorites" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "object_type" varchar(255) NOT NULL,
  "object_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_favorites_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_favorites_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_favorites_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "unique_favorite" UNIQUE ("object_type", "object_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "dashboards" (
  "id" SERIAL NOT NULL,
  "version" integer NOT NULL,
  "org_id" integer NOT NULL,
  "slug" varchar(140) NOT NULL,
  "name" varchar(100) NOT NULL,
  "user_id" integer NOT NULL,
  "layout" text NOT NULL,
  "dashboard_filters_enabled" boolean NOT NULL DEFAULT false,
  "is_archived" boolean NOT NULL DEFAULT false,
  "is_draft" boolean NOT NULL DEFAULT true,
  "tags" text[],
  "options" json NOT NULL DEFAULT '{}'::json,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_dashboards_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_dashboards_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_dashboards_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "visualizations" (
  "id" SERIAL NOT NULL,
  "type" varchar(100) NOT NULL,
  "query_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(4096),
  "options" text NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_visualizations_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_visualizations_query_id" FOREIGN KEY ("query_id") REFERENCES "queries"("id")
);

CREATE TABLE IF NOT EXISTS "widgets" (
  "id" SERIAL NOT NULL,
  "visualization_id" integer,
  "text" text,
  "width" integer NOT NULL,
  "options" text NOT NULL,
  "dashboard_id" integer NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_widgets_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_widgets_visualization_id" FOREIGN KEY ("visualization_id") REFERENCES "visualizations"("id"),
  CONSTRAINT "FK_widgets_dashboard_id" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id")
);

CREATE TABLE IF NOT EXISTS "alerts" (
  "id" SERIAL NOT NULL,
  "name" varchar(255) NOT NULL,
  "query_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "options" text NOT NULL,
  "state" varchar(255) NOT NULL DEFAULT 'unknown',
  "last_triggered_at" TIMESTAMPTZ,
  "rearm" integer,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_alerts_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_alerts_query_id" FOREIGN KEY ("query_id") REFERENCES "queries"("id"),
  CONSTRAINT "FK_alerts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "user_id" integer,
  "action" varchar(255) NOT NULL,
  "object_type" varchar(255) NOT NULL,
  "object_id" varchar(255),
  "additional_properties" text DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_events_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_events_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "api_key" varchar(255) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "object_type" varchar(255) NOT NULL,
  "object_id" integer NOT NULL,
  "created_by_id" integer,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_api_keys_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_api_keys_created_by_id" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "notification_destinations" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" varchar(255) NOT NULL,
  "encrypted_options" text NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_notification_destinations_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_notification_destinations_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_notification_destinations_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "alert_subscriptions" (
  "id" SERIAL NOT NULL,
  "user_id" integer NOT NULL,
  "destination_id" integer,
  "alert_id" integer NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_alert_subscriptions_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_alert_subscriptions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "FK_alert_subscriptions_destination_id" FOREIGN KEY ("destination_id") REFERENCES "notification_destinations"("id"),
  CONSTRAINT "FK_alert_subscriptions_alert_id" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id")
);

CREATE TABLE IF NOT EXISTS "query_snippets" (
  "id" SERIAL NOT NULL,
  "org_id" integer NOT NULL,
  "trigger" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "user_id" integer NOT NULL,
  "snippet" text NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PK_query_snippets_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_query_snippets_trigger" UNIQUE ("trigger"),
  CONSTRAINT "FK_query_snippets_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations"("id"),
  CONSTRAINT "FK_query_snippets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_org_id_email" ON "users" ("org_id", "email");
CREATE INDEX IF NOT EXISTS "data_sources_org_id_name" ON "data_sources" ("org_id", "name");
CREATE INDEX IF NOT EXISTS "IDX_query_results_query_hash" ON "query_results" ("query_hash");
CREATE INDEX IF NOT EXISTS "IDX_queries_is_archived" ON "queries" ("is_archived");
CREATE INDEX IF NOT EXISTS "IDX_queries_is_draft" ON "queries" ("is_draft");
CREATE INDEX IF NOT EXISTS "IDX_queries_search_vector" ON "queries" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "IDX_dashboards_slug" ON "dashboards" ("slug");
CREATE INDEX IF NOT EXISTS "IDX_dashboards_is_archived" ON "dashboards" ("is_archived");
CREATE INDEX IF NOT EXISTS "IDX_dashboards_is_draft" ON "dashboards" ("is_draft");
CREATE INDEX IF NOT EXISTS "IDX_widgets_dashboard_id" ON "widgets" ("dashboard_id");
CREATE INDEX IF NOT EXISTS "IDX_api_keys_api_key" ON "api_keys" ("api_key");
CREATE INDEX IF NOT EXISTS "api_keys_object_type_object_id" ON "api_keys" ("object_type", "object_id");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_destinations_org_id_name" ON "notification_destinations" ("org_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "alert_subscriptions_destination_id_alert_id" ON "alert_subscriptions" ("destination_id", "alert_id");
CREATE INDEX IF NOT EXISTS "IDX_data_source_groups_data_source_id" ON "data_source_groups" ("data_source_id");
CREATE INDEX IF NOT EXISTS "IDX_groups_org_id_name" ON "groups" ("org_id", "name");

COMMIT;
