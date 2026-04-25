-- ═══════════════════════════════════════════════════════
-- SOJALIM RDV — Schéma complet + données de test
-- Coller dans Supabase > SQL Editor > Run
-- ═══════════════════════════════════════════════════════

DROP TABLE IF EXISTS incidents    CASCADE;
DROP TABLE IF EXISTS invitations  CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS closures     CASCADE;
DROP TABLE IF EXISTS settings     CASCADE;
DROP TABLE IF EXISTS users        CASCADE;
DROP VIEW  IF EXISTS transporter_scores;
DROP FUNCTION IF EXISTS hash_password  CASCADE;
DROP FUNCTION IF EXISTS check_password CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE FUNCTION hash_password(password TEXT) RETURNS TEXT AS $$
  SELECT crypt(password, gen_salt('bf',10));
$$ LANGUAGE SQL STRICT IMMUTABLE;

CREATE FUNCTION check_password(input_password TEXT, hashed_password TEXT) RETURNS BOOLEAN AS $$
  SELECT hashed_password = crypt(input_password, hashed_password);
$$ LANGUAGE SQL STRICT IMMUTABLE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'transporter' CHECK (role IN ('admin','transporter','driver')),
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  company TEXT NOT NULL, phone TEXT NOT NULL,
  siret TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','disabled')),
  last_login TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL, slot TEXT NOT NULL,
  driver_name TEXT NOT NULL, driver_phone TEXT NOT NULL,
  truck_plate TEXT NOT NULL, company_name TEXT NOT NULL DEFAULT '',
  load_type TEXT NOT NULL, tonnage NUMERIC(8,2) NOT NULL DEFAULT 0,
  order_number TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','waitlist','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id TEXT REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('no_show','late','partial_load','other')),
  late_minutes INT NOT NULL DEFAULT 0, penalty NUMERIC(4,1) NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '', created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL, reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'transporter' CHECK (role IN ('transporter','driver')),
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','revoked')),
  used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings VALUES
  ('max_trucks_per_day','20'),('max_tonnage_per_day','500'),
  ('penalty_no_show','2'),('penalty_late_30','0.5'),
  ('penalty_late_60','1'),('penalty_threshold_warning','3'),
  ('penalty_threshold_danger','5');

CREATE VIEW transporter_scores AS
SELECT u.id,u.email,u.first_name,u.last_name,u.company,u.status,u.role,
  COUNT(i.id) AS total_incidents, COALESCE(SUM(i.penalty),0) AS total_penalty,
  COUNT(CASE WHEN i.type='no_show' THEN 1 END) AS no_shows,
  COUNT(CASE WHEN i.type='late' THEN 1 END) AS lates,
  COUNT(CASE WHEN i.type='partial_load' THEN 1 END) AS partial_loads,
  CASE WHEN COALESCE(SUM(i.penalty),0)>=5 THEN 'danger'
       WHEN COALESCE(SUM(i.penalty),0)>=3 THEN 'warning' ELSE 'ok' END AS alert_level
FROM users u LEFT JOIN incidents i ON i.user_id=u.id
WHERE u.role IN ('transporter','driver')
GROUP BY u.id,u.email,u.first_name,u.last_name,u.company,u.status,u.role;

ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents    DISABLE ROW LEVEL SECURITY;
ALTER TABLE closures     DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings     DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_appts_date   ON appointments(date);
CREATE INDEX idx_appts_transp ON appointments(transporter_id);
CREATE INDEX idx_appts_status ON appointments(status);
CREATE INDEX idx_users_parent ON users(parent_id);
CREATE INDEX idx_inc_user     ON incidents(user_id);
CREATE INDEX idx_inv_token    ON invitations(token);

-- ═══════════════════════════════════════════
-- COMPTES
-- ═══════════════════════════════════════════

INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status) VALUES
('admin@sojalim.fr',   hash_password('Admin2024!'), 'admin',       'Sophie',  'Moreau',  'Sojalim — Sanders Euralis', '05 62 96 00 00', '79017329800049','193 Impasse Lautrec, 65500 Vic-en-Bigorre','active'),
('demo@transports.fr', hash_password('Demo2024!'),  'transporter', 'Jean',    'Martin',  'Transports Martin',         '06 12 34 56 78', '12345678900001','12 Rue des Camionneurs, 65000 Tarbes',     'active'),
('garcia@test.fr',     hash_password('Test2024!'),  'transporter', 'Carlos',  'García',  'Transportes García SL',     '+34 612 345 678','98765432100001','Calle Mayor 12, Zaragoza, España',         'active'),
('dupont@test.fr',     hash_password('Test2024!'),  'transporter', 'Pierre',  'Dupont',  'Transports Dupont & Fils',  '05 61 23 45 67', '11122233300001','14 Route de Toulouse, 31000 Toulouse',     'active'),
('martin@test.fr',     hash_password('Test2024!'),  'transporter', 'Sophie',  'Martin',  'LogTrans Martin',           '06 77 88 99 00', '44455566600001','8 Av. des Pyrénées, 64000 Pau',            'active'),
('torres@test.fr',     hash_password('Test2024!'),  'transporter', 'Miguel',  'Torres',  'Ibérica Transport SA',      '+34 654 987 321','87654321000001','Av. Catalunya 45, Lleida, España',         'active'),
('leblanc@test.fr',    hash_password('Test2024!'),  'transporter', 'François','Leblanc', 'SARL Leblanc Transport',    '05 62 11 22 33', '33344455500001','22 Rue du Commerce, 65000 Tarbes',         'active'),
('pending1@test.fr',   hash_password('Test2024!'),  'transporter', 'Roberto', 'Sanchez', 'Sanchez Logistica',         '+34 698 765 432','76543210000001','Calle Barcelona 8, Huesca, España',        'pending'),
('pending2@test.fr',   hash_password('Test2024!'),  'transporter', 'Marc',    'Rousseau','Rousseau Frères Transport',  '05 63 44 55 66', '22233344400001','5 Impasse Artisans, 82000 Montauban',      'pending');

-- Chauffeurs de demo@transports.fr
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'chauffeur1@transports.fr',hash_password('Chauffeur2024!'),'driver','Michel','Dubois','Transports Martin','06 11 22 33 44','','15 Rue des Acacias, 65000 Tarbes','active',id FROM users WHERE email='demo@transports.fr';
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'chauffeur2@transports.fr',hash_password('Chauffeur2024!'),'driver','Ahmed','Benali','Transports Martin','06 55 66 77 88','','8 Av. Jean Jaurès, 65000 Tarbes','active',id FROM users WHERE email='demo@transports.fr';
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'chauffeur.pending@transports.fr',hash_password('Chauffeur2024!'),'driver','Pierre','Nouveau','Transports Martin','06 99 88 77 66','','Tarbes','pending',id FROM users WHERE email='demo@transports.fr';

-- Chauffeurs de garcia@test.fr
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'antonio@garcia.fr',hash_password('Test2024!'),'driver','Antonio','García','Transportes García SL','+34 611 222 333','','Zaragoza','active',id FROM users WHERE email='garcia@test.fr';
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'luis@garcia.fr',hash_password('Test2024!'),'driver','Luis','García','Transportes García SL','+34 622 333 444','','Zaragoza','active',id FROM users WHERE email='garcia@test.fr';

-- Chauffeur de dupont@test.fr
INSERT INTO users (email,password_hash,role,first_name,last_name,company,phone,siret,address,status,parent_id)
SELECT 'julien@dupont.fr',hash_password('Test2024!'),'driver','Julien','Dupont','Transports Dupont & Fils','06 33 44 55 66','','Toulouse','active',id FROM users WHERE email='dupont@test.fr';

-- ═══════════════════════════════════════════
-- INVITATIONS
-- ═══════════════════════════════════════════
INSERT INTO invitations (email,token,role,invited_by,note,status)
SELECT 'nouveau@test.fr','tok-t-001-'||gen_random_uuid()::text,'transporter',id,'Nouveau transporteur Midi-Pyrénées','pending' FROM users WHERE email='admin@sojalim.fr';
INSERT INTO invitations (email,token,role,invited_by,note,status)
SELECT 'chauffeur.invite@test.fr','tok-d-001-'||gen_random_uuid()::text,'driver',id,'Chauffeur invité par Martin','pending' FROM users WHERE email='demo@transports.fr';
INSERT INTO invitations (email,token,role,invited_by,note,status)
SELECT 'used@test.fr','tok-u-001-'||gen_random_uuid()::text,'transporter',id,'Invitation utilisée','used' FROM users WHERE email='admin@sojalim.fr';
INSERT INTO invitations (email,token,role,invited_by,note,status)
SELECT 'revoked@test.fr','tok-r-001-'||gen_random_uuid()::text,'transporter',id,'Invitation révoquée','revoked' FROM users WHERE email='admin@sojalim.fr';

