const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- CONFIGURATION ---
const ADMIN_BOT_TOKEN = "8728790870:AAGZZqVttTR3mQZFfXMtR3sdRlcVSbTHiRc";
const ADMIN_CHAT_ID = "1661187898"; 
const API_URL = "https://new-bots.vercel.app/api";

// --- FLOATING BACKGROUND ICONS ---
(function createBgIcons() {
    const icons = ['🤖','🧠','⚡','🎨','🔍','✨','🚀','💎','🌐','🔮','💡','🛡️','📡','⚙️','🎯','🌟','💫','🔐','🤯','🧬'];
    const layer = document.createElement('div');
    layer.id = 'bg-icons-layer';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';

    // Inject keyframe styles once
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float-icon {
            0%   { transform: translateY(0px)   rotate(0deg)   scale(1);    opacity: var(--op); }
            33%  { transform: translateY(-22px) rotate(8deg)   scale(1.08); opacity: calc(var(--op) * 1.3); }
            66%  { transform: translateY(-10px) rotate(-5deg)  scale(0.94); opacity: calc(var(--op) * 0.8); }
            100% { transform: translateY(0px)   rotate(0deg)   scale(1);    opacity: var(--op); }
        }
        .bg-icon {
            position: absolute;
            font-size: 28px;
            animation: float-icon var(--dur) ease-in-out infinite;
            animation-delay: var(--delay);
            opacity: var(--op);
            user-select: none;
            filter: blur(0.4px);
        }
    `;
    document.head.appendChild(style);

    // Place icons at fixed scattered positions across the full viewport
    const positions = [
        {top:'4%',  left:'5%'},  {top:'8%',  left:'82%'}, {top:'15%', left:'45%'},
        {top:'22%', left:'15%'}, {top:'28%', left:'70%'}, {top:'35%', left:'30%'},
        {top:'42%', left:'88%'}, {top:'50%', left:'8%'},  {top:'55%', left:'55%'},
        {top:'62%', left:'22%'}, {top:'68%', left:'78%'}, {top:'74%', left:'40%'},
        {top:'80%', left:'12%'}, {top:'85%', left:'65%'}, {top:'90%', left:'35%'},
        {top:'95%', left:'80%'}, {top:'3%',  left:'60%'}, {top:'47%', left:'48%'},
        {top:'72%', left:'92%'}, {top:'18%', left:'92%'},
    ];

    positions.forEach((pos, i) => {
        const el = document.createElement('span');
        el.className = 'bg-icon';
        el.textContent = icons[i % icons.length];
        const dur   = (7 + (i * 1.3) % 8).toFixed(1) + 's';
        const delay = '-' + ((i * 0.9) % 7).toFixed(1) + 's';
        const op    = (0.05 + (i % 5) * 0.015).toFixed(3);
        el.style.cssText = `top:${pos.top};left:${pos.left};--dur:${dur};--delay:${delay};--op:${op};`;
        layer.appendChild(el);
    });

    document.body.appendChild(layer);
})(); // Defaulting to Vercel deployment URL if running there, or change to localhost for dev

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

async function addLog(username, action, details) {
    const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
    logs.unshift({ username, action, details, timestamp: new Date().toISOString() });
    localStorage.setItem('system_logs', JSON.stringify(logs.slice(0, 100)));
    
    // Send to Admin Bot real-time
    try {
        fetch(`${API_URL}/system-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, action, details })
        }).catch(e => {});
    } catch(e) {}
}

