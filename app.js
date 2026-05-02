const API_URL = window.TODO_DASHBOARD_CONFIG?.GAS_API_URL || '';

const state = {
  tasks: [],
  quickLinks: [],
  events: [],
  routines: [],
  routineLogs: [],
  quickTodos: [],
  shoppingList: [],
  improvementIdeas: [],
  autoLogs: [],
  selectedTaskId: '',
  filter: 'all',
  typeFilter: '',
  categoryFilter: '',
  notificationView: 'unread',
  ideaView: 'open',
  currentPage: 'dashboard',
  quickTodoView: 'open',
  shoppingView: 'open',
  isEditingTask: false
};

const els = {};
const pageRuntime = {
  anchor: null,
  pages: {}
};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  bindEvents();
  restoreSidebarState();
  resetQuickTodoDueDate();
  renderActionCenter();
  renderNotifications();
  loadInitialData();
  setInterval(renderTimeline, 60000);
  setInterval(loadInitialData, 5 * 60 * 1000);
});

function bindElements() {
  [
    'menuButton', 'quickLinks', 'searchInput', 'statusFilter', 'reloadButton', 'taskTotal', 'countAll',
    'countTodo', 'countWorking', 'countHold', 'countDone', 'notificationButton', 'notificationBadge',
    'notificationPopover', 'notificationList', 'typeNav', 'categoryNav', 'taskTableBody', 'newTaskButton', 'newTaskButtonInline',
    'taskForm', 'taskSaveButton', 'taskId', 'detailId', 'title', 'body', 'status', 'priority', 'progress', 'dueDate', 'todayFlag',
    'category', 'type', 'relatedUrl', 'chatgptUrl', 'folderUrl', 'nextAction', 'deleteButton', 'timeline', 'todayLabel',
    'calendarRefreshButton', 'currentRoutineLine', 'weeklyRange', 'weeklyReport',
    'dashboardPage', 'quickTodosPage', 'shoppingListPage',
    'quickTodoForm', 'quickTodoTitle', 'quickTodoPriority', 'quickTodoDueDate', 'quickTodoUrl', 'quickTodoList',
    'shoppingForm', 'shoppingName', 'shoppingCategory', 'shoppingQuantity', 'shoppingUrl', 'shoppingList',
    'actionCenterList', 'toggleIdeasButton', 'newIdeaButton',
    'ideaList', 'ideaDialog', 'ideaForm', 'ideaId', 'ideaTitle', 'ideaBody', 'ideaStatus', 'ideaPriority',
    'deleteIdeaButton', 'toast', 'categoryOptions', 'typeOptions'
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
  pageRuntime.anchor = document.createComment('current-page');
  els.dashboardPage.before(pageRuntime.anchor);
  pageRuntime.pages = {
    dashboard: els.dashboardPage,
    quickTodos: els.quickTodosPage,
    shoppingList: els.shoppingListPage
  };
}

function bindEvents() {
  els.menuButton.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('todoSidebarCollapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
  });
  els.reloadButton.addEventListener('click', (event) => runButtonTask(event.currentTarget, '読み込み中...', loadInitialData));
  els.newTaskButton.addEventListener('click', () => selectTask(null));
  els.newTaskButtonInline.addEventListener('click', () => selectTask(null));
  els.searchInput.addEventListener('input', renderTasks);
  els.statusFilter.addEventListener('change', renderTasks);
  els.status.addEventListener('change', updateTaskSelectColors);
  els.priority.addEventListener('change', updateTaskSelectColors);
  els.taskForm.addEventListener('submit', saveTask);
  els.taskForm.addEventListener('input', () => {
    state.isEditingTask = true;
  });
  els.deleteButton.addEventListener('click', (event) => deleteSelectedTask(event.currentTarget));
  els.calendarRefreshButton.addEventListener('click', (event) => refreshCalendar(event.currentTarget));
  els.notificationButton.addEventListener('click', () => {
    els.notificationPopover.hidden = !els.notificationPopover.hidden;
  });
  els.toggleIdeasButton.addEventListener('click', () => {
    els.ideaList.hidden = !els.ideaList.hidden;
  });
  els.newIdeaButton.addEventListener('click', () => openIdeaModal(null));
  els.ideaForm.addEventListener('submit', saveImprovementIdea);
  els.quickTodoForm.addEventListener('submit', addQuickTodo);
  els.shoppingForm.addEventListener('submit', addShoppingItem);
  els.deleteIdeaButton.addEventListener('click', (event) => deleteSelectedIdea(event.currentTarget));
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      state.currentPage = button.dataset.page;
      renderPage();
      renderCurrentPageContent();
    });
  });
  document.querySelectorAll('[data-quick-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-quick-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.quickTodoView = button.dataset.quickView;
      renderQuickTodos();
    });
  });
  document.querySelectorAll('[data-shopping-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-shopping-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.shoppingView = button.dataset.shoppingView;
      renderShoppingList();
    });
  });
  document.querySelectorAll('[data-notification-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-notification-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.notificationView = button.dataset.notificationView;
      renderActionCenter();
    });
  });
  document.querySelectorAll('[data-idea-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-idea-view]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.ideaView = button.dataset.ideaView;
      renderTaskIdeas();
    });
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
  });
  document.querySelectorAll('.nav-item[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item[data-filter]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.filter = button.dataset.filter;
      state.typeFilter = '';
      state.categoryFilter = '';
      renderTasks();
    });
  });
  updateTaskSelectColors();
}

function restoreSidebarState() {
  document.body.classList.toggle('sidebar-collapsed', localStorage.getItem('todoSidebarCollapsed') === '1');
}

