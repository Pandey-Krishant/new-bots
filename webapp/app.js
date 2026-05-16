const tg = window.Telegram.WebApp;

// Initialize Telegram WebApp
tg.expand();
tg.ready();

// Sync Theme with Telegram
document.documentElement.style.setProperty('--primary', tg.themeParams.button_color || '#8b5cf6');
document.documentElement.style.setProperty('--bg-dark', tg.themeParams.bg_color || '#020617');
document.documentElement.style.setProperty('--text-main', tg.themeParams.text_color || '#f8fafc');

// Global Buy Function
window.setupMainButton = function(planName, price) {
    tg.HapticFeedback.impactOccurred('medium');
    
    tg.MainButton.text = `PROCEED TO PAY $${price}`;
    tg.MainButton.show();
    
    // Smooth scroll to top when button shows
    window.scrollTo({ top: 0, behavior: 'smooth' });

    tg.MainButton.onClick(() => {
        tg.sendData(JSON.stringify({
            action: 'buy',
            item: planName,
            price: price,
            timestamp: new Date().toISOString()
        }));
        tg.close(); // Close webapp after sending data
    });
};

// Navigation Interactivity
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        tg.HapticFeedback.selectionChanged();
    });
});

// Log for Debugging
console.log('Premium WebApp V2 Loaded');
