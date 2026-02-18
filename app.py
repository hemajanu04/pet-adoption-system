from flask import Flask, jsonify, request, g
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import jwt
from functools import wraps

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

JWT_SECRET = SUPABASE_SECRET_KEY


# ─────────────────────────────
# AUTH MIDDLEWARE
# ─────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_exp": True}
            )

            user_id = payload.get("sub")
            if not user_id:
                return jsonify({"error": "Invalid token"}), 401

            profile = supabase.table("profiles") \
                .select("role") \
                .eq("id", user_id) \
                .single() \
                .execute()

            if not profile.data:
                return jsonify({"error": "User profile not found"}), 403

            g.user_id = user_id
            g.role = profile.data["role"]

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return f(*args, **kwargs)

    return decorated


# ─────────────────────────────
# ROUTES
# ─────────────────────────────

@app.route('/')
def home():
    return jsonify({
        "message": "Pet Adoption Backend is running! 🐶🐱",
        "status": "connected"
    })


@app.route('/api/health')
def health():
    try:
        result = (
            supabase.table("profiles")
            .select("id", count="exact")
            .limit(0)
            .execute()
        )

        return jsonify({
            "status": "healthy",
            "database_connected": True,
            "profiles_count": result.count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/protected')
@require_auth
def protected():
    return jsonify({
        "message": "You are authenticated!",
        "user_id": g.user_id,
        "role": g.role
    })


# ─────────────────────────────
# GET ALL PETS
# ─────────────────────────────
@app.route('/api/pets', methods=['GET'])
def get_pets():
    try:
        query = supabase.table("pets") \
            .select("*", count="exact") \
            .eq("is_active", True) \
            .eq("status", "available")

        species = request.args.get('species')
        if species:
            query = query.eq("species", species)

        limit = request.args.get('limit', default=12, type=int)
        page = request.args.get('page', default=1, type=int)
        offset = (page - 1) * limit

        result = query.range(offset, offset + limit - 1).execute()

        return jsonify({
            "pets": result.data or [],
            "count": result.count,
            "page": page,
            "limit": limit
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET SINGLE PET
# ─────────────────────────────
@app.route('/api/pets/<pet_id>', methods=['GET'])
def get_pet_detail(pet_id):
    try:
        result = supabase.table("pets") \
            .select("*") \
            .eq("id", pet_id) \
            .eq("is_active", True) \
            .single() \
            .execute()

        if not result.data:
            return jsonify({"error": "Pet not found"}), 404

        return jsonify({
            "pet": result.data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# ==============================
# CREATE ADOPTION REQUEST
# ==============================
@app.route("/api/adopt", methods=["POST"])
def create_adoption_request():
    try:
        data = request.get_json()

        user_id = data.get("user_id")
        pet_id = data.get("pet_id")

        response = supabase.table("adoption_requests").insert({
            "user_id": user_id,
            "pet_id": pet_id,
            "full_name": data.get("full_name"),
            "phone": data.get("phone"),
            "address": data.get("address"),
            "message": data.get("message"),
            "status": "pending"
        }).execute()

        return jsonify({
            "message": "Adoption request submitted successfully"
        }), 201

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)
