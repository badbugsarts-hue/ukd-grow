CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sync_operations (
  cursor bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL UNIQUE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  base_revision integer,
  entity_revision integer NOT NULL,
  operation text NOT NULL CHECK (operation IN ('append','upsert','tombstone')),
  payload jsonb NOT NULL,
  client_created_at timestamptz NOT NULL,
  server_created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  local_operation_id uuid NOT NULL,
  remote_operation_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_member_read ON workspaces
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = id AND m.user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  );

CREATE POLICY membership_self_read ON workspace_memberships
  FOR SELECT USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY sync_member_access ON sync_operations
  USING (
    workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = sync_operations.workspace_id
        AND m.user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  )
  WITH CHECK (
    workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = sync_operations.workspace_id
        AND m.user_id = nullif(current_setting('app.user_id', true), '')::uuid
        AND m.role IN ('owner','editor'))
  );

CREATE POLICY conflict_member_access ON sync_conflicts
  USING (
    workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = sync_conflicts.workspace_id
        AND m.user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  );

CREATE OR REPLACE FUNCTION create_initial_workspace(p_user_id uuid, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_workspace_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM workspace_memberships WHERE user_id = p_user_id) THEN
    RETURN NULL;
  END IF;
  INSERT INTO workspaces (name) VALUES (p_name) RETURNING id INTO created_workspace_id;
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
    VALUES (created_workspace_id, p_user_id, 'owner');
  RETURN created_workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION create_initial_workspace(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_initial_workspace(uuid, text) TO ukd_app;
