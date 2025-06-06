-- Migration: Add public user sessions table for owners/tenants
-- Date: 2025-01-09
-- Description: Creates table to manage authenticated sessions for owners/tenants accessing violations via email links

CREATE TABLE IF NOT EXISTS public_user_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    unit_id INTEGER NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL, -- 'owner' or 'tenant'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    
    -- Add indexes for performance
    CONSTRAINT public_user_sessions_session_id_key UNIQUE (session_id),
    CONSTRAINT public_user_sessions_role_check CHECK (role IN ('owner', 'tenant'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_user_sessions_session_id ON public_user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_public_user_sessions_person_id ON public_user_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_public_user_sessions_unit_id ON public_user_sessions(unit_id);
CREATE INDEX IF NOT EXISTS idx_public_user_sessions_expires_at ON public_user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_user_sessions_email ON public_user_sessions(email);

-- Add comments for documentation
COMMENT ON TABLE public_user_sessions IS 'Stores authenticated sessions for owners/tenants accessing violations via email verification';
COMMENT ON COLUMN public_user_sessions.session_id IS 'Unique session identifier for API authentication';
COMMENT ON COLUMN public_user_sessions.person_id IS 'Reference to the authenticated person';
COMMENT ON COLUMN public_user_sessions.unit_id IS 'Reference to the unit - limits access to unit-specific data';
COMMENT ON COLUMN public_user_sessions.email IS 'Email address used for verification (denormalized for performance)';
COMMENT ON COLUMN public_user_sessions.role IS 'Person role - owner or tenant';
COMMENT ON COLUMN public_user_sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN public_user_sessions.last_accessed_at IS 'Last time this session was used (for analytics and cleanup)';

-- Grant necessary permissions (adjust based on your database user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public_user_sessions TO your_app_user; 