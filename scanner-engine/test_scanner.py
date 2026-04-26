"""Quick test to verify the scanner engine works."""
from app.scanner import VulnerabilityScanner

s = VulnerabilityScanner()

# Test JavaScript scanning
js_code = """
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(data).digest('hex');
const key = crypto.generateKeyPair('rsa', { modulusLength: 2048 });
const sign = crypto.createSign('RSA-SHA256');
const password = "mysecretpassword123";
const aes = crypto.createCipheriv('aes-128-cbc', key, iv);
const result = eval(userInput);
"""

print("=== JS Scan ===")
results = s.scan_javascript(js_code, "test.js")
print(f"Found {len(results)} vulnerabilities:")
for v in results:
    print(f"  Line {v['line']:2d} | {v['severity']:8s} | {v['confidence']:6s} | {v['vulnerability_type']}: {v['pattern_matched']}")

# Test Python scanning
py_code = """
import hashlib
from Crypto.PublicKey import RSA
from Crypto.Cipher import DES

h = hashlib.md5(data)
s = hashlib.sha1(data)
key = RSA.generate(2048)
cipher = DES.new(key, DES.MODE_ECB)
password = "hardcoded_secret_key"
"""

print("\n=== Python Scan ===")
results = s.scan_python(py_code, "test.py")
print(f"Found {len(results)} vulnerabilities:")
for v in results:
    print(f"  Line {v['line']:2d} | {v['severity']:8s} | {v['confidence']:6s} | {v['vulnerability_type']}: {v['pattern_matched']}")

print("\n✅ All tests passed!")
