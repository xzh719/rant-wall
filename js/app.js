/**
 * app.js — 吐槽墙全局数据管理 & 路由模块
 * 基于 localStorage 模拟后端 CRUD
 */

const RantStore = (() => {
  const STORAGE_KEY = 'rant_wall_data';
  const NICKNAME_KEY = 'rant_wall_nickname';

  // ========== 初始化 ==========
  function init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }

  function _readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function _writeAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ========== 吐槽 CRUD ==========

  function getAllRants() {
    return _readAll().sort((a, b) => b.createdAt - a.createdAt);
  }

  function getRantById(id) {
    return _readAll().find(r => r.id === id) || null;
  }

  function addRant({ emotion, title, content, author, isAnonymous, image }) {
    const rants = _readAll();

    // 检查 localStorage 可用空间（粗略估算，实际限制 ~5MB）
    const currentSize = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
    if (image && image.length > 0) {
      const imageSize = image.length * 0.75; // base64 → 原始字节估算
      if (currentSize + imageSize > 4.5 * 1024 * 1024) {
        // 超过 ~4.5MB 警告
        console.warn('Warning: localStorage nearing capacity limit');
      }
    }

    const rant = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      emotion,
      title,
      content,
      author: isAnonymous ? '某不愿透露姓名的网友' : (author || '匿名用户'),
      isAnonymous,
      authorToken: getAuthorToken(),
      image: image || null,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: Date.now()
    };
    rants.push(rant);
    _writeAll(rants);
    return rant;
  }

  function updateRant(id, patch) {
    const rants = _readAll();
    const idx = rants.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rants[idx] = { ...rants[idx], ...patch };
    _writeAll(rants);
    return rants[idx];
  }

  function deleteRant(id) {
    _writeAll(_readAll().filter(r => r.id !== id));
  }

  // ========== 评论 CRUD ==========

  function getComments(rantId) {
    const rant = getRantById(rantId);
    return rant ? rant.comments.sort((a, b) => a.createdAt - b.createdAt) : [];
  }

  function addComment(rantId, { content, author, isAnonymous }) {
    const rants = _readAll();
    const rant = rants.find(r => r.id === rantId);
    if (!rant) return null;

    const comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      rantId,
      content,
      author: isAnonymous ? '某不愿透露姓名的网友' : (author || '匿名用户'),
      isAnonymous,
      createdAt: Date.now()
    };

    rant.comments.push(comment);
    _writeAll(rants);
    return comment;
  }

  function deleteComment(rantId, commentId) {
    const rants = _readAll();
    const rant = rants.find(r => r.id === rantId);
    if (!rant) return false;
    rant.comments = rant.comments.filter(c => c.id !== commentId);
    _writeAll(rants);
    return true;
  }

  // ========== 用户昵称管理 ==========

  function getNickname() {
    return localStorage.getItem(NICKNAME_KEY) || '';
  }

  function setNickname(name) {
    localStorage.setItem(NICKNAME_KEY, name);
  }

  // ========== 情绪标签体系（对齐 Content T-01） ==========
  const EMOTION_TAGS = [
    { value: 'angry',       emoji: '😡', label: '愤怒',   color: '#C46B63' },
    { value: 'speechless',  emoji: '🙄', label: '无语',   color: '#909090' },
    { value: 'funny',       emoji: '😂', label: '搞笑',   color: '#D4954A' },
    { value: 'embarrassed', emoji: '😱', label: '社死',   color: '#C4687A' },
    { value: 'work',        emoji: '💼', label: '职场',   color: '#5B8DA8' },
    { value: 'life',        emoji: '🏠', label: '生活',   color: '#56A078' },
    { value: 'love',        emoji: '💔', label: '情感',   color: '#8E6DA0' },
    { value: 'rant',        emoji: '💬', label: '吐槽',   color: '#5BA090' }
  ];

  // ========== 自定义情绪标签管理 ==========
  const CUSTOM_EMOTION_KEY = 'rant_wall_custom_emotions';

  function getCustomEmotions() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_EMOTION_KEY)) || []; }
    catch (e) { return []; }
  }

  function addCustomEmotion(emotion) {
    var customs = getCustomEmotions();
    customs.push(emotion);
    localStorage.setItem(CUSTOM_EMOTION_KEY, JSON.stringify(customs));
  }

  function deleteCustomEmotion(index) {
    var customs = getCustomEmotions();
    customs.splice(index, 1);
    localStorage.setItem(CUSTOM_EMOTION_KEY, JSON.stringify(customs));
  }

  function getEmotionTags() {
    return EMOTION_TAGS.concat(getCustomEmotions());
  }

  function getEmotionByValue(value) {
    var all = getEmotionTags();
    return all.find(function (t) { return t.value === value; }) || EMOTION_TAGS[7];
  }

  // ========== 作者令牌管理 ==========
  const AUTHOR_TOKEN_KEY = 'rant_wall_author_token';

  function getAuthorToken() {
    var token = localStorage.getItem(AUTHOR_TOKEN_KEY);
    if (!token) {
      token = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(AUTHOR_TOKEN_KEY, token);
    }
    return token;
  }

  function isAuthor(rantId) {
    var rant = getRantById(rantId);
    if (!rant || !rant.authorToken) return false;
    return rant.authorToken === getAuthorToken();
  }

  // ========== 管理员认证 ==========
  const ADMIN_PASSWORD = 'admin123';
  const ADMIN_SESSION_KEY = 'rant_wall_admin';

  function verifyAdmin(password) {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      return true;
    }
    return false;
  }

  function isAdmin() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  }

  function exitAdmin() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  // ========== 修改 addRant 携带 authorToken ==========

  // ========== 初始化执行 ==========
  init();

  // ========== 导出 API ==========
  return {
    getAllRants,
    getRantById,
    addRant,
    updateRant,
    deleteRant,
    getComments,
    addComment,
    deleteComment,
    getNickname,
    setNickname,
    getEmotionTags,
    getEmotionByValue,
    getCustomEmotions,
    addCustomEmotion,
    deleteCustomEmotion,
    getAuthorToken,
    isAuthor,
    verifyAdmin,
    isAdmin,
    exitAdmin
  };
})();

/**
 * Toast 轻提示工具（全局共享）
 * 用法: Toast.show('发布成功！', 'success');
 */
var Toast = (function () {
  var container = null;

  function ensureContainer() {
    if (!container) {
      container = document.getElementById('toastContainer');
    }
    return container;
  }

  function show(message, type) {
    type = type || 'info';
    var ctn = ensureContainer();
    if (!ctn) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    ctn.appendChild(toast);

    // 2s 后自动消失
    setTimeout(function () {
      toast.classList.add('toast--hiding');
      toast.addEventListener('animationend', function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }, 2000);
  }

  return { show: show };
})();
