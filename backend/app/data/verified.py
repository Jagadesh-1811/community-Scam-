from typing import Dict, Any

# Initial verified identifiers seed data (Helplines, Banks, Govt portals, Verified SMS senders)
# Matching always occurs on the normalised identifier value.
SEED_VERIFIED_IDENTIFIERS: list[Dict[str, Any]] = [
    # National Helplines
    {"identifier_type": "phone", "identifier_value": "1930", "owner": "National Cyber Crime Reporting Helpline", "category": "helpline"},
    {"identifier_type": "phone", "identifier_value": "1909", "owner": "TRAI Do Not Disturb Helpline", "category": "helpline"},
    {"identifier_type": "phone", "identifier_value": "112", "owner": "National Emergency Response Support System", "category": "helpline"},
    {"identifier_type": "phone", "identifier_value": "18001600", "owner": "SBI Customer Care", "category": "banking"},
    {"identifier_type": "phone", "identifier_value": "18602662666", "owner": "HDFC Bank PhoneBanking", "category": "banking"},
    {"identifier_type": "phone", "identifier_value": "18001080", "owner": "ICICI Bank Customer Care", "category": "banking"},
    {"identifier_type": "phone", "identifier_value": "+918041002233", "owner": "Verified Tech Support Office", "category": "business"},

    # SMS Senders (6-letter standard)
    {"identifier_type": "sender_id", "identifier_value": "HDFCBK", "owner": "HDFC Bank", "category": "banking"},
    {"identifier_type": "sender_id", "identifier_value": "SBINB", "owner": "State Bank of India", "category": "banking"},
    {"identifier_type": "sender_id", "identifier_value": "ICICIB", "owner": "ICICI Bank", "category": "banking"},
    {"identifier_type": "sender_id", "identifier_value": "AXISBK", "owner": "Axis Bank", "category": "banking"},
    {"identifier_type": "sender_id", "identifier_value": "KOTAKB", "owner": "Kotak Mahindra Bank", "category": "banking"},
    {"identifier_type": "sender_id", "identifier_value": "PAYTMB", "owner": "Paytm Payments Bank", "category": "fintech"},
    {"identifier_type": "sender_id", "identifier_value": "AIRTEL", "owner": "Bharti Airtel", "category": "telecom"},

    # UPI IDs
    {"identifier_type": "upi", "identifier_value": "pmcares@sbi", "owner": "PM CARES Fund", "category": "government"},
    {"identifier_type": "upi", "identifier_value": "bhim@upi", "owner": "BHIM Official Support", "category": "government"},

    # Verified URLs (normalised: https, no www, no trailing slash, no query)
    {"identifier_type": "url", "identifier_value": "https://cybercrime.gov.in", "owner": "National Cyber Crime Portal", "category": "government"},
    {"identifier_type": "url", "identifier_value": "https://sancharsaathi.gov.in", "owner": "DoT Sanchar Saathi", "category": "government"},
    {"identifier_type": "url", "identifier_value": "https://onlinesbi.sbi", "owner": "State Bank of India", "category": "banking"},
    {"identifier_type": "url", "identifier_value": "https://hdfcbank.com", "owner": "HDFC Bank", "category": "banking"},
    {"identifier_type": "url", "identifier_value": "https://icicibank.com", "owner": "ICICI Bank", "category": "banking"},
]

