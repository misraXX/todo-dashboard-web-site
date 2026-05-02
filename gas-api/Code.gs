const SHEETS = {
  TASKS: 'Tasks',
  QUICK_LINKS: 'QuickLinks',
  CALENDAR_EVENTS: 'CalendarEvents',
  ROUTINES: 'Routines',
  ROUTINE_LOGS: 'RoutineLogs',
  IMPROVEMENT_IDEAS: 'ImprovementIdeas',
  NOTIFICATIONS: 'Notifications',
  QUICK_TODOS: 'QuickTodos',
  SHOPPING_LIST: 'ShoppingList'
};

const TASK_PARENT_FOLDER_ID = '13ieQmaXSYh3UeUPkfputJioe3tQJh6pG';

const HEADERS = {
  Tasks: [
    'ID', 'タイトル', '内容', 'ステータス', '優先度', '進捗', '今日やるフラグ', '期限', 'カテゴリ', '種別',
    '関連URL', 'ChatGPT URL', 'フォルダURL', '次アクション', '並び順', '作成日', '更新日'
  ],
  QuickLinks: ['ID', '名前', 'URL', 'アイコン画像URL', '並び順', '表示フラグ', '作成日', '更新日'],
  CalendarEvents: ['ID', '予定名', '開始時刻', '終了時刻', 'カレンダー種別', '場所', 'URL', '説明', '取得日'],
  Routines: ['ID', 'ルーティン名', '説明', '頻度', '曜日', '祝日フラグ', '実行目安時刻', '有効/無効'],
  RoutineLogs: ['ID', 'ルーティンID', '実行日', '完了フラグ'],
  ImprovementIdeas: ['ID', 'TaskID', 'タイトル', '内容', 'ステータス', '優先度', '作成日', '更新日'],
  Notifications: [
    'ID', '種別', 'タイトル', '内容', 'ステータス', '優先度', '発生時刻', 'リンクURL', 'リンクラベル',
    '確認済みフラグ', '要対応フラグ', '所要時間', '詳細', '作成日', '更新日'
  ],
  QuickTodos: ['ID', 'タイトル', '完了フラグ', '作成日', '更新日', '参考URL', '期限', '優先度'],
  ShoppingList: ['ID', '商品名', '完了フラグ', '作成日', '更新日', '参考URL', 'カテゴリ', '数量']
};

function doGet(e) {
  try {
    setupSpreadsheet();
    const action = e.parameter.action || 'getInitialData';
    const data = routeGet_(action, e.parameter);
    return json_({ ok: true, data: data });
  } catch (error) {
    console.error(error.stack || error.message || error);
    return json_({ ok: false, error: error.message });
  }
}

function doPost(e) {
  try {
    setupSpreadsheet();
    const body = JSON.parse(e.postData.contents || '{}');
    const data = routePost_(body.action, body.payload || {});
    return json_({ ok: true, data: data });
  } catch (error) {
    console.error(error.stack || error.message || error);
    return json_({ ok: false, error: error.message });
  }
}

function routeGet_(action, params) {
  if (action === 'getInitialData') return getInitialData();
  if (action === 'getTasks') return getTasks();
  if (action === 'getQuickLinks') return getQuickLinks();
  if (action === 'getTodayEvents') return getCachedTodayEvents_();
  if (action === 'refreshTodayEvents') return refreshTodayEvents();
  if (action === 'getRoutines') return getRoutines();
  if (action === 'getImprovementIdeas') return getImprovementIdeas();
  if (action === 'getNotifications') return getNotifications();
  if (action === 'getQuickTodos') return getQuickTodos();
  if (action === 'getShoppingList') return getShoppingList();
  throw new Error('Unknown GET action: ' + action);
}

