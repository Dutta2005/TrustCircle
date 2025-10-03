const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Service = require('../models/Service.js');
const User = require('../models/User.js');
const { protect, optionalAuth, ownerOrAdmin } = require('../middleware/auth.js');

const router = express.Router();

// @desc    Search services
// @route   GET /api/services/search
// @access  Public
router.get('/search', optionalAuth, [
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('category')
    .optional()
    .isIn([
      'home_maintenance', 'cleaning', 'gardening', 'pet_care',
      'tutoring', 'childcare', 'elderly_care', 'tech_support',
      'delivery', 'transportation', 'photography', 'event_planning',
      'fitness', 'beauty', 'handyman', 'cooking', 'moving', 'other'
    ])
    .withMessage('Invalid service category'),
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
    .withMessage('Radius must be between 1 and 100 miles'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be non-negative'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be non-negative')
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
      q,
      category,
      location,
      radius = 25,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    let query = {
      isActive: true,
      isPaused: false,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { subcategory: { $regex: q, $options: 'i' } }
      ]
    };

    if (category) {
      query.category = category;
    }

    // Price filtering
    if (minPrice || maxPrice) {
      query['pricing.amount'] = {};
      if (minPrice) query['pricing.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.amount'].$lte = parseFloat(maxPrice);
    }

    // Geospatial search
    if (location) {
      const [lng, lat] = location.split(',').map(parseFloat);
      const radiusInMeters = radius * 1609.34;

      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusInMeters
        }
      };
    }

    const skip = (page - 1) * limit;
    let sortOptions = {};

    switch (sortBy) {
      case 'price_low':
        sortOptions = { 'pricing.amount': 1 };
        break;
      case 'price_high':
        sortOptions = { 'pricing.amount': -1 };
        break;
      case 'rating':
        sortOptions = { 'reviews.average': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { 'reviews.average': -1, 'stats.views': -1 };
    }

    const services = await Service.find(query)
      .populate('provider', 'firstName lastName avatar trustScore')
      .sort(sortOptions)
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
        },
        searchQuery: q,
        filters: { category, location, radius, minPrice, maxPrice }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get nearby services
// @route   GET /api/services/nearby
// @access  Public
router.get('/nearby', optionalAuth, [
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 miles'),
  query('category')
    .optional()
    .isIn([
      'home_maintenance', 'cleaning', 'gardening', 'pet_care',
      'tutoring', 'childcare', 'elderly_care', 'tech_support',
      'delivery', 'transportation', 'photography', 'event_planning',
      'fitness', 'beauty', 'handyman', 'cooking', 'moving', 'other'
    ])
    .withMessage('Invalid service category')
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

    const { lng, lat, radius = 10, category, limit = 20 } = req.query;
    const coordinates = [parseFloat(lng), parseFloat(lat)];

    const services = await Service.findNearby(
      coordinates,
      radius * 1609.34, // Convert miles to meters
      category
    )
      .populate('provider', 'firstName lastName avatar trustScore')
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        services,
        location: { coordinates, radius },
        totalResults: services.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all services with filtering
// @route   GET /api/services
// @access  Public
router.get('/', optionalAuth, [
  query('category')
    .optional()
    .isIn([
      'home_maintenance', 'cleaning', 'gardening', 'pet_care',
      'tutoring', 'childcare', 'elderly_care', 'tech_support',
      'delivery', 'transportation', 'photography', 'event_planning',
      'fitness', 'beauty', 'handyman', 'cooking', 'moving', 'other'
    ])
    .withMessage('Invalid service category'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be non-negative'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be non-negative'),
  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'rating', 'views'])
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
      category,
      minPrice,
      maxPrice,
      rating,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      isActive: true,
      isPaused: false
    };

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query['pricing.amount'] = {};
      if (minPrice) query['pricing.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.amount'].$lte = parseFloat(maxPrice);
    }

    if (rating) {
      query['reviews.average'] = { $gte: parseFloat(rating) };
    }

    // Pagination and sorting
    const skip = (page - 1) * limit;
    let sortField = sortBy;
    if (sortBy === 'price') sortField = 'pricing.amount';
    if (sortBy === 'rating') sortField = 'reviews.average';
    if (sortBy === 'views') sortField = 'stats.views';

    const sortOptions = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const services = await Service.find(query)
      .populate('provider', 'firstName lastName avatar trustScore')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalServices: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: { category, minPrice, maxPrice, rating }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private
