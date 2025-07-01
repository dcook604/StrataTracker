-- db/init/01-initial-data.sql
-- Initial data for StrataTracker fresh deployments
-- This creates essential default records for new installations

\connect spectrum4

-- Insert default admin user (only if database is fresh)
DO $$
BEGIN
    -- Check if this is a fresh installation by looking for any users
    IF NOT EXISTS (SELECT 1 FROM "users" LIMIT 1) THEN
        RAISE NOTICE 'Fresh installation detected. Creating default admin user...';
        
        -- Create default admin user in legacy users table (for backward compatibility)
        INSERT INTO "users" (
            "email", 
            "password", 
            "full_name", 
            "is_admin", 
            "is_council",
            "created_at",
            "updated_at"
        )
        VALUES (
            'admin@spectrum4.ca',
            -- bcrypt hash for password 'admin123' - CHANGE THIS IN PRODUCTION!
            '$2a$12$dFCWp0Vsv3fK2KvM4Z3gCewf0VIC6m/pEmgryI9btxDYsBu66rlIO',
            'Default Admin',
            true,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT ("email") DO NOTHING;

        -- Create default system settings
        INSERT INTO "system_settings" ("setting_key", "setting_value", "description") VALUES
            ('smtp_from_email', 'noreply@spectrum4.ca', 'Default from email for system notifications'),
            ('smtp_from_name', 'StrataTracker System', 'Default from name for system notifications'),
            ('violation_auto_approval', 'false', 'Whether violations are automatically approved'),
            ('email_dedup_ttl_hours', '24', 'Email deduplication TTL in hours'),
            ('session_timeout_minutes', '30', 'User session timeout in minutes')
        ON CONFLICT ("setting_key") DO NOTHING;

        -- Create default violation categories
        INSERT INTO "violation_categories" ("name", "description", "bylaw_reference", "default_fine_amount", "active") VALUES
            ('Noise Violation', 'Excessive noise complaints', 'Bylaw 3.1', 100, true),
            ('Parking Violation', 'Unauthorized parking in strata areas', 'Bylaw 5.2', 75, true),
            ('Pet Policy Violation', 'Violations of pet policies', 'Bylaw 4.1', 50, true),
            ('Common Area Misuse', 'Misuse of common areas', 'Bylaw 2.3', 25, true),
            ('Maintenance Issues', 'Unit maintenance violations', 'Bylaw 6.1', 150, true)
        ON CONFLICT ("name") DO NOTHING;

        -- Create default communication templates
        INSERT INTO "communication_templates" ("name", "communication_type", "subject_template", "html_template", "text_template", "is_system") VALUES
            ('violation_created', 'system', 'New Violation Report - {{violationType}}', 
             '<h2>Violation Report</h2><p>A new violation has been reported for unit {{unitNumber}}.</p><p><strong>Type:</strong> {{violationType}}</p><p><strong>Description:</strong> {{description}}</p>',
             'A new violation has been reported for unit {{unitNumber}}. Type: {{violationType}}. Description: {{description}}',
             true),
            ('violation_approved', 'system', 'Violation Approved - {{referenceNumber}}',
             '<h2>Violation Approved</h2><p>The violation report {{referenceNumber}} has been approved.</p><p><strong>Fine Amount:</strong> ${{fineAmount}}</p>',
             'The violation report {{referenceNumber}} has been approved. Fine Amount: ${{fineAmount}}',
             true),
            ('violation_disputed', 'system', 'Violation Disputed - {{referenceNumber}}',
             '<h2>Violation Disputed</h2><p>The violation report {{referenceNumber}} has been disputed by the resident.</p>',
             'The violation report {{referenceNumber}} has been disputed by the resident.',
             true)
        ON CONFLICT ("name") DO NOTHING;

        RAISE NOTICE 'Initial data created successfully!';
        RAISE NOTICE 'Default admin login: admin@spectrum4.ca / admin123';
        RAISE NOTICE 'IMPORTANT: Change the default admin password immediately!';
    ELSE
        RAISE NOTICE 'Existing data detected. Skipping initial data creation.';
    END IF;
END
$$; 