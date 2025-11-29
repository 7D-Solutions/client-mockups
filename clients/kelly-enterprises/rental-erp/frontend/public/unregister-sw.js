// Service Worker Cleanup Script
// This will unregister any existing service workers

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    if (registrations.length > 0) {
      console.log('Found', registrations.length, 'service worker(s) to unregister');
      
      for(let registration of registrations) {
        registration.unregister().then(function(success) {
          if (success) {
            console.log('Service worker unregistered:', registration.scope);
          }
        });
      }
      
      // Clear all caches
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
          console.log('Cache cleared:', name);
        }
      });
      
      console.log('Service worker cleanup complete');
    } else {
      console.log('No service workers found');
    }
  });
}