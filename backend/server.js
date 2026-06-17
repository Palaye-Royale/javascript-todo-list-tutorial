const fastify = require('fastify')({logger: false})
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database('todo.db')

db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done BOLLEAN DEFAULT 0
    )
`)

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'public')
})

fastify.get('/todos', async (req, reply) => {
    const todos = db.prepare('SELECT * FROM todos').all()
    reply.send(todos)
})

fastify.post('/todos', async (req, reply) => {
    const {title} = req.body
    if (!title) return reply.status(400).send({ error: "Нет названия!" })
    
    const result = db.prepare('INSERT INTO todos (title) VALUES (?)').run(title)
    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid)
    reply.send(newTodo)
})

fastify.delete('/todos/:id', async (req, reply) => {
    const { id } = req.params
    db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    reply.send({ success: true })
})

fastify.post('/todos/sync', async (req, reply) => {
  const { todos } = req.body
  if (!todos || !Array.isArray(todos)) {
    return reply.status(400).send({ error: 'Некорректный список' })
  }

  // Очищаем таблицу
  db.prepare('DELETE FROM todos').run()

  // Вставляем задачи и собираем их с новыми id
  const insert = db.prepare('INSERT INTO todos (title, done) VALUES (?, ?)')
  const newTodos = []

  for (const todo of todos) {
    const result = insert.run(todo.title, todo.done ? 1 : 0)
    newTodos.push({
      id: result.lastInsertRowid,
      title: todo.title,
      done: todo.done
    })
  }

  reply.send({ success: true, todos: newTodos })
})

fastify.listen({ port: 3000}, (err) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log('Сервер запущен на http:localhost:3000')
})
