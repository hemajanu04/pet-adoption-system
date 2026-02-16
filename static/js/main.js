// Check if user is logged in (from localStorage)
function getCurrentUser() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    return JSON.parse(user);
  }
  return null;
}

// Update navbar based on login status
function updateNavbar() {
  const user = getCurrentUser();
  const loginLink = document.querySelector('.nav-link[href="/static/login.html"]');
  const registerBtn = document.querySelector('.nav-link.btn-success[href="/static/register.html"]');

  if (user && loginLink && registerBtn) {
    loginLink.textContent = `Welcome, ${user.full_name || user.email.split('@')[0]}`;
    loginLink.href = "#";
    loginLink.classList.add('fw-bold');
    registerBtn.style.display = 'none';

    // Add logout link
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

// Handle login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    messageDiv.innerHTML = '<div class="spinner-border text-success" role="status"></div>';

    try {
      const response = await fetch('https://gnxotcrrwdiswqbokeyr.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable_fr96JXERwrwOA_Or8ZhL5w_pM9uNVOC',  // your publishable key
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name
      }));

      messageDiv.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
      setTimeout(() => location.href = '/static/index.html', 1500);
    } catch (err) {
      messageDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}

// Handle register form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('registerMessage');

    messageDiv.innerHTML = '<div class="spinner-border text-success" role="status"></div>';

    try {
      const response = await fetch('https://gnxotcrrwdiswqbokeyr.supabase.co/auth/v1/signup', {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable_fr96JXERwrwOA_Or8ZhL5w_pM9uNVOC',
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
        throw new Error(data.msg || 'Registration failed');
      }

      messageDiv.innerHTML = '<div class="alert alert-success">Registration successful! Please check your email to confirm.</div>';
    } catch (err) {
      messageDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  // Existing pet loading code (keep your previous loadFeaturedPets() and loadPetDetail())
  const isDetailPage = document.getElementById('pet-detail') !== null;
  if (isDetailPage) {
    loadPetDetail();
  } else {
    loadFeaturedPets();
  }
});

// ... paste your existing loadFeaturedPets() and loadPetDetail() functions here ...