function routePost_(action, payload) {
  if (action === 'addTask') return addTask(payload);
  if (action === 'updateTask') return updateTask(payload);
  if (action === 'deleteTask') return deleteTask(payload.id);
  if (action === 'setRoutineLog') return setRoutineLog(payload.routineId, payload.completed);
  if (action === 'addImprovementIdea') return addImprovementIdea(payload);
  if (action === 'updateImprovementIdea') return updateImprovementIdea(payload);
  if (action === 'deleteImprovementIdea') return deleteImprovementIdea(payload.id);
  if (action === 'markImprovementDone') return markImprovementDone(payload.id);
  if (action === 'markNotificationRead') return markNotificationRead(payload.id);
  if (action === 'addQuickTodo') return addQuickTodo(payload);
  if (action === 'updateQuickTodo') return updateQuickTodo(payload);
  if (action === 'deleteQuickTodo') return deleteQuickTodo(payload.id);
  if (action === 'convertQuickTodoToTask') return convertQuickTodoToTask(payload.id);
  if (action === 'addShoppingItem') return addShoppingItem(payload);
  if (action === 'updateShoppingItem') return updateShoppingItem(payload);
  if (action === 'deleteShoppingItem') return deleteShoppingItem(payload.id);
  throw new Error('Unknown POST action: ' + action);
}

function getInitialData() {
  return {
    tasks: getTasks(),
    quickLinks: getQuickLinks(),
    events: getCachedTodayEvents_(),
    routines: getRoutines(),
    routineLogs: getRoutineLogs(),
    improvementIdeas: getImprovementIdeas(),
    notifications: getNotifications(),
    quickTodos: getQuickTodos(),
    shoppingList: getShoppingList(),
    today: formatDate_(new Date(), 'yyyy-MM-dd')
  };
}

function setupSpreadsheet() {
  Object.keys(HEADERS).forEach(function(sheetName) {
    const sheet = getOrCreateSheet_(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.setFrozenRows(1);
    } else {
      ensureHeaders_(sheet, HEADERS[sheetName]);
    }
  });
  migrateTaskIds_();
  seedQuickLinks_();
  seedRoutines_();
}

function setupSpreedsheet() {
  return setupSpreadsheet();
}

