const STORAGE_KEY = "kusayakyu-log-v1";
const BACKUP_KEY = "kusayakyu-log-backups-v1";
const ACTIVE_TAB_KEY = "kusayakyu-active-tab-v1";
const SYNC_CONFIG_KEY = "kusayakyu-sync-config-v1";
const SYNC_META_KEY = "kusayakyu-sync-meta-v1";
const SYNC_TABLE = "kusayakyu_sync_data";
const SYNC_PROFILE_ID = "default";
const MAX_BACKUPS = 10;
const MOBILE_NEW_GAME_VALUE = "__new_game__";
const NEW_OPPONENT_VALUE = "__new_opponent__";

const RESULT_DEFS = {
  single: { label: "単打", atBat: true, hit: true, totalBases: 1, onBase: true, single: true },
  double: { label: "二塁打", atBat: true, hit: true, totalBases: 2, onBase: true, double: true },
  triple: { label: "三塁打", atBat: true, hit: true, totalBases: 3, onBase: true, triple: true },
  homer: { label: "本塁打", atBat: true, hit: true, totalBases: 4, onBase: true, homer: true },
  walk: { label: "四球", atBat: false, hit: false, totalBases: 0, onBase: true, walk: true },
  hbp: { label: "死球", atBat: false, hit: false, totalBases: 0, onBase: true, hbp: true },
  strikeout: { label: "三振", atBat: true, hit: false, totalBases: 0, onBase: false },
  out: { label: "アウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  groundout: { label: "ゴロアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  flyout: { label: "フライアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  lineout: { label: "ライナーアウト", atBat: true, hit: false, totalBases: 0, onBase: false },
  fielderChoice: { label: "野選", atBat: true, hit: false, totalBases: 0, onBase: false },
  error: { label: "エラー", atBat: true, hit: false, totalBases: 0, onBase: false, error: true },
  sacFly: { label: "犠飛", atBat: false, hit: false, totalBases: 0, onBase: false, sacFly: true },
  sacBunt: { label: "犠打", atBat: false, hit: false, totalBases: 0, onBase: false, sacBunt: true },
};

const BATTED_DIRECTION_MARKERS = [
  { key: "レフト方向", label: "レフト", x: 18, y: 23, type: "outfield" },
  { key: "センター方向", label: "センター", x: 50, y: 12, type: "outfield" },
  { key: "ライト方向", label: "ライト", x: 82, y: 23, type: "outfield" },
  { key: "三塁方向", label: "三塁", x: 22, y: 66, type: "infield" },
  { key: "遊撃方向", label: "遊撃", x: 32, y: 45, type: "infield" },
  { key: "投手方向", label: "投手", x: 50, y: 60, type: "infield" },
  { key: "二塁方向", label: "二塁", x: 68, y: 45, type: "infield" },
  { key: "一塁方向", label: "一塁", x: 78, y: 66, type: "infield" },
  { key: "捕手方向", label: "捕手", x: 50, y: 90, type: "infield" },
];

const BATTED_DIRECTION_ALIASES = {
  左方向: "レフト方向",
  中方向: "センター方向",
  右方向: "ライト方向",
};

const BATTED_OUT_RESULTS = new Set(["out", "groundout", "flyout", "lineout"]);
const LEGACY_OUT_BATTED_TYPES = {
  groundout: "ゴロ",
  flyout: "フライ",
  lineout: "ライナー",
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

const PITCH_OUTCOME_CATEGORIES = [
  { key: "hit", label: "安打", className: "is-hit" },
  { key: "out", label: "凡打", className: "is-out" },
  { key: "strikeout", label: "三振", className: "is-strikeout" },
  { key: "walk", label: "四球", className: "is-walk" },
];

const COUNT_HEATMAP_STRIKES = ["0S", "1S", "2S"];
const COUNT_HEATMAP_BALLS = ["0B", "1B", "2B", "3B"];

const RUNNER_OPTIONS = {
  regular: ["ランナーなし", "1塁"],
  risp: ["2塁", "3塁", "1・2塁", "1・3塁", "2・3塁", "満塁"],
};

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
let mobileEditingGameId = "";
let mobileEditingPaId = "";
let selectedMemoGameId = "";
let selectedEntryGameId = "";
let selectedPitcherKey = "";
let selectedPitcherOpponent = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  tabs: $$(".tab"),
  panels: $$(".tab-panel"),
  analysisMetrics: $("#analysisMetrics"),
  battedDirectionGrid: $("#battedDirectionGrid"),
  battedDirectionChart: $("#battedDirectionChart"),
  battedDirectionSummary: $("#battedDirectionSummary"),
  battedHitDirectionChart: $("#battedHitDirectionChart"),
  battedHitDirectionSummary: $("#battedHitDirectionSummary"),
  battedOutDirectionChart: $("#battedOutDirectionChart"),
  battedOutDirectionSummary: $("#battedOutDirectionSummary"),
  pitchTypeOutcomeChart: $("#pitchTypeOutcomeChart"),
  pitchTypeOutcomeSummary: $("#pitchTypeOutcomeSummary"),
  pitcherMainBody: $("#pitcherMainBody"),
  pitcherMainSummary: $("#pitcherMainSummary"),
  recentGames: $("#recentGames"),
  recentPlateAppearances: $("#recentPlateAppearances"),
  gameForm: $("#gameForm"),
  opponentSelect: $("#opponentSelect"),
  opponentInput: $("#opponentInput"),
  opponentNewField: $("#opponentNewField"),
  paForm: $("#paForm"),
  mobilePaForm: $("#mobilePaForm"),
  mobilePaSubmitButton: $("#mobilePaSubmitButton"),
  gameSelect: $("#gameSelect"),
  pcPitcherSelect: $("#pcPitcherSelect"),
  mobileGameSelect: $("#mobileGameSelect"),
  mobileGameRegistration: $("#mobileGameRegistration"),
  mobileGameSaveButton: $("#mobileGameSaveButton"),
  mobileOpponentSelect: $("#mobileOpponentSelect"),
  mobileOpponentInput: $("#mobileOpponentInput"),
  mobileOpponentNewField: $("#mobileOpponentNewField"),
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
  statsSubTabs: $$(".stats-sub-tab"),
  statsSubPanelsWrap: $(".stats-sub-panels"),
  statsSubPanels: $$(".stats-sub-panel"),
  courseSupplementChart: $("#courseSupplementChart"),
  courseSupplementSummary: $("#courseSupplementSummary"),
  countHeatmapChart: $("#countHeatmapChart"),
  countHeatmapSummary: $("#countHeatmapSummary"),
  countStatsBody: $("#countStatsBody"),
  pitcherOpponentFilter: $("#pitcherOpponentFilter"),
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
  deleteGameEditButton: $("#deleteGameEditButton"),
  paSubmitButton: $("#paSubmitButton"),
  cancelPaEditButton: $("#cancelPaEditButton"),
  mobileGameActions: $("#mobileGameActions"),
  mobileGameDeleteButton: $("#mobileGameDeleteButton"),
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
      const videoUrl = typeof entry === "object" && entry
        ? String(entry.videoUrl || "")
        : "";
      const updatedAt = typeof entry === "object" && entry
        ? String(entry.updatedAt || "")
        : "";
      return [key, { text, videoUrl, updatedAt }];
    })
    .filter(([key, entry]) => key && (entry.text.trim() || entry.videoUrl.trim())));
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

function plateAppearanceSlot(pa) {
  return pa?.plateAppearance || pa?.inning || "";
}

