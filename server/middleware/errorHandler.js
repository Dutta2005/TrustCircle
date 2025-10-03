const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error Stack:', err.stack);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      type: 'ValidationError'
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      message,
      statusCode: 400,
      type: 'DuplicateError',
      field: field,
      value: value
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    
    error = {
      message: 'Validation Error',
      statusCode: 400,
      type: 'ValidationError',
      errors: errors
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401,
      type: 'AuthenticationError'
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401,
      type: 'AuthenticationError'
    };
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    error = {
      message: 'CORS policy violation',
      statusCode: 403,
      type: 'CORSError'
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      message: err.message || 'Too many requests',
      statusCode: 429,
      type: 'RateLimitError',
      retryAfter: err.retryAfter
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large',
      statusCode: 413,
      type: 'FileUploadError',
      maxSize: process.env.MAX_FILE_SIZE || '5MB'
    };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    error = {
      message: 'Database connection error',
      statusCode: 503,
      type: 'DatabaseError'
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Construct error response
  const errorResponse = {
    success: false,
    error: {
      message: message,
      type: error.type || 'ServerError',
      statusCode: statusCode
    }
  };

  // Add additional error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = error.errors || error.field ? {
      errors: error.errors,
      field: error.field,
      value: error.value
    } : undefined;
  }

  // Add retry information for rate limiting
  if (error.retryAfter) {
    errorResponse.error.retryAfter = error.retryAfter;
  }

  // Set specific headers for certain error types
  if (statusCode === 401) {
    res.removeHeader('Set-Cookie'); // Remove any auth cookies
  }

  if (statusCode === 429 && error.retryAfter) {
    res.set('Retry-After', error.retryAfter);
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
