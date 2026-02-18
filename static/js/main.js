// ================================
 // CONFIG
 // ================================
const SUPABASE_URL = 'https://gnxotcrrwdiswqbokeyr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fr96JXERwrwOA_Or8ZhL5w_pM9uNVOC';

// ================================
 // AUTH FUNCTIONS
 // ================================

function getCurrentUser() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    return JSON.parse(user);
  }
  return null;
}

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
 // LOGIN FORM
 // ================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    messageDiv.innerHTML = '<div class="spinner-border text-success" role="status"></div> Logging in...';

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error_description || 'Login failed';
        if (msg.includes('confirmed')) msg = 'Please confirm your email first';
        if (msg.includes('invalid')) msg = 'Invalid email or password';
        throw new Error(msg);
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || email.split('@')[0]
      }));

      messageDiv.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
      setTimeout(() => location.href = '/static/index.html', 1500);
    } catch (err) {
      messageDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}

// ================================
 // REGISTER FORM
 // ================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('registerMessage');

    messageDiv.innerHTML = '<div class="spinner-border text-success" role="status"></div> Registering...';

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.msg || data.error_description || 'Registration failed';
        if (msg.includes('duplicate')) msg = 'Email already registered';
        if (msg.includes('invalid')) msg = 'Invalid email or password';
        throw new Error(msg);
      }

      messageDiv.innerHTML = '<div class="alert alert-success">Registration successful! Logging in...</div>';

      // Auto-login after register
      const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        localStorage.setItem('token', loginData.access_token);
        localStorage.setItem('user', JSON.stringify({
          id: loginData.user.id,
          email: loginData.user.email,
          full_name: fullName
        }));
        setTimeout(() => location.href = '/static/index.html', 1500);
      } else {
        messageDiv.innerHTML += '<div class="alert alert-warning mt-2">Please confirm your email to login.</div>';
      }

    } catch (err) {
      messageDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}

