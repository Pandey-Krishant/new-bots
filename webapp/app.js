const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const API_URL = 'http://localhost:8000';
let state = {
    user: null,
    plans: [],
    orders: [],
    adminData: { users: [], orders: [], logs: [] },
    token: localStorage.getItem('auth_token') || tg.initData
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
            showAuthScreen();
            return null;
        }
        if (!response.ok) throw new Error('Request Failed');
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// --- AUTH & INIT ---

function showAuthScreen() {
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
}

function handleAuth() {
    const token = document.getElementById('auth-token').value;
    if (!token) return notify('Enter token', 'error');
    state.token = token;
    localStorage.setItem('auth_token', token);
    initApp();
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
        if (!tg.initData) showAuthScreen();
    }
}

function updateUserUI() {
    document.getElementById('user-name').innerText = state.user.username;
    document.getElementById('user-balance').innerText = `$${state.user.balance.toFixed(2)}`;
    document.getElementById('wallet-balance-display').innerText = `$${state.user.balance.toFixed(2)}`;
}

// --- VIEW MANAGEMENT ---

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('onclick')?.includes(viewId)));
    
    if (viewId === 'admin') fetchAdminStats();
    if (viewId === 'orders') fetchOrders();
}

// --- ADMIN LOGIC ---

async function fetchAdminStats() {
    const data = await apiCall('/admin/stats');
    if (data) {
        state.adminData = data;
        renderAdminUsers();
        renderAdminOrders();
        renderAdminLogs();
    }
}

function setAdminTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.innerText.toLowerCase().includes(tabId.replace('-',''))));
    document.querySelectorAll('.admin-sub-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`admin-${tabId}`).classList.add('active');
}

function renderAdminUsers() {
    const list = document.getElementById('admin-users-table');
    list.innerHTML = state.adminData.users.map(u => `
        <tr>
            <td>${u.username} <br><span style="font-size:10px; color:var(--text-dim)">ID: ${u.user_id}</span></td>
            <td style="color:var(--primary); font-weight:700">$${u.balance.toFixed(2)}</td>
            <td>${new Date(u.joined_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function renderAdminOrders() {
    const list = document.getElementById('admin-orders-table');
    list.innerHTML = state.adminData.orders.map(o => `
        <tr>
            <td>#${o._id.slice(-4)}</td>
            <td>${o.username}</td>
            <td>${o.plan_name}</td>
            <td><span class="status-pill" style="background:var(--primary)">${o.status}</span></td>
        </tr>
    `).join('');
}

function renderAdminLogs() {
    const list = document.getElementById('admin-logs-list');
    list.innerHTML = state.adminData.logs.map(l => `
        <div style="padding: 8px; border-bottom: 1px solid var(--glass-border);">
            <span style="color:var(--primary)">[${new Date(l.timestamp).toLocaleTimeString()}]</span> 
            <strong>${l.action}</strong>: ${l.details} 
            <span style="color:var(--text-dim)">(User: ${l.user_id})</span>
        </div>
    `).join('').replace(/undefined/g, '');
}

// --- COMMON FLOWS ---

async function fetchPlans() {
    const plans = await apiCall('/plans');
    if (plans) {
        document.getElementById('tools-list').innerHTML = plans.map(plan => `
            <div class="tool-card">
                <div class="tool-header">
                    <div class="tool-icon">${plan.image_url ? `<img src="${plan.image_url}" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">` : '🤖'}</div>
                    <div class="tool-title"><h4>${plan.name}</h4><p>${plan.delivery_time || 'Instant'}</p></div>
                </div>
                <p class="tool-desc">${plan.description}</p>
                <div class="tool-footer"><div class="price-tag">$${plan.price}</div><button class="buy-btn" onclick="handleBuy('${plan.name}', ${plan.price})">Buy</button></div>
            </div>
        `).join('');
    }
}

async function fetchOrders() {
    const orders = await apiCall('/orders');
    if (orders) {
        document.getElementById('orders-list').innerHTML = orders.length ? orders.map(o => `
            <div class="tool-card" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;">
                    <div><h4>${o.plan_name}</h4><p style="font-size:12px;color:var(--text-dim)">${new Date(o.timestamp).toLocaleDateString()}</p></div>
                    <span class="status-pill" style="background:var(--primary); height:fit-content;">${o.status}</span>
                </div>
            </div>
        `).join('') : '<p style="text-align:center;color:var(--text-dim);padding:40px;">No orders found.</p>';
    }
}

async function initiateDeposit(method) {
    const amount = document.getElementById('deposit-amount').value;
    if (!amount || amount < 1) return notify('Min $1', 'error');
    const res = await apiCall('/create-payment', 'POST', { amount });
    if (res && res.invoice_url) tg.openLink(res.invoice_url);
    else notify('Payment Error', 'error');
}

// Init
initApp();
lucide.createIcons();
