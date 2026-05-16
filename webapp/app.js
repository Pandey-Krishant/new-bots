const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000"; 

// State
const state = {
    user: null,
    currentView: 'home',
    selectedPlan: null,
    selectedNetwork: null,
    currentTransaction: null,
    tools: [
        { id: 1, name: 'ChatGPT Pro', brand: 'by OpenAI', price: 19.99, icon: '🤖', desc: 'Unlock GPT-4o, advanced data analysis, and private workspace.' },
        { id: 2, name: 'Midjourney', brand: 'Design', price: 29.99, icon: '🎨', desc: 'The world\'s best AI image generator. High-speed GPU hours included.' },
        { id: 3, name: 'Claude Pro', brand: 'by Anthropic', price: 20.00, icon: '🧠', desc: 'Access Claude 3.5 Sonnet and Opus with 5x higher usage limits.' },
        { id: 4, name: 'Gemini Ultra', brand: 'by Google', price: 19.99, icon: '⚡', desc: 'Google\'s most capable AI model for highly complex tasks.' },
        { id: 5, name: 'Perplexity Pro', brand: 'Search', price: 20.00, icon: '🔍', desc: 'Pro Search, file uploads, and choice of AI models (Claude/GPT).' },
        { id: 10, name: 'Canva Pro', brand: 'Design', price: 12.99, icon: '✨', desc: 'Unlimited premium content, Magic Studio, and brand tools.' }
    ],
    orders: []
};

// --- CORE FUNCTIONS ---
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateWalletDisplay() {
    if (state.user) {
        const bal = `$${state.user.balance.toFixed(2)}`;
        document.getElementById('display-balance').innerText = bal;
        document.getElementById('home-balance').innerText = bal;
        document.getElementById('home-username').innerText = `@${state.user.username}`;
    }
}

// --- PAYMENT FLOW ---
async function checkAccess(name, price) {
    state.selectedPlan = { name, price };
    if (state.user && state.user.balance >= price) {
        document.getElementById('checkout-item-name').innerText = name;
        document.getElementById('checkout-total').innerText = `$${price}`;
        showView('checkout');
        return;
    }
    
    // Switch to Internal Payment Interface (Deposit)
    document.getElementById('pay-required-amount').innerText = `$${price}`;
    document.getElementById('deposit-pay-amount').innerText = `$${price}`;
    document.getElementById('deposit-details').style.display = 'none';
    showView('deposit');
    notify('Please select a payment network.');
}

function selectDeposit(network) {
    state.selectedNetwork = network;
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));
    
    const addrs = { 
        'USDT (TRC-20)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'USDT (BEP-20)': '0x9999999999999999999999999999999999999999',
        'USDT (ERC-20)': '0x1234567890abcdef1234567890abcdef12345678',
        'USDT (Aptos)': '0x5555555555555555555555555555555555555555',
        'TON Coin': 'UQBQgv17Q6L5HQd3VbD1upQHtJaFMJd0RJy8jPPC7z7wMZA-',
        'Bitcoin (BTC)': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        'Ethereum (ETH)': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        'Solana (SOL)': 'So11111111111111111111111111111111111111112',
        'Litecoin (LTC)': 'L666666666666666666666666666666666',
        'Tron (TRX)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    };
    
    const addr = addrs[network] || 'TQ...WALLET_ADDR';
    state.currentTransaction = { id: 'NP_' + Date.now(), amount: state.selectedPlan.price };

    document.getElementById('deposit-net-name').innerText = network;
    document.getElementById('deposit-address').innerText = addr;
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${addr}`;
    document.getElementById('deposit-details').style.display = 'block';
    tg.HapticFeedback.impactOccurred('medium');
}

function confirmDeposit() {
    notify('🔄 Verifying your payment...', true);
    setTimeout(() => {
        state.user.balance += state.currentTransaction.amount;
        updateWalletDisplay();
        localStorage.setItem('session_user', JSON.stringify(state.user));
        notify('💰 Balance updated! You can now access your tool.', true);
        showView('home');
    }, 2500);
}

function processOrder() {
    state.user.balance -= state.selectedPlan.price;
    updateWalletDisplay();
    localStorage.setItem('session_user', JSON.stringify(state.user));
    state.orders.unshift({ id: Math.floor(Math.random()*10000), item: state.selectedPlan.name, price: state.selectedPlan.price, status: 'Delivered', date: new Date().toLocaleDateString() });
    notify('🛒 Order Success!', true);
    setTimeout(() => { showView('orders'); renderOrders(); }, 1000);
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = state.orders.length ? state.orders.map(o => `
        <div class="tool-card" style="margin-bottom: 12px; padding: 20px; cursor: default;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div><h4>${o.item}</h4><p style="font-size: 11px; color: var(--text-dim);">Order #${o.id}</p></div>
                <div style="text-align: right;"><p style="font-weight: 800;">$${o.price}</p><p style="color: #10b981; font-size: 11px; font-weight: 700;">${o.status}</p></div>
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
                <div class="tool-title"><h4>${tool.name}</h4><p>${tool.brand}</p></div>
            </div>
            <p class="tool-desc">${tool.desc}</p>
            <div class="tool-footer"><div class="price-tag">$${tool.price}</div><button class="get-access-btn">Get Access</button></div>
        </div>
    `).join('');
}

function copyAddress() {
    navigator.clipboard.writeText(document.getElementById('deposit-address').innerText).then(() => notify('📋 Address copied!', true));
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) { state.user = user; localStorage.setItem('session_user', JSON.stringify(user)); showMainApp(); }
    else notify('Invalid credentials!');
}

function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    if (!username || !email || !password) return;
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    users.push({ username, email, password, balance: 0.00 });
    localStorage.setItem('registered_users', JSON.stringify(users));
    notify('✨ Registered!', true);
    toggleAuth('login');
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    updateWalletDisplay();
    showView('home');
}

function openGenericDeposit() {
    state.selectedPlan = { name: 'Wallet Deposit', price: 50 };
    document.getElementById('pay-required-amount').innerText = '$50.00';
    document.getElementById('deposit-details').style.display = 'none';
    showView('deposit');
}

const session = localStorage.getItem('session_user');
if (session) { state.user = JSON.parse(session); showMainApp(); }
renderTools();
lucide.createIcons();
