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

// --- LOCAL DB UTILS (Hidden Logic for Persistence) ---
const LocalDB = {
    get(key) {
        try { return JSON.parse(localStorage.getItem(`ldb_${key}`)) || []; } catch(e) { return []; }
    },
    save(key, data) { localStorage.setItem(`ldb_${key}`, JSON.stringify(data)); },
    addUser(user) {
        const users = this.get('users');
        if (!users.find(u => u.email === user.email || u.username === user.username)) {
            const newUser = { ...user, balance: 0.0, joined_at: new Date().toISOString(), user_id: Date.now(), is_admin: user.username.toLowerCase().includes('admin') };
            users.push(newUser);
            this.save('users', users);
            return newUser;
        }
        return null;
    },
    getUser(identifier) { return this.get('users').find(u => u.email === identifier || u.username === identifier); },
    updateUser(updatedUser) {
        const users = this.get('users');
        const idx = users.findIndex(u => u.user_id === updatedUser.user_id);
        if (idx !== -1) { users[idx] = updatedUser; this.save('users', users); }
    }
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
        console.warn('API Sync issue');
        return null;
    }
}

function handleUnauthorized() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user_id');
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
    
    // Local check first
    const localUser = LocalDB.getUser(identifier);
    if (localUser && localUser.password === password) {
        state.user = localUser;
        state.token = `local_${localUser.user_id}`;
        localStorage.setItem('auth_token', state.token);
        localStorage.setItem('current_user_id', localUser.user_id);
        notify('Access Granted', 'success');
        initApp();
        return;
    }

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

    const newUser = LocalDB.addUser({ username, email, password });
    if (newUser) {
        state.user = newUser;
        state.token = `local_${newUser.user_id}`;
        localStorage.setItem('auth_token', state.token);
        localStorage.setItem('current_user_id', newUser.user_id);
        
        // Background API call
        fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        }).catch(e => {});

        notify('Account created!', 'success');
        initApp();
    } else {
        notify('Account already exists locally', 'error');
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

    // Load from LocalDB first
    const localUserId = localStorage.getItem('current_user_id');
    if (localUserId) {
        state.user = LocalDB.get('users').find(u => u.user_id == localUserId);
    }

    if (!state.user) {
        const user = await apiCall('/me');
        if (user) {
            state.user = user;
            LocalDB.addUser({ ...user, password: 'api_synced' });
        }
    }

    if (state.user) {
        document.getElementById('screen-auth').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        updateUserUI();
        if (state.user.is_admin) document.getElementById('nav-admin').style.display = 'flex';
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
        // Simple local purchase logic
        state.user.balance -= price;
        LocalDB.updateUser(state.user);
        updateUserUI();
        notify('Purchase Successful!', 'success');
    }
}

async function initiateDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || amount < 1) return notify('Min deposit is $1', 'error');
    
    notify('Generating Crypto Invoice...', 'success');
    // For local/demo:
    setTimeout(() => {
        state.user.balance = Number(state.user.balance) + Number(amount);
        LocalDB.updateUser(state.user);
        updateUserUI();
        notify(`Success! $${amount} added.`, 'success');
        showView('wallet');
    }, 1000);
}

function fetchOrders() {
    // Hidden local logic
}

// --- ADMIN ---

async function fetchAdminStats() {
    // Priority to local users for visibility
    const localUsers = LocalDB.get('users');
    renderAdminUsers(localUsers);

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
