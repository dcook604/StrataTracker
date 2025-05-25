-- db/init/00-schema.sql
-- This file applies the Drizzle migrations to create the database schema

-- Apply the initial migration (0000_stormy_lockjaw.sql)
\i /docker-entrypoint-initdb.d/migrations/0000_stormy_lockjaw.sql

-- Apply subsequent migrations
\i /docker-entrypoint-initdb.d/migrations/0001_dark_kulan_gath.sql
\i /docker-entrypoint-initdb.d/migrations/0002_productive_saracen.sql
\i /docker-entrypoint-initdb.d/migrations/0001_add_email_notifications.sql 