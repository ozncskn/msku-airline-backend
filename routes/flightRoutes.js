const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Plane = require('../models/Plane');
const Passenger = require('../models/Passenger'); 
const nodemailer = require('nodemailer');

// --- 1. ADMIN PANELİ İÇİN UÇAK LİSTESİ (GET) ---
router.get('/planes', async (req, res) => {
    try {
        const planes = await Plane.find();
        res.json(planes);
    } catch (err) {
        res.status(500).json({ message: "Uçaklar listelenirken hata oluştu." });
    }
});

// --- 2. YENİ UÇUŞ EKLEME & GEÇMİŞ UÇUŞU OTOMATİK TEMİZLEME (POST) ---
router.post('/add', async (req, res) => {
    try {
        const { 
            flight_id, from_city, to_city, departure_time, 
            arrival_time, business_price, economy_price, plane_id 
        } = req.body;

        if (!flight_id || !from_city || !to_city || !departure_time || !arrival_time || !business_price || !economy_price || !plane_id) {
            return res.status(400).json({ message: "Lütfen tüm alanları doldurun!" });
        }

        const mskuRegex = /^MSKU[0-9]{3}$/;
        if (!mskuRegex.test(flight_id)) {
            return res.status(400).json({ 
                message: "Geçersiz Uçuş ID! Format 'MSKU' + 3 rakam olmalıdır (Örn: MSKU456)." 
            });
        }

        const bizPrice = Number(business_price);
        const ecoPrice = Number(economy_price);
        if (isNaN(bizPrice) || isNaN(ecoPrice) || bizPrice <= 0 || ecoPrice <= 0 || bizPrice > 100000 || ecoPrice > 100000) {
            return res.status(400).json({ message: "Geçersiz fiyat! Fiyatlar 1 TL ile 100.000 TL arasında olmalıdır." });
        }
        if (bizPrice <= ecoPrice) {
            return res.status(400).json({ message: "Ticari Hata: Business fiyatı Economy fiyatından yüksek olmalıdır!" });
        }

        const now = new Date();
        const departureDate = new Date(departure_time);
        const arrivalDate = new Date(arrival_time);

        if (from_city === to_city) {
            return res.status(400).json({ message: "Kalkış ve varış şehri aynı olamaz!" });
        }

        if (departureDate < now) {
            return res.status(400).json({ message: "Geçmiş bir tarihe uçuş planlanamaz!" });
        }
        const durationMs = arrivalDate - departureDate;
        if (durationMs < (60 * 60 * 1000)) {
            return res.status(400).json({ message: "Türkiye içi uçuş süresi en az 1 saat olmalıdır!" });
        }
        if (durationMs > (4 * 60 * 60 * 1000)) {
            return res.status(400).json({ message: "Türkiye içi uçuş süresi 4 saati geçemez!" });
        }

        // --- 🔁 İNOVATİF GEÇMİŞ UÇUŞ KONTROL VE SİLME ZIRHI 🔁 ---
        const existingFlight = await Flight.findOne({ flight_id });
        if (existingFlight) {
            const existingDeparture = new Date(existingFlight.departure_time);
            
            if (existingDeparture < now) {
                // Eğer mevcut uçuşun tarihi geçmişse (Past Flights), otomatik olarak temizle
                await Flight.findByIdAndDelete(existingFlight._id);
                // O uçuşa bağlı eski yolcu kayıtlarını da sil (Veritabanı şişmesin)
                await Passenger.deleteMany({ flight_id: existingFlight._id });
                console.log(`[MSKU HAVAYOLLARI] Eski/Geçmiş ${flight_id} seferi otomatik olarak sistemden temizlendi.`);
            } else {
                // Eğer uçuş henüz gerçekleşmemişse (Upcoming), yine hata ver
                return res.status(400).json({ message: "Bu Uçuş ID şu an 'Gelecek Seferler' (Upcoming) listesinde aktif olarak kullanımda!" });
            }
        }

        const airportConflict = await Flight.findOne({
            $or: [
                { from_city: from_city, departure_time: departureDate },
                { to_city: to_city, arrival_time: arrivalDate }
            ]
        });
        if (airportConflict) {
            return res.status(400).json({ message: "Pist Meşgul! Bu dakikada ilgili havalimanında başka bir operasyon planlanmış." });
        }

        const lastFlight = await Flight.findOne({ plane: plane_id }).sort({ arrival_time: -1 });
        if (lastFlight && lastFlight.to_city.toString() !== from_city.toString()) {
            return res.status(400).json({ 
                message: `Operasyonel Hata: Seçilen uçak şu an başka bir şehirde. Uçuş yerine uçağın bulunduğu yerden başlatılmalı.` 
            });
        }

        const turnaroundTime = 45 * 60 * 1000;
        const conflictingFlight = await Flight.findOne({
            plane: plane_id,
            $or: [
                { 
                    arrival_time: { $gt: new Date(departureDate.getTime() - turnaroundTime) }, 
                    departure_time: { $lt: new Date(arrivalDate.getTime() + turnaroundTime) } 
                }
            ]
        });
        if (conflictingFlight) {
            return res.status(400).json({ message: "Uçak Meşgul! Bu uçak başka bir seferde veya mola sürecinde." });
        }

        const planeData = await Plane.findById(plane_id);
        if (!planeData) return res.status(404).json({ message: "Uçak bulunamadı!" });

        const newFlight = new Flight({
            flight_id,
            from_city,
            to_city,
            departure_time: departureDate,
            arrival_time: arrivalDate,
            business_price: bizPrice,
            economy_price: ecoPrice,
            business_seats_available: planeData.business_capacity,
            economy_seats_available: planeData.economy_capacity,
            plane: plane_id
        });

        await newFlight.save();
        res.status(201).json({ message: "Uçuş başarıyla filo planına eklendi!" });

    } catch (err) {
        console.error("Backend Hatası:", err);
        res.status(500).json({ message: "Sunucu hatası.", error: err.message });
    }
});

