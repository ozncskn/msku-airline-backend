const mongoose = require('mongoose');
const Plane = require('./models/Plane'); // Az sonra oluşturacağız

mongoose.connect('mongodb://127.0.0.1:27017/flyticketDB') // Veritabanı adını kontrol et
    .then(() => console.log("Uçaklar için DB bağlantısı başarılı."))
    .catch(err => console.error(err));

const planes = [
    // Boeing 737 (5 Adet)
    ...Array.from({length: 5}, (_, i) => ({ plane_id: `MSKU-B0${i+1}`, model: 'Boeing 737', business_capacity: 30, economy_capacity: 150 })),
    // Boeing 777 (5 Adet)
    ...Array.from({length: 5}, (_, i) => ({ plane_id: `MSKU-T0${i+1}`, model: 'Boeing 777', business_capacity: 50, economy_capacity: 300 })),
    // Airbus A320 (5 Adet)
    ...Array.from({length: 5}, (_, i) => ({ plane_id: `MSKU-A0${i+1}`, model: 'Airbus A320', business_capacity: 20, economy_capacity: 130 })),
    // Airbus A350 (5 Adet)
    ...Array.from({length: 5}, (_, i) => ({ plane_id: `MSKU-S0${i+1}`, model: 'Airbus A350', business_capacity: 60, economy_capacity: 240 }))
];

const seedDB = async () => {
    await Plane.deleteMany({}); // Eskileri temizle
    await Plane.insertMany(planes);
    console.log("20 Uçak başarıyla envantere eklendi!");
    process.exit();
};

seedDB();