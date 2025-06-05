CREATE TABLE email_verification_codes (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    violation_id INTEGER NOT NULL REFERENCES violations(id),
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
