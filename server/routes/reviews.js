const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Review = require('../models/Review.js');
const Booking = require('../models/Booking.js');
const Service = require('../models/Service.js');
const User = require('../models/User.js');
const { protect, optionalAuth } = require('../middleware/auth.js');

const router = express.Router();

// @desc    Get reviews with filtering
// @route   GET /api/reviews
// @access  Public
router.get('/', optionalAuth, [
  query('service')
    .optional()
    .isMongoId()
    .withMessage('Invalid service ID'),
  query('reviewer')
    .optional()
    .isMongoId()
    .withMessage('Invalid reviewer ID'),
  query('reviewee')
    .optional()
    .isMongoId()
    .withMessage('Invalid reviewee ID'),
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  query('reviewType')
    .optional()
    .isIn(['customer_to_provider', 'provider_to_customer'])
    .withMessage('Invalid review type'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'rating', 'helpfulness'])
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
      service,
      reviewer,
      reviewee,
      rating,
      reviewType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      isActive: true,
      'moderation.status': 'approved'
    };

    if (service) query.service = service;
    if (reviewer) query.reviewer = reviewer;
    if (reviewee) query.reviewee = reviewee;
    if (rating) query.rating = parseInt(rating);
    if (reviewType) query.reviewType = reviewType;

    const skip = (page - 1) * limit;
    let sortField = sortBy;
    if (sortBy === 'helpfulness') sortField = 'helpfulness.upvotes';

    const sortOptions = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const reviews = await Review.find(query)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('service', 'title category')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: { service, reviewer, reviewee, rating, reviewType }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
