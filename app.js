const STORAGE_KEY = "kusayakyu-log-v1";
const BACKUP_KEY = "kusayakyu-log-backups-v1";
const ACTIVE_TAB_KEY = "kusayakyu-active-tab-v1";
const SYNC_CONFIG_KEY = "kusayakyu-sync-config-v1";
const SYNC_META_KEY = "kusayakyu-sync-meta-v1";
const SYNC_TABLE = "kusayakyu_sync_data";
const SYNC_PROFILE_ID = "default";
const MAX_BACKUPS = 10;

const RESULT_DEFS = {
  single: { label: "単打", atBat: true, hit: true, totalBases: 1, onBase: true, single: true },
  double: { label: "二塁打", atBat: true, hit: true, totalBases: 2, onBase: true, double: true },
  triple: { label: "三塁打", atBat: true, hit: true, totalBases: 3, onBase: true, triple: true },
  homer: { label: "本塁打", atBat: true, hit: true, totalBases: 4, onBase: true, homer: true },
  walk: { label: "四球", atBat: false, hit: false, totalBases: 0, onBase: true, walk: true },
  hbp: { label: "死球", atBat: false, hit: false, totalBases: 0, onBase: true, hbp: true },
  strikeout: { label: "三振", atBat: true, hit: false, totalBases: 0, onBase: false },
  groundout: { label: "ゴロアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  flyout: { label: "フライアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  lineout: { label: "ライナーアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  fielderChoice: { label: "野選", atBat: true, hit: false, totalBases: 0, onBase: false },
  error: { label: "失策出塁", atBat: true, hit: false, totalBases: 0, onBase: false, error: true },
  sacFly: { label: "犠飛", atBat: false, hit: false, totalBases: 0, onBase: false, sacFly: true },
  sacBunt: { label: "犠打", atBat: false, hit: false, totalBases: 0, onBase: false, sacBunt: true },
};

const BATTED_DIRECTION_MARKERS = [
  { key: "レフト方向", label: "レフト", x: 17, y: 31, type: "outfield" },
  { key: "センター方向", label: "センター", x: 50, y: 15, type: "outfield" },
  { key: "ライト方向", label: "ライト", x: 83, y: 31, type: "outfield" },
  { key: "三塁方向", label: "三塁", x: 27, y: 61, type: "infield" },
  { key: "遊撃方向", label: "遊撃", x: 35, y: 50, type: "infield" },
  { key: "投手方向", label: "投手", x: 50, y: 62, type: "infield" },
  { key: "二塁方向", label: "二塁", x: 65, y: 50, type: "infield" },
  { key: "一塁方向", label: "一塁", x: 73, y: 61, type: "infield" },
  { key: "捕手方向", label: "捕手", x: 50, y: 88, type: "infield" },
];

const BATTED_DIRECTION_ALIASES = {
  左方向: "レフト方向",
  中方向: "センター方向",
  右方向: "ライト方向",
};

const COURSE_GRID = [
  "外角高め",
  "真ん中高め",
  "内角高め",
  "外角真ん中",
  "真ん中",
  "内角真ん中",
  "外角低め",
  "真ん中低め",
  "内角低め",
];

const emptyStats = () => ({
  pa: 0,
  ab: 0,
  h: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  hr: 0,
  rbi: 0,
  runs: 0,
  errorsReached: 0,
  steals: 0,
  stealAttempts: 0,
  bb: 0,
  hbp: 0,
  sf: 0,
  sh: 0,
  tb: 0,
  rispAb: 0,
  rispH: 0,
});

let saveNotice = {
  type: "info",
  badge: "待機中",
  title: "保存状態",
  detail: "保存ボタンを押すと、ここに結果が表示されます。",
};
let syncNotice = {
  type: "info",
  badge: "未設定",
  title: "クラウド同期はまだ設定されていません",
  detail: "メールアドレスと、Supabaseボタン内のURL・公開キーを入力してください。",
};
let state = loadState();
let syncConfig = loadSyncConfig();
let syncMeta = loadSyncMeta();
let syncClient = null;
let syncClientKey = "";
let syncTimer = null;
let syncInProgress = false;
let editingGameId = "";
let editingPaId = "";
let selectedMemoGameId = "";
let selectedEntryGameId = "";
let selectedPitcherKey = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  tabs: $$(".tab"),
  panels: $$(".tab-panel"),
  analysisMetrics: $("#analysisMetrics"),
  battedDirectionChart: $("#battedDirectionChart"),
  battedDirectionSummary: $("#battedDirectionSummary"),
  recentGames: $("#recentGames"),
  recentPlateAppearances: $("#recentPlateAppearances"),
  gameForm: $("#gameForm"),
  paForm: $("#paForm"),
  mobilePaForm: $("#mobilePaForm"),
  gameSelect: $("#gameSelect"),
  mobileGameSelect: $("#mobileGameSelect"),
  mobileGameSummary: $("#mobileGameSummary"),
  mobilePitcherPresets: $("#mobilePitcherPresets"),
  mobileBattedFields: $("#mobileBattedFields"),
  gameList: $("#gameList"),
  gameCount: $("#gameCount"),
  paList: $("#paList"),
  paCount: $("#paCount"),
  pitcherStatsBody: $("#pitcherStatsBody"),
  pitchTypeStatsBody: $("#pitchTypeStatsBody"),
  courseStatsBody: $("#courseStatsBody"),
  courseSupplementChart: $("#courseSupplementChart"),
  courseSupplementSummary: $("#courseSupplementSummary"),
  countStatsBody: $("#countStatsBody"),
  pitcherCards: $("#pitcherCards"),
  toast: $("#toast"),
  exportButton: $("#exportButton"),
  importInput: $("#importInput"),
  saveStatusIndicator: $("#saveStatusIndicator"),
  saveStatusBadge: $("#saveStatusBadge"),
  saveStatusTitle: $("#saveStatusTitle"),
  saveStatusDetail: $("#saveStatusDetail"),
  backupStatusText: $("#backupStatusText"),
  backupExportButton: $("#backupExportButton"),
  restoreBackupButton: $("#restoreBackupButton"),
  syncStatusCard: $("#syncStatusCard"),
  syncStatusBadge: $("#syncStatusBadge"),
  syncStatusTitle: $("#syncStatusTitle"),
  syncStatusDetail: $("#syncStatusDetail"),
  syncLastSync: $("#syncLastSync"),
  syncConfigForm: $("#syncConfigForm"),
  syncSupabaseUrl: $("#syncSupabaseUrl"),
  syncAnonKey: $("#syncAnonKey"),
  syncEmail: $("#syncEmail"),
  syncPassword: $("#syncPassword"),
  syncNowButton: $("#syncNowButton"),
  syncPullButton: $("#syncPullButton"),
  syncPushButton: $("#syncPushButton"),
  syncSignInButton: $("#syncSignInButton"),
  syncSignUpButton: $("#syncSignUpButton"),
  syncSignOutButton: $("#syncSignOutButton"),
  gameSubmitButton: $("#gameSubmitButton"),
  cancelGameEditButton: $("#cancelGameEditButton"),
  paSubmitButton: $("#paSubmitButton"),
  cancelPaEditButton: $("#cancelPaEditButton"),
  mobileClearButton: $("#mobileClearButton"),
};

function loadState() {
  const fallback = { games: [], plateAppearances: [], pitcherStrategies: {} };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    saveNotice = {
      type: "success",
      badge: "保存済み",
      title: "保存データを読み込みました",
      detail: "このブラウザ内に残っていた前回の記録を表示しています。",
    };
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    const backup = latestBackup();
    if (backup) {
      saveNotice = {
        type: "warning",
        badge: "復元候補",
        title: "通常保存を読めなかったため、最新バックアップを表示しました",
        detail: `バックアップ日時：${formatDateTime(backup.createdAt)}。必要なら「最新バックアップを復元」を押してください。`,
      };
      return normalizeState(backup.data);
    }
    saveNotice = {
      type: "error",
      badge: "失敗",
      title: "保存データを読み込めませんでした",
      detail: storageErrorMessage(error),
    };
    return fallback;
  }
}

function loadSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (!raw) return { supabaseUrl: "", anonKey: "", email: "" };
    const parsed = JSON.parse(raw);
    return {
      supabaseUrl: String(parsed?.supabaseUrl || "").trim(),
      anonKey: String(parsed?.anonKey || "").trim(),
      email: String(parsed?.email || "").trim(),
    };
  } catch {
    return { supabaseUrl: "", anonKey: "", email: "" };
  }
}

function saveSyncConfig(nextConfig) {
  syncConfig = {
    supabaseUrl: String(nextConfig.supabaseUrl || "").trim().replace(/\/$/, ""),
    anonKey: String(nextConfig.anonKey || "").trim(),
    email: String(nextConfig.email || "").trim(),
  };
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(syncConfig));
  syncClient = null;
  syncClientKey = "";
}

function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) {
      return { remoteUpdatedAt: "", lastSyncedAt: "", lastSyncedSignature: "" };
    }
    const parsed = JSON.parse(raw);
    return {
      remoteUpdatedAt: String(parsed?.remoteUpdatedAt || ""),
      lastSyncedAt: String(parsed?.lastSyncedAt || ""),
      lastSyncedSignature: String(parsed?.lastSyncedSignature || ""),
    };
  } catch {
    return { remoteUpdatedAt: "", lastSyncedAt: "", lastSyncedSignature: "" };
  }
}

function saveSyncMeta(nextMeta) {
  syncMeta = {
    ...syncMeta,
    ...nextMeta,
  };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
}

function normalizeState(value) {
  return {
    games: Array.isArray(value?.games) ? value.games : [],
    plateAppearances: Array.isArray(value?.plateAppearances) ? value.plateAppearances : [],
    pitcherStrategies: normalizePitcherStrategies(value?.pitcherStrategies),
  };
}

function normalizePitcherStrategies(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(Object.entries(value)
    .map(([key, entry]) => {
      const text = typeof entry === "string"
        ? entry
        : String(entry?.text || "");
      const updatedAt = typeof entry === "object" && entry
        ? String(entry.updatedAt || "")
        : "";
      return [key, { text, updatedAt }];
    })
    .filter(([key, entry]) => key && entry.text.trim()));
}

function readBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry?.data && entry?.createdAt)
      : [];
  } catch {
    return [];
  }
}

function latestBackup() {
  return readBackups()[0] || null;
}

function writeAutoBackup(nextState, reason) {
  const backups = readBackups();
  const entry = {
    id: createId("backup"),
    createdAt: new Date().toISOString(),
    reason,
    data: nextState,
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify([entry, ...backups].slice(0, MAX_BACKUPS)));
  return entry;
}

