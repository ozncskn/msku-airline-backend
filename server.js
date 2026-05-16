const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const flightRoutes = require('./routes/flightRoutes');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors()); 
app.use(express.json());
app.use('/api/flights', flightRoutes);

// MongoDB Bağlantısı
mongoose.connect('mongodb://127.0.0.1:27017/flyticketDB')
    .then(() => console.log("✅ MongoDB Bağlantısı Başarılı"))
    .catch(err => console.log("❌ Bağlantı Hatası:", err));

    const City = require('./models/City');

const seedCities = async () => {
    try {
        const count = await City.countDocuments();
        if (count === 0) {
            const cities = [
                { city_id: "01", city_name: "Adana" }, { city_id: "02", city_name: "Adıyaman" },
                { city_id: "03", city_name: "Afyonkarahisar" }, { city_id: "04", city_name: "Ağrı" },
                { city_id: "05", city_name: "Amasya" }, { city_id: "06", city_name: "Ankara" },
                { city_id: "07", city_name: "Antalya" }, { city_id: "08", city_name: "Artvin" },
                { city_id: "09", city_name: "Aydın" }, { city_id: "10", city_name: "Balıkesir" },
                { city_id: "11", city_name: "Bilecik" }, { city_id: "12", city_name: "Bingöl" },
                { city_id: "13", city_name: "Bitlis" }, { city_id: "14", city_name: "Bolu" },
                { city_id: "15", city_name: "Burdur" }, { city_id: "16", city_name: "Bursa" },
                { city_id: "17", city_name: "Çanakkale" }, { city_id: "18", city_name: "Çankırı" },
                { city_id: "19", city_name: "Çorum" }, { city_id: "20", city_name: "Denizli" },
                { city_id: "21", city_name: "Diyarbakır" }, { city_id: "22", city_name: "Edirne" },
                { city_id: "23", city_name: "Elazığ" }, { city_id: "24", city_name: "Erzincan" },
                { city_id: "25", city_name: "Erzurum" }, { city_id: "26", city_name: "Eskişehir" },
                { city_id: "27", city_name: "Gaziantep" }, { city_id: "28", city_name: "Giresun" },
                { city_id: "29", city_name: "Gümüşhane" }, { city_id: "30", city_name: "Hakkari" },
                { city_id: "31", city_name: "Hatay" }, { city_id: "32", city_name: "Isparta" },
                { city_id: "33", city_name: "Mersin" }, { city_id: "34", city_name: "İstanbul" },
                { city_id: "35", city_name: "İzmir" }, { city_id: "36", city_name: "Kars" },
                { city_id: "37", city_name: "Kastamonu" }, { city_id: "38", city_name: "Kayseri" },
                { city_id: "39", city_name: "Kırklareli" }, { city_id: "40", city_name: "Kırşehir" },
                { city_id: "41", city_name: "Kocaeli" }, { city_id: "42", city_name: "Konya" },
                { city_id: "43", city_name: "Kütahya" }, { city_id: "44", city_name: "Malatya" },
                { city_id: "45", city_name: "Manisa" }, { city_id: "46", city_name: "Kahramanmaraş" },
                { city_id: "47", city_name: "Mardin" }, { city_id: "48", city_name: "Muğla" },
                { city_id: "49", city_name: "Muş" }, { city_id: "50", city_name: "Nevşehir" },
                { city_id: "51", city_name: "Niğde" }, { city_id: "52", city_name: "Ordu" },
                { city_id: "53", city_name: "Rize" }, { city_id: "54", city_name: "Sakarya" },
                { city_id: "55", city_name: "Samsun" }, { city_id: "56", city_name: "Siirt" },
                { city_id: "57", city_name: "Sinop" }, { city_id: "58", city_name: "Sivas" },
                { city_id: "59", city_name: "Tekirdağ" }, { city_id: "60", city_name: "Tokat" },
                { city_id: "61", city_name: "Trabzon" }, { city_id: "62", city_name: "Tunceli" },
                { city_id: "63", city_name: "Şanlıurfa" }, { city_id: "64", city_name: "Uşak" },
                { city_id: "65", city_name: "Van" }, { city_id: "66", city_name: "Yozgat" },
                { city_id: "67", city_name: "Zonguldak" }, { city_id: "68", city_name: "Aksaray" },
                { city_id: "69", city_name: "Bayburt" }, { city_id: "70", city_name: "Karaman" },
                { city_id: "71", city_name: "Kırıkkale" }, { city_id: "72", city_name: "Batman" },
                { city_id: "73", city_name: "Şırnak" }, { city_id: "74", city_name: "Bartın" },
                { city_id: "75", city_name: "Ardahan" }, { city_id: "76", city_name: "Iğdır" },
                { city_id: "77", city_name: "Yalova" }, { city_id: "78", city_name: "Karabük" },
                { city_id: "79", city_name: "Kilis" }, { city_id: "80", city_name: "Osmaniye" },
                { city_id: "81", city_name: "Düzce" }
            ];
            await City.insertMany(cities);
            console.log("✅ 81 Şehir veritabanına başarıyla eklendi.");
        }
    } catch (err) {
        console.error("❌ Şehirler eklenirken hata oluştu:", err);
    }
};

// Bağlantı başarılı olduktan sonra çalıştır
mongoose.connection.once('open', () => {
    seedCities();
});

// Temel Route
app.get('/', (req, res) => {
    res.send('FlyTicket Backend Çalışıyor!');
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde yayında`);
});

app.get('/api/cities', async (req, res) => {
    const cities = await City.find().sort({ city_name: 1 });
    res.json(cities);
});