async function runButtonTask(button, busyText, task) {
  if (button?.disabled) return undefined;
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    if (busyText) button.textContent = busyText;
  }
  try {
    return await task();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

async function loadInitialData() {
  toast('読み込み中...');
  const selectedId = state.selectedTaskId;
  const isEditing = state.isEditingTask;
  try {
    const data = await apiGet('getInitialData');
    state.tasks = data.tasks || [];
    state.quickLinks = data.quickLinks || [];
    state.events = data.events || [];
    state.routines = data.routines || [];
    state.routineLogs = data.routineLogs || [];
    state.quickTodos = data.quickTodos || [];
    state.shoppingList = data.shoppingList || [];
    state.improvementIdeas = data.improvementIdeas || [];
    state.autoLogs = data.notifications || [];
    els.todayLabel.textContent = formatDateLabel(data.today);
    renderAll();
    if (state.currentPage !== 'dashboard') {
      state.selectedTaskId = selectedId;
    } else if (!isEditing) {
      const selected = state.tasks.find((task) => task.ID === selectedId);
      const first = filteredTasks()[0] || state.tasks[0] || null;
      selectTask(selected ? selected.ID : (first ? first.ID : null));
    } else {
      state.selectedTaskId = selectedId;
      renderTasks();
      renderTaskIdeas();
    }
    toast('更新しました');
  } catch (error) {
    showError(error);
  }
}

function renderAll() {
  renderPage();
  renderCurrentPageContent();
}

function renderCurrentPageContent() {
  if (state.currentPage === 'quickTodos') {
    resetQuickTodoDueDate();
    renderQuickTodos();
    return;
  }
  if (state.currentPage === 'shoppingList') {
    renderShoppingList();
    return;
  }
  renderQuickLinks();
  renderCounts();
  renderSideFilters();
  renderTasks();
  renderTimeline();
  renderWeeklyReport();
  renderOptions();
  renderActionCenter();
  renderNotifications();
}

function renderPage() {
  const activePage = pageRuntime.pages[state.currentPage] || pageRuntime.pages.dashboard;
  Object.values(pageRuntime.pages).forEach((element) => {
    if (!element) return;
    element.hidden = false;
    if (element !== activePage && element.isConnected) element.remove();
  });
  if (activePage && !activePage.isConnected) pageRuntime.anchor.after(activePage);
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === state.currentPage);
  });
}

function renderQuickLinks() {
  els.quickLinks.innerHTML = '';
  state.quickLinks.slice(0, 7).forEach((link) => {
    const a = document.createElement('a');
    a.className = 'quick-link';
    a.href = link['URL'];
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.title = link['名前'];
    a.innerHTML = `<img src="${escapeAttr(link['アイコン画像URL'])}" alt=""><span>${escapeHtml(link['名前'])}</span>`;
    els.quickLinks.appendChild(a);
  });
}

function renderCounts() {
  const counts = countByStatus();
  els.taskTotal.textContent = `(${state.tasks.length}件)`;
  els.countAll.textContent = state.tasks.length;
  els.countTodo.textContent = counts['未着手'] || 0;
  els.countWorking.textContent = counts['作業中'] || 0;
  els.countHold.textContent = counts['保留'] || 0;
  els.countDone.textContent = counts['完了'] || 0;
}

function renderSideFilters() {
  renderSideList(els.typeNav, '種別', state.typeFilter, '◎', (value) => {
    state.typeFilter = value;
    state.categoryFilter = '';
    renderTasks();
  });
  renderSideList(els.categoryNav, 'カテゴリ', state.categoryFilter, '▣', (value) => {
    state.categoryFilter = value;
    state.typeFilter = '';
    renderTasks();
  });
}

function renderSideList(container, key, activeValue, icon, onClick) {
  const counts = state.tasks.reduce((map, task) => {
    const value = task[key] || '未分類';
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
  container.innerHTML = '';
  Object.keys(counts).sort().forEach((value) => {
    const button = document.createElement('button');
    button.className = 'side-filter' + (value === activeValue ? ' active' : '');
    button.title = value;
    button.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-label">${escapeHtml(value)}</span><b>${counts[value]}</b>`;
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item[data-filter]').forEach((item) => item.classList.remove('active'));
      state.filter = 'all';
      onClick(value);
    });
    container.appendChild(button);
  });
}

function renderTasks() {
  const rows = filteredTasks();
  els.taskTableBody.innerHTML = '';
  if (!rows.length) {
    els.taskTableBody.innerHTML = '<tr><td colspan="9">該当するタスクはありません</td></tr>';
    return;
  }
  rows.forEach((task) => {
    const tr = document.createElement('tr');
    tr.className = task.ID === state.selectedTaskId ? 'selected' : '';
    tr.innerHTML = `
      <td>${escapeHtml(shortId(task.ID))}</td>
      <td><span class="task-title-cell title">${escapeHtml(task['タイトル'])}</span></td>
      <td>${progressBar(task['進捗'])}</td>
      <td>${badge(task['ステータス'] || '未着手', statusClass(task['ステータス']))}</td>
      <td>${badge(task['優先度'] || '中', priorityClass(task['優先度']))}</td>
      <td>${escapeHtml(dateOnly(task['期限']) || '—')}</td>
      <td>${taskUrlLink(task['ChatGPT URL'], 'ChatGPT')}</td>
      <td>${taskUrlLink(task['フォルダURL'], 'Drive')}</td>
      <td>${escapeHtml(dateOnly(task['更新日']) || '—')}</td>
    `;
    tr.addEventListener('click', () => selectTask(task.ID));
    els.taskTableBody.appendChild(tr);
  });
}

function taskUrlLink(url, label) {
  if (!url) return '<span class="meta">—</span>';
  const iconMap = {
    ChatGPT: './image/ChatGPT.png',
    Drive: './image/GoogleDrive.png'
  };
  const icon = iconMap[label];
  const content = icon
    ? `<img src="${escapeAttr(icon)}" alt="${escapeAttr(label)}">`
    : escapeHtml(label);
  return `<a class="task-url-link icon-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer" title="${escapeAttr(label)}を開く" aria-label="${escapeAttr(label)}を開く" onclick="event.stopPropagation()">${content}</a>`;
}

function progressBar(value) {
  const progress = clamp(Number(value || 0), 0, 100);
  return `
    <span class="progress-cell" title="${progress}%">
      <span class="progress-track"><span class="progress-fill" style="width:${progress}%"></span></span>
      <span class="progress-label">${progress}%</span>
    </span>
  `;
}