function persistState(nextState, reason) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch (error) {
    return {
      ok: false,
      detail: storageErrorMessage(error),
    };
  }

  try {
    const backup = writeAutoBackup(nextState, reason);
    return {
      ok: true,
      backupOk: true,
      backup,
    };
  } catch (error) {
    return {
      ok: true,
      backupOk: false,
      detail: storageErrorMessage(error),
    };
  }
}

function hasSyncConfig() {
  return Boolean(syncConfig.supabaseUrl && syncConfig.anonKey && syncConfig.email);
}

function supabaseLibraryReady() {
  return Boolean(window.supabase?.createClient);
}

function stateSignature(value = state) {
  return JSON.stringify(normalizeState(value));
}

function itemTimestamp(item) {
  return item?.updatedAt || item?.createdAt || "";
}

function newerItem(current, next) {
  if (!current) return next;
  if (!next) return current;
  return itemTimestamp(next) >= itemTimestamp(current) ? next : current;
}

function mergeById(localItems, remoteItems) {
  const merged = new Map();
  localItems.forEach((item) => {
    if (item?.id) merged.set(item.id, item);
  });
  remoteItems.forEach((item) => {
    if (item?.id) merged.set(item.id, newerItem(merged.get(item.id), item));
  });
  return [...merged.values()];
}

function mergeStates(localState, remoteState) {
  const local = normalizeState(localState);
  const remote = normalizeState(remoteState);
  return normalizeState({
    games: mergeById(local.games, remote.games),
    plateAppearances: mergeById(local.plateAppearances, remote.plateAppearances),
    pitcherStrategies: mergePitcherStrategies(local.pitcherStrategies, remote.pitcherStrategies),
  });
}

function mergePitcherStrategies(localStrategies, remoteStrategies) {
  const merged = { ...localStrategies };
  Object.entries(remoteStrategies).forEach(([key, remoteEntry]) => {
    const localEntry = merged[key];
    if (!localEntry || (remoteEntry.updatedAt || "") >= (localEntry.updatedAt || "")) {
      merged[key] = remoteEntry;
    }
  });
  return merged;
}

function updateSyncNotice(type, badge, title, detail) {
  syncNotice = { type, badge, title, detail };
  renderSyncStatus();
}

function syncErrorMessage(error) {
  if (!navigator.onLine) {
    return "インターネット接続がないため同期できません。接続後にもう一度試してください。";
  }
  if (error?.message?.includes("Failed to fetch")) {
    return "Supabaseに接続できませんでした。URL、キー、通信状態を確認してください。";
  }
  return error?.message || "同期中にエラーが発生しました。";
}

function syncSupabaseClient() {
  if (!hasSyncConfig()) {
    throw new Error("SupabaseのURL、キー、メールアドレスを入力してください。");
  }
  if (!supabaseLibraryReady()) {
    throw new Error("Supabaseの同期ライブラリを読み込めませんでした。インターネット接続を確認して開き直してください。");
  }

  const key = `${syncConfig.supabaseUrl}::${syncConfig.anonKey}`;
  if (syncClient && syncClientKey === key) return syncClient;

  syncClient = window.supabase.createClient(syncConfig.supabaseUrl, syncConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: "kusayakyu-supabase-auth-v1",
    },
  });
  syncClientKey = key;
  return syncClient;
}

async function currentSyncUser() {
  const client = syncSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function requireSyncUser() {
  const user = await currentSyncUser();
  if (!user) {
    throw new Error("Supabaseにログインしてください。");
  }
  return user;
}

async function loadRemoteSnapshot(userId) {
  const client = syncSupabaseClient();
  const { data, error } = await client
    .from(SYNC_TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .eq("profile_id", SYNC_PROFILE_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    data: normalizeState(data.data),
    updatedAt: data.updated_at || "",
  };
}

async function saveRemoteSnapshot(userId, nextState) {
  const client = syncSupabaseClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from(SYNC_TABLE)
    .upsert({
      user_id: userId,
      profile_id: SYNC_PROFILE_ID,
      data: normalizeState(nextState),
      updated_at: updatedAt,
    }, { onConflict: "user_id,profile_id" })
    .select("updated_at")
    .single();

  if (error) throw error;
  return data?.updated_at || updatedAt;
}

function markSynced(remoteUpdatedAt, syncedState = state) {
  saveSyncMeta({
    remoteUpdatedAt,
    lastSyncedAt: new Date().toISOString(),
    lastSyncedSignature: stateSignature(syncedState),
  });
}

async function pushLocalStateToCloud(message = "この端末のデータをクラウドへ保存しました") {
  const user = await requireSyncUser();
  const remoteUpdatedAt = await saveRemoteSnapshot(user.id, state);
  markSynced(remoteUpdatedAt);
  updateSyncNotice("success", "同期済み", message, `最終同期：${formatDateTime(syncMeta.lastSyncedAt)}`);
}

async function pullCloudStateToLocal(message = "クラウドのデータを読み込みました") {
  const user = await requireSyncUser();
  const remote = await loadRemoteSnapshot(user.id);
  if (!remote) {
    await pushLocalStateToCloud("クラウドに初回データを作成しました");
    return;
  }

  if (commitState(remote.data, message, "クラウド同期", { skipCloudSync: true })) {
    markSynced(remote.updatedAt, remote.data);
    updateSyncNotice("success", "同期済み", message, `最終同期：${formatDateTime(syncMeta.lastSyncedAt)}`);
  }
}

async function mergeAndPushCloudState(remote) {
  const user = await requireSyncUser();
  const merged = mergeStates(state, remote.data);
  if (!commitState(merged, "Mac/iPhoneの変更を結合しました", "クラウド同期", { skipCloudSync: true })) return;
  const remoteUpdatedAt = await saveRemoteSnapshot(user.id, merged);
  markSynced(remoteUpdatedAt, merged);
  updateSyncNotice(
    "success",
    "結合済み",
    "Mac/iPhoneの変更を結合して同期しました",
    `最終同期：${formatDateTime(syncMeta.lastSyncedAt)}`,
  );
}

async function runCloudSync(reason = "auto") {
  if (syncInProgress) return;
  if (!hasSyncConfig()) {
    renderSyncStatus();
    return;
  }

  syncInProgress = true;
  updateSyncNotice("info", "同期中", "クラウド同期中です", "少し待ってください。");

  try {
    const user = await requireSyncUser();
    const remote = await loadRemoteSnapshot(user.id);
    const localChanged = stateSignature() !== syncMeta.lastSyncedSignature;

    if (!remote) {
      await pushLocalStateToCloud("クラウドに初回データを作成しました");
      return;
    }

    const remoteChanged = remote.updatedAt !== syncMeta.remoteUpdatedAt;

    if (remoteChanged && localChanged) {
      await mergeAndPushCloudState(remote);
    } else if (remoteChanged) {
      await pullCloudStateToLocal("クラウド側の最新データを読み込みました");
    } else if (localChanged) {
      await pushLocalStateToCloud(reason === "local-change" ? "変更をクラウドへ自動同期しました" : "この端末の変更をクラウドへ同期しました");
    } else {
      markSynced(remote.updatedAt);
      updateSyncNotice("success", "同期済み", "クラウドとこの端末は同じ状態です", `最終同期：${formatDateTime(syncMeta.lastSyncedAt)}`);
    }
  } catch (error) {
    updateSyncNotice("error", "失敗", "クラウド同期に失敗しました", syncErrorMessage(error));
  } finally {
    syncInProgress = false;
    renderSyncStatus();
  }
}

function scheduleCloudSync(reason) {
  if (!hasSyncConfig()) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    runCloudSync(reason);
  }, 900);
}

function commitState(nextState, successMessage, reason, options = {}) {
  const normalizedState = normalizeState({
    ...nextState,
    pitcherStrategies: Object.prototype.hasOwnProperty.call(nextState, "pitcherStrategies")
      ? nextState.pitcherStrategies
      : state.pitcherStrategies,
  });
  const result = persistState(normalizedState, reason);

  if (!result.ok) {
    saveNotice = {
      type: "error",
      badge: "失敗",
      title: "保存に失敗しました",
      detail: result.detail,
    };
    renderSaveStatus();
    showToast("保存に失敗しました");
    return false;
  }

  state = normalizedState;

  saveNotice = result.backupOk
    ? {
        type: "success",
        badge: "保存済み",
        title: successMessage,
        detail: `自動バックアップも作成しました：${formatDateTime(result.backup.createdAt)}`,
      }
    : {
        type: "warning",
        badge: "注意",
        title: `${successMessage}。ただし自動バックアップに失敗しました`,
        detail: result.detail,
      };

  render();
  if (!options.skipCloudSync) {
    scheduleCloudSync("local-change");
  }
  showToast(successMessage);
  return true;
}

function storageErrorMessage(error) {
  if (error?.name === "QuotaExceededError") {
    return "ブラウザの保存容量がいっぱいです。データを書き出してから、不要なブラウザデータを整理してください。";
  }
  if (error?.name === "SecurityError") {
    return "この開き方ではブラウザ保存が許可されていません。通常のブラウザ画面で開き直してください。";
  }
  return "ブラウザ保存に失敗しました。シークレットモードや保存制限が原因の可能性があります。";
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "日付未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : "0";
}

