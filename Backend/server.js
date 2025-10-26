// Backend/server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Cambia a tu dominio si deseas limitarlo (ej: 'https://uru-noticias.ml')
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'noticias-secret',
  resave: false,
  saveUninitialized: true
}));

// Rutas

// Ruta de prueba
app.get('/ping', (req, res) => {
  res.send('Servidor funcionando ✅');
});

// Obtener todas las categorías
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener categorías');
  }
});

// Guardar preferencias del usuario
app.post('/api/preferences', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('No autenticado');

  const userId = req.session.userId;
  const categoryIds = req.body.categoryIds;

  try {
    await db.query('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

    const values = categoryIds.map(cid => [userId, cid]);
    if (values.length > 0) {
      await db.query('INSERT INTO user_preferences (user_id, category_id) VALUES ?', [values]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar preferencias');
  }
});

// Obtener noticias personalizadas
app.get('/api/news', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('No autenticado');

  try {
    const userId = req.session.userId;

    const [news] = await db.query(`
      SELECT n.*
      FROM news_articles n
      JOIN user_preferences up ON n.category_id = up.category_id
      WHERE up.user_id = ?
      ORDER BY n.pub_date DESC
      LIMIT 20
    `, [userId]);

    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar noticias');
  }
});

// Ruta de login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).send('Usuario no encontrado');

    const user = rows[0];

    if (password !== user.password_hash) {
      return res.status(401).send('Contraseña incorrecta');
    }

    req.session.userId = user.user_id;
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error de servidor');
  }
});
// Ruta de registro
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).send('Este correo ya está registrado');

    await db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al registrar usuario');
  }
});

// Ruta de logout
app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Servir archivos estáticos (si sirve frontend desde aquí)
app.use(express.static('Public'));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
