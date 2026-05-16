const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- CONFIGURATION ---
const ADMIN_BOT_TOKEN = "8728790870:AAGZZqVttTR3mQZFfXMtR3sdRlcVSbTHiRc";
const ADMIN_CHAT_ID = "1661187898"; 

// State
const state = {
    user: null,
    currentView: 'home',
    selectedPlan: null,
    selectedNetwork: null,
    tools: [
        { id: 1, name: 'ChatGPT Pro', brand: 'by OpenAI', price: 19.99, icon: '🤖', desc: 'Unlock GPT-4o, advanced data analysis, and private workspace.' },
        { id: 2, name: 'Midjourney', brand: 'Design', price: 29.99, icon: '🎨', desc: 'The world\'s best AI image generator. High-speed GPU hours included.' },
        { id: 3, name: 'Claude Pro', brand: 'by Anthropic', price: 20.00, icon: '🧠', desc: 'Access Claude 3.5 Sonnet and Opus with 5x higher usage limits.' },
        { id: 4, name: 'Gemini Ultra', brand: 'by Google', price: 19.99, icon: '⚡', desc: 'Google\'s most capable AI model for highly complex tasks.' },
        { id: 5, name: 'Perplexity Pro', brand: 'Search', price: 20.00, icon: '🔍', desc: 'Pro Search, file uploads, and choice of AI models (Claude/GPT).' },
        { id: 6, name: 'Canva Pro', brand: 'Design', price: 12.99, icon: '✨', desc: 'Unlimited premium content, Magic Studio, and brand tools.' }
    ],
    orders: []
};

// --- CORE UTILS ---
function notify(msg, isSuccess = false) {
    const el = document.getElementById('notification');
    el.innerText = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`screen-${viewId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (navItem) navItem.classList.add('active');
    
    // REFRESH ADMIN LIST IF OPENING ADMIN
    if (viewId === 'admin') {
        renderAdminTools();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
}

function updateWalletDisplay() {
    if (state.user) {
        const bal = `$${state.user.balance.toFixed(2)}`;
        document.getElementById('home-balance').innerText = bal;
        document.getElementById('display-balance').innerText = bal;
        document.getElementById('home-username').innerText = `@${state.user.username}`;
    }
}

// --- RENDER (IMAGE MATCH) ---
function renderTools() {
    const list = document.getElementById('tools-list');
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card" onclick="checkAccess('${tool.name}', ${tool.price})">
            <div class="tool-header">
                <div class="tool-icon">
                    ${tool.image_url ? `<img src="${tool.image_url}" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;">` : tool.icon || '🤖'}
                </div>
                <div class="tool-title">
                    <h4>${tool.name}</h4>
                    <p>${tool.brand || 'Premium Tool'}</p>
                </div>
            </div>
            <p class="tool-desc">${tool.description || tool.desc || ''}</p>
            <div class="tool-footer">
                <div class="price-tag">$${tool.price}</div>
                <button class="get-access-btn">Get Access</button>
            </div>
        </div>
    `).join('');
}

// --- FLOWS ---
async function checkAccess(name, price) {
    state.selectedPlan = { name, price };
    
    // REDIRECT TO NOWPAYMENTS
    notify('🔄 Generating Secure Invoice...', true);
    try {
        const response = await fetch('http://localhost:8000/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, user_email: state.user.email })
        });
        const data = await response.json();
        if (data.url) {
            tg.openLink(data.url);
        } else {
            notify('Checkout error, try later');
        }
    } catch (e) {
        notify('API Connection Error');
    }
}

function selectDeposit(network) {
    state.selectedNetwork = network;
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));
    const addr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    document.getElementById('deposit-address').innerText = addr;
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${addr}`;
    document.getElementById('deposit-details').style.display = 'block';
}

function confirmDeposit() {
    notify('🔄 Verifying payment...', true);
    setTimeout(() => {
        state.user.balance += state.selectedPlan.price;
        updateWalletDisplay();
        localStorage.setItem('session_user', JSON.stringify(state.user));
        notify('💰 Deposit Successful!', true);
        showView('home');
    }, 2000);
}

// --- AUTH ---
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();

    // HARDCODED ADMIN CHECK
    if (email === 'admin@ai.com' && pass === 'admin11223344') {
        state.user = { username: 'Admin', email: 'admin@ai.com', balance: 999999 };
        localStorage.setItem('session_user', JSON.stringify(state.user));
        showMainApp();
        notify('🔑 Admin Access Granted', true);
        return;
    }

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
        state.user = user;
        localStorage.setItem('session_user', JSON.stringify(user));
        showMainApp();
    } else {
        notify('Invalid login!');
    }
}

