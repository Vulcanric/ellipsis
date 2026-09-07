const state = { tasks: [], theme: localStorage.getItem('ellipsis-theme') || 'light' };
const $ = (selector) => document.querySelector(selector);

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  setTimeout(() => node.classList.remove('visible'), 2600);
}

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
  if (!response.ok) throw new Error((await response.json()).detail || 'Request failed');
  return response.json();
}

function taskCard(task) {
  const date = new Date(task.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `<article class="task-row"><div class="task-icon">◈</div><div class="task-copy"><strong>${escapeHtml(task.instruction)}</strong><span>${date} · ${task.approval_policy === 'irreversible-actions' ? 'Approval gates on' : 'Custom policy'}</span></div><span class="status ${task.status}">${task.status}</span><button class="run-button" data-task-id="${task.id}">Start run</button></article>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function loadTasks() {
  try {
    state.tasks = await request('/v1/tasks');
    $('#apiStatus').textContent = '● API connected';
    $('#apiStatus').className = 'api-status connected';
    $('#runList').innerHTML = state.tasks.length ? state.tasks.map(taskCard).join('') : '<div class="empty">No tasks yet. Give ellipsis its first job above.</div>';
    document.querySelectorAll('.run-button').forEach((button) => button.addEventListener('click', () => startRun(button.dataset.taskId, button)));
  } catch (error) {
    $('#apiStatus').textContent = '● API unavailable';
    $('#apiStatus').className = 'api-status error';
    $('#runList').innerHTML = `<div class="empty error-text">${escapeHtml(error.message)}. Start the API with <code>uvicorn services.control_plane.main:app --reload</code>.</div>`;
  }
}

async function startRun(taskId, button) {
  button.disabled = true;
  button.textContent = 'Starting...';
  try {
    const run = await request(`/v1/tasks/${taskId}/runs`, { method: 'POST' });
    toast(`Run ${run.id.slice(0, 8)} started`);
    button.textContent = 'Running';
    button.classList.add('running');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Start run';
    toast(error.message);
  }
}

$('#taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#submitTask');
  button.disabled = true;
  try {
    await request('/v1/tasks', { method: 'POST', body: JSON.stringify({ instruction: $('#instruction').value.trim(), approval_policy: $('#approvalPolicy').checked ? 'irreversible-actions' : 'none' }) });
    $('#instruction').value = '';
    toast('Task created and ready to run');
    await loadTasks();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});

$('#refreshButton').addEventListener('click', loadTasks);
$('#themeButton').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('ellipsis-theme', state.theme);
  $('#themeButton').textContent = state.theme === 'dark' ? '☀' : '☾';
});

document.documentElement.dataset.theme = state.theme;
$('#themeButton').textContent = state.theme === 'dark' ? '☀' : '☾';
loadTasks();