function filteredTasks() {
  const query = els.searchInput.value.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const text = [task['タイトル'], task['内容'], task['カテゴリ'], task['種別']].join(' ').toLowerCase();
    if (query && !text.includes(query)) return false;
    if (els.statusFilter.value && task['ステータス'] !== els.statusFilter.value) return false;
    if (state.typeFilter && (task['種別'] || '未分類') !== state.typeFilter) return false;
    if (state.categoryFilter && (task['カテゴリ'] || '未分類') !== state.categoryFilter) return false;
    if (state.filter === 'todo' && task['ステータス'] !== '未着手') return false;
    if (state.filter === 'working' && task['ステータス'] !== '作業中') return false;
    if (state.filter === 'hold' && task['ステータス'] !== '保留') return false;
    if (state.filter === 'done' && task['ステータス'] !== '完了') return false;
    return true;
  });
}

function selectTask(id) {
  const task = state.tasks.find((item) => item.ID === id) || {};
  state.isEditingTask = false;
  state.selectedTaskId = task.ID || '';
  els.taskId.value = task.ID || '';
  els.detailId.textContent = task.ID ? shortId(task.ID) : '-';
  els.title.value = task['タイトル'] || '';
  els.body.value = task['内容'] || '';
  els.status.value = task['ステータス'] || '未着手';
  els.priority.value = task['優先度'] || '中';
  els.progress.value = task['進捗'] || 0;
  els.dueDate.value = task['期限'] || '';
  els.todayFlag.checked = toBool(task['今日やるフラグ']);
  els.category.value = task['カテゴリ'] || '';
  els.type.value = task['種別'] || '';
  els.relatedUrl.value = task['関連URL'] || '';
  els.chatgptUrl.value = task['ChatGPT URL'] || '';
  els.folderUrl.value = task['フォルダURL'] || '';
  els.nextAction.value = task['次アクション'] || '';
  els.deleteButton.disabled = !task.ID;
  updateTaskSelectColors();
  renderTaskIdeas();
  renderTasks();
}

async function saveTask(event) {
  event.preventDefault();
  if (els.taskSaveButton.disabled) return;
  const task = formToTask();
  const action = task.ID ? 'updateTask' : 'addTask';
  els.taskSaveButton.disabled = true;
  els.taskSaveButton.textContent = '保存中...';
  toast('保存中...');
  try {
    const saved = await apiPost(action, task);
    const index = state.tasks.findIndex((item) => item.ID === saved.ID);
    if (index >= 0) state.tasks.splice(index, 1, saved);
    else state.tasks.push(saved);
    state.selectedTaskId = saved.ID;
    state.isEditingTask = false;
    renderAll();
    selectTask(saved.ID);
    toast(saved.warning || '保存しました');
  } catch (error) {
    showError(error);
  } finally {
    els.taskSaveButton.disabled = false;
    els.taskSaveButton.textContent = '保存';
  }
}

async function deleteSelectedTask(button) {
  const id = els.taskId.value;
  if (!id || !confirm('このタスクを削除しますか？')) return;
  return runButtonTask(button, '削除中...', async () => {
    await apiPost('deleteTask', { id });
    state.tasks = state.tasks.filter((task) => task.ID !== id);
    state.isEditingTask = false;
    renderAll();
    selectTask(filteredTasks()[0] ? filteredTasks()[0].ID : null);
    toast('削除しました');
  }).catch(showError);
}

function formToTask() {
  return {
    ID: els.taskId.value,
    'タイトル': els.title.value.trim(),
    '内容': els.body.value.trim(),
    'ステータス': els.status.value,
    '優先度': els.priority.value,
    '進捗': els.progress.value,
    '今日やるフラグ': els.todayFlag.checked,
    '期限': els.dueDate.value,
    'カテゴリ': els.category.value.trim(),
    '種別': els.type.value.trim(),
    '関連URL': els.relatedUrl.value.trim(),
    'ChatGPT URL': els.chatgptUrl.value.trim(),
    'フォルダURL': els.folderUrl.value.trim(),
    '次アクション': els.nextAction.value.trim()
  };
}

function updateTaskSelectColors() {
  applySelectColor(els.status, statusClass(els.status.value));
  applySelectColor(els.priority, priorityClass(els.priority.value));
}

function applySelectColor(select, className) {
  select.classList.remove('badge-todo', 'badge-working', 'badge-hold', 'badge-done', 'badge-high', 'badge-middle', 'badge-low');
  select.classList.add(className || 'badge-normal');
}

async function refreshCalendar(button) {
  return runButtonTask(button, '更新中...', async () => {
  toast('予定を取得中...');
  try {
    state.events = await apiGet('refreshTodayEvents');
    renderTimeline();
    toast('予定を更新しました');
  } catch (error) {
    showError(error);
  }
  });
}

function renderActionCenter() {
  const notifications = filteredNotifications();
  els.actionCenterList.innerHTML = '';
  if (!notifications.length) {
    els.actionCenterList.innerHTML = '<div class="notification-empty">通知はありません</div>';
    return;
  }
  notifications.forEach((notice) => {
    const card = document.createElement('article');
    card.className = `notification-card ${notice.status}${notice.is_read ? ' is-read' : ''}`;
    card.dataset.open = notice.status === 'error' ? 'true' : 'false';
    card.innerHTML = `
      <span class="notification-card-icon">${notificationIcon(notice)}</span>
      <div class="notification-card-main">
        <div class="notification-card-kicker">
          <span>${escapeHtml(notificationTypeLabel(notice.type))}</span>
          <time>${escapeHtml(formatNotificationTime(notice.created_at || notice.time || ''))}</time>
        </div>
        <h3>${escapeHtml(notice.title)}</h3>
        <p>${escapeHtml(notice.description)}</p>
      </div>
      <div class="notification-card-side">
        <span class="notification-badge">${escapeHtml(notificationStatusLabel(notice.status))}</span>
        <div class="notification-actions">
          ${notificationActionButtons(notice)}
        </div>
      </div>
    `;
    card.querySelectorAll('[data-notice-action]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        handleNoticeAction(notice, button.dataset.noticeAction, card, button);
      });
    });
    els.actionCenterList.appendChild(card);
  });
}

