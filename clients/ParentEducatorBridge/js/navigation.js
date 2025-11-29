// Navigation Component - Update this file to change nav on all pages
// The nav will auto-detect which page is active based on the current URL

function loadNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isSubfolder = window.location.pathname.includes('/blog/') || window.location.pathname.includes('/visuals/');
    const prefix = isSubfolder ? '../' : '';

    const navItems = [
        { href: 'index.html', icon: '🏠', label: 'Home', section: null },
        { href: 'about.html', icon: '👤', label: 'About', section: null },
        { divider: true },
        { href: 'index.html#five-things', icon: '💡', label: '5 Things to Know', section: 'five-things' },
        { href: 'index.html#foundation', icon: '🎯', label: 'Foundation Skills', section: 'foundation' },
        { href: 'index.html#curriculum', icon: '📚', label: 'Course', section: 'curriculum' },
        { href: 'index.html#pricing', icon: '💰', label: 'Pricing', section: 'pricing' },
        { divider: true },
        { href: 'resources.html', icon: '📁', label: 'Resources', section: null },
        { href: 'podcast.html', icon: '🎙️', label: 'Podcast', section: null },
        { href: 'blog.html', icon: '✍️', label: 'Blog', section: null },
        { divider: true },
        { href: 'faq.html', icon: '❓', label: 'FAQ', section: null },
        { href: 'contact.html', icon: '📧', label: 'Contact', section: null }
    ];

    // Determine active page
    function isActive(item) {
        if (item.divider) return false;
        const itemPage = item.href.split('#')[0];
        const itemHash = item.href.includes('#') ? item.href.split('#')[1] : null;

        // For blog posts, highlight Blog
        if (currentPage.includes('.html') && isSubfolder && window.location.pathname.includes('/blog/')) {
            return item.href === 'blog.html';
        }
        // For visuals, highlight Resources
        if (currentPage.includes('.html') && isSubfolder && window.location.pathname.includes('/visuals/')) {
            return item.href === 'resources.html';
        }

        // On index.html, only mark "Home" as active initially (not section links)
        // The scroll handler in index.html will manage section highlighting
        if ((currentPage === 'index.html' || currentPage === '') && itemPage === 'index.html') {
            // Only mark Home (no hash) as active, not section links
            return !itemHash;
        }

        // Exact match for other pages
        return currentPage === itemPage;
    }

    // Build nav HTML
    let navLinksHTML = '';
    navItems.forEach(item => {
        if (item.divider) {
            navLinksHTML += '<div class="nav-divider"></div>';
        } else {
            const activeClass = isActive(item) ? ' class="active"' : '';
            const href = prefix + item.href;
            navLinksHTML += `<li><a href="${href}"${activeClass}><span>${item.icon}</span> ${item.label}</a></li>`;
        }
    });

    const sidebarHTML = `
        <a href="${prefix}index.html" class="nav-logo">
            <div class="nav-logo-icon">🌉</div>
            <span class="nav-logo-text">Bridging the Gap</span>
        </a>
        <ul class="nav-links">
            ${navLinksHTML}
        </ul>
        <a href="${prefix}index.html#pricing" class="nav-cta">🚀 Enroll Now</a>
    `;

    // Insert into sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.innerHTML = sidebarHTML;
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

// Load navigation when DOM is ready
document.addEventListener('DOMContentLoaded', loadNavigation);
