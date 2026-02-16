import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SECRET_KEY")

if not url or not key:
    print("ERROR: SUPABASE_URL or SUPABASE_SECRET_KEY missing in .env file")
    exit(1)

print("Connecting to Supabase...")
supabase: Client = create_client(url, key)
print("Connection created.")

# FIX FOR RLS INSERT ERROR: Force service_role key to bypass RLS on pets table
supabase.postgrest.auth(key)
print("RLS bypass activated using service_role key - inserts should now work.")

def seed_data():
    print("\n=== Starting seeding process ===")

    shelter_id = "f6af1fe6-8a57-4afb-91f5-1c57f8d1309a"

    print(f"Using shelter user UUID: {shelter_id}")

    # Step 1: Update shelter profile
    print("Updating shelter profile role & name...")
    try:
        profile_update = supabase.table("profiles").update({
            "role": "shelter",
            "full_name": "Happy Paws Shelter"
        }).eq("id", shelter_id).execute()

        if profile_update.data:
            print("→ Profile updated successfully")
        elif profile_update.count == 0:
            print("→ No matching profile found → you may need to create it first")
        else:
            print("→ Profile update result:", profile_update)
    except Exception as e:
        print(f"ERROR updating profile: {str(e)}")

    # Step 2: Sample pets (Charlie removed, Coco added)
    sample_pets = [
        {
            "name": "Max",
            "species": "Dog",
            "breed": "Golden Retriever",
            "age": 3,
            "gender": "Male",
            "description": "Friendly and energetic Golden Retriever looking for an active family.",
            "image_url": "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },
        {
            "name": "Luna",
            "species": "Cat",
            "breed": "Persian",
            "age": 2,
            "gender": "Female",
            "description": "Calm and affectionate Persian cat who loves laps and gentle pets.",
            "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },
        {
            "name": "Coco",
            "species": "Guinea Pig",
            "breed": "American",
            "age": 2,
            "gender": "Female",
            "description": "Sweet and sociable guinea pig who loves veggies, cuddles, and gentle pets.",
            "image_url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=80",  # Cute guinea pig
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        }
    ]

    print(f"\nFound {len(sample_pets)} pets to seed.")

    added_count = 0
    skipped_count = 0

    for pet in sample_pets:
        print(f"\nChecking pet: {pet['name']} ({pet['species']})")
        try:
            existing = supabase.table("pets") \
                .select("id") \
                .eq("name", pet["name"]) \
                .eq("posted_by", pet["posted_by"]) \
                .execute()

            if existing.data:
                print(f"→ Already exists (skipping)")
                skipped_count += 1
            else:
                insert_result = supabase.table("pets").insert(pet).execute()
                if insert_result.data:
                    print(f"→ Added successfully")
                    added_count += 1
                else:
                    print(f"→ Insert failed: {insert_result}")
        except Exception as e:
            print(f"→ ERROR inserting {pet['name']}: {str(e)}")

    print("\n=== Seeding Summary ===")
    print(f"Added: {added_count} pets")
    print(f"Skipped (already exist): {skipped_count} pets")
    print("Done! You can now check:")
    print("  • Supabase dashboard → Table Editor → pets")
    print("  • Browser: http://127.0.0.1:5000/api/pets")
    print("  • Coco detail example (after getting ID): http://127.0.0.1:5000/static/pet-detail.html?id=[Coco-ID]")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print("\nCRITICAL ERROR during seeding:")
        print(str(e))