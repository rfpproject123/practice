"""
server.py
Flask backend for Table Turnover System.
- Serves the app
- POST /save-tables  →  writes table.csv locally + pushes to GitHub

Usage:
    python3 server.py
"""

import os
import csv
import json
import ssl
import certifi
import urllib.request
import urllib.parse
import base64
from flask import Flask, request, jsonify, send_from_directory, render_template

# ── CONFIG ────────────────────────────────────────────────
GITHUB_TOKEN = "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"
OWNER        = "rfpproject123"
REPO         = "practice"
FILE_PATH    = "table.csv"
LOCAL_CSV    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "table.csv")
# ─────────────────────────────────────────────────────────

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

ssl_ctx = ssl.create_default_context(cafile=certifi.where())


# ── Routes ────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/app")
def main_app():
    return render_template("app.html")

@app.route("/loginpage.html")
def login():
    return render_template("LoginPage.html")

@app.route("/createuser_page.html")
def create_user():
    return render_template("createNewUser.html")


# ── Save Tables API ───────────────────────────────────────

@app.route("/save-tables", methods=["POST"])
def save_tables():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        table_data   = data.get("tableData", [])
        total_tables = int(data.get("totalTables", 0))
        total_seats  = int(data.get("totalSeats", 0))

        # Build CSV content
        rows = [["Table Number", "Seats"]]
        for item in table_data:
            rows.append([f"Table {item['table']}", item["seats"]])
        rows.append([])
        rows.append(["Total Tables", total_tables])
        rows.append(["Total Seats",  total_seats])

        csv_lines = []
        for row in rows:
            csv_lines.append(",".join(str(c) for c in row))
        csv_content = "\n".join(csv_lines) + "\n"

        # 1️⃣ Write locally
        with open(LOCAL_CSV, "w", newline="") as f:
            f.write(csv_content)
        print(f"✅ table.csv written locally")

        # 2️⃣ Push to GitHub
        github_result = push_to_github(csv_content)

        return jsonify({
            "success": True,
            "local": "saved",
            "github": github_result
        })

    except Exception as e:
        print(f"❌ Error in /save-tables: {e}")
        return jsonify({"error": str(e)}), 500


def push_to_github(csv_content: str):
    if not GITHUB_TOKEN:
        return "skipped (no GITHUB_TOKEN)"

    api_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept":        "application/vnd.github+json",
        "Content-Type":  "application/json"
    }

    # Get current SHA (needed for update)
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_ctx) as res:
            current = json.loads(res.read().decode())
        sha = current["sha"]
    except Exception as e:
        print(f"❌ SHA error: {e}")
        return f"error getting sha: {e}"

    # Push updated content
    encoded = base64.b64encode(csv_content.encode()).decode()
    payload = json.dumps({
        "message": "Update table.csv via Table Turnover app",
        "content": encoded,
        "sha":     sha
    }).encode()

    try:
        req = urllib.request.Request(api_url, data=payload, headers=headers, method="PUT")
        with urllib.request.urlopen(req, context=ssl_ctx) as res:
            result = json.loads(res.read().decode())
        new_sha = result["content"]["sha"][:7]
        print(f"✅ GitHub updated (sha: {new_sha})")
        return f"pushed (sha: {new_sha})"
    except Exception as e:
        print(f"❌ Push error: {e}")
        return f"error pushing: {e}"


if __name__ == "__main__":
    print("🚀 Server running at http://127.0.0.1:8000")
    app.run(debug=False, host="0.0.0.0", port=8000)