function handleRegister() {
    const user = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    
    if (!user || !email || !pass) return notify('Fill all fields');
    if (email === 'admin@ai.com') return notify('This email is reserved');
    
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    if (users.find(u => u.email === email)) return notify('Email already exists');
    
    users.push({ username: user, email, password: pass, balance: 0 });
    localStorage.setItem('registered_users', JSON.stringify(users));
    notify('✨ Registered!', true);
    toggleAuth('login');
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    
    // ADMIN CHECK
    if (state.user && state.user.email === 'admin@ai.com') {
        document.getElementById('nav-admin').style.display = 'flex';
    } else {
        document.getElementById('nav-admin').style.display = 'none';
    }
    
    updateWalletDisplay();
    fetchPlans();
}

function handleLogout() {
    localStorage.removeItem('session_user');
    state.user = null;
    location.reload(); // Hard reset for security
}

async function handleAdminAdd() {
    const id = document.getElementById('admin-p-id').value;
    const name = document.getElementById('admin-p-name').value;
    const price = document.getElementById('admin-p-price').value;
    const desc = document.getElementById('admin-p-desc').value;
    const fileInput = document.getElementById('admin-p-file');
    
    let imageUrl = document.getElementById('admin-p-preview').src;

    if (!name || !price) return notify('Name and Price required');

    // CONVERT FILE TO BASE64 IF NEW FILE SELECTED
    if (fileInput.files && fileInput.files[0]) {
        notify('📸 Processing Image...', true);
        imageUrl = await toBase64(fileInput.files[0]);
    }

    notify('⌛ Saving product...', true);
    try {
        const endpoint = id ? 'http://localhost:8000/update-plan' : 'http://localhost:8000/add-plan';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, price, description: desc, image_url: imageUrl })
        });
        const data = await response.json();
        if (data.status === 'ok') {
            notify(`✅ Product ${id ? 'updated' : 'added'}!`, true);
            resetAdminForm();
            fetchPlans();
        }
    } catch (e) { notify('API Error'); }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function editProduct(id) {
    const tool = state.tools.find(t => t._id === id);
    if (!tool) return;
    
    document.getElementById('admin-p-id').value = tool._id;
    document.getElementById('admin-p-name').value = tool.name;
    document.getElementById('admin-p-price').value = tool.price;
    document.getElementById('admin-p-desc').value = tool.description || tool.desc || '';
    document.getElementById('admin-p-preview').src = tool.image_url || '';
    document.getElementById('image-preview-container').style.display = 'block';
    
    document.getElementById('admin-form-title').innerText = '📝 Edit Product';
    document.getElementById('admin-cancel-edit').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAdminForm() {
    document.getElementById('admin-p-id').value = '';
    document.getElementById('admin-p-name').value = '';
    document.getElementById('admin-p-price').value = '';
    document.getElementById('admin-p-desc').value = '';
    document.getElementById('admin-p-file').value = '';
    document.getElementById('admin-p-preview').src = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('admin-form-title').innerText = '🚀 Add New Product';
    document.getElementById('admin-cancel-edit').style.display = 'none';
}

async function deleteProduct(name) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    notify('🗑 Deleting...', true);
    try {
        await fetch('http://localhost:8000/delete-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        notify('Done!', true);
        fetchPlans();
    } catch (e) { notify('Delete failed'); }
}

async function fetchPlans() {
    try {
        const r = await fetch('http://localhost:8000/plans');
        const data = await r.json();
        if (data.length > 0) {
            state.tools = data;
            renderTools();
            renderAdminTools();
        }
    } catch (e) { console.log("Using default tools"); }
}

function renderAdminTools() {
    const list = document.getElementById('admin-tools-list');
    if (!list) return;
    
    if (!state.tools || state.tools.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-dim);">No products in inventory.</div>';
        return;
    }

    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card" style="padding: 15px; margin-bottom: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--glass-border);">
            <div style="display: flex; gap: 15px; align-items: center;">
                <div class="inventory-img-container">
                    <img src="${tool.image_url || ''}" class="inventory-img">
                </div>
                <div style="flex-grow: 1;">
                    <h4 style="font-size: 15px; font-weight: 700; color: white;">${tool.name}</h4>
                    <p style="font-size: 12px; color: var(--primary); font-weight: 800;">$${tool.price}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editProduct('${tool._id}')" class="admin-action-btn edit"><i data-lucide="edit-3"></i></button>
                    <button onclick="deleteProduct('${tool.name}')" class="admin-action-btn delete"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Init
const session = localStorage.getItem('session_user');
if (session) {
    state.user = JSON.parse(session);
    showMainApp();
}
fetchPlans(); // Fetch from dynamic API
lucide.createIcons();
