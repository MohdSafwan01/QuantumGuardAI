from app.scanner import VulnerabilityScanner

s = VulnerabilityScanner()

# Test: User's exact RSA-2048 JS code
js1 = """const crypto = require('crypto');
function generateSecureKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    return { publicKey, privateKey };
}
function encryptData(publicKey, data) {
    const encryptedData = crypto.publicEncrypt(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        Buffer.from(data)
    );
    return encryptedData.toString("base64");
}"""

print("=== JS RSA-2048 ===")
r = s.scan_javascript(js1, "test.js")
print(f"Found {len(r)} vulns")
for v in r:
    print(f"  L{v['line']} | {v['severity']} | {v['vulnerability_type']}: {v['pattern_matched']}")

# Test: User's ECDH code
js2 = """const crypto = require('crypto');
function establishSecureBankingTunnel() {
    const alice = crypto.createECDH('secp256k1');
    alice.generateKeys();
    return alice.getPublicKey();
}"""

print("\n=== JS ECDH ===")
r = s.scan_javascript(js2, "test.js")
print(f"Found {len(r)} vulns")
for v in r:
    print(f"  L{v['line']} | {v['severity']} | {v['vulnerability_type']}: {v['pattern_matched']}")

# Test: User's Python RSA code
py1 = """from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

def encrypt_government_secrets(secret_data):
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    public_key = private_key.public_key()
    ciphertext = public_key.encrypt(
        secret_data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return ciphertext"""

print("\n=== PY RSA-2048 ===")
r = s.scan_python(py1, "test.py")
print(f"Found {len(r)} vulns")
for v in r:
    print(f"  L{v['line']} | {v['severity']} | {v['vulnerability_type']}: {v['pattern_matched']}")

print("\nDone")