function formatRate(value) {
  if (!Number.isFinite(value)) return "-";
  if (value === 1) return "1.000";
  if (value === 0) return ".000";
  return value.toFixed(3).replace(/^0/, "");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function labelForResult(result) {
  return RESULT_DEFS[result]?.label || "未設定";
}

function resultDef(pa) {
  return RESULT_DEFS[pa.result] || {};
}

function skipsBattedBall(result) {
  return ["strikeout", "walk"].includes(result);
}

function stolenBaseSummary(value) {
  switch (value) {
    case "盗塁成功1":
      return { steals: 1, attempts: 1 };
    case "盗塁成功2":
      return { steals: 2, attempts: 2 };
    case "盗塁失敗":
      return { steals: 0, attempts: 1 };
    case "盗塁1成功1失敗":
      return { steals: 1, attempts: 2 };
    default:
      return { steals: 0, attempts: 0 };
  }
}

function breakingBallsForPa(pa) {
  if (Array.isArray(pa.breakingBalls)) {
    return pa.breakingBalls.filter(Boolean);
  }

  return [pa.breakingBall1, pa.breakingBall2, pa.breakingBall3].filter(Boolean);
}

function formatBreakingBalls(pa, fallback = "変化球未選択") {
  const balls = breakingBallsForPa(pa);
  return balls.length ? balls.join("、") : fallback;
}

function pitcherBreakingBallsForPa(pa) {
  return breakingBallsForPa(pa).filter((pitch) => pitch && pitch !== "ストレート");
}

function getGame(gameId) {
  return state.games.find((game) => game.id === gameId);
}

function getPlateAppearance(paId) {
  return state.plateAppearances.find((pa) => pa.id === paId);
}

function setFieldValue(form, name, value) {
  const field = form.elements[name];
  if (!field) return;

  if (field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }

  if (field.tagName === "SELECT") {
    const stringValue = String(value ?? "");
    const hasOption = [...field.options].some((option) => option.value === stringValue || option.textContent === stringValue);
    field.value = hasOption ? stringValue : "";
    return;
  }

  field.value = value ?? "";
}

function gameTitle(game) {
  if (!game) return "試合未選択";
  const score = game.ownScore !== "" && game.opponentScore !== ""
    ? ` ${game.ownScore}-${game.opponentScore}`
    : "";
  return `${formatDate(game.date)} ${game.opponent || "対戦相手未設定"}${score}`;
}

function gameResultLabel(game) {
  if (!game || game.ownScore === "" || game.opponentScore === "") return "スコア未入力";
  if (Number(game.ownScore) > Number(game.opponentScore)) return "勝ち";
  if (Number(game.ownScore) < Number(game.opponentScore)) return "負け";
  return "引き分け";
}

function normalizeCountLabel(value) {
  if (!value) return "";
  const count = String(value);
  if (/^\dS-\dB$/.test(count)) return count;

  const oldCount = count.match(/^([0-3])-([0-2])$/);
  if (!oldCount) return count;

  const balls = oldCount[1];
  const strikes = oldCount[2];
  return `${strikes}S-${balls}B`;
}

function normalizeBattedDirection(value) {
  if (!value) return "";
  return BATTED_DIRECTION_ALIASES[value] || value;
}

function sortByAvgRows(rows) {
  return [...rows].sort((a, b) => {
    const avgA = Number.isFinite(a.avg) ? a.avg : -1;
    const avgB = Number.isFinite(b.avg) ? b.avg : -1;
    return avgB - avgA || b.ab - a.ab || b.pa - a.pa || a.label.localeCompare(b.label, "ja");
  });
}

function selectedMemoGame() {
  const games = sortedGames();
  if (!games.length) return null;

  const selected = games.find((game) => game.id === selectedMemoGameId);
  if (selected) return selected;

  selectedMemoGameId = games[0].id;
  return games[0];
}

function selectedEntryGame() {
  const games = sortedGames();
  if (!games.length) return null;

  const selected = games.find((game) => game.id === selectedEntryGameId);
  if (selected) return selected;

  selectedEntryGameId = games[0].id;
  return games[0];
}

function sortedGames() {
  return [...state.games].sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare) return dateCompare;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

function sortedPlateAppearances() {
  return [...state.plateAppearances].sort((a, b) => {
    const gameA = getGame(a.gameId);
    const gameB = getGame(b.gameId);
    const dateCompare = (gameB?.date || "").localeCompare(gameA?.date || "");
    if (dateCompare) return dateCompare;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

function nextPlateAppearanceForGame(gameId) {
  const used = new Set(state.plateAppearances
    .filter((pa) => pa.gameId === gameId)
    .map((pa) => pa.plateAppearance || pa.inning)
    .filter(Boolean));

  for (let index = 1; index <= 4; index += 1) {
    const label = `第${index}打席`;
    if (!used.has(label)) return label;
  }

  return "第4打席";
}

function latestPaForPitcher(row) {
  return sortedPlateAppearances().find((pa) => pitcherProfileKey(pa) === row.key) || row.plateAppearances[0] || null;
}

function addPlateAppearanceToStats(stats, pa) {
  const def = resultDef(pa);
  const steal = stolenBaseSummary(pa.stolenBase);
  stats.pa += 1;
  stats.rbi += Number(pa.rbi) || 0;
  stats.runs += Number(pa.runScored) || 0;
  stats.steals += steal.steals;
  stats.stealAttempts += steal.attempts;
  stats.tb += def.totalBases || 0;

  if (def.atBat) stats.ab += 1;
  if (def.hit) stats.h += 1;
  if (def.single) stats.singles += 1;
  if (def.double) stats.doubles += 1;
  if (def.triple) stats.triples += 1;
  if (def.homer) stats.hr += 1;
  if (def.error) stats.errorsReached += 1;
  if (def.walk) stats.bb += 1;
  if (def.hbp) stats.hbp += 1;
  if (def.sacFly) stats.sf += 1;
  if (def.sacBunt) stats.sh += 1;

  if (pa.risp && def.atBat) {
    stats.rispAb += 1;
    if (def.hit) stats.rispH += 1;
  }

  return stats;
}

function calculateStats(plateAppearances) {
  return plateAppearances.reduce(addPlateAppearanceToStats, emptyStats());
}

function withRates(stats) {
  const avg = stats.ab ? stats.h / stats.ab : NaN;
  const obpDenominator = stats.ab + stats.bb + stats.hbp + stats.sf;
  const obp = obpDenominator ? (stats.h + stats.bb + stats.hbp) / obpDenominator : NaN;
  const slg = stats.ab ? stats.tb / stats.ab : NaN;
  const ops = Number.isFinite(obp) && Number.isFinite(slg) ? obp + slg : NaN;
  const rispAvg = stats.rispAb ? stats.rispH / stats.rispAb : NaN;
  const stealRate = stats.stealAttempts ? stats.steals / stats.stealAttempts : NaN;

  return { ...stats, avg, obp, slg, ops, rispAvg, stealRate };
}

function groupStats(plateAppearances, keyGetter, fallbackLabel) {
  const groups = new Map();

  plateAppearances.forEach((pa) => {
    const key = keyGetter(pa) || fallbackLabel;
    const stats = groups.get(key) || emptyStats();
    addPlateAppearanceToStats(stats, pa);
    groups.set(key, stats);
  });

  return [...groups.entries()]
    .map(([label, stats]) => ({ label, ...withRates(stats) }))
    .sort((a, b) => b.pa - a.pa || a.label.localeCompare(b.label, "ja"));
}

function sortPitchTypeRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.label === "ストレート" && b.label !== "ストレート") return -1;
    if (b.label === "ストレート" && a.label !== "ストレート") return 1;
    return b.ab - a.ab || b.pa - a.pa || a.label.localeCompare(b.label, "ja");
  });
}

function battedDirectionStats(plateAppearances) {
  const counts = Object.fromEntries(BATTED_DIRECTION_MARKERS.map((marker) => [marker.key, 0]));
  let total = 0;
  let other = 0;

  plateAppearances.forEach((pa) => {
    const direction = normalizeBattedDirection(pa.battedDirection);
    if (!direction) return;
    total += 1;

    if (Object.prototype.hasOwnProperty.call(counts, direction)) {
      counts[direction] += 1;
      return;
    }

    other += 1;
  });

  return { counts, other, total };
}

function directionPercent(count, total) {
  return total ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";
}

function pitcherOpponent(pa) {
  return getGame(pa.gameId)?.opponent || "対戦相手未入力";
}

function pitcherNumber(pa) {
  return pa.pitcherNumber || "未入力";
}

function pitcherName(pa) {
  return pa.pitcherName || "投手未入力";
}

function pitcherProfileKey(pa) {
  return [pitcherOpponent(pa), pitcherName(pa), pitcherNumber(pa)].join("||");
}

function pitcherStrategyText(key) {
  return String(state.pitcherStrategies?.[key]?.text || "");
}

function pitcherStrategyKeyForForm(form) {
  const pitcherNameValue = String(form?.elements?.pitcherName?.value || "").trim();
  if (!pitcherNameValue) return "";

  return pitcherProfileKey({
    gameId: form.elements.gameId?.value || "",
    pitcherName: pitcherNameValue,
    pitcherNumber: String(form.elements.pitcherNumber?.value || "").trim(),
  });
}

function syncPitcherStrategyField(form) {
  if (!form?.elements?.pitcherStrategy) return;
  const key = pitcherStrategyKeyForForm(form);
  setFieldValue(form, "pitcherStrategy", key ? pitcherStrategyText(key) : "");
}

function withPitcherStrategy(nextState, pa, strategyValue) {
  const normalizedState = normalizeState({
    ...nextState,
    pitcherStrategies: Object.prototype.hasOwnProperty.call(nextState, "pitcherStrategies")
      ? nextState.pitcherStrategies
      : state.pitcherStrategies,
  });
  const strategies = { ...normalizedState.pitcherStrategies };
  const key = pitcherProfileKey(pa);
  const text = String(strategyValue || "").trim();

  if (text) {
    strategies[key] = { text, updatedAt: new Date().toISOString() };
  } else {
    delete strategies[key];
  }

  return { ...normalizedState, pitcherStrategies: strategies };
}

function uniquePitcherValues(plateAppearances, valueGetter, fallback = "未入力", limit = 3) {
  const values = [...new Set(plateAppearances.flatMap((pa) => valueGetter(pa)).filter(Boolean))];
  if (!values.length) return fallback;
  const visible = values.slice(0, limit).join("、");
  return values.length > limit ? `${visible}ほか` : visible;
}

function groupPitcherStats(plateAppearances) {
  const groups = new Map();

  plateAppearances.forEach((pa) => {
    const key = pitcherProfileKey(pa);
    const row = groups.get(key) || {
      key,
      opponent: pitcherOpponent(pa),
      pitcher: pitcherName(pa),
      number: pitcherNumber(pa),
      plateAppearances: [],
      stats: emptyStats(),
    };

    addPlateAppearanceToStats(row.stats, pa);
    row.plateAppearances.push(pa);
    groups.set(key, row);
  });

  return [...groups.values()]
    .map((row) => ({ ...row, ...withRates(row.stats) }))
    .sort((a, b) => b.pa - a.pa || a.opponent.localeCompare(b.opponent, "ja") || a.pitcher.localeCompare(b.pitcher, "ja"));
}

function selectedPitcherRow(rows) {
  if (!rows.length) {
    selectedPitcherKey = "";
    return null;
  }

  const selected = rows.find((row) => row.key === selectedPitcherKey);
  if (selected) return selected;

  selectedPitcherKey = rows[0].key;
  return rows[0];
}

