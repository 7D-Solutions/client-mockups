import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

export function FontAwesomeCheck() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    const checkFontAwesome = () => {
      // Create test element to verify Font Awesome is loaded
      const testElement = document.createElement('i');
      testElement.className = 'fas fa-check';
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement, ':before');
      const content = computedStyle.getPropertyValue('content');
      
      document.body.removeChild(testElement);
      
      // Check for Font Awesome content (should not be 'none' or empty)
      const fontAwesomeLoaded = content && content !== 'none' && content !== '""';

      if (fontAwesomeLoaded) {
        setIsLoaded(true);
        return true;
      }
      
      return false;
    };

    const attemptFallbackLoad = () => {
      if (loadAttempts >= 2) {
        logger.error('Font Awesome failed to load after multiple attempts. Icons may display incorrectly.');
        return;
      }

      logger.warn(`Font Awesome not detected. Attempting fallback load (attempt ${loadAttempts + 1}/2)...`);
      
      // Remove any existing fallback links
      const existingFallbacks = document.querySelectorAll('link[data-fa-fallback]');
      existingFallbacks.forEach(link => link.remove());
      
      // Try alternative CDN
      const fallbackLink = document.createElement('link');
      fallbackLink.rel = 'stylesheet';
      fallbackLink.href = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css';
      fallbackLink.setAttribute('data-fa-fallback', 'true');
      fallbackLink.crossOrigin = 'anonymous';
      
      fallbackLink.onload = () => {
        logger.info('Fallback Font Awesome CDN loaded');
        // Recheck after fallback loads
        setTimeout(() => {
          if (checkFontAwesome()) {
            setIsLoaded(true);
          }
        }, 500);
      };

      fallbackLink.onerror = () => {
        logger.error('Fallback Font Awesome CDN failed to load');
      };
      
      document.head.appendChild(fallbackLink);
      setLoadAttempts(prev => prev + 1);
    };

    // Initial check after DOM is ready
    const initialCheck = () => {
      if (!checkFontAwesome()) {
        attemptFallbackLoad();
      }
    };

    // Check immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialCheck);
    } else {
      // Small delay to ensure CSS has been applied
      setTimeout(initialCheck, 100);
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initialCheck);
    };
  }, [loadAttempts]);
  
  return null;
}