function renderNotifications() {
  const notifications = sortedNotifications().filter((notice) => !notice.is_read);
  els.notificationBadge.textContent = notifications.length;
  els.notificationBadge.hidden = notifications.length === 0;
  els.notificationList.innerHTML = notifications.length
    ? notifications.map((notice) => `<div class="notification-item">${escapeHtml(formatNotificationTime(notice.created_at || ''))} ${escapeHtml(notice.title)} / ${escapeHtml(notificationStatusLabel(notice.status))}</div>`).join('')
    : '<div class="notification-item">未確認通知はありません</div>';
}

function sortedNotifications() {
  return state.autoLogs
    .map(normalizeNotification)
    .sort((a, b) => notificationRank(a) - notificationRank(b) || notificationTimeValue(b) - notificationTimeValue(a));
}

function filteredNotifications() {
  return sortedNotifications().filter((notice) => (
    state.notificationView === 'archive' ? notice.is_read : !notice.is_read
  ));
}

function normalizeNotification(log) {
  const status = normalizeNotificationStatus(log.status || log['ステータス'], log.result);
  return {
    id: log.id || log.ID || `${log.title || log['タイトル']}_${log.created_at || log['発生時刻'] || log.time || ''}`,
    type: log.type || log['種別'] || 'system',
    title: log.title || log['タイトル'] || '',
    description: log.description || log['内容'] || '',
    status,
    priority: log.priority || log['優先度'] || (status === 'error' ? 'high' : 'low'),
    created_at: log.created_at || log['発生時刻'] || log.time || '',
    link_url: log.link_url || log['リンクURL'] || '',
    link_label: log.link_label || log['リンクラベル'] || '開く',
    is_read: toBool(log.is_read || log['確認済みフラグ']),
    requires_action: toBool(log.requires_action || log['要対応フラグ']) || status === 'action_required',
    duration: log.duration || log['所要時間'] || '',
    detail: log.detail || log['詳細'] || ''
  };
}

function normalizeNotificationStatus(status, result) {
  if (status === '完了' || status === 'success' || result === 'success') return 'success';
  if (status === '失敗' || status === 'error' || result === 'fail') return 'error';
  if (status === '要対応' || status === 'action_required') return 'action_required';
  if (status === '情報' || status === 'info') return 'info';
  return status || 'info';
}

function notificationRank(notice) {
  if (notice.status === 'action_required' || notice.requires_action) return 1;
  if (notice.status === 'error') return 2;
  if (!notice.is_read) return 3;
  return 4;
}

