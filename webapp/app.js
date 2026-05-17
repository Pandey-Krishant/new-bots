const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// --- CONFIGURATION ---
const ADMIN_BOT_TOKEN = "8728790870:AAGZZqVttTR3mQZFfXMtR3sdRlcVSbTHiRc";
const ADMIN_CHAT_ID = "1661187898"; 
const API_URL = "https://new-bots.vercel.app/api"; // Defaulting to Vercel deployment URL if running there, or change to localhost for dev

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
    

    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function toggleAuth(type) {
    document.getElementById('form-login').style.display = type === 'register' ? 'none' : 'block';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
}

function updateWalletDisplay() {
    if (state.user) {
        const bal = `$${Number(state.user.balance).toFixed(2)}`;
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
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    if (!email || !pass) return notify('Fill all fields');

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => u.email === email && u.password === pass);
    
    if (user) {
        notify('🔄 Securing session...', true);
        
        // Fix for legacy accounts missing user_id
        if (!user.user_id) {
            user.user_id = Math.floor(Math.random() * 100000000);
            localStorage.setItem('registered_users', JSON.stringify(users));
        }
        
        // Fetch secure token for checkout
        fetch(`${API_URL}/get-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, username: user.username })
        })
        .then(res => res.json())
        .then(data => {
            user.token = data.token;
            state.user = user;
            localStorage.setItem('session_user', JSON.stringify(user));
            addLog(user.username, 'Login', `User logged in locally.`);
            showMainApp();
        })
        .catch(() => {
            notify('Error securing session. Try again.');
        });
    } else {
        notify('Invalid login!');
    }
}

function handleRegister() {
    const user = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    if (!user || !email || !pass) return notify('Fill all fields');
    
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    if (users.find(u => u.email === email)) return notify('Email already exists');
    
    const user_id = Math.floor(Math.random() * 100000000);
    users.push({ username: user, email, password: pass, balance: 0, user_id: user_id });
    localStorage.setItem('registered_users', JSON.stringify(users));
    addLog(user, 'Registration', `New account created locally.`);
    notify('✨ Registered!', true);
    toggleAuth('login');
}

function showMainApp() {
    document.getElementById('screen-auth').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    updateWalletDisplay();
    renderTools();
    lucide.createIcons();
}

// Init
const session = localStorage.getItem('session_user');
if (session) {
    state.user = JSON.parse(session);
    // Force re-login if using legacy local session without a token (unless API is down and they rely on fallback)
    if (!state.user.token && !state.user.user_id) {
        localStorage.removeItem('session_user');
        state.user = null;
    } else {
        showMainApp();
    }
}
renderTools();
lucide.createIcons();