// ================================
// LOAD FEATURED PETS (INDEX)
// ================================
async function loadFeaturedPets() {
  const container = document.getElementById('featured-pets') || document.getElementById('pets-container');
  if (!container) {
    console.error('No container found for pets');
    return;
  }

  container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p>Loading pets...</p></div>';

  try {
    const res = await fetch('/api/pets');
    console.log('Pets API status:', res.status);
    const data = await res.json();
    console.log('Pets data:', data);

    if (!data.pets || data.pets.length === 0) {
      container.innerHTML = '<div class="alert alert-info text-center">No pets available right now.</div>';
      return;
    }

    container.innerHTML = '';

    data.pets.forEach(pet => {
      const card = `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow-sm border-0 rounded-4">
            <img src="${pet.image_url}" class="card-img-top" style="height:250px; object-fit:cover;">
            <div class="card-body p-4">
              <h5 class="card-title fw-bold">${pet.name}</h5>
              <p class="card-text">
                <strong>Species:</strong> ${pet.species}<br>
                <strong>Breed:</strong> ${pet.breed || 'N/A'}<br>
                <strong>Age:</strong> ${pet.age} years
              </p>
              <a href="/static/pet-detail.html?id=${pet.id}" class="btn btn-outline-success w-100">View Details</a>
            </div>
          </div>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error('Fetch pets error:', err);
    container.innerHTML = '<div class="alert alert-danger text-center">Error loading pets.</div>';
  }
}

// ================================
// LOAD PET DETAIL
// ================================
async function loadPetDetail() {
  const container = document.getElementById('pet-detail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const petId = params.get('id');

  if (!petId) {
    container.innerHTML = '<div class="alert alert-warning text-center">No pet ID in URL.</div>';
    return;
  }

  container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p>Loading pet...</p></div>';

  try {
    const res = await fetch(`/api/pets/${petId}`);
    console.log('Pet detail fetch status:', res.status);
    const data = await res.json();
    console.log('Pet detail data:', data);

    if (!data.pet) {
      container.innerHTML = '<div class="alert alert-warning text-center">Pet not found or not available.</div>';
      return;
    }

    const pet = data.pet;

    // Adopt button now links to adopt.html with pet_id in URL
    const adoptButton = getCurrentUser()
      ? `<a href="/static/adopt.html?pet_id=${pet.id}" class="btn btn-success btn-lg px-5">Adopt ${pet.name}</a>`
      : `<a href="/static/login.html" class="btn btn-outline-warning btn-lg w-100 py-3 fw-bold">Login to Adopt ${pet.name}</a>`;

    container.innerHTML = `
      <div class="row g-5">
        <div class="col-lg-6">
          <img src="${pet.image_url || 'https://placehold.co/600x400?text=No+Image'}" 
               class="img-fluid rounded-4 shadow" alt="${pet.name}" 
               style="max-height:500px; object-fit:cover;">
        </div>
        <div class="col-lg-6">
          <h1 class="fw-bold mb-3">${pet.name}</h1>
          <div class="d-flex gap-3 mb-4 flex-wrap">
            <span class="badge bg-success fs-6 px-3 py-2">${pet.species} • ${pet.breed || 'Mixed'}</span>
            <span class="badge bg-primary fs-6 px-3 py-2">${pet.age} ${pet.age === 1 ? 'year' : 'years'} old • ${pet.gender}</span>
          </div>
          <h5 class="mb-3">About ${pet.name}</h5>
          <p class="lead text-muted">${pet.description || 'No description available.'}</p>
          <div class="mb-4">
            <h6 class="text-success"><i class="fas fa-map-marker-alt me-2"></i>Location</h6>
            <p>${pet.location || 'Not specified'}</p>
          </div>
          <div class="mt-4">
            ${adoptButton}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Pet detail error:', err);
    container.innerHTML = '<div class="alert alert-danger text-center">Error loading pet details. Please try again.</div>';
  }
}
// ========================================
// ADOPTION APPLICATION FORM (adopt.html)
// ========================================
const adoptionForm = document.getElementById("adoptionForm");
if (adoptionForm) {
  adoptionForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const pet_id = urlParams.get("pet_id");

    // Read values (IDs match your HTML exactly)
    const full_name = document.getElementById("full_name")?.value.trim() || '';
    const phone = document.getElementById("phone")?.value.trim() || '';
    const address = document.getElementById("address")?.value.trim() || '';
    const message = document.getElementById("message")?.value.trim() || '';

    // DEBUG: log exactly what JS sees
    console.log("=== Form submit debug ===");
    console.log("pet_id from URL:", pet_id);
    console.log("full_name:", full_name);
    console.log("phone:", phone);
    console.log("address:", address);
    console.log("message:", message);
    console.log("====================");

    const user = getCurrentUser();

    if (!user) {
      alert("Please login first!");
      location.href = "/static/login.html";
      return;
    }

    if (!pet_id) {
      alert("No pet selected. Go back to pet details.");
      return;
    }

    // Validation: allow if fields have at least 1 character after trim
    if (!full_name || full_name.length < 1 ||
        !phone || phone.length < 1 ||
        !address || address.length < 1 ||
        !message || message.length < 1) {
      document.getElementById("formMessage").innerHTML = 
        '<div class="alert alert-warning">Please fill all fields completely!</div>';
      return;
    }

    try {
      const response = await fetch("/api/adopt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          user_id: user.id,
          pet_id: pet_id,
          full_name: full_name,
          phone: phone,
          address: address,
          message: message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to submit application");
      }

      document.getElementById("formMessage").innerHTML = 
        '<div class="alert alert-success">Application submitted successfully! We will contact you soon.</div>';

      adoptionForm.reset();  // Clear form

    } catch (error) {
      console.error("Adoption submit error:", error);
      document.getElementById("formMessage").innerHTML = 
        `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
}
// ================================
// PAGE LOAD - RUN ON EVERY PAGE
// ================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  // Load pets if on index page
  if (document.getElementById('featured-pets') || document.getElementById('pets-container')) {
    loadFeaturedPets();
  }

  // Load pet detail if on detail page
  if (document.getElementById('pet-detail')) {
    loadPetDetail();
  }

  // Adoption form is handled separately on adopt.html
});