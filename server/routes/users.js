const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User.js');
const Service = require('../models/Service.js');
const Review = require('../models/Review.js');
const Booking = require('../models/Booking.js');
const { protect, authorize, ownerOrAdmin } = require('../middleware/auth.js');

const router = express.Router();

// @desc    Search users (moved before /:id to avoid conflicts)
// @route   GET /api/users/search
// @access  Private
router.get('/search', protect, [
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('location')
    .optional()
    .custom((value) => {
      if (value) {
        const coords = value.split(',').map(parseFloat);
        if (coords.length !== 2 || coords.some(isNaN)) {
          throw new Error('Location must be in format: longitude,latitude');
        }
      }
      return true;
    }),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 miles')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          errors: errors.array()
        }
      });
    }

    const { q, location, radius = 25, page = 1, limit = 20 } = req.query;

    let query = {
      isActive: true,
      isSuspended: false,
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    };

    // Add geospatial search if location provided
    if (location) {
      const [lng, lat] = location.split(',').map(parseFloat);
      const radiusInMeters = radius * 1609.34; // Convert miles to meters

      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusInMeters
        }
      };
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('firstName lastName bio avatar trustScore location address')
      .sort({ trustScore: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all users with filtering and pagination
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term must not be empty'),
  query('trustScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Trust score must be between 0 and 100'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'trustScore', 'firstName', 'lastName'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          errors: errors.array()
        }
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      trustScore,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (trustScore) {
      query.trustScore = { $gte: parseInt(trustScore) };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user by ID with full profile
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    // Get user statistics
    const [reviewStats, serviceStats, bookingStatsCustomer, bookingStatsProvider] = await Promise.all([
      Review.getReviewStats(user._id, 'received'),
      Service.countDocuments({ provider: user._id, isActive: true }),
      Booking.getBookingStats(user._id, 'customer'),
      Booking.getBookingStats(user._id, 'provider')
    ]);

    const userProfile = {
      ...user.toJSON(),
      statistics: {
        reviews: reviewStats[0] || { totalReviews: 0, averageRating: 0 },
        activeServices: serviceStats,
        bookingsAsCustomer: bookingStatsCustomer[0] || { totalBookings: 0, completedBookings: 0 },
        bookingsAsProvider: bookingStatsProvider[0] || { totalBookings: 0, completedBookings: 0 }
      }
    };

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private (Owner or Admin)
router.put('/:id', protect, ownerOrAdmin('id'), [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Street cannot be empty'),
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
  body('address.zipCode')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Invalid ZIP code format'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  body('preferences.serviceCategories')
    .optional()
    .isArray()
    .withMessage('Service categories must be an array'),
  body('preferences.priceRange.min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be non-negative'),
  body('preferences.priceRange.max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be non-negative'),
  body('preferences.radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 miles')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation Error',
          errors: errors.array()
        }
      });
    }

    // Validate price range consistency
    if (req.body.preferences?.priceRange?.min && req.body.preferences?.priceRange?.max) {
      if (req.body.preferences.priceRange.min > req.body.preferences.priceRange.max) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Minimum price cannot be greater than maximum price'
          }
        });
      }
    }

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'bio', 'dateOfBirth',
      'address', 'location', 'preferences'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user
      },
      message: 'User profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete/Deactivate user account
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
    }

    // Deactivate instead of delete (for data integrity)
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    // Also deactivate user's services
    await Service.updateMany(
      { provider: user._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'User account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's services
// @route   GET /api/users/:id/services
// @access  Public
router.get('/:id/services', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, isActive = true } = req.query;

    const query = { provider: req.params.id };
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const services = await Service.find(query)
      .populate('provider', 'firstName lastName avatar trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(query);

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalServices: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's reviews received
// @route   GET /api/users/:id/reviews
// @access  Public
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    const query = {
      reviewee: req.params.id,
      isActive: true,
      'moderation.status': 'approved'
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('service', 'title category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);
    const stats = await Review.getReviewStats(req.params.id, 'received');

    res.json({
      success: true,
      data: {
        reviews,
        statistics: stats[0] || { totalReviews: 0, averageRating: 0 },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
