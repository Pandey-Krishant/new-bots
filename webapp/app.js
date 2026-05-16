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
        { id: 1, name: 'ChatGPT Pro', price: 19.99, icon: '🤖', desc: 'GPT-4o & DALL-E 3 access.' },
        { id: 2, name: 'Midjourney', price: 29.99, icon: '🎨', desc: 'AI Image generation v6.' },
        { id: 3, name: 'Claude Pro', price: 20.00, icon: '🧠', desc: 'Anthropic\'s most powerful model.' },
        { id: 4, name: 'Gemini Ultra', price: 19.99, icon: '⚡', desc: 'Google Capability model.' }
    ],
    orders: []
};

// --- CUSTOM NOTIFICATIONS (3D Popup) ---
function notify(msg, isSuccess = false) {
    const el = document.getElementById('notification');
    el.innerText = msg;
    el.style.borderColor = isSuccess ? '#10b981' : '#a855f7';
    el.style.boxShadow = isSuccess ? '0 20px 40px -10px rgba(16, 185, 129, 0.4)' : '0 20px 40px -10px rgba(168, 85, 247, 0.4)';
    
    el.classList.add('show');
    tg.HapticFeedback.notificationOccurred(isSuccess ? 'success' : 'warning');
    
    setTimeout(() => el.classList.remove('show'), 3500);
}

// --- AUTH LOGIC ---
function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
    tg.HapticFeedback.impactOccurred('light');
}

function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!username || !email || !password) {
        notify('All fields are required!');
        return;
    }

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    if (users.find(u => u.email === email)) {
        notify('Email already registered!');
        return;
    }

    users.push({ username, email, password, balance: 0.00 });
    localStorage.setItem('registered_users', JSON.stringify(users));

    // Success Popup
    notify('✨ Registration Successful! Welcome to the future.', true);
    setTimeout(() => toggleAuth('login'), 1500);
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        notify('Please fill in all fields');
        return;
    }

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        state.user = user;
        localStorage.setItem('session_user', JSON.stringify(user));
        notify('🚀 Login Successful!', true);
        setTimeout(showMainApp, 800);
    } else {
        notify('Invalid credentials! Check your email/pass.');
    }
}

function handleLogout() {
    localStorage.removeItem('session_user');
    state.user = null;
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('screen-auth').classList.add('active');
    tg.HapticFeedback.impactOccurred('medium');
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('display-username').innerText = state.user.username;
    document.getElementById('display-balance').innerText = `$${state.user.balance.toFixed(2)}`;
    showView('home');
}

// --- INITIALIZATION ---
function init() {
    const session = localStorage.getItem('session_user');
    if (session) {
        state.user = JSON.parse(session);
        showMainApp();
    }
    renderTools();
    lucide.createIcons();
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');
    tg.HapticFeedback.selectionChanged();
}

function renderTools() {
    const list = document.getElementById('tools-list');
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card">
            <div class="tool-header">
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-title"><h4>${tool.name}</h4></div>
            </div>
            <p class="tool-desc">${tool.desc}</p>
            <div class="tool-footer">
                <div class="price-tag">$${tool.price}</div>
                <button class="buy-btn" onclick="openCheckout('${tool.name}', ${tool.price})">Buy</button>
            </div>
        </div>
    `).join('');
}

function openCheckout(name, price) {
    state.selectedPlan = { name, price };
    document.getElementById('checkout-item-name').innerText = name;
    document.getElementById('checkout-total').innerText = `$${price}`;
    document.getElementById('payment-details').style.display = 'none';
    showView('checkout');
}

function selectNetwork(network) {
    state.selectedNetwork = network;
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));
    const mockAddresses = { 'TON Coin': 'UQBQgv17Q6L5HQd3VbD1upQHtJaFMJd0RJy8jPPC7z7wMZA-', 'Bitcoin (BTC)': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' };
    document.getElementById('pay-amount').innerText = `$${state.selectedPlan.price}`;
    document.getElementById('pay-network').innerText = network;
    document.getElementById('wallet-address').innerText = mockAddresses[network] || 'TQ...WALLET_ADDR';
    document.getElementById('payment-details').style.display = 'block';
    tg.HapticFeedback.impactOccurred('medium');
}

function copyAddress() {
    navigator.clipboard.writeText(document.getElementById('wallet-address').innerText).then(() => notify('📋 Address copied!', true));
}

init();
