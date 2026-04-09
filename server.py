import os
import bcrypt
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from pymongo import MongoClient
import certifi

# ── Load ENV ─────────────────────────────
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

# ── Flask Setup ─────────────────────────
app = Flask(__name__)
app.secret_key = "secretkey123"  # required for session

# ── MongoDB Setup ───────────────────────
client = MongoClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())
db = client["tableturnover"]
users_collection = db["users"]

print("✅ Connected to MongoDB")


# ── Helper ──────────────────────────────
def is_logged_in():
    return "user" in session


# ── Routes ──────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/app")
def main_app():
    if not is_logged_in():
        return redirect(url_for("login"))
    return render_template("app.html")


# ❗ FIXED: Removed auto redirect
@app.route("/loginpage.html")
def login():
    return render_template("LoginPage.html")


@app.route("/createuser_page.html")
def create_user():
    return render_template("createNewUser.html")


# ── Register ────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    firstName = data.get("firstName")
    lastName = data.get("lastName")
    email = data.get("email")
    password = data.get("password")

    if not firstName or not email or not password:
        return jsonify({"success": False, "error": "Missing fields"})

    existing = users_collection.find_one({"email": email})
    if existing:
        return jsonify({"success": False, "error": "User already exists"})

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    users_collection.insert_one({
        "firstName": firstName,
        "lastName": lastName,
        "email": email,
        "password": hashed
    })

    session["user"] = {"email": email, "firstName": firstName}

    return jsonify({"success": True})


# ── Login ───────────────────────────────
@app.route("/login", methods=["POST"])
def login_user():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"success": False, "error": "User not found"})

    if bcrypt.checkpw(password.encode(), user["password"]):
        session["user"] = {
            "email": email,
            "firstName": user["firstName"]
        }
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Wrong password"})


# ── Logout ──────────────────────────────
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── Run Server ──────────────────────────
if __name__ == "__main__":
    print("🚀 Server running at http://127.0.0.1:8000")
    app.run(debug=True)
