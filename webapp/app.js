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

// --- CUSTOM NOTIFICATIONS ---
function notify(msg, isSuccess = false) {
    const el = document.getElementById('notification');
    el.innerText = msg;
    el.style.borderLeft = isSuccess ? '5px solid #10b981' : '5px solid #ef4444';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

// --- AUTH LOGIC ---
function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
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

    notify('✨ Registration Successful! Please login.', true);
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
        notify('Invalid email or password!');
    }
}

function handleLogout() {
    localStorage.removeItem('session_user');
    state.user = null;
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('screen-auth').classList.add('active');
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTools() {
    const list = document.getElementById('tools-list');
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card" onclick="openCheckout('${tool.name}', ${tool.price})">
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
}

function copyAddress() {
    navigator.clipboard.writeText(document.getElementById('wallet-address').innerText).then(() => notify('📋 Address copied!', true));
}

function confirmPayment() {
    notify('✅ Payment confirmed! Your order is being verified.', true);
    setTimeout(() => showView('home'), 2000);
}

init();
