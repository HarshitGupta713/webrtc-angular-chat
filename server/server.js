const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const key = fs.readFileSync(path.join(__dirname, 'certs', 'cert.key'));
const cert = fs.readFileSync(path.join(__dirname, 'certs', 'cert.crt'));
const server = https.createServer({ key, cert }, app);

const io = socketIo(server, {
    cors: {
        origin: 'https://localhost:4200',
        methods: ['GET', 'POST']
    }
});

app.get('/', (req, res) => {
    res.send('<h1>WebRTC Signaling Server</h1><p>Socket.IO is running.</p>');
});

const clients = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    clients.set(socket.id, socket);

    socket.broadcast.emit('new-client', socket.id);

    socket.on('offer', (data) => {
        console.log('Offer from', socket.id, 'to', data.target);
        if (clients.has(data.target)) {
            clients.get(data.target).emit('offer', { ...data, from: socket.id });
        } else {
            console.log('Target not found:', data.target);
        }
    });

    socket.on('answer', (data) => {
        console.log('Answer from', socket.id, 'to', data.target);
        if (clients.has(data.target)) {
            clients.get(data.target).emit('answer', { ...data, from: socket.id });
        }
    });

    socket.on('ice-candidate', (data) => {
        console.log('ICE candidate from', socket.id, 'to', data.target);
        if (clients.has(data.target)) {
            clients.get(data.target).emit('ice-candidate', { ...data, from: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        clients.delete(socket.id);
        socket.broadcast.emit('client-disconnected', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on https://localhost:${PORT} and network IPs`);
});