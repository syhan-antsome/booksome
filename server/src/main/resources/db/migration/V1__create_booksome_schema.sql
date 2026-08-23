CREATE TABLE users (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    email_verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY users_email_uq (email),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'deleted'))
) ENGINE=InnoDB;

CREATE TABLE profiles (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    username VARCHAR(50) NULL,
    avatar_path VARCHAR(1024) NULL,
    bio TEXT NULL,
    preferred_language VARCHAR(12) NOT NULL DEFAULT 'ko',
    city VARCHAR(120) NULL,
    country VARCHAR(120) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY profiles_username_uq (username),
    CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_refresh_tokens (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    last_used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY auth_refresh_tokens_hash_uq (token_hash),
    KEY auth_refresh_tokens_user_idx (user_id, expires_at),
    CONSTRAINT auth_refresh_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_password_reset_tokens (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY auth_password_reset_tokens_hash_uq (token_hash),
    KEY auth_password_reset_tokens_user_idx (user_id, expires_at),
    CONSTRAINT auth_password_reset_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_email_verification_tokens (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY auth_email_verification_tokens_hash_uq (token_hash),
    KEY auth_email_verification_tokens_user_idx (user_id, expires_at),
    CONSTRAINT auth_email_verification_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE book_works (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500) NULL,
    author VARCHAR(500) NOT NULL,
    description TEXT NULL,
    primary_language VARCHAR(32) NULL,
    cover_path VARCHAR(1024) NULL,
    external_cover_url VARCHAR(2048) NULL,
    lookup_title VARCHAR(500) NULL,
    lookup_author VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE book_editions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    work_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    isbn13 VARCHAR(20) NULL,
    isbn10 VARCHAR(20) NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500) NOT NULL,
    publisher VARCHAR(300) NULL,
    published_date DATE NULL,
    language VARCHAR(32) NULL,
    cover_path VARCHAR(1024) NULL,
    external_cover_url VARCHAR(2048) NULL,
    source VARCHAR(80) NULL,
    source_payload JSON NULL,
    lookup_isbn VARCHAR(20) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY book_editions_isbn13_uq (isbn13),
    UNIQUE KEY book_editions_isbn10_uq (isbn10),
    KEY book_editions_work_idx (work_id),
    CONSTRAINT book_editions_work_fk FOREIGN KEY (work_id) REFERENCES book_works (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rooms (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    work_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    edition_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    slug VARCHAR(180) NOT NULL,
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500) NULL,
    description TEXT NULL,
    accent_color VARCHAR(16) NOT NULL DEFAULT '#116653',
    cover_path VARCHAR(1024) NULL,
    external_cover_url VARCHAR(2048) NULL,
    visibility VARCHAR(24) NOT NULL DEFAULT 'public',
    default_spoiler_chapter INT NULL,
    founder_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    lookup_title VARCHAR(500) NULL,
    lookup_isbn VARCHAR(20) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY rooms_slug_uq (slug),
    UNIQUE KEY rooms_one_per_work_uq (work_id),
    KEY rooms_edition_idx (edition_id),
    KEY rooms_founder_idx (founder_id),
    CONSTRAINT rooms_visibility_check CHECK (visibility IN ('public', 'private', 'unlisted')),
    CONSTRAINT rooms_work_fk FOREIGN KEY (work_id) REFERENCES book_works (id) ON DELETE CASCADE,
    CONSTRAINT rooms_edition_fk FOREIGN KEY (edition_id) REFERENCES book_editions (id) ON DELETE SET NULL,
    CONSTRAINT rooms_founder_fk FOREIGN KEY (founder_id) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE room_members (
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    role VARCHAR(24) NOT NULL DEFAULT 'member',
    reading_status VARCHAR(24) NULL,
    joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    muted_until DATETIME(6) NULL,
    PRIMARY KEY (room_id, profile_id),
    KEY room_members_profile_idx (profile_id),
    KEY room_members_reading_status_idx (room_id, reading_status),
    CONSTRAINT room_members_role_check CHECK (role IN ('founder', 'host', 'co_host', 'editor', 'member')),
    CONSTRAINT room_members_reading_status_check CHECK (
        reading_status IS NULL OR reading_status IN ('want_to_read', 'reading', 'finished')
    ),
    CONSTRAINT room_members_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT room_members_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE posts (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    author_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    kind VARCHAR(24) NOT NULL DEFAULT 'impression',
    body TEXT NOT NULL,
    quote_text TEXT NULL,
    chapter_label VARCHAR(255) NULL,
    spoiler_chapter INT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    classification_status VARCHAR(24) NOT NULL DEFAULT 'done',
    moderation_status VARCHAR(24) NOT NULL DEFAULT 'approved',
    visibility VARCHAR(24) NOT NULL DEFAULT 'public',
    ai_confidence DECIMAL(4,3) NULL,
    ai_reason VARCHAR(500) NULL,
    reviewed_at DATETIME(6) NULL,
    hidden_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY posts_room_created_idx (room_id, created_at),
    KEY posts_room_visibility_created_idx (room_id, visibility, created_at),
    KEY posts_author_idx (author_id),
    CONSTRAINT posts_kind_check CHECK (kind IN ('impression', 'question', 'quote', 'notice')),
    CONSTRAINT posts_classification_status_check CHECK (classification_status IN ('pending', 'done', 'failed', 'skipped')),
    CONSTRAINT posts_moderation_status_check CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'needs_review', 'failed')),
    CONSTRAINT posts_visibility_check CHECK (visibility IN ('pending', 'public', 'hidden')),
    CONSTRAINT posts_ai_confidence_check CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
    CONSTRAINT posts_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT posts_author_fk FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE comments (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    author_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    body TEXT NOT NULL,
    hidden_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY comments_post_created_idx (post_id, created_at),
    KEY comments_author_idx (author_id),
    CONSTRAINT comments_post_fk FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT comments_author_fk FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reactions (
    post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reaction VARCHAR(24) NOT NULL DEFAULT 'like',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (post_id, profile_id, reaction),
    KEY reactions_profile_idx (profile_id),
    CONSTRAINT reactions_post_fk FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT reactions_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reading_sessions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    host_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    title VARCHAR(500) NOT NULL,
    starts_at DATETIME(6) NULL,
    ends_at DATETIME(6) NULL,
    chapter_label VARCHAR(255) NULL,
    description TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY reading_sessions_room_starts_idx (room_id, starts_at),
    KEY reading_sessions_host_idx (host_id),
    CONSTRAINT reading_sessions_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT reading_sessions_host_fk FOREIGN KEY (host_id) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reading_books (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    isbn13 VARCHAR(20) NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500) NOT NULL,
    publisher VARCHAR(300) NULL,
    published_date DATE NULL,
    description TEXT NULL,
    external_cover_url VARCHAR(2048) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'reading',
    progress_percent INT NOT NULL DEFAULT 0,
    current_page INT NOT NULL DEFAULT 0,
    total_pages INT NULL,
    pinned_at DATETIME(6) NULL,
    visibility VARCHAR(24) NOT NULL DEFAULT 'private',
    source VARCHAR(80) NULL,
    source_payload JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY reading_books_profile_isbn_uq (profile_id, isbn13),
    KEY reading_books_profile_updated_idx (profile_id, updated_at),
    CONSTRAINT reading_books_status_check CHECK (status IN ('reading', 'finished')),
    CONSTRAINT reading_books_progress_check CHECK (progress_percent BETWEEN 0 AND 100),
    CONSTRAINT reading_books_current_page_check CHECK (current_page >= 0),
    CONSTRAINT reading_books_total_pages_check CHECK (total_pages IS NULL OR total_pages > 0),
    CONSTRAINT reading_books_page_range_check CHECK (total_pages IS NULL OR current_page <= total_pages),
    CONSTRAINT reading_books_visibility_check CHECK (visibility IN ('private', 'public')),
    CONSTRAINT reading_books_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reading_notes (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reading_book_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind VARCHAR(24) NOT NULL,
    quote_text TEXT NULL,
    body TEXT NULL,
    page_label VARCHAR(255) NULL,
    current_page_snapshot INT NOT NULL DEFAULT 0,
    progress_percent_snapshot INT NOT NULL DEFAULT 0,
    total_pages_snapshot INT NULL,
    media_path VARCHAR(1024) NULL,
    media_url VARCHAR(2048) NULL,
    visibility VARCHAR(24) NOT NULL DEFAULT 'private',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY reading_notes_book_created_idx (reading_book_id, created_at),
    KEY reading_notes_profile_created_idx (profile_id, created_at),
    CONSTRAINT reading_notes_kind_check CHECK (kind IN ('quote', 'photo')),
    CONSTRAINT reading_notes_current_page_check CHECK (current_page_snapshot >= 0),
    CONSTRAINT reading_notes_progress_check CHECK (progress_percent_snapshot BETWEEN 0 AND 100),
    CONSTRAINT reading_notes_total_pages_check CHECK (total_pages_snapshot IS NULL OR total_pages_snapshot > 0),
    CONSTRAINT reading_notes_visibility_check CHECK (visibility IN ('private', 'public')),
    CONSTRAINT reading_notes_book_fk FOREIGN KEY (reading_book_id) REFERENCES reading_books (id) ON DELETE CASCADE,
    CONSTRAINT reading_notes_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE meetups (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    host_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    starting_book_title VARCHAR(500) NULL,
    starting_book_author VARCHAR(500) NULL,
    starting_book_publisher VARCHAR(300) NULL,
    starting_book_translator VARCHAR(300) NULL,
    starting_book_isbn VARCHAR(20) NULL,
    starting_book_cover_url VARCHAR(2048) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'scheduled',
    starts_at DATETIME(6) NULL,
    city VARCHAR(120) NULL,
    country VARCHAR(120) NULL,
    venue_name VARCHAR(300) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY meetups_city_starts_idx (city, starts_at),
    KEY meetups_room_idx (room_id),
    KEY meetups_host_idx (host_id),
    CONSTRAINT meetups_status_check CHECK (status IN ('draft', 'scheduled', 'cancelled', 'completed')),
    CONSTRAINT meetups_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT meetups_host_fk FOREIGN KEY (host_id) REFERENCES profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE media_assets (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    bucket VARCHAR(120) NOT NULL,
    object_path VARCHAR(1024) NOT NULL,
    mime_type VARCHAR(120) NULL,
    width INT NULL,
    height INT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY media_assets_object_path_uq (object_path),
    KEY media_assets_owner_idx (owner_id),
    KEY media_assets_room_idx (room_id),
    CONSTRAINT media_assets_owner_fk FOREIGN KEY (owner_id) REFERENCES profiles (id) ON DELETE SET NULL,
    CONSTRAINT media_assets_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE push_tokens (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expo_push_token VARCHAR(512) NOT NULL,
    device_platform VARCHAR(32) NULL,
    last_seen_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY push_tokens_token_uq (expo_push_token),
    KEY push_tokens_profile_idx (profile_id),
    CONSTRAINT push_tokens_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    data JSON NOT NULL DEFAULT ('{}'),
    read_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY notifications_profile_created_idx (profile_id, created_at),
    CONSTRAINT notifications_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reports (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reporter_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    room_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    post_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    comment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    reason VARCHAR(120) NOT NULL,
    details TEXT NULL,
    resolved_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY reports_reporter_idx (reporter_id),
    KEY reports_room_idx (room_id),
    KEY reports_post_idx (post_id),
    KEY reports_comment_idx (comment_id),
    CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES profiles (id) ON DELETE SET NULL,
    CONSTRAINT reports_room_fk FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT reports_post_fk FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT reports_comment_fk FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE market_listings (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    seller_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    type VARCHAR(24) NOT NULL DEFAULT 'offer',
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500) NULL,
    isbn13 VARCHAR(20) NULL,
    description TEXT NULL,
    condition_label VARCHAR(120) NULL,
    price INT NULL,
    area_label VARCHAR(255) NOT NULL,
    image_url VARCHAR(2048) NULL,
    media_asset_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'available',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY market_listings_status_created_idx (status, created_at),
    KEY market_listings_seller_created_idx (seller_id, created_at),
    KEY market_listings_media_idx (media_asset_id),
    CONSTRAINT market_listings_type_check CHECK (type IN ('offer', 'wanted')),
    CONSTRAINT market_listings_status_check CHECK (status IN ('available', 'reserved', 'completed', 'hidden')),
    CONSTRAINT market_listings_price_check CHECK (price IS NULL OR price >= 0),
    CONSTRAINT market_listings_offer_price_check CHECK (type <> 'offer' OR price IS NOT NULL),
    CONSTRAINT market_listings_seller_fk FOREIGN KEY (seller_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT market_listings_media_fk FOREIGN KEY (media_asset_id) REFERENCES media_assets (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE market_threads (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    listing_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    buyer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    seller_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY market_threads_listing_buyer_uq (listing_id, buyer_id),
    KEY market_threads_participants_idx (buyer_id, seller_id, updated_at),
    CONSTRAINT market_threads_not_self_check CHECK (buyer_id <> seller_id),
    CONSTRAINT market_threads_listing_fk FOREIGN KEY (listing_id) REFERENCES market_listings (id) ON DELETE CASCADE,
    CONSTRAINT market_threads_buyer_fk FOREIGN KEY (buyer_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT market_threads_seller_fk FOREIGN KEY (seller_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE market_messages (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    thread_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    sender_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY market_messages_thread_created_idx (thread_id, created_at),
    KEY market_messages_sender_idx (sender_id),
    CONSTRAINT market_messages_thread_fk FOREIGN KEY (thread_id) REFERENCES market_threads (id) ON DELETE CASCADE,
    CONSTRAINT market_messages_sender_fk FOREIGN KEY (sender_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW room_discovery_cards AS
SELECT
    r.id,
    r.slug,
    r.title,
    COALESCE(r.subtitle, bw.author) AS subtitle,
    r.accent_color,
    r.visibility,
    (
        SELECT p.display_name
        FROM room_members hrm
        JOIN profiles p ON p.id = hrm.profile_id
        WHERE hrm.room_id = r.id AND hrm.role IN ('founder', 'host')
        ORDER BY CASE hrm.role WHEN 'founder' THEN 0 ELSE 1 END, hrm.joined_at
        LIMIT 1
    ) AS host_name,
    (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) AS member_count,
    (
        SELECT p.body
        FROM posts p
        WHERE p.room_id = r.id
          AND p.kind = 'question'
          AND p.hidden_at IS NULL
          AND p.visibility = 'public'
          AND p.moderation_status = 'approved'
        ORDER BY p.pinned DESC, p.created_at DESC
        LIMIT 1
    ) AS pinned_question,
    (
        SELECT rs.title
        FROM reading_sessions rs
        WHERE rs.room_id = r.id
          AND (rs.starts_at IS NULL OR rs.starts_at >= UTC_TIMESTAMP(6) - INTERVAL 1 DAY)
        ORDER BY rs.starts_at IS NULL, rs.starts_at
        LIMIT 1
    ) AS next_event,
    50 AS progress_percent,
    r.external_cover_url,
    r.created_at
FROM rooms r
JOIN book_works bw ON bw.id = r.work_id
WHERE r.visibility = 'public';
