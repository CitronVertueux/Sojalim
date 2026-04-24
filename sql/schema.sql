-- ═══════════════════════════════════════════════════════
-- SOJALIM RDV — Schéma Supabase (PostgreSQL)
-- Coller intégralement dans : Supabase > SQL Editor > Run
-- ═══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Fonction hash bcrypt (vérification mot de passe) ──
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
  SELECT crypt(password, gen_salt('bf', 10));
$$ LANGUAGE SQL STRICT IMMUTABLE;

CREATE OR REPLACE FUNCTION check_password(input_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
  SELECT hashed_password = crypt(input_password, hashed_password);
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- ── UTILISATEURS ────────────────────────────────────────
-- Rôles :
--   admin       → équipe Sojalim (accès total)
--   transporter → société de transport (gère ses chauffeurs)
--   driver      → chauffeur rattaché à un transporteur
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'transporter'
                CHECK (role IN ('admin','transporter','driver')),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  company       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  siret         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  parent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('active','pending','disabled')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RENDEZ-VOUS ─────────────────────────────────────────
CREATE TABLE appointments (
  id             TEXT PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  transporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  slot           TEXT NOT NULL,
  driver_name    TEXT NOT NULL,
  driver_phone   TEXT NOT NULL,
  truck_plate    TEXT NOT NULL,
  company_name   TEXT NOT NULL DEFAULT '',
  load_type      TEXT NOT NULL,
  tonnage        NUMERIC(8,2) NOT NULL DEFAULT 0,
  order_number   TEXT NOT NULL,
  notes          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed','waitlist','cancelled')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── FERMETURES EXCEPTIONNELLES ───────────────────────────
CREATE TABLE closures (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE UNIQUE NOT NULL,
  reason     TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INVITATIONS ─────────────────────────────────────────
-- Utilisé par :
--   admin → inviter un transporteur
--   transporteur → inviter ses chauffeurs
CREATE TABLE invitations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'transporter'
             CHECK (role IN ('transporter','driver')),
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','used','revoked')),
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PARAMÈTRES ──────────────────────────────────────────
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings VALUES
  ('max_trucks_per_day',  '20'),
  ('max_tonnage_per_day', '500');

-- ── COMPTES PAR DÉFAUT ──────────────────────────────────
-- Admin : admin@sojalim.fr / Admin2024!
INSERT INTO users (email, password_hash, role, first_name, last_name, company, phone, siret, address, status)
VALUES (
  'admin@sojalim.fr',
  hash_password('Admin2024!'),
  'admin', 'Sophie', 'Moreau', 'Sojalim — Sanders Euralis',
  '05 62 96 00 00', '79017329800049',
  '193 Impasse Lautrec, 65500 Vic-en-Bigorre', 'active'
);

-- Transporteur démo : demo@transports.fr / Demo2024!
INSERT INTO users (email, password_hash, role, first_name, last_name, company, phone, siret, address, status)
VALUES (
  'demo@transports.fr',
  hash_password('Demo2024!'),
  'transporter', 'Jean', 'Martin', 'Transports Martin',
  '06 12 34 56 78', '12345678900001',
  '12 Rue des Camionneurs, 65000 Tarbes', 'active'
);

-- ── INDEX ────────────────────────────────────────────────
CREATE INDEX idx_appts_date        ON appointments(date);
CREATE INDEX idx_appts_user        ON appointments(user_id);
CREATE INDEX idx_appts_transporter ON appointments(transporter_id);
CREATE INDEX idx_appts_status      ON appointments(status);
CREATE INDEX idx_users_parent      ON users(parent_id);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_inv_token         ON invitations(token);
CREATE INDEX idx_inv_email         ON invitations(email);
CREATE INDEX idx_inv_invitedby     ON invitations(invited_by);
