const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
 
  contact: {
    type: String,
    required: true
  },
  number_plate: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  slot: {
    type: Number,
    required: true
  },
  isParked:{
    type:Boolean,
    required:true
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