function metric(label, value, sub = "") {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      ${sub ? `<p class="muted">${sub}</p>` : ""}
    </div>
  `;
}

function renderMetrics(target, stats) {
  const withRateValues = withRates(stats);
  target.innerHTML = [
    metric("打率", formatRate(withRateValues.avg), `${stats.ab}打数 / ${stats.h}安打`),
    metric("本塁打", formatNumber(stats.hr), "通算"),
    metric("打点", formatNumber(stats.rbi), "通算"),
    metric("得点", formatNumber(stats.runs), "通算"),
    metric("四球", formatNumber(stats.bb), "通算"),
    metric("死球", formatNumber(stats.hbp), "通算"),
    metric("盗塁数", formatNumber(stats.steals), `${stats.stealAttempts}企図`),
    metric("盗塁成功率", formatPercent(withRateValues.stealRate), `${stats.steals}成功 / ${stats.stealAttempts}企図`),
    metric("出塁率", formatRate(withRateValues.obp), `${stats.bb}四球・${stats.hbp}死球`),
    metric("長打率", formatRate(withRateValues.slg), `${stats.tb}塁打`),
    metric("OPS", formatRate(withRateValues.ops), "出塁率 + 長打率"),
    metric("得点圏打率", formatRate(withRateValues.rispAvg), `${stats.rispH}安打 / ${stats.rispAb}打数`),
    metric("単打", formatNumber(stats.singles), "通算"),
    metric("二塁打", formatNumber(stats.doubles), "通算"),
    metric("三塁打", formatNumber(stats.triples), "通算"),
    metric("失策出塁", formatNumber(stats.errorsReached), "通算"),
    metric("犠打", formatNumber(stats.sh), "通算"),
    metric("犠飛", formatNumber(stats.sf), "通算"),
  ].join("");
}

function renderBattedDirectionChart(plateAppearances) {
  const stats = battedDirectionStats(plateAppearances);
  const markers = BATTED_DIRECTION_MARKERS.map((marker) => {
    const count = stats.counts[marker.key] || 0;
    const percent = directionPercent(count, stats.total);
    return `
      <span
        class="direction-marker is-${marker.type}"
        style="--x: ${marker.x}%; --y: ${marker.y}%"
        title="${escapeHtml(`${marker.key}：${percent}`)}"
      >
        <span>${escapeHtml(marker.label)}</span>
        <strong>${percent}</strong>
      </span>
    `;
  }).join("");
  const otherPercent = directionPercent(stats.other, stats.total);
  const ariaLabel = BATTED_DIRECTION_MARKERS
    .map((marker) => `${marker.key} ${directionPercent(stats.counts[marker.key] || 0, stats.total)}`)
    .concat([`その他 ${otherPercent}`])
    .join("、");

  els.battedDirectionSummary.textContent = `${stats.total}打球`;
  els.battedDirectionChart.innerHTML = `
    <div class="batted-field" role="img" aria-label="${escapeHtml(`打球方向比率。${ariaLabel}`)}">
      <svg class="batted-field-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path class="field-grass" d="M50 96 C41 96 34 89 25 80 L6 61 L6 43 C9 20 27 5 50 5 C73 5 91 20 94 43 L94 61 L75 80 C66 89 59 96 50 96Z" />
        <path class="field-dirt" d="M50 40 C66 40 77 51 77 66 C77 78 66 86 50 86 C34 86 23 78 23 66 C23 51 34 40 50 40Z" />
        <path class="foul-line" d="M50 84 L6 43" />
        <path class="foul-line" d="M50 84 L94 43" />
        <path class="base-line" d="M50 84 L34 66 L50 50 L66 66 Z" />
        <rect class="base home-base" x="47.8" y="82" width="4.4" height="4.4" transform="rotate(45 50 84.2)" />
        <rect class="base" x="31.8" y="63.8" width="4.4" height="4.4" transform="rotate(45 34 66)" />
        <rect class="base" x="47.8" y="47.8" width="4.4" height="4.4" transform="rotate(45 50 50)" />
        <rect class="base" x="63.8" y="63.8" width="4.4" height="4.4" transform="rotate(45 66 66)" />
      </svg>
      ${markers}
    </div>
    <div class="direction-extra">
      <span>その他 ${otherPercent}</span>
      <span>${stats.total ? `${stats.total}打球を集計` : "打球方向の入力がまだありません"}</span>
    </div>
  `;
}

function courseSupplementStats(plateAppearances) {
  const cells = Object.fromEntries(COURSE_GRID.map((course) => [
    course,
    { ab: 0, h: 0, hr: 0, k: 0 },
  ]));
  let totalAb = 0;
  let otherAb = 0;

  plateAppearances.forEach((pa) => {
    const def = resultDef(pa);
    if (!def.atBat) return;

    totalAb += 1;
    const cell = cells[pa.course];
    if (!cell) {
      otherAb += 1;
      return;
    }

    cell.ab += 1;
    if (def.hit) cell.h += 1;
    if (def.homer) cell.hr += 1;
    if (pa.result === "strikeout") cell.k += 1;
  });

  return { cells, totalAb, otherAb };
}

function courseCellTone(avg, ab) {
  if (!ab) return "is-empty";
  if (avg > 0.3) return "is-hot";
  if (avg >= 0.2) return "is-warm";
  return "is-cold";
}

function renderCourseSupplement(plateAppearances) {
  const stats = courseSupplementStats(plateAppearances);
  els.courseSupplementSummary.textContent = `${stats.totalAb}打数`;

  if (!stats.totalAb) {
    els.courseSupplementChart.innerHTML = `<div class="empty">コースを入力した打席が増えると、9分割のコース別成績が表示されます。</div>`;
    return;
  }

  const cells = COURSE_GRID.map((course) => {
    const row = stats.cells[course];
    const avg = row.ab ? row.h / row.ab : NaN;
    return `
      <div class="course-cell ${courseCellTone(avg, row.ab)}">
        <span class="course-name">${escapeHtml(course)}</span>
        <span class="course-count">${row.ab}-${row.h}</span>
        <strong>${formatRate(avg)}</strong>
        <span class="course-detail">HR ${row.hr} / K ${row.k}</span>
      </div>
    `;
  }).join("");

  els.courseSupplementChart.innerHTML = `
    <div class="course-grid" role="img" aria-label="コース別成績。表示は打数-安打、打率、本塁打、三振です。">
      ${cells}
    </div>
    <div class="course-supplement-footer">
      <p class="muted">表示は「打数-安打 / 打率 / HR・K」です。9分割以外のコースは ${stats.otherAb}打数あります。</p>
      <div class="course-legend" aria-label="色の意味">
        <span><i class="is-hot"></i>.300超</span>
        <span><i class="is-warm"></i>.200〜.300</span>
        <span><i class="is-cold"></i>.200未満</span>
      </div>
    </div>
  `;
}

function renderGameSelect() {
  if (!state.games.length) {
    els.gameSelect.innerHTML = `<option value="">先に試合を登録してください</option>`;
    els.gameSelect.disabled = true;
    return;
  }

  els.gameSelect.disabled = false;
  els.gameSelect.innerHTML = sortedGames()
    .map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(gameTitle(game))}</option>`)
    .join("");
}

function setMobileChoice(name, value) {
  if (!els.mobilePaForm) return;
  const field = els.mobilePaForm.elements[name];
  if (field) field.value = value || "";
  updateMobileChoiceButtons(name);
  if (name === "result") syncMobileBattedBallFields();
}

