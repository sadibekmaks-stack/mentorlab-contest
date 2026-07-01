const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Создаём таблицу при старте
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      name TEXT NOT NULL,
      link TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      platform TEXT NOT NULL,
      date TEXT NOT NULL,
      verified BOOLEAN DEFAULT FALSE
    )
  `);
  console.log('Database ready');
}

// Получить все посты
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY id DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Добавить пост
app.post('/api/posts', async (req, res) => {
  try {
    const { phone, name, link, views, platform, date } = req.body;
    if (!phone || !name || !link || !views || !platform) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    const result = await pool.query(
      'INSERT INTO posts (phone, name, link, views, platform, date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [phone.trim(), name.trim(), link.trim(), parseInt(views), platform, date]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить просмотры или верификацию
app.patch('/api/posts/:id', async (req, res) => {
  try {
    const { views, verified } = req.body;
    const fields = [];
    const vals = [];
    if (views !== undefined) { fields.push(`views=$${vals.length + 1}`); vals.push(parseInt(views)); }
    if (verified !== undefined) { fields.push(`verified=$${vals.length + 1}`); vals.push(verified); }
    if (!fields.length) return res.status(400).json({ error: 'Нечего обновлять' });
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE posts SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить пост
app.delete('/api/posts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
init().then(() => {
  app.listen(PORT, () => console.log(`MentorLab Contest запущен на порту ${PORT}`));
});
