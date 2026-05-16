const tg = window.Telegram.WebApp;

// Initialize Telegram WebApp
tg.expand();
tg.ready();

// Color scheme handling
document.documentElement.style.setProperty('--primary', tg.themeParams.button_color || '#8b5cf6');
document.documentElement.style.setProperty('--bg-dark', tg.themeParams.bg_color || '#0f172a');
document.documentElement.style.setProperty('--text-main', tg.themeParams.text_color || '#f8fafc');
document.documentElement.style.setProperty('--bg-card', tg.themeParams.secondary_bg_color || 'rgba(30, 41, 59, 0.7)');

// Main Button handling
function setupMainButton(planName, price) {
    tg.MainButton.text = `Buy ${planName} - $${price}`;
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
        tg.sendData(JSON.stringify({
            action: 'buy',
            item: planName,
            price: price
        }));
    });
}

// Navigation handling
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Haptic feedback
        tg.HapticFeedback.impactOccurred('light');
    });
});

// Example function to show plans
function showPlans(category) {
    console.log(`Showing plans for ${category}`);
    tg.HapticFeedback.selectionChanged();
    
    // In a real app, you would filter the list or navigate to a new view
    tg.showAlert(`Coming soon: ${category.toUpperCase()} plans are being updated!`);
}

// Handle Buy Button clicks in the UI
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setupMainButton('ChatGPT Plus', 19.99);
    });
});

console.log('WebApp Initialized for user:', tg.initDataUnsafe.user?.username);