function notificationTimeValue(notice) {
  const match = String(notice.created_at || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatNotificationTime(value) {
  return formatTimeOnly(value);
}

function notificationTypeLabel(type) {
  return { slack: 'Slack', gmail: 'Gmail', system: '自動処理', rss: 'RSS' }[type] || '通知';
}

function notificationStatusLabel(status) {
  return { success: '完了', error: '失敗', action_required: '要対応', info: '情報' }[status] || status;
}

function notificationIcon(notice) {
  if (notice.status === 'action_required' || notice.requires_action) return '!';
  if (notice.status === 'error') return '×';
  if (notice.status === 'success') return '✓';
  return 'i';
}

function notificationActionButtons(notice) {
  const buttons = [];
  if (notice.link_url) {
    buttons.push(`<a class="notification-action-button" href="${escapeAttr(notice.link_url)}" target="_blank" rel="noreferrer">${escapeHtml(notice.link_label || '開く')}</a>`);
  }
  if (notice.is_read) return buttons.join('');
  if (notice.status === 'action_required' || notice.requires_action) {
    buttons.push(`<button type="button" class="notification-action-button primary" data-notice-action="read">確認済みにする</button>`);
  } else if (notice.status === 'error') {
    buttons.push('<button type="button" class="notification-action-button primary" data-notice-action="read">確認済みにする</button>');
  } else if (notice.status === 'success') {
    buttons.push('<button type="button" class="notification-action-button" data-notice-action="read">確認済みにする</button>');
  } else {
    buttons.push('<button type="button" class="notification-action-button" data-notice-action="read">確認済みにする</button>');
  }
  return buttons.join('');
}

async function handleNoticeAction(notice, action, card, button) {
  const source = state.autoLogs.find((log) => (log.id || log.ID || `${log.title || log['タイトル']}_${log.created_at || log['発生時刻'] || log.time || ''}`) === notice.id);
  if (action === 'read') {
    return runButtonTask(button, '処理中...', async () => {
      const saved = await apiPost('markNotificationRead', { id: notice.id });
      if (source) {
        source.is_read = true;
        source['確認済みフラグ'] = true;
        source.requires_action = false;
      }
      const index = state.autoLogs.findIndex((log) => (log.id || log.ID) === notice.id);
      if (index >= 0 && saved) state.autoLogs.splice(index, 1, saved);
      renderActionCenter();
      renderNotifications();
      toast('通知をアーカイブしました');
    }).catch(showError);
  }
  return undefined;
}

function renderTimeline() {
  els.timeline.innerHTML = '';
  renderCurrentRoutine();
  const now = new Date();
  const currentHour = now.getHours();
  const minuteScale = 38 / 60;
  for (let hour = 7; hour <= 24; hour++) {
    const row = document.createElement('div');
    row.className = `time-row${hour === currentHour ? ' current' : ''}`;
    row.innerHTML = `<div class="time-label">${hour}:00</div><div class="time-lane"></div>`;
    els.timeline.appendChild(row);
  }
  buildTimelineItems().forEach((item, index) => {
    const bar = document.createElement(item.url ? 'a' : 'div');
    bar.className = `schedule-bar bar-${item.kind}`;
    if (item.url) {
      bar.href = item.url;
      bar.target = '_blank';
      bar.rel = 'noreferrer';
    }
    bar.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.sub)}</span>`;
    const startMinutes = clamp(minutesFromSeven(item.start), 0, 17 * 60);
    const endMinutes = clamp(minutesFromSeven(item.end), startMinutes + 30, 17 * 60);
    const laneOffset = (index % 2) * 8;
    bar.style.top = `${Math.round(startMinutes * minuteScale) + 4 + laneOffset}px`;
    bar.style.height = `${Math.max(28, Math.round((endMinutes - startMinutes) * minuteScale) - 6)}px`;
    bar.style.left = `${62 + laneOffset}px`;
    els.timeline.appendChild(bar);
  });
}

function buildTimelineItems() {
  const items = [];
  state.events.forEach((event) => {
    items.push({
      kind: 'event',
      title: event['予定名'],
      sub: `${formatTime(event['開始時刻'])} - ${formatTime(event['終了時刻'])}`,
      start: new Date(event['開始時刻']),
      end: new Date(event['終了時刻']),
      url: event['URL']
    });
  });
  state.tasks
    .filter((task) => toBool(task['今日やるフラグ']) && task['ステータス'] !== '完了')
    .slice(0, 8)
    .forEach((task, index) => {
      const start = todayAt(`${9 + (index % 8)}:00`);
      items.push({ kind: 'task', title: task['タイトル'], sub: '今日やるタスク', start, end: addMinutes(start, 50) });
    });
  return items.sort((a, b) => a.start - b.start);
}

function renderCurrentRoutine() {
  const routines = currentDueRoutines();
  if (!routines.length) {
    els.currentRoutineLine.innerHTML = '';
    return;
  }
  els.currentRoutineLine.innerHTML = `
    <span class="routine-line-title">この時間帯のルーティン:</span>
    <div class="routine-line-items">
      ${routines.map((routine) => `
        <label class="routine-check-row">
          <input type="checkbox" data-routine-id="${escapeAttr(routine.ID)}">
          <span class="routine-check-name">${escapeHtml(routine['ルーティン名'])}</span>
        </label>
      `).join('')}
    </div>
  `;
  els.currentRoutineLine.querySelectorAll('[data-routine-id]').forEach((input) => {
    input.addEventListener('change', () => setRoutineCompleted(input.dataset.routineId, input.checked, input));
  });
}

function currentDueRoutines() {
  const now = new Date();
  return state.routines.filter((routine) => {
    if (isRoutineCompletedToday(routine)) return false;
    const target = todayAt(formatTimeOnly(routine['実行目安時刻'] || '00:00'));
    const diffMinutes = Math.abs(now.getTime() - target.getTime()) / 60000;
    return diffMinutes <= 30;
  });
}

function isRoutineCompletedToday(routine) {
  if (routine.completed) return true;
  const todayKey = dateKey(new Date());
  return state.routineLogs.some((log) => (
    String(log['ルーティンID']) === String(routine.ID)
    && dateKey(log['実行日']) === todayKey
    && toBool(log['完了フラグ'])
  ));
}

async function setRoutineCompleted(routineId, completed, input) {
  if (!routineId || input.disabled) return;
  input.disabled = true;
  try {
    const saved = await apiPost('setRoutineLog', { routineId, completed: Boolean(completed) });
    const routine = state.routines.find((item) => String(item.ID) === String(routineId));
    if (routine) routine.completed = Boolean(saved.completed);
    upsertRoutineLog(routineId, Boolean(saved.completed));
    renderCurrentRoutine();
    renderWeeklyReport();
    toast(saved.completed ? 'ルーティンを完了しました' : 'ルーティンを未完了に戻しました');
  } catch (error) {
    input.checked = !completed;
    showError(error);
  } finally {
    input.disabled = false;
  }
}

function upsertRoutineLog(routineId, completed) {
  const todayKey = dateKey(new Date());
  const existing = state.routineLogs.find((log) => String(log['ルーティンID']) === String(routineId) && dateKey(log['実行日']) === todayKey);
  if (existing) {
    existing['完了フラグ'] = completed;
    return;
  }
  state.routineLogs.push({
    ID: `local_${routineId}_${todayKey}`,
    'ルーティンID': routineId,
    '実行日': todayKey,
    '完了フラグ': completed
  });
}

function renderWeeklyReport() {
  if (!els.weeklyReport) return;
  const range = currentWeekRange();
  els.weeklyRange.textContent = `${dateOnly(range.start)} - ${dateOnly(range.end)}`;
  const tasksThisWeek = state.tasks.filter((task) => isDateInRange(task['更新日'], range.start, range.end));
  const completedThisWeek = tasksThisWeek.filter((task) => task['ステータス'] === '完了').length;
  const averageProgress = average(state.tasks.map((task) => Number(task['進捗'] || 0)));
  const statusCounts = countByField(state.tasks, 'ステータス');
  const categoryProgress = progressByField('カテゴリ');
  const typeProgress = progressByField('種別');
  const routineLogsThisWeek = state.routineLogs.filter((log) => isDateInRange(log['実行日'], range.start, range.end));
  const routineDone = routineLogsThisWeek.filter((log) => toBool(log['完了フラグ'])).length;
  const routineRate = routineLogsThisWeek.length ? Math.round((routineDone / routineLogsThisWeek.length) * 100) : 0;

  els.weeklyReport.innerHTML = `
    <div class="report-metrics">
      ${reportMetric('完了タスク', `${completedThisWeek}件`)}
      ${reportMetric('更新タスク', `${tasksThisWeek.length}件`)}
      ${reportMetric('平均進捗', `${Math.round(averageProgress)}%`)}
      ${reportMetric('ルーティン達成率', `${routineRate}%`)}
    </div>
    <div class="report-block">
      <h3>ステータス別件数</h3>
      <div class="report-chip-list">${Object.keys(statusCounts).map((key) => reportChip(key || '未設定', `${statusCounts[key]}件`, statusClass(key))).join('')}</div>
    </div>
    <div class="report-block">
      <h3>カテゴリ別進捗</h3>
      ${reportProgressList(categoryProgress)}
    </div>
    <div class="report-block">
      <h3>種別ごとの進捗</h3>
      ${reportProgressList(typeProgress)}
    </div>
  `;
}

function reportMetric(label, value) {
  return `<div class="report-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function reportChip(label, value, className) {
  return `<span class="report-chip ${className || 'badge-normal'}"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`;
}

function progressByField(field) {
  const groups = state.tasks.reduce((map, task) => {
    const key = task[field] || '未設定';
    if (!map[key]) map[key] = [];
    map[key].push(Number(task['進捗'] || 0));
    return map;
  }, {});
  return Object.keys(groups)
    .sort()
    .map((key) => ({ label: key, progress: Math.round(average(groups[key])) }));
}

function reportProgressList(items) {
  if (!items.length) return '<div class="report-empty">データがありません</div>';
  return `<div class="report-progress-list">${items.map((item) => `
    <div class="report-progress-row">
      <span>${escapeHtml(item.label)}</span>
      <div class="report-progress-track"><i style="width:${clamp(item.progress, 0, 100)}%"></i></div>
      <b>${item.progress}%</b>
    </div>
  `).join('')}</div>`;
}

function countByField(items, field) {
  return items.reduce((map, item) => {
    const key = item[field] || '未設定';
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function average(values) {
  const numbers = values.map(Number).filter((value) => !Number.isNaN(value));
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function renderQuickTodos() {
  if (!els.quickTodoList) return;
  const items = state.quickTodos.filter((item) => state.quickTodoView === 'done' ? toBool(item['完了フラグ']) : !toBool(item['完了フラグ']));
  els.quickTodoList.innerHTML = '';
  if (!items.length) {
    els.quickTodoList.innerHTML = '<div class="quick-empty">クイックTODOはありません</div>';
    return;
  }
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = `quick-row${toBool(item['完了フラグ']) ? ' completed' : ''}`;
    row.innerHTML = `
      <label class="quick-check">
        <input type="checkbox" ${toBool(item['完了フラグ']) ? 'checked' : ''}>
        <span>
          <strong>${escapeHtml(item['タイトル'])}</strong>
          <small>${escapeHtml(dateOnly(item['期限']) || '期限なし')}</small>
        </span>
      </label>
      <div class="quick-meta">${badge(item['優先度'] || '中', priorityClass(item['優先度']))}</div>
      <div class="quick-actions">
        ${referenceUrlButton(item['参考URL'])}
        <button class="quick-action-button primary" type="button" data-quick-action="convert">案件化</button>
        <button class="quick-action-button" type="button" data-quick-action="edit">編集</button>
        <button class="quick-action-button" type="button" data-quick-action="delete">削除</button>
      </div>
    `;
    row.querySelector('input')?.addEventListener('change', (event) => updateQuickTodo({ ...item, '完了フラグ': event.currentTarget.checked }, event.currentTarget));
    row.querySelector('[data-quick-action="convert"]')?.addEventListener('click', (event) => convertQuickTodo(item.ID, event.currentTarget));
    row.querySelector('[data-quick-action="edit"]')?.addEventListener('click', () => editQuickTodo(item));
    row.querySelector('[data-quick-action="delete"]')?.addEventListener('click', (event) => deleteQuickTodo(item.ID, event.currentTarget));
    els.quickTodoList.appendChild(row);
  });
}

function renderShoppingList() {
  if (!els.shoppingList) return;
  const items = state.shoppingList.filter((item) => state.shoppingView === 'done' ? toBool(item['完了フラグ']) : !toBool(item['完了フラグ']));
  els.shoppingList.innerHTML = '';
  if (!items.length) {
    els.shoppingList.innerHTML = '<div class="quick-empty">買い物リストはありません</div>';
    return;
  }
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = `quick-row${toBool(item['完了フラグ']) ? ' completed' : ''}`;
    row.innerHTML = `
      <label class="quick-check">
        <input type="checkbox" ${toBool(item['完了フラグ']) ? 'checked' : ''}>
        <span>
          <strong>${escapeHtml(item['商品名'])}</strong>
          <small>${escapeHtml([item['カテゴリ'], item['数量']].filter(Boolean).join(' / ') || 'カテゴリなし')}</small>
        </span>
      </label>
      <div class="quick-actions">
        ${referenceUrlButton(item['参考URL'])}
        <button class="quick-action-button" type="button" data-shopping-action="edit">編集</button>
        <button class="quick-action-button" type="button" data-shopping-action="delete">削除</button>
      </div>
    `;
    row.querySelector('input')?.addEventListener('change', (event) => updateShoppingItem({ ...item, '完了フラグ': event.currentTarget.checked }, event.currentTarget));
    row.querySelector('[data-shopping-action="edit"]')?.addEventListener('click', () => editShoppingItem(item));
    row.querySelector('[data-shopping-action="delete"]')?.addEventListener('click', (event) => deleteShoppingItem(item.ID, event.currentTarget));
    els.shoppingList.appendChild(row);
  });
}

function referenceUrlButton(url) {
  if (!url) return '';
  return `<a class="quick-action-button" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">開く</a>`;
}

async function addQuickTodo(event) {
  event.preventDefault();
  const title = els.quickTodoTitle.value.trim();
  if (!title) return;
  const button = event.submitter;
  return runButtonTask(button, '追加中...', async () => {
    const saved = await apiPost('addQuickTodo', {
      'タイトル': title,
      '参考URL': els.quickTodoUrl.value.trim(),
      '期限': els.quickTodoDueDate.value,
      '優先度': els.quickTodoPriority.value,
      '完了フラグ': false
    });
    state.quickTodos.unshift(saved);
    els.quickTodoForm.reset();
    resetQuickTodoDueDate();
    renderQuickTodos();
    toast('QuickTodoを追加しました');
  }).catch(showError);
}

function resetQuickTodoDueDate() {
  if (els.quickTodoDueDate && !els.quickTodoDueDate.value) {
    els.quickTodoDueDate.value = todayInputValue();
  }
}

async function updateQuickTodo(item, input) {
  if (!item.ID || input.disabled) return;
  input.disabled = true;
  try {
    const saved = await apiPost('updateQuickTodo', item);
    const index = state.quickTodos.findIndex((row) => row.ID === saved.ID);
    if (index >= 0) state.quickTodos.splice(index, 1, saved);
    renderQuickTodos();
  } catch (error) {
    input.checked = !input.checked;
    showError(error);
  } finally {
    input.disabled = false;
  }
}

async function deleteQuickTodo(id, button) {
  if (!id || !confirm('このQuickTodoを削除しますか？')) return;
  return runButtonTask(button, '削除中...', async () => {
    await apiPost('deleteQuickTodo', { id });
    state.quickTodos = state.quickTodos.filter((item) => item.ID !== id);
    renderQuickTodos();
    toast('QuickTodoを削除しました');
  }).catch(showError);
}

async function editQuickTodo(item) {
  const title = prompt('TODOを編集', item['タイトル'] || '');
  if (title === null) return;
  const dueDate = prompt('期限（yyyy-mm-dd / 空欄可）', item['期限'] || '');
  if (dueDate === null) return;
  const priority = prompt('優先度（高 / 中 / 低）', item['優先度'] || '中');
  if (priority === null) return;
  const referenceUrl = prompt('参考URL（空欄可）', item['参考URL'] || '');
  if (referenceUrl === null) return;
  await updateQuickTodo({
    ...item,
    'タイトル': title.trim(),
    '期限': dueDate.trim(),
    '優先度': ['高', '中', '低'].includes(priority.trim()) ? priority.trim() : '中',
    '参考URL': referenceUrl.trim()
  }, { disabled: false });
}

async function convertQuickTodo(id, button) {
  if (!id) return;
  return runButtonTask(button, '案件化中...', async () => {
    const result = await apiPost('convertQuickTodoToTask', { id });
    state.quickTodos = state.quickTodos.filter((item) => item.ID !== id);
    if (result.task) state.tasks.push(result.task);
    renderAll();
    if (result.task?.ID) selectTask(result.task.ID);
    toast('QuickTodoを案件化しました');
  }).catch(showError);
}

async function addShoppingItem(event) {
  event.preventDefault();
  const name = els.shoppingName.value.trim();
  if (!name) return;
  const button = event.submitter;
  return runButtonTask(button, '追加中...', async () => {
    const saved = await apiPost('addShoppingItem', {
      '商品名': name,
      '参考URL': els.shoppingUrl.value.trim(),
      'カテゴリ': els.shoppingCategory.value.trim(),
      '数量': els.shoppingQuantity.value.trim(),
      '完了フラグ': false
    });
    state.shoppingList.unshift(saved);
    els.shoppingForm.reset();
    renderShoppingList();
    toast('買い物リストに追加しました');
  }).catch(showError);
}

async function updateShoppingItem(item, input) {
  if (!item.ID || input.disabled) return;
  input.disabled = true;
  try {
    const saved = await apiPost('updateShoppingItem', item);
    const index = state.shoppingList.findIndex((row) => row.ID === saved.ID);
    if (index >= 0) state.shoppingList.splice(index, 1, saved);
    renderShoppingList();
  } catch (error) {
    input.checked = !input.checked;
    showError(error);
  } finally {
    input.disabled = false;
  }
}

async function deleteShoppingItem(id, button) {
  if (!id || !confirm('この買い物リストを削除しますか？')) return;
  return runButtonTask(button, '削除中...', async () => {
    await apiPost('deleteShoppingItem', { id });
    state.shoppingList = state.shoppingList.filter((item) => item.ID !== id);
    renderShoppingList();
    toast('買い物リストを削除しました');
  }).catch(showError);
}

async function editShoppingItem(item) {
  const name = prompt('商品名を編集', item['商品名'] || '');
  if (name === null) return;
  const category = prompt('カテゴリ（空欄可）', item['カテゴリ'] || '');
  if (category === null) return;
  const quantity = prompt('数量（空欄可）', item['数量'] || '');
  if (quantity === null) return;
  const referenceUrl = prompt('参考URL（空欄可）', item['参考URL'] || '');
  if (referenceUrl === null) return;
  await updateShoppingItem({
    ...item,
    '商品名': name.trim(),
    'カテゴリ': category.trim(),
    '数量': quantity.trim(),
    '参考URL': referenceUrl.trim()
  }, { disabled: false });
}

function taskIdeaCount(taskId) {
  return state.improvementIdeas.filter((idea) => idea.TaskID === taskId).length;
}

function selectedTaskIdeas() {
  return state.improvementIdeas
    .filter((idea) => idea.TaskID === state.selectedTaskId)
    .filter((idea) => state.ideaView === 'done' ? idea['ステータス'] === '反映済み' : idea['ステータス'] !== '反映済み');
}

function renderTaskIdeas() {
  const ideas = selectedTaskIdeas();
  const total = state.improvementIdeas.filter((idea) => idea.TaskID === state.selectedTaskId).length;
  els.toggleIdeasButton.textContent = `改善アイディア（${total}）`;
  els.newIdeaButton.disabled = !state.selectedTaskId;
  els.ideaList.innerHTML = '';
  if (!state.selectedTaskId) {
    els.ideaList.innerHTML = '<div class="idea-row"><span>タスクを選択してください</span></div>';
    return;
  }
  if (!ideas.length) {
    els.ideaList.innerHTML = '<div class="idea-row"><span>改善アイディアはありません</span></div>';
    return;
  }
  ideas.forEach((idea) => {
    const row = document.createElement('div');
    row.className = 'idea-row';
    row.innerHTML = `
      <div class="idea-row-main">
        <strong>${escapeHtml(idea['タイトル'])}</strong>
        ${badge(idea['ステータス'] || '未着手', statusClass(idea['ステータス']))}
        ${badge(idea['優先度'] || '中', priorityClass(idea['優先度']))}
      </div>
      <div class="idea-row-actions">
        <button class="idea-action-button" type="button" data-idea-action="edit">編集</button>
        <button class="idea-action-button" type="button" data-idea-action="delete">削除</button>
        ${idea['ステータス'] === '反映済み' ? '' : '<button class="idea-action-button primary" type="button" data-idea-action="done">反映済み</button>'}
      </div>
    `;
    row.querySelector('[data-idea-action="edit"]')?.addEventListener('click', () => openIdeaModal(idea));
    row.querySelector('[data-idea-action="delete"]')?.addEventListener('click', (event) => deleteImprovementIdeaById(idea.ID, false, event.currentTarget));
    row.querySelector('[data-idea-action="done"]')?.addEventListener('click', (event) => markImprovementDone(idea.ID, event.currentTarget));
    els.ideaList.appendChild(row);
  });
}

function openIdeaModal(idea) {
  if (!state.selectedTaskId) {
    toast('先にタスクを選択してください');
    return;
  }
  const data = idea || {};
  els.ideaId.value = data.ID || '';
  els.ideaTitle.value = data['タイトル'] || '';
  els.ideaBody.value = data['内容'] || '';
  els.ideaStatus.value = data['ステータス'] || '未着手';
  els.ideaPriority.value = data['優先度'] || '中';
  els.deleteIdeaButton.disabled = !data.ID;
  els.ideaDialog.showModal();
}

async function saveImprovementIdea(event) {
  event.preventDefault();
  const saveButton = els.ideaForm.querySelector('button[type="submit"]');
  if (saveButton?.disabled) return;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = '保存中...';
  }
  const item = {
    ID: els.ideaId.value,
    TaskID: state.selectedTaskId,
    'タイトル': els.ideaTitle.value.trim(),
    '内容': els.ideaBody.value.trim(),
    'ステータス': els.ideaStatus.value,
    '優先度': els.ideaPriority.value
  };
  const action = item.ID ? 'updateImprovementIdea' : 'addImprovementIdea';
  try {
    const saved = await apiPost(action, item);
    const index = state.improvementIdeas.findIndex((idea) => idea.ID === saved.ID);
    if (index >= 0) state.improvementIdeas.splice(index, 1, saved);
    else state.improvementIdeas.push(saved);
    els.ideaDialog.close();
    renderTasks();
    renderTaskIdeas();
    toast('改善アイディアを保存しました');
  } catch (error) {
    showError(error);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = '保存';
    }
  }
}

