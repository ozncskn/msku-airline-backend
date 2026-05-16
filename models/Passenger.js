const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
    flight_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Flight', 
        required: true 
    },
    name: { type: String, required: true },
    tckn: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    ticket_class: { type: String, enum: ['business', 'economy'], required: true },
    pnr: { type: String, required: true },
    booked_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Passenger', PassengerSchema);