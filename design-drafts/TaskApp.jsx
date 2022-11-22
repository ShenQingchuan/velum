import { atom, For, render } from 'velum'

function TaskApp() {
  // States
  const textInput = atom('')
  const tasks = atom([{ 
    content: 'Learn Velum',
    done: false, 
    deleted: false 
  }])


  // Handlers
  const submitInput = () => {
    tasks().push({ content: textInput(), done: false, deleted: false })
    textInput.set('')
  }

  return (
    <div class="task-app">
      <h2 class="task-app__title">Task App</h2>
      <div class="task-app__typing-box">
        <input class="task-app__input" vSync={textInput} />
        <button class="task-app__submit" onClick={submitInput} />
      </div>

      <ul class="task-app__task-list">
        <For each={tasks().filtered(t => !t.deleted)}>{(task, i) => (
          <li class={{
            'task-app__task-item': true,
            'task-app__task-item-done': task.done
          }}>
            <span class="task-app__task-item-name">{i+1}: {task.content}</span>
            <button class="task-app__task-item-done" onClick={() => task.done = true}>Done</button>
            <button class="task-app__task-item-delete" onClick={() => task.deleted = true}>Delete</button>
          </li>
        )}</For>
      </ul>
    </div>
  )
}

render(TaskApp, "#app")