#!/usr/bin/env python3
"""
ScamRadar Ed25519 Licence Generator & Signer
Generates keypairs and cryptographically signs licence files for live demos and evaluation.
"""

import argparse
import json
import os
from datetime import datetime, timezone, timedelta
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

# Default private key for local development and demonstration
DEV_PRIVATE_KEY_HEX = "945b0a316279fec96ea10c4f346b9c9f6a7d530663673c09b83e0e7a2dfb867c"

def get_or_create_key(private_hex: str = None):
    if private_hex:
        priv = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private_hex))
    else:
        priv = Ed25519PrivateKey.generate()
    pub = priv.public_key()
    pub_hex = pub.public_bytes_raw().hex()
    priv_hex = priv.private_bytes_raw().hex()
    return priv, pub, priv_hex, pub_hex

def sign_license(priv: Ed25519PrivateKey, licensee: str, expires_at: str) -> dict:
    canonical = f"{licensee}:{expires_at}".encode("utf-8")
    sig = priv.sign(canonical).hex()
    return {
        "licensee": licensee,
        "expires_at": expires_at,
        "signature": sig
    }

def main():
    parser = argparse.ArgumentParser(description="Generate and sign ScamRadar licences")
    parser.add_argument("--licensee", default="CyberForge Demo Bank", help="Name of licensee")
    parser.add_argument("--minutes", type=int, default=None, help="Licence duration in minutes")
    parser.add_argument("--generate-keypair", action="store_true", help="Generate a new Ed25519 keypair")
    parser.add_argument("--out-dir", default=".", help="Directory to save licence files")
    args = parser.parse_args()

    priv, pub, priv_hex, pub_hex = get_or_create_key(DEV_PRIVATE_KEY_HEX)

    if args.generate_keypair:
        new_priv, new_pub, new_priv_hex, new_pub_hex = get_or_create_key()
        print("Generated New Keypair:")
        print(f"Public Key (hex, place in .env): {new_pub_hex}")
        print(f"Private Key (hex, keep SECRET on laptop): {new_priv_hex}")
        return

    print("=== ScamRadar Licence System ===")
    print(f"Server Public Key: {pub_hex}")

    now = datetime.now(timezone.utc)
    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)

    if args.minutes is not None:
        exp = (now + timedelta(minutes=args.minutes)).isoformat()
        lic = sign_license(priv, args.licensee, exp)
        file_path = os.path.join(out_dir, f"license_{args.minutes}min.json")
        with open(file_path, "w") as f:
            json.dump(lic, f, indent=2)
        print(f"Generated {args.minutes}-minute licence: {file_path}")
        return

    # Generate the 3 standard demo licences:
    # 1. 5-minute licence for live expiration demo
    exp_5min = (now + timedelta(minutes=5)).isoformat()
    lic_5min = sign_license(priv, "Demo Bank (5 Min)", exp_5min)
    path_5min = os.path.join(out_dir, "license_5min.json")
    with open(path_5min, "w") as f:
        json.dump(lic_5min, f, indent=2)
    print(f"[1] 5-minute licence created: {path_5min}")

    # 2. Long licence (365 days)
    exp_long = (now + timedelta(days=365)).isoformat()
    lic_long = sign_license(priv, "Demo Bank Production", exp_long)
    path_long = os.path.join(out_dir, "license_long.json")
    with open(path_long, "w") as f:
        json.dump(lic_long, f, indent=2)
    print(f"[2] Long (1 year) licence created: {path_long}")

    # 3. Already expired licence
    exp_past = (now - timedelta(minutes=10)).isoformat()
    lic_expired = sign_license(priv, "Demo Bank (Expired)", exp_past)
    path_expired = os.path.join(out_dir, "license_expired.json")
    with open(path_expired, "w") as f:
        json.dump(lic_expired, f, indent=2)
    print(f"[3] Expired licence created: {path_expired}")

if __name__ == "__main__":
    main()

