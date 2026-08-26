ALTER TABLE auth_password_reset_tokens
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 0 AFTER consumed_at,
    ADD CONSTRAINT auth_password_reset_attempt_count_check CHECK (attempt_count BETWEEN 0 AND 5);

ALTER TABLE auth_email_verification_tokens
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 0 AFTER consumed_at,
    ADD CONSTRAINT auth_email_verification_attempt_count_check CHECK (attempt_count BETWEEN 0 AND 5);