// --- 3. BİLET SATIN ALMA & REZERVASYON KAYDI (POST) ---
router.post('/book/:id', async (req, res) => {
    try {
        const { num_tickets, ticket_class, passenger } = req.body; 
        const passengerCount = Number(num_tickets);

        if (passengerCount <= 0) return res.status(400).json({ message: "Bilet sayısı en az 1 olmalıdır!" });
        if (!['business', 'economy'].includes(ticket_class)) {
            return res.status(400).json({ message: "Geçersiz sınıf!" });
        }

        const seatField = ticket_class === 'business' ? 'business_seats_available' : 'economy_seats_available';
        
        const flight = await Flight.findOneAndUpdate(
            { _id: req.params.id, [seatField]: { $gte: passengerCount } },
            { $inc: { [seatField]: -passengerCount } },
            { returnDocument: 'after' } 
        ).populate('from_city to_city plane');

        if (!flight) return res.status(400).json({ message: "Yetersiz koltuk veya uçuş bulunamadı!" });

        if (passenger && passenger.all_passengers && passenger.all_passengers.length > 0) {
            for (let individual of passenger.all_passengers) {
                const newPassengerRecord = new Passenger({
                    flight_id: flight._id,
                    name: individual.name,
                    tckn: individual.tckn,
                    email: passenger.email,
                    phone: passenger.phone,
                    ticket_class: ticket_class,
                    pnr: passenger.pnr
                });
                await newPassengerRecord.save();
            }
        }

        // --- NODEMAILER ENTEGRASYONU ---
        if (passenger && passenger.email) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'PROJE_ICIN_GMAIL_ADRESIN@gmail.com', 
                    pass: 'GMAIL_UYGULAMA_SIFRESI' 
                }
            });

            const depTime = new Date(flight.departure_time).toLocaleString('tr-TR');

            const mailOptions = {
                from: '"MSKU Havayolları" <PROJE_ICIN_GMAIL_ADRESIN@gmail.com>',
                to: passenger.email,
                subject: `✈️ E-Biletiniz Hazır! PNR: ${passenger.pnr} (${flight.from_city.city_name} - ${flight.to_city.city_name})`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">MSKU Havayolları E-Bilet</h1>
                        </div>
                        <div style="padding: 25px; background: white;">
                            <p>Sayın <strong>${passenger.name}</strong>,</p>
                            <p>Uçuş detaylarınız aşağıda yer almaktadır:</p>
                            <p><strong>PNR:</strong> ${passenger.pnr}</p>
                            <p><strong>Güzergah:</strong> ${flight.from_city.city_name} ➔ ${flight.to_city.city_name}</p>
                            <p><strong>Zaman:</strong> ${depTime}</p>
                        </div>
                    </div>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log("Mail gönderim hatası: ", error);
            });
        }

        res.json({ message: "Bilet alındı!", remaining_seats: flight[seatField] });

    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: "Biletleme hatası oluştu." }); 
    }
});

