

ALTER TABLE campaign_geo_targets
  ADD CONSTRAINT fk_geo_targets_proxy_pool
  FOREIGN KEY (proxy_pool_id) REFERENCES proxy_pools(id) ON DELETE SET NULL;


-- Update proxy_logs FK for session_id
ALTER TABLE proxy_logs
  ADD CONSTRAINT fk_proxy_logs_session
  FOREIGN KEY (session_id) REFERENCES browser_sessions(id) ON DELETE SET NULL;


-- Monthly partitions (create as needed)
CREATE TABLE analytics_events_2025_01 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE analytics_events_2025_06 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE analytics_events_2026_01 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE analytics_events_2026_06 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
-- Default partition for overflow
CREATE TABLE analytics_events_default PARTITION OF analytics_events DEFAULT;



CREATE TABLE traffic_logs_2025_01 PARTITION OF traffic_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE traffic_logs_2026_01 PARTITION OF traffic_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE traffic_logs_2026_06 PARTITION OF traffic_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE traffic_logs_default PARTITION OF traffic_logs DEFAULT;


CREATE TABLE system_logs_2026_01 PARTITION OF system_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE system_logs_2026_06 PARTITION OF system_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE system_logs_default PARTITION OF system_logs DEFAULT;


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_proxy_pools_updated_at
  BEFORE UPDATE ON proxy_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_worker_nodes_updated_at
  BEFORE UPDATE ON worker_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_top_up_updated_at
  BEFORE UPDATE ON top_up_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_behavior_profiles_updated_at
  BEFORE UPDATE ON behavior_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
