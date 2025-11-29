/**
 * Footer Component
 * Dynamically generates the footer using site configuration
 * Include this script at the end of each page before </body>
 *
 * Usage:
 * 1. Add <footer class="footer"></footer> in your HTML
 * 2. Include config.js before this file
 * 3. Include this file: <script src="js/footer.js"></script>
 */

(function() {
    // Wait for DOM and config to be ready
    document.addEventListener('DOMContentLoaded', function() {
        const footer = document.querySelector('footer.footer');
        if (!footer) return;

        // Get config (use defaults if not available)
        const config = window.siteConfig || {
            siteName: 'Bridging the Gap',
            logoEmoji: '🌉',
            tagline: 'Empowering parents and educators to work together.',
            quote: '"Whatever you do, work heartily, as for the Lord and not for men." - Colossians 3:23',
            copyrightYear: new Date().getFullYear(),
            copyrightName: 'Bridging the Gap'
        };

        // Determine if we're in a subfolder
        const isSubfolder = window.location.pathname.includes('/blog/') ||
                           window.location.pathname.includes('/visuals/');
        const pathPrefix = isSubfolder ? '../' : '';

        // Generate footer HTML
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-brand">
                    <h3>${config.logoEmoji} ${config.siteName}</h3>
                    <p>${config.tagline}</p>
                    <p style="margin-top: 1rem; font-style: italic;">${config.quote}</p>
                </div>
                <div class="footer-links">
                    <h4>Course</h4>
                    <ul>
                        <li><a href="${pathPrefix}index.html#five-things">5 Things to Know</a></li>
                        <li><a href="${pathPrefix}index.html#foundation">Foundation Skills</a></li>
                        <li><a href="${pathPrefix}index.html#curriculum">Curriculum</a></li>
                        <li><a href="${pathPrefix}index.html#pricing">Pricing</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Resources</h4>
                    <ul>
                        <li><a href="${pathPrefix}resources.html">All Resources</a></li>
                        <li><a href="${pathPrefix}iep-checklist.html">IEP Checklist</a></li>
                        <li><a href="${pathPrefix}skills-assessment.html">Skills Assessment</a></li>
                        <li><a href="${pathPrefix}blog.html">Blog</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Connect</h4>
                    <ul>
                        <li><a href="${pathPrefix}about.html">About</a></li>
                        <li><a href="${pathPrefix}contact.html">Contact</a></li>
                        <li><a href="${pathPrefix}podcast.html">Podcast</a></li>
                        <li><a href="${pathPrefix}newsletter.html">Newsletter</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${config.copyrightYear} ${config.copyrightName}. All rights reserved. |
                <a href="${pathPrefix}privacy.html">Privacy Policy</a> |
                <a href="${pathPrefix}terms.html">Terms of Service</a></p>
            </div>
        `;
    });
})();