function updateMobileChoiceButtons(name) {
  if (!els.mobilePaForm) return;
  const field = els.mobilePaForm.elements[name];
  const value = field?.value || "";
  els.mobilePaForm
    .querySelectorAll(`[data-choice-name="${name}"]`)
    .forEach((button) => {
      const selected = button.dataset.choiceValue === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
}

function syncMobileChoiceButtons() {
  if (!els.mobilePaForm) return;
  [...new Set([...els.mobilePaForm.querySelectorAll("[data-choice-name]")].map((button) => button.dataset.choiceName))]
    .forEach(updateMobileChoiceButtons);
}

function renderMobileGameSummary() {
  if (!els.mobileGameSummary || !els.mobileGameSelect) return;
  const game = getGame(els.mobileGameSelect.value);
  if (!game) {
    els.mobileGameSummary.textContent = "試合を選ぶと、次の打席候補が入ります。";
    return;
  }

  const paCount = state.plateAppearances.filter((pa) => pa.gameId === game.id).length;
  els.mobileGameSummary.textContent = `${gameTitle(game)} / ${paCount}打席済み / 次は ${nextPlateAppearanceForGame(game.id)}`;
}

function renderMobileGameSelect() {
  if (!els.mobileGameSelect) return;

  if (!state.games.length) {
    els.mobileGameSelect.innerHTML = `<option value="">先に試合を登録してください</option>`;
    els.mobileGameSelect.disabled = true;
    if (els.mobilePaForm) els.mobilePaForm.querySelectorAll("button, input, select, textarea").forEach((field) => {
      if (field !== els.mobileGameSelect) field.disabled = true;
    });
    renderMobileGameSummary();
    return;
  }

  const games = sortedGames();
  const current = els.mobileGameSelect.value || selectedEntryGameId || games[0].id;
  const selectedId = games.some((game) => game.id === current) ? current : games[0].id;
  els.mobileGameSelect.disabled = false;
  if (els.mobilePaForm) els.mobilePaForm.querySelectorAll("button, input, select, textarea").forEach((field) => {
    field.disabled = false;
  });
  els.mobileGameSelect.innerHTML = games
    .map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(gameTitle(game))}</option>`)
    .join("");
  els.mobileGameSelect.value = selectedId;

  if (els.mobilePaForm && !els.mobilePaForm.elements.plateAppearance.value) {
    setMobileChoice("plateAppearance", nextPlateAppearanceForGame(selectedId));
  }
  if (els.mobilePaForm && !els.mobilePaForm.elements.runScored.value) {
    setMobileChoice("runScored", "0");
  }
  renderMobileGameSummary();
  syncMobileChoiceButtons();
  syncMobileBattedBallFields();
}

function renderMobilePitcherPresets() {
  if (!els.mobilePitcherPresets) return;
  const rows = groupPitcherStats(state.plateAppearances).slice(0, 6);

  if (!rows.length) {
    els.mobilePitcherPresets.innerHTML = `<div class="mobile-empty-note">投手データなし</div>`;
    return;
  }

  els.mobilePitcherPresets.innerHTML = rows.map((row) => `
    <button class="mobile-pitcher-button" data-mobile-pitcher-key="${escapeHtml(row.key)}" type="button">
      <strong>${escapeHtml(row.pitcher)}</strong>
      <span>${escapeHtml(row.opponent)} / #${escapeHtml(row.number)}</span>
    </button>
  `).join("");
}

function renderRecentGames() {
  const games = sortedGames().slice(0, 5);

  if (!games.length) {
    selectedMemoGameId = "";
    els.recentGames.innerHTML = `<div class="empty">まずは試合を1件登録しましょう。</div>`;
    return;
  }

  const memoGame = selectedMemoGame();

  els.recentGames.innerHTML = games.map((game) => {
    const pas = state.plateAppearances.filter((pa) => pa.gameId === game.id);
    const stats = withRates(calculateStats(pas));
    const result = gameResultLabel(game);
    const selectedClass = game.id === memoGame?.id ? " is-selected" : "";

    return `
      <button class="list-item game-memo-button${selectedClass}" data-memo-game="${escapeHtml(game.id)}" type="button" aria-pressed="${game.id === memoGame?.id}">
        <h4>${escapeHtml(gameTitle(game))} ${escapeHtml(result)}</h4>
        <div class="meta-row">
          <span>${escapeHtml(game.gameType || "種別未選択")}</span>
          <span>${escapeHtml(game.opponentClass || "相手クラス未選択")}</span>
          <span>${escapeHtml(game.ballpark || "球場未入力")}</span>
          <span>${pas.length}打席</span>
          <span>打率 ${formatRate(stats.avg)}</span>
        </div>
      </button>
    `;
  }).join("");
}

function renderRecentPlateAppearances() {
  const game = selectedMemoGame();

  if (!game) {
    els.recentPlateAppearances.innerHTML = `<div class="empty">試合を登録すると、守備・走塁・試合メモがここに表示されます。</div>`;
    return;
  }

  const memoRows = [
    ["守備の振り返り", game.defenseMemo],
    ["走塁の振り返り", game.baserunningMemo],
    ["試合メモ", game.gameMemo],
  ];

  els.recentPlateAppearances.innerHTML = `
    <article class="list-item selected-game-memos">
      <h4>${escapeHtml(gameTitle(game))} ${escapeHtml(gameResultLabel(game))}</h4>
      <div class="memo-stack">
        ${memoRows.map(([label, memo]) => `
          <section class="memo-note">
            <strong>${escapeHtml(label)}</strong>
            <p>${memo ? escapeHtml(memo).replace(/\n/g, "<br>") : "未入力"}</p>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function renderGameList() {
  els.gameCount.textContent = `${state.games.length}試合`;

  if (!state.games.length) {
    selectedEntryGameId = "";
    els.gameList.innerHTML = `<div class="empty">登録済みの試合はまだありません。</div>`;
    return;
  }

  const entryGame = selectedEntryGame();

  els.gameList.innerHTML = sortedGames().map((game) => {
    const pas = state.plateAppearances.filter((pa) => pa.gameId === game.id);
    const stats = withRates(calculateStats(pas));
    const result = gameResultLabel(game);
    const selectedClass = game.id === entryGame?.id ? " is-selected" : "";

    return `
      <article class="list-item entry-game-item${selectedClass}">
        <button class="game-select-button" data-entry-game="${escapeHtml(game.id)}" type="button" aria-pressed="${game.id === entryGame?.id}">
          <h4>${escapeHtml(gameTitle(game))} ${escapeHtml(result)}</h4>
          <div class="meta-row">
            <span>${escapeHtml(game.gameType || "種別未選択")}</span>
            <span>${escapeHtml(game.opponentClass || "相手クラス未選択")}</span>
            <span>${escapeHtml(game.ballpark || "球場未入力")}</span>
            <span>${escapeHtml(game.battingOrder ? `${game.battingOrder}番` : "打順未選択")}</span>
            <span>${escapeHtml(game.position || "守備未選択")}</span>
            <span>${pas.length}打席</span>
            <span>打率 ${formatRate(stats.avg)}</span>
          </div>
        </button>
        <div class="item-actions">
          <span class="muted">関連する打席も一緒に管理されます。</span>
          <div class="action-buttons">
            <button class="ghost-button compact-button" data-edit-game="${escapeHtml(game.id)}" type="button">編集</button>
            <button class="danger-button" data-delete-game="${escapeHtml(game.id)}" type="button">削除</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderPlateAppearanceList() {
  const game = selectedEntryGame();

  if (!game) {
    els.paCount.textContent = "0打席";
    els.paList.innerHTML = `<div class="empty">先に試合を登録してください。</div>`;
    return;
  }

  const selectedPas = sortedPlateAppearances().filter((pa) => pa.gameId === game.id);
  els.paCount.textContent = `${selectedPas.length}打席`;

  if (!selectedPas.length) {
    els.paList.innerHTML = `<div class="empty">${escapeHtml(gameTitle(game))} の打席はまだ登録されていません。</div>`;
    return;
  }

  els.paList.innerHTML = selectedPas.map((pa) => {
    const titleParts = [
      pa.plateAppearance || pa.inning || "打席未選択",
      labelForResult(pa.result),
      pa.pitcherName || "投手未入力",
    ];

    return `
      <article class="list-item">
        <h4>${escapeHtml(titleParts.join(" / "))}</h4>
        <div class="meta-row">
          <span>${escapeHtml(gameTitle(game))}</span>
          <span>${escapeHtml(pa.pitcherNumber ? `背番号 ${pa.pitcherNumber}` : "背番号未入力")}</span>
          <span>${escapeHtml(pa.pitchingForm || "フォーム未選択")}</span>
          <span>${escapeHtml(pa.runners || "ランナーなし")}</span>
          <span>${escapeHtml(pa.straightVelocity || "球速未選択")}</span>
          <span>${escapeHtml(formatBreakingBalls(pa))}</span>
          <span>${escapeHtml(pa.pitchType || "球種未選択")}</span>
          <span>${escapeHtml(normalizeCountLabel(pa.count) || "カウント未選択")}</span>
          <span>${Number(pa.rbi) || 0}打点</span>
          <span>${escapeHtml(pa.stolenBase || "なし")}</span>
          <span>${Number(pa.runScored) || 0}得点</span>
        </div>
        ${pa.memo ? `<p>${escapeHtml(pa.memo)}</p>` : ""}
        <div class="item-actions">
          <span class="muted">編集すると成績分析にも反映されます。</span>
          <div class="action-buttons">
            <button class="ghost-button compact-button" data-edit-pa="${escapeHtml(pa.id)}" type="button">編集</button>
            <button class="danger-button" data-delete-pa="${escapeHtml(pa.id)}" type="button">削除</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderStatsTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">まだ集計できる打席がありません。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${formatRate(row.avg)}</td>
      <td>${formatRate(row.ops)}</td>
      <td>${row.ab}</td>
      <td>${row.h}</td>
      <td>${row.hr}</td>
      <td>${row.rbi}</td>
    </tr>
  `).join("");
}

function renderPitcherStatsTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9">まだ集計できる打席がありません。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.opponent)}</td>
      <td>${escapeHtml(row.pitcher)}</td>
      <td>${escapeHtml(row.number)}</td>
      <td>${formatRate(row.avg)}</td>
      <td>${formatRate(row.ops)}</td>
      <td>${row.ab}</td>
      <td>${row.h}</td>
      <td>${row.hr}</td>
      <td>${row.rbi}</td>
    </tr>
  `).join("");
}

function renderAnalysis() {
  const stats = calculateStats(state.plateAppearances);
  renderMetrics(els.analysisMetrics, stats);
  renderBattedDirectionChart(state.plateAppearances);
  renderPitcherStatsTable(
    els.pitcherStatsBody,
    groupPitcherStats(state.plateAppearances),
  );
  renderStatsTable(
    els.pitchTypeStatsBody,
    sortPitchTypeRows(groupStats(state.plateAppearances, (pa) => pa.pitchType, "球種未選択")),
  );
  renderStatsTable(
    els.courseStatsBody,
    sortByAvgRows(groupStats(state.plateAppearances, (pa) => pa.course, "コース未選択")),
  );
  renderCourseSupplement(state.plateAppearances);
  renderStatsTable(
    els.countStatsBody,
    sortByAvgRows(groupStats(state.plateAppearances, (pa) => normalizeCountLabel(pa.count), "カウント未選択")),
  );
}

function renderPitcherCards() {
  const rows = groupPitcherStats(state.plateAppearances);

  if (!rows.length) {
    selectedPitcherKey = "";
    els.pitcherCards.innerHTML = `<div class="empty">打席入力で相手投手を登録すると、ここに対戦履歴が出ます。</div>`;
    return;
  }

  const selectedRow = selectedPitcherRow(rows);
  const pitcherButtons = rows.map((row) => {
    const pitcherPas = row.plateAppearances;
    const hand = uniquePitcherValues(pitcherPas, (pa) => [pa.pitcherHand]);
    const form = uniquePitcherValues(pitcherPas, (pa) => [pa.pitchingForm]);
    const velocity = uniquePitcherValues(pitcherPas, (pa) => [pa.straightVelocity]);
    const breakingBalls = uniquePitcherValues(pitcherPas, pitcherBreakingBallsForPa, "未入力", 4);
    const selectedClass = row.key === selectedRow?.key ? " is-selected" : "";
    return `
      <button class="pitcher-summary-button${selectedClass}" data-pitcher-key="${escapeHtml(row.key)}" type="button" aria-pressed="${row.key === selectedRow?.key}">
        <div class="pitcher-summary-main">
          <h3>${escapeHtml(row.pitcher)}</h3>
          <span>${escapeHtml(row.opponent)} / 背番号 ${escapeHtml(row.number)}</span>
        </div>
        <div class="pitcher-summary-meta">
          <span>左右 ${escapeHtml(hand)}</span>
          <span>フォーム ${escapeHtml(form)}</span>
          <span>球速 ${escapeHtml(velocity)}</span>
          <span>変化球 ${escapeHtml(breakingBalls)}</span>
        </div>
      </button>
    `;
  }).join("");

  const pitcherPas = sortedPlateAppearances().filter((pa) => pitcherProfileKey(pa) === selectedRow.key);
  const pitcherRates = withRates(selectedRow.stats);
  const pitcherStats = [
    ["打率", formatRate(pitcherRates.avg)],
    ["本塁打", formatNumber(selectedRow.hr)],
    ["打点", formatNumber(selectedRow.rbi)],
    ["出塁率", formatRate(pitcherRates.obp)],
    ["長打率", formatRate(pitcherRates.slg)],
    ["OPS", formatRate(pitcherRates.ops)],
  ].map(([label, value]) => `
    <span class="pitcher-stat-pill">
      <small>${label}</small>
      <strong>${value}</strong>
    </span>
  `).join("");
  const strategy = pitcherStrategyText(selectedRow.key);
  const history = pitcherPas.map((pa) => {
    const game = getGame(pa.gameId);
    const resultLabel = labelForResult(pa.result);
    const battedDirection = normalizeBattedDirection(pa.battedDirection) || "打球方向未入力";
    const titleParts = [
      gameTitle(game),
      pa.plateAppearance || pa.inning || "打席未選択",
      resultLabel,
    ];
    if (!["strikeout", "walk"].includes(pa.result)) {
      titleParts.push(battedDirection);
    }

    return `
      <article class="list-item">
        <h4>${titleParts.map(escapeHtml).join(" / ")}</h4>
        <div class="meta-row">
          <span>${escapeHtml(pa.pitchType || "球種未選択")}</span>
          <span>${escapeHtml(pa.course || "コース未選択")}</span>
          <span>${escapeHtml(normalizeCountLabel(pa.count) || "カウント未選択")}</span>
          <span>${Number(pa.rbi) || 0}打点</span>
          <span>${escapeHtml(pa.runners || "ランナーなし")}</span>
        </div>
        ${pa.memo ? `<p>${escapeHtml(pa.memo)}</p>` : ""}
      </article>
    `;
  }).join("");

  els.pitcherCards.innerHTML = `
    <section class="pitcher-button-list" aria-label="相手投手一覧">
      ${pitcherButtons}
    </section>
    <section class="surface pitcher-history">
      <div class="surface-header">
        <h3>${escapeHtml(selectedRow.pitcher)}の過去打席</h3>
        <span class="pill">${selectedRow.pa}打席</span>
      </div>
      <div class="pitcher-history-stats" aria-label="${escapeHtml(selectedRow.pitcher)}との過去成績">
        ${pitcherStats}
      </div>
      <section class="pitcher-strategy-note">
        <strong>攻略法</strong>
        <p>${strategy ? escapeHtml(strategy).replace(/\n/g, "<br>") : "未入力"}</p>
      </section>
      <div class="list-stack">
        ${history || `<div class="empty">この投手との打席はまだありません。</div>`}
      </div>
    </section>
  `;
}

function renderHome() {
  renderRecentGames();
  renderRecentPlateAppearances();
}

function renderSaveStatus() {
  const classMap = {
    success: "is-success",
    error: "is-error",
    warning: "is-warning",
  };
  els.saveStatusIndicator.classList.remove("is-success", "is-error", "is-warning");
  if (classMap[saveNotice.type]) {
    els.saveStatusIndicator.classList.add(classMap[saveNotice.type]);
  }

  els.saveStatusBadge.textContent = saveNotice.badge;
  els.saveStatusTitle.textContent = saveNotice.title;
  els.saveStatusDetail.textContent = saveNotice.detail;

  const backup = latestBackup();
  if (backup) {
    els.backupStatusText.textContent = `最新バックアップ：${formatDateTime(backup.createdAt)}（${backup.reason || "自動保存"}）`;
    els.backupExportButton.disabled = false;
    els.restoreBackupButton.disabled = false;
  } else {
    els.backupStatusText.textContent = "自動バックアップは保存時に作成されます。";
    els.backupExportButton.disabled = true;
    els.restoreBackupButton.disabled = true;
  }
}

function renderSyncStatus() {
  if (!els.syncStatusCard) return;

  const classMap = {
    success: "is-success",
    error: "is-error",
    warning: "is-warning",
  };
  const configured = hasSyncConfig();
  const libraryReady = supabaseLibraryReady();
  let notice = syncNotice;

  if (!configured) {
    notice = {
      type: "info",
      badge: "未設定",
      title: "クラウド同期はまだ設定されていません",
      detail: "メールアドレスと、Supabaseボタン内のURL・公開キーを入力してください。",
    };
  } else if (!libraryReady) {
    notice = {
      type: "warning",
      badge: "確認中",
      title: "Supabaseライブラリを読み込めていません",
      detail: "インターネット接続を確認して、この画面を開き直してください。",
    };
  }

  els.syncStatusCard.classList.remove("is-success", "is-error", "is-warning");
  if (classMap[notice.type]) {
    els.syncStatusCard.classList.add(classMap[notice.type]);
  }
  els.syncStatusBadge.textContent = syncInProgress ? "同期中" : notice.badge;
  els.syncStatusTitle.textContent = notice.title;
  els.syncStatusDetail.textContent = notice.detail;
  els.syncLastSync.textContent = syncMeta.lastSyncedAt
    ? `最終同期：${formatDateTime(syncMeta.lastSyncedAt)}`
    : "最終同期：なし";

  if (els.syncSupabaseUrl && document.activeElement !== els.syncSupabaseUrl) {
    els.syncSupabaseUrl.value = syncConfig.supabaseUrl;
  }
  if (els.syncAnonKey && document.activeElement !== els.syncAnonKey) {
    els.syncAnonKey.value = syncConfig.anonKey;
  }
  if (els.syncEmail && document.activeElement !== els.syncEmail) {
    els.syncEmail.value = syncConfig.email;
  }

  const canUseCloud = configured && libraryReady && !syncInProgress;
  els.syncNowButton.disabled = !canUseCloud;
  els.syncPullButton.disabled = !canUseCloud;
  els.syncPushButton.disabled = !canUseCloud;
  els.syncSignInButton.disabled = !canUseCloud;
  els.syncSignUpButton.disabled = !canUseCloud;
  els.syncSignOutButton.disabled = !canUseCloud;
}

function renderEditState() {
  const editingGame = Boolean(editingGameId);
  els.gameSubmitButton.textContent = editingGame ? "試合を更新" : "試合を保存";
  els.cancelGameEditButton.classList.toggle("is-hidden", !editingGame);

  const editingPa = Boolean(editingPaId);
  els.paSubmitButton.textContent = editingPa ? "打席を更新" : "打席を保存";
  els.cancelPaEditButton.classList.toggle("is-hidden", !editingPa);
}

function resetGameForm() {
  els.gameForm.reset();
  $("#gameDate").value = todayValue();
}

function resetPlateAppearanceForm() {
  const selectedGame = els.gameSelect.value;
  els.paForm.reset();
  els.gameSelect.value = selectedGame;
  els.paForm.elements.rbi.value = 0;
  els.paForm.elements.sign.value = "なし";
  els.paForm.elements.runners.value = "ランナーなし";
  els.paForm.elements.stolenBase.value = "なし";
  els.paForm.elements.runScored.value = "0";
  syncBattedBallFields();
}

function fillMobilePitcherFromPa(pa) {
  if (!els.mobilePaForm || !pa) return;
  const breakingBalls = breakingBallsForPa(pa);
  setFieldValue(els.mobilePaForm, "pitcherName", pa.pitcherName || "");
  setFieldValue(els.mobilePaForm, "pitcherNumber", pa.pitcherNumber || "");
  setFieldValue(els.mobilePaForm, "pitcherHand", pa.pitcherHand || "");
  setFieldValue(els.mobilePaForm, "pitchingForm", pa.pitchingForm || "");
  setFieldValue(els.mobilePaForm, "straightVelocity", pa.straightVelocity || "");
  setFieldValue(els.mobilePaForm, "breakingBall1", breakingBalls[0] || "");
  setFieldValue(els.mobilePaForm, "breakingBall2", breakingBalls[1] || "");
  setFieldValue(els.mobilePaForm, "breakingBall3", breakingBalls[2] || "");
  syncPitcherStrategyField(els.mobilePaForm);
}

function resetMobilePlateAppearanceForm(options = {}) {
  if (!els.mobilePaForm) return;
  const selectedGame = options.gameId || els.mobileGameSelect?.value || sortedGames()[0]?.id || "";
  const keepPitcher = options.keepPitcher;
  const previousPa = options.previousPa;
  const pitcherValues = keepPitcher
    ? {
        pitcherName: els.mobilePaForm.elements.pitcherName.value,
        pitcherNumber: els.mobilePaForm.elements.pitcherNumber.value,
        pitcherHand: els.mobilePaForm.elements.pitcherHand.value,
        pitchingForm: els.mobilePaForm.elements.pitchingForm.value,
        straightVelocity: els.mobilePaForm.elements.straightVelocity.value,
        breakingBall1: els.mobilePaForm.elements.breakingBall1.value,
        breakingBall2: els.mobilePaForm.elements.breakingBall2.value,
        breakingBall3: els.mobilePaForm.elements.breakingBall3.value,
        pitcherStrategy: els.mobilePaForm.elements.pitcherStrategy.value,
      }
    : null;

  els.mobilePaForm.reset();
  if (selectedGame) setFieldValue(els.mobilePaForm, "gameId", selectedGame);
  setFieldValue(els.mobilePaForm, "rbi", 0);
  setFieldValue(els.mobilePaForm, "stolenBase", "なし");
  setFieldValue(els.mobilePaForm, "runners", "ランナーなし");
  setFieldValue(els.mobilePaForm, "sign", "なし");
  setMobileChoice("plateAppearance", nextPlateAppearanceForGame(selectedGame));
  setMobileChoice("runScored", "0");
  setMobileChoice("result", "");
  setMobileChoice("course", "");
  setMobileChoice("battedDirection", "");
  setMobileChoice("battedType", "");

  if (previousPa) {
    fillMobilePitcherFromPa(previousPa);
  } else if (pitcherValues) {
    Object.entries(pitcherValues).forEach(([name, value]) => setFieldValue(els.mobilePaForm, name, value));
  }

  renderMobileGameSummary();
  syncMobileChoiceButtons();
  syncMobileBattedBallFields();
}

function cancelGameEdit() {
  editingGameId = "";
  resetGameForm();
  renderEditState();
}

function cancelPlateAppearanceEdit() {
  editingPaId = "";
  resetPlateAppearanceForm();
  renderEditState();
}

function fillGameForm(game) {
  setFieldValue(els.gameForm, "date", game.date || todayValue());
  setFieldValue(els.gameForm, "gameType", game.gameType || "");
  setFieldValue(els.gameForm, "opponent", game.opponent || "");
  setFieldValue(els.gameForm, "opponentClass", game.opponentClass || "");
  setFieldValue(els.gameForm, "ballpark", game.ballpark || "");
  setFieldValue(els.gameForm, "ownScore", game.ownScore);
  setFieldValue(els.gameForm, "opponentScore", game.opponentScore);
  setFieldValue(els.gameForm, "battingOrder", game.battingOrder || "");
  setFieldValue(els.gameForm, "position", game.position || "");
  setFieldValue(els.gameForm, "defenseMemo", game.defenseMemo || "");
  setFieldValue(els.gameForm, "baserunningMemo", game.baserunningMemo || "");
  setFieldValue(els.gameForm, "gameMemo", game.gameMemo || "");
}

function fillPlateAppearanceForm(pa) {
  const breakingBalls = breakingBallsForPa(pa);
  setFieldValue(els.paForm, "gameId", pa.gameId || "");
  setFieldValue(els.paForm, "plateAppearance", pa.plateAppearance || "");
  setFieldValue(els.paForm, "rbi", Number(pa.rbi) || 0);
  setFieldValue(els.paForm, "pitcherName", pa.pitcherName || "");
  setFieldValue(els.paForm, "pitcherNumber", pa.pitcherNumber || "");
  setFieldValue(els.paForm, "pitcherHand", pa.pitcherHand || "");
  setFieldValue(els.paForm, "pitchingForm", pa.pitchingForm || "");
  setFieldValue(els.paForm, "result", pa.result || "");
  setFieldValue(els.paForm, "risp", pa.risp);
  setFieldValue(els.paForm, "runners", pa.runners || "ランナーなし");
  setFieldValue(els.paForm, "straightVelocity", pa.straightVelocity || "");
  setFieldValue(els.paForm, "breakingBall1", breakingBalls[0] || "");
  setFieldValue(els.paForm, "breakingBall2", breakingBalls[1] || "");
  setFieldValue(els.paForm, "breakingBall3", breakingBalls[2] || "");
  setFieldValue(els.paForm, "pitchType", pa.pitchType || "");
  setFieldValue(els.paForm, "course", pa.course || "");
  setFieldValue(els.paForm, "count", normalizeCountLabel(pa.count));
  setFieldValue(els.paForm, "sign", pa.sign || "なし");
  setFieldValue(els.paForm, "battedDirection", normalizeBattedDirection(pa.battedDirection));
  setFieldValue(els.paForm, "battedType", pa.battedType || "");
  setFieldValue(els.paForm, "stolenBase", pa.stolenBase || "なし");
  setFieldValue(els.paForm, "runScored", pa.runScored ?? 0);
  setFieldValue(els.paForm, "memo", pa.memo || "");
  setFieldValue(els.paForm, "pitcherStrategy", pitcherStrategyText(pitcherProfileKey(pa)));
  syncBattedBallFields();
}

function startGameEdit(gameId) {
  const game = getGame(gameId);
  if (!game) {
    showToast("編集する試合が見つかりません");
    return;
  }

  editingGameId = gameId;
  fillGameForm(game);
  switchTab("entry");
  renderEditState();
  els.gameForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startPlateAppearanceEdit(paId) {
  const pa = getPlateAppearance(paId);
  if (!pa) {
    showToast("編集する打席が見つかりません");
    return;
  }

  editingPaId = paId;
  fillPlateAppearanceForm(pa);
  switchTab("entry");
  renderEditState();
  els.paForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  renderGameSelect();
  renderMobileGameSelect();
  renderMobilePitcherPresets();
  renderHome();
  renderGameList();
  renderPlateAppearanceList();
  renderAnalysis();
  renderPitcherCards();
  renderSaveStatus();
  renderSyncStatus();
  renderEditState();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function showValidationFailure(title) {
  saveNotice = {
    type: "warning",
    badge: "未入力",
    title,
    detail: "必須項目が未入力です。赤枠になっている項目を入力してから、もう一度保存してください。",
  };
  renderSaveStatus();
  showToast("必須項目を入力してください");
}

function syncBattedBallFields() {
  const shouldSkipBattedBall = skipsBattedBall(els.paForm.elements.result.value);
  const direction = els.paForm.elements.battedDirection;
  const type = els.paForm.elements.battedType;

  if (shouldSkipBattedBall) {
    direction.value = "";
    type.value = "";
  }

  direction.disabled = shouldSkipBattedBall;
  type.disabled = shouldSkipBattedBall;
}

function syncMobileBattedBallFields() {
  if (!els.mobilePaForm || !els.mobileBattedFields) return;
  const result = els.mobilePaForm.elements.result.value;
  const skipBattedBall = skipsBattedBall(result);

  if (skipBattedBall) {
    setFieldValue(els.mobilePaForm, "battedDirection", "");
    setFieldValue(els.mobilePaForm, "battedType", "");
    updateMobileChoiceButtons("battedDirection");
    updateMobileChoiceButtons("battedType");
  }

  els.mobileBattedFields.classList.toggle("is-disabled", skipBattedBall);
  els.mobileBattedFields.querySelectorAll("button").forEach((button) => {
    button.disabled = skipBattedBall;
  });
}

function validTabName(name) {
  return els.tabs.some((tab) => tab.dataset.tab === name) ? name : "";
}

function tabNameFromHash() {
  return validTabName(window.location.hash.replace(/^#/, ""));
}

function savedTabName() {
  try {
    return validTabName(localStorage.getItem(ACTIVE_TAB_KEY) || "");
  } catch {
    return "";
  }
}

function initialTabName() {
  return tabNameFromHash() || savedTabName() || "home";
}

function switchTab(name, options = {}) {
  const tabName = validTabName(name) || "home";
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
  els.panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === `${tabName}Panel`));

  if (options.persist === false) return;
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tabName);
  } catch {
    // 表示切り替え自体は続けます。
  }
  if (window.location.hash !== `#${tabName}`) {
    history.replaceState(null, "", `#${tabName}`);
  }
}

function gameFromForm(form, existingGame = null) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  return {
    id: existingGame?.id || createId("game"),
    date: data.get("date") || todayValue(),
    gameType: data.get("gameType") || "",
    opponent: String(data.get("opponent") || "").trim(),
    opponentClass: data.get("opponentClass") || "",
    ballpark: data.get("ballpark") || "",
    ownScore: data.get("ownScore") === "" ? "" : Number(data.get("ownScore")),
    opponentScore: data.get("opponentScore") === "" ? "" : Number(data.get("opponentScore")),
    battingOrder: data.get("battingOrder") || "",
    position: data.get("position") || "",
    defenseMemo: String(data.get("defenseMemo") || "").trim(),
    baserunningMemo: String(data.get("baserunningMemo") || "").trim(),
    gameMemo: String(data.get("gameMemo") || "").trim(),
    createdAt: existingGame?.createdAt || now,
    updatedAt: existingGame ? now : existingGame?.updatedAt || "",
  };
}

function plateAppearanceFromForm(form, existingPa = null) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  const breakingBalls = ["breakingBall1", "breakingBall2", "breakingBall3"]
    .map((name) => data.get(name) || "")
    .filter(Boolean);

  return {
    id: existingPa?.id || createId("pa"),
    gameId: data.get("gameId"),
    plateAppearance: data.get("plateAppearance") || "",
    pitcherName: String(data.get("pitcherName") || "").trim(),
    pitcherNumber: String(data.get("pitcherNumber") || "").trim(),
    pitcherHand: data.get("pitcherHand") || "",
    pitchingForm: data.get("pitchingForm") || "",
    result: data.get("result"),
    rbi: Number(data.get("rbi")) || 0,
    risp: data.get("risp") === "on",
    runners: data.get("runners") || "ランナーなし",
    straightVelocity: data.get("straightVelocity") || "",
    breakingBalls,
    pitchType: data.get("pitchType") || "",
    course: data.get("course") || "",
    count: data.get("count") || "",
    sign: data.get("sign") || "なし",
    battedDirection: skipsBattedBall(data.get("result")) ? "" : normalizeBattedDirection(data.get("battedDirection")),
    battedType: skipsBattedBall(data.get("result")) ? "" : data.get("battedType") || "",
    stolenBase: data.get("stolenBase") || "なし",
    runScored: Number(data.get("runScored")) || 0,
    memo: String(data.get("memo") || "").trim(),
    createdAt: existingPa?.createdAt || now,
    updatedAt: existingPa ? now : existingPa?.updatedAt || "",
  };
}

function exportData() {
  downloadJson(state, `kusayakyu-log-${todayValue()}.json`);
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportLatestBackup() {
  const backup = latestBackup();
  if (!backup) {
    showToast("バックアップはまだありません");
    return;
  }

  downloadJson(backup.data, `kusayakyu-log-backup-${backup.createdAt.slice(0, 10)}.json`);
  showToast("最新バックアップを書き出しました");
}

function restoreLatestBackup() {
  const backup = latestBackup();
  if (!backup) {
    showToast("バックアップはまだありません");
    return;
  }

  const ok = window.confirm(`最新バックアップ（${formatDateTime(backup.createdAt)}）を復元しますか？現在の表示内容は上書きされます。`);
  if (!ok) return;

  commitState(normalizeState(backup.data), "最新バックアップを復元しました", "バックアップ復元");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed.games) || !Array.isArray(parsed.plateAppearances)) {
        throw new Error("Invalid data");
      }

      commitState(normalizeState(parsed), "データを読み込みました", "データ読み込み");
    } catch (error) {
      saveNotice = {
        type: "error",
        badge: "失敗",
        title: "読み込みに失敗しました",
        detail: error?.message === "Invalid data"
          ? "読み込んだファイルの形式が、このアプリのデータ形式と違います。"
          : "JSONファイルを読み込めませんでした。",
      };
      renderSaveStatus();
      showToast("読み込みに失敗しました");
    } finally {
      els.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function syncFormConfig() {
  return {
    supabaseUrl: els.syncSupabaseUrl.value,
    anonKey: els.syncAnonKey.value,
    email: els.syncEmail.value,
  };
}

function saveSyncSettingsFromForm() {
  try {
    saveSyncConfig(syncFormConfig());
    updateSyncNotice(
      hasSyncConfig() ? "success" : "warning",
      hasSyncConfig() ? "設定済み" : "未入力",
      hasSyncConfig() ? "同期設定を保存しました" : "同期設定がまだ足りません",
      hasSyncConfig()
        ? "ログインすると、この端末とクラウドの同期を始められます。"
        : "SupabaseのURL、キー、メールアドレスを入力してください。",
    );
    showToast("同期設定を保存しました");
  } catch (error) {
    updateSyncNotice("error", "失敗", "同期設定を保存できませんでした", storageErrorMessage(error));
  }
}

async function runSyncButtonAction(action, workingTitle = "クラウド処理中です") {
  if (syncInProgress) return;
  syncInProgress = true;
  updateSyncNotice("info", "処理中", workingTitle, "少し待ってください。");

  try {
    await action();
  } catch (error) {
    updateSyncNotice("error", "失敗", "クラウド処理に失敗しました", syncErrorMessage(error));
  } finally {
    syncInProgress = false;
    renderSyncStatus();
  }
}

async function handleSyncSignUp() {
  saveSyncSettingsFromForm();
  const password = els.syncPassword.value;
  if (!hasSyncConfig() || !password) {
    updateSyncNotice("warning", "未入力", "新規登録できません", "URL、キー、メールアドレス、パスワードを入力してください。");
    return;
  }

  await runSyncButtonAction(async () => {
    const client = syncSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email: syncConfig.email,
      password,
    });
    if (error) throw error;
    els.syncPassword.value = "";

    if (data?.session) {
      updateSyncNotice("success", "登録済み", "新規登録してログインしました", "初回同期を始めます。");
      syncInProgress = false;
      await runCloudSync("signup");
      return;
    }

    updateSyncNotice("warning", "確認待ち", "確認メールを送信しました", "メール内のリンクを開いたあと、この画面でログインしてください。");
  }, "Supabaseへ新規登録中です");
}

