// ==================== SERVICE WORKER (PWA INSTALL SUPPORT) ====================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service worker registered'))
        .catch(err => console.error('Service worker registration failed:', err));
}

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });
}

// ==================== ACTIVE NAV LINK ====================
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
        link.classList.add('active');
    }
});

// ==================== SUPABASE CLIENT ====================
// Wait for supabase-config.js to load
let supabaseClient;

function initSupabase() {
    if (typeof db !== 'undefined') {
        supabaseClient = db;
        console.log('Supabase client ready');
        return true;
    }
    console.warn('db not ready, waiting...');
    return false;
}

// Try to init, retry if needed
if (!initSupabase()) {
    setTimeout(initSupabase, 500);
}

// ==================== DARK MODE TOGGLE ====================
const darkToggle = document.getElementById('darkToggle');
const darkIcon = document.getElementById('darkIcon');

if (darkToggle && darkIcon) {
    console.log('Dark toggle found!'); // Debug

    // Check saved preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkIcon.src = 'icons/sun-icon.png';
        darkIcon.alt = 'Light Mode';
    }

    darkToggle.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            darkIcon.src = 'icons/sun-icon.png';
            darkIcon.alt = 'Light Mode';
            localStorage.setItem('darkMode', 'enabled');
            console.log('Dark mode enabled');
        } else {
            darkIcon.src = 'icons/moon-icon.png';
            darkIcon.alt = 'Dark Mode';
            localStorage.setItem('darkMode', 'disabled');
            console.log('Dark mode disabled');
        }
    });
}

// ==================== CONTACT FORM - SAVE TO SUPABASE ====================
const contactForm = document.getElementById('contactForm');
const successMessage = document.getElementById('successMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        // ✅ PREVENT PAGE REFRESH
        e.preventDefault();

        console.log('Contact form submitted');

        // Get form fields
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const program = document.getElementById('program');
        const message = document.getElementById('message');

        // Get error elements
        const nameError = document.getElementById('nameError');
        const emailError = document.getElementById('emailError');
        const messageError = document.getElementById('messageError');

        // Reset errors
        if (nameError) nameError.classList.remove('visible');
        if (emailError) emailError.classList.remove('visible');
        if (messageError) messageError.classList.remove('visible');

        let isValid = true;

        // Validate Name
        if (!name || name.value.trim().length < 2) {
            if (nameError) nameError.classList.add('visible');
            isValid = false;
        }

        // Validate Email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email.value.trim())) {
            if (emailError) emailError.classList.add('visible');
            isValid = false;
        }

        // Validate Message
        if (!message || message.value.trim().length < 10) {
            if (messageError) messageError.classList.add('visible');
            isValid = false;
        }

        if (!isValid) return;

        // Save to Supabase
        try {
            console.log('Saving to Supabase...');
            
            const { data, error } = await supabaseClient
                .from('contact_messages')
                .insert([{
                    name: name.value.trim(),
                    email: email.value.trim(),
                    phone: phone ? phone.value.trim() || null : null,
                    program: program ? program.value || null : null,
                    message: message.value.trim()
                }]);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Message saved successfully:', data);

            // Show success
            if (successMessage) {
                successMessage.classList.add('visible');
            }
            contactForm.reset();

            // Hide success after 5 seconds
            setTimeout(() => {
                if (successMessage) {
                    successMessage.classList.remove('visible');
                }
            }, 5000);

        } catch (error) {
            console.error('Error saving message:', error);
            alert('Sorry, there was an error sending your message. Please try again.');
        }
    });
}

// ==================== NEWSLETTER SUBSCRIPTION - SAVE TO SUPABASE ====================
// This handles both the old 'subscribeForm' (if it exists) and the new 'newsletterForm'

