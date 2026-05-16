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

// --- AUTH LOGIC ---
function toggleAuth(type) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    
    if (type === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function handleRegister() {
    console.log("Attempting Registration...");
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!username || !email || !password) {
        tg.showAlert('All fields are required!');
        return;
    }

    try {
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        if (users.find(u => u.email === email)) {
            tg.showAlert('User with this email already exists!');
            return;
        }

        const newUser = { username, email, password, balance: 0.00 };
        users.push(newUser);
        localStorage.setItem('registered_users', JSON.stringify(users));

        console.log("Registration Successful for:", email);
        tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('Registration successful! Please login.');
        toggleAuth('login');
    } catch (e) {
        console.error("Registration Error:", e);
        tg.showAlert('Error during registration. Please try again.');
    }
}

function handleLogin() {
    console.log("Attempting Login...");
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        tg.showAlert('Please fill in all fields');
        return;
    }

    try {
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            state.user = user;
            localStorage.setItem('session_user', JSON.stringify(user));
            tg.HapticFeedback.notificationOccurred('success');
            showMainApp();
        } else {
            tg.showAlert('Invalid email or password!');
        }
    } catch (e) {
        console.error("Login Error:", e);
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
        try {
            state.user = JSON.parse(session);
            showMainApp();
        } catch (e) {
            localStorage.removeItem('session_user');
        }
    }
    renderTools();
    lucide.createIcons();
}

// --- ROUTING & UI ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`screen-${viewId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    tg.HapticFeedback.selectionChanged();
    if (viewId === 'orders') renderOrders();
}

function renderTools() {
    const list = document.getElementById('tools-list');
    if (!list) return;
    list.innerHTML = state.tools.map(tool => `
        <div class="tool-card">
            <div class="tool-header">
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-title"><h4>${tool.name}</h4></div>
            </div>
            <p class="tool-desc">${tool.desc}</p>
            <div class="tool-footer">
                <div class="price-tag">$${tool.price}</div>
                <button class="buy-btn" onclick="openCheckout('${tool.name}', ${tool.price})">Get Access</button>
            </div>
        </div>
    `).join('');
}

// --- CHECKOUT & PAYMENTS ---
function openCheckout(name, price) {
    state.selectedPlan = { name, price };
    document.getElementById('checkout-item-name').innerText = name;
    document.getElementById('checkout-total').innerText = `$${price}`;
    document.getElementById('payment-details').style.display = 'none';
    document.querySelectorAll('.net-btn').forEach(b => b.classList.remove('selected'));
    showView('checkout');
}

function selectNetwork(network) {
    state.selectedNetwork = network;
    tg.HapticFeedback.impactOccurred('light');
    document.querySelectorAll('.net-btn').forEach(btn => btn.classList.toggle('selected', btn.innerText === network));

    // In a real app with NOWPayments, you would call your API here to generate a payment address
    // Example: fetch('/api/create-payment', { method: 'POST', body: JSON.stringify({ network, amount: state.selectedPlan.price }) })
    
    const mockAddresses = {
        'TON Coin': 'UQBQgv17Q6L5HQd3VbD1upQHtJaFMJd0RJy8jPPC7z7wMZA-',
        'Bitcoin (BTC)': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        'USDT (TRC-20)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    };

    document.getElementById('pay-amount').innerText = `$${state.selectedPlan.price}`;
    document.getElementById('pay-network').innerText = network;
    document.getElementById('wallet-address').innerText = mockAddresses[network] || 'TQ...WALLET_ADDR';
    document.getElementById('payment-details').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function copyAddress() {
    const addr = document.getElementById('wallet-address').innerText;
    navigator.clipboard.writeText(addr).then(() => {
        tg.showAlert('Address copied!');
        tg.HapticFeedback.notificationOccurred('success');
    });
}

function confirmPayment() {
    tg.showConfirm('Confirm payment sent?', (ok) => {
        if (ok) {
            const order = { id: Math.floor(Math.random()*10000), item: state.selectedPlan.name, status: 'Pending', price: state.selectedPlan.price };
            state.orders.unshift(order);
            showView('orders');
        }
    });
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    list.innerHTML = state.orders.length ? state.orders.map(o => `
        <div class="tool-card" style="margin-bottom: 12px; padding: 15px;">
            <div style="display: flex; justify-content: space-between;">
                <div><h4>Order #${o.id}</h4><p>${o.item}</p></div>
                <div style="text-align: right;"><p>$${o.price}</p><span style="color: var(--warning);">${o.status}</span></div>
            </div>
        </div>
    `).join('') : '<div class="empty-state">No orders yet.</div>';
}

init();