function authorizeDriveAccess() {
  const folder = getTaskParentFolder_();
  return {
    ok: true,
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

function authorizeDriveCreateAccess() {
  const parent = getTaskParentFolder_();
  const folder = parent.createFolder('_todo_dashboard_auth_test_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'));
  return {
    ok: true,
    message: 'Driveフォルダ作成権限を確認しました。不要であれば作成されたテストフォルダを削除してください。',
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

function diagnoseDriveAccess() {
  const result = {
    rootAccess: false,
    parentFolderId: getTaskParentFolderId_(),
    parentAccess: false,
    parentFolderName: '',
    parentFolderUrl: '',
    error: ''
  };
  try {
    DriveApp.getRootFolder().getName();
    result.rootAccess = true;
  } catch (error) {
    result.error = 'DriveApp自体にアクセスできません: ' + error.message;
    return result;
  }
  try {
    const folder = getTaskParentFolder_();
    result.parentAccess = true;
    result.parentFolderName = folder.getName();
    result.parentFolderUrl = folder.getUrl();
  } catch (error) {
    result.error = error.message;
  }
  return result;
}

function setTaskParentFolderId(folderId) {
  if (!folderId) throw new Error('folderId を指定してください。');
  PropertiesService.getScriptProperties().setProperty('TASK_PARENT_FOLDER_ID', folderId);
  return diagnoseDriveAccess();
}

function getTasks() {
  const priorityScore = { '高': 0, '中': 1, '低': 2 };
  const statusScore = { '未着手': 0, '作業中': 1, '保留': 2, '完了': 3 };
  return readSheetAsObjects_(SHEETS.TASKS).sort(function(a, b) {
    return (statusScore[a['ステータス']] ?? 9) - (statusScore[b['ステータス']] ?? 9)
      || Number(a['並び順'] || 9999) - Number(b['並び順'] || 9999)
      || (priorityScore[a['優先度']] || 9) - (priorityScore[b['優先度']] || 9)
      || String(a['期限'] || '').localeCompare(String(b['期限'] || ''));
  });
}

function getQuickLinks() {
  return readSheetAsObjects_(SHEETS.QUICK_LINKS)
    .filter(function(link) { return toBool_(link['表示フラグ']); })
    .sort(function(a, b) { return Number(a['並び順'] || 0) - Number(b['並び順'] || 0); });
}

function getRoutines() {
  const todayKey = formatDate_(new Date(), 'yyyy-MM-dd');
  const logs = readSheetAsObjects_(SHEETS.ROUTINE_LOGS)
    .filter(function(log) { return normalizeDateKey_(log['実行日']) === todayKey; });
  const logMap = logs.reduce(function(map, log) {
    map[log['ルーティンID']] = toBool_(log['完了フラグ']);
    return map;
  }, {});
  const isHoliday = isJapaneseHoliday_(new Date());
  return readSheetAsObjects_(SHEETS.ROUTINES)
    .filter(function(routine) { return toBool_(routine['有効/無効']); })
    .filter(function(routine) { return shouldShowRoutineToday_(routine, isHoliday); })
    .map(function(routine) {
      routine.completed = Boolean(logMap[routine.ID]);
      routine['実行目安時刻'] = formatTimeCell_(routine['実行目安時刻']);
      return routine;
    })
    .sort(function(a, b) {
      return String(a['実行目安時刻'] || '').localeCompare(String(b['実行目安時刻'] || ''));
    });
}

function getRoutineLogs() {
  return readSheetAsObjects_(SHEETS.ROUTINE_LOGS).map(function(log) {
    log['実行日'] = normalizeDateKey_(log['実行日']);
    log['完了フラグ'] = toBool_(log['完了フラグ']);
    return log;
  });
}

function addTask(task) {
  const now = new Date();
  const id = generateTaskId_();
  const row = normalizeTask_(task, id, now, now);
  let folderError = '';
  if (!row['フォルダURL']) {
    try {
      row['フォルダURL'] = createTaskFolder_(row.ID, row['タイトル']);
    } catch (error) {
      folderError = error.message;
      console.error(error.stack || error.message || error);
    }
  }
  if (!row['並び順']) row['並び順'] = getNextOrder_(SHEETS.TASKS, '並び順');
  appendObject_(SHEETS.TASKS, row);
  const saved = serializeObject_(row);
  if (folderError) saved.warning = 'タスクは保存しましたが、Driveフォルダ作成に失敗しました: ' + folderError;
  return saved;
}

function updateTask(task) {
  if (!task || !task.ID) throw new Error('更新対象のIDがありません。');
  return updateObjectById_(SHEETS.TASKS, task.ID, function(current) {
    return normalizeTask_(Object.assign({}, current, task), task.ID, current['作成日'], new Date());
  });
}

function deleteTask(id) {
  deleteObjectById_(SHEETS.TASKS, id);
  readSheetAsObjects_(SHEETS.IMPROVEMENT_IDEAS)
    .filter(function(idea) { return idea.TaskID === id; })
    .forEach(function(idea) { deleteObjectById_(SHEETS.IMPROVEMENT_IDEAS, idea.ID); });
  return { ok: true, id: id };
}

function getImprovementIdeas() {
  const priorityScore = { '高': 0, '中': 1, '低': 2 };
  return readSheetAsObjects_(SHEETS.IMPROVEMENT_IDEAS).sort(function(a, b) {
    return String(a.TaskID || '').localeCompare(String(b.TaskID || ''))
      || (priorityScore[a['優先度']] || 9) - (priorityScore[b['優先度']] || 9)
      || String(b['更新日'] || '').localeCompare(String(a['更新日'] || ''));
  });
}

function getNotifications() {
  return readSheetAsObjects_(SHEETS.NOTIFICATIONS)
    .map(function(row) {
      const status = normalizeNotificationStatus_(row['ステータス']);
      return {
        id: row.ID,
        type: row['種別'],
        title: row['タイトル'],
        description: row['内容'],
        status: status,
        priority: row['優先度'],
        created_at: row['発生時刻'],
        link_url: row['リンクURL'],
        link_label: row['リンクラベル'],
        is_read: toBool_(row['確認済みフラグ']),
        requires_action: toBool_(row['要対応フラグ']),
        duration: row['所要時間'],
        detail: row['詳細'],
        createdAt: row['作成日'],
        updatedAt: row['更新日']
      };
    })
    .sort(function(a, b) {
      return notificationRank_(a) - notificationRank_(b) || notificationTimeValue_(b.created_at) - notificationTimeValue_(a.created_at);
    });
}

function getQuickTodos() {
  return readSheetAsObjects_(SHEETS.QUICK_TODOS)
    .sort(function(a, b) {
      return Number(toBool_(a['完了フラグ'])) - Number(toBool_(b['完了フラグ']))
        || String(b['更新日'] || '').localeCompare(String(a['更新日'] || ''));
    });
}

function getShoppingList() {
  return readSheetAsObjects_(SHEETS.SHOPPING_LIST)
    .sort(function(a, b) {
      return Number(toBool_(a['完了フラグ'])) - Number(toBool_(b['完了フラグ']))
        || String(b['更新日'] || '').localeCompare(String(a['更新日'] || ''));
    });
}

function addQuickTodo(item) {
  const now = new Date();
  const row = normalizeQuickTodo_(item, generateId_('qt'), now, now);
  appendObject_(SHEETS.QUICK_TODOS, row);
  return serializeObject_(row);
}

function updateQuickTodo(item) {
  if (!item || !item.ID) throw new Error('QuickTodo IDがありません。');
  return updateObjectById_(SHEETS.QUICK_TODOS, item.ID, function(current) {
    return normalizeQuickTodo_(Object.assign({}, current, item), item.ID, current['作成日'], new Date());
  });
}

function deleteQuickTodo(id) {
  return deleteObjectById_(SHEETS.QUICK_TODOS, id);
}

function convertQuickTodoToTask(id) {
  if (!id) throw new Error('案件化するQuickTodo IDがありません。');
  const item = readSheetAsObjects_(SHEETS.QUICK_TODOS).find(function(row) { return String(row.ID) === String(id); });
  if (!item) throw new Error('QuickTodoが見つかりません: ' + id);
  const task = addTask({
    'タイトル': item['タイトル'],
    '内容': '',
    'ステータス': '未着手',
    '優先度': '中',
    '期限': item['期限'] || '',
    '進捗': 0,
    '今日やるフラグ': true,
    '関連URL': item['参考URL'] || '',
    'カテゴリ': 'QuickTodo',
    '種別': '案件化'
  });
  deleteQuickTodo(id);
  return { task: task, quickTodoId: id };
}

function addShoppingItem(item) {
  const now = new Date();
  const row = normalizeShoppingItem_(item, generateId_('shop'), now, now);
  appendObject_(SHEETS.SHOPPING_LIST, row);
  return serializeObject_(row);
}

function updateShoppingItem(item) {
  if (!item || !item.ID) throw new Error('買い物リストIDがありません。');
  return updateObjectById_(SHEETS.SHOPPING_LIST, item.ID, function(current) {
    return normalizeShoppingItem_(Object.assign({}, current, item), item.ID, current['作成日'], new Date());
  });
}

function deleteShoppingItem(id) {
  return deleteObjectById_(SHEETS.SHOPPING_LIST, id);
}

function normalizeNotificationStatus_(status) {
  if (status === '完了' || status === 'success') return 'success';
  if (status === '失敗' || status === 'error') return 'error';
  if (status === '要対応' || status === 'action_required') return 'action_required';
  if (status === '情報' || status === 'info') return 'info';
  return status || 'info';
}

function notificationRank_(notification) {
  if (notification.status === 'action_required' || notification.requires_action) return 1;
  if (notification.status === 'error') return 2;
  if (!notification.is_read) return 3;
  return 4;
}

function notificationTimeValue_(value) {
  if (value instanceof Date) return value.getTime();
  const text = String(value || '');
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function addImprovementIdea(item) {
  const now = new Date();
  const row = normalizeImprovementIdea_(item, generateId_('idea'), now, now);
  appendObject_(SHEETS.IMPROVEMENT_IDEAS, row);
  return serializeObject_(row);
}

function updateImprovementIdea(item) {
  if (!item || !item.ID) throw new Error('改善アイディアIDがありません。');
  return updateObjectById_(SHEETS.IMPROVEMENT_IDEAS, item.ID, function(current) {
    return normalizeImprovementIdea_(Object.assign({}, current, item), item.ID, current['作成日'], new Date());
  });
}

function deleteImprovementIdea(id) {
  return deleteObjectById_(SHEETS.IMPROVEMENT_IDEAS, id);
}

function markImprovementDone(id) {
  if (!id) throw new Error('反映済みにする改善アイディアIDがありません。');
  return updateObjectById_(SHEETS.IMPROVEMENT_IDEAS, id, function(current) {
    current['ステータス'] = '反映済み';
    current['更新日'] = new Date();
    return current;
  });
}

function markNotificationRead(id) {
  if (!id) throw new Error('確認済みにする通知IDがありません。');
  return updateObjectById_(SHEETS.NOTIFICATIONS, id, function(current) {
    current['確認済みフラグ'] = true;
    current['更新日'] = new Date();
    return current;
  });
}

function setRoutineLog(routineId, completed) {
  if (!routineId) throw new Error('ルーティンIDがありません。');
  const todayKey = formatDate_(new Date(), 'yyyy-MM-dd');
  const sheet = getSheet_(SHEETS.ROUTINE_LOGS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const routineIdIndex = headers.indexOf('ルーティンID');
  const dateIndex = headers.indexOf('実行日');
  const completedIndex = headers.indexOf('完了フラグ');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][routineIdIndex]) === String(routineId) && normalizeDateKey_(values[i][dateIndex]) === todayKey) {
      sheet.getRange(i + 1, completedIndex + 1).setValue(Boolean(completed));
      return { ok: true, routineId: routineId, completed: Boolean(completed) };
    }
  }
  appendObject_(SHEETS.ROUTINE_LOGS, {
    ID: generateId_('log'),
    'ルーティンID': routineId,
    '実行日': todayKey,
    '完了フラグ': Boolean(completed)
  });
  return { ok: true, routineId: routineId, completed: Boolean(completed) };
}

function refreshTodayEvents() {
  return syncTodayCalendarEvents().sort(function(a, b) {
    return new Date(a['開始時刻']).getTime() - new Date(b['開始時刻']).getTime();
  });
}

function syncTodayCalendarEvents() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
  const fetchedAt = new Date();
  const rows = [];
  getCalendarIds_().forEach(function(calendarId) {
    const calendar = calendarId === 'primary'
      ? CalendarApp.getDefaultCalendar()
      : CalendarApp.getCalendarById(calendarId);
    if (!calendar) return;
    calendar.getEvents(start, end).forEach(function(event) {
      rows.push({
        ID: event.getId(),
        '予定名': event.getTitle(),
        '開始時刻': event.getStartTime(),
        '終了時刻': event.getEndTime(),
        'カレンダー種別': calendar.getName(),
        '場所': event.getLocation(),
        'URL': getCalendarEventUrl_(calendarId, event),
        '説明': event.getDescription(),
        '取得日': fetchedAt
      });
    });
  });
  replaceTodayCalendarRows_(rows, start, end);
  return rows.map(serializeObject_);
}

