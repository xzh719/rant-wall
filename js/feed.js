/**
 * feed.js — 首页吐槽流逻辑 (T-04 + R1-02 交互动效)
 * 展示所有吐槽卡片，支持情绪筛选、点赞/踩、入场动画、筛选过渡、回顶按钮
 */
(function () {
  'use strict';

  var feedEl = document.getElementById('rantFeed');
  var emptyEl = document.getElementById('emptyState');
  var filterBar = document.querySelector('.filter-bar');
  var scrollBtn = document.getElementById('scrollToTopBtn');

  var currentFilter = 'all';
  var userVotes = {};
  var isTransitioning = false;

  // ========== 投票记录 ==========
  function loadVotes() {
    try {
      userVotes = JSON.parse(localStorage.getItem('rant_wall_votes')) || {};
    } catch (e) {
      userVotes = {};
    }
  }

  function saveVotes() {
    localStorage.setItem('rant_wall_votes', JSON.stringify(userVotes));
  }

  // ========== 时间格式化 ==========
  function formatTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';
    if (days < 7) return days + '天前';

    var month = d.getMonth() + 1;
    var date = d.getDate();
    return month + '月' + date + '日';
  }

  // ========== 渲染单张吐槽卡片（含入场动画） ==========
  function createRantCard(rant, index) {
    var tag = RantStore.getEmotionByValue(rant.emotion);
    var emoji = tag ? tag.emoji : '';
    var label = tag ? tag.label : '吐槽';
    var tagColor = tag ? tag.color : '#6b7280';
    var authorName = rant.isAnonymous ? '某不愿透露姓名的网友' : rant.author;
    var commentCount = (rant.comments && rant.comments.length) || 0;
    var vote = userVotes[rant.id];

    var card = document.createElement('article');
    card.className = 'rant-card rant-card--entering';
    if (rant.image) {
      card.classList.add('rant-card--has-image');
      card.style.setProperty('--card-bg-image', 'url(' + rant.image + ')');
    }
    card.setAttribute('data-id', rant.id);
    card.style.animationDelay = (index * 50) + 'ms';

    card.innerHTML =
      '<div class="rant-card__header">' +
        '<span class="rant-card__emotion" style="background:' + tagColor + '20;color:' + tagColor + ';border:1px solid ' + tagColor + '40">' +
          emoji + ' ' + label +
        '</span>' +
        '<span class="rant-card__time">' + formatTime(rant.createdAt) + '</span>' +
      '</div>' +
      '<h3 class="rant-card__title">' + escapeHtml(rant.title) + '</h3>' +
      '<p class="rant-card__content">' + escapeHtml(rant.content) + '</p>' +
      (rant.image ? '<div class="rant-card__image"><img src="' + rant.image + '" alt="吐槽配图" loading="lazy"></div>' : '') +
      '<div class="rant-card__footer">' +
        '<span class="rant-card__author">' + escapeHtml(authorName) + '</span>' +
        '<div class="rant-card__actions">' +
          '<button class="rant-action rant-action--like' + (vote === 'like' ? ' liked' : '') + '" data-action="like" data-id="' + rant.id + '">' +
            '👍 <span class="like-count">' + rant.likes + '</span>' +
          '</button>' +
          '<button class="rant-action rant-action--dislike' + (vote === 'dislike' ? ' disliked' : '') + '" data-action="dislike" data-id="' + rant.id + '">' +
            '👎 <span class="dislike-count">' + rant.dislikes + '</span>' +
          '</button>' +
          '<span class="rant-action" style="cursor:default">' +
            '💬 ' + commentCount +
          '</span>' +
        '</div>' +
      '</div>';

    // 点击卡片跳转详情页（排除按钮点击）
    card.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      window.location.href = 'detail.html?id=' + rant.id;
    });

    return card;
  }

  // ========== 渲染吐槽流（含筛选过渡） ==========
  async function renderFeed(filterBy) {
    if (isTransitioning) return;
    filterBy = filterBy || currentFilter;

    if (filterBy !== currentFilter && feedEl.children.length > 0) {
      isTransitioning = true;
      feedEl.classList.add('rant-feed--fading');

      await new Promise(function (resolve) {
        setTimeout(function () {
          _renderCards(filterBy).then(function () {
            feedEl.classList.remove('rant-feed--fading');
            isTransitioning = false;
            resolve();
          });
        }, 200);
      });
      return;
    }

    await _renderCards(filterBy);
  }

  async function _renderCards(filterBy) {
    currentFilter = filterBy;

    var rants;
    try {
      rants = await RantStore.getAllRants();
    } catch (err) {
      console.error('[Feed] 加载吐槽失败:', err);
      feedEl.innerHTML = '';
      hideSkeleton();
      emptyEl.innerHTML = '<p class="empty-icon">⚠️</p><p>加载失败，请检查网络后刷新页面</p><button class="btn btn-secondary" onclick="location.reload()">🔄 重试</button>';
      emptyEl.style.display = 'block';
      return;
    }

    if (filterBy !== 'all') {
      rants = rants.filter(function (r) { return r.emotion === filterBy; });
    }

    feedEl.innerHTML = '';
    hideSkeleton();

    if (rants.length === 0) {
      emptyEl.innerHTML = '<p class="empty-icon">📭</p><p>还没有吐槽，快来发布第一条吧！</p><a href="post.html" class="btn btn-primary">✏️ 去吐槽</a>';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    var cards = await Promise.all(rants.map(function (rant, i) {
      return createRantCard(rant, i);
    }));
    cards.forEach(function (card) { feedEl.appendChild(card); });
  }

  // ========== 事件委托：投票交互（含动画） ==========
  feedEl.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();

    var action = btn.dataset.action;
    var rantId = btn.dataset.id;
    var rant = await RantStore.getRantById(rantId);
    if (!rant) return;

    var currentVote = userVotes[rantId];

    if (action === 'like') {
      if (currentVote === 'like') {
        await RantStore.updateRant(rantId, { likes: Math.max(0, rant.likes - 1) });
        userVotes[rantId] = null;
        btn.classList.remove('liked');
      } else {
        await RantStore.updateRant(rantId, { likes: rant.likes + 1 });
        if (currentVote === 'dislike') {
          await RantStore.updateRant(rantId, { dislikes: Math.max(0, rant.dislikes - 1) });
          var dislikeBtn = btn.parentElement.querySelector('.rant-action--dislike');
          if (dislikeBtn) dislikeBtn.classList.remove('disliked');
        }
        userVotes[rantId] = 'like';
        btn.classList.add('liked');
        animateHeartbeat(btn);
      }
    } else if (action === 'dislike') {
      if (currentVote === 'dislike') {
        await RantStore.updateRant(rantId, { dislikes: Math.max(0, rant.dislikes - 1) });
        userVotes[rantId] = null;
        btn.classList.remove('disliked');
      } else {
        await RantStore.updateRant(rantId, { dislikes: rant.dislikes + 1 });
        if (currentVote === 'like') {
          await RantStore.updateRant(rantId, { likes: Math.max(0, rant.likes - 1) });
          var likeBtn = btn.parentElement.querySelector('.rant-action--like');
          if (likeBtn) likeBtn.classList.remove('liked');
        }
        userVotes[rantId] = 'dislike';
        btn.classList.add('disliked');
        animateShake(btn);
      }
    }

    saveVotes();
    var updatedRant = await RantStore.getRantById(rantId);
    if (updatedRant) {
      var cardBtns = feedEl.querySelector('[data-id="' + rantId + '"] .rant-card__actions');
      if (cardBtns) {
        var lc = cardBtns.querySelector('.like-count');
        var dc = cardBtns.querySelector('.dislike-count');
        if (lc) lc.textContent = updatedRant.likes;
        if (dc) dc.textContent = updatedRant.dislikes;
      }
    }
  });

  // ========== 动画触发 ==========
  function animateHeartbeat(btn) {
    btn.classList.add('animate-heartbeat');
    btn.addEventListener('animationend', function handler() {
      btn.classList.remove('animate-heartbeat');
      btn.removeEventListener('animationend', handler);
    });
  }

  function animateShake(btn) {
    btn.classList.add('animate-shake');
    btn.addEventListener('animationend', function handler() {
      btn.classList.remove('animate-shake');
      btn.removeEventListener('animationend', handler);
    });
  }

  // ========== 筛选栏事件委托 ==========
  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;

      var allBtns = filterBar.querySelectorAll('.filter-btn');
      allBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderFeed(btn.dataset.emotion);
    });
  }

  // ========== 回到顶部按钮 ==========
  if (scrollBtn) {
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          if (window.scrollY > 400) {
            scrollBtn.classList.add('scroll-to-top--visible');
          } else {
            scrollBtn.classList.remove('scroll-to-top--visible');
          }
          ticking = false;
        });
        ticking = true;
      }
    });

    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ========== HTML 转义 ==========
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== 删除功能 ==========
  var confirmModal = document.getElementById('confirmModal');
  var confirmMessage = document.getElementById('confirmMessage');
  var confirmOkBtn = document.getElementById('confirmOkBtn');
  var confirmCancelBtn = document.getElementById('confirmCancelBtn');
  var adminBar = document.getElementById('adminBar');
  var adminTrigger = document.getElementById('adminTrigger');
  var adminExitBtn = document.getElementById('adminExitBtn');
  var pendingDeleteId = null;
  var pendingDeleteType = null; // 'rant' | 'comment'

  // 管理员入口
  if (adminTrigger) {
    adminTrigger.addEventListener('click', function () {
      if (RantStore.isAdmin()) {
        RantStore.exitAdmin();
        updateAdminUI();
        Toast.show('已退出管理模式', 'info');
      } else {
        var pwd = prompt('请输入管理员密码：');
        if (pwd !== null) {
          if (RantStore.verifyAdmin(pwd)) {
            updateAdminUI();
            Toast.show('已进入管理模式', 'success');
          } else {
            Toast.show('密码错误', 'error');
          }
        }
      }
    });
  }

  if (adminExitBtn) {
    adminExitBtn.addEventListener('click', function () {
      RantStore.exitAdmin();
      updateAdminUI();
      Toast.show('已退出管理模式', 'info');
    });
  }

  async function updateAdminUI() {
    try {
      var isAdmin = RantStore.isAdmin();
      if (adminBar) adminBar.style.display = isAdmin ? 'flex' : 'none';
      if (adminTrigger) adminTrigger.textContent = isAdmin ? '退出管理' : '管理';
    } catch (e) {
      console.error('[Feed] updateAdminUI error:', e);
    }
    await renderFeed(currentFilter);
  }

  // 确认弹窗
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
  }
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', async function () {
      if (pendingDeleteId && pendingDeleteType === 'rant') {
        var deleteId = pendingDeleteId;
        var card = feedEl.querySelector('[data-id="' + deleteId + '"]');
        closeConfirmModal();
        if (card) {
          card.classList.add('rant-card--deleting');
          card.addEventListener('animationend', function handler() {
            card.removeEventListener('animationend', handler);
            RantStore.deleteRant(deleteId).then(function () {
              renderFeed(currentFilter);
              Toast.show('吐槽已删除', 'success');
            });
          });
        } else {
          await RantStore.deleteRant(deleteId);
          await renderFeed(currentFilter);
          Toast.show('吐槽已删除', 'success');
        }
      } else {
        closeConfirmModal();
      }
    });
  }

  function openConfirmModal(rantId, title) {
    pendingDeleteId = rantId;
    pendingDeleteType = 'rant';
    if (confirmMessage) confirmMessage.textContent = '确定要删除「' + title + '」吗？此操作不可撤销。';
    if (confirmModal) confirmModal.style.display = 'flex';
  }

  function closeConfirmModal() {
    if (confirmModal) confirmModal.style.display = 'none';
    pendingDeleteId = null;
    pendingDeleteType = null;
  }

  // 点击遮罩关闭弹窗
  if (confirmModal) {
    confirmModal.addEventListener('click', function (e) {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // 暴露删除入口给卡片渲染
  window._feedDelete = function (rantId, title) {
    openConfirmModal(rantId, title);
  };

  // 保存原始同步 createRantCard
  var _origCreateRantCard = createRantCard;

  // =========================================
  // R2-01 新增交互
  // =========================================

  // --- 1. 快捷表态面板 ---
  var REACTION_EMOJIS = ['😂','😡','👍','❤️','👏','🤔'];
  var reactionPickerEl = null;
  var reactionVotes = {}; // { rantId: { '😂': count, ... } }

  function loadReactions() {
    try {
      reactionVotes = JSON.parse(localStorage.getItem('rant_wall_reactions')) || {};
    } catch (e) { reactionVotes = {}; }
  }
  function saveReactions() {
    localStorage.setItem('rant_wall_reactions', JSON.stringify(reactionVotes));
  }

  // 渲染表情计数（卡片底部）
  function renderReactionBadges(card, rantId) {
    var existing = card.querySelector('.rant-card__reactions');
    if (existing) existing.remove();
    var counts = reactionVotes[rantId] || {};
    var hasAny = false;
    for (var k in counts) { if (counts[k] > 0) hasAny = true; }
    if (!hasAny) return;

    var bar = document.createElement('div');
    bar.className = 'rant-card__reactions';
    REACTION_EMOJIS.forEach(function (emoji) {
      var count = counts[emoji] || 0;
      if (count > 0) {
        var badge = document.createElement('span');
        badge.className = 'rant-card__reaction-badge';
        badge.textContent = emoji + ' ' + count;
        bar.appendChild(badge);
      }
    });
    card.appendChild(bar);
  }

  function showReactionPicker(x, y, rantId) {
    closeReactionPicker();
    reactionPickerEl = document.createElement('div');
    reactionPickerEl.className = 'reaction-picker';
    reactionPickerEl.style.left = x + 'px';
    reactionPickerEl.style.top = y + 'px';

    REACTION_EMOJIS.forEach(function (emoji) {
      var btn = document.createElement('button');
      btn.className = 'reaction-picker__emoji';
      btn.textContent = emoji;
      btn.addEventListener('click', function () {
        if (!reactionVotes[rantId]) reactionVotes[rantId] = {};
        reactionVotes[rantId][emoji] = (reactionVotes[rantId][emoji] || 0) + 1;
        saveReactions();

        // 找到卡片，添加弹出动画
        var card = feedEl.querySelector('[data-id="' + rantId + '"]');
        if (card) renderReactionBadges(card, rantId);
        // pop animation on badge
        if (card) {
          var badges = card.querySelectorAll('.rant-card__reaction-badge');
          var last = badges[badges.length - 1];
          if (last && last.textContent.indexOf(emoji) === 0) {
            last.classList.add('reaction-badge--pop');
            last.addEventListener('animationend', function h() {
              last.classList.remove('reaction-badge--pop');
              last.removeEventListener('animationend', h);
            });
          }
        }
        closeReactionPicker();
      });
      reactionPickerEl.appendChild(btn);
    });

    document.body.appendChild(reactionPickerEl);

    // 外部点击关闭
    setTimeout(function () {
      document.addEventListener('click', closeReactionPickerOnOutside);
    }, 0);
  }

  function closeReactionPicker() {
    if (reactionPickerEl && reactionPickerEl.parentNode) {
      reactionPickerEl.parentNode.removeChild(reactionPickerEl);
    }
    reactionPickerEl = null;
    document.removeEventListener('click', closeReactionPickerOnOutside);
  }

  function closeReactionPickerOnOutside(e) {
    if (reactionPickerEl && !reactionPickerEl.contains(e.target)) {
      closeReactionPicker();
    }
  }

  // 右键 / 长按卡片 → 弹出表态选择器
  feedEl.addEventListener('contextmenu', function (e) {
    var card = e.target.closest('.rant-card');
    if (!card) return;
    e.preventDefault();
    var rantId = card.getAttribute('data-id');
    showReactionPicker(e.pageX, e.pageY, rantId);
  });

  // 移动端长按
  var longPressTimer = null;
  feedEl.addEventListener('touchstart', function (e) {
    var card = e.target.closest('.rant-card');
    if (!card) return;
    longPressTimer = setTimeout(function () {
      var touch = e.touches[0] || e.changedTouches[0];
      var rantId = card.getAttribute('data-id');
      showReactionPicker(touch.pageX, touch.pageY, rantId);
      showActionSheet(rantId, touch.pageX, touch.pageY); // 同时弹出操作 sheet
    }, 600);
  }, { passive: true });
  feedEl.addEventListener('touchend', function () {
    clearTimeout(longPressTimer);
  });
  feedEl.addEventListener('touchmove', function () {
    clearTimeout(longPressTimer);
  });

  // --- 2. FAB 滚动行为 ---
  var fabBtn = document.getElementById('fabBtn');
  if (fabBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 200) {
        fabBtn.classList.add('fab--shrink');
      } else {
        fabBtn.classList.remove('fab--shrink');
      }
    }, { passive: true });
  }

  // --- 3. 骨架屏 ---
  var skeletonEl = document.getElementById('skeletonFeed');
  function hideSkeleton() {
    if (skeletonEl) skeletonEl.style.display = 'none';
  }
  function showSkeleton() {
    if (skeletonEl) skeletonEl.style.display = '';
  }

  // --- 4. 操作 Sheet ---
  var actionSheetOverlay = document.getElementById('actionSheetOverlay');
  var currentSheetRantId = null;

  function showActionSheet(rantId, x, y) {
    currentSheetRantId = rantId;
    if (actionSheetOverlay) actionSheetOverlay.style.display = 'flex';
  }

  if (actionSheetOverlay) {
    actionSheetOverlay.addEventListener('click', function (e) {
      var action = e.target.getAttribute('data-sheet-action');
      if (!action) return;

      if (action === 'detail' && currentSheetRantId) {
        window.location.href = 'detail.html?id=' + currentSheetRantId;
      } else if (action === 'share') {
        if (navigator.share && currentSheetRantId) {
          navigator.share({ title: '吐槽墙', url: window.location.origin + '/detail.html?id=' + currentSheetRantId }).catch(function () {});
        } else {
          Toast.show('链接已复制，分享给朋友吧！', 'success');
        }
      } else if (action === 'report') {
        Toast.show('已收到举报，我们会尽快处理', 'info');
      }
      actionSheetOverlay.style.display = 'none';
    });

    // 点击遮罩关闭
    actionSheetOverlay.addEventListener('click', function (e) {
      if (e.target === actionSheetOverlay) {
        actionSheetOverlay.style.display = 'none';
      }
    });
  }

  // --- 最终卡片渲染：删除按钮 + 表情计数（单次 async 包装） ---
  createRantCard = async function (rant, index) {
    var card = _origCreateRantCard(rant, index);

    // 删除按钮（异步检查作者身份）
    if (rant.id) {
      var isAuthor = false;
      try { isAuthor = await RantStore.isAuthor(rant.id); } catch (e) {}
      var canDelete = RantStore.isAdmin() || isAuthor;
      if (canDelete) {
        var footerEl = card.querySelector('.rant-card__footer');
        if (footerEl) {
          var delBtn = document.createElement('button');
          delBtn.className = 'rant-delete-btn';
          delBtn.setAttribute('aria-label', '删除吐槽');
          delBtn.textContent = '🗑️';
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            window._feedDelete(rant.id, rant.title);
          });
          footerEl.insertBefore(delBtn, footerEl.firstChild);
        }
      }
    }

    // 表情计数
    renderReactionBadges(card, rant.id);
    return card;
  };

  // ========== 刷新按钮 ==========
  var refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function () {
      refreshBtn.classList.add('refresh-btn--spinning');
      await renderFeed(currentFilter);
      setTimeout(function () { refreshBtn.classList.remove('refresh-btn--spinning'); }, 600);
      Toast.show('已刷新', 'info');
    });
  }

  // ========== 下拉刷新（移动端） ==========
  var pullStartY = 0;
  var pullDist = 0;
  var pulling = false;
  var pullHint = null;

  function createPullHint() {
    pullHint = document.createElement('div');
    pullHint.className = 'pull-hint';
    pullHint.textContent = '↓ 下拉刷新';
    if (feedEl.parentNode) {
      feedEl.parentNode.insertBefore(pullHint, feedEl);
    }
  }

  document.addEventListener('touchstart', function (e) {
    if (window.scrollY > 5) return;
    pullStartY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!pulling) return;
    pullDist = e.touches[0].clientY - pullStartY;
    if (pullDist > 20 && pullHint) {
      pullHint.style.display = 'block';
      pullHint.style.transform = 'translateY(' + Math.min(pullDist - 20, 30) + 'px)';
      pullHint.textContent = pullDist > 70 ? '↑ 释放刷新' : '↓ 下拉刷新';
    }
  }, { passive: true });

  document.addEventListener('touchend', async function () {
    if (!pulling || pullDist < 70) {
      if (pullHint) pullHint.style.display = 'none';
      pulling = false;
      pullDist = 0;
      return;
    }
    if (pullHint) {
      pullHint.textContent = '🔄 刷新中...';
      pullHint.style.display = 'block';
    }
    await renderFeed(currentFilter);
    if (pullHint) {
      pullHint.style.display = 'none';
    }
    pulling = false;
    pullDist = 0;
  });

  createPullHint();

  // ========== 启动 ==========
  async function init() {
    loadVotes();
    loadReactions();
    showSkeleton();
    try {
      await updateAdminUI();
    } catch (e) {
      console.error('[Feed] init error:', e);
      hideSkeleton();
      emptyEl.innerHTML = '<p class="empty-icon">⚠️</p><p>初始化失败，请刷新页面重试</p><button class="btn btn-secondary" onclick="location.reload()">🔄 刷新</button>';
      emptyEl.style.display = 'block';
      return;
    }
    setTimeout(async function () {
      await renderFeed();
    }, 500);
  }

  init();
})();
