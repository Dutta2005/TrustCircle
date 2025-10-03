const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  // Core Information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },

  // Post Type and Category
  type: {
    type: String,
    enum: ['post', 'event', 'recommendation', 'alert', 'question', 'announcement'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: [
      'general', 'safety', 'events', 'recommendations', 'lost_found',
      'neighborhood_watch', 'local_business', 'services', 'housing',
      'transportation', 'environment', 'pets', 'children', 'seniors'
    ],
    required: true,
    index: true
  },

  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  address: {
    neighborhood: String,
    city: {
      type: String,
      required: true,
      index: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: String,
    country: {
      type: String,
      default: 'US'
    }
  },
  radius: {
    type: Number,
    default: 5, // miles - how far this post is relevant
    min: 0,
    max: 50
  },

  // Media Attachments
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    caption: String,
    size: Number, // file size in bytes
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Event-specific fields (only for type: 'event')
  eventDetails: {
    startDate: Date,
    endDate: Date,
    startTime: String, // Format: "14:30"
    endTime: String,   // Format: "16:00"
    isAllDay: {
      type: Boolean,
      default: false
    },
    venue: {
      name: String,
      address: String,
      coordinates: [Number]
    },
    maxAttendees: Number,
    registrationRequired: {
      type: Boolean,
      default: false
    },
    registrationDeadline: Date,
    fee: {
      amount: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        default: 'USD'
      }
    },
    organizer: {
      name: String,
      contact: {
        email: String,
        phone: String
      }
    }
  },

  // Engagement
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bookmarkedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Comments and Discussions
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community.comments'
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isHidden: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Event Attendees (for events only)
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not_going'],
      default: 'going'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: Date
  }],

  // Moderation and Status
  status: {
    type: String,
    enum: ['active', 'pending', 'flagged', 'removed', 'archived'],
    default: 'active',
    index: true
  },
  moderation: {
    flags: [{
      reason: {
        type: String,
        enum: [
          'inappropriate_content', 'spam', 'misinformation',
          'harassment', 'off_topic', 'duplicate', 'other'
        ]
      },
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      flaggedAt: {
        type: Date,
        default: Date.now
      },
      description: String
    }],
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationReason: String
  },

  // Visibility and Permissions
  visibility: {
    type: String,
    enum: ['public', 'neighbors_only', 'friends_only', 'private'],
    default: 'public',
    index: true
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowShares: {
    type: Boolean,
    default: true
  },

  // Expiration (for temporary posts like lost & found)
  expiresAt: Date,
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },

  // Pinning and Featuring
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  pinnedUntil: Date,
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,

  // AI Enhancement Fields
  aiData: {
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    topicTags: [String], // AI-generated topic tags
    engagementPrediction: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    spamProbability: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    communityRelevance: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    },
    suggestedActions: [String],
    lastAIUpdate: Date
  },

  // Analytics
  analytics: {
    peakEngagementHour: Number, // 0-23
    engagementRate: {
      type: Number,
      default: 0
    },
    responseTime: Number, // Average response time in minutes
    demographicInsights: {
      primaryAgeGroup: String,
      genderDistribution: {
        male: Number,
        female: Number,
        other: Number
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
communitySchema.index({ location: '2dsphere' });
communitySchema.index({ author: 1, createdAt: -1 });
communitySchema.index({ type: 1, category: 1 });
communitySchema.index({ 'address.city': 1, 'address.state': 1 });
communitySchema.index({ status: 1, visibility: 1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index({ isPinned: -1, isFeatured: -1, createdAt: -1 });
communitySchema.index({ expiresAt: 1, isExpired: 1 });

// Compound indexes for complex queries
communitySchema.index({ 'address.city': 1, type: 1, category: 1 });
communitySchema.index({ location: '2dsphere', type: 1, status: 1 });
communitySchema.index({ author: 1, type: 1, createdAt: -1 });

// Virtual for author details
communitySchema.virtual('authorDetails', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id',
  justOne: true
});

// Virtual for like count
communitySchema.virtual('likeCount').get(function() {
  return this.engagement.likes.length;
});

// Virtual for comment count
communitySchema.virtual('commentCount').get(function() {
  return this.comments.filter(comment => !comment.isHidden).length;
});

// Virtual for bookmark count
communitySchema.virtual('bookmarkCount').get(function() {
  return this.engagement.bookmarks.length;
});

// Virtual for attendee count (for events)
communitySchema.virtual('attendeeCount').get(function() {
  return this.attendees.filter(attendee => attendee.status === 'going').length;
});

// Virtual for is expired check
communitySchema.virtual('isCurrentlyExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for time until expiration
communitySchema.virtual('timeUntilExpiration').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const timeLeft = this.expiresAt - now;
  return timeLeft > 0 ? timeLeft : 0;
});

// Virtual for engagement rate calculation
communitySchema.virtual('calculatedEngagementRate').get(function() {
  if (this.engagement.views === 0) return 0;
  const totalEngagements = this.likeCount + this.commentCount + this.engagement.shares;
  return (totalEngagements / this.engagement.views) * 100;
});

// Method to add like
communitySchema.methods.addLike = function(userId) {
  const existingLike = this.engagement.likes.find(
    like => like.user.toString() === userId.toString()
  );
  
  if (!existingLike) {
    this.engagement.likes.push({
      user: userId,
      likedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to remove like
communitySchema.methods.removeLike = function(userId) {
  this.engagement.likes = this.engagement.likes.filter(
    like => like.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to add comment
communitySchema.methods.addComment = function(authorId, content, parentCommentId = null) {
  if (!this.allowComments) {
    throw new Error('Comments are not allowed on this post');
  }
  
  const newComment = {
    author: authorId,
    content: content,
    parentComment: parentCommentId,
    likes: [],
    isHidden: false,
    createdAt: new Date()
  };
  
  this.comments.push(newComment);
  return this.save();
};

// Method to add bookmark
communitySchema.methods.addBookmark = function(userId) {
  const existingBookmark = this.engagement.bookmarks.find(
    bookmark => bookmark.user.toString() === userId.toString()
  );
  
  if (!existingBookmark) {
    this.engagement.bookmarks.push({
      user: userId,
      bookmarkedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to remove bookmark
communitySchema.methods.removeBookmark = function(userId) {
  this.engagement.bookmarks = this.engagement.bookmarks.filter(
    bookmark => bookmark.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to add event attendee
communitySchema.methods.addAttendee = function(userId, status = 'going') {
  if (this.type !== 'event') {
    throw new Error('Only events can have attendees');
  }
  
  const existingAttendee = this.attendees.find(
    attendee => attendee.user.toString() === userId.toString()
  );
  
  if (existingAttendee) {
    existingAttendee.status = status;
    existingAttendee.registeredAt = new Date();
  } else {
    this.attendees.push({
      user: userId,
      status: status,
      registeredAt: new Date(),
      checkedIn: false
    });
  }
  
  return this.save();
};

// Method to check in attendee
communitySchema.methods.checkInAttendee = function(userId) {
  const attendee = this.attendees.find(
    a => a.user.toString() === userId.toString()
  );
  
  if (attendee) {
    attendee.checkedIn = true;
    attendee.checkedInAt = new Date();
    return this.save();
  }
  
  throw new Error('User is not registered for this event');
};

// Method to increment view count
communitySchema.methods.incrementViews = function() {
  this.engagement.views += 1;
  return this.save();
};

// Method to flag post
communitySchema.methods.flagPost = function(reason, flaggedBy, description = '') {
  this.moderation.flags.push({
    reason: reason,
    flaggedBy: flaggedBy,
    flaggedAt: new Date(),
    description: description
  });
  
  // Auto-flag if too many reports
  if (this.moderation.flags.length >= 3 && this.status === 'active') {
    this.status = 'flagged';
  }
  
  return this.save();
};

// Static method to find nearby posts
communitySchema.statics.findNearby = function(coordinates, maxDistance = 10000, options = {}) {
  const { type, category, limit = 20 } = options;
  
  const query = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistance // meters
      }
    },
    status: 'active',
    isExpired: false
  };
  
  if (type) {
    query.type = type;
  }
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ isPinned: -1, isFeatured: -1, createdAt: -1 })
    .limit(limit)
    .populate('author', 'firstName lastName avatar trustScore')
    .populate('comments.author', 'firstName lastName avatar');
};

// Static method to get trending posts
communitySchema.statics.getTrending = function(options = {}) {
  const { city, state, limit = 10, timeframe = 24 } = options;
  
  const timeAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  const query = {
    createdAt: { $gte: timeAgo },
    status: 'active',
    isExpired: false
  };
  
  if (city) {
    query['address.city'] = city;
  }
  
  if (state) {
    query['address.state'] = state;
  }
  
  return this.find(query)
    .sort({ 
      'engagement.likes': -1, 
      'engagement.views': -1, 
      'comments': -1 
    })
    .limit(limit)
    .populate('author', 'firstName lastName avatar trustScore');
};

// Pre-save middleware to handle expiration
communitySchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
    this.status = 'archived';
  }
  
  // Handle pinning expiration
  if (this.pinnedUntil && new Date() > this.pinnedUntil) {
    this.isPinned = false;
  }
  
  // Handle featuring expiration
  if (this.featuredUntil && new Date() > this.featuredUntil) {
    this.isFeatured = false;
  }
  
  next();
});

// Pre-save middleware to update engagement rate
communitySchema.pre('save', function(next) {
  if (this.engagement.views > 0) {
    const totalEngagements = this.engagement.likes.length + 
      this.comments.filter(c => !c.isHidden).length + 
      this.engagement.shares;
    this.analytics.engagementRate = (totalEngagements / this.engagement.views) * 100;
  }
  
  next();
});

module.exports = mongoose.model('Community', communitySchema);
