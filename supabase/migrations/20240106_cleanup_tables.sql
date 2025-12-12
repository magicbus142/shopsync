-- Cleanup Unused Tables
-- CAUTION: This will delete these tables and all their data permanently.

-- Drop unused views
DROP VIEW IF EXISTS admin_user_stats;

-- Drop unused tables
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
