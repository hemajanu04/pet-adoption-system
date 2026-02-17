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

# Bypass RLS using service_role key
supabase.postgrest.auth(key)
print("RLS bypass activated.")


def seed_data():
    print("\n=== Starting seeding process ===")

    shelter_id = "f6af1fe6-8a57-4afb-91f5-1c57f8d1309a"
    print(f"Using shelter user UUID: {shelter_id}")

    sample_pets = [

        # 1
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

        # 2
        {
            "name": "Luna",
            "species": "Cat",
            "breed": "Persian",
            "age": 2,
            "gender": "Female",
            "description": "Calm and affectionate Persian cat who loves cuddles.",
            "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },

        # 3
        {
            "name": "Rocky",
            "species": "Dog",
            "breed": "German Shepherd",
            "age": 4,
            "gender": "Male",
            "description": "Loyal and protective German Shepherd.",
            "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },


        # 4
        {
            "name": "Simba",
            "species": "Cat",
            "breed": "Maine Coon",
            "age": 3,
            "gender": "Male",
            "description": "Majestic Maine Coon with a calm personality.",
            "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },

        # 5
        {
            "name": "Daisy",
            "species": "Rabbit",
            "breed": "Holland Lop",
            "age": 1,
            "gender": "Female",
            "description": "Cute rabbit who enjoys gentle pets and fresh veggies.",
            "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },

        # 6
        {
            "name": "Charlie",
            "species": "Dog",
            "breed": "Beagle",
            "age": 2,
            "gender": "Male",
            "description": "Curious Beagle with lots of energy.",
            "image_url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },

    

        # 7
        {
            "name": "Nala",
            "species": "Dog",
            "breed": "Indie",
            "age": 3,
            "gender": "Female",
            "description": "Friendly Indian native breed looking for a loving home.",
            "image_url": "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        },

        # 8
        {
            "name": "Oliver",
            "species": "Parrot",
            "breed": "African Grey",
            "age": 5,
            "gender": "Male",
            "description": "Intelligent parrot that enjoys interaction.",
            "image_url": "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&auto=format&fit=crop",
            "location": "Bengaluru",
            "status": "available",
            "posted_by": shelter_id,
            "is_active": True
        }
    ]

    added_count = 0
    skipped_count = 0

    for pet in sample_pets:
        try:
            existing = supabase.table("pets") \
                .select("id") \
                .eq("name", pet["name"]) \
                .eq("posted_by", pet["posted_by"]) \
                .execute()

            if existing.data:
                print(f"{pet['name']} → Already exists (skipping)")
                skipped_count += 1
            else:
                insert_result = supabase.table("pets").insert(pet).execute()
                if insert_result.data:
                    print(f"{pet['name']} → Added successfully")
                    added_count += 1
                else:
                    print(f"{pet['name']} → Insert failed:", insert_result)

        except Exception as e:
            print(f"ERROR inserting {pet['name']}: {str(e)}")

    print("\n=== Seeding Summary ===")
    print(f"Added: {added_count}")
    print(f"Skipped: {skipped_count}")


if __name__ == "__main__":
    seed_data()
