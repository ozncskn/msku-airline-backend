const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    city_id: { type: String, required: true, unique: true },
    city_name: { type: String, required: true }
});

module.exports = mongoose.model('City', citySchema);