# Vulnerable Python file for testing SecureScanner detectors

import os
import subprocess
import pickle
import yaml

# 1. Eval injection — CWE-95
user_input = input("Enter expression: ")
result = eval(user_input)

# 2. Command injection — CWE-78
command = input("Enter command: ")
os.system(command)
subprocess.run(command)

# 3. SQL injection — CWE-89
user_id = input("Enter user ID: ")
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# 4. Insecure deserialization — CWE-502
data = pickle.loads(untrusted_data)

# 5. Unsafe YAML load
config = yaml.load(raw_yaml)

# Safe YAML (should NOT be flagged)
safe_config = yaml.load(raw_yaml, Loader=yaml.SafeLoader)

# 6. Path traversal — CWE-22
filename = input("Enter filename: ")
f = open(filename)

# 7. Hardcoded secret — CWE-798
api_secret = "sk_test_9876543210abcdefghijklmn"
database_url = "postgresql://admin:password@prod-db:5432/myapp"