// --- 4. UÇUŞ OPERASYON BİLGİLERİNİ GÜNCELLEME (PUT) ---
router.put('/edit/:id', async (req, res) => {
    try {
        const { 
            from_city, to_city, departure_time, 
            arrival_time, business_price, economy_price, plane_id 
        } = req.body;

        const bizPrice = Number(business_price);
        const ecoPrice = Number(economy_price);

        if (bizPrice <= ecoPrice) {
            return res.status(400).json({ message: "Ticari Hata: Business fiyatı Economy fiyatından yüksek olmalıdır!" });
        }
        if (from_city === to_city) {
            return res.status(400).json({ message: "Kalkış ve varış şehri aynı olamaz!" });
        }

        const departureDate = new Date(departure_time);
        const arrivalDate = new Date(arrival_time);
        const durationMs = arrivalDate - departureDate;

        if (durationMs < (60 * 60 * 1000) || durationMs > (4 * 60 * 60 * 1000)) {
            return res.status(400).json({ message: "Türkiye içi uçuş süresi 1 ile 4 saat arasında olmalıdır!" });
        }

        // Pist Meşguliyet Yönetimi ($ne ile mevcut uçuşu hariç tutuyoruz)
        const airportConflict = await Flight.findOne({
            _id: { $ne: req.params.id },
            $or: [
                { from_city: from_city, departure_time: departureDate },
                { to_city: to_city, arrival_time: arrivalDate }
            ]
        });
        if (airportConflict) {
            return res.status(400).json({ message: "Pist Meşgul! Havalimanında çakışan bir operasyon mevcut." });
        }

        const turnaroundTime = 45 * 60 * 1000;
        const conflictingFlight = await Flight.findOne({
            _id: { $ne: req.params.id },
            plane: plane_id,
            $or: [
                { 
                    arrival_time: { $gt: new Date(departureDate.getTime() - turnaroundTime) }, 
                    departure_time: { $lt: new Date(arrivalDate.getTime() + turnaroundTime) } 
                }
            ]
        });
        if (conflictingFlight) {
            return res.status(400).json({ message: "Uçak Meşgul! Seçilen uçak mola sürecinde veya başka bir seferde." });
        }

        // 🔒 OPERASYONEL KONUM KONTROLÜ: Uçağın güncellenmeden önceki son konum zincirini bozmasını engelleriz
        const lastFlightBefore = await Flight.findOne({ 
            _id: { $ne: req.params.id },
            plane: plane_id,
            arrival_time: { $lte: departureDate }
        }).sort({ arrival_time: -1 });

        if (lastFlightBefore && lastFlightBefore.to_city.toString() !== from_city.toString()) {
            return res.status(400).json({ 
                message: `Operasyonel Konum Hatası: Uçak bu saatten önce en son ${lastFlightBefore.to_city} şehrindeydi. Kalkış burası olmalı.` 
            });
        }

        const planeData = await Plane.findById(plane_id);
        if (!planeData) return res.status(404).json({ message: "Seçilen uçak filoda bulunamadı!" });

        const updatedFlight = await Flight.findByIdAndUpdate(
            req.params.id,
            {
                from_city,
                to_city,
                departure_time: departureDate,
                arrival_time: arrivalDate,
                business_price: bizPrice,
                economy_price: ecoPrice,
                plane: plane_id
            },
            { new: true }
        );

        if (!updatedFlight) return res.status(404).json({ message: "Güncellenecek uçuş kaydı bulunamadı." });

        res.json({ message: "Uçuş operasyon detayları başarıyla güncellendi!" });

    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ message: "Güncelleme sırasında sunucu hatası oluştu." });
    }
});

// --- 5. AYRI KOLEKSİYONDAN YOLCU MANİFESTOSUNU ÇEKME (GET) ---
router.get('/:id/passengers', async (req, res) => {
    try {
        const passengers = await Passenger.find({ flight_id: req.params.id }).sort({ booked_at: 1 });
        res.json(passengers);
    } catch (err) {
        res.status(500).json({ message: "Manifesto listeleme hatası." });
    }
});

// --- 6. SEFER LİSTELEME (GET) ---
router.get('/', async (req, res) => {
    try {
        const flights = await Flight.find().populate('from_city to_city plane').sort({ departure_time: 1 });
        res.json(flights);
    } catch (err) { res.status(500).json({ message: "Hata!" }); }
});

// --- 7. SEFER SİLME (DELETE) ---
router.delete('/:id', async (req, res) => {
    try {
        await Flight.findByIdAndDelete(req.params.id);
        await Passenger.deleteMany({ flight_id: req.params.id });
        res.json({ message: "Uçuş silindi." });
    } catch (err) { res.status(500).json({ message: "Hata!" }); }
});

module.exports = router;