-- Migration: Add email deduplication and idempotency tracking tables
-- Created: 2025-01-08
-- Purpose: Implement comprehensive email deduplication to prevent duplicate notifications

-- Email idempotency keys table for tracking sent emails
CREATE TABLE email_idempotency_keys (
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    email_type TEXT NOT NULL, -- 'violation_notification', 'violation_approved', 'campaign', 'system'
    recipient_email TEXT NOT NULL,
    email_hash TEXT NOT NULL, -- Hash of email content for deduplication
    status TEXT DEFAULT 'sent' NOT NULL, -- 'sent', 'failed', 'pending'
    sent_at TIMESTAMP,
    metadata JSONB, -- Store additional context (violationId, campaignId, etc.)
    expires_at TIMESTAMP NOT NULL, -- TTL for cleanup
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_email_idempotency_keys_key ON email_idempotency_keys(idempotency_key);
CREATE INDEX idx_email_idempotency_keys_recipient_type ON email_idempotency_keys(recipient_email, email_type);
CREATE INDEX idx_email_idempotency_keys_hash ON email_idempotency_keys(email_hash);
CREATE INDEX idx_email_idempotency_keys_expires ON email_idempotency_keys(expires_at);
CREATE INDEX idx_email_idempotency_keys_status ON email_idempotency_keys(status);
CREATE INDEX idx_email_idempotency_keys_created ON email_idempotency_keys(created_at);

-- Email send attempts table for tracking retries
CREATE TABLE email_send_attempts (
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL REFERENCES email_idempotency_keys(idempotency_key) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL, -- 'pending', 'sent', 'failed', 'retrying'
    error_message TEXT,
    attempted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
);

-- Indexes for email send attempts
CREATE INDEX idx_email_send_attempts_key ON email_send_attempts(idempotency_key);
CREATE INDEX idx_email_send_attempts_status ON email_send_attempts(status);
CREATE INDEX idx_email_send_attempts_attempted ON email_send_attempts(attempted_at);

-- Email deduplication log for tracking prevented duplicates
CREATE TABLE email_deduplication_log (
    id SERIAL PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- Hash of subject + content
    original_idempotency_key TEXT NOT NULL,
    duplicate_idempotency_key TEXT NOT NULL,
    prevented_at TIMESTAMP DEFAULT NOW() NOT NULL,
    metadata JSONB -- Context about why it was prevented
);

-- Indexes for deduplication log
CREATE INDEX idx_email_dedup_log_recipient ON email_deduplication_log(recipient_email);
CREATE INDEX idx_email_dedup_log_type ON email_deduplication_log(email_type);
CREATE INDEX idx_email_dedup_log_content_hash ON email_deduplication_log(content_hash);
CREATE INDEX idx_email_dedup_log_prevented ON email_deduplication_log(prevented_at);

-- Add comments for documentation
COMMENT ON TABLE email_idempotency_keys IS 'Tracks email sends with idempotency keys to prevent duplicates';
COMMENT ON TABLE email_send_attempts IS 'Records individual send attempts for retry tracking';
COMMENT ON TABLE email_deduplication_log IS 'Logs prevented duplicate emails for monitoring';

COMMENT ON COLUMN email_idempotency_keys.idempotency_key IS 'Unique key generated from email context to prevent duplicates';
COMMENT ON COLUMN email_idempotency_keys.email_hash IS 'Hash of email content (subject + body) for content-based deduplication';
COMMENT ON COLUMN email_idempotency_keys.metadata IS 'Additional context like violationId, campaignId, userId';
COMMENT ON COLUMN email_idempotency_keys.expires_at IS 'TTL for automatic cleanup of old records';

COMMENT ON COLUMN email_send_attempts.attempt_number IS 'Sequential attempt number for retry tracking';
COMMENT ON COLUMN email_deduplication_log.metadata IS 'Context about duplicate prevention (reason, timing, etc.)'; 