import type { Handle } from '@sveltejs/kit';

// Common bot/scanner paths to ignore in logs
const ignoredPaths = [
  '/actuator',
  '/server',
  '/.vscode',
  '/about',
  '/debug',
  '/v2/_catalog',
  '/ecp',
  '/server-status',
  '/login.action',
  '/_all_dbs',
  '/.DS_Store',
  '/.env',
  '/.git',
  '/META-INF',
  '/config.json',
  '/telescope',
  '/info.php',
  '/.well-known',
  '/wp-admin',
  '/wp-login',
  '/phpmyadmin',
  '/admin',
  '/api/v1',
  '/xmlrpc.php',
];

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  
  // Check if path matches any ignored patterns
  const shouldIgnore = ignoredPaths.some(ignoredPath => 
    path.startsWith(ignoredPath)
  );
  
  if (shouldIgnore) {
    // Return 404 silently without logging
    return new Response('Not Found', { status: 404 });
  }
  
  const response = await resolve(event);
  
  // Optional: Log legitimate 404s for actual pages
  if (response.status === 404 && !shouldIgnore) {
    console.log(`[404] ${event.request.method} ${path}`);
  }
  
  return response;
};