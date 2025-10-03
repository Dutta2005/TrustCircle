const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Core Review Information
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true, // One review per booking
    index: true
  },

  // Review Content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: true,
    maxlength: [2000, 'Review comment cannot exceed 2000 characters']
  },

  // Detailed Ratings
  detailedRatings: {
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Review Type
  reviewType: {
    type: String,
    enum: ['customer_to_provider', 'provider_to_customer'],
    required: true,
    index: true
  },

  // Media
  photos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Review Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['booking_completion', 'manual_verification', 'ai_verification']
  },

  // Moderation
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'flagged', 'rejected'],
      default: 'pending',
      index: true
    },
    flags: [{
      reason: {
        type: String,
        enum: [
          'inappropriate_language', 'spam', 'fake_review', 
          'harassment', 'off_topic', 'privacy_violation', 'other'
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
    moderationNotes: String
  },

  // Helpfulness
  helpfulness: {
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    votedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['up', 'down']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Response from Reviewee
  response: {
    comment: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // AI Analysis Fields
  aiAnalysis: {
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    emotionalTone: {
      type: String,
      enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
    },
    authenticityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    spamProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    keywords: [String],
    topics: [String],
    languageQuality: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent']
    },
    credibilityIndicators: {
      hasSpecificDetails: {
        type: Boolean,
        default: false
      },
      mentionedTimeframe: {
        type: Boolean,
        default: false
      },
      balancedFeedback: {
        type: Boolean,
        default: false
      },
      appropriateLength: {
        type: Boolean,
        default: false
      }
    },
    lastAIUpdate: Date
  },

  // System Fields
  ipAddress: String, // For fraud detection
  userAgent: String, // For fraud detection
  reportCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
reviewSchema.index({ reviewer: 1, reviewType: 1 });
reviewSchema.index({ reviewee: 1, reviewType: 1 });
reviewSchema.index({ service: 1, isActive: 1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ isActive: 1, 'moderation.status': 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ 'helpfulness.upvotes': -1 });

// Compound indexes for complex queries
reviewSchema.index({ reviewee: 1, rating: -1, createdAt: -1 });
reviewSchema.index({ service: 1, rating: -1, createdAt: -1 });
reviewSchema.index({ reviewType: 1, isActive: 1, 'moderation.status': 1 });

// Virtual for reviewer details
reviewSchema.virtual('reviewerDetails', {
  ref: 'User',
  localField: 'reviewer',
  foreignField: '_id',
  justOne: true
});

// Virtual for reviewee details
reviewSchema.virtual('revieweeDetails', {
  ref: 'User',
  localField: 'reviewee',
  foreignField: '_id',
  justOne: true
});

// Virtual for service details
reviewSchema.virtual('serviceDetails', {
  ref: 'Service',
  localField: 'service',
  foreignField: '_id',
  justOne: true
});

// Virtual for booking details
reviewSchema.virtual('bookingDetails', {
  ref: 'Booking',
  localField: 'booking',
  foreignField: '_id',
  justOne: true
});

// Virtual for overall helpfulness score
reviewSchema.virtual('helpfulnessScore').get(function() {
  const { upvotes, downvotes } = this.helpfulness;
  const total = upvotes + downvotes;
  return total > 0 ? (upvotes / total) * 100 : 0;
});

// Virtual for net helpfulness (upvotes - downvotes)
reviewSchema.virtual('netHelpfulness').get(function() {
  return this.helpfulness.upvotes - this.helpfulness.downvotes;
});

// Virtual for average detailed rating
reviewSchema.virtual('averageDetailedRating').get(function() {
  const ratings = this.detailedRatings;
  const values = Object.values(ratings).filter(rating => rating != null);
  
  if (values.length === 0) {
    return null;
  }
  
  const sum = values.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / values.length) * 10) / 10;
});

// Virtual for time since review
reviewSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const reviewDate = this.createdAt;
  const diffTime = Math.abs(now - reviewDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
});

// Method to add helpfulness vote
reviewSchema.methods.addHelpfulnessVote = function(userId, voteType) {
  // Remove existing vote from this user if any
  this.helpfulness.votedBy = this.helpfulness.votedBy.filter(
    vote => vote.user.toString() !== userId.toString()
  );
  
  // Add new vote
  this.helpfulness.votedBy.push({
    user: userId,
    vote: voteType,
    votedAt: new Date()
  });
  
  // Update counts
  const upvotes = this.helpfulness.votedBy.filter(vote => vote.vote === 'up').length;
  const downvotes = this.helpfulness.votedBy.filter(vote => vote.vote === 'down').length;
  
  this.helpfulness.upvotes = upvotes;
  this.helpfulness.downvotes = downvotes;
  
  return this.save();
};

// Method to add flag
reviewSchema.methods.addFlag = function(reason, flaggedBy, description = '') {
  this.moderation.flags.push({
    reason: reason,
    flaggedBy: flaggedBy,
    flaggedAt: new Date(),
    description: description
  });
  
  // Auto-flag if too many reports
  this.reportCount += 1;
  if (this.reportCount >= 3 && this.moderation.status === 'approved') {
    this.moderation.status = 'flagged';
  }
  
  return this.save();
};

// Method to add response
reviewSchema.methods.addResponse = function(responderId, comment) {
  // Only allow reviewee to respond
  if (this.reviewee.toString() !== responderId.toString()) {
    throw new Error('Only the reviewee can respond to this review');
  }
  
  this.response = {
    comment: comment,
    respondedAt: new Date(),
    respondedBy: responderId
  };
  
  return this.save();
};

// Method to calculate trust impact (for AI)
reviewSchema.methods.calculateTrustImpact = function() {
  let impact = this.rating; // Base impact from rating
  
  // Adjust based on AI analysis
  if (this.aiAnalysis.authenticityScore) {
    impact *= this.aiAnalysis.authenticityScore;
  }
  
  // Reduce impact if flagged
  if (this.moderation.status === 'flagged') {
    impact *= 0.5;
  }
  
  // Increase impact based on helpfulness
  const helpfulnessRatio = this.helpfulness.upvotes / 
    Math.max(this.helpfulness.upvotes + this.helpfulness.downvotes, 1);
  impact *= (0.5 + helpfulnessRatio * 0.5);
  
  return Math.max(0, Math.min(5, impact));
};

// Static method to get review statistics for a user
reviewSchema.statics.getReviewStats = function(userId, reviewType = null) {
  const matchField = reviewType === 'received' ? 'reviewee' : 'reviewer';
  const query = { [matchField]: mongoose.Types.ObjectId(userId), isActive: true };
  
  if (reviewType && reviewType !== 'received') {
    query.reviewType = reviewType;
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingBreakdown: {
          $push: '$rating'
        },
        totalHelpfulness: { $sum: '$helpfulness.upvotes' }
      }
    },
    {
      $addFields: {
        ratingCounts: {
          5: {
            $size: {
              $filter: {
                input: '$ratingBreakdown',
                cond: { $eq: ['$$this', 5] }
              }
            }
          },
          4: {
            $size: {
              $filter: {
                input: '$ratingBreakdown',
                cond: { $eq: ['$$this', 4] }
              }
            }
          },
          3: {
            $size: {
              $filter: {
                input: '$ratingBreakdown',
                cond: { $eq: ['$$this', 3] }
              }
            }
          },
          2: {
            $size: {
              $filter: {
                input: '$ratingBreakdown',
                cond: { $eq: ['$$this', 2] }
              }
            }
          },
          1: {
            $size: {
              $filter: {
                input: '$ratingBreakdown',
                cond: { $eq: ['$$this', 1] }
              }
            }
          }
        }
      }
    }
  ]);
};

