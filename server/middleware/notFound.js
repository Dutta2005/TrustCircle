const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.type = 'NotFoundError';
  
  // Add some helpful information about available routes
  const availableRoutes = {
    auth: '/api/auth',
    users: '/api/users',
    services: '/api/services',
    bookings: '/api/bookings',
    reviews: '/api/reviews',
    community: '/api/community',
    health: '/health',
    api_info: '/api'
  };
  
  error.availableRoutes = availableRoutes;
  next(error);
};

module.exports = notFound;
