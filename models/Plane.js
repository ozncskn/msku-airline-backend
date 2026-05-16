const mongoose = require('mongoose');

const planeSchema = new mongoose.Schema({
    plane_id: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    business_capacity: { type: Number, required: true }, // Yeni
    economy_capacity: { type: Number, required: true }   // Yeni
});

module.exports = mongoose.model('Plane', planeSchema);