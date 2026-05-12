/**
 * app.js — 吐槽墙全局数据管理 & 路由模块
 * Bmob 云数据库 + localStorage 降级双模式
 * - Bmob SDK 可用 → 云数据库，多用户共享
 * - Bmob 不可用 → localStorage 本地存储，单机可用
 */

const RantStore = (() => {
  const NICKNAME_KEY = 'rant_wall_nickname';
  const RANTS_KEY = 'rant_wall_rants';

  // ========== Bmob 初始化（安全） ==========
  var bmobReady = false;
  (function _initBmob() {
    try {
      if (typeof Bmob === 'undefined') {
        console.warn('[RantStore] Bmob SDK 未加载，启用本地存储模式');
        return;
      }
      Bmob.initialize('3c28d089ecd589d71812d703080f101c', 'fa41e0c40097dc5890376251a0c021b1');
      bmobReady = true;
      console.log('[RantStore] Bmob 已连接');
    } catch (e) {
      console.warn('[RantStore] Bmob 初始化失败: ' + e.message + '，启用本地存储模式');
    }
  })();

  // ========== localStorage 降级方案 ==========
  function _local_getAll() {
    try { return JSON.parse(localStorage.getItem(RANTS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _local_saveAll(rants) {
    localStorage.setItem(RANTS_KEY, JSON.stringify(rants));
  }

  // ========== Bmob 记录 → 本地格式 ==========
  function _fromBmob(record) {
    var attrs = record.attributes || record;
    return {
      id: record.id || record.objectId,
      emotion: attrs.emotion,
      title: attrs.title,
      content: attrs.content,
      author: attrs.author || '',
      isAnonymous: attrs.isAnonymous || false,
      authorToken: attrs.authorToken || '',
      image: attrs.image || null,
      likes: attrs.likes || 0,
      dislikes: attrs.dislikes || 0,
      comments: attrs.comments || [],
      reactions: attrs.reactions || {},
      createdAt: (new Date(attrs.createdAt || Date.now())).getTime()
    };
  }

  // ========== 吐槽 CRUD ==========

  async function getAllRants() {
    if (bmobReady) {
      try {
        var query = Bmob.Query('Rant');
        query.order('-createdAt');
        var res = await query.find();
        return res.map(function (r) { return _fromBmob(r); });
      } catch (e) {
        console.warn('[getAllRants] Bmob 请求失败: ' + e.message + '，降级');
        bmobReady = false;
      }
    }
    var rants = _local_getAll();
    return rants.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }

  async function getRantById(id) {
    if (bmobReady) {
      try {
        var query = Bmob.Query('Rant');
        var record = await query.get(id);
        return record ? _fromBmob(record) : null;
      } catch (e) {
        console.warn('[getRantById] Bmob 请求失败: ' + e.message + '，降级');
        bmobReady = false;
      }
    }
    var rants = _local_getAll();
    var found = rants.filter(function (r) { return r.id === id; });
    return found.length > 0 ? found[0] : null;
  }

  async function addRant(data) {
    var authorName = data.isAnonymous ? '某不愿透露姓名的网友' : (data.author || '匿名用户');
    if (bmobReady) {
      try {
        var query = Bmob.Query('Rant');
        query.set('title', data.title);
        query.set('content', data.content);
        query.set('emotion', data.emotion);
        query.set('author', authorName);
        query.set('isAnonymous', !!data.isAnonymous);
        query.set('authorToken', getAuthorToken());
        query.set('image', data.image || '');
        query.set('likes', 0);
        query.set('dislikes', 0);
        query.set('comments', []);
        query.set('reactions', {});
        var res = await query.save();
        return _fromBmob(res);
      } catch (e) {
        console.warn('[addRant] Bmob 请求失败: ' + e.message + '，降级');
        bmobReady = false;
      }
    }
    var rants = _local_getAll();
    var newRant = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
      emotion: data.emotion,
      title: data.title,
      content: data.content,
      author: authorName,
      isAnonymous: !!data.isAnonymous,
      authorToken: getAuthorToken(),
      image: data.image || null,
      likes: 0,
      dislikes: 0,
      comments: [],
      reactions: {},
      createdAt: Date.now()
    };
    rants.unshift(newRant);
    _local_saveAll(rants);
    return newRant;
  }

  async function updateRant(id, patch) {
    if (bmobReady) {
      try {
        var rant = await getRantById(id);
        if (!rant) return null;
        var query = Bmob.Query('Rant');
        Object.keys(patch).forEach(function (key) {
          query.set(key, patch[key]);
        });
        await query.update(id);
        return await getRantById(id);
      } catch (e) {
        console.warn('[updateRant] Bmob 请求失败: ' + e.message + '，降级');
        bmobReady = false;
      }
    }
    var rants = _local_getAll();
    var idx = -1;
    for (var i = 0; i < rants.length; i++) {
      if (rants[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return null;
    Object.keys(patch).forEach(function (key) {
      rants[idx][key] = patch[key];
    });
    _local_saveAll(rants);
    return rants[idx];
  }

  async function deleteRant(id) {
    if (bmobReady) {
      try {
        var query = Bmob.Query('Rant');
        await query.destroy(id);
        return;
      } catch (e) {
        console.warn('[deleteRant] Bmob 请求失败: ' + e.message + '，降级');
        bmobReady = false;
      }
    }
    var rants = _local_getAll();
    rants = rants.filter(function (r) { return r.id !== id; });
    _local_saveAll(rants);
  }

  // ========== 评论 CRUD ==========

  async function getComments(rantId) {
    var rant = await getRantById(rantId);
    if (!rant) return [];
    return (rant.comments || []).sort(function (a, b) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  async function addComment(rantId, data) {
    var rant = await getRantById(rantId);
    if (!rant) return null;

    var comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      content: data.content,
      author: data.isAnonymous ? '某不愿透露姓名的网友' : (data.author || '匿名用户'),
      isAnonymous: !!data.isAnonymous,
      createdAt: Date.now()
    };

    var newComments = (rant.comments || []).concat([comment]);
    await updateRant(rantId, { comments: newComments });
    return comment;
  }

  async function deleteComment(rantId, commentId) {
    var rant = await getRantById(rantId);
    if (!rant) return false;

    var comments = (rant.comments || []).filter(function (c) {
      return c.id !== commentId;
    });

    await updateRant(rantId, { comments: comments });
    return true;
  }

  // ========== 用户昵称管理（本地） ==========

  function getNickname() {
    return localStorage.getItem(NICKNAME_KEY) || '';
  }

  function setNickname(name) {
    localStorage.setItem(NICKNAME_KEY, name);
  }

  // ========== 情绪标签体系（对齐 Content T-01） ==========
  var EMOTION_TAGS = [
    { value: 'angry',       emoji: '😡', label: '愤怒',   color: '#C46B63' },
    { value: 'speechless',  emoji: '🙄', label: '无语',   color: '#909090' },
    { value: 'funny',       emoji: '😂', label: '搞笑',   color: '#D4954A' },
    { value: 'embarrassed', emoji: '😱', label: '社死',   color: '#C4687A' },
    { value: 'work',        emoji: '💼', label: '职场',   color: '#5B8DA8' },
    { value: 'life',        emoji: '🏠', label: '生活',   color: '#56A078' },
    { value: 'love',        emoji: '💔', label: '情感',   color: '#8E6DA0' },
    { value: 'rant',        emoji: '💬', label: '吐槽',   color: '#5BA090' }
  ];

  // ========== 自定义情绪标签管理（本地） ==========
  var CUSTOM_EMOTION_KEY = 'rant_wall_custom_emotions';

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

  // ========== 作者令牌管理（本地） ==========
  var AUTHOR_TOKEN_KEY = 'rant_wall_author_token';

  function getAuthorToken() {
    var token = localStorage.getItem(AUTHOR_TOKEN_KEY);
    if (!token) {
      token = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(AUTHOR_TOKEN_KEY, token);
    }
    return token;
  }

  async function isAuthor(rantId) {
    var rant = await getRantById(rantId);
    if (!rant || !rant.authorToken) return false;
    return rant.authorToken === getAuthorToken();
  }

  // ========== 管理员认证（本地） ==========
  var ADMIN_PASSWORD = 'admin123';
  var ADMIN_SESSION_KEY = 'rant_wall_admin';

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

  // ========== 导出 API ==========
  return {
    getAllRants: getAllRants,
    getRantById: getRantById,
    addRant: addRant,
    updateRant: updateRant,
    deleteRant: deleteRant,
    getComments: getComments,
    addComment: addComment,
    deleteComment: deleteComment,
    getNickname: getNickname,
    setNickname: setNickname,
    getEmotionTags: getEmotionTags,
    getEmotionByValue: getEmotionByValue,
    getCustomEmotions: getCustomEmotions,
    addCustomEmotion: addCustomEmotion,
    deleteCustomEmotion: deleteCustomEmotion,
    getAuthorToken: getAuthorToken,
    isAuthor: isAuthor,
    verifyAdmin: verifyAdmin,
    isAdmin: isAdmin,
    exitAdmin: exitAdmin
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
