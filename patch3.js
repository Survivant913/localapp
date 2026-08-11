const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

const searchIndex = app.indexOf("todo_list_shares: currentShares };");
if (searchIndex > -1) {
    const endOfBlockIndex = app.indexOf("})", searchIndex) + 2;
    const insertion = "\n" +
"        .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_lists' }, (payload) => {\n" +
"              setData(prev => {\n" +
"                  let currentLists = [...(prev.todoLists || [])];\n" +
"                  if (payload.eventType === 'INSERT') {\n" +
"                      if (!currentLists.some(l => String(l.id) === String(payload.new.id))) currentLists.push(payload.new);\n" +
"                  } else if (payload.eventType === 'UPDATE') {\n" +
"                      const idx = currentLists.findIndex(l => String(l.id) === String(payload.new.id));\n" +
"                      if (idx !== -1) currentLists[idx] = payload.new;\n" +
"                      else currentLists.push(payload.new);\n" +
"                  } else if (payload.eventType === 'DELETE') {\n" +
"                      currentLists = currentLists.filter(l => String(l.id) !== String(payload.old.id));\n" +
"                  }\n" +
"                  return { ...prev, todoLists: currentLists };\n" +
"              });\n" +
"          })\n" +
"        .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {\n" +
"              setData(prev => {\n" +
"                  let currentTodos = [...(prev.todos || [])];\n" +
"                  if (payload.eventType === 'INSERT') {\n" +
"                      if (!currentTodos.some(t => String(t.id) === String(payload.new.id))) currentTodos.push(payload.new);\n" +
"                  } else if (payload.eventType === 'UPDATE') {\n" +
"                      const idx = currentTodos.findIndex(t => String(t.id) === String(payload.new.id));\n" +
"                      if (idx !== -1) currentTodos[idx] = payload.new;\n" +
"                      else currentTodos.push(payload.new);\n" +
"                  } else if (payload.eventType === 'DELETE') {\n" +
"                      currentTodos = currentTodos.filter(t => String(t.id) !== String(payload.old.id));\n" +
"                  }\n" +
"                  return { ...prev, todos: currentTodos };\n" +
"              });\n" +
"          })";
    
    app = app.substring(0, endOfBlockIndex) + insertion + app.substring(endOfBlockIndex);
    fs.writeFileSync('src/App.jsx', app, 'utf8');
    console.log('Success inserted');
} else {
    console.log('Not found block');
}
