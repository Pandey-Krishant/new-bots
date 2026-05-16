const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// State Management
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

// --- INITIALIZATION ---
function init() {
    // Check if user is already "logged in" via localStorage
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
        state.user = JSON.parse(savedUser);
        showMainApp();
    }
    
    renderTools();
    lucide.createIcons();
}

// --- AUTHENTICATION ---
function handleLogin() {
    const usernameInput = document.getElementById('login-username').value;
    if (!usernameInput) {
        tg.showAlert('Please enter your Username or Telegram ID');
        return;
    }

    // Simulate login
    state.user = {
        username: usernameInput.startsWith('@') ? usernameInput : '@' + usernameInput,
        balance: 0.00
    };

    localStorage.setItem('app_user', JSON.stringify(state.user));
    tg.HapticFeedback.notificationOccurred('success');
    showMainApp();
}

function handleLogout() {
    localStorage.removeItem('app_user');
    state.user = null;
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('screen-login').classList.add('active');
    tg.HapticFeedback.impactOccurred('medium');
}

function showMainApp() {
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('display-username').innerText = state.user.username;
    showView('home');
}

// --- ROUTING ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`screen-${viewId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    state.currentView = viewId;
    tg.HapticFeedback.selectionChanged();
}

// --- UI RENDERING ---
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
                <button class="buy-btn" onclick="openCheckout('${tool.name}', ${tool.price})">Get Access</button>
            </div>
        </div>
    `).join('');
}

// --- CHECKOUT LOGIC ---
function openCheckout(name, price) {
    state.selectedPlan = { name, price };
    document.getElementById('checkout-item-name').innerText = name;
    document.getElementById('checkout-total').innerText = `$${price}`;
    document.getElementById('payment-details').style.display = 'none';
    
    // Clear selection
    document.querySelectorAll('.net-btn').forEach(b => b.classList.remove('selected'));
    state.selectedNetwork = null;

    showView('checkout');
}

function selectNetwork(network) {
    state.selectedNetwork = network;
    tg.HapticFeedback.impactOccurred('light');

    document.querySelectorAll('.net-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.innerText === network);
    });

    // Mock Address Generation (In real app, fetch from NOWPayments or Backend)
    const mockAddresses = {
        'TON Coin': 'UQBQgv17Q6L5HQd3VbD1upQHtJaFMJd0RJy8jPPC7z7wMZA-',
        'Bitcoin (BTC)': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        'USDT (TRC-20)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    };

    document.getElementById('pay-amount').innerText = `$${state.selectedPlan.price}`;
    document.getElementById('pay-network').innerText = network;
    document.getElementById('wallet-address').innerText = mockAddresses[network] || 'GENERIC_WALLET_ADDRESS_HERE';
    document.getElementById('payment-details').style.display = 'block';
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function copyAddress() {
    const addr = document.getElementById('wallet-address').innerText;
    navigator.clipboard.writeText(addr).then(() => {
        tg.showAlert('Address copied to clipboard!');
        tg.HapticFeedback.notificationOccurred('success');
    });
}

function confirmPayment() {
    tg.showConfirm('Have you sent the payment?', (ok) => {
        if (ok) {
            const newOrder = {
                id: Math.floor(Math.random() * 10000),
                item: state.selectedPlan.name,
                status: 'Pending',
                price: state.selectedPlan.price
            };
            state.orders.unshift(newOrder);
            tg.showAlert('Payment submitted! Verification usually takes 1-6 hours.');
            showView('orders');
            renderOrders();
        }
    });
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (state.orders.length === 0) {
        list.innerHTML = '<div class="empty-state">No orders found.</div>';
        return;
    }

    list.innerHTML = state.orders.map(order => `
        <div class="tool-card" style="margin-bottom: 12px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="font-size: 14px;">Order #${order.id}</h4>
                    <p style="font-size: 12px; color: var(--text-dim);">${order.item}</p>
                </div>
                <div style="text-align: right;">
                    <p style="color: var(--primary); font-weight: 700;">$${order.price}</p>
                    <span style="font-size: 10px; padding: 4px 8px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-radius: 6px;">${order.status}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Start the app
init();
