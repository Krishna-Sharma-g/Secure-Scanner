export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const publicRoutes = ['/login', '/register'];
  if (publicRoutes.includes(to.path)) return;

  const token = localStorage.getItem('ss_token');
  if (!token) {
    return navigateTo('/login');
  }
});
