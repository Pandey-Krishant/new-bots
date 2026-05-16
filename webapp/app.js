const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

const API_URL = 'http://localhost:8000';
const state = {
    user: null,
    plans: [],
    token: localStorage.getItem('auth_token') || (tg ? tg.initData : null),
    currentView: 'home'
};

// --- CORE UTILS ---

function notify(msg, type = 'success') {
    const el = document.getElementById('notification');
    el.innerText = msg;
    el.className = `notification show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': state.token,
        'Content-Type': 'application/json'
    };
    
    try {
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (response.status === 401) {
            handleUnauthorized();
            return null;
        }
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Request failed');
        }
        return await response.json();
    } catch (e) {
        notify(e.message, 'error');
        return null;
    }
}

function handleUnauthorized() {
    state.token = null;
    localStorage.removeItem('auth_token');
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
}

// --- AUTH FLOWS ---

function toggleAuth(type) {
    document.getElementById('auth-login-view').style.display = type === 'reg' ? 'none' : 'block';
    document.getElementById('auth-reg-view').style.display = type === 'reg' ? 'block' : 'none';
    lucide.createIcons();
}

async function handleLogin() {
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    
    if (!identifier || !password) return notify('Please fill all fields', 'error');
    
    notify('Authenticating...', 'success');
    const data = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
    }).then(r => r.json());

    if (data.status === 'ok') {
        state.token = data.token;
        localStorage.setItem('auth_token', data.token);
        notify('Access Granted', 'success');
        initApp();
    } else {
        notify(data.detail || 'Invalid Credentials', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    if (!username || !email || !password) return notify('All fields are mandatory', 'error');
    
    notify('Creating account...', 'success');
    const data = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    }).then(r => r.json());

    if (data.status === 'ok') {
        notify('Account created! Sign in now.', 'success');
        toggleAuth('login');
    } else {
        notify(data.detail || 'Registration failed', 'error');
    }
}

function handleLogout() {
    handleUnauthorized();
    location.reload();
}

// --- APP LOGIC ---

async function initApp() {
    if (!state.token) {
        handleUnauthorized();
        return;
    }

    const user = await apiCall('/me');
    if (user) {
        state.user = user;
        document.getElementById('screen-auth').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        updateUserUI();
        if (user.is_admin) document.getElementById('nav-admin').style.display = 'flex';
        fetchPlans();
    } else {
        handleUnauthorized();
    }
}

function updateUserUI() {
    document.getElementById('user-name').innerText = state.user.username;
    document.getElementById('user-balance').innerText = `$${state.user.balance.toFixed(2)}`;
    document.getElementById('wallet-balance-display').innerText = `$${state.user.balance.toFixed(2)}`;
    if (state.user.photo_url) document.getElementById('user-photo').src = state.user.photo_url;
}

function showView(viewId) {
    state.currentView = viewId;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('onclick')?.includes(viewId)));
    
    if (viewId === 'admin') fetchAdminStats();
    if (viewId === 'orders') fetchOrders();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- DATA FETCHING ---

async function fetchPlans() {
    const plans = await apiCall('/plans');
    if (plans) {
        state.plans = plans;
        renderPlans();
    }
}

function renderPlans() {
    const list = document.getElementById('tools-list');
    list.innerHTML = state.plans.map(plan => `
        <div class="tool-card">
            <div class="tool-header">
                <div class="tool-icon">
                    ${plan.image_url ? `<img src="${plan.image_url}" style="width:100%;height:100%;border-radius:18px;object-fit:cover;">` : '🤖'}
                </div>
                <div class="tool-title">
                    <h4>${plan.name}</h4>
                    <p>${plan.delivery_time || 'Instant Delivery'}</p>
                </div>
            </div>
            <p class="tool-desc">${plan.description}</p>
            <div class="tool-footer">
                <div class="price-tag">$${plan.price}<span>/ mo</span></div>
                <button class="buy-btn" onclick="handleBuy('${plan.name}', ${plan.price})">Get Access</button>
            </div>
        </div>
    `).join('');
}

async function handleBuy(name, price) {
    if (state.user.balance < price) {
        notify('Insufficient Balance! Top up first.', 'error');
        showView('wallet');
        return;
    }
    
    if (confirm(`Confirm purchase for ${name} ($${price})?`)) {
        notify('Processing Purchase...', 'success');
        // Logic to hit purchase endpoint
    }
}

async function initiateDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || amount < 1) return notify('Min deposit is $1', 'error');
    
    notify('Generating Crypto Invoice...', 'success');
    const res = await apiCall('/create-payment', 'POST', { amount });
    if (res && res.invoice_url) {
        if (tg) tg.openLink(res.invoice_url);
        else window.open(res.invoice_url, '_blank');
    }
}

// --- ADMIN ---

async function fetchAdminStats() {
    const data = await apiCall('/admin/stats');
    if (data) {
        renderAdminUsers(data.users);
        renderAdminOrders(data.orders);
        renderAdminLogs(data.logs);
    }
}

function renderAdminUsers(users) {
    const el = document.getElementById('admin-users-list');
    el.innerHTML = users.map(u => `
        <div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid var(--glass-border);">
            <div><strong>${u.username}</strong><br><span style="font-size:11px; color:var(--text-dim)">${u.email || 'No Email'}</span></div>
            <div style="font-weight:800; color:var(--primary)">$${u.balance.toFixed(2)}</div>
        </div>
    `).join('');
}

function renderAdminOrders(orders) {
    const el = document.getElementById('admin-orders-list');
    el.innerHTML = orders.map(o => `
        <div style="padding:15px; border-bottom:1px solid var(--glass-border);">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>${o.plan_name}</strong>
                <span style="font-size:10px; background:var(--primary); padding:3px 8px; border-radius:5px;">${o.status}</span>
            </div>
            <div style="font-size:11px; color:var(--text-dim)">User: ${o.username} | $${o.total_price}</div>
        </div>
    `).join('');
}

function renderAdminLogs(logs) {
    const el = document.getElementById('admin-system-logs');
    el.innerHTML = logs.map(l => `
        <div style="padding:10px; border-bottom:1px solid var(--glass-border);">
            <span style="color:var(--primary)">[${new Date(l.timestamp).toLocaleTimeString()}]</span> <strong>${l.action}</strong>: ${l.details}
        </div>
    `).join('');
}

function setAdminTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.innerText.toLowerCase().includes(tabId.replace('-',''))));
    document.querySelectorAll('.admin-sub-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`admin-${tabId}`).classList.add('active');
}

async function saveProduct() {
    const name = document.getElementById('admin-p-name').value;
    const price = document.getElementById('admin-p-price').value;
    const description = document.getElementById('admin-p-desc').value;
    const image_url = document.getElementById('admin-p-img-url').value;
    
    if (!name || !price) return notify('Name and Price are mandatory', 'error');
    
    const res = await apiCall('/admin/add-plan', 'POST', { name, price, description, image_url });
    if (res) {
        notify('Inventory Updated Successfully!', 'success');
        fetchPlans();
        showView('home');
    }
}

// Start
initApp();
lucide.createIcons();