async function deleteSelectedIdea(button) {
  const id = els.ideaId.value;
  if (!id) return;
  await deleteImprovementIdeaById(id, true, button);
}

async function deleteImprovementIdeaById(id, closeDialog = false, button) {
  if (!id || !confirm('この改善アイディアを削除しますか？')) return;
  return runButtonTask(button, '削除中...', async () => {
    await apiPost('deleteImprovementIdea', { id });
    state.improvementIdeas = state.improvementIdeas.filter((idea) => idea.ID !== id);
    if (closeDialog) els.ideaDialog.close();
    renderTasks();
    renderTaskIdeas();
    toast('削除しました');
  }).catch(showError);
}

async function markImprovementDone(id, button) {
  if (!id) return;
  return runButtonTask(button, '反映中...', async () => {
    const saved = await apiPost('markImprovementDone', { id });
    const index = state.improvementIdeas.findIndex((idea) => idea.ID === saved.ID);
    if (index >= 0) state.improvementIdeas.splice(index, 1, saved);
    renderTasks();
    renderTaskIdeas();
    toast('反映済みにしました');
  }).catch(showError);
}

function renderOptions() {
  renderDatalist(els.categoryOptions, [...new Set(state.tasks.map((task) => task['カテゴリ']).filter(Boolean))]);
  renderDatalist(els.typeOptions, [...new Set(state.tasks.map((task) => task['種別']).filter(Boolean))]);
}

