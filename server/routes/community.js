const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Community = require('../models/Community');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { emitToCommunity } = require('../socket/handlers');

const router = express.Router();

// @desc    Get nearby posts
// @route   GET /api/community/nearby
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
    .isInt({ min: 1, max: 50 })
    .withMessage('Radius must be between 1 and 50 miles'),
  query('type')
    .optional()
    .isIn(['post', 'event', 'recommendation', 'alert', 'question', 'announcement'])
    .withMessage('Invalid post type'),
  query('category')
    .optional()
    .isIn([
      'general', 'safety', 'events', 'recommendations', 'lost_found',
      'neighborhood_watch', 'local_business', 'services', 'housing',
      'transportation', 'environment', 'pets', 'children', 'seniors'
    ])
    .withMessage('Invalid category')
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

    const { lng, lat, radius = 10, type, category, limit = 20 } = req.query;
    const coordinates = [parseFloat(lng), parseFloat(lat)];

    const posts = await Community.findNearby(
      coordinates,
      radius * 1609.34, // Convert miles to meters
      { type, category, limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: {
        posts,
        location: { coordinates, radius },
        totalResults: posts.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get community events
// @route   GET /api/community/events
// @access  Public
router.get('/events', optionalAuth, [
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City cannot be empty'),
  query('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('Upcoming must be boolean')
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

    const { city, state, upcoming = true, page = 1, limit = 20 } = req.query;

    const query = {
      type: 'event',
      status: 'active',
      isExpired: false
    };

    if (city) query['address.city'] = new RegExp(city, 'i');
    if (state) query['address.state'] = state.toUpperCase();

    if (upcoming) {
      query['eventDetails.startDate'] = { $gte: new Date() };
    }

    const skip = (page - 1) * limit;

    const events = await Community.find(query)
      .populate('author', 'firstName lastName avatar trustScore')
      .sort({ isPinned: -1, 'eventDetails.startDate': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Community.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalEvents: total
        },
        filters: { city, state, upcoming }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get trending posts
// @route   GET /api/community/trending
// @access  Public
router.get('/trending', optionalAuth, [
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City cannot be empty'),
  query('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  query('timeframe')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Timeframe must be between 1 and 168 hours')
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

    const { city, state, timeframe = 24, limit = 10 } = req.query;

    const posts = await Community.getTrending({
      city,
      state,
      timeframe: parseInt(timeframe),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        posts,
        timeframe: parseInt(timeframe),
        totalResults: posts.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get community posts
// @route   GET /api/community
// @access  Public
router.get('/', optionalAuth, [
  query('type')
    .optional()
    .isIn(['post', 'event', 'recommendation', 'alert', 'question', 'announcement'])
    .withMessage('Invalid post type'),
  query('category')
    .optional()
    .isIn([
      'general', 'safety', 'events', 'recommendations', 'lost_found',
      'neighborhood_watch', 'local_business', 'services', 'housing',
      'transportation', 'environment', 'pets', 'children', 'seniors'
    ])
    .withMessage('Invalid category'),
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City cannot be empty'),
  query('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'engagement', 'views'])
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
      type,
      category,
      city,
      state,
      author,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      status: 'active',
      isExpired: false
    };

    if (type) query.type = type;
    if (category) query.category = category;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (state) query['address.state'] = state.toUpperCase();
    if (author) query.author = author;

    const skip = (page - 1) * limit;
    let sortField = sortBy;
    if (sortBy === 'engagement') {
      sortField = 'analytics.engagementRate';
    } else if (sortBy === 'views') {
      sortField = 'engagement.views';
    }

    const sortOptions = {
      isPinned: -1, // Pinned posts first
      isFeatured: -1, // Then featured posts
      [sortField]: sortOrder === 'asc' ? 1 : -1
    };

    const posts = await Community.find(query)
      .populate('author', 'firstName lastName avatar trustScore')
      .populate('comments.author', 'firstName lastName avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Community.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPosts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: { type, category, city, state, author }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create community post
// @route   POST /api/community
// @access  Private
router.post('/', protect, [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be 5-200 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be 10-5000 characters'),
  body('type')
    .isIn(['post', 'event', 'recommendation', 'alert', 'question', 'announcement'])
    .withMessage('Invalid post type'),
  body('category')
    .isIn([
      'general', 'safety', 'events', 'recommendations', 'lost_found',
      'neighborhood_watch', 'local_business', 'services', 'housing',
      'transportation', 'environment', 'pets', 'children', 'seniors'
    ])
    .withMessage('Invalid category'),
  body('address.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be 2 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be [longitude, latitude]'),
  // Event-specific validation
  body('eventDetails.startDate')
    .if(body('type').equals('event'))
    .isISO8601()
    .withMessage('Event start date is required for events'),
  body('eventDetails.startTime')
    .if(body('type').equals('event'))
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Event start time must be in HH:MM format'),
  body('eventDetails.venue.name')
    .if(body('type').equals('event'))
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Venue name cannot be empty')
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

    // Validate event-specific requirements
    if (req.body.type === 'event') {
      const eventDate = new Date(req.body.eventDetails.startDate);
      if (eventDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Event date cannot be in the past'
          }
        });
      }
    }

    const postData = {
      ...req.body,
      author: req.user._id
    };

    const post = await Community.create(postData);

    const populatedPost = await Community.findById(post._id)
      .populate('author', 'firstName lastName avatar trustScore');

    // Emit real-time notification to community
    if (req.io && req.body.address.city && req.body.address.state) {
      emitToCommunity(req.io, req.body.address.city, req.body.address.state, 'new_community_post', {
        post: populatedPost,
        author: {
          name: `${req.user.firstName} ${req.user.lastName}`,
          avatar: req.user.avatar,
          trustScore: req.user.trustScore
        }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        post: populatedPost
      },
      message: 'Community post created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get post by ID
// @route   GET /api/community/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await Community.findById(req.params.id)
      .populate('author', 'firstName lastName avatar trustScore verification')
      .populate('comments.author', 'firstName lastName avatar')
      .populate('attendees.user', 'firstName lastName avatar')
      .populate('engagement.likes.user', 'firstName lastName avatar')
      .populate('engagement.bookmarks.user', 'firstName lastName avatar');

    if (!post || post.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
          statusCode: 404
        }
      });
    }

    // Increment view count (async, don't await)
    post.incrementViews().catch(err => console.error('Failed to increment views:', err));

    res.json({
      success: true,
      data: {
        post
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update post
// @route   PUT /api/community/:id
// @access  Private (Author only)
router.put('/:id', protect, async (req, res, next) => {
  try {
    const post = await Community.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found'
        }
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to update this post'
        }
      });
    }

    const allowedFields = [
      'title', 'content', 'category', 'media', 'eventDetails',
      'visibility', 'allowComments', 'allowShares', 'expiresAt'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedPost = await Community.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('author', 'firstName lastName avatar trustScore');

    res.json({
      success: true,
      data: {
        post: updatedPost
      },
      message: 'Post updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete post
// @route   DELETE /api/community/:id
// @access  Private (Author only)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const post = await Community.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found'
        }
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to delete this post'
        }
      });
    }

    // Soft delete
    post.status = 'removed';
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Like/unlike post
// @route   POST /api/community/:id/like
// @access  Private
router.post('/:id/like', protect, [
  body('action')
    .isIn(['like', 'unlike'])
    .withMessage('Action must be like or unlike')
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

    const { action } = req.body;
    const post = await Community.findById(req.params.id);

    if (!post || post.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found'
        }
      });
    }

    if (action === 'like') {
      await post.addLike(req.user._id);
    } else {
      await post.removeLike(req.user._id);
    }

    // Emit real-time update
    if (req.io) {
      emitToCommunity(req.io, post.address.city, post.address.state, 'post_liked', {
        postId: post._id,
        action,
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        likeCount: post.engagement.likes.length
      });
    }

    res.json({
      success: true,
      data: {
        likeCount: post.engagement.likes.length,
        action
      },
      message: `Post ${action}d successfully`
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add comment to post
// @route   POST /api/community/:id/comment
// @access  Private
router.post('/:id/comment', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be 1-1000 characters'),
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
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

    const { content, parentComment = null } = req.body;
    const post = await Community.findById(req.params.id);

    if (!post || post.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found'
        }
      });
    }

    if (!post.allowComments) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Comments are not allowed on this post'
        }
      });
    }

    await post.addComment(req.user._id, content, parentComment);

    const updatedPost = await Community.findById(post._id)
      .populate('comments.author', 'firstName lastName avatar');

    // Get the new comment
    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      success: true,
      data: {
        comment: newComment,
        commentCount: updatedPost.commentCount
      },
      message: 'Comment added successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Join/leave event
// @route   POST /api/community/:id/attend
// @access  Private
router.post('/:id/attend', protect, [
  body('status')
    .isIn(['going', 'maybe', 'not_going'])
    .withMessage('Status must be going, maybe, or not_going')
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

    const { status } = req.body;
    const post = await Community.findById(req.params.id);

    if (!post || post.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found'
        }
      });
    }

    if (post.type !== 'event') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'This is not an event post'
        }
      });
    }

    // Check if event registration is required and deadline has passed
    if (post.eventDetails.registrationRequired && 
        post.eventDetails.registrationDeadline && 
        new Date() > post.eventDetails.registrationDeadline) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Event registration deadline has passed'
        }
      });
    }

    await post.addAttendee(req.user._id, status);

    res.json({
      success: true,
      data: {
        attendeeCount: post.attendeeCount,
        userStatus: status
      },
      message: 'Event attendance updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