document.addEventListener('DOMContentLoaded', function() {
    // Handle the new footer form (newsletterForm)
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');
    const newsletterNote = document.getElementById('newsletterNote');

    if (newsletterForm && newsletterEmail && newsletterNote) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = newsletterEmail.value.trim();

            // Validate email
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                newsletterNote.textContent = 'Please enter a valid email address.';
                newsletterNote.className = 'newsletter-note error';
                return;
            }

            const button = newsletterForm.querySelector('button[type="submit"]');
            if (button) {
                button.disabled = true;
                button.textContent = 'Subscribing…';
            }

            try {
                const { data, error } = await supabaseClient
                    .from('subscribers')
                    .insert([{ email: email, status: 'active' }]);

                if (error) {
                    if (error.code === '23505') {
                        newsletterNote.textContent = 'That address is already on the list.';
                        newsletterNote.className = 'newsletter-note success';
                    } else {
                        throw error;
                    }
                } else {
                    newsletterNote.textContent = '✅ You are subscribed!';
                    newsletterNote.className = 'newsletter-note success';
                    newsletterForm.reset();
                }

            } catch (error) {
                console.error('Error subscribing:', error);
                newsletterNote.textContent = 'Something went wrong. Please try again.';
                newsletterNote.className = 'newsletter-note error';
            }

            if (button) {
                button.disabled = false;
                button.textContent = 'Subscribe';
            }

            // Clear message after 5 seconds
            setTimeout(() => {
                newsletterNote.textContent = '';
                newsletterNote.className = 'newsletter-note';
            }, 5000);
        });
    }

    // Handle the old form (subscribeForm) - keep for backwards compatibility
    const subscribeForm = document.getElementById('subscribeForm');
    const subscribeEmail = document.getElementById('subscribeEmail');
    const subscribeMessage = document.getElementById('subscribeMessage');

    if (subscribeForm && subscribeEmail && subscribeMessage) {
        subscribeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = subscribeEmail.value.trim();

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                subscribeMessage.textContent = 'Please enter a valid email address.';
                subscribeMessage.className = 'subscribe-message error';
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('subscribers')
                    .insert([{ email: email }]);

                if (error) {
                    if (error.code === '23505') {
                        subscribeMessage.textContent = 'You are already subscribed!';
                        subscribeMessage.className = 'subscribe-message success';
                    } else {
                        throw error;
                    }
                } else {
                    subscribeMessage.textContent = '✅ Thank you for subscribing! You\'ll receive our latest news.';
                    subscribeMessage.className = 'subscribe-message success';
                    subscribeForm.reset();
                }

            } catch (error) {
                console.error('Error subscribing:', error);
                subscribeMessage.textContent = 'Sorry, there was an error. Please try again.';
                subscribeMessage.className = 'subscribe-message error';
            }

            setTimeout(() => {
                subscribeMessage.textContent = '';
                subscribeMessage.className = 'subscribe-message';
            }, 5000);
        });
    }
});

// ==================== UNSUBSCRIBE FUNCTION ====================
// Check if there's an unsubscribe parameter in the URL
function checkUnsubscribe() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('unsubscribe');
    
    if (email) {
        const message = document.getElementById('subscribeMessage');
        if (message) {
            message.innerHTML = `
                <p>Are you sure you want to unsubscribe <strong>${email}</strong>?</p>
                <button onclick="confirmUnsubscribe('${email}')" class="btn btn-primary" style="margin-top:10px;">Yes, Unsubscribe</button>
                <button onclick="cancelUnsubscribe()" class="btn btn-outline" style="margin-top:10px;">Cancel</button>
            `;
            message.className = 'subscribe-message';
        }
    }
}

async function confirmUnsubscribe(email) {
    try {
        const { error } = await supabaseClient
            .from('subscribers')
            .update({ status: 'unsubscribed' })
            .eq('email', email);

        if (error) throw error;

        const message = document.getElementById('subscribeMessage');
        if (message) {
            message.innerHTML = `
                <p style="color: green;">✅ You have been unsubscribed from our newsletter.</p>
                <p>You can resubscribe at any time using the form above.</p>
            `;
            message.className = 'subscribe-message success';
        }

    } catch (error) {
        console.error('Error unsubscribing:', error);
        const message = document.getElementById('subscribeMessage');
        if (message) {
            message.innerHTML = `<p style="color: red;">❌ Error unsubscribing. Please try again.</p>`;
            message.className = 'subscribe-message error';
        }
    }
}

function cancelUnsubscribe() {
    const message = document.getElementById('subscribeMessage');
    if (message) {
        message.innerHTML = '';
        message.className = 'subscribe-message';
    }
    window.history.pushState({}, document.title, window.location.pathname);
}

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    checkUnsubscribe();
});

// ==================== GALLERY LIGHTBOX ====================
const galleryItems = document.querySelectorAll('.gallery-item');
const overlay = document.createElement('div');
overlay.className = 'gallery-overlay';
document.body.appendChild(overlay);

galleryItems.forEach(item => {
    item.addEventListener('click', function() {
        galleryItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        overlay.classList.add('visible');
    });
});

overlay.addEventListener('click', function() {
    galleryItems.forEach(i => i.classList.remove('active'));
    this.classList.remove('visible');
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        galleryItems.forEach(i => i.classList.remove('active'));
        overlay.classList.remove('visible');
    }
});

console.log('ISSE Website loaded successfully!');
console.log('Supabase URL:', supabaseUrl);