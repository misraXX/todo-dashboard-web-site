const API_URL = window.TODO_DASHBOARD_CONFIG?.GAS_API_URL || '';

const state = {
  tasks: [],
  quickLinks: [],
  events: [],
  routines: [],
  improvementIdeas: [],
  autoLogs: [],
  selectedTaskId: '',
  filter: 'all',
  typeFilter: '',
  categoryFilter: '',
  notificationView: 'unread',
  ideaView: 'open',
  isEditingTask: false
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  bindEvents();
  restoreSidebarState();
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
    'calendarRefreshButton', 'currentRoutineLine', 'actionCenterList', 'toggleIdeasButton', 'newIdeaButton',
    'ideaList', 'ideaDialog', 'ideaForm', 'ideaId', 'ideaTitle', 'ideaBody', 'ideaStatus', 'ideaPriority',
    'deleteIdeaButton', 'toast', 'categoryOptions', 'typeOptions'
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.menuButton.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('todoSidebarCollapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
  });
  els.reloadButton.addEventListener('click', loadInitialData);
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
  els.deleteButton.addEventListener('click', deleteSelectedTask);
  els.calendarRefreshButton.addEventListener('click', refreshCalendar);
  els.notificationButton.addEventListener('click', () => {
    els.notificationPopover.hidden = !els.notificationPopover.hidden;
  });
  els.toggleIdeasButton.addEventListener('click', () => {
    els.ideaList.hidden = !els.ideaList.hidden;
  });
  els.newIdeaButton.addEventListener('click', () => openIdeaModal(null));
  els.ideaForm.addEventListener('submit', saveImprovementIdea);
  els.deleteIdeaButton.addEventListener('click', deleteSelectedIdea);
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
    state.improvementIdeas = data.improvementIdeas || [];
    state.autoLogs = data.notifications || [];
    els.todayLabel.textContent = formatDateLabel(data.today);
    renderAll();
    if (!isEditing) {
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
  renderQuickLinks();
  renderCounts();
  renderSideFilters();
  renderTasks();
  renderTimeline();
  renderOptions();
  renderActionCenter();
  renderNotifications();
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
      <td>${escapeHtml(task['タイトル'])}</td>
      <td>${progressBar(task['進捗'])}</td>
      <td>${badge(task['ステータス'] || '未着手', statusClass(task['ステータス']))}</td>
      <td>${badge(task['優先度'] || '中', priorityClass(task['優先度']))}</td>
      <td>${escapeHtml(task['期限'] || '—')}</td>
      <td>${taskUrlLink(task['ChatGPT URL'], 'ChatGPT')}</td>
      <td>${taskUrlLink(task['フォルダURL'], 'Drive')}</td>
      <td>${escapeHtml(dateOnly(task['更新日']))}</td>
    `;
    tr.addEventListener('click', () => selectTask(task.ID));
    els.taskTableBody.appendChild(tr);
  });
}

function taskUrlLink(url, label) {
  if (!url) return '<span class="meta">—</span>';
  return `<a class="task-url-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">${escapeHtml(label)}</a>`;
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

async function deleteSelectedTask() {
  const id = els.taskId.value;
  if (!id || !confirm('このタスクを削除しますか？')) return;
  try {
    await apiPost('deleteTask', { id });
    state.tasks = state.tasks.filter((task) => task.ID !== id);
    state.isEditingTask = false;
    renderAll();
    selectTask(filteredTasks()[0] ? filteredTasks()[0].ID : null);
    toast('削除しました');
  } catch (error) {
    showError(error);
  }
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

async function refreshCalendar() {
  toast('予定を取得中...');
  try {
    state.events = await apiGet('refreshTodayEvents');
    renderTimeline();
    toast('予定を更新しました');
  } catch (error) {
    showError(error);
  }
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
        handleNoticeAction(notice, button.dataset.noticeAction, card);
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

async function handleNoticeAction(notice, action, card) {
  const source = state.autoLogs.find((log) => (log.id || log.ID || `${log.title || log['タイトル']}_${log.created_at || log['発生時刻'] || log.time || ''}`) === notice.id);
  if (action === 'read') {
    try {
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
    } catch (error) {
      showError(error);
    }
  }
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
  const now = new Date();
  const currentHour = now.getHours();
  const routines = state.routines.filter((routine) => {
    const start = todayAt(formatTimeOnly(routine['実行目安時刻'] || '00:00'));
    return start.getHours() === currentHour;
  });
  if (!routines.length) {
    els.currentRoutineLine.textContent = 'この時間帯のルーティンはありません';
    return;
  }
  els.currentRoutineLine.textContent = `この時間帯のルーティン: ${routines.map((routine) => `${formatTimeOnly(routine['実行目安時刻'])} ${routine['ルーティン名']}`).join(' / ')}`;
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
    row.querySelector('[data-idea-action="delete"]')?.addEventListener('click', () => deleteImprovementIdeaById(idea.ID));
    row.querySelector('[data-idea-action="done"]')?.addEventListener('click', () => markImprovementDone(idea.ID));
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
  }
}

async function deleteSelectedIdea() {
  const id = els.ideaId.value;
  if (!id) return;
  await deleteImprovementIdeaById(id, true);
}

async function deleteImprovementIdeaById(id, closeDialog = false) {
  if (!id || !confirm('この改善アイディアを削除しますか？')) return;
  try {
    await apiPost('deleteImprovementIdea', { id });
    state.improvementIdeas = state.improvementIdeas.filter((idea) => idea.ID !== id);
    if (closeDialog) els.ideaDialog.close();
    renderTasks();
    renderTaskIdeas();
    toast('削除しました');
  } catch (error) {
    showError(error);
  }
}

async function markImprovementDone(id) {
  if (!id) return;
  try {
    const saved = await apiPost('markImprovementDone', { id });
    const index = state.improvementIdeas.findIndex((idea) => idea.ID === saved.ID);
    if (index >= 0) state.improvementIdeas.splice(index, 1, saved);
    renderTasks();
    renderTaskIdeas();
    toast('反映済みにしました');
  } catch (error) {
    showError(error);
  }
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
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(date);
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
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
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
