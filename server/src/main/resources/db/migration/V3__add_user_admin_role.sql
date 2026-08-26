ALTER TABLE users
    ADD COLUMN role VARCHAR(24) NOT NULL DEFAULT 'USER' AFTER status,
    ADD KEY users_role_status_idx (role, status),
    ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'));