function renderDatalist(container, values) {
  container.innerHTML = values.sort().map((value) => `<option value="${escapeAttr(value)}"></option>`).join('');
}

async function apiGet(action, params = {}) {
  if (!API_URL) throw new Error('config.js の GAS_API_URL を設定してください。');
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const res = await fetch(url.toString());
  return parseApiResponse(res);
}

async function apiPost(action, payload = {}) {
  if (!API_URL) throw new Error('config.js の GAS_API_URL を設定してください。');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload })
  });
  return parseApiResponse(res);
}

async function parseApiResponse(res) {
  const text = await res.text();
  if (/^\s*</.test(text)) {
    throw new Error('GAS APIがJSONではなくHTMLを返しました。Webアプリのアクセス権を「全員」または利用者がアクセス可能な設定にしてください。');
  }
  const data = JSON.parse(text);
  if (!data.ok) throw new Error(data.error || 'APIエラーが発生しました');
  return data.data;
}

function badge(text, className) {
  return `<span class="badge ${className || 'badge-normal'}">${escapeHtml(text)}</span>`;
}

function countByStatus() {
  return state.tasks.reduce((map, task) => {
    map[task['ステータス']] = (map[task['ステータス']] || 0) + 1;
    return map;
  }, {});
}

function typeClass(value) {
  if (/開発$/.test(value)) return 'badge-dev';
  if (/開発案件|要件/.test(value)) return 'badge-req';
  if (/調査/.test(value)) return 'badge-research';
  if (/販売/.test(value)) return 'badge-sales';
  if (/アイディア|アイデア/.test(value)) return 'badge-idea';
  return 'badge-normal';
}

