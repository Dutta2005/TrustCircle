const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth.js');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required if address is provided'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be [longitude, latitude]')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const { firstName, lastName, email, password, phone, address, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User already exists with this email',
          type: 'DuplicateError',
          statusCode: 400
        }
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      address,
      location
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          trustScore: user.trustScore,
          verification: user.verification,
          createdAt: user.createdAt
        }
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const { email, password } = req.body;

    // Check for user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // Check if account is suspended
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is suspended',
          type: 'AuthorizationError',
          statusCode: 403,
          reason: user.suspensionReason
        }
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          trustScore: user.trustScore,
          verification: user.verification,
          lastLoginAt: user.lastLoginAt
        }
      },
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      // .populate('servicesOffered', 'title category pricing reviews')
      .select('-password');

    res.json({
      success: true,
      data: {
        user: user
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user details
// @route   PUT /api/auth/update-details
// @access  Private
router.put('/update-details', protect, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City cannot be empty'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be [longitude, latitude]')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const fieldsToUpdate = {};
    const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'dateOfBirth', 'address', 'location'];

    // Only update provided fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: {
        user: user
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
router.put('/update-password', protect, [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token
      },
      message: 'Password updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Forgot password (placeholder for email functionality)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // TODO: Implement password reset token generation and email sending
    // For now, just respond with success message

    res.json({
      success: true,
      message: 'Password reset functionality will be implemented with email service',
      data: {
        userId: user._id, // This would normally not be exposed
        resetToken: 'placeholder-reset-token' // This would be a secure token
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Verify email (placeholder)
// @route   POST /api/auth/verify-email
// @access  Private
router.post('/verify-email', protect, async (req, res, next) => {
  try {
    // TODO: Implement email verification token validation
    // For now, just mark email as verified

    const user = await User.findById(req.user.id);
    user.verification.isEmailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        verification: user.verification
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res, next) => {
  try {
    // In a JWT implementation, logout is typically handled client-side
    // by removing the token from storage. Server-side, we could implement
    // a token blacklist, but for simplicity, we'll just return success

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete account
// @route   DELETE /api/auth/delete-account
// @access  Private
router.delete('/delete-account', protect, [
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required to delete account'),
  body('confirmation')
    .equals('DELETE')
    .withMessage('Type DELETE to confirm account deletion')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          type: 'ValidationError',
          statusCode: 400,
          errors: errors.array()
        }
      });
    }

    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Password is incorrect',
          type: 'AuthenticationError',
          statusCode: 401
        }
      });
    }

    // Instead of deleting, deactivate the account (for data integrity)
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