async function handleSyncSignIn() {
  saveSyncSettingsFromForm();
  const password = els.syncPassword.value;
  if (!hasSyncConfig() || !password) {
    updateSyncNotice("warning", "未入力", "ログインできません", "URL、キー、メールアドレス、パスワードを入力してください。");
    return;
  }

  await runSyncButtonAction(async () => {
    const client = syncSupabaseClient();
    const { error } = await client.auth.signInWithPassword({
      email: syncConfig.email,
      password,
    });
    if (error) throw error;
    els.syncPassword.value = "";
    updateSyncNotice("success", "ログイン済み", "Supabaseにログインしました", "同期を始めます。");
    syncInProgress = false;
    await runCloudSync("signin");
  }, "Supabaseへログイン中です");
}

async function handleSyncSignOut() {
  await runSyncButtonAction(async () => {
    const client = syncSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    updateSyncNotice("info", "ログアウト", "Supabaseからログアウトしました", "ローカル保存はこれまで通り使えます。");
  }, "ログアウト中です");
}

async function initializeCloudSync() {
  renderSyncStatus();
  if (!hasSyncConfig()) return;
  if (!supabaseLibraryReady()) {
    renderSyncStatus();
    return;
  }

  try {
    const user = await currentSyncUser();
    if (!user) {
      updateSyncNotice("warning", "ログイン待ち", "Supabaseにログインしてください", "ログインすると自動同期を開始します。");
      return;
    }
    await runCloudSync("startup");
  } catch (error) {
    updateSyncNotice("error", "失敗", "同期状態を確認できませんでした", syncErrorMessage(error));
  }
}

function registerAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

  navigator.serviceWorker.register("./sw.js").catch(() => {
    // キャッシュ登録に失敗しても、記録アプリ本体はそのまま使えます。
  });
}

function bindPitcherStrategyLookup(form) {
  ["gameId", "pitcherName", "pitcherNumber"].forEach((name) => {
    const field = form?.elements?.[name];
    field?.addEventListener("change", () => syncPitcherStrategyField(form));
    if (name !== "gameId") {
      field?.addEventListener("input", () => syncPitcherStrategyField(form));
    }
  });
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

window.addEventListener("hashchange", () => {
  switchTab(initialTabName(), { persist: false });
});

$$("[data-jump-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.jumpTab));
});

els.recentGames.addEventListener("click", (event) => {
  const button = event.target.closest("[data-memo-game]");
  if (!button) return;

  selectedMemoGameId = button.dataset.memoGame;
  renderRecentGames();
  renderRecentPlateAppearances();
});

els.gameForm.addEventListener("invalid", () => {
  showValidationFailure("試合を保存できませんでした");
}, true);

els.paForm.addEventListener("invalid", () => {
  showValidationFailure("打席を保存できませんでした");
}, true);

els.mobilePaForm.addEventListener("invalid", () => {
  showValidationFailure("スマホ入力を保存できませんでした");
}, true);

