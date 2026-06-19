// public/js/auth.js

(function() {
  // Элементы
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const closeModalBtns = document.querySelectorAll('.close-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');
  const authLinks = document.getElementById('auth-links');
  const logoutBtn = document.getElementById('logout-btn');

  // Функции управления модалками
  function openModal(modal) {
    modal.classList.remove('hidden');
    modal.classList.add('show');
  }

  function closeModal(modal) {
    modal.classList.remove('show');
    modal.classList.add('hidden');
    const error = modal.querySelector('.auth-error');
    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }
    const form = modal.querySelector('form');
    if (form) form.reset();
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
  }

  // Функция для переноса гостевых задач на сервер
async function syncGuestTodos(userId) {
  console.log('=== syncGuestTodos вызвана, userId:', userId);
  const guestTodos = sessionStorage.getItem('guest_todos');
  console.log('guestTodos из sessionStorage:', guestTodos);

  if (!guestTodos || guestTodos === '[]' || guestTodos === 'null') {
    console.log('Нет гостевых задач или они пустые, выходим');
    return;
  }

  const guestTodosParsed = JSON.parse(guestTodos);
  if (guestTodosParsed.length === 0) {
    console.log('Гостевой список пуст, выходим');
    return;
  }

  try {
    // 1. Загружаем текущие задачи пользователя с сервера
    const res = await fetch('/todos?userId=' + userId);
    const serverTodos = await res.json();
    console.log('Задачи на сервере до объединения:', serverTodos);

    // 2. Объединяем: серверные + гостевые (избегаем дублирования по id)
    const allTodos = [...serverTodos];
    for (const guestTodo of guestTodosParsed) {
      // Проверяем, нет ли уже такой задачи на сервере (по названию)
      const exists = allTodos.some(t => t.title === guestTodo.title && t.done === guestTodo.done);
      if (!exists) {
        allTodos.push({
          id: allTodos.length + 1, // временный id, сервер сгенерирует свой
          title: guestTodo.title,
          done: guestTodo.done || false
        });
      }
    }

    console.log('Объединённый список для отправки:', allTodos);

    // 3. Отправляем объединённый список на сервер (через /sync)
    const syncRes = await fetch('/todos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todos: allTodos,
        userId: userId
      })
    });

    if (syncRes.ok) {
      sessionStorage.removeItem('guest_todos');
      console.log('Гостевые задачи успешно объединены с серверными');
    } else {
      console.error('Ошибка объединения задач');
    }
  } catch (err) {
    console.error('Ошибка соединения при объединении задач:', err);
  }
}
  // Обновление интерфейса в зависимости от статуса авторизации
  function updateUI() {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      authLinks.style.display = 'none';
      logoutBtn.style.display = 'block';
    } else {
      authLinks.style.display = 'block';
      logoutBtn.style.display = 'none';
    }
  }

  // Выход из системы
  function logout() {
    // Удаляем данные пользователя
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('guest_todos');
    
    // Обновляем интерфейс
    updateUI();
    
    // Перезагружаем страницу, чтобы приложение перешло в режим гостя
    window.location.reload();
  }

  // Клик по ссылкам
  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(loginModal);
  });

  registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(registerModal);
  });

  // Закрытие по крестику
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalType = btn.dataset.modal;
      if (modalType === 'login') closeModal(loginModal);
      else if (modalType === 'register') closeModal(registerModal);
    });
  });

  // Обработка регистрации
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  registerError.classList.add('hidden');
  registerError.textContent = '';

  // Проверка совпадения паролей
  if (password !== passwordConfirm) {
    showError(registerError, 'Пароли не совпадают');
    return;
  }

  // Проверка длины пароля (опционально)
  if (password.length < 6) {
    showError(registerError, 'Пароль должен быть не менее 6 символов');
    return;
  }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          const userId = loginData.userId;
          sessionStorage.setItem('userId', userId);
          await syncGuestTodos(userId);
          updateUI();
          window.location.reload();
        } else {
          showError(registerError, loginData.error || 'Ошибка входа после регистрации');
        }
      } else {
        showError(registerError, data.error || 'Ошибка регистрации');
      }
    } catch (err) {
      showError(registerError, 'Ошибка соединения с сервером');
    }
  });

  // Обработка логина
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    loginError.classList.add('hidden');
    loginError.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        const userId = data.userId;
        sessionStorage.setItem('userId', userId);
        await syncGuestTodos(userId);
        updateUI();
        window.location.reload();
      } else {
        showError(loginError, data.error || 'Неверный email или пароль');
      }
    } catch (err) {
      showError(loginError, 'Ошибка соединения с сервером');
    }
  });

  // Кнопка "Выйти"
  logoutBtn.addEventListener('click', logout);

  // Инициализация UI
  updateUI();
})();