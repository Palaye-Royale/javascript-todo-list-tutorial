const fastify = require('fastify')({logger: false})
const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const db = new Database('todo.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT 0,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public')
})

fastify.get('/todos', async (req, reply) => {
  const userId = req.query.userId
  if (!userId) return reply.status(401).send({ error: 'Не авторизован' })
  const todos = db.prepare('SELECT * FROM todos WHERE user_id = ?').all(userId)
  reply.send(todos)
})

fastify.post('/todos', async (req, reply) => {
  const { title, userId } = req.body
  if (!title) return reply.status(400).send({ error: 'Нет названия' })
  if (!userId) return reply.status(401).send({ error: 'Не авторизован' })

  const result = db.prepare('INSERT INTO todos (title, user_id) VALUES (?, ?)').run(title, userId)
  const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid)
  reply.send(newTodo)
})

fastify.delete('/todos/:id', async (req, reply) => {
  const userId = req.query.userId
  if (!userId) return reply.status(401).send({ error: 'Не авторизован' })

  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, userId)
  if (!todo) return reply.status(404).send({ error: 'Задача не найдена' })

  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id)
  reply.send({ success: true })
})

fastify.post('/todos/sync', async (req, reply) => {
  const { todos, userId } = req.body
  if (!todos || !Array.isArray(todos)) return reply.status(400).send({ error: 'Некорректный список' })
  if (!userId) return reply.status(401).send({ error: 'Не авторизован' })

  // Удаляем только задачи этого пользователя
  db.prepare('DELETE FROM todos WHERE user_id = ?').run(userId)

  const insert = db.prepare('INSERT INTO todos (title, done, user_id) VALUES (?, ?, ?)')
  const newTodos = []
  for (const todo of todos) {
    const result = insert.run(todo.title, todo.done ? 1 : 0, userId)
    newTodos.push({
      id: result.lastInsertRowid,
      title: todo.title,
      done: todo.done
    })
  }

  reply.send({ success: true, todos: newTodos })
})

// Регистрация
fastify.post('/api/register', async (req, reply) => {
  const { email, password } = req.body
  if (!email || !password) {
    return reply.status(400).send({ error: 'Email и пароль обязательны' })
  }

  // Проверяем, не занят ли email
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (existing) {
    return reply.status(400).send({ error: 'Пользователь уже существует' })
  }

  // Хэшируем пароль
  const hash = await bcrypt.hash(password, 10)
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash)
  reply.send({ success: true, userId: result.lastInsertRowid })
})

// Логин
fastify.post('/api/login', async (req, reply) => {
  const { email, password } = req.body
  if (!email || !password) {
    return reply.status(400).send({ error: 'Email и пароль обязательны' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return reply.status(401).send({ error: 'Неверный email или пароль' })
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    return reply.status(401).send({ error: 'Неверный email или пароль' })
  }

  reply.send({ success: true, userId: user.id })
})

fastify.listen({ port: 3000}, (err) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log('Сервер запущен на http:localhost:3000')
})
