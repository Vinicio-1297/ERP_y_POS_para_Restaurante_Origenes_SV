require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const healthRoutes = require('./routes/healthRoutes');
const posRoutes = require('./routes/posRoutes');
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const sucursalRoutes = require('./routes/sucursalRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const planillaRoutes = require('./routes/planillaRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', clienteRoutes);
app.use('/api', sucursalRoutes);
app.use('/api', posRoutes);
app.use('/api', empleadoRoutes);
app.use('/api', cajaRoutes);
app.use('/api', reporteRoutes);
app.use('/api', planillaRoutes);
app.use(errorHandler);

module.exports = app;
