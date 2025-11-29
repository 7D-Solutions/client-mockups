import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { join } from 'path';

interface CriticalCSSOptions {
  // Pages to extract critical CSS for
  pages?: Array<{
    name: string;
    url: string;
  }>;
  // Inline critical CSS in HTML
  inline?: boolean;
}

export function criticalCSS(options: CriticalCSSOptions = {}): Plugin {
  const { pages = [], inline = true } = options;
  
  return {
    name: 'vite-plugin-critical-css',
    enforce: 'post',
    apply: 'build',
    
    transformIndexHtml: {
      enforce: 'post',
      transform(html, ctx) {
        if (!ctx.bundle) return html;
        
        // Extract critical CSS for above-the-fold content
        // This is a simplified version - in production you'd use tools like critical or penthouse
        const criticalStyles = `
          /* Critical CSS - Above the fold styles */
          :root {
            /* Essential color tokens */
            --color-primary: #2c72d5;
            --color-text-primary: #212529;
            --color-bg-primary: #ffffff;
            --color-bg-secondary: #f8f9fa;
            --color-border-light: #dee2e6;
            
            /* Essential spacing */
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            
            /* Essential typography */
            --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --font-size-base: 1rem;
            --font-size-lg: 1.125rem;
            --font-weight-normal: 400;
            --font-weight-semibold: 600;
          }
          
          /* Reset and base styles */
          *, *::before, *::after {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            font-family: var(--font-sans);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-normal);
            line-height: 1.5;
            color: var(--color-text-primary);
            background-color: var(--color-bg-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Loading spinner for initial render */
          #root:empty::before {
            content: '';
            position: fixed;
            top: 50%;
            left: 50%;
            width: 40px;
            height: 40px;
            margin: -20px 0 0 -20px;
            border: 3px solid var(--color-border-light);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spinner 0.8s linear infinite;
          }
          
          @keyframes spinner {
            to { transform: rotate(360deg); }
          }
          
          /* Main layout critical styles */
          .main-layout {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .main-header {
            background: var(--color-bg-primary);
            border-bottom: 1px solid var(--color-border-light);
            padding: var(--space-3) var(--space-4);
          }
          
          .main-content {
            flex: 1;
            padding: var(--space-4);
            background: var(--color-bg-secondary);
          }
        `;
        
        if (inline) {
          // Inline critical CSS in head
          const styleTag = `<style id="critical-css">${criticalStyles}</style>`;
          html = html.replace('</head>', `${styleTag}\n</head>`);
          
          // Preload main CSS
          const cssLinks = html.match(/<link[^>]+\.css[^>]*>/g) || [];
          cssLinks.forEach(link => {
            const href = link.match(/href="([^"]+)"/)?.[1];
            if (href) {
              const preloadLink = `<link rel="preload" href="${href}" as="style">`;
              html = html.replace('</head>', `${preloadLink}\n</head>`);
            }
          });
        }
        
        return html;
      }
    }
  };
}