els.paForm.elements.result.addEventListener("change", syncBattedBallFields);
bindPitcherStrategyLookup(els.paForm);
bindPitcherStrategyLookup(els.mobilePaForm);

els.mobileGameSelect.addEventListener("change", () => {
  setMobileChoice("plateAppearance", nextPlateAppearanceForGame(els.mobileGameSelect.value));
  renderMobileGameSummary();
  syncPitcherStrategyField(els.mobilePaForm);
});

els.mobilePaForm.addEventListener("click", (event) => {
  const choiceButton = event.target.closest("[data-choice-name]");
  if (choiceButton) {
    setMobileChoice(choiceButton.dataset.choiceName, choiceButton.dataset.choiceValue);
    return;
  }

  const pitcherButton = event.target.closest("[data-mobile-pitcher-key]");
  if (!pitcherButton) return;

  const row = groupPitcherStats(state.plateAppearances).find((item) => item.key === pitcherButton.dataset.mobilePitcherKey);
  if (!row) return;

  fillMobilePitcherFromPa(latestPaForPitcher(row));
  els.mobilePitcherPresets.querySelectorAll("[data-mobile-pitcher-key]").forEach((button) => {
    button.classList.toggle("is-selected", button === pitcherButton);
  });
});

els.mobileClearButton.addEventListener("click", () => {
  resetMobilePlateAppearanceForm({ gameId: els.mobileGameSelect.value });
});

els.gameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const existingGame = editingGameId ? getGame(editingGameId) : null;

  if (editingGameId && !existingGame) {
    showToast("更新する試合が見つかりません");
    cancelGameEdit();
    return;
  }

  const game = gameFromForm(event.currentTarget, existingGame);
  selectedMemoGameId = game.id;
  selectedEntryGameId = game.id;
  const nextState = existingGame
    ? {
        games: state.games.map((item) => item.id === editingGameId ? game : item),
        plateAppearances: [...state.plateAppearances],
      }
    : {
        games: [...state.games, game],
        plateAppearances: [...state.plateAppearances],
      };

  if (commitState(nextState, existingGame ? "試合を更新しました" : "試合を保存しました", existingGame ? "試合更新" : "試合保存")) {
    editingGameId = "";
    resetGameForm();
    renderEditState();
  }
});

els.paForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.games.length) {
    showToast("先に試合を登録してください");
    return;
  }

  const existingPa = editingPaId ? getPlateAppearance(editingPaId) : null;

  if (editingPaId && !existingPa) {
    showToast("更新する打席が見つかりません");
    cancelPlateAppearanceEdit();
    return;
  }

  const pa = plateAppearanceFromForm(event.currentTarget, existingPa);
  selectedEntryGameId = pa.gameId;
  const plateAppearanceState = existingPa
    ? {
        games: [...state.games],
        plateAppearances: state.plateAppearances.map((item) => item.id === editingPaId ? pa : item),
      }
    : {
        games: [...state.games],
        plateAppearances: [...state.plateAppearances, pa],
      };
  const nextState = withPitcherStrategy(
    plateAppearanceState,
    pa,
    event.currentTarget.elements.pitcherStrategy.value,
  );

  if (commitState(nextState, existingPa ? "打席を更新しました" : "打席を保存しました", existingPa ? "打席更新" : "打席保存")) {
    editingPaId = "";
    resetPlateAppearanceForm();
    renderEditState();
  }
});

els.mobilePaForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.games.length) {
    showToast("先に試合を登録してください");
    return;
  }

  const form = event.currentTarget;
  const missing = [];
  if (!form.elements.gameId.value) missing.push("対象試合");
  if (!form.elements.plateAppearance.value) missing.push("打席");
  if (!form.elements.result.value) missing.push("打席結果");
  if (!String(form.elements.pitcherName.value || "").trim()) missing.push("相手投手");

  if (missing.length) {
    showValidationFailure("スマホ入力を保存できませんでした");
    showToast(`${missing.join("、")}を入力してください`);
    return;
  }

  syncMobileBattedBallFields();
  const pa = plateAppearanceFromForm(form);
  selectedEntryGameId = pa.gameId;
  selectedPitcherKey = pitcherProfileKey(pa);

  const nextState = withPitcherStrategy(
    {
      games: [...state.games],
      plateAppearances: [...state.plateAppearances, pa],
    },
    pa,
    form.elements.pitcherStrategy.value,
  );

  if (commitState(nextState, "スマホ入力で打席を保存しました", "スマホ打席保存")) {
    resetMobilePlateAppearanceForm({ gameId: pa.gameId, previousPa: pa });
    switchTab("mobile");
  }
});

els.gameList.addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-entry-game]");
  if (selectButton) {
    selectedEntryGameId = selectButton.dataset.entryGame;
    renderGameList();
    renderPlateAppearanceList();
    return;
  }

  const editButton = event.target.closest("[data-edit-game]");
  if (editButton) {
    startGameEdit(editButton.dataset.editGame);
    return;
  }

  const button = event.target.closest("[data-delete-game]");
  if (!button) return;

  const gameId = button.dataset.deleteGame;
  const game = getGame(gameId);
  const ok = window.confirm(`${gameTitle(game)} を削除しますか？関連する打席も削除されます。`);
  if (!ok) return;

  if (editingGameId === gameId) editingGameId = "";
  if (editingPaId && getPlateAppearance(editingPaId)?.gameId === gameId) editingPaId = "";
  commitState(
    {
      games: state.games.filter((item) => item.id !== gameId),
      plateAppearances: state.plateAppearances.filter((item) => item.gameId !== gameId),
    },
    "試合を削除しました",
    "試合削除",
  );
});

els.paList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-pa]");
  if (editButton) {
    startPlateAppearanceEdit(editButton.dataset.editPa);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-pa]");
  if (!deleteButton) return;

  const paId = deleteButton.dataset.deletePa;
  const pa = getPlateAppearance(paId);
  const ok = window.confirm(`${labelForResult(pa?.result)} / ${pa?.pitcherName || "投手未入力"} を削除しますか？`);
  if (!ok) return;

  if (editingPaId === paId) editingPaId = "";
  commitState(
    {
      games: [...state.games],
      plateAppearances: state.plateAppearances.filter((item) => item.id !== paId),
    },
    "打席を削除しました",
    "打席削除",
  );
});

els.pitcherCards.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pitcher-key]");
  if (!button) return;

  selectedPitcherKey = button.dataset.pitcherKey;
  renderPitcherCards();
});

els.exportButton.addEventListener("click", exportData);
els.backupExportButton.addEventListener("click", exportLatestBackup);
els.restoreBackupButton.addEventListener("click", restoreLatestBackup);
els.cancelGameEditButton.addEventListener("click", cancelGameEdit);
els.cancelPaEditButton.addEventListener("click", cancelPlateAppearanceEdit);

els.syncConfigForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSyncSettingsFromForm();
});

els.syncSignUpButton.addEventListener("click", handleSyncSignUp);
els.syncSignInButton.addEventListener("click", handleSyncSignIn);
els.syncSignOutButton.addEventListener("click", handleSyncSignOut);
els.syncNowButton.addEventListener("click", () => runCloudSync("manual"));
els.syncPullButton.addEventListener("click", () => {
  const ok = window.confirm("クラウドのデータをこの端末へ読み込みます。現在の端末データはバックアップ後に置き換わります。実行しますか？");
  if (!ok) return;
  runSyncButtonAction(() => pullCloudStateToLocal("クラウドのデータをこの端末へ読み込みました"), "クラウドから読み込み中です");
});
els.syncPushButton.addEventListener("click", () => {
  const ok = window.confirm("この端末のデータをクラウドへ保存します。クラウド側の同じ同期データは上書きされます。実行しますか？");
  if (!ok) return;
  runSyncButtonAction(() => pushLocalStateToCloud("この端末のデータをクラウドへ保存しました"), "クラウドへ保存中です");
});

els.importInput.addEventListener("change", (event) => {
  const file = event.currentTarget.files?.[0];
  if (file) importData(file);
});

$("#gameDate").value = todayValue();
syncBattedBallFields();
render();
switchTab(initialTabName(), { persist: false });
initializeCloudSync();
registerAppWorker();
