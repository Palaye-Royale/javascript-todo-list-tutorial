/**
 * `empty` the contents of a given DOM element "node"
 */
function empty (node) {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
}


function mount (model, update, view, root_element_id, subscriptions) {
  console.log('mount вызвана!');
  var ROOT = document.getElementById(root_element_id);
  var currentModel = model || { todos: [], hash: '#/' };

  function render (mod, sig, root) {
    console.log('render вызван с моделью:', mod);
    currentModel = mod; // запоминаем текущую модель

    fetch('/todos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: mod.todos })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.todos) {
        mod.todos = data.todos;
        currentModel = mod; // обновляем после ответа сервера
      }
      empty(root);
      root.appendChild(view(mod, sig));
    })
    .catch(err => {
      console.error('Ошибка синхронизации:', err);
      empty(root);
      root.appendChild(view(mod, sig));
    });
  }

  function signal(action, data, model) {
    return function callback() {
      // всегда используем currentModel
      var updatedModel = update(action, currentModel, data);
      render(updatedModel, signal, ROOT);
    };
  }

  // Загружаем данные с сервера
  fetch('/todos')
    .then(res => res.json())
    .then(todosFromServer => {
      console.log('Данные с сервера:', todosFromServer);
      currentModel = { todos: todosFromServer, hash: '#/' };
      render(currentModel, signal, ROOT);
    })
    .catch(err => {
      console.error('Ошибка загрузки:', err);
      currentModel = { todos: [], hash: '#/' };
      render(currentModel, signal, ROOT);
    });

  if (subscriptions && typeof subscriptions === 'function') {
    subscriptions(signal);
  }
}


function add_attributes (attrlist, node) {
  if(attrlist && Array.isArray(attrlist) && attrlist.length > 0) {
    attrlist.forEach(function (attr) {
      if (typeof attr === 'function') { node.onclick = attr; return node; }
      var a = attr.split('=');
      switch(a[0]) {
        case 'autofocus':
          node.autofocus = "autofocus";
          node.focus();
          setTimeout(function() { node.focus(); }, 200);
          break;
        case 'checked':
          node.setAttribute('checked', true);
          break;
        case 'class':
          node.className = a[1];
          break;
        case 'data-id':
          node.setAttribute('data-id', a[1]);
          break;
        case 'for':
          node.setAttribute('for', a[1]);
          break;
        case 'href':
          node.href = a[1];
          break;
        case 'id':
          node.id = a[1];
          break;
        case 'placeholder':
          node.placeholder = a[1];
          break;
        case 'style':
          node.setAttribute("style", a[1]);
          break;
        case 'type':
          node.setAttribute('type', a[1]);
          break;
        case 'value':
          node.value = a[1];
          break;
        default:
          break;
      }
    });
  }
  return node;
}

function append_childnodes (childnodes, parent) {
  if(childnodes && Object.prototype.toString.call(childnodes) === '[object Array]' && childnodes.length > 0) {
    childnodes.forEach(function (el) { parent.appendChild(el); });
  }
  return parent;
}

function create_element (type, attrlist, childnodes) {
  return append_childnodes(childnodes, add_attributes(attrlist, document.createElement(type)));
}

function section (attrlist, childnodes) { return create_element('section', attrlist, childnodes); }
function a (attrlist, childnodes) { return create_element('a', attrlist, childnodes); }
function button (attrlist, childnodes) { return create_element('button', attrlist, childnodes); }
function div (attrlist, childnodes) { return create_element('div', attrlist, childnodes); }
function footer (attrlist, childnodes) { return create_element('footer', attrlist, childnodes); }
function header (attrlist, childnodes) { return create_element('header', attrlist, childnodes); }
function h1 (attrlist, childnodes) { return create_element('h1', attrlist, childnodes); }
function input (attrlist, childnodes) { return create_element('input', attrlist, childnodes); }
function label (attrlist, childnodes) { return create_element('label', attrlist, childnodes); }
function li (attrlist, childnodes) { return create_element('li', attrlist, childnodes); }
function span (attrlist, childnodes) { return create_element('span', attrlist, childnodes); }

function strong (text_str) {
  var el = document.createElement("strong");
  el.innerHTML = text_str;
  return el;
}

function text (text) {
  return document.createTextNode(text);
}

function ul (attrlist, childnodes) { return create_element('ul', attrlist, childnodes); }

function route (model, title, hash) {
  window.location.hash = hash;
  var new_state = JSON.parse(JSON.stringify(model));
  new_state.hash = hash;
  return new_state;
}