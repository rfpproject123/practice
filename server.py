import os
import json
import ssl
import certifi
import urllib.request
import base64
import bcrypt
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from pymongo import MongoClient

# ── Load ENV ─────────────────────────────
load_dotenv()
MONGO_URI    = os.getenv("MONGO_URI")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# ── Flask Setup ─────────────────────────
app = Flask(__name__)
app.secret_key = "secretkey123"

# ── MongoDB Setup ───────────────────────
client = MongoClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())
db = client["tableturnover"]
users_collection = db["users"]
print("✅ Connected to MongoDB")

# ── GitHub Config ────────────────────────
OWNER     = "rfpproject123"
REPO      = "practice"
FILE_PATH = "table.csv"
LOCAL_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "table.csv")
ssl_ctx   = ssl.create_default_context(cafile=certifi.where())


# ── Helper ──────────────────────────────
def is_logged_in():
    return "user" in session


# ── Page Routes ─────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/app")
def main_app():
    if not is_logged_in():
        return redirect(url_for("login"))
    return render_template("app.html")

@app.route("/loginpage.html")
def login():
    return render_template("LoginPage.html")

@app.route("/createuser_page.html")
def create_user():
    return render_template("createNewUser.html")


# ── Register ────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    data      = request.get_json()
    firstName = data.get("firstName")
    lastName  = data.get("lastName")
    email     = data.get("email")
    password  = data.get("password")

    if not firstName or not email or not password:
        return jsonify({"success": False, "error": "Missing fields"})

    if users_collection.find_one({"email": email}):
        return jsonify({"success": False, "error": "User already exists"})

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    users_collection.insert_one({
        "firstName": firstName,
        "lastName":  lastName,
        "email":     email,
        "password":  hashed
    })

    session["user"] = {"email": email, "firstName": firstName}
    return jsonify({"success": True})


# ── Login ───────────────────────────────
@app.route("/login", methods=["POST"])
def login_user():
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"success": False, "error": "User not found"})

    if bcrypt.checkpw(password.encode(), user["password"]):
        session["user"] = {"email": email, "firstName": user["firstName"]}
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Wrong password"})


# ── Logout ──────────────────────────────
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── Save Tables ──────────────────────────
@app.route("/save-tables", methods=["POST"])
def save_tables():
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        table_data   = data.get("tableData", [])
        total_tables = int(data.get("totalTables", 0))
        total_seats  = int(data.get("totalSeats", 0))

        # Build CSV
        rows = [["Table Number", "Seats"]]
        for item in table_data:
            rows.append([f"Table {item['table']}", item["seats"]])
        rows.append([])
        rows.append(["Total Tables", total_tables])
        rows.append(["Total Seats",  total_seats])

        csv_content = "\n".join(",".join(str(c) for c in row) for row in rows) + "\n"

        # Write locally
        with open(LOCAL_CSV, "w", newline="") as f:
            f.write(csv_content)
        print("✅ table.csv written locally")

        # Push to GitHub
        github_result = push_to_github(csv_content)

        return jsonify({"success": True, "local": "saved", "github": github_result})

    except Exception as e:
        print(f"❌ Error in /save-tables: {e}")
        return jsonify({"error": str(e)}), 500


# ── GitHub Push ──────────────────────────
def push_to_github(csv_content: str):
    if not GITHUB_TOKEN:
        return "skipped (no GITHUB_TOKEN)"

    api_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept":        "application/vnd.github+json",
        "Content-Type":  "application/json"
    }

    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_ctx) as res:
            sha = json.loads(res.read().decode())["sha"]
    except Exception as e:
        print(f"❌ SHA error: {e}")
        return f"error getting sha: {e}"

    encoded = base64.b64encode(csv_content.encode()).decode()
    payload = json.dumps({
        "message": "Update table.csv via Table Turnover app",
        "content": encoded,
        "sha":     sha
    }).encode()

    try:
        req = urllib.request.Request(api_url, data=payload, headers=headers, method="PUT")
        with urllib.request.urlopen(req, context=ssl_ctx) as res:
            new_sha = json.loads(res.read().decode())["content"]["sha"][:7]
        print(f"✅ GitHub updated (sha: {new_sha})")
        return f"pushed (sha: {new_sha})"
    except Exception as e:
        print(f"❌ Push error: {e}")
        return f"error pushing: {e}"


# ── Run ──────────────────────────────────
if __name__ == "__main__":
    print("🚀 Server running at http://tableturnover.local:8000")
    app.run(debug=True, host="0.0.0.0", port=8000)
