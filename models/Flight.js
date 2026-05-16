const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
    flight_id: { type: String, required: true, unique: true },
    from_city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    to_city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    departure_time: { type: Date, required: true },
    arrival_time: { type: Date, required: true },
    
    // YENİ ALANLAR (Hata veren eski alanlar yerine bunları kullanıyoruz)
    business_price: { type: Number, required: true },
    economy_price: { type: Number, required: true },
    business_seats_available: { type: Number, required: true },
    economy_seats_available: { type: Number, required: true },
    
    plane: { type: mongoose.Schema.Types.ObjectId, ref: 'Plane', required: true }
});

module.exports = mongoose.model('Flight', flightSchema);