router.post('/', protect, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10-2000 characters'),
  body('category')
    .isIn([
      'home_maintenance', 'cleaning', 'gardening', 'pet_care',
      'tutoring', 'childcare', 'elderly_care', 'tech_support',
      'delivery', 'transportation', 'photography', 'event_planning',
      'fitness', 'beauty', 'handyman', 'cooking', 'moving', 'other'
    ])
    .withMessage('Invalid service category'),
  body('pricing.type')
    .isIn(['fixed', 'hourly', 'per_project', 'negotiable'])
    .withMessage('Invalid pricing type'),
  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be non-negative'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates required: [longitude, latitude]'),
  body('address.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  body('duration.estimated')
    .isInt({ min: 15 })
    .withMessage('Estimated duration must be at least 15 minutes')
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

    // Validate pricing consistency
    if (req.body.pricing.type !== 'negotiable' && !req.body.pricing.amount) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Price amount is required for non-negotiable pricing'
        }
      });
    }

    const serviceData = {
      ...req.body,
      provider: req.user._id
    };

    const service = await Service.create(serviceData);

    const populatedService = await Service.findById(service._id)
      .populate('provider', 'firstName lastName avatar trustScore');

    res.status(201).json({
      success: true,
      data: {
        service: populatedService
      },
      message: 'Service created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'firstName lastName avatar bio trustScore verification address')
      .populate({
        path: 'serviceReviews',
        match: { isActive: true, 'moderation.status': 'approved' },
        populate: {
          path: 'reviewer',
          select: 'firstName lastName avatar'
        },
        options: { sort: { createdAt: -1 }, limit: 5 }
      });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Service not found',
          statusCode: 404
        }
      });
    }

    // Increment view count (async, don't await)
    service.incrementViews().catch(err => console.error('Failed to increment views:', err));

    // Check availability for next 7 days
    const availability = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      availability.push({
        date: date.toISOString().split('T')[0],
        available: service.isAvailable(date)
      });
    }

    res.json({
      success: true,
      data: {
        service: {
          ...service.toJSON(),
          upcomingAvailability: availability
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Owner only)
router.put('/:id', protect, async (req, res, next) => {
  try {
    // First check if service exists and user owns it
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Service not found'
        }
      });
    }

    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to update this service'
        }
      });
    }

    const allowedFields = [
      'title', 'description', 'subcategory', 'pricing',
      'location', 'address', 'serviceArea', 'duration',
      'requirements', 'images', 'portfolio', 'availability'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('provider', 'firstName lastName avatar trustScore');

    res.json({
      success: true,
      data: {
        service: updatedService
      },
      message: 'Service updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Owner only)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Service not found'
        }
      });
    }

    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to delete this service'
        }
      });
    }

    // Check for active bookings
    const activeBookings = await require('../models/Booking').countDocuments({
      service: service._id,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete service with active bookings',
          activeBookings
        }
      });
    }

    // Soft delete - mark as inactive instead of removing
    service.isActive = false;
    await service.save();

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle service pause status
// @route   PUT /api/services/:id/pause
// @access  Private (Owner only)
router.put('/:id/pause', protect, [
  body('isPaused')
    .isBoolean()
    .withMessage('isPaused must be boolean'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    const { isPaused, reason } = req.body;

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Service not found'
        }
      });
    }

    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to modify this service'
        }
      });
    }

    service.isPaused = isPaused;
    service.pauseReason = isPaused ? reason : undefined;
    await service.save();

    res.json({
      success: true,
      data: {
        service: {
          id: service._id,
          title: service.title,
          isPaused: service.isPaused,
          pauseReason: service.pauseReason
        }
      },
      message: `Service ${isPaused ? 'paused' : 'unpaused'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