router.post('/', protect, [
  body('booking')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Comment must be 10-2000 characters'),
  body('reviewType')
    .isIn(['customer_to_provider', 'provider_to_customer'])
    .withMessage('Invalid review type'),
  body('detailedRatings.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be 1-5'),
  body('detailedRatings.punctuality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be 1-5'),
  body('detailedRatings.quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be 1-5'),
  body('detailedRatings.professionalism')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Professionalism rating must be 1-5'),
  body('detailedRatings.value')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Value rating must be 1-5')
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

    // Get booking details and verify access
    const booking = await Booking.findById(req.body.booking)
      .populate('service')
      .populate('customer')
      .populate('provider');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Booking not found'
        }
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Can only review completed bookings'
        }
      });
    }

    // Check if user is involved in the booking
    const isCustomer = booking.customer._id.toString() === req.user._id.toString();
    const isProvider = booking.provider._id.toString() === req.user._id.toString();

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to review this booking'
        }
      });
    }

    // Validate review type matches user role
    if (isCustomer && req.body.reviewType !== 'customer_to_provider') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Customers can only create customer_to_provider reviews'
        }
      });
    }

    if (isProvider && req.body.reviewType !== 'provider_to_customer') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Providers can only create provider_to_customer reviews'
        }
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      booking: booking._id,
      reviewType: req.body.reviewType
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Review already exists for this booking'
        }
      });
    }

    // Determine reviewer and reviewee
    let reviewer, reviewee;
    if (isCustomer) {
      reviewer = booking.customer._id;
      reviewee = booking.provider._id;
    } else {
      reviewer = booking.provider._id;
      reviewee = booking.customer._id;
    }

    // Create review
    const reviewData = {
      ...req.body,
      reviewer,
      reviewee,
      service: booking.service._id,
      moderation: {
        status: 'approved' // Auto-approve for now, can add moderation later
      },
      isVerified: true,
      verificationMethod: 'booking_completion'
    };

    const review = await Review.create(reviewData);

    // Update booking with review reference
    if (isCustomer) {
      booking.customerReview = review._id;
    } else {
      booking.providerReview = review._id;
    }
    await booking.save();

    // Update service review summary
    if (isCustomer) {
      await booking.service.updateReviewsSummary();
    }

    // Update user reputation
    const revieweeUser = await User.findById(reviewee);
    if (revieweeUser) {
      revieweeUser.reputation.totalReviews += 1;
      // Recalculate average rating
      const userReviews = await Review.find({
        reviewee: reviewee,
        isActive: true,
        'moderation.status': 'approved'
      });
      
      if (userReviews.length > 0) {
        const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
        revieweeUser.reputation.averageRating = totalRating / userReviews.length;
      }
      
      revieweeUser.updateTrustScore();
      await revieweeUser.save();
    }

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('service', 'title category');

    res.status(201).json({
      success: true,
      data: {
        review: populatedReview
      },
      message: 'Review created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('service', 'title category')
      .populate('booking', 'scheduledDate status')
      .populate('response.respondedBy', 'firstName lastName avatar');

    if (!review || !review.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found',
          statusCode: 404
        }
      });
    }

    // Only show if approved or user is involved
    if (review.moderation.status !== 'approved') {
      const isInvolved = req.user && (
        review.reviewer._id.toString() === req.user._id.toString() ||
        review.reviewee._id.toString() === req.user._id.toString()
      );
      
      if (!isInvolved) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Review not found'
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (Reviewer only)
router.put('/:id', protect, [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Comment must be 10-2000 characters')
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

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found'
        }
      });
    }

    // Check ownership
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to update this review'
        }
      });
    }

    // Check if review can be updated (within 24 hours)
    const reviewAge = new Date() - review.createdAt;
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours

    if (reviewAge > maxEditTime) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Reviews can only be edited within 24 hours of creation'
        }
      });
    }

    const allowedFields = ['rating', 'title', 'comment', 'detailedRatings'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Reset moderation status if content changed
    if (updateData.comment || updateData.rating) {
      updateData['moderation.status'] = 'pending';
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('service', 'title category');

    res.json({
      success: true,
      data: {
        review: updatedReview
      },
      message: 'Review updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Reviewer only)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found'
        }
      });
    }

    // Check ownership
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to delete this review'
        }
      });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    // Update service review summary
    const service = await Service.findById(review.service);
    if (service) {
      await service.updateReviewsSummary();
    }

    // Update user reputation
    const reviewee = await User.findById(review.reviewee);
    if (reviewee) {
      reviewee.reputation.totalReviews = Math.max(0, reviewee.reputation.totalReviews - 1);
      reviewee.updateTrustScore();
      await reviewee.save();
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark review as helpful/not helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
router.post('/:id/helpful', protect, [
  body('vote')
    .isIn(['up', 'down'])
    .withMessage('Vote must be up or down')
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

    const { vote } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review || !review.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found'
        }
      });
    }

    // Can't vote on own reviews
    if (review.reviewer.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot vote on your own review'
        }
      });
    }

    await review.addHelpfulnessVote(req.user._id, vote);

    res.json({
      success: true,
      data: {
        upvotes: review.helpfulness.upvotes,
        downvotes: review.helpfulness.downvotes,
        netHelpfulness: review.netHelpfulness
      },
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
router.post('/:id/flag', protect, [
  body('reason')
    .isIn([
      'inappropriate_language', 'spam', 'fake_review',
      'harassment', 'off_topic', 'privacy_violation', 'other'
    ])
    .withMessage('Invalid flag reason'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
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

    const { reason, description = '' } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review || !review.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found'
        }
      });
    }

    // Check if user already flagged this review
    const existingFlag = review.moderation.flags.find(
      flag => flag.flaggedBy.toString() === req.user._id.toString()
    );

    if (existingFlag) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You have already flagged this review'
        }
      });
    }

    await review.addFlag(reason, req.user._id, description);

    res.json({
      success: true,
      message: 'Review flagged for moderation'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add response to review
// @route   POST /api/reviews/:id/response
// @access  Private (Reviewee only)
router.post('/:id/response', protect, [
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Response must be 10-1000 characters')
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

    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review || !review.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Review not found'
        }
      });
    }

    // Check if response already exists
    if (review.response.comment) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Response already exists for this review'
        }
      });
    }

    await review.addResponse(req.user._id, comment);

    const updatedReview = await Review.findById(review._id)
      .populate('response.respondedBy', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      data: {
        response: updatedReview.response
      },
      message: 'Response added successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
