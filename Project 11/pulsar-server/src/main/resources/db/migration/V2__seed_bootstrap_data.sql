-- Bootstrap admin user for first login. Password is "PulsarAdmin123!" hashed with BCrypt (cost 10).
-- Rotate/delete this account in any real deployment; it exists purely to make the API demoable out of the box.
INSERT INTO users (id, username, password_hash, role, created_at)
VALUES (gen_random_uuid(), 'admin', '$2y$10$BCftDHBcfj4j3yFV5/2EpeyRwyoKxNZmSMMkjCIwAaHe5powjdCtW', 'ADMIN', now())
ON CONFLICT (username) DO NOTHING;

-- A couple of placeholder SIMPLE task definitions for smoke-testing the engine end-to-end;
-- the real OTT task library (transcode, DRM, subtitles, ...) arrives in a later phase.
INSERT INTO task_definitions (id, name, description, retry_count, retry_logic, retry_delay_seconds, timeout_seconds, input_keys, output_keys)
VALUES
    (gen_random_uuid(), 'noop-task', 'No-op placeholder task for smoke testing', 3, 'FIXED', 5, 300, 'input', 'output'),
    (gen_random_uuid(), 'sample-task', 'Second placeholder task for linear smoke-test workflows', 3, 'FIXED', 5, 300, 'input', 'output')
ON CONFLICT (name) DO NOTHING;
