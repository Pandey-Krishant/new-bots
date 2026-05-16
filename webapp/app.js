const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const API_URL = 'http://localhost:8000';
let state = {
    user: null,
    plans: [],
    token: localStorage.getItem('auth_token') || tg.initData
};

// --- AUTH LOGIC ---

function toggleAuth(type) {
    document.getElementById('auth-login-form').style.display = type === 'reg' ? 'none' : 'block';
    document.getElementById('auth-reg-form').style.display = type === 'reg' ? 'block' : 'none';
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) return notify('Fill all fields', 'error');
    
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (data.status === 'ok') {
        state.token = data.token;
        localStorage.setItem('auth_token', data.token);
        notify('Welcome back!', 'success');
        initApp();
    } else {
        notify(data.detail || 'Login failed', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    if (!username || !email || !password) return notify('Fill all fields', 'error');
    
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    
    const data = await res.json();
    if (data.status === 'ok') {
        notify('Account created! Please login.', 'success');
        toggleAuth('login');
    } else {
        notify(data.detail || 'Registration failed', 'error');
    }
}

function loginWithTelegram() {
    if (tg.initData) {
        state.token = tg.initData;
        localStorage.setItem('auth_token', tg.initData);
        initApp();
    } else {
        notify('Open in Telegram for this option', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('auth_token');
    state.token = '';
    location.reload();
}

// --- APP CORE ---

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': state.token, 'Content-Type': 'application/json' };
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
        if (response.status === 401) return null;
        return await response.json();
    } catch (e) { return null; }
}

async function initApp() {
    const user = await apiCall('/me');
    if (user) {
        state.user = user;
        document.getElementById('screen-auth').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        updateUserUI();
        if (user.is_admin) document.getElementById('nav-admin').style.display = 'flex';
        fetchPlans();
    } else {
        document.getElementById('screen-auth').style.display = 'flex';
        document.getElementById('main-content').style.display = 'none';
    }
}

function updateUserUI() {
    document.getElementById('user-name').innerText = state.user.username;
    document.getElementById('user-balance').innerText = `$${state.user.balance.toFixed(2)}`;
    document.getElementById('wallet-balance-display').innerText = `$${state.user.balance.toFixed(2)}`;
}

// --- COMMON FLOWS (Rest same as before) ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    if (viewId === 'admin') fetchAdminStats();
}

async function fetchPlans() {
    const plans = await apiCall('/plans');
    if (plans) {
        document.getElementById('tools-list').innerHTML = plans.map(p => `
            <div class="tool-card">
                <div class="tool-header"><h4>${p.name}</h4></div>
                <p class="tool-desc">${p.description}</p>
                <div class="tool-footer"><div class="price-tag">$${p.price}</div><button class="buy-btn" onclick="handleBuy('${p.name}', ${p.price})">Buy</button></div>
            </div>
        `).join('');
    }
}

function notify(msg, type) {
    const el = document.getElementById('notification');
    el.innerText = msg; el.className = `notification show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3000);
}

initApp();
lucide.createIcons();