// Static method to get recent reviews for a service or user
reviewSchema.statics.getRecentReviews = function(options = {}) {
  const { userId, serviceId, limit = 10, reviewType, minRating } = options;
  
  const query = { isActive: true, 'moderation.status': 'approved' };
  
  if (userId) {
    query.reviewee = mongoose.Types.ObjectId(userId);
  }
  
  if (serviceId) {
    query.service = mongoose.Types.ObjectId(serviceId);
  }
  
  if (reviewType) {
    query.reviewType = reviewType;
  }
  
  if (minRating) {
    query.rating = { $gte: minRating };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewer', 'firstName lastName avatar')
    .populate('service', 'title category');
};

// Pre-save middleware for AI analysis placeholder
reviewSchema.pre('save', function(next) {
  if (this.isModified('comment') && !this.aiAnalysis.lastAIUpdate) {
    // Placeholder for AI analysis - will be implemented later
    this.aiAnalysis.lastAIUpdate = new Date();
    
    // Basic sentiment analysis placeholder
    const positiveWords = ['excellent', 'great', 'amazing', 'fantastic', 'wonderful', 'perfect'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'disappointing', 'bad'];
    
    const comment = this.comment.toLowerCase();
    const positiveCount = positiveWords.filter(word => comment.includes(word)).length;
    const negativeCount = negativeWords.filter(word => comment.includes(word)).length;
    
    // Simple sentiment score
    this.aiAnalysis.sentimentScore = Math.max(-1, Math.min(1, (positiveCount - negativeCount) * 0.2));
    
    // Basic authenticity score based on length and detail
    if (this.comment.length > 50 && this.comment.length < 1500) {
      this.aiAnalysis.authenticityScore = 0.8;
    } else {
      this.aiAnalysis.authenticityScore = 0.5;
    }
  }
  
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
