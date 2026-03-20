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


# ─────────────────────────────
# GET ALL PETS
# ─────────────────────────────
@app.route('/api/pets', methods=['GET'])
def get_pets():
    try:
        # ✅ FIX: Removed species(name) and breeds(name) FK joins
        # because pets are added with plain-text species/breed fields.
        # Using * which returns all columns including species and breed as plain text.
        query = supabase.table("pets") \
            .select("""
                *,
                shelters(id, name, address, phone, logo_url)
            """, count="exact") \
            .eq("is_active", True) \
            .eq("status", "available")

        # ✅ FIX: Default limit raised to 1000 so all pets are visible.
        # Frontend can still pass ?limit=X&page=Y for pagination if needed.
        limit = request.args.get('limit', default=1000, type=int)
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
            .select("""
                *,
                shelters(id, name, address, phone, email, logo_url, description)
            """) \
            .eq("id", pet_id) \
            .eq("is_active", True) \
            .single() \
            .execute()

        if not result.data:
            return jsonify({"error": "Pet not found"}), 404

        return jsonify({"pet": result.data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# ADD PET
# ─────────────────────────────
@app.route('/api/pets', methods=['POST'])
def add_pet():
    try:
        data = request.get_json()

        # ✅ FIX: Explicitly build insert payload so is_active is always True
        # and status is always 'available', ensuring new pets show on the screen.
        insert_data = {
            "name":        data.get("name"),
            "age":         data.get("age"),
            "gender":      data.get("gender"),
            "image_url":   data.get("image_url"),
            "description": data.get("description"),
            "status":      "available",
            "is_active":   True,
        }

        # Include species and breed as plain text if provided
        if data.get("species"):
            insert_data["species"] = data.get("species")
        if data.get("breed"):
            insert_data["breed"] = data.get("breed")

        result = supabase.table("pets").insert(insert_data).execute()
        return jsonify({"message": "Pet added", "id": result.data[0]['id']}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# DELETE PET
# ─────────────────────────────
@app.route('/api/pets/<pet_id>', methods=['DELETE'])
def delete_pet(pet_id):
    try:
        # Check pet exists first
        check = supabase.table("pets") \
            .select("id") \
            .eq("id", pet_id) \
            .execute()

        if not check.data:
            return jsonify({"error": "Pet not found"}), 404

        # FIX: Use hard delete with service role key (SUPABASE_SECRET_KEY).
        # Soft update(.update) was silently blocked by Supabase RLS policies —
        # the card disappeared on screen but the DB record was never changed,
        # causing the pet to reappear on refresh. Hard delete with the service
        # role key bypasses RLS entirely and permanently removes the record.
        supabase.table("pets") \
            .delete() \
            .eq("id", pet_id) \
            .execute()

        return jsonify({"message": "Pet deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET ALL SHELTERS
# ─────────────────────────────
@app.route('/api/shelters', methods=['GET'])
def get_shelters():
    try:
        result = supabase.table("shelters") \
            .select("*") \
            .order("name") \
            .execute()

        return jsonify({
            "shelters": result.data or []
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET SINGLE SHELTER + ITS PETS
# ─────────────────────────────
@app.route('/api/shelters/<shelter_id>', methods=['GET'])
def get_shelter_detail(shelter_id):
    try:
        shelter_result = supabase.table("shelters") \
            .select("*") \
            .eq("id", shelter_id) \
            .single() \
            .execute()

        if not shelter_result.data:
            return jsonify({"error": "Shelter not found"}), 404

        pets_result = supabase.table("pets") \
            .select("*") \
            .eq("shelter_id", shelter_id) \
            .eq("is_active", True) \
            .eq("status", "available") \
            .execute()

        return jsonify({
            "shelter": shelter_result.data,
            "pets": pets_result.data or []
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# CREATE ADOPTION REQUEST
# ─────────────────────────────
@app.route("/api/adopt", methods=["POST"])
def create_adoption_request():
    try:
        data = request.get_json()

        response = supabase.table("adoption_requests").insert({
            "user_id":   data.get("user_id"),
            "pet_id":    data.get("pet_id"),
            "full_name": data.get("full_name"),
            "phone":     data.get("phone"),
            "address":   data.get("address"),
            "message":   data.get("message"),
            "status":    "pending"
        }).execute()

        return jsonify({"message": "Adoption request submitted successfully"}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@app.route('/api/adoption-requests', methods=['GET'])
def get_adoption_requests():
    try:
        result = supabase.table("adoption_requests") \
            .select("*, pets(name), profiles(role)") \
            .execute()
        return jsonify(result.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/species', methods=['GET'])
def get_species():
    response = supabase.table("species").select("*").execute()
    return jsonify(response.data)


# ─────────────────────────────
# CREATE DONATION
# ─────────────────────────────
@app.route('/api/donations', methods=['POST'])
def create_donation():
    try:
        data = request.get_json()

        result = supabase.table("donations").insert({
            "donor_id":       data.get("donor_id"),
            "shelter_id":     data.get("shelter_id"),
            "pet_id":         data.get("pet_id"),
            "amount":         data.get("amount"),
            "currency":       data.get("currency", "INR"),
            "payment_method": data.get("payment_method", "upi"),
            "status":         "completed",
            "donated_at":     "now()"
        }).execute()

        return jsonify({"message": "Donation recorded successfully!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET RECENT DONATIONS
# ─────────────────────────────
@app.route('/api/donations/recent', methods=['GET'])
def get_recent_donations():
    try:
        result = supabase.table("donations") \
            .select("amount, currency, donated_at, shelter_id, donor_id, shelters(name), profiles(full_name)") \
            .eq("status", "completed") \
            .order("donated_at", desc=True) \
            .limit(10) \
            .execute()

        # FIX: Extract donor name from joined profiles table.
        # Previously only selected shelters(name) — profiles were never joined,
        # so donor_name was always None and displayed as "Anonymous".
        donations = []
        for d in (result.data or []):
            profile = d.get("profiles") or {}
            donations.append({
                "amount":     d.get("amount"),
                "currency":   d.get("currency"),
                "donated_at": d.get("donated_at"),
                "shelter_id": d.get("shelter_id"),
                "shelters":   d.get("shelters"),
                "donor_name": profile.get("full_name") or "Anonymous",
            })

        return jsonify({"donations": donations})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# DONATION STATS (total donors + total raised)
# ─────────────────────────────
@app.route('/api/donations/stats', methods=['GET'])
def get_donation_stats():
    try:
        result = supabase.table("donations") \
            .select("amount", count="exact") \
            .eq("status", "completed") \
            .execute()

        total_raised = sum(float(d.get("amount", 0)) for d in (result.data or []))
        total_donors = result.count or 0

        return jsonify({
            "total_donors": total_donors,
            "total_raised": total_raised
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET USER'S ADOPTION APPLICATIONS
# ─────────────────────────────
@app.route('/api/my-adoptions/<user_id>', methods=['GET'])
def get_my_adoptions(user_id):
    try:
        result = supabase.table("adoption_requests") \
            .select("*, pets(name, breed, image_url)") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        return jsonify({"applications": result.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# SEND MESSAGE
# ─────────────────────────────
@app.route('/api/messages', methods=['POST'])
def send_message():
    try:
        data = request.get_json()
        result = supabase.table("messages").insert({
            "sender_id":   data.get("sender_id"),
            "receiver_id": data.get("receiver_id"),
            "content":     data.get("content"),
            "is_read":     False,
            "sent_at":     "now()"
        }).execute()
        return jsonify({"message": "Message sent!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET MESSAGES BETWEEN USER & SHELTER
# ─────────────────────────────
@app.route('/api/messages/<user_id>/<shelter_id>', methods=['GET'])
def get_messages(user_id, shelter_id):
    try:
        result = supabase.table("messages") \
            .select("*") \
            .or_(
                f"and(sender_id.eq.{user_id},receiver_id.eq.{shelter_id}),"
                f"and(sender_id.eq.{shelter_id},receiver_id.eq.{user_id})"
            ) \
            .order("sent_at") \
            .execute()
        return jsonify({"messages": result.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# GET USER FAVORITES
# ─────────────────────────────
@app.route('/api/favorites/<user_id>', methods=['GET'])
def get_favorites(user_id):
    try:
        result = supabase.table("favorites") \
            .select("id, pet_id, pets(id, name, breed, age, image_url)") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        return jsonify({"favorites": result.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# ADD FAVORITE
# ─────────────────────────────
@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    try:
        data = request.get_json()
        result = supabase.table("favorites").insert({
            "user_id": data.get("user_id"),
            "pet_id":  data.get("pet_id")
        }).execute()
        return jsonify({"message": "Added to favorites!", "id": result.data[0]['id']}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# REMOVE FAVORITE
# ─────────────────────────────
@app.route('/api/favorites/<favorite_id>', methods=['DELETE'])
def remove_favorite(favorite_id):
    try:
        supabase.table("favorites") \
            .delete() \
            .eq("id", favorite_id) \
            .execute()
        return jsonify({"message": "Removed from favorites!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────
# CHECK IF PET IS FAVORITED
# ─────────────────────────────
@app.route('/api/favorites/check/<user_id>/<pet_id>', methods=['GET'])
def check_favorite(user_id, pet_id):
    try:
        result = supabase.table("favorites") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("pet_id", pet_id) \
            .execute()
        if result.data:
            return jsonify({"favorited": True, "favorite_id": result.data[0]['id']})
        return jsonify({"favorited": False})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)