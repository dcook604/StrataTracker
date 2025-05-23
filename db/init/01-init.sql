-- db/init/01-init.sql

-- Create admin user (adjust table/column names as per your schema)
INSERT INTO users (email, password, full_name, is_admin, created_at)
VALUES (
  'admin@spectrum4.com',
  -- Replace with a bcrypt hash of your desired password!
  '$2a$12$dFCWp0Vsv3fK2KvM4Z3gCewf0VIC6m/pEmgryI9btxDYsBu66rlIO', 
  'Admin User',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING; 