function handleLogout() {
    if (state.user) addLog(state.user.username, 'Logout', 'User signed out');
    localStorage.removeItem('session_user');
    location.reload();
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`screen-${viewId}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (navItem) navItem.classList.add('active');
    
    // Render orders when orders tab is opened
    if (viewId === 'orders') renderOrders();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ORDERS / PURCHASE HISTORY ---
function savePurchase(username, email, productName, price) {
    const purchases = JSON.parse(localStorage.getItem('all_purchases') || '[]');
    purchases.unshift({
        username,
        email,
        product: productName,
        price,
        date: new Date().toISOString()
    });
    localStorage.setItem('all_purchases', JSON.stringify(purchases));
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    const heading = document.getElementById('orders-heading');
    if (!container) return;
    const allPurchases = JSON.parse(localStorage.getItem('all_purchases') || '[]');
    const isAdmin = state.user && state.user.isAdmin;
    
    if (heading) {
        heading.innerText = isAdmin ? 'All User Orders' : 'Purchase History';
    }

    // Admin sees ALL user purchases, normal user sees only their own
    const filtered = isAdmin
        ? allPurchases
        : allPurchases.filter(p => p.email === (state.user && state.user.email));
    
    if (!filtered.length) {
        container.innerHTML = `
            <div class="tool-card" style="text-align:center; padding:50px 20px;">
                <div style="font-size:60px; margin-bottom:20px;">📦</div>
                <h3>${isAdmin ? 'No purchases yet from any user' : 'No purchases yet'}</h3>
                <p style="color:var(--text-dim); margin-top:10px;">${isAdmin ? 'User purchases will appear here.' : 'Your purchase history will appear here.'}</p>
            </div>`;
        return;
    }
    
    container.innerHTML = filtered.map(p => {
        const d = new Date(p.date);
        const dateStr = d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const timeStr = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
        return `
        <div class="tool-card" style="display:flex; align-items:center; gap:15px; padding:18px; margin-bottom:12px;">
            <div style="font-size:32px;">🛒</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700;">${p.product}</div>
                ${isAdmin ? `<div style="color:#ffeb3b; font-size:13px; font-weight:600;">👤 ${p.username} (${p.email})</div>` : ''}
                <div style="color:var(--text-dim); font-size:12px;">${dateStr} • ${timeStr}</div>
            </div>
            <div style="color:var(--primary); font-weight:800; font-size:16px;">$${p.price}</div>
        </div>`;
    }).join('');
}


function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
}

function updateWalletDisplay() {
    if (state.user) {
        const isAdmin = state.user.isAdmin;
        const bal = isAdmin ? '∞' : `$${Number(state.user.balance).toFixed(2)}`;
        const homeBal = document.getElementById('home-balance');
        const dispBal = document.getElementById('display-balance');
        const homeUser = document.getElementById('home-username');
        if (homeBal) homeBal.innerText = bal;
        if (dispBal) dispBal.innerText = bal;
        if (homeUser) homeUser.innerText = `@${state.user.username}`;
    }
}

// --- RENDER (IMAGE MATCH) ---
function renderTools() {
    const list = document.getElementById('tools-list');
    if (!list) return;
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card" onclick="checkAccess('${tool.name}', ${tool.price})">
            <div class="tool-header">
                ${tool.image_url
                    ? `<img src="${tool.image_url}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;flex-shrink:0;">`
                    : `<div class="tool-icon">${tool.icon}</div>`}
                <div class="tool-title">
                    <h4>${tool.name}</h4>
                    <p>${tool.brand}</p>
                </div>
            </div>
            <p class="tool-desc">${tool.desc}</p>
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
    
    addLog(state.user ? state.user.username : 'Guest', 'Click Get Access', `Clicked on: ${name} ($${price})`);

    // NOWPAYMENTS REDIRECT
    notify('🔄 Generating Secure Invoice...', true);
    try {
        const token = state.user.token ? `Bearer ${state.user.token}` : `local_${state.user.user_id}`;
        const response = await fetch(`${API_URL}/create-payment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ amount: price, network: 'usdttrc20' }) // Default for direct product buy
        });
        const data = await response.json();
        if (data.invoice_url) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openLink(data.invoice_url);
            } else {
                window.open(data.invoice_url, '_blank');
            }
            addLog(state.user.username, 'Payment', `Generated invoice for ${name} ($${price})`);
        } else {
            notify(data.detail || 'Checkout error, try later');
        }
    } catch (e) {
        // Local Fallback if API is down
        notify('Payment API unavailable. Proceeding to manual deposit...', false);
        const payAmt = document.getElementById('pay-required-amount');
        if (payAmt) payAmt.innerText = `$${price}`;
        document.getElementById('deposit-details').style.display = 'none';
        showView('deposit');
    }
}

function openGenericDeposit() {
    state.selectedPlan = { name: 'Generic Topup', price: 0 };
    const payAmt = document.getElementById('pay-required-amount');
    if (payAmt) payAmt.innerText = 'Topup';
    document.getElementById('deposit-details').style.display = 'none';
    showView('deposit');
}

function selectDeposit(network) {
    state.selectedNetwork = network;
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));
    const addr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const addrEl = document.getElementById('deposit-address');
    const qrEl = document.getElementById('qr-image');
    if (addrEl) addrEl.innerText = addr;
    if (qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${addr}`;
    document.getElementById('deposit-details').style.display = 'block';
}

async function confirmDeposit() {
    notify('🔄 Redirecting to secure gateway...', true);
    const amount = state.selectedPlan.price || 10.0;
    
    const networkMap = {
        'USDT (TRC-20)': 'usdttrc20',
        'USDT (BEP-20)': 'usdtbsc',
        'TON Coin': 'ton',
        'Bitcoin (BTC)': 'btc',
        'Ethereum (ETH)': 'eth',
        'Litecoin (LTC)': 'ltc',
        'Dogecoin (DOGE)': 'doge',
        'Solana (SOL)': 'sol',
        'BNB (Smart Chain)': 'bnbbsc',
        'TRX (Tron)': 'trx',
        'XRP (Ripple)': 'xrp',
        'Polygon (MATIC)': 'matic'
    };
    const payCurrency = networkMap[state.selectedNetwork] || 'usdttrc20';

    try {
        const token = state.user.token ? `Bearer ${state.user.token}` : `local_${state.user.user_id}`;
        const response = await fetch(`${API_URL}/create-payment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ amount: amount, network: payCurrency })
        });
        const data = await response.json();
        if (data.invoice_url) {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openLink(data.invoice_url);
            } else {
                window.open(data.invoice_url, '_blank');
            }
            addLog(state.user.username, 'Deposit', `Generated deposit link for $${amount}`);
        } else {
             // Local simulation if API fails
             setTimeout(() => {
                state.user.balance = Number(state.user.balance) + amount;
                updateWalletDisplay();
                const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
                const idx = users.findIndex(u => u.email === state.user.email);
                if (idx !== -1) { users[idx] = state.user; localStorage.setItem('registered_users', JSON.stringify(users)); }
                localStorage.setItem('session_user', JSON.stringify(state.user));
                addLog(state.user.username, 'Deposit', `Local simulation: Added $${amount} via ${state.selectedNetwork}`);
                notify('💰 Deposit Successful!', true);
                showView('home');
            }, 2000);
        }
    } catch (e) {
        notify('Redirecting failed. Using manual verification.');
    }
}

// --- AUTH ---
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    if (!email || !pass) return notify('Fill all fields');

    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        // admin login fallback
        const adminUser = { username: 'Admin', email, user_id: Date.now(), isAdmin: true, token: 'admin-token', balance: 0 };
        state.user = adminUser;
        localStorage.setItem('session_user', JSON.stringify(adminUser));
        addLog('Admin', 'Login', 'Admin logged in.');
        showMainApp();
        return;
    }

    notify('🔄 Securing session...', true);
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await response.json();
        
        if (response.ok) {
            const user = {
                user_id: data.user_id,
                username: data.username,
                email: data.email,
                balance: data.balance || 0,
                isAdmin: data.isAdmin,
                token: data.token
            };
            state.user = user;
            localStorage.setItem('session_user', JSON.stringify(user));
            addLog(user.username, 'Login', 'User logged in via backend.');
            showMainApp();
        } else {
            notify(data.detail || 'Invalid login!');
        }
    } catch (e) {
        notify('Network error. Try again.');
    }
}

async function handleRegister() {
    const user = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    if (!user || !email || !pass) return notify('Fill all fields');
    
    notify('🔄 Registering...', true);
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, email, password: pass })
        });
        const data = await response.json();
        
        if (response.ok) {
            notify('✨ Registered!', true);
            toggleAuth('login');
        } else {
            notify(data.detail || 'Registration failed');
        }
    } catch (e) {
        notify('Network error. Try again.');
    }
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    updateWalletDisplay();
    renderTools();
    // Show admin nav only for admin users
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) {
        adminNav.style.display = (state.user && state.user.isAdmin) ? 'flex' : 'none';
    }
    lucide.createIcons();
}

// --- ADMIN PANEL ---
const ADMIN_EMAIL = 'admin@2323gmail.com';
const ADMIN_PASS = 'admin11223344';

function openAdminPanel() {
    if (state.user && state.user.isAdmin) {
        showView('admin');
        loadAdminProducts();
    } else {
        notify('❌ Access Denied!');
    }
}

// Image file picker preview + upload on Save
document.addEventListener('DOMContentLoaded', () => {
    const imgInput = document.getElementById('admin-plan-image');
    if (imgInput) {
        imgInput.addEventListener('change', () => {
            const file = imgInput.files[0];
            if (!file) return;
            const preview = document.getElementById('admin-image-preview');
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        });
    }
});