function getCachedTodayEvents_() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
  return readSheetAsObjects_(SHEETS.CALENDAR_EVENTS)
    .filter(function(event) {
      const startAt = new Date(event['開始時刻']);
      return startAt >= start && startAt < end;
    })
    .sort(function(a, b) {
      return new Date(a['開始時刻']).getTime() - new Date(b['開始時刻']).getTime();
    });
}

function replaceTodayCalendarRows_(rows, start, end) {
  const sheet = getSheet_(SHEETS.CALENDAR_EVENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const startIndex = headers.indexOf('開始時刻');
  for (let i = values.length - 1; i >= 1; i--) {
    const value = values[i][startIndex];
    if (value instanceof Date && value >= start && value < end) sheet.deleteRow(i + 1);
  }
  rows.forEach(function(row) { appendObject_(SHEETS.CALENDAR_EVENTS, row); });
}

function normalizeTask_(task, id, createdAt, updatedAt) {
  return {
    ID: id,
    'タイトル': task['タイトル'] || task.title || '無題タスク',
    '内容': task['内容'] || task.body || '',
    'ステータス': task['ステータス'] || task.status || '未着手',
    '優先度': task['優先度'] || task.priority || '中',
    '進捗': clampNumber_(task['進捗'] || task.progress || 0, 0, 100),
    '今日やるフラグ': toBool_(task['今日やるフラグ'] || task.today),
    '期限': normalizeDateKey_(task['期限'] || task.dueDate),
    'カテゴリ': task['カテゴリ'] || task.category || '',
    '種別': task['種別'] || task.type || '',
    '関連URL': task['関連URL'] || task.url || '',
    'ChatGPT URL': task['ChatGPT URL'] || task.chatgptUrl || '',
    'フォルダURL': task['フォルダURL'] || task.folderUrl || '',
    '次アクション': task['次アクション'] || task.nextAction || '',
    '並び順': Number(task['並び順'] || task.order || 0),
    '作成日': createdAt || new Date(),
    '更新日': updatedAt || new Date()
  };
}

function normalizeImprovementIdea_(item, id, createdAt, updatedAt) {
  return {
    ID: id,
    TaskID: item.TaskID || item.taskId || '',
    'タイトル': item['タイトル'] || item.title || '改善アイディア',
    '内容': item['内容'] || item.body || '',
    'ステータス': item['ステータス'] || item.status || '未着手',
    '優先度': item['優先度'] || item.priority || '中',
    '作成日': createdAt || new Date(),
    '更新日': updatedAt || new Date()
  };
}

function normalizeQuickTodo_(item, id, createdAt, updatedAt) {
  return {
    ID: id,
    'タイトル': item['タイトル'] || item.title || '',
    '完了フラグ': toBool_(item['完了フラグ'] || item.completed),
    '作成日': createdAt || new Date(),
    '更新日': updatedAt || new Date(),
    '参考URL': item['参考URL'] || item.referenceUrl || '',
    '期限': normalizeDateKey_(item['期限'] || item.dueDate),
    '優先度': item['優先度'] || item.priority || '中'
  };
}

function normalizeShoppingItem_(item, id, createdAt, updatedAt) {
  return {
    ID: id,
    '商品名': item['商品名'] || item.name || '',
    '完了フラグ': toBool_(item['完了フラグ'] || item.completed),
    '作成日': createdAt || new Date(),
    '更新日': updatedAt || new Date(),
    '参考URL': item['参考URL'] || item.referenceUrl || '',
    'カテゴリ': item['カテゴリ'] || item.category || '',
    '数量': item['数量'] || item.quantity || ''
  };
}

function generateTaskId_() {
  const maxNumber = readSheetAsObjects_(SHEETS.TASKS).reduce(function(max, task) {
    const match = String(task.ID || '').match(/^A-?(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return 'A' + String(maxNumber + 1).padStart(3, '0');
}

function createTaskFolder_(taskId, title) {
  const parent = getTaskParentFolder_();
  const folderName = taskId + '_' + sanitizeFolderName_(title || '無題タスク');
  try {
    return parent.createFolder(folderName).getUrl();
  } catch (error) {
    throw new Error('Driveフォルダ作成に失敗しました。親フォルダへの編集権限を確認してください。詳細: ' + error.message);
  }
}

function sanitizeFolderName_(name) {
  return String(name || '').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 120);
}

function getTaskParentFolder_() {
  const folderId = getTaskParentFolderId_();
  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error(
      'タスク親フォルダにアクセスできません。フォルダID=' + folderId
      + '。GASを実行しているGoogleアカウントにこのフォルダの閲覧/編集権限があるか、フォルダIDが正しいか確認してください。詳細: '
      + error.message
    );
  }
}

function getTaskParentFolderId_() {
  return PropertiesService.getScriptProperties().getProperty('TASK_PARENT_FOLDER_ID') || TASK_PARENT_FOLDER_ID;
}

function migrateTaskIds_() {
  migrateTaskSheetIds_();
  migrateImprovementIdeaTaskIds_();
}

function migrateTaskSheetIds_() {
  const sheet = getSheet_(SHEETS.TASKS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const idIndex = values[0].indexOf('ID');
  if (idIndex === -1) return;
  for (let i = 1; i < values.length; i++) {
    const converted = convertTaskId_(values[i][idIndex]);
    if (converted) sheet.getRange(i + 1, idIndex + 1).setValue(converted);
  }
}

function migrateImprovementIdeaTaskIds_() {
  const sheet = getSheet_(SHEETS.IMPROVEMENT_IDEAS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const taskIdIndex = values[0].indexOf('TaskID');
  if (taskIdIndex === -1) return;
  for (let i = 1; i < values.length; i++) {
    const converted = convertTaskId_(values[i][taskIdIndex]);
    if (converted) sheet.getRange(i + 1, taskIdIndex + 1).setValue(converted);
  }
}

function convertTaskId_(value) {
  const match = String(value || '').match(/^A-(\d+)$/);
  return match ? 'A' + match[1] : '';
}

function shouldShowRoutineToday_(routine, isHoliday) {
  const now = new Date();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const todayName = dayNames[now.getDay()];
  const frequency = String(routine['頻度'] || '毎日');
  const weekdays = String(routine['曜日'] || '').split(/[,\s、]+/).filter(Boolean);
  const runsOnHoliday = toBool_(routine['祝日フラグ']);
  if (isHoliday && !runsOnHoliday) return false;
  if (frequency === '毎日') return true;
  if (frequency === '曜日指定') return weekdays.indexOf(todayName) !== -1;
  if (frequency === '平日') return now.getDay() >= 1 && now.getDay() <= 5 && !isHoliday;
  if (frequency === '休日') return now.getDay() === 0 || now.getDay() === 6 || isHoliday;
  return true;
}

function isJapaneseHoliday_(date) {
  const holidayCalendar = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
  if (!holidayCalendar) return false;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0);
  return holidayCalendar.getEvents(start, end).length > 0;
}

function getOrCreateSheet_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('シートがありません: ' + sheetName);
  return sheet;
}

function getSpreadsheet_() {
  const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) return SpreadsheetApp.openById(prop);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const created = SpreadsheetApp.create('Personal TODO Dashboard DB');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function ensureHeaders_(sheet, expectedHeaders) {
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  expectedHeaders.forEach(function(header) {
    if (currentHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
  sheet.setFrozenRows(1);
}

function readSheetAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(function(row) { return row.some(function(cell) { return cell !== ''; }); })
    .map(function(row) { return serializeObject_(rowToObject_(headers, row)); });
}

function rowToObject_(headers, row) {
  return headers.reduce(function(object, header, index) {
    object[header] = row[index];
    return object;
  }, {});
}

function appendObject_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) {
    return object[header] !== undefined ? object[header] : '';
  }));
}

function updateObjectById_(sheetName, id, mapper) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('ID');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      const rowObject = mapper(rowToObject_(headers, values[i]));
      const rowValues = headers.map(function(header) { return rowObject[header] !== undefined ? rowObject[header] : ''; });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowValues]);
      return serializeObject_(rowObject);
    }
  }
  throw new Error('データが見つかりません: ' + id);
}

