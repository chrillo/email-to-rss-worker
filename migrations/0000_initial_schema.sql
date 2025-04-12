CREATE TABLE articles (
    id TEXT PRIMARY KEY,
    email_hash TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source TEXT
);

CREATE INDEX idx_articles_email_hash ON articles(email_hash);

