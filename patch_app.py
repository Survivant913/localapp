import os

app_path = 'src/App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

target = """.on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
              setData(prev => {
                  let currentTodos = [...(prev.todos || [])];
                  if (payload.eventType === 'INSERT') {
                      if (!currentTodos.some(t => String(t.id) === String(payload.new.id))) currentTodos.push(payload.new);
                  } else if (payload.eventType === 'UPDATE') {
                      const idx = currentTodos.findIndex(t => String(t.id) === String(payload.new.id));
                      if (idx !== -1) currentTodos[idx] = payload.new;
                      else currentTodos.push(payload.new);
                  } else if (payload.eventType === 'DELETE') {
                      currentTodos = currentTodos.filter(t => String(t.id) !== String(payload.old.id));
                  }
                  return { ...prev, todos: currentTodos };
              });
          })"""

replacement = """.on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
            if (payload.eventType === 'DELETE') {
                supabase.from('todos').select('*').eq('id', payload.old.id).single().then(({ data: existingTodo }) => {
                    if (existingTodo) {
                        setData(prev => {
                            let currentTodos = [...(prev.todos || [])];
                            const idx = currentTodos.findIndex(t => String(t.id) === String(existingTodo.id));
                            if (idx !== -1) currentTodos[idx] = existingTodo;
                            else currentTodos.push(existingTodo);
                            return { ...prev, todos: currentTodos };
                        });
                    } else {
                        setData(prev => ({ ...prev, todos: (prev.todos || []).filter(t => String(t.id) !== String(payload.old.id)) }));
                    }
                });
            } else {
                setData(prev => {
                    let currentTodos = [...(prev.todos || [])];
                    if (payload.eventType === 'INSERT') {
                        if (!currentTodos.some(t => String(t.id) === String(payload.new.id))) currentTodos.push(payload.new);
                    } else if (payload.eventType === 'UPDATE') {
                        const idx = currentTodos.findIndex(t => String(t.id) === String(payload.new.id));
                        if (idx !== -1) currentTodos[idx] = payload.new;
                        else currentTodos.push(payload.new);
                    }
                    return { ...prev, todos: currentTodos };
                });
            }
        })"""

app = app.replace(target, replacement)
with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)
print("Replaced!")