function deleteObjectById_(sheetName, id) {
  if (!id) throw new Error('削除対象のIDがありません。');
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const idIndex = values[0].indexOf('ID');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true, id: id };
    }
  }
  throw new Error('データが見つかりません: ' + id);
}

function getNextOrder_(sheetName, orderHeader) {
  const rows = readSheetAsObjects_(sheetName);
  return rows.reduce(function(max, row) {
    return Math.max(max, Number(row[orderHeader] || 0));
  }, 0) + 1;
}

function serializeObject_(object) {
  const serialized = {};
  Object.keys(object).forEach(function(key) {
    serialized[key] = object[key] instanceof Date ? serializeDateValue_(key, object[key]) : object[key];
  });
  return serialized;
}

function serializeDateValue_(key, value) {
  if (key === '実行目安時刻' || key === '発生時刻') return formatTimeCell_(value);
  return value.toISOString();
}

function formatTimeCell_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  const text = String(value);
  const match = text.match(/(\d{1,2}):(\d{2})/);
  return match ? String(match[1]).padStart(2, '0') + ':' + match[2] : text;
}

function normalizeDateKey_(value) {
  if (!value) return '';
  if (value instanceof Date) return formatDate_(value, 'yyyy-MM-dd');
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : formatDate_(parsed, 'yyyy-MM-dd');
}