-- ═══════════════════════════════════════════
-- FERMETURES
-- ═══════════════════════════════════════════
INSERT INTO closures (date,reason,created_by)
SELECT CURRENT_DATE+10,'Maintenance annuelle des équipements',id FROM users WHERE email='admin@sojalim.fr';
INSERT INTO closures (date,reason,created_by)
SELECT CURRENT_DATE+25,'Congés estivaux',id FROM users WHERE email='admin@sojalim.fr';

-- ═══════════════════════════════════════════
-- RDV SUR 6 SEMAINES
-- ═══════════════════════════════════════════
DO $$
DECLARE
  v_date DATE; v_tid UUID; v_uid UUID; v_email TEXT;
  v_emails TEXT[] := ARRAY['demo@transports.fr','garcia@test.fr','dupont@test.fr','martin@test.fr','torres@test.fr','leblanc@test.fr'];
  v_drivers TEXT[] := ARRAY['Jean Martin','Carlos García','Pierre Dupont','Michel Dubois','Ahmed Benali','Antonio García','Luis García','Julien Dupont','Miguel Torres','François Leblanc','Éric Rousseau','Sébastien Roy'];
  v_phones TEXT[] := ARRAY['06 12 34 56 78','+34 612 345 678','05 61 23 45 67','06 11 22 33 44','06 55 66 77 88','+34 611 222 333','+34 622 333 444','06 33 44 55 66','+34 654 987 321','05 62 11 22 33','06 77 88 99 00','05 63 44 55 66'];
  v_plates TEXT[] := ARRAY['AB-123-CD','EF-456-GH','IJ-789-KL','MN-012-OP','QR-345-ST','UV-678-WX','YZ-901-AB','CD-234-EF','GH-567-IJ','KL-890-MN','5678-GZA','3421-HUE'];
  v_loads TEXT[] := ARRAY['Tourteau de soja','Huile de soja brute','Coques de soja','Soja en graines'];
  v_slots TEXT[] := ARRAY['05:00','05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'];
  v_n INT := 0; v_rpd INT; v_i INT; v_status TEXT;