function statusClass(status) {
  if (status === '作業中') return 'badge-working';
  if (status === '保留') return 'badge-hold';
  if (status === '完了' || status === '反映済み') return 'badge-done';
  return 'badge-todo';
}

function priorityClass(priority) {
  if (priority === '高') return 'badge-high';
  if (priority === '低') return 'badge-low';
  return 'badge-middle';
}

function todayAt(timeText) {
  const match = String(timeText).match(/(\d{1,2}):(\d{2})/);
  const date = new Date();
  date.setHours(match ? Number(match[1]) : 7, match ? Number(match[2]) : 0, 0, 0);
  return date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function minutesFromSeven(date) {
  const base = new Date(date);
  base.setHours(7, 0, 0, 0);
  return Math.round((date.getTime() - base.getTime()) / 60000);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), message.length > 40 ? 6500 : 2200);
}

function showError(error) {
  console.error(error);
  toast(error.message || 'エラーが発生しました');
}

function formatDateLabel(value) {
  const date = value ? new Date(value + 'T00:00:00') : new Date();
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeOnly(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  const text = String(value);
  const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeOnly) return `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`;
  const isoTime = text.match(/T(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (isoTime) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    return `${isoTime[1].padStart(2, '0')}:${isoTime[2]}`;
  }
  const anyTime = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (anyTime) return `${anyTime[1].padStart(2, '0')}:${anyTime[2]}`;
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  return text;
}

function dateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/(?:\d{4}[-/])?(\d{1,2})[-/](\d{1,2})/);
    return match ? `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}` : String(value);
  }
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit' }).format(date);
}

function dateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return dateKey(new Date());
}

function currentWeekRange() {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isDateInRange(value, start, end) {
  const key = dateKey(value);
  if (!key) return false;
  const date = new Date(`${key}T00:00:00`);
  return date >= start && date <= end;
}

function shortId(id) {
  return String(id || '').replace(/^A-(\d+)$/, 'A$1').replace(/^[a-z]+_/, '').slice(0, 8);
}

function toBool(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1 || value === 'はい';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
