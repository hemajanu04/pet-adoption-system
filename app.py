from flask import Flask, jsonify, request, g
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import jwt  # we'll use PyJWT for manual verification
from functools import wraps

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app, resources={r"/api/*": {"origins": "*"}})  # temporary * - restrict later

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")  # legacy service_role JWT or sb_secret

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# Supabase JWT secret (same as service_role key - used to verify user tokens)
JWT_SECRET = SUPABASE_SECRET_KEY  # Supabase signs user JWTs with this

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]

        try:
            # Verify token (Supabase uses HS256)
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_exp": True, "verify_signature": True}
            )

            user_id = payload.get("sub")
            if not user_id:
                return jsonify({"error": "Invalid token - no user ID"}), 401

            # Fetch role from profiles table (secure way)
            profile = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
            if not profile.data:
                return jsonify({"error": "User profile not found"}), 403

            role = profile.data["role"]

            # Attach to Flask g (global per request)
            g.user_id = user_id
            g.role = role

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": f"Auth error: {str(e)}"}), 500

        return f(*args, **kwargs)

    return decorated

# ────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────

@app.route('/')
def home():
    return jsonify({
        "message": "Pet Adoption Backend is running! 🐶🐱",
        "status": "connected"
    })

@app.route('/api/health')
def health():
    try:
        # Option A: Get count + no rows (most efficient)
        # select any column (e.g. 'id'), limit(0) prevents row data, count='exact' gives the total
        result = (
            supabase.table("profiles")
            .select("id", count="exact")
            .limit(0)
            .execute()
        )

        profiles_count = result.count if hasattr(result, "count") else 0

        return jsonify({
            "status": "healthy",
            "database_connected": True,
            "profiles_count": profiles_count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
# Protected test route - requires valid user token
@app.route('/api/protected')
@require_auth
def protected():
    return jsonify({
        "message": "You are authenticated!",
        "user_id": g.user_id,
        "role": g.role
    })

@app.route('/api/pets', methods=['GET'])
def get_pets():
    try:
        query = supabase.table("pets") \
            .select("*") \
            .eq("is_active", True) \
            .eq("status", "available")

        # Optional filters (add later from frontend query params)
        species = request.args.get('species')
        if species:
            query = query.eq("species", species)

        # Pagination
        limit = request.args.get('limit', default=12, type=int)
        page = request.args.get('page', default=1, type=int)
        offset = (page - 1) * limit

        result = query.range(offset, offset + limit - 1).execute()

        return jsonify({
            "pets": result.data or [],
            "count": result.count if hasattr(result, 'count') else len(result.data or []),
            "page": page,
            "limit": limit
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
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
            return jsonify({"error": "Pet not found or not available"}), 404

        return jsonify({
            "pet": result.data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500 @app.route('/api/pets/<pet_id>', methods=['GET'])


if __name__ == '__main__':
    app.run(debug=True, port=5000)