// A singleton navigation ref that api.js can call without being inside a React component
let _navigate = null

export function setNavigator(navigateFn) {
  _navigate = navigateFn
}

export function navigateToError(statusCode) {
  const routes = {
    400: '/error/400',
    401: '/error/401',
    403: '/error/403',
    404: '/error/404',
    429: '/error/429',
    500: '/error/500',
    503: '/error/503',
  }
  const route = routes[statusCode] || '/error/500'
  if (_navigate) {
    _navigate(route)
  } else {
    // Fallback if navigate isn't set yet
    window.location.href = route
  }
}