BEGIN
  FOR v_day IN -14..28 LOOP
    v_date := CURRENT_DATE + v_day;
    IF EXTRACT(DOW FROM v_date) IN (0,6) THEN CONTINUE; END IF;
    IF TO_CHAR(v_date,'MM-DD') IN ('01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25') THEN CONTINUE; END IF;
    IF EXISTS(SELECT 1 FROM closures WHERE date=v_date) THEN CONTINUE; END IF;
    v_rpd := 4 + (v_n % 7);
    FOR v_i IN 1..v_rpd LOOP
      v_n := v_n + 1;
      v_email := v_emails[1+(v_n % array_length(v_emails,1))];
      SELECT id INTO v_tid FROM users WHERE email=v_email;
      v_uid := v_tid;
      IF v_date < CURRENT_DATE THEN v_status := CASE WHEN v_n%15=0 THEN 'cancelled' ELSE 'confirmed' END;
      ELSIF v_i > 18 THEN v_status := 'waitlist';
      ELSIF v_n%12=0 THEN v_status := 'cancelled';
      ELSE v_status := 'confirmed'; END IF;
      INSERT INTO appointments (id,user_id,transporter_id,date,slot,driver_name,driver_phone,truck_plate,company_name,load_type,tonnage,order_number,notes,status)
      VALUES (
        'RDV-T'||LPAD(v_n::TEXT,4,'0')||'-'||UPPER(SUBSTRING(gen_random_uuid()::TEXT,1,4)),
        v_uid,v_tid,v_date,v_slots[1+((v_i-1) % array_length(v_slots,1))],
        v_drivers[1+(v_n % array_length(v_drivers,1))],
        v_phones[1+(v_n % array_length(v_phones,1))],
        v_plates[1+(v_n % array_length(v_plates,1))],
        (SELECT company FROM users WHERE id=v_tid),
        v_loads[1+(v_n % array_length(v_loads,1))],
        (24+(v_n%15))::NUMERIC,
        'BC-T-'||LPAD(v_n::TEXT,5,'0'),
        CASE WHEN v_n%7=0 THEN 'Chargement urgent' WHEN v_n%11=0 THEN 'Camion frigorifique' ELSE '' END,
        v_status
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- INCIDENTS DE TEST
-- ═══════════════════════════════════════════
-- garcia : 2 non-venues = 4pts (DANGER)
INSERT INTO incidents (appointment_id,user_id,type,late_minutes,penalty,note,created_by)
SELECT a.id,a.transporter_id,'no_show',0,2,'Transporteur absent sans prévenir',adm.id
FROM appointments a,users adm WHERE a.date<CURRENT_DATE AND a.status='confirmed'
AND adm.email='admin@sojalim.fr' AND a.transporter_id=(SELECT id FROM users WHERE email='garcia@test.fr') LIMIT 2;

-- torres : 3 non-venues = 6pts (DANGER)
INSERT INTO incidents (appointment_id,user_id,type,late_minutes,penalty,note,created_by)
SELECT a.id,a.transporter_id,'no_show',0,2,'Non-présentation répétée',adm.id
FROM appointments a,users adm WHERE a.date<CURRENT_DATE AND a.status='confirmed'
AND adm.email='admin@sojalim.fr' AND a.transporter_id=(SELECT id FROM users WHERE email='torres@test.fr') LIMIT 3;

-- dupont : 3 retards = 1.5pts (WARNING)
INSERT INTO incidents (appointment_id,user_id,type,late_minutes,penalty,note,created_by)
SELECT a.id,a.transporter_id,'late',40,0.5,'Retard de 40 minutes',adm.id
FROM appointments a,users adm WHERE a.date<CURRENT_DATE AND a.status='confirmed'
AND adm.email='admin@sojalim.fr' AND a.transporter_id=(SELECT id FROM users WHERE email='dupont@test.fr') LIMIT 3;

-- leblanc : 2 chargements incomplets = 1pt (WARNING)
INSERT INTO incidents (appointment_id,user_id,type,late_minutes,penalty,note,created_by)
SELECT a.id,a.transporter_id,'partial_load',0,0.5,'Chargement incomplet — moins de 20T',adm.id
FROM appointments a,users adm WHERE a.date<CURRENT_DATE AND a.status='confirmed'
AND adm.email='admin@sojalim.fr' AND a.transporter_id=(SELECT id FROM users WHERE email='leblanc@test.fr') LIMIT 2;

-- demo : 1 retard léger = 0.5pts (OK mais visible)
INSERT INTO incidents (appointment_id,user_id,type,late_minutes,penalty,note,created_by)
SELECT a.id,a.transporter_id,'late',25,0.5,'Retard de 25 minutes',adm.id
FROM appointments a,users adm WHERE a.date<CURRENT_DATE AND a.status='confirmed'
AND adm.email='admin@sojalim.fr' AND a.transporter_id=(SELECT id FROM users WHERE email='demo@transports.fr') LIMIT 1;

SELECT 'OK ✅' as resultat;
SELECT role,email,status FROM users ORDER BY role,email;

-- ═══════════════════════════════════════════════════
-- AJOUTS : connexions + notes
-- Exécuter séparément dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Historique des connexions
CREATE TABLE IF NOT EXISTS login_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL,
  ip         TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_logs_user ON login_logs(user_id);
CREATE INDEX idx_logs_date ON login_logs(created_at);

-- Notes admin sur transporteurs
CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  pinned     BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notes_user ON notes(user_id);

-- Données de test logs
INSERT INTO login_logs (user_id, email, role, status, created_at)
SELECT id, email, role, 'success', NOW() - (random()*30)::INT * INTERVAL '1 day' - (random()*24)::INT * INTERVAL '1 hour'
FROM users WHERE status='active' AND role != 'admin'
CROSS JOIN generate_series(1,5);

INSERT INTO login_logs (user_id, email, role, status, created_at)
SELECT id, email, role, 'failed', NOW() - (random()*10)::INT * INTERVAL '1 day'
FROM users WHERE email='garcia@test.fr'
CROSS JOIN generate_series(1,2);
