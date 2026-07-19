const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  contact: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  cart: {
    type: Array,
    default: []
  },
  wishlist: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model('User', userSchema);
