-- =========================================================================
-- ScamRadar India - Supabase Schema Migration
-- Run this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.areas (
	pincode VARCHAR(10) NOT NULL PRIMARY KEY, 
	locality VARCHAR(100) NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	lat FLOAT NOT NULL, 
	lng FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.challenges (
	challenge_id VARCHAR(64) NOT NULL PRIMARY KEY, 
	identifier_type VARCHAR(32) NOT NULL, 
	identifier_value VARCHAR(255) NOT NULL, 
	claimant_name VARCHAR(200) NOT NULL, 
	contact_email VARCHAR(200) NOT NULL, 
	proof_note TEXT NOT NULL, 
	status VARCHAR(32), 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.identifier_summary (
	identifier_type VARCHAR(32) NOT NULL, 
	identifier_value VARCHAR(255) NOT NULL, 
	report_count INTEGER DEFAULT 0, 
	distinct_reporters INTEGER DEFAULT 0, 
	effective_score FLOAT DEFAULT 0.0, 
	first_seen TIMESTAMP WITHOUT TIME ZONE, 
	last_seen TIMESTAMP WITHOUT TIME ZONE, 
	top_scam_type VARCHAR(64), 
	challenged BOOLEAN DEFAULT FALSE, 
	verdict VARCHAR(32), 
	PRIMARY KEY (identifier_type, identifier_value)
);

CREATE TABLE IF NOT EXISTS public.license_state (
	id INTEGER NOT NULL PRIMARY KEY, 
	license_json TEXT NOT NULL, 
	licensee VARCHAR(200) NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	last_seen_time TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	signature VARCHAR(255) NOT NULL, 
	status VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS public.reporters (
	reporter_hash VARCHAR(64) NOT NULL PRIMARY KEY, 
	first_seen TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	confirmed_count INTEGER DEFAULT 0, 
	disproved_count INTEGER DEFAULT 0, 
	last_reported_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reports (
	report_id VARCHAR(64) NOT NULL PRIMARY KEY, 
	case_id VARCHAR(32) NOT NULL, 
	occurred_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	reported_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	reporter_hash VARCHAR(64) NOT NULL, 
	ip_hash VARCHAR(64) NOT NULL, 
	channel VARCHAR(32) NOT NULL, 
	scam_type VARCHAR(64) NOT NULL, 
	identifier_type VARCHAR(32) NOT NULL, 
	identifier_value VARCHAR(255) NOT NULL, 
	pincode VARCHAR(10) NOT NULL, 
	locality VARCHAR(100), 
	city VARCHAR(100), 
	note_scrubbed TEXT, 
	note_fingerprint VARCHAR(128), 
	has_screenshot BOOLEAN DEFAULT FALSE, 
	amount_lost_inr FLOAT DEFAULT 0.0, 
	weight FLOAT DEFAULT 1.0, 
	person_group VARCHAR(64), 
	ignored BOOLEAN DEFAULT FALSE, 
	merged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.verified_identifiers (
	identifier_type VARCHAR(32) NOT NULL, 
	identifier_value VARCHAR(255) NOT NULL, 
	owner VARCHAR(200) NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	PRIMARY KEY (identifier_type, identifier_value)
);

-- Initial seed data for areas
INSERT INTO public.areas (pincode, locality, city, lat, lng) VALUES
('560102', 'HSR Layout', 'Bengaluru', 12.9116, 77.6389),
('560038', 'Indiranagar', 'Bengaluru', 12.9784, 77.6408),
('560034', 'Koramangala', 'Bengaluru', 12.9352, 77.6245),
('560066', 'Whitefield', 'Bengaluru', 12.9698, 77.7500),
('560076', 'BTM Layout', 'Bengaluru', 12.9166, 77.6101),
('560011', 'Jayanagar', 'Bengaluru', 12.9308, 77.5838),
('560037', 'Marathahalli', 'Bengaluru', 12.9591, 77.6974),
('560103', 'Bellandur', 'Bengaluru', 12.9260, 77.6762),
('560100', 'Electronic City', 'Bengaluru', 12.8458, 77.6658),
('560078', 'JP Nagar', 'Bengaluru', 12.9063, 77.5857),
('400050', 'Bandra West', 'Mumbai', 19.0596, 72.8295),
('110001', 'Connaught Place', 'New Delhi', 28.6315, 77.2167),
('500081', 'Madhapur', 'Hyderabad', 17.4483, 78.3915),
('600020', 'Adyar', 'Chennai', 13.0012, 80.2565)
ON CONFLICT (pincode) DO NOTHING;

-- Initial verified legitimate identifiers
INSERT INTO public.verified_identifiers (identifier_type, identifier_value, owner, category) VALUES
('phone', '1930', 'National Cyber Crime Reporting Portal', 'Emergency'),
('phone', '1800111109', 'State Bank of India Official Helpline', 'Banking'),
('upi', 'pmcares@sbi', 'PM CARES Official Fund', 'Government'),
('url', 'cybercrime.gov.in', 'Ministry of Home Affairs, India', 'Government')
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

