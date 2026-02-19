// ================================
// CONFIG
// ================================
const SUPABASE_URL = 'https://gnxotcrrwdiswqbokeyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdueG90Y3Jyd2Rpc3dxYm9rZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzcyMzYsImV4cCI6MjA4Njc1MzIzNn0.uqaZEpXtMVWl8nbMnvdxqwfQIfKzwgLKEpQLtmSOpBY';

// ================================
// AUTH FUNCTIONS
// ================================
function getCurrentUser() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) return JSON.parse(user);
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
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
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

      messageDiv.innerHTML = '<div class="alert alert-success">✅ Login successful! Redirecting...</div>';
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
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, options: { data: { full_name: fullName } } })
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.msg || data.error_description || 'Registration failed';
        if (msg.includes('duplicate')) msg = 'Email already registered';
        if (msg.includes('invalid')) msg = 'Invalid email or weak password';
        throw new Error(msg);
      }

      messageDiv.innerHTML = '<div class="alert alert-success">✅ Registration successful! Please check your email and confirm your account, then <a href="/static/login.html">Login here</a>.</div>';

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
  if (!container) return;

  container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p>Loading pets...</p></div>';

  try {
    const res = await fetch('/api/pets');
    const data = await res.json();

    if (!data.pets || data.pets.length === 0) {
      container.innerHTML = '<div class="alert alert-info text-center">No pets available right now.</div>';
      return;
    }

    container.innerHTML = '';
    data.pets.forEach(pet => {
      const shelterBadge = pet.shelters
        ? `<a href="/static/shelter-detail.html?id=${pet.shelters.id}" class="badge bg-light text-success border border-success text-decoration-none mt-2 d-inline-block">
            <i class="fas fa-home me-1"></i>${pet.shelters.name}
           </a>`
        : '';

      const card = `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow-sm border-0 rounded-4">
            <img src="${pet.image_url || 'https://placehold.co/400x250?text=No+Image'}"
                 class="card-img-top" style="height:250px; object-fit:cover;"
                 onerror="this.src='https://placehold.co/400x250?text=No+Image'">
            <div class="card-body p-4">
              <h5 class="card-title fw-bold">${pet.name}</h5>
              <p class="card-text mb-1">
                <strong>Species:</strong> ${pet.species?.name || 'Unknown'}<br>
                <strong>Breed:</strong> ${pet.breed || 'N/A'}<br>
                <strong>Age:</strong> ${pet.age} years
              </p>
              ${shelterBadge}
            </div>
            <div class="card-footer bg-white border-0 pb-4 px-4">
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
    const data = await res.json();

    if (!data.pet) {
      container.innerHTML = '<div class="alert alert-warning text-center">Pet not found.</div>';
      return;
    }

    const pet = data.pet;

    const adoptButton = getCurrentUser()
      ? `<a href="/static/adopt.html?pet_id=${pet.id}" class="btn btn-success btn-lg px-5">Adopt ${pet.name}</a>`
      : `<a href="/static/login.html" class="btn btn-outline-warning btn-lg w-100 py-3 fw-bold">Login to Adopt ${pet.name}</a>`;

    const shelterCard = pet.shelters ? `
      <div class="card border-0 bg-light rounded-4 p-3 mt-4">
        <div class="d-flex align-items-center gap-3">
          <img src="${pet.shelters.logo_url || 'https://placehold.co/60x60?text=S'}"
               style="width:60px;height:60px;object-fit:cover;border-radius:50%;"
               onerror="this.src='https://placehold.co/60x60?text=S'">
          <div>
            <h6 class="fw-bold mb-0">${pet.shelters.name}</h6>
            <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${pet.shelters.address || 'N/A'}</small><br>
            <small class="text-muted"><i class="fas fa-phone me-1"></i>${pet.shelters.phone || 'N/A'}</small>
          </div>
          <a href="/static/shelter-detail.html?id=${pet.shelters.id}" class="btn btn-outline-success btn-sm ms-auto">View Shelter</a>
        </div>
      </div>` : '';

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
            <span class="badge bg-success fs-6 px-3 py-2">${pet.species?.name || 'Unknown'} • ${pet.breed || 'Mixed'}</span>
            <span class="badge bg-primary fs-6 px-3 py-2">${pet.age} ${pet.age === 1 ? 'year' : 'years'} old • ${pet.gender}</span>
          </div>
          <h5 class="mb-3">About ${pet.name}</h5>
          <p class="lead text-muted">${pet.description || 'No description available.'}</p>
          <div class="mb-4">
            <h6 class="text-success"><i class="fas fa-map-marker-alt me-2"></i>Location</h6>
            <p>${pet.location || 'Not specified'}</p>
          </div>
          ${shelterCard}
          <div class="mt-4">${adoptButton}</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Pet detail error:', err);
    container.innerHTML = '<div class="alert alert-danger text-center">Error loading pet details.</div>';
  }
}

// ================================
// LOAD ALL SHELTERS
// ================================
async function loadShelters() {
  const container = document.getElementById('shelters-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-5 col-12"><div class="spinner-border text-success"></div><p>Loading shelters...</p></div>';

  try {
    const res = await fetch('/api/shelters');
    const data = await res.json();

    if (!data.shelters || data.shelters.length === 0) {
      container.innerHTML = '<div class="alert alert-info text-center col-12">No shelters found.</div>';
      return;
    }

    container.innerHTML = '';
    data.shelters.forEach(shelter => {
      container.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow-sm border-0 rounded-4">
            <div class="card-body p-4 text-center">
              <img src="${shelter.logo_url || 'https://placehold.co/80x80?text=S'}"
                   style="width:80px;height:80px;object-fit:cover;border-radius:50%;" class="mb-3"
                   onerror="this.src='https://placehold.co/80x80?text=S'">
              <h5 class="fw-bold">${shelter.name}</h5>
              <p class="text-muted small">${shelter.description || 'A caring shelter for animals.'}</p>
              <p class="mb-1"><i class="fas fa-map-marker-alt text-success me-1"></i><small>${shelter.address || 'N/A'}</small></p>
              <p class="mb-1"><i class="fas fa-phone text-success me-1"></i><small>${shelter.phone || 'N/A'}</small></p>
              <p class="mb-0"><i class="fas fa-envelope text-success me-1"></i><small>${shelter.email || 'N/A'}</small></p>
            </div>
            <div class="card-footer bg-white border-0 pb-4 px-4">
              <a href="/static/shelter-detail.html?id=${shelter.id}" class="btn btn-outline-success w-100">View Shelter & Pets</a>
            </div>
          </div>
        </div>`;
    });
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger text-center col-12">Error loading shelters.</div>';
  }
}

