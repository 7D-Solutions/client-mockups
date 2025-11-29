/**
 * Site Configuration
 * Central place for all branding and site-wide settings
 * Update these values to change branding across the entire site
 */

const siteConfig = {
    // Brand
    siteName: 'Bridging the Gap',
    logoEmoji: '🌉',
    tagline: 'Empowering parents and educators to work together for every child\'s success.',

    // Contact
    email: 'hello@bridgingthegap.com',
    officeHours: 'Monday-Friday, 9am-5pm EST',
    responseTime: 'Within 24-48 hours',

    // Social Media (update with actual URLs)
    social: {
        facebook: '#',
        instagram: '#',
        linkedin: '#',
        youtube: '#'
    },

    // Footer Quote
    quote: '"Whatever you do, work heartily, as for the Lord and not for men." - Colossians 3:23',

    // Copyright
    copyrightYear: new Date().getFullYear(),
    copyrightName: 'Bridging the Gap',

    // URLs (relative paths)
    urls: {
        home: 'index.html',
        about: 'about.html',
        contact: 'contact.html',
        faq: 'faq.html',
        blog: 'blog.html',
        resources: 'resources.html',
        podcast: 'podcast.html',
        newsletter: 'newsletter.html',
        privacy: 'privacy.html',
        terms: 'terms.html'
    },

    // Course sections
    courseSections: {
        fiveThings: 'index.html#five-things',
        foundation: 'index.html#foundation',
        curriculum: 'index.html#curriculum',
        pricing: 'index.html#pricing'
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.siteConfig = siteConfig;
}
