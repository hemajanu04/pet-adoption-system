// ================================
// AUTH FUNCTIONS
// ================================

// Check if user is logged in
function getCurrentUser() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    return JSON.parse(user);
  }
  return null;
}

// Update navbar
function updateNavbar() {
  const user = getCurrentUser();
  const loginLink = document.querySelector('.nav-link[href="/static/login.html"]');
  const registerBtn = document.querySelector('.nav-link.btn-success[href="/static/register.html"]');

  if (user && loginLink && registerBtn) {
    loginLink.textContent = `Welcome, ${user.full_name || user.email.split('@')[0]}`;
    loginLink.href = "#";
    loginLink.classList.add('fw-bold');
    registerBtn.style.display = 'none';

    const nav = document.querySelector('#navbarNav ul');
    const logoutLi = document.createElement('li');
    logoutLi.className = 'nav-item';
    logoutLi.innerHTML = '<a class="nav-link text-danger fw-bold" href="#" id="logoutBtn">Logout</a>';
    nav.appendChild(logoutLi);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.reload();
    });
  }
}

// ================================
// LOAD ALL PETS (INDEX PAGE)
// ================================
async function loadFeaturedPets() {
  const container = document.getElementById('pets-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center">Loading pets...</div>';

  try {
    const response = await fetch('/api/pets');
    const data = await response.json();

    if (!data.pets || data.pets.length === 0) {
      container.innerHTML = '<div class="alert alert-warning">No pets available.</div>';
      return;
    }

    container.innerHTML = '';

    data.pets.forEach(pet => {
      const petCard = `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow">
            <img src="${pet.image_url}" 
              class="card-img-top img-fluid" 
              style="height:250px; width:100%; object-fit:cover; background-color:#f8f9fa;">

            <div class="card-body">
              <h5 class="card-title">${pet.name}</h5>
              <p class="card-text">
                <strong>Species:</strong> ${pet.species}<br>
                <strong>Breed:</strong> ${pet.breed}<br>
                <strong>Age:</strong> ${pet.age} years
              </p>
              <a href="/static/pet-detail.html?id=${pet.id}" class="btn btn-success w-100">
                View Details
              </a>
            </div>
          </div>
        </div>
      `;
      container.innerHTML += petCard;
    });

  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger">Error loading pets.</div>';
    console.error(error);
  }
}

// ================================
// LOAD SINGLE PET DETAIL
// ================================
async function loadPetDetail() {
  const detailContainer = document.getElementById('pet-detail');
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const petId = params.get('id');

  if (!petId) {
    detailContainer.innerHTML = '<div class="alert alert-danger">No pet selected.</div>';
    return;
  }

  try {
    const response = await fetch(`/api/pets/${petId}`);
    const data = await response.json();

    if (!data.pet) {
      detailContainer.innerHTML = '<div class="alert alert-warning">Pet not found.</div>';
      return;
    }

    const pet = data.pet;

    detailContainer.innerHTML = `
      <div class="card shadow">
        <img src="${pet.image_url}" 
          class="card-img-top img-fluid" 
          style="max-height:400px; width:100%; object-fit:contain; background-color:#f8f9fa;">

        <div class="card-body">
          <h2>${pet.name}</h2>
          <p><strong>Species:</strong> ${pet.species}</p>
          <p><strong>Breed:</strong> ${pet.breed}</p>
          <p><strong>Age:</strong> ${pet.age} years</p>
          <p><strong>Description:</strong> ${pet.description}</p>

          <a href="/static/adopt.html?pet_id=${pet.id}" class="btn btn-success mt-3 w-100">
  Adopt Now
</a>

        </div>
      </div>
    `;

  } catch (error) {
    detailContainer.innerHTML = '<div class="alert alert-danger">Error loading pet details.</div>';
    console.error(error);
  }
}

// ================================
// ADOPT PET
// ================================
async function adoptPet(petId) {

  const user = getCurrentUser();

  if (!user) {
    alert("Please login first!");
    window.location.href = "/static/login.html";
    return;
  }

  const message = prompt("Why do you want to adopt this pet?");
  if (!message) return;

  try {
    const response = await fetch("/api/adopt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: user.id,
        pet_id: petId,
        message: message
      })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Error");

    alert("Adoption request submitted successfully!");
    console.log(data);

  } catch (error) {
    alert("Error submitting adoption request.");
    console.error(error);
  }
}

// ================================
// LOGIN
// ================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    messageDiv.innerHTML = 'Logging in...';

    try {
      const response = await fetch(
        'https://gnxotcrrwdiswqbokeyr.supabase.co/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: {
            'apikey': 'sb_publishable_fr96JXERwrwOA_Or8ZhL5w_pM9uNVOC',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description);

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name
      }));

      messageDiv.innerHTML = 'Login successful!';
      setTimeout(() => location.href = '/static/index.html', 1500);

    } catch (err) {
      messageDiv.innerHTML = err.message;
    }
  });
}

// ================================
// PAGE LOAD
// ================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  const isDetailPage = document.getElementById('pet-detail') !== null;
  if (isDetailPage) {
    loadPetDetail();
  } else {
    loadFeaturedPets();
  }
});

// ===============================
// ADOPTION FORM SUBMIT
// ===============================
const adoptionForm = document.getElementById("adoptionForm");

if (adoptionForm) {
    adoptionForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const urlParams = new URLSearchParams(window.location.search);
        const pet_id = urlParams.get("pet_id");

        const full_name = document.getElementById("fullName").value;
        const phone = document.getElementById("phone").value;
        const address = document.getElementById("address").value;
        const message = document.getElementById("message").value;

        const user_id = "156859f0-17d5-4e87-bcf1-e1de7f089e3e";


        try {
            const response = await fetch("http://127.0.0.1:5000/api/adopt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: user_id,
                    pet_id: pet_id,
                    full_name: full_name,
                    phone: phone,
                    address: address,
                    message: message
                })
            });

            const data = await response.json();

            document.getElementById("formMessage").innerHTML =
                `<div class="alert alert-success">${data.message}</div>`;

        } catch (error) {
            console.error("Error:", error);
            document.getElementById("formMessage").innerHTML =
                `<div class="alert alert-danger">Something went wrong.</div>`;
        }
    });
}
