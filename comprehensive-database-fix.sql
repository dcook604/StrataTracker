-- COMPREHENSIVE DATABASE SCHEMA FIX
-- This script creates missing tables and fixes foreign key references

-- Step 1: Create missing tables that the application expects

-- Parking spots table
CREATE TABLE IF NOT EXISTS parking_spots (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Storage lockers table  
CREATE TABLE IF NOT EXISTS storage_lockers (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Bike lockers table
CREATE TABLE IF NOT EXISTS bike_lockers (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Unit facilities table (deprecated but may still be referenced)
CREATE TABLE IF NOT EXISTS unit_facilities (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE UNIQUE,
    parking_spots TEXT,
    storage_lockers TEXT,
    bike_lockers TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Persons table (for owners/tenants)
CREATE TABLE IF NOT EXISTS persons (
    id SERIAL PRIMARY KEY,
    auth_user_id TEXT, -- Link to Supabase Auth User ID
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_system_user BOOLEAN DEFAULT FALSE NOT NULL,
    has_cat BOOLEAN DEFAULT FALSE,
    has_dog BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Unit-Person Roles (many-to-many)
CREATE TABLE IF NOT EXISTS unit_person_roles (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL REFERENCES property_units(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    role TEXT NOT NULL, -- 'owner' or 'tenant'
    receive_email_notifications BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Violation access links (for secure public access)
CREATE TABLE IF NOT EXISTS violation_access_links (
    id SERIAL PRIMARY KEY,
    violation_id INTEGER NOT NULL REFERENCES violations(id),
    violation_uuid UUID REFERENCES violations(uuid),
    recipient_email TEXT NOT NULL,
    token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Communication campaigns
CREATE TABLE IF NOT EXISTS communication_campaigns (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    plain_text_content TEXT,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_by_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Communication recipients
CREATE TABLE IF NOT EXISTS communication_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL,
    unit_id INTEGER REFERENCES property_units(id),
    person_id INTEGER REFERENCES persons(id),
    email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMP,
    error_message TEXT,
    tracking_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Communication templates
CREATE TABLE IF NOT EXISTS communication_templates (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_by_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Email tracking events
CREATE TABLE IF NOT EXISTS email_tracking_events (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES communication_recipients(id) ON DELETE CASCADE,
    tracking_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- Manual email recipients
CREATE TABLE IF NOT EXISTS manual_email_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Email verification codes
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    violation_id INTEGER NOT NULL REFERENCES violations(id),
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Public user sessions
CREATE TABLE IF NOT EXISTS public_user_sessions (
    id SERIAL PRIMARY KEY,
    session_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    unit_id INTEGER NOT NULL REFERENCES property_units(id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_accessed TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Show created tables
SELECT 'Tables created successfully' as status; 