function formatDate_(date, pattern) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), pattern);
}

function toBool_(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1 || value === 'はい';
}

function clampNumber_(value, min, max) {
  const number = Number(value);
  if (isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function generateId_(prefix) {
  return prefix + '_' + Utilities.getUuid().slice(0, 8) + '_' + Date.now();
}

function getCalendarIds_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CALENDAR_IDS');
  return (prop ? prop.split(',') : ['primary']).map(function(id) { return id.trim(); }).filter(Boolean);
}

function getCalendarEventUrl_(calendarId, event) {
  const eid = Utilities.base64EncodeWebSafe(event.getId() + ' ' + calendarId).replace(/=+$/, '');
  return 'https://calendar.google.com/calendar/event?eid=' + eid;
}

function seedQuickLinks_() {
  const now = new Date();
  const existingIds = readSheetAsObjects_(SHEETS.QUICK_LINKS).map(function(link) { return String(link.ID); });
  const defaults = [
    ['ql_001', 'ChatGPT', 'https://chatgpt.com/', 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64', 1, true],
    ['ql_002', 'Calendar', 'https://calendar.google.com/', 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64', 2, true],
    ['ql_003', 'Sheets', 'https://sheets.google.com/', 'https://www.google.com/s2/favicons?domain=sheets.google.com&sz=64', 3, true],
    ['ql_004', 'Drive', 'https://drive.google.com/', 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64', 4, true],
    ['ql_005', 'Gmail', 'https://mail.google.com/', 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64', 5, true]
  ];
  defaults.filter(function(row) { return existingIds.indexOf(row[0]) === -1; }).forEach(function(row) {
    appendObject_(SHEETS.QUICK_LINKS, {
      ID: row[0], '名前': row[1], 'URL': row[2], 'アイコン画像URL': row[3], '並び順': row[4],
      '表示フラグ': row[5], '作成日': now, '更新日': now
    });
  });
}

function seedRoutines_() {
  const existingIds = readSheetAsObjects_(SHEETS.ROUTINES).map(function(routine) { return String(routine.ID); });
  const defaults = [
    ['rt_001', '起床・白湯を飲む', '一日の起動', '毎日', '', true, '06:30', true],
    ['rt_002', 'ストレッチ・深呼吸', '身体を起こす', '毎日', '', true, '06:40', true],
    ['rt_003', '朝食・身支度', '朝の準備', '毎日', '', true, '07:00', true],
    ['rt_004', 'デスク周り整備・ToDo確認', '着手前の整理', '毎日', '', true, '08:20', true],
    ['rt_005', '午前の集中仕事', '最重要タスク', '平日', '', false, '09:00', true],
    ['rt_006', '昼食・休憩', '昼の回復', '毎日', '', true, '12:10', true],
    ['rt_007', '就寝準備', '明日に備える', '毎日', '', true, '21:30', true]
  ];
  defaults.filter(function(row) { return existingIds.indexOf(row[0]) === -1; }).forEach(function(row) {
    appendObject_(SHEETS.ROUTINES, {
      ID: row[0], 'ルーティン名': row[1], '説明': row[2], '頻度': row[3], '曜日': row[4],
      '祝日フラグ': row[5], '実行目安時刻': row[6], '有効/無効': row[7]
    });
  });
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
