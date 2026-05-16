const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

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

// --- CORE FUNCTIONS ---
function notify(msg, isSuccess = false) {
    const el = document.getElementById('notification');
    el.innerText = msg;
    el.style.borderLeft = isSuccess ? '5px solid #10b981' : '5px solid #ef4444';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
    if (isSuccess) tg.HapticFeedback.notificationOccurred('success');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- AUTH ---
function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
}

function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!username || !email || !password) { notify('All fields required!'); return; }

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    if (users.find(u => u.email === email)) { notify('Email already registered!'); return; }

    users.push({ username, email, password, balance: 0.00 });
    localStorage.setItem('registered_users', JSON.stringify(users));
    notify('✨ Registered! Please login.', true);
    toggleAuth('login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        state.user = user;
        localStorage.setItem('session_user', JSON.stringify(user));
        notify('🚀 Welcome back!', true);
        showMainApp();
    } else {
        notify('Invalid credentials!');
    }
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    updateWalletDisplay();
    showView('home');
}

function updateWalletDisplay() {
    document.getElementById('display-balance').innerText = `$${state.user.balance.toFixed(2)}`;
}

// --- PURCHASE FLOW ---
function checkAccess(name, price) {
    state.selectedPlan = { name, price };
    
    if (state.user.balance >= price) {
        // Sufficient Balance -> Show Checkout
        document.getElementById('checkout-item-name').innerText = name;
        document.getElementById('checkout-total').innerText = `$${price}`;
        showView('checkout');
    } else {
        // Insufficient Balance -> Show Deposit
        showView('deposit');
        notify('Insufficient funds! Please deposit first.');
    }
}

function selectDeposit(network) {
    state.selectedNetwork = network;
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));
    const addrs = { 
        'USDT (TRC-20)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'TON Coin': 'UQBQgv17Q6L5HQd3VbD1upQHtJaFMJd0RJy8jPPC7z7wMZA-',
        'Bitcoin (BTC)': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    };
    document.getElementById('deposit-address').innerText = addrs[network] || 'TQ...GENERIC_ADDR';
    document.getElementById('deposit-details').style.display = 'block';
}

function confirmDeposit() {
    notify('✅ Deposit request sent! Balance will update after verification.', true);
    // In real app, call NOWPayments IPN or check balance via API
    setTimeout(() => showView('home'), 2000);
}

function processOrder() {
    // Deduct balance
    state.user.balance -= state.selectedPlan.price;
    updateWalletDisplay();
    
    // Add to orders
    const order = {
        id: Math.floor(Math.random()*10000),
        item: state.selectedPlan.name,
        price: state.selectedPlan.price,
        status: 'Delivered',
        date: new Date().toLocaleDateString()
    };
    state.orders.unshift(order);
    
    notify('🛒 Purchase Successful!', true);
    setTimeout(() => {
        showView('orders');
        renderOrders();
    }, 1000);
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = state.orders.length ? state.orders.map(o => `
        <div class="tool-card" style="margin-bottom: 12px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin-bottom: 4px;">${o.item}</h4>
                    <p style="font-size: 12px; color: var(--text-dim);">Order #${o.id} • ${o.date}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; font-size: 16px;">$${o.price}</div>
                    <div style="font-size: 12px; color: #10b981; font-weight: 700;">${o.status}</div>
                </div>
            </div>
        </div>
    `).join('') : '<div style="text-align: center; padding: 50px; color: var(--text-dim);">No orders found.</div>';
}

function renderTools() {
    const list = document.getElementById('tools-list');
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card" onclick="checkAccess('${tool.name}', ${tool.price})">
            <div class="tool-header">
                <div class="tool-icon">${tool.icon}</div>
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

function copyAddress() {
    const addr = document.getElementById('deposit-address').innerText;
    navigator.clipboard.writeText(addr).then(() => notify('📋 Address copied!', true));
}

// Init
const session = localStorage.getItem('session_user');
if (session) {
    state.user = JSON.parse(session);
    showMainApp();
}
renderTools();
lucide.createIcons();
