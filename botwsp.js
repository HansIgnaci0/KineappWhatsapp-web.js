const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Create a new client instance with LocalAuth to persist session
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'kineapp' })
});

let clientReady = false;

client.once('ready', () => {
    clientReady = true;
    console.log('WhatsApp client is ready!');
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR RECEIVED', qr);
});

client.on('auth_failure', msg => {
    console.error('Auth failure:', msg);
});

client.initialize();

// --- Express server to receive reservation requests ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

// POST /send-reservation
// body: { to: '56912345678', specialty, name, rut, phone, date, time }
app.post('/send-reservation', async (req, res) => {
    const body = req.body || {};
    const { to, specialty, name, rut, phone, date, time } = body;

    if (!to) return res.status(400).json({ ok: false, error: 'Missing "to" phone number in request body' });
    if (!specialty || !name || !rut || !phone || !date || !time) {
        return res.status(400).json({ ok: false, error: 'Missing reservation fields' });
    }

    if (!clientReady) return res.status(503).json({ ok: false, error: 'WhatsApp client not ready yet' });

    // Normalize target (strip + and non-digits)
    const onlyDigits = String(to).replace(/\D/g, '');
    const chatId = `${56930907224}@c.us`;

    const message = `Nueva reserva\nEspecialidad: ${specialty}\nNombre: ${name}\nRUT: ${rut}\nTeléfono: ${phone}\nFecha: ${date}\nHora: ${time}`;

    try {
        const sent = await client.sendMessage(chatId, message);
        console.log('Message sent', sent.id._serialized);
        return res.json({ ok: true, result: sent.id._serialized });
    } catch (err) {
        console.error('Send message error', err);
        return res.status(500).json({ ok: false, error: String(err) });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Reservation webhook listening on http://localhost:${PORT}`));
