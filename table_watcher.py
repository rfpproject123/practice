"""
table_watcher.py
Polls the GitHub repo every 5 seconds and writes the latest
table.csv content to the local file automatically.
"""

import urllib.request
import base64
import json
import time
import os

# ── CONFIG ────────────────────────────────────────────────
GITHUB_TOKEN = "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"
OWNER        = "rfpproject123"
REPO         = "practice"
FILE_PATH    = "table.csv"
LOCAL_PATH   = os.path.join(os.path.dirname(__file__), "table.csv")
POLL_SECONDS = 5
# ─────────────────────────────────────────────────────────

api_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}"
headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

last_sha = None

print(f"👀 Watching {OWNER}/{REPO}/{FILE_PATH} every {POLL_SECONDS}s ...")
print(f"   Local file: {LOCAL_PATH}\n")

while True:
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())

        sha     = data["sha"]
        content = base64.b64decode(data["content"]).decode("utf-8")

        if sha != last_sha:
            with open(LOCAL_PATH, "w", newline="") as f:
                f.write(content)
            last_sha = sha
            print(f"✅ table.csv updated locally  (sha: {sha[:7]})")
        else:
            print(f"   No change  (sha: {sha[:7]})", end="\r")

    except Exception as e:
        print(f"⚠️  Error: {e}")

    time.sleep(POLL_SECONDS)
