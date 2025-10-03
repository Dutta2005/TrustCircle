const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'AuthenticationError',
            statusCode: 401
          }
        });
      }

      // Check if user account is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Account is deactivated',
            type: 'AuthenticationError',
            statusCode: 401
          }
        });
      }

      // Check if user account is suspended
      if (req.user.isSuspended) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Account is suspended',
            type: 'AuthorizationError',
            statusCode: 403,
            reason: req.user.suspensionReason
          }
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      let message = 'Not authorized to access this route';
      let statusCode = 401;
      
      if (error.name === 'TokenExpiredError') {
        message = 'Token expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Invalid token';
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          message,
          type: 'AuthenticationError',
          statusCode
        }
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized, no token provided',
        type: 'AuthenticationError',
        statusCode: 401
      }
    });
  }
};

// Optional authentication - don't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      // If user exists and is active, set it; otherwise, continue without user
      if (req.user && req.user.isActive && !req.user.isSuspended) {
        // User is authenticated and valid
      } else {
        req.user = null;
      }
    } catch (error) {
      // If token is invalid, just continue without user
      req.user = null;
    }
  }

  next();
};

// Check user roles/permissions
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          type: 'AuthorizationError',
          statusCode: 403,
          required: roles,
          current: req.user.role
        }
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // If user is admin, allow access
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req[resourceField] || req.params[resourceField] || req.body[resourceField];
    
    if (!resourceUserId || req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied - not owner of this resource',
          type: 'AuthorizationError',
          statusCode: 403
        }
      });
    }

    next();
  };
};

// Check if user is involved in booking (customer or provider)
const bookingParticipant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.id || req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Booking not found',
          type: 'NotFoundError',
          statusCode: 404
        }
      });
    }

    const userId = req.user._id.toString();
    const customerId = booking.customer.toString();
    const providerId = booking.provider.toString();

    // Check if user is either customer or provider of the booking
    if (userId !== customerId && userId !== providerId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied - not a participant in this booking',
          type: 'AuthorizationError',
          statusCode: 403
        }
      });
    }

    // Add booking to request for use in route handlers
    req.booking = booking;
    req.isCustomer = userId === customerId;
    req.isProvider = userId === providerId;

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting bypass for trusted users (high trust score)
const trustedUserBypass = (req, res, next) => {
  if (req.user && req.user.trustScore >= 80) {
    // Skip rate limiting for highly trusted users
    req.skipRateLimit = true;
  }
  next();
};

// Validate email verification for certain actions
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        type: 'AuthenticationError',
        statusCode: 401
      }
    });
  }

  if (!req.user.verification.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Email verification required',
        type: 'VerificationError',
        statusCode: 403,
        action_required: 'verify_email'
      }
    });
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  ownerOrAdmin,
  bookingParticipant,
  trustedUserBypass,
  requireEmailVerification
};