async function uploadImageToCloudinary() {
    const fileInput = document.getElementById('admin-plan-image');
    const file = fileInput.files[0];
    if (!file) return document.getElementById('admin-image-url').value || null;

    notify('⬆️ Uploading image...', true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/admin/upload-image`, {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    if (data.url) {
        document.getElementById('admin-image-url').value = data.url;
        return data.url;
    }
    throw new Error('Image upload failed');
}

async function saveAdminPlan() {
    const planId = document.getElementById('admin-plan-id').value;
    const name = document.getElementById('admin-plan-name').value.trim();
    const price = document.getElementById('admin-plan-price').value.trim();
    const desc = document.getElementById('admin-plan-desc').value.trim();

    if (!name || !price) return notify('Name and price are required!');

    // Prevent multiple submissions
    const saveBtn = document.querySelector('button[onclick="saveAdminPlan()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";
    }

    try {
        let imageUrl = document.getElementById('admin-image-url').value;
        // Upload new image if a file was picked
        const fileInput = document.getElementById('admin-plan-image');
        if (fileInput.files[0]) {
            imageUrl = await uploadImageToCloudinary();
        }

        const payload = { name, price: parseFloat(price), description: desc, image_url: imageUrl };

        if (planId) {
            // Edit existing
            await fetch(`${API_URL}/admin/plans/${planId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            notify('✅ Product updated!', true);
        } else {
            // Create new
            await fetch(`${API_URL}/admin/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            notify('✅ Product created!', true);
        }

        clearAdminForm();
        loadAdminProducts();
        // Refresh home tools too
        await loadDynamicPlans();
        renderTools();
    } catch (e) {
        notify('Error: ' + e.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Product";
        }
    }
}

async function loadAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-dim)">Loading...</p>';
    try {
        const res = await fetch(`${API_URL}/plans`);
        const plans = await res.json();
        if (!plans.length) {
            container.innerHTML = '<p style="color:var(--text-dim)">No products yet.</p>';
            return;
        }
        container.innerHTML = plans.map(p => `
            <div class="tool-card" style="display:flex; align-items:center; gap:15px; padding:15px;">
                ${p.image_url ? `<img src="${p.image_url}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;flex-shrink:0;">` : `<div style="font-size:40px;width:60px;text-align:center;">${p.icon || '🤖'}</div>`}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700;">${p.name}</div>
                    <div style="color:var(--primary); font-weight:800;">$${p.price}</div>
                    <div style="color:var(--text-dim);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.description || ''}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button class="get-access-btn" style="font-size:12px;padding:8px 15px;" onclick='editAdminPlan(${JSON.stringify(p)})'>✏️ Edit</button>
                    <button class="get-access-btn" style="font-size:12px;padding:8px 15px;background:#ff4444;" onclick="deleteAdminPlan('${p.name}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<p style="color:#ff4444">Failed to load products.</p>';
    }
}

function editAdminPlan(plan) {
    document.getElementById('admin-plan-id').value = plan._id || '';
    document.getElementById('admin-plan-name').value = plan.name || '';
    document.getElementById('admin-plan-price').value = plan.price || '';
    document.getElementById('admin-plan-desc').value = plan.description || '';
    document.getElementById('admin-image-url').value = plan.image_url || '';
    const preview = document.getElementById('admin-image-preview');
    if (plan.image_url) {
        preview.src = plan.image_url;
        preview.style.display = 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteAdminPlan(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`${API_URL}/admin/plans/${encodeURIComponent(name)}`, { method: 'DELETE' });
    notify('🗑️ Deleted!', true);
    loadAdminProducts();
    await loadDynamicPlans();
    renderTools();
}

function clearAdminForm() {
    document.getElementById('admin-plan-id').value = '';
    document.getElementById('admin-plan-name').value = '';
    document.getElementById('admin-plan-price').value = '';
    document.getElementById('admin-plan-desc').value = '';
    document.getElementById('admin-plan-image').value = '';
    document.getElementById('admin-image-url').value = '';
    const preview = document.getElementById('admin-image-preview');
    preview.src = '';
    preview.style.display = 'none';
}

async function loadDynamicPlans() {
    try {
        const res = await fetch(`${API_URL}/plans`);
        const plans = await res.json();
        if (plans && plans.length > 0) {
            state.tools = plans.map(p => ({
                id: p._id,
                name: p.name,
                brand: p.brand || '',
                price: p.price,
                icon: p.icon || '🤖',
                desc: p.description || '',
                image_url: p.image_url || null
            }));
        }
    } catch(e) {
        // Keep default hardcoded tools if API fails
    }
}

// Init
const session = localStorage.getItem('session_user');
if (session) {
    state.user = JSON.parse(session);
    if (!state.user.token && !state.user.user_id) {
        localStorage.removeItem('session_user');
        state.user = null;
    } else {
        loadDynamicPlans().then(() => {
            showMainApp();
            // Handle URL params for direct view linking (e.g. from Telegram bot buttons)
            const urlParams = new URLSearchParams(window.location.search);
            const viewParam = urlParams.get('view');
            if (viewParam) {
                showView(viewParam);
            }
        });
    }
}
renderTools();
lucide.createIcons();
