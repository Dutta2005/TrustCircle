const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking.js');
const Service = require('../models/Service.js');
const User = require('../models/User.js');
const { protect, bookingParticipant } = require('../middleware/auth.js');
const { emitToBooking, emitToUser } = require('../socket/handlers.js');

const router = express.Router();

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'disputed'])
    .withMessage('Invalid booking status'),
  query('role')
    .optional()
    .isIn(['customer', 'provider', 'all'])
    .withMessage('Role must be customer, provider, or all'),
  query('sortBy')
    .optional()
    .isIn(['scheduledDate', 'createdAt', 'status'])
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
      status,
      role = 'all',
      page = 1,
      limit = 20,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query based on role
    let query = {};
    if (role === 'customer') {
      query.customer = req.user._id;
    } else if (role === 'provider') {
      query.provider = req.user._id;
    } else {
      query.$or = [
        { customer: req.user._id },
        { provider: req.user._id }
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const bookings = await Booking.find(query)
      .populate('customer', 'firstName lastName avatar phone')
      .populate('provider', 'firstName lastName avatar phone')
      .populate('service', 'title category pricing location')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: { status, role }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, [
  body('service')
    .isMongoId()
    .withMessage('Valid service ID is required'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('scheduledTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('estimatedDuration')
    .isInt({ min: 15 })
    .withMessage('Estimated duration must be at least 15 minutes'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be [longitude, latitude]'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Street cannot be empty'),
  body('address.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters')
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

    // Get service details
    const service = await Service.findById(req.body.service)
      .populate('provider', 'firstName lastName');

    if (!service || !service.isActive || service.isPaused) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Service is not available for booking'
        }
      });
    }

    // Prevent self-booking
    if (service.provider._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot book your own service'
        }
      });
    }

    // Validate booking date/time
    const bookingDateTime = new Date(`${req.body.scheduledDate}T${req.body.scheduledTime}`);
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + (service.availability.advanceBooking || 24) * 60 * 60 * 1000);

    if (bookingDateTime < minBookingTime) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Booking must be at least ${service.availability.advanceBooking || 24} hours in advance`
        }
      });
    }

    // Check service availability
    if (!service.isAvailable(bookingDateTime, req.body.estimatedDuration)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Service is not available at the requested time'
        }
      });
    }

    // Calculate pricing
    let servicePrice = service.pricing.amount;
    if (service.pricing.type === 'hourly') {
      servicePrice = service.pricing.amount * (req.body.estimatedDuration / 60);
    }

    const platformFee = servicePrice * 0.03; // 3% platform fee
    const taxes = (servicePrice + platformFee) * 0.08; // 8% tax
    const totalAmount = servicePrice + platformFee + taxes;

    const bookingData = {
      ...req.body,
      customer: req.user._id,
      provider: service.provider._id,
      pricing: {
        servicePrice: Math.round(servicePrice * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: service.pricing.currency
      }
    };

    const booking = await Booking.create(bookingData);

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'firstName lastName avatar phone')
      .populate('provider', 'firstName lastName avatar phone')
      .populate('service', 'title category pricing location');

    // Emit real-time notification to provider
    if (req.io) {
      emitToUser(req.io, service.provider._id, 'new_booking_request', {
        booking: populatedBooking,
        customer: {
          name: `${req.user.firstName} ${req.user.lastName}`,
          avatar: req.user.avatar
        },
        service: service.title
      });
    }

    res.status(201).json({
      success: true,
      data: {
        booking: populatedBooking
      },
      message: 'Booking created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private (Participants only)
router.get('/:id', protect, bookingParticipant, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName avatar phone email verification')
      .populate('provider', 'firstName lastName avatar phone email verification trustScore')
      .populate('service', 'title category pricing location availability')
      .populate('messages.sender', 'firstName lastName avatar');

    res.json({
      success: true,
      data: {
        booking,
        userRole: req.isCustomer ? 'customer' : 'provider'
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Participants only)
router.put('/:id/status', protect, bookingParticipant, [
  body('status')
    .isIn(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
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

    const { status, reason = '', notes = '' } = req.body;
    const booking = req.booking;

    // Validate status transitions
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['in_progress', 'cancelled', 'no_show'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
      'no_show': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Cannot change status from ${booking.status} to ${status}`
        }
      });
    }

    // Check authorization for specific status changes
    if (status === 'confirmed' && !req.isProvider) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only service provider can confirm bookings'
        }
      });
    }

    if (status === 'completed' && !req.isProvider) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only service provider can mark bookings as completed'
        }
      });
    }

    // Update booking status
    await booking.updateStatus(status, req.user._id, reason, notes);

    // Update service statistics
    const service = await Service.findById(booking.service);
    if (service) {
      if (status === 'completed') {
        service.stats.completedBookings += 1;
      } else if (status === 'cancelled') {
        service.stats.cancelledBookings += 1;
      }
      await service.save();
    }

    // Update user reputation
    if (status === 'completed') {
      const provider = await User.findById(booking.provider);
      if (provider) {
        provider.reputation.completedServices += 1;
        provider.updateTrustScore();
        await provider.save();
      }
    }

    // Emit real-time update
    if (req.io) {
      emitToBooking(req.io, booking._id, 'booking_status_updated', {
        bookingId: booking._id,
        status,
        updatedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.isCustomer ? 'customer' : 'provider'
        },
        reason,
        notes,
        updatedAt: new Date()
      });
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'firstName lastName avatar phone')
      .populate('provider', 'firstName lastName avatar phone')
      .populate('service', 'title category');

    res.json({
      success: true,
      data: {
        booking: updatedBooking
      },
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add message to booking
// @route   POST /api/bookings/:id/messages
// @access  Private (Participants only)
router.post('/:id/messages', protect, bookingParticipant, [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be 1-1000 characters')
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

    const { message } = req.body;
    const booking = req.booking;

    await booking.addMessage(req.user._id, message);

    // Emit real-time message
    if (req.io) {
      emitToBooking(req.io, booking._id, 'booking_message_received', {
        bookingId: booking._id,
        message: {
          sender: {
            id: req.user._id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            avatar: req.user.avatar
          },
          content: message,
          timestamp: new Date()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark messages as read
// @route   PUT /api/bookings/:id/messages/read
// @access  Private (Participants only)
router.put('/:id/messages/read', protect, bookingParticipant, async (req, res, next) => {
  try {
    const booking = req.booking;
    await booking.markMessagesAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private (Participants only)
router.delete('/:id', protect, bookingParticipant, [
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Cancellation reason must be 5-500 characters')
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

    const { reason } = req.body;
    const booking = req.booking;

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Only pending or confirmed bookings can be cancelled'
        }
      });
    }

    // Calculate cancellation fee
    const cancellationFee = booking.calculateCancellationFee();
    const refundAmount = booking.pricing.totalAmount - cancellationFee;

    // Update booking
    await booking.updateStatus('cancelled', req.user._id, reason);
    booking.cancellation.refundAmount = refundAmount;
    booking.cancellation.refundStatus = refundAmount > 0 ? 'pending' : 'not_applicable';
    await booking.save();

    // Emit real-time notification
    if (req.io) {
      const otherParticipant = req.isCustomer ? booking.provider : booking.customer;
      emitToUser(req.io, otherParticipant, 'booking_cancelled', {
        bookingId: booking._id,
        cancelledBy: {
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.isCustomer ? 'customer' : 'provider'
        },
        reason,
        refundAmount,
        cancellationFee
      });
    }

    res.json({
      success: true,
      data: {
        refundAmount,
        cancellationFee,
        refundStatus: booking.cancellation.refundStatus
      },
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