function findPlateAppearanceForGameSlot(gameId, slot) {
  if (!gameId || !slot) return null;
  return sortedPlateAppearances()
    .find((pa) => pa.gameId === gameId && plateAppearanceSlot(pa) === slot) || null;
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

function pitchOutcomeCategory(pa) {
  const def = resultDef(pa);
  if (def.hit) return "hit";
  if (def.walk) return "walk";
  if (pa.result === "strikeout") return "strikeout";
  return "out";
}

function pitchTypeOutcomeRows(plateAppearances) {
  const groups = new Map();

  plateAppearances.forEach((pa) => {
    const label = pa.pitchType || "球種未選択";
    const row = groups.get(label) || {
      label,
      pa: 0,
      ab: 0,
      hit: 0,
      out: 0,
      strikeout: 0,
      walk: 0,
    };
    const def = resultDef(pa);
    row.pa += 1;
    if (def.atBat) row.ab += 1;
    row[pitchOutcomeCategory(pa)] += 1;
    groups.set(label, row);
  });

  return sortPitchTypeRows([...groups.values()]);
}

function renderPitchTypeOutcomeChart(plateAppearances) {
  const rows = pitchTypeOutcomeRows(plateAppearances);
  els.pitchTypeOutcomeSummary.textContent = `${plateAppearances.length}打席`;

  if (!rows.length) {
    els.pitchTypeOutcomeChart.innerHTML = `<div class="empty">勝負球の球種を入力すると、球種ごとの打席結果が表示されます。</div>`;
    return;
  }

  const bars = rows.map((row) => {
    const ariaResults = PITCH_OUTCOME_CATEGORIES
      .map((category) => `${category.label} ${row[category.key]}打席`)
      .join("、");
    const segments = [...PITCH_OUTCOME_CATEGORIES].reverse().map((category) => {
      const count = row[category.key];
      if (!count) return "";
      const percent = (count / row.pa) * 100;
      const label = `${Math.round(percent)}%`;
      return `
        <span
          class="pitch-outcome-segment ${category.className}"
          style="--segment-size: ${percent}%"
          title="${escapeHtml(`${category.label} ${count}打席（${label}）`)}"
          aria-hidden="true"
        >${percent >= 8 ? label : ""}</span>
      `;
    }).join("");

    return `
      <div class="pitch-outcome-column">
        <div class="pitch-outcome-bar" role="img" aria-label="${escapeHtml(`${row.label}：${ariaResults}`)}">
          ${segments}
        </div>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${row.pa}打席</span>
        <span class="pitch-outcome-average">打率 ${formatRate(row.ab ? row.hit / row.ab : NaN)}</span>
      </div>
    `;
  }).join("");
  const legend = PITCH_OUTCOME_CATEGORIES.map((category) => `
    <span><i class="${category.className}" aria-hidden="true"></i>${category.label}</span>
  `).join("");

  els.pitchTypeOutcomeChart.innerHTML = `
    <p class="pitch-outcome-title">勝負球（最後の球種）× 打席結果</p>
    <div class="pitch-outcome-scroll">
      <div class="pitch-outcome-bars">${bars}</div>
    </div>
    <div class="pitch-outcome-legend" aria-label="グラフの色分け">${legend}</div>
  `;
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

function pitcherVideoUrl(key) {
  return String(state.pitcherStrategies?.[key]?.videoUrl || "");
}

function pitcherVideoLinkHtml(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "未入力";
  if (!/^https?:\/\//i.test(trimmed)) return escapeHtml(trimmed);
  return `<a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer">${escapeHtml(trimmed)}</a>`;
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
  if (!form?.elements?.pitcherStrategy && !form?.elements?.pitcherVideoUrl) return;
  const key = pitcherStrategyKeyForForm(form);
  if (form.elements.pitcherStrategy) {
    setFieldValue(form, "pitcherStrategy", key ? pitcherStrategyText(key) : "");
  }
  if (form.elements.pitcherVideoUrl) {
    setFieldValue(form, "pitcherVideoUrl", key ? pitcherVideoUrl(key) : "");
  }
}

function withPitcherStrategy(nextState, pa, strategyValue, videoUrlValue) {
  const normalizedState = normalizeState({
    ...nextState,
    pitcherStrategies: Object.prototype.hasOwnProperty.call(nextState, "pitcherStrategies")
      ? nextState.pitcherStrategies
      : state.pitcherStrategies,
  });
  const strategies = { ...normalizedState.pitcherStrategies };
  const key = pitcherProfileKey(pa);
  const text = String(strategyValue || "").trim();
  const videoUrl = String(videoUrlValue || "").trim();

  if (text || videoUrl) {
    strategies[key] = { text, videoUrl, updatedAt: new Date().toISOString() };
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

function metric(label, value, sub = "", key = "") {
  const metricKey = key ? ` data-metric="${escapeHtml(key)}"` : "";
  return `
    <div class="metric"${metricKey}>
      <span>${label}</span>
      <strong>${value}</strong>
      ${sub ? `<p class="muted">${sub}</p>` : ""}
    </div>
  `;
}

function renderMetrics(target, stats) {
  const withRateValues = withRates(stats);
  target.innerHTML = [
    metric("打率", formatRate(withRateValues.avg), `${stats.ab}打数 / ${stats.h}安打`, "avg"),
    metric("本塁打", formatNumber(stats.hr), "通算", "hr"),
    metric("打点", formatNumber(stats.rbi), "通算", "rbi"),
    metric("得点", formatNumber(stats.runs), "通算", "runs"),
    metric("四球", formatNumber(stats.bb), "通算", "bb"),
    metric("死球", formatNumber(stats.hbp), "通算", "hbp"),
    metric("盗塁数", formatNumber(stats.steals), `${stats.stealAttempts}企図`, "steals"),
    metric("盗塁成功率", formatPercent(withRateValues.stealRate), `${stats.steals}成功 / ${stats.stealAttempts}企図`, "steal-rate"),
    metric("犠打", formatNumber(stats.sh), "通算", "sac-bunt"),
    metric("出塁率", formatRate(withRateValues.obp), `${stats.bb}四球・${stats.hbp}死球`, "obp"),
    metric("長打率", formatRate(withRateValues.slg), `${stats.tb}塁打`, "slg"),
    metric("OPS", formatRate(withRateValues.ops), "出塁率 + 長打率", "ops"),
    metric("得点圏打率", formatRate(withRateValues.rispAvg), `${stats.rispH}安打 / ${stats.rispAb}打数`, "risp-avg"),
    metric("単打", formatNumber(stats.singles), "通算", "singles"),
    metric("二塁打", formatNumber(stats.doubles), "通算", "doubles"),
    metric("三塁打", formatNumber(stats.triples), "通算", "triples"),
    metric("失策出塁", formatNumber(stats.errorsReached), "通算", "errors-reached"),
    metric("犠飛", formatNumber(stats.sf), "通算", "sac-fly"),
  ].join("");
}

function isBattedHit(pa) {
  return Boolean(resultDef(pa).hit);
}

function isBattedOut(pa) {
  return BATTED_OUT_RESULTS.has(pa.result);
}

function renderBattedDirectionChart(chart, summary, plateAppearances, label = "打球方向", toggleView = "") {
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
  const toggleButton = toggleView
    ? `<button class="ghost-button compact-button batted-direction-mobile-toggle" type="button" data-batted-direction-view="${escapeHtml(toggleView)}">切替</button>`
    : "";

  summary.textContent = `${stats.total}打球`;
  chart.innerHTML = `
    <div class="batted-field" role="img" aria-label="${escapeHtml(`${label}の打球方向比率。${ariaLabel}`)}">
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
      <span>${stats.total ? `${stats.total}打球を集計` : `${label}の打球方向入力がまだありません`}</span>
      ${toggleButton}
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

function countHeatmapParts(value) {
  const label = normalizeCountLabel(value);
  const match = label.match(/^([0-2])S-([0-3])B$/);
  if (!match) return null;

  return {
    label,
    strikes: `${match[1]}S`,
    balls: `${match[2]}B`,
  };
}

function countHeatmapStats(plateAppearances) {
  const cells = Object.fromEntries(COUNT_HEATMAP_BALLS.map((balls) => [
    balls,
    Object.fromEntries(COUNT_HEATMAP_STRIKES.map((strikes) => [
      strikes,
      { ab: 0, h: 0 },
    ])),
  ]));
  let totalAb = 0;
  let skippedAb = 0;

  plateAppearances.forEach((pa) => {
    const def = resultDef(pa);
    if (!def.atBat) return;

    const parts = countHeatmapParts(pa.count);
    const cell = parts ? cells[parts.balls]?.[parts.strikes] : null;
    if (!cell) {
      skippedAb += 1;
      return;
    }

    totalAb += 1;
    cell.ab += 1;
    if (def.hit) cell.h += 1;
  });

  return { cells, totalAb, skippedAb };
}

function countHeatmapTone(avg, ab) {
  if (!ab) return "is-empty";
  if (avg >= 0.3) return "is-good";
  if (avg >= 0.2) return "is-caution";
  if (avg >= 0.1) return "is-warning";
  return "is-danger";
}

function renderCountHeatmap(plateAppearances) {
  const stats = countHeatmapStats(plateAppearances);
  els.countHeatmapSummary.textContent = `${stats.totalAb}打数`;

  if (!stats.totalAb) {
    els.countHeatmapChart.innerHTML = `<div class="empty">カウントを入力した打数が増えると、直前カウント別の打率ヒートマップが表示されます。</div>`;
    return;
  }

  const headerCells = COUNT_HEATMAP_STRIKES.map((strikes) => `
    <div class="count-heatmap-axis count-heatmap-strikes">${strikes}</div>
  `).join("");
  const bodyCells = COUNT_HEATMAP_BALLS.map((balls) => {
    const cells = COUNT_HEATMAP_STRIKES.map((strikes) => {
      const row = stats.cells[balls][strikes];
      const avg = row.ab ? row.h / row.ab : NaN;
      const label = `${strikes}-${balls}`;
      return `
        <div
          class="count-heatmap-cell ${countHeatmapTone(avg, row.ab)}"
          title="${escapeHtml(`${label}：${row.ab}打数 ${row.h}安打 打率 ${formatRate(avg)}`)}"
        >
          <strong>${formatRate(avg)}</strong>
        </div>
      `;
    }).join("");

    return `
      <div class="count-heatmap-axis count-heatmap-balls">${balls}</div>
      ${cells}
    `;
  }).join("");

  els.countHeatmapChart.innerHTML = `
    <p class="count-heatmap-title">
      <span class="count-title-main">直前カウント</span>
      <span class="count-title-note">（B＝ボール、S＝ストライク）</span>
    </p>
    <div class="count-heatmap-grid" role="img" aria-label="直前カウント別の打率ヒートマップです。">
      <div class="count-heatmap-corner"></div>
      ${headerCells}
      ${bodyCells}
    </div>
    <div class="count-heatmap-footer">
      <p class="muted">表示は打率です。カウント未入力の打数は ${stats.skippedAb} あります。</p>
      <div class="count-heatmap-legend" aria-label="色の意味">
        <span class="count-heatmap-legend-item is-good-label"><i class="is-good"></i>.300以上</span>
        <span class="count-heatmap-legend-item is-caution-label"><i class="is-caution"></i>.200〜.299</span>
        <span class="count-heatmap-legend-item is-warning-label"><i class="is-warning"></i>.100〜.199</span>
        <span class="count-heatmap-legend-item is-danger-label"><i class="is-danger"></i>.100未満</span>
        <span class="count-heatmap-mobile-note">（B＝ボール、S＝ストライク）</span>
      </div>
    </div>
  `;
}

function renderGameSelect() {
  if (!state.games.length) {
    els.gameSelect.innerHTML = `<option value="">先に試合を登録してください</option>`;
    els.gameSelect.disabled = true;
    renderPcPitcherPresets();
    return;
  }

  const games = sortedGames();
  const current = els.gameSelect.value || selectedEntryGameId || games[0].id;
  const selectedId = games.some((game) => game.id === current) ? current : games[0].id;
  els.gameSelect.disabled = false;
  els.gameSelect.innerHTML = games
    .map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(gameTitle(game))}</option>`)
    .join("");
  els.gameSelect.value = selectedId;
}

function opponentOptions() {
  return [...new Set(state.games
    .map((game) => String(game.opponent || "").trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));
}

function opponentControls(mode = "desktop") {
  if (mode === "mobile") {
    return {
      select: els.mobileOpponentSelect,
      input: els.mobileOpponentInput,
      newField: els.mobileOpponentNewField,
    };
  }
  return {
    select: els.opponentSelect,
    input: els.opponentInput,
    newField: els.opponentNewField,
  };
}

function syncOpponentInputMode(controls = opponentControls()) {
  const { select, input, newField } = controls;
  if (!select || !input || !newField) return;
  const isNew = select.value === NEW_OPPONENT_VALUE;
  newField.closest(".game-basic-row, .mobile-game-opponent-row")?.classList.toggle("is-new-opponent", isNew);
  newField.classList.toggle("is-hidden", !isNew);
  input.required = isNew;
  input.disabled = !isNew;
  if (!isNew) input.value = "";
}

function currentOpponentFormValue(controls = opponentControls()) {
  const { select, input } = controls;
  if (!select || !input) return "";
  return select.value === NEW_OPPONENT_VALUE ? input.value : select.value;
}

function renderOpponentOptions(controls = opponentControls(), preferredValue = currentOpponentFormValue(controls)) {
  const { select, input } = controls;
  if (!select) return;
  const opponents = opponentOptions();
  const selectedValue = opponents.includes(preferredValue) ? preferredValue : NEW_OPPONENT_VALUE;
  const newOpponentValue = selectedValue === NEW_OPPONENT_VALUE ? preferredValue : "";

  select.innerHTML = [
    `<option value="${NEW_OPPONENT_VALUE}">新規登録</option>`,
    ...opponents.map((opponent) => `<option value="${escapeHtml(opponent)}">${escapeHtml(opponent)}</option>`),
  ].join("");
  select.value = selectedValue;
  if (input) input.value = newOpponentValue;
  syncOpponentInputMode(controls);
}

function renderOpponentSelect(preferredValue = currentOpponentFormValue(opponentControls())) {
  renderOpponentOptions(opponentControls(), preferredValue);
}

function renderMobileOpponentSelect(preferredValue = currentOpponentFormValue(opponentControls("mobile"))) {
  renderOpponentOptions(opponentControls("mobile"), preferredValue);
}

function setMobileChoice(name, value) {
  if (!els.mobilePaForm) return;
  const field = els.mobilePaForm.elements[name];
  if (field) field.value = value || "";
  updateMobileChoiceButtons(name);
  if (name === "result") {
    syncMobileBattedBallFields();
  }
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

function syncRunnerOptions(form) {
  if (!form?.elements?.runners || !form.elements.risp) return;
  const runners = form.elements.runners;
  const currentValue = runners.value;
  const options = form.elements.risp.checked ? RUNNER_OPTIONS.risp : RUNNER_OPTIONS.regular;

  runners.innerHTML = options.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
  runners.value = options.includes(currentValue) ? currentValue : options[0];
}

function syncMobileRunnerOptions() {
  syncRunnerOptions(els.mobilePaForm);
}

function setControlsDisabled(container, disabled) {
  if (!container) return;
  container.querySelectorAll("button, input, select, textarea").forEach((field) => {
    field.disabled = disabled;
  });
}

function resetMobileGameRegistrationFields() {
  if (!els.mobileGameRegistration) return;
  els.mobileGameRegistration.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.type === "date") {
      field.value = todayValue();
    } else if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else {
      field.value = "";
    }
  });
  renderMobileOpponentSelect();
}

function fillMobileGameRegistrationFields(game) {
  if (!els.mobilePaForm || !game) return;
  setFieldValue(els.mobilePaForm, "date", game.date || todayValue());
  setFieldValue(els.mobilePaForm, "gameType", game.gameType || "");
  renderMobileOpponentSelect(game.opponent || "");
  setFieldValue(els.mobilePaForm, "opponent", game.opponent || "");
  setFieldValue(els.mobilePaForm, "opponentClass", game.opponentClass || "");
  setFieldValue(els.mobilePaForm, "ballpark", game.ballpark || "");
  setFieldValue(els.mobilePaForm, "ownScore", game.ownScore);
  setFieldValue(els.mobilePaForm, "opponentScore", game.opponentScore);
  setFieldValue(els.mobilePaForm, "battingOrder", game.battingOrder || "");
  setFieldValue(els.mobilePaForm, "position", game.position || "");
  setFieldValue(els.mobilePaForm, "defenseMemo", game.defenseMemo || "");
  setFieldValue(els.mobilePaForm, "opponentOrder", game.opponentOrder || "");
  setFieldValue(els.mobilePaForm, "baserunningMemo", game.baserunningMemo || "");
  setFieldValue(els.mobilePaForm, "gameMemo", game.gameMemo || "");
}

function syncMobileGameMode() {
  if (!els.mobileGameSelect) return;
  const registeringNewGame = els.mobileGameSelect.value === MOBILE_NEW_GAME_VALUE;
  const editingMobileGame = Boolean(mobileEditingGameId);
  const showingGameForm = registeringNewGame || editingMobileGame;
  els.mobileGameRegistration?.classList.toggle("is-hidden", !showingGameForm);
  setControlsDisabled(els.mobileGameRegistration, !showingGameForm);
  els.mobileGameDeleteButton?.classList.toggle("is-hidden", !editingMobileGame);
  els.mobileGameActions?.classList.toggle("is-editing", editingMobileGame);

  $$("[data-mobile-pa-section]").forEach((section) => {
    section.classList.toggle("is-hidden", showingGameForm);
    setControlsDisabled(section, showingGameForm);
  });

  if (showingGameForm) {
    mobileEditingPaId = "";
    const dateField = els.mobileGameRegistration?.querySelector('input[name="date"]');
    if (dateField && !dateField.value) dateField.value = todayValue();
  }

  if (els.mobileGameSaveButton) {
    els.mobileGameSaveButton.textContent = editingMobileGame
      ? "試合を更新して打席入力へ"
      : "試合を保存して打席入力へ";
  }

  renderMobileEditState();
}

function renderMobileGameSummary() {
  if (!els.mobileGameSummary || !els.mobileGameSelect) return;
  if (mobileEditingGameId) {
    els.mobileGameSummary.textContent = "試合情報を編集中です。更新すると、この試合の打席入力へ進めます。";
    return;
  }

  if (els.mobileGameSelect.value === MOBILE_NEW_GAME_VALUE) {
    els.mobileGameSummary.textContent = "試合情報を入力して保存すると、この試合の打席入力へ進めます。";
    return;
  }

  const game = getGame(els.mobileGameSelect.value);
  if (!game) {
    els.mobileGameSummary.textContent = "試合を選ぶか、新規登録してください。";
    return;
  }

  const paCount = state.plateAppearances.filter((pa) => pa.gameId === game.id).length;
  const selectedSlot = els.mobilePaForm?.elements?.plateAppearance?.value || "";
  const selectedPa = findPlateAppearanceForGameSlot(game.id, selectedSlot);
  const nextText = selectedPa ? `${selectedSlot}を編集中` : `次は ${nextPlateAppearanceForGame(game.id)}`;
  els.mobileGameSummary.textContent = `${paCount}打席済み / ${nextText}`;
}

function renderMobileGameSelect() {
  if (!els.mobileGameSelect) return;

  const games = sortedGames();
  const current = els.mobileGameSelect.value || selectedEntryGameId || games[0]?.id || MOBILE_NEW_GAME_VALUE;
  const selectedId = current === MOBILE_NEW_GAME_VALUE || !games.length
    ? MOBILE_NEW_GAME_VALUE
    : games.some((game) => game.id === current) ? current : games[0].id;
  els.mobileGameSelect.disabled = false;
  els.mobileGameSelect.innerHTML = [
    `<option value="${MOBILE_NEW_GAME_VALUE}">新規登録</option>`,
    ...games.map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(gameTitle(game))}</option>`),
  ].join("");
  els.mobileGameSelect.value = selectedId;
  syncMobileGameMode();

  if (selectedId === MOBILE_NEW_GAME_VALUE) {
    renderMobileGameSummary();
    syncMobileChoiceButtons();
    return;
  }

  if (els.mobilePaForm && !els.mobilePaForm.elements.plateAppearance.value) {
    setMobileChoice("plateAppearance", nextPlateAppearanceForGame(selectedId));
  }
  if (els.mobilePaForm && !els.mobilePaForm.elements.runScored.value) {
    setFieldValue(els.mobilePaForm, "runScored", "0");
  }
  renderMobileGameSummary();
  syncMobileChoiceButtons();
  syncMobileRunnerOptions();
  syncMobileBattedBallFields();
}

function pitcherRowsForGame(gameId) {
  const game = getGame(gameId);
  if (!game) return [];

  const opponent = String(game.opponent || "").trim();
  return groupPitcherStats(state.plateAppearances)
    .filter((row) => String(row.opponent || "").trim() === opponent)
    .slice(0, 6);
}

function renderPcPitcherPresets() {
  if (!els.pcPitcherSelect || !els.gameSelect) return;
  const game = getGame(els.gameSelect.value);
  if (!game) {
    els.pcPitcherSelect.innerHTML = `<option value="">試合を選択してください</option>`;
    els.pcPitcherSelect.disabled = true;
    return;
  }

  const rows = pitcherRowsForGame(game.id);
  if (!rows.length) {
    const opponentLabel = String(game.opponent || "").trim() || "この対戦相手";
    els.pcPitcherSelect.innerHTML = `<option value="">${escapeHtml(opponentLabel)}の投手データなし（新規入力）</option>`;
    els.pcPitcherSelect.disabled = true;
    return;
  }

  const selectedKey = pitcherStrategyKeyForForm(els.paForm);
  els.pcPitcherSelect.disabled = false;
  els.pcPitcherSelect.innerHTML = `
    <option value="">新規入力</option>
    ${rows.map((row) => {
    const pa = latestPaForPitcher(row) || {};
    const breakingBalls = breakingBallsForPa(pa);
    return `
      <option
        value="${escapeHtml(row.key)}"
        data-pitcher-name="${escapeHtml(pa.pitcherName || "")}"
        data-pitcher-number="${escapeHtml(pa.pitcherNumber || "")}"
        data-pitcher-hand="${escapeHtml(pa.pitcherHand || "")}"
        data-pitching-form="${escapeHtml(pa.pitchingForm || "")}"
        data-straight-velocity="${escapeHtml(pa.straightVelocity || "")}"
        data-breaking-ball-1="${escapeHtml(breakingBalls[0] || "")}"
        data-breaking-ball-2="${escapeHtml(breakingBalls[1] || "")}"
        data-breaking-ball-3="${escapeHtml(breakingBalls[2] || "")}"
      >
        ${escapeHtml(`${row.pitcher} / 背番号 ${row.number}`)}
      </option>
    `;
  }).join("")}
  `;
  els.pcPitcherSelect.value = rows.some((row) => row.key === selectedKey) ? selectedKey : "";
}

function renderMobilePitcherPresets() {
  if (!els.mobilePitcherPresets || !els.mobileGameSelect) return;
  const game = getGame(els.mobileGameSelect.value);
  if (!game) {
    els.mobilePitcherPresets.innerHTML = `<div class="mobile-empty-note">試合を選択してください</div>`;
    return;
  }

  const opponent = String(game.opponent || "").trim();
  const rows = pitcherRowsForGame(game.id);

  if (!rows.length) {
    const opponentLabel = opponent || "この対戦相手";
    els.mobilePitcherPresets.innerHTML = `<div class="mobile-empty-note">${escapeHtml(opponentLabel)}の投手データなし</div>`;
    return;
  }

  els.mobilePitcherPresets.innerHTML = rows.map((row) => `
    <button class="mobile-pitcher-button" data-mobile-pitcher-key="${escapeHtml(row.key)}" type="button">
      <strong>${escapeHtml(row.pitcher)}</strong>
      <span>${escapeHtml(row.opponent)} / 背番号 ${escapeHtml(row.number)}</span>
    </button>
  `).join("");
}

function isPhoneLayout() {
  return window.matchMedia("(max-width: 950px)").matches
    || window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function syncRecentGamesHeight() {
  els.recentGames.style.removeProperty("max-height");

  if (!isPhoneLayout()) return;

  const gameButtons = [...els.recentGames.querySelectorAll("[data-memo-game]")];
  if (gameButtons.length < 4) return;

  const buttonHeights = gameButtons.slice(0, 3).map((button) => button.offsetHeight);
  if (buttonHeights.some((height) => height === 0)) return;

  const gap = Number.parseFloat(window.getComputedStyle(els.recentGames).rowGap) || 0;
  const threeGameHeight = buttonHeights.reduce((height, buttonHeight) => height + buttonHeight, gap * 2);
  els.recentGames.style.maxHeight = `${Math.ceil(threeGameHeight)}px`;
}

function renderRecentGames() {
  const games = sortedGames();

  if (!games.length) {
    selectedMemoGameId = "";
    els.recentGames.innerHTML = `<div class="empty">まずは試合を1件登録しましょう。</div>`;
    syncRecentGamesHeight();
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

  syncRecentGamesHeight();
}

function renderRecentPlateAppearances() {
  const game = selectedMemoGame();

  if (!game) {
    els.recentPlateAppearances.innerHTML = `<div class="empty">試合を登録すると、守備・走塁・試合メモがここに表示されます。</div>`;
    return;
  }

  const memoRows = [
    ["守備の振り返り", game.defenseMemo],
    ["相手チームのオーダー", game.opponentOrder],
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
  if (!els.gameList || !els.gameCount) return;
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
  if (!els.paList || !els.paCount) return;
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

function renderStatsTable(tbody, rows, options = {}) {
  const includeWalks = options.includeWalks === true;
  const columnCount = includeWalks ? 8 : 7;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${columnCount}">まだ集計できる打席がありません。</td></tr>`;
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
      ${includeWalks ? `<td>${row.bb}</td>` : ""}
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

function pitcherMainTone(row) {
  if (!row.ab || !Number.isFinite(row.avg)) return "is-empty";
  if (row.avg >= 0.3) return "is-good";
  if (row.avg >= 0.2) return "is-caution";
  return "is-danger";
}

function sortPitcherMainRows(rows) {
  return [...rows].sort((a, b) => {
    const avgA = Number.isFinite(a.avg) ? a.avg : -1;
    const avgB = Number.isFinite(b.avg) ? b.avg : -1;
    const opsA = Number.isFinite(a.ops) ? a.ops : -1;
    const opsB = Number.isFinite(b.ops) ? b.ops : -1;
    return avgB - avgA
      || opsB - opsA
      || b.ab - a.ab
      || a.opponent.localeCompare(b.opponent, "ja")
      || a.pitcher.localeCompare(b.pitcher, "ja");
  });
}

function renderPitcherMainTable(tbody, summary, rows) {
  summary.textContent = `${rows.length}投手`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="16">まだ集計できる投手データがありません。</td></tr>`;
    return;
  }

  tbody.innerHTML = sortPitcherMainRows(rows).map((row) => `
    <tr class="${pitcherMainTone(row)}">
      <td>${escapeHtml(row.opponent)}</td>
      <td title="${escapeHtml(row.pitcher)}">${escapeHtml(row.pitcher.slice(0, 4))}</td>
      <td>${escapeHtml(row.number)}</td>
      <td>${formatRate(row.avg)}</td>
      <td>${formatRate(row.ops)}</td>
      <td>${formatRate(row.obp)}</td>
      <td>${formatRate(row.slg)}</td>
      <td>${row.ab}</td>
      <td>${row.h}</td>
      <td>${row.rbi}</td>
      <td>${row.runs}</td>
      <td>${row.bb}</td>
      <td>${row.hbp}</td>
      <td>${row.steals}</td>
      <td>${row.sh}</td>
      <td>${row.sf}</td>
    </tr>
  `).join("");
}

function renderAnalysis() {
  const stats = calculateStats(state.plateAppearances);
  const pitcherRows = groupPitcherStats(state.plateAppearances);
  renderMetrics(els.analysisMetrics, stats);
  renderBattedDirectionChart(
    els.battedDirectionChart,
    els.battedDirectionSummary,
    state.plateAppearances,
    "全体",
  );
  renderBattedDirectionChart(
    els.battedHitDirectionChart,
    els.battedHitDirectionSummary,
    state.plateAppearances.filter(isBattedHit),
    "安打",
    "out",
  );
  renderBattedDirectionChart(
    els.battedOutDirectionChart,
    els.battedOutDirectionSummary,
    state.plateAppearances.filter(isBattedOut),
    "凡打",
    "hit",
  );
  setMobileBattedDirectionView(els.battedDirectionGrid?.classList.contains("is-showing-out") ? "out" : "hit");
  renderPitchTypeOutcomeChart(state.plateAppearances);
  renderPitcherMainTable(
    els.pitcherMainBody,
    els.pitcherMainSummary,
    pitcherRows,
  );
  renderPitcherStatsTable(
    els.pitcherStatsBody,
    pitcherRows,
  );
  renderStatsTable(
    els.pitchTypeStatsBody,
    sortPitchTypeRows(groupStats(state.plateAppearances, (pa) => pa.pitchType, "球種未選択")),
    { includeWalks: true },
  );
  renderStatsTable(
    els.courseStatsBody,
    sortByAvgRows(groupStats(state.plateAppearances, (pa) => pa.course, "コース未選択")),
  );
  renderCourseSupplement(state.plateAppearances);
  renderCountHeatmap(state.plateAppearances);
  renderStatsTable(
    els.countStatsBody,
    sortByAvgRows(groupStats(state.plateAppearances, (pa) => normalizeCountLabel(pa.count), "カウント未選択")),
  );
}

function setMobileBattedDirectionView(view) {
  const showOut = view === "out";
  els.battedDirectionGrid?.classList.toggle("is-showing-out", showOut);
  els.battedDirectionGrid?.querySelectorAll(".batted-direction-mobile-toggle").forEach((button) => {
    const targetView = button.dataset.battedDirectionView;
    button.setAttribute("aria-pressed", String(targetView === (showOut ? "hit" : "out")));
  });
}

function setStatsSubPanel(target = "") {
  const hasTarget = els.statsSubPanels.some((panel) => panel.dataset.statsSubPanel === target);
  const activeTarget = hasTarget ? target : "";

  els.statsSubTabs.forEach((button) => {
    const isActive = button.dataset.statsSubTarget === activeTarget;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  els.statsSubPanels.forEach((panel) => {
    const isActive = panel.dataset.statsSubPanel === activeTarget;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (els.statsSubPanelsWrap) {
    els.statsSubPanelsWrap.hidden = !activeTarget;
  }
}

function renderPitcherCards() {
  const allRows = groupPitcherStats(state.plateAppearances);

  if (!allRows.length) {
    selectedPitcherKey = "";
    selectedPitcherOpponent = "";
    els.pitcherOpponentFilter.innerHTML = `<option value="">投手データなし</option>`;
    els.pitcherOpponentFilter.disabled = true;
    els.pitcherCards.innerHTML = `<div class="empty">打席入力で相手投手を登録すると、ここに対戦履歴が出ます。</div>`;
    return;
  }

  const opponents = [...new Set(allRows.map((row) => row.opponent))];
  const keyedRow = allRows.find((row) => row.key === selectedPitcherKey);
  if (!opponents.includes(selectedPitcherOpponent)) {
    selectedPitcherOpponent = keyedRow?.opponent || allRows[0].opponent;
  }

  els.pitcherOpponentFilter.disabled = false;
  els.pitcherOpponentFilter.innerHTML = opponents
    .map((opponent) => `<option value="${escapeHtml(opponent)}">${escapeHtml(opponent)}</option>`)
    .join("");
  els.pitcherOpponentFilter.value = selectedPitcherOpponent;

  const rows = allRows.filter((row) => row.opponent === selectedPitcherOpponent);
  const selectedRow = selectedPitcherRow(rows);
  const pitcherButtons = rows.map((row) => {
    const selectedClass = row.key === selectedRow?.key ? " is-selected" : "";
    return `
      <button class="pitcher-summary-button${selectedClass}" data-pitcher-key="${escapeHtml(row.key)}" type="button" aria-pressed="${row.key === selectedRow?.key}">
        <div class="pitcher-summary-main">
          <h3>${escapeHtml(row.pitcher)}</h3>
          <span>${escapeHtml(row.opponent)} / 背番号 ${escapeHtml(row.number)}</span>
        </div>
      </button>
    `;
  }).join("");

  const pitcherPas = sortedPlateAppearances().filter((pa) => pitcherProfileKey(pa) === selectedRow.key);
  const pitcherProfileItems = [
    ["利き手", uniquePitcherValues(pitcherPas, (pa) => [pa.pitcherHand])],
    ["フォーム", uniquePitcherValues(pitcherPas, (pa) => [pa.pitchingForm])],
    ["球速", uniquePitcherValues(pitcherPas, (pa) => [pa.straightVelocity])],
    ["変化球", uniquePitcherValues(pitcherPas, pitcherBreakingBallsForPa, "未入力", 4)],
  ].map(([label, value]) => `
    <span class="pitcher-profile-item">
      <small>${label}</small>
      <strong>${escapeHtml(value)}</strong>
    </span>
  `).join("");
  const pitcherRates = withRates(selectedRow.stats);
  const pitcherStats = [
    ["打率", formatRate(pitcherRates.avg)],
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
  const videoUrl = pitcherVideoUrl(selectedRow.key);
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
        <h3>${escapeHtml(selectedRow.pitcher)}の投手データ</h3>
        <span class="pill">${selectedRow.pa}打席</span>
      </div>
      <div class="pitcher-history-stats" aria-label="${escapeHtml(selectedRow.pitcher)}との過去成績">
        ${pitcherStats}
      </div>
      <section class="pitcher-profile-data" aria-label="投手データ">
        <h4>投手データ</h4>
        <div class="pitcher-profile-grid">
          ${pitcherProfileItems}
        </div>
      </section>
      <section class="pitcher-strategy-note">
        <strong>攻略法</strong>
        <p>${strategy ? escapeHtml(strategy).replace(/\n/g, "<br>") : "未入力"}</p>
      </section>
      <section class="pitcher-video-note">
        <strong>対戦動画</strong>
        <p>${pitcherVideoLinkHtml(videoUrl)}</p>
      </section>
      <div class="list-stack pitcher-history-scroll">
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
  els.deleteGameEditButton.classList.toggle("is-hidden", !editingGame);

  const editingPa = Boolean(editingPaId);
  els.paSubmitButton.textContent = editingPa ? "打席を更新" : "打席を保存";
  els.cancelPaEditButton.classList.toggle("is-hidden", !editingPa);
  renderMobileEditState();
}

function resetGameForm() {
  els.gameForm.reset();
  $("#gameDate").value = todayValue();
  renderOpponentSelect();
}

function resetPlateAppearanceForm() {
  const selectedGame = els.gameSelect.value;
  els.paForm.reset();
  els.gameSelect.value = selectedGame;
  els.paForm.elements.rbi.value = 0;
  els.paForm.elements.sign.value = "なし";
  syncRunnerOptions(els.paForm);
  els.paForm.elements.runners.value = "ランナーなし";
  els.paForm.elements.stolenBase.value = "なし";
  els.paForm.elements.runScored.value = "0";
  syncBattedBallFields();
  renderPcPitcherPresets();
  syncPcPitchTypeOptions();
}

function fillPitcherFieldsFromPa(form, pa) {
  if (!form || !pa) return;
  const breakingBalls = breakingBallsForPa(pa);
  setFieldValue(form, "pitcherName", pa.pitcherName || "");
  setFieldValue(form, "pitcherNumber", pa.pitcherNumber || "");
  setFieldValue(form, "pitcherHand", pa.pitcherHand || "");
  setFieldValue(form, "pitchingForm", pa.pitchingForm || "");
  setFieldValue(form, "straightVelocity", pa.straightVelocity || "");
  setFieldValue(form, "breakingBall1", breakingBalls[0] || "");
  setFieldValue(form, "breakingBall2", breakingBalls[1] || "");
  setFieldValue(form, "breakingBall3", breakingBalls[2] || "");
  syncPitcherStrategyField(form);
  if (form === els.mobilePaForm) syncMobilePitchTypeOptions();
  if (form === els.paForm) syncPcPitchTypeOptions();
}

function clearPcPitcherFields() {
  if (!els.paForm) return;

  ["pitcherName", "pitcherNumber", "pitcherHand", "pitchingForm", "straightVelocity", "breakingBall1", "breakingBall2", "breakingBall3"]
    .forEach((name) => setFieldValue(els.paForm, name, ""));
  syncPitcherStrategyField(els.paForm);
  syncPcPitchTypeOptions();
}

function fillPcPitcherFromPresetOption(option) {
  if (!els.paForm || !option?.value) {
    clearPcPitcherFields();
    return;
  }

  const { dataset } = option;

  setFieldValue(els.paForm, "pitcherName", dataset.pitcherName || "");
  setFieldValue(els.paForm, "pitcherNumber", dataset.pitcherNumber || "");
  setFieldValue(els.paForm, "pitcherHand", dataset.pitcherHand || "");
  setFieldValue(els.paForm, "pitchingForm", dataset.pitchingForm || "");
  setFieldValue(els.paForm, "straightVelocity", dataset.straightVelocity || "");
  setFieldValue(els.paForm, "breakingBall1", dataset.breakingBall1 || "");
  setFieldValue(els.paForm, "breakingBall2", dataset.breakingBall2 || "");
  setFieldValue(els.paForm, "breakingBall3", dataset.breakingBall3 || "");
  syncPitcherStrategyField(els.paForm);
  syncPcPitchTypeOptions();
}

function pcPlateAppearancesForSelectedPitcher() {
  if (!els.paForm || !els.pcPitcherSelect?.value) return [];
  const gameId = els.paForm.elements.gameId.value;
  const pitcherKey = els.pcPitcherSelect.value;
  return sortedPlateAppearances()
    .filter((pa) => pa.gameId === gameId && pitcherProfileKey(pa) === pitcherKey);
}

function selectedPcPitcherPlateAppearance(options = {}) {
  const rows = pcPlateAppearancesForSelectedPitcher();
  if (!rows.length) return null;

  const selectedSlot = els.paForm.elements.plateAppearance.value;
  const selectedPa = rows.find((pa) => plateAppearanceSlot(pa) === selectedSlot);
  if (selectedPa) return selectedPa;
  return options.fallbackToLatest === false ? null : rows[0];
}

function syncPcPlateAppearanceFromPitcherSelection() {
  const option = els.pcPitcherSelect.selectedOptions[0];
  const wasEditing = Boolean(editingPaId);
  fillPcPitcherFromPresetOption(option);

  if (!option?.value) {
    if (wasEditing) clearPcPlateAppearanceDetails();
    editingPaId = "";
    renderEditState();
    return;
  }

  const pa = selectedPcPitcherPlateAppearance();
  if (!pa) {
    if (wasEditing) clearPcPlateAppearanceDetails();
    editingPaId = "";
    renderEditState();
    return;
  }

  editingPaId = pa.id;
  fillPlateAppearanceForm(pa);
  renderEditState();
  showToast(`${plateAppearanceSlot(pa) || "打席"}の入力データを読み込みました`);
}

function clearPcPlateAppearanceDetails() {
  if (!els.paForm) return;
  setFieldValue(els.paForm, "result", "");
  setFieldValue(els.paForm, "rbi", 0);
  setFieldValue(els.paForm, "risp", false);
  syncRunnerOptions(els.paForm);
  setFieldValue(els.paForm, "runners", "ランナーなし");
  setFieldValue(els.paForm, "pitchType", "");
  setFieldValue(els.paForm, "course", "");
  setFieldValue(els.paForm, "count", "");
  setFieldValue(els.paForm, "sign", "なし");
  setFieldValue(els.paForm, "battedDirection", "");
  setFieldValue(els.paForm, "battedType", "");
  setFieldValue(els.paForm, "stolenBase", "なし");
  setFieldValue(els.paForm, "runScored", "0");
  setFieldValue(els.paForm, "memo", "");
  syncBattedBallFields();
}

function syncPcPlateAppearanceFromSlotSelection() {
  if (!els.pcPitcherSelect?.value) return;

  const pa = selectedPcPitcherPlateAppearance({ fallbackToLatest: false });
  if (pa) {
    editingPaId = pa.id;
    fillPlateAppearanceForm(pa);
  } else {
    editingPaId = "";
    clearPcPlateAppearanceDetails();
  }

  renderEditState();
}

function fillMobilePitcherFromPa(pa) {
  fillPitcherFieldsFromPa(els.mobilePaForm, pa);
}

function resultForForm(pa) {
  if (!pa?.result) return "";
  return BATTED_OUT_RESULTS.has(pa.result) ? "out" : pa.result;
}

function battedTypeForForm(pa) {
  return pa?.battedType || LEGACY_OUT_BATTED_TYPES[pa?.result] || "";
}

function setMobilePitcherFields(values = {}) {
  ["pitcherName", "pitcherNumber", "pitcherHand", "pitchingForm", "straightVelocity", "breakingBall1", "breakingBall2", "breakingBall3", "pitcherStrategy", "pitcherVideoUrl"]
    .forEach((name) => setFieldValue(els.mobilePaForm, name, values[name] || ""));
  syncMobilePitchTypeOptions();
}

function mobilePitcherFieldValues() {
  return {
    pitcherName: els.mobilePaForm.elements.pitcherName.value,
    pitcherNumber: els.mobilePaForm.elements.pitcherNumber.value,
    pitcherHand: els.mobilePaForm.elements.pitcherHand.value,
    pitchingForm: els.mobilePaForm.elements.pitchingForm.value,
    straightVelocity: els.mobilePaForm.elements.straightVelocity.value,
    breakingBall1: els.mobilePaForm.elements.breakingBall1.value,
    breakingBall2: els.mobilePaForm.elements.breakingBall2.value,
    breakingBall3: els.mobilePaForm.elements.breakingBall3.value,
    pitcherStrategy: els.mobilePaForm.elements.pitcherStrategy.value,
    pitcherVideoUrl: els.mobilePaForm.elements.pitcherVideoUrl.value,
  };
}

function pitcherBreakingBallChoicesForForm(form) {
  if (!form) return [];
  const choices = ["breakingBall1", "breakingBall2", "breakingBall3"]
    .map((name) => String(form.elements[name]?.value || "").trim())
    .filter((pitch) => pitch && pitch !== "ストレート");
  return [...new Set(choices)];
}

function pitchTypeChoicesForForm(form) {
  return ["ストレート", ...pitcherBreakingBallChoicesForForm(form)];
}

function syncPitchTypeOptionsForForm(form, preferredValue = form?.elements?.pitchType?.value || "") {
  const select = form?.elements?.pitchType;
  if (!select) return;

  const choices = pitchTypeChoicesForForm(form);
  const selectedValue = String(preferredValue || "").trim();
  select.innerHTML = [
    `<option value="">未選択</option>`,
    ...choices.map((pitch) => `<option>${escapeHtml(pitch)}</option>`),
  ].join("");
  select.value = choices.includes(selectedValue) ? selectedValue : "";
}

function syncMobilePitchTypeOptions(preferredValue = els.mobilePaForm?.elements?.pitchType?.value || "") {
  syncPitchTypeOptionsForForm(els.mobilePaForm, preferredValue);
}

function syncPcPitchTypeOptions(preferredValue = els.paForm?.elements?.pitchType?.value || "") {
  syncPitchTypeOptionsForForm(els.paForm, preferredValue);
}

function clearMobilePlateAppearanceFields(options = {}) {
  if (!els.mobilePaForm) return;
  const gameId = els.mobilePaForm.elements.gameId.value;
  const slot = els.mobilePaForm.elements.plateAppearance.value;
  const pitcherValues = options.preservePitcher ? mobilePitcherFieldValues() : null;

  els.mobilePaForm.reset();
  setFieldValue(els.mobilePaForm, "gameId", gameId);
  setMobileChoice("plateAppearance", slot);
  setFieldValue(els.mobilePaForm, "rbi", 0);
  setFieldValue(els.mobilePaForm, "risp", false);
  setFieldValue(els.mobilePaForm, "stolenBase", "なし");
  setFieldValue(els.mobilePaForm, "runners", "ランナーなし");
  setFieldValue(els.mobilePaForm, "sign", "なし");
  setFieldValue(els.mobilePaForm, "runScored", "0");
  setMobileChoice("result", "");
  setMobileChoice("course", "");
  setMobileChoice("battedDirection", "");
  setMobileChoice("battedType", "");
  if (pitcherValues) setMobilePitcherFields(pitcherValues);
  syncMobilePitchTypeOptions();
  syncMobileRunnerOptions();
  syncMobileBattedBallFields();
}

function fillMobilePlateAppearanceForm(pa) {
  if (!els.mobilePaForm || !pa) return;
  const breakingBalls = breakingBallsForPa(pa);
  setFieldValue(els.mobilePaForm, "gameId", pa.gameId || "");
  setMobileChoice("plateAppearance", plateAppearanceSlot(pa));
  setFieldValue(els.mobilePaForm, "rbi", Number(pa.rbi) || 0);
  setFieldValue(els.mobilePaForm, "risp", pa.risp);
  syncMobileRunnerOptions();
  setFieldValue(els.mobilePaForm, "runners", pa.runners || "ランナーなし");
  setFieldValue(els.mobilePaForm, "sign", pa.sign || "なし");
  setFieldValue(els.mobilePaForm, "stolenBase", pa.stolenBase || "なし");
  setFieldValue(els.mobilePaForm, "runScored", String(pa.runScored ?? 0));
  setMobileChoice("result", resultForForm(pa));
  setFieldValue(els.mobilePaForm, "pitcherName", pa.pitcherName || "");
  setFieldValue(els.mobilePaForm, "pitcherNumber", pa.pitcherNumber || "");
  setFieldValue(els.mobilePaForm, "pitcherHand", pa.pitcherHand || "");
  setFieldValue(els.mobilePaForm, "pitchingForm", pa.pitchingForm || "");
  setFieldValue(els.mobilePaForm, "straightVelocity", pa.straightVelocity || "");
  setFieldValue(els.mobilePaForm, "breakingBall1", breakingBalls[0] || "");
  setFieldValue(els.mobilePaForm, "breakingBall2", breakingBalls[1] || "");
  setFieldValue(els.mobilePaForm, "breakingBall3", breakingBalls[2] || "");
  syncMobilePitchTypeOptions(pa.pitchType || "");
  setFieldValue(els.mobilePaForm, "count", normalizeCountLabel(pa.count));
  setMobileChoice("course", pa.course || "");

  if (!skipsBattedBall(pa.result)) {
    setMobileChoice("battedDirection", normalizeBattedDirection(pa.battedDirection));
    setMobileChoice("battedType", battedTypeForForm(pa));
  }

  setFieldValue(els.mobilePaForm, "memo", pa.memo || "");
  setFieldValue(els.mobilePaForm, "pitcherStrategy", pitcherStrategyText(pitcherProfileKey(pa)));
  setFieldValue(els.mobilePaForm, "pitcherVideoUrl", pitcherVideoUrl(pitcherProfileKey(pa)));
  syncMobileChoiceButtons();
  syncMobileRunnerOptions();
  syncMobileBattedBallFields();
}

function renderMobileEditState() {
  if (!els.mobilePaSubmitButton) return;
  els.mobilePaSubmitButton.textContent = mobileEditingPaId ? "上書きして次の打席" : "保存して次の打席";
}

function syncMobilePlateAppearanceSelection(options = {}) {
  if (!els.mobilePaForm) return null;
  const gameId = els.mobilePaForm.elements.gameId.value;
  const slot = els.mobilePaForm.elements.plateAppearance.value;
  const pa = findPlateAppearanceForGameSlot(gameId, slot);

  if (pa) {
    mobileEditingPaId = pa.id;
    fillMobilePlateAppearanceForm(pa);
  } else {
    mobileEditingPaId = "";
    if (options.clearWhenEmpty) {
      clearMobilePlateAppearanceFields({ preservePitcher: options.preservePitcherWhenEmpty !== false });
    }
  }

  renderMobileGameSummary();
  renderMobileEditState();
  return pa;
}

function resetMobilePlateAppearanceForm(options = {}) {
  if (!els.mobilePaForm) return;
  const selectedGame = options.gameId || els.mobileGameSelect?.value || sortedGames()[0]?.id || "";
  const selectedSlot = options.plateAppearance || nextPlateAppearanceForGame(selectedGame);
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
        pitcherVideoUrl: els.mobilePaForm.elements.pitcherVideoUrl.value,
      }
    : null;

  els.mobilePaForm.reset();
  if (selectedGame) setFieldValue(els.mobilePaForm, "gameId", selectedGame);
  setFieldValue(els.mobilePaForm, "rbi", 0);
  setFieldValue(els.mobilePaForm, "stolenBase", "なし");
  setFieldValue(els.mobilePaForm, "runners", "ランナーなし");
  setFieldValue(els.mobilePaForm, "sign", "なし");
  setMobileChoice("plateAppearance", selectedSlot);
  setFieldValue(els.mobilePaForm, "runScored", "0");
  setMobileChoice("result", "");
  setMobileChoice("course", "");
  setMobileChoice("battedDirection", "");
  setMobileChoice("battedType", "");
  mobileEditingPaId = "";

  if (previousPa) {
    fillMobilePitcherFromPa(previousPa);
  } else if (pitcherValues) {
    setMobilePitcherFields(pitcherValues);
  }

  syncMobilePitchTypeOptions();
  renderMobileGameSummary();
  syncMobileChoiceButtons();
  syncMobileRunnerOptions();
  syncMobileBattedBallFields();
  syncMobilePlateAppearanceSelection();
}

function saveMobileGameFromRegistration() {
  if (!els.mobilePaForm) return false;

  if (!els.mobilePaForm.reportValidity()) {
    showValidationFailure("スマホ入力で試合を保存できませんでした");
    return false;
  }

  const existingGame = mobileEditingGameId ? getGame(mobileEditingGameId) : null;
  if (mobileEditingGameId && !existingGame) {
    showToast("更新する試合が見つかりません");
    mobileEditingGameId = "";
    renderMobileGameSelect();
    return false;
  }

  const game = gameFromForm(els.mobilePaForm, existingGame);
  selectedMemoGameId = game.id;
  selectedEntryGameId = game.id;

  const saved = commitState(
    {
      games: existingGame
        ? state.games.map((item) => item.id === game.id ? game : item)
        : [...state.games, game],
      plateAppearances: [...state.plateAppearances],
    },
    existingGame ? "スマホ入力で試合を更新しました" : "スマホ入力で試合を保存しました",
    existingGame ? "スマホ試合更新" : "スマホ試合保存",
  );

  if (!saved) return false;

  mobileEditingGameId = "";
  resetMobileGameRegistrationFields();
  resetMobilePlateAppearanceForm({ gameId: game.id });
  renderMobileGameSelect();
  renderMobilePitcherPresets();
  syncPitcherStrategyField(els.mobilePaForm);
  els.mobilePaForm.querySelector(".mobile-result-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function startMobileGameEdit(gameId) {
  if (!isTabAvailable("mobile")) {
    showToast(unavailableTabMessage("mobile"));
    return;
  }

  const game = getGame(gameId);
  if (!game) {
    showToast("編集する試合が見つかりません");
    return;
  }

  mobileEditingGameId = gameId;
  mobileEditingPaId = "";
  selectedMemoGameId = gameId;
  selectedEntryGameId = gameId;
  switchTab("mobile");
  renderMobileGameSelect();
  setFieldValue(els.mobilePaForm, "gameId", gameId);
  fillMobileGameRegistrationFields(game);
  syncMobileGameMode();
  renderMobileGameSummary();
  renderMobilePitcherPresets();
  els.mobileGameSelect?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelGameEdit() {
  editingGameId = "";
  resetGameForm();
  renderEditState();
}

function deleteGameById(gameId) {
  const game = getGame(gameId);
  if (!game) {
    showToast("削除する試合が見つかりません");
    return false;
  }

  const ok = window.confirm(`${gameTitle(game)} を削除しますか？関連する打席も削除されます。`);
  if (!ok) return false;

  const wasPcEditingGame = editingGameId === gameId;
  const wasMobileEditingGame = mobileEditingGameId === gameId;
  const affectedPcPlateAppearance = editingPaId && getPlateAppearance(editingPaId)?.gameId === gameId;
  const affectedMobilePlateAppearance = mobileEditingPaId && getPlateAppearance(mobileEditingPaId)?.gameId === gameId;
  const previousEditState = {
    editingGameId,
    mobileEditingGameId,
    editingPaId,
    mobileEditingPaId,
    selectedMemoGameId,
    selectedEntryGameId,
  };

  if (wasPcEditingGame) editingGameId = "";
  if (wasMobileEditingGame) mobileEditingGameId = "";
  if (affectedPcPlateAppearance) editingPaId = "";
  if (affectedMobilePlateAppearance) mobileEditingPaId = "";
  if (selectedMemoGameId === gameId) selectedMemoGameId = "";
  if (selectedEntryGameId === gameId) selectedEntryGameId = "";

  const saved = commitState(
    {
      games: state.games.filter((item) => item.id !== gameId),
      plateAppearances: state.plateAppearances.filter((item) => item.gameId !== gameId),
    },
    "試合を削除しました",
    "試合削除",
  );

  if (!saved) {
    editingGameId = previousEditState.editingGameId;
    mobileEditingGameId = previousEditState.mobileEditingGameId;
    editingPaId = previousEditState.editingPaId;
    mobileEditingPaId = previousEditState.mobileEditingPaId;
    selectedMemoGameId = previousEditState.selectedMemoGameId;
    selectedEntryGameId = previousEditState.selectedEntryGameId;
    renderEditState();
    syncMobileGameMode();
    return false;
  }

  if (wasPcEditingGame) {
    resetGameForm();
    renderEditState();
  }

  if (wasMobileEditingGame) {
    resetMobileGameRegistrationFields();
    renderMobileGameSelect();
    renderMobilePitcherPresets();
    syncPitcherStrategyField(els.mobilePaForm);
  }

  return true;
}

function cancelPlateAppearanceEdit() {
  editingPaId = "";
  resetPlateAppearanceForm();
  renderEditState();
}

function fillGameForm(game) {
  setFieldValue(els.gameForm, "date", game.date || todayValue());
  setFieldValue(els.gameForm, "gameType", game.gameType || "");
  renderOpponentSelect(game.opponent || "");
  setFieldValue(els.gameForm, "opponent", game.opponent || "");
  setFieldValue(els.gameForm, "opponentClass", game.opponentClass || "");
  setFieldValue(els.gameForm, "ballpark", game.ballpark || "");
  setFieldValue(els.gameForm, "ownScore", game.ownScore);
  setFieldValue(els.gameForm, "opponentScore", game.opponentScore);
  setFieldValue(els.gameForm, "battingOrder", game.battingOrder || "");
  setFieldValue(els.gameForm, "position", game.position || "");
  setFieldValue(els.gameForm, "defenseMemo", game.defenseMemo || "");
  setFieldValue(els.gameForm, "opponentOrder", game.opponentOrder || "");
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
  setFieldValue(els.paForm, "result", resultForForm(pa));
  setFieldValue(els.paForm, "risp", pa.risp);
  syncRunnerOptions(els.paForm);
  setFieldValue(els.paForm, "runners", pa.runners || "ランナーなし");
  setFieldValue(els.paForm, "straightVelocity", pa.straightVelocity || "");
  setFieldValue(els.paForm, "breakingBall1", breakingBalls[0] || "");
  setFieldValue(els.paForm, "breakingBall2", breakingBalls[1] || "");
  setFieldValue(els.paForm, "breakingBall3", breakingBalls[2] || "");
  syncPcPitchTypeOptions(pa.pitchType || "");
  setFieldValue(els.paForm, "course", pa.course || "");
  setFieldValue(els.paForm, "count", normalizeCountLabel(pa.count));
  setFieldValue(els.paForm, "sign", pa.sign || "なし");
  setFieldValue(els.paForm, "battedDirection", normalizeBattedDirection(pa.battedDirection));
  setFieldValue(els.paForm, "battedType", battedTypeForForm(pa));
  setFieldValue(els.paForm, "stolenBase", pa.stolenBase || "なし");
  setFieldValue(els.paForm, "runScored", pa.runScored ?? 0);
  setFieldValue(els.paForm, "memo", pa.memo || "");
  setFieldValue(els.paForm, "pitcherStrategy", pitcherStrategyText(pitcherProfileKey(pa)));
  setFieldValue(els.paForm, "pitcherVideoUrl", pitcherVideoUrl(pitcherProfileKey(pa)));
  syncBattedBallFields();
  renderPcPitcherPresets();
}

function startGameEdit(gameId) {
  if (isPhoneLayout()) {
    startMobileGameEdit(gameId);
    return;
  }

  if (!isTabAvailable("entry")) {
    showToast(unavailableTabMessage("entry"));
    return;
  }

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
  if (!isTabAvailable("entry")) {
    showToast(unavailableTabMessage("entry"));
    return;
  }

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
  renderOpponentSelect();
  renderMobileOpponentSelect();
  renderGameSelect();
  renderPcPitcherPresets();
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

function tabExists(name) {
  return els.tabs.some((tab) => tab.dataset.tab === name);
}

function isTabAvailable(name) {
  if (!tabExists(name)) return false;
  if (name === "mobile") return isPhoneLayout();
  if (name === "entry") return !isPhoneLayout();
  return true;
}

function unavailableTabMessage(name) {
  if (name === "mobile") return "スマホ入力はスマホで表示されます";
  if (name === "entry") return "PC入力はPCで表示されます";
  return "";
}

function validTabName(name) {
  return isTabAvailable(name) ? name : "";
}

function syncDeviceTabVisibility() {
  els.tabs.forEach((tab) => {
    const available = isTabAvailable(tab.dataset.tab);
    tab.hidden = !available;
    tab.setAttribute("aria-hidden", String(!available));
  });

  const activeTab = els.tabs.find((tab) => tab.classList.contains("is-active"))?.dataset.tab;
  if (activeTab && !isTabAvailable(activeTab)) {
    switchTab("home", { persist: false, notifyUnavailable: false });
  }
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
  const unavailable = tabExists(name) && !isTabAvailable(name);
  if (unavailable && options.notifyUnavailable !== false) {
    showToast(unavailableTabMessage(name));
  }

  const tabName = validTabName(name) || "home";
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
  els.panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === `${tabName}Panel`));

  if (tabName === "home") {
    window.requestAnimationFrame(syncRecentGamesHeight);
  }

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

function opponentFromFormData(data) {
  const selectedOpponent = String(data.get("opponentSelect") || "").trim();
  if (selectedOpponent && selectedOpponent !== NEW_OPPONENT_VALUE) return selectedOpponent;
  return String(data.get("opponent") || "").trim();
}

function gameFromForm(form, existingGame = null) {
  const data = new FormData(form);
  const now = new Date().toISOString();
  return {
    id: existingGame?.id || createId("game"),
    date: data.get("date") || todayValue(),
    gameType: data.get("gameType") || "",
    opponent: opponentFromFormData(data),
    opponentClass: data.get("opponentClass") || "",
    ballpark: data.get("ballpark") || "",
    ownScore: data.get("ownScore") === "" ? "" : Number(data.get("ownScore")),
    opponentScore: data.get("opponentScore") === "" ? "" : Number(data.get("opponentScore")),
    battingOrder: data.get("battingOrder") || "",
    position: data.get("position") || "",
    defenseMemo: String(data.get("defenseMemo") || "").trim(),
    opponentOrder: String(data.get("opponentOrder") || "").trim(),
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

window.addEventListener("resize", () => {
  syncRecentGamesHeight();
  syncDeviceTabVisibility();
});

$$("[data-jump-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.jumpTab));
});

els.battedDirectionGrid?.addEventListener("click", (event) => {
  const button = event.target.closest(".batted-direction-mobile-toggle");
  if (!button || !els.battedDirectionGrid.contains(button)) return;
  setMobileBattedDirectionView(button.dataset.battedDirectionView);
});

els.statsSubTabs.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.statsSubTarget;
    setStatsSubPanel(button.classList.contains("is-active") ? "" : target);
  });
});

$$("[data-edit-selected-game]").forEach((button) => {
  button.addEventListener("click", () => {
    const game = selectedMemoGame();
    if (!game) {
      showToast("編集する試合がありません");
      return;
    }
    startGameEdit(game.id);
  });
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

els.opponentSelect.addEventListener("change", () => {
  if (els.opponentSelect.value === NEW_OPPONENT_VALUE) {
    els.opponentInput.value = "";
  }
  syncOpponentInputMode();
});

els.mobileOpponentSelect.addEventListener("change", () => {
  if (els.mobileOpponentSelect.value === NEW_OPPONENT_VALUE) {
    els.mobileOpponentInput.value = "";
  }
  syncOpponentInputMode(opponentControls("mobile"));
});

els.paForm.addEventListener("invalid", () => {
  showValidationFailure("打席を保存できませんでした");
}, true);

els.mobilePaForm.addEventListener("invalid", () => {
  const pitcherRegistration = els.mobilePaForm.querySelector(".mobile-pitcher-registration");
  if (!els.mobilePaForm.elements.pitcherName.value && pitcherRegistration) {
    pitcherRegistration.open = true;
  }
  showValidationFailure("スマホ入力を保存できませんでした");
}, true);

els.gameSelect.addEventListener("change", () => {
  editingPaId = "";
  renderPcPitcherPresets();
  syncPitcherStrategyField(els.paForm);
  renderEditState();
});

els.paForm.elements.result.addEventListener("change", syncBattedBallFields);
els.paForm.elements.plateAppearance.addEventListener("change", syncPcPlateAppearanceFromSlotSelection);
els.paForm.elements.risp.addEventListener("change", () => syncRunnerOptions(els.paForm));
els.mobilePaForm.elements.risp.addEventListener("change", syncMobileRunnerOptions);
bindPitcherStrategyLookup(els.paForm);
bindPitcherStrategyLookup(els.mobilePaForm);
["breakingBall1", "breakingBall2", "breakingBall3"].forEach((name) => {
  els.mobilePaForm.elements[name]?.addEventListener("change", () => syncMobilePitchTypeOptions());
  els.paForm.elements[name]?.addEventListener("change", () => syncPcPitchTypeOptions());
});

function syncPcPitcherPresetSelection() {
  syncPcPlateAppearanceFromPitcherSelection();
}

els.pcPitcherSelect.addEventListener("change", syncPcPitcherPresetSelection);
els.pcPitcherSelect.addEventListener("input", syncPcPitcherPresetSelection);

["pitcherName", "pitcherNumber"].forEach((name) => {
  els.paForm.elements[name].addEventListener("input", () => {
    if (els.pcPitcherSelect) els.pcPitcherSelect.value = "";
  });
});

els.mobileGameSelect.addEventListener("change", () => {
  const selectedValue = els.mobileGameSelect.value;
  if (mobileEditingGameId && selectedValue !== mobileEditingGameId) {
    mobileEditingGameId = "";
    resetMobileGameRegistrationFields();
  }

  if (els.mobileGameSelect.value === MOBILE_NEW_GAME_VALUE) {
    mobileEditingGameId = "";
    resetMobileGameRegistrationFields();
    syncMobileGameMode();
    renderMobileGameSummary();
    renderMobilePitcherPresets();
    syncPitcherStrategyField(els.mobilePaForm);
    return;
  }

  selectedEntryGameId = selectedValue;
  setMobileChoice("plateAppearance", nextPlateAppearanceForGame(selectedValue));
  syncMobileGameMode();
  renderMobileGameSummary();
  renderMobilePitcherPresets();
  syncPitcherStrategyField(els.mobilePaForm);
  syncMobilePlateAppearanceSelection({ clearWhenEmpty: true, preservePitcherWhenEmpty: false });
});

els.mobileGameSaveButton.addEventListener("click", saveMobileGameFromRegistration);
els.mobileGameDeleteButton.addEventListener("click", () => {
  if (!mobileEditingGameId) return;
  deleteGameById(mobileEditingGameId);
});

els.mobilePaForm.addEventListener("click", (event) => {
  const choiceButton = event.target.closest("[data-choice-name]");
  if (choiceButton) {
    setMobileChoice(choiceButton.dataset.choiceName, choiceButton.dataset.choiceValue);
    if (choiceButton.dataset.choiceName === "plateAppearance") {
      syncMobilePlateAppearanceSelection({ clearWhenEmpty: true });
    }
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

  const form = event.currentTarget;
  const existingPa = (editingPaId ? getPlateAppearance(editingPaId) : null)
    || findPlateAppearanceForGameSlot(form.elements.gameId.value, form.elements.plateAppearance.value);

  if (editingPaId && !existingPa) {
    showToast("更新する打席が見つかりません");
    cancelPlateAppearanceEdit();
    return;
  }

  const pa = plateAppearanceFromForm(form, existingPa);
  selectedEntryGameId = pa.gameId;
  const plateAppearanceState = existingPa
    ? {
        games: [...state.games],
        plateAppearances: state.plateAppearances.map((item) => item.id === existingPa.id ? pa : item),
      }
    : {
        games: [...state.games],
        plateAppearances: [...state.plateAppearances, pa],
      };
  const nextState = withPitcherStrategy(
    plateAppearanceState,
    pa,
    form.elements.pitcherStrategy.value,
    form.elements.pitcherVideoUrl.value,
  );

  if (commitState(nextState, existingPa ? "打席を更新しました" : "打席を保存しました", existingPa ? "打席更新" : "打席保存")) {
    editingPaId = "";
    resetPlateAppearanceForm();
    renderEditState();
  }
});

els.mobilePaForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (event.currentTarget.elements.gameId.value === MOBILE_NEW_GAME_VALUE || mobileEditingGameId) {
    saveMobileGameFromRegistration();
    return;
  }

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
  const existingPa = (mobileEditingPaId ? getPlateAppearance(mobileEditingPaId) : null)
    || findPlateAppearanceForGameSlot(form.elements.gameId.value, form.elements.plateAppearance.value);
  const pa = plateAppearanceFromForm(form, existingPa);
  selectedEntryGameId = pa.gameId;
  selectedPitcherKey = pitcherProfileKey(pa);

  const nextState = withPitcherStrategy(
    {
      games: [...state.games],
      plateAppearances: existingPa
        ? state.plateAppearances.map((item) => item.id === existingPa.id ? pa : item)
        : [...state.plateAppearances, pa],
    },
    pa,
    form.elements.pitcherStrategy.value,
    form.elements.pitcherVideoUrl.value,
  );

  const saved = existingPa
    ? commitState(nextState, "スマホ入力で打席を上書きしました", "スマホ打席更新")
    : commitState(nextState, "スマホ入力で打席を保存しました", "スマホ打席保存");

  if (saved) {
    mobileEditingPaId = "";
    resetMobilePlateAppearanceForm({ gameId: pa.gameId, previousPa: pa });
    switchTab("mobile");
  }
});

els.gameList?.addEventListener("click", (event) => {
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

  deleteGameById(button.dataset.deleteGame);
});

els.paList?.addEventListener("click", (event) => {
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
  if (mobileEditingPaId === paId) mobileEditingPaId = "";
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

els.pitcherOpponentFilter.addEventListener("change", () => {
  selectedPitcherOpponent = els.pitcherOpponentFilter.value;
  selectedPitcherKey = "";
  renderPitcherCards();
});

els.exportButton.addEventListener("click", exportData);
els.backupExportButton.addEventListener("click", exportLatestBackup);
els.restoreBackupButton.addEventListener("click", restoreLatestBackup);
els.deleteGameEditButton.addEventListener("click", () => {
  if (!editingGameId) return;
  deleteGameById(editingGameId);
});
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
setMobileBattedDirectionView("hit");
syncRunnerOptions(els.paForm);
syncBattedBallFields();
render();
setStatsSubPanel("");
syncMobilePitchTypeOptions();
syncPcPitchTypeOptions();
syncDeviceTabVisibility();
switchTab(initialTabName(), { persist: false });
initializeCloudSync();
registerAppWorker();