// ================================
// LOAD SHELTER DETAIL
// ================================
async function loadShelterDetail() {
  const container = document.getElementById('shelter-detail');
  if (!container) return;

  const shelterId = new URLSearchParams(window.location.search).get('id');
  if (!shelterId) {
    container.innerHTML = '<div class="alert alert-warning">No shelter ID provided.</div>';
    return;
  }

  try {
    const res = await fetch(`/api/shelters/${shelterId}`);
    const data = await res.json();

    if (!data.shelter) {
      container.innerHTML = '<div class="alert alert-warning">Shelter not found.</div>';
      return;
    }

    const s = data.shelter;
    const pets = data.pets || [];

    const websiteLink = `
  ${s.website ? `<a href="${s.website}" target="_blank" class="btn btn-outline-success btn-sm me-2"><i class="fas fa-globe me-1"></i>Visit Website</a>` : ''}
  <a href="/static/contact-shelter.html?shelter_id=${s.id}" class="btn btn-success btn-sm"><i class="fas fa-envelope me-1"></i>Contact Shelter</a>
`;

    const petsHtml = pets.length === 0
      ? '<div class="col-12"><div class="alert alert-info">No available pets at this shelter right now.</div></div>'
      : pets.map(pet => `
          <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-4">
              <img src="${pet.image_url || 'https://placehold.co/400x200?text=No+Image'}"
                   class="card-img-top" style="height:200px;object-fit:cover;"
                   onerror="this.src='https://placehold.co/400x200?text=No+Image'">
              <div class="card-body p-3">
                <h6 class="fw-bold">${pet.name}</h6>
                <p class="text-muted small mb-0">${pet.species?.name || 'Unknown'} • ${pet.breed || 'Mixed'} • ${pet.age} yrs</p>
              </div>
              <div class="card-footer bg-white border-0 pb-3 px-3">
                <a href="/static/pet-detail.html?id=${pet.id}" class="btn btn-outline-success btn-sm w-100">View Details</a>
              </div>
            </div>
          </div>`).join('');

    container.innerHTML = `
      <div class="card shadow-sm border-0 rounded-4 mb-5">
        <div class="card-body p-4">
          <div class="row align-items-center">
            <div class="col-md-2 text-center mb-3 mb-md-0">
              <img src="${s.logo_url || 'https://placehold.co/100x100?text=S'}"
                   style="width:100px;height:100px;object-fit:cover;border-radius:50%;"
                   onerror="this.src='https://placehold.co/100x100?text=S'">
            </div>
            <div class="col-md-7">
              <h2 class="fw-bold text-success mb-1">${s.name}</h2>
              <p class="text-muted mb-2">${s.description || 'A caring shelter dedicated to animal welfare.'}</p>
              <div class="d-flex flex-wrap gap-3 text-muted small">
                <span><i class="fas fa-map-marker-alt text-success me-1"></i>${s.address || 'N/A'}</span>
                <span><i class="fas fa-phone text-success me-1"></i>${s.phone || 'N/A'}</span>
                <span><i class="fas fa-envelope text-success me-1"></i>${s.email || 'N/A'}</span>
              </div>
            </div>
            <div class="col-md-3 text-md-end mt-3 mt-md-0">${websiteLink}</div>
          </div>
        </div>
      </div>
      <h4 class="fw-bold mb-4"><i class="fas fa-paw text-success me-2"></i>Pets Available at ${s.name}</h4>
      <div class="row g-4">${petsHtml}</div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Error loading shelter details.</div>';
  }
}

// ========================================
// ADOPTION FORM
// ========================================
const adoptionForm = document.getElementById("adoptionForm");
if (adoptionForm) {
  adoptionForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const pet_id = new URLSearchParams(window.location.search).get("pet_id");
    const full_name = document.getElementById("full_name")?.value.trim() || '';
    const phone = document.getElementById("phone")?.value.trim() || '';
    const address = document.getElementById("address")?.value.trim() || '';
    const message = document.getElementById("message")?.value.trim() || '';
    const user = getCurrentUser();

    if (!user) { alert("Please login first!"); location.href = "/static/login.html"; return; }
    if (!pet_id) { alert("No pet selected."); return; }
    if (!full_name || !phone || !address || !message) {
      document.getElementById("formMessage").innerHTML =
        '<div class="alert alert-warning">Please fill all fields!</div>';
      return;
    }

    try {
      const response = await fetch("/api/adopt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ user_id: user.id, pet_id, full_name, phone, address, message })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to submit");

      document.getElementById("formMessage").innerHTML =
        '<div class="alert alert-success">✅ Application submitted! We will contact you soon.</div>';
      adoptionForm.reset();

    } catch (error) {
      document.getElementById("formMessage").innerHTML =
        `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
}

// ================================
// PAGE LOAD
// ================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  if (document.getElementById('featured-pets') || document.getElementById('pets-container')) loadFeaturedPets();
  if (document.getElementById('pet-detail')) loadPetDetail();
  if (document.getElementById('shelters-container')) loadShelters();
  if (document.getElementById('shelter-detail')) loadShelterDetail();
});