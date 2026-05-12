/**
 * detail.js — 吐槽详情页 + 评论区 (T-06 + R1-02 交互动效)
 * 完整展示吐槽内容、点赞/踩（含动画）、评论交互（含滑入动画）、Toast
 */
(function () {
  'use strict';

  window.addEventListener('error', function (e) {
    var rd = document.getElementById('rantDetail');
    if (rd) {
      rd.innerHTML = '<div class="empty-state"><p class="empty-icon">⚠️</p><p>' + (e.message || '页面出错') + '</p><button class="btn btn-secondary" onclick="location.reload()" style="margin-top:16px">🔄 重试</button></div>';
    }
  });

  var rantDetail = document.getElementById('rantDetail');
  var commentList = document.getElementById('commentList');
  var commentEmpty = document.getElementById('commentEmpty');
  var commentForm = document.getElementById('commentForm');
  var commentContent = document.getElementById('commentContent');
  var commentAnonymousToggle = document.getElementById('commentAnonymousToggle');

  // 从 URL 获取 rant ID
  var params = new URLSearchParams(window.location.search);
  var rantId = params.get('id');
  var rant = null;

  // 投票记录
  var userVotes = {};
  loadVotes();

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
    var diff = Date.now() - d;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';
    if (days < 7) return days + '天前';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== 渲染吐槽详情 ==========
  async function renderRantDetail() {
    // 刷新最新数据
    rant = await RantStore.getRantById(rantId);

    var tag = RantStore.getEmotionByValue(rant.emotion);
    var emoji = tag ? tag.emoji : '';
    var label = tag ? tag.label : '吐槽';
    var tagColor = tag ? tag.color : '#6b7280';
    var authorName = rant.isAnonymous ? '某不愿透露姓名的网友' : rant.author;
    var vote = userVotes[rant.id];

    // 图片模糊背景
    if (rant.image) {
      rantDetail.classList.add('rant-detail--has-image');
      rantDetail.style.setProperty('--card-bg-image', 'url(' + rant.image + ')');
    } else {
      rantDetail.classList.remove('rant-detail--has-image');
    }

    rantDetail.innerHTML = '\
      <div class="rant-detail__header">\
        <span class="rant-detail__emotion" style="background:' + tagColor + '20;color:' + tagColor + ';border:1px solid ' + tagColor + '40">\
          ' + emoji + ' ' + label + '\
        </span>\
        <span class="rant-detail__time">' + formatTime(rant.createdAt) + '</span>\
      </div>\
      <h1 class="rant-detail__title">' + escapeHtml(rant.title) + '</h1>\
      <div class="rant-detail__content">' + escapeHtml(rant.content) + '</div>\n	      ' + (rant.image ? '<div class="rant-detail__image"><img src="' + rant.image + '" alt="吐槽配图" class="rant-detail__img"></div>' : '') + '\
      <div class="rant-detail__footer">\
        <span class="rant-detail__author">👤 ' + escapeHtml(authorName) + '</span>\
        <div class="rant-detail__actions">\
          <button class="rant-action rant-action--like ' + (vote === 'like' ? 'liked' : '') + '" id="btnLike">\
            👍 <span id="likeCount">' + rant.likes + '</span>\
          </button>\
          <button class="rant-action rant-action--dislike ' + (vote === 'dislike' ? 'disliked' : '') + '" id="btnDislike">\
            👎 <span id="dislikeCount">' + rant.dislikes + '</span>\
          </button>\
        </div>\
      </div>';

    // 绑定点赞/踩（含动画）
    var btnLike = document.getElementById('btnLike');
    var btnDislike = document.getElementById('btnDislike');
    if (btnLike) {
      btnLike.addEventListener('click', function () {
        handleVote('like', btnLike, btnDislike);
      });
    }
    if (btnDislike) {
      btnDislike.addEventListener('click', function () {
        handleVote('dislike', btnLike, btnDislike);
      });
    }
  }

  async function handleVote(action, likeBtn, dislikeBtn) {
    rant = await RantStore.getRantById(rantId);
    var currentVote = userVotes[rantId];

    if (action === 'like') {
      if (currentVote === 'like') {
        await RantStore.updateRant(rantId, { likes: Math.max(0, rant.likes - 1) });
        userVotes[rantId] = null;
      } else {
        await RantStore.updateRant(rantId, { likes: rant.likes + 1 });
        if (currentVote === 'dislike') {
          await RantStore.updateRant(rantId, { dislikes: Math.max(0, rant.dislikes - 1) });
        }
        userVotes[rantId] = 'like';
        if (likeBtn) {
          likeBtn.classList.add('animate-heartbeat');
          likeBtn.addEventListener('animationend', function h() {
            likeBtn.classList.remove('animate-heartbeat');
            likeBtn.removeEventListener('animationend', h);
          });
        }
      }
    } else {
      if (currentVote === 'dislike') {
        await RantStore.updateRant(rantId, { dislikes: Math.max(0, rant.dislikes - 1) });
        userVotes[rantId] = null;
      } else {
        await RantStore.updateRant(rantId, { dislikes: rant.dislikes + 1 });
        if (currentVote === 'like') {
          await RantStore.updateRant(rantId, { likes: Math.max(0, rant.likes - 1) });
        }
        userVotes[rantId] = 'dislike';
        if (dislikeBtn) {
          dislikeBtn.classList.add('animate-shake');
          dislikeBtn.addEventListener('animationend', function h() {
            dislikeBtn.classList.remove('animate-shake');
            dislikeBtn.removeEventListener('animationend', h);
          });
        }
      }
    }

    saveVotes();
    rant = await RantStore.getRantById(rantId);
    var likeCountEl = document.getElementById('likeCount');
    var dislikeCountEl = document.getElementById('dislikeCount');
    if (likeCountEl) likeCountEl.textContent = rant.likes;
    if (dislikeCountEl) dislikeCountEl.textContent = rant.dislikes;
    if (likeBtn) {
      likeBtn.className = 'rant-action rant-action--like' + (userVotes[rantId] === 'like' ? ' liked' : '');
    }
    if (dislikeBtn) {
      dislikeBtn.className = 'rant-action rant-action--dislike' + (userVotes[rantId] === 'dislike' ? ' disliked' : '');
    }
  }

  // ========== 渲染评论区 ==========
  async function renderComments(newCommentId) {
    rant = await RantStore.getRantById(rantId);
    if (!rant) {
      console.warn('[Detail] renderComments: rant not found for id', rantId);
      return;
    }
    var comments = rant.comments || [];
    commentList.innerHTML = '';

    if (!Array.isArray(comments) || comments.length === 0) {
      commentEmpty.style.display = 'block';
      return;
    }

    commentEmpty.style.display = 'none';
    comments.sort(function (a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    comments.forEach(function (cmt) {
      var authorName = cmt.isAnonymous ? '某不愿透露姓名的网友' : cmt.author;
      var ts = typeof cmt.createdAt === 'string'
        ? new Date(cmt.createdAt).getTime()
        : cmt.createdAt;

      var item = document.createElement('div');
      item.className = 'comment-item';
      item.setAttribute('data-cmt-id', cmt.id);
      if (newCommentId && cmt.id === newCommentId) {
        item.classList.add('comment-item--new');
      }
      item.innerHTML = '\
        <div class="comment-item__header">\
          <span class="comment-item__author">' + escapeHtml(authorName) + '</span>\
          <span class="comment-item__time">' + formatTime(ts) + '</span>\
        </div>\
        <div class="comment-item__content">' + escapeHtml(cmt.content) + '</div>';
      commentList.appendChild(item);
    });
  }

  // ========== 提交评论 ==========
  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var content = commentContent.value.trim();
      if (content.length < 1) {
        Toast.show('评论内容不能为空', 'error');
        return;
      }
      if (content.length > 200) {
        Toast.show('评论不能超过200字', 'error');
        return;
      }

      var isAnonymous = commentAnonymousToggle.checked;
      var author = '';
      if (!isAnonymous) {
        author = RantStore.getNickname() || '匿名用户';
      }

      try {
        var newComment = await RantStore.addComment(rantId, {
          content: content,
          author: author,
          isAnonymous: isAnonymous
        });
        console.log('[Detail] addComment result:', newComment);

        if (!newComment) {
          Toast.show('评论失败：吐槽不存在或已被删除', 'error');
          return;
        }

        commentContent.value = '';
        Toast.show('评论发表成功！', 'success');
        // 强制刷新 rant 数据再渲染评论区
        rant = await RantStore.getRantById(rantId);
        console.log('[Detail] rant after comment:', rant ? rant.comments : null);
        await renderComments(newComment.id);
      } catch (err) {
        console.error('[Detail] 评论失败:', err);
        Toast.show('评论失败，请稍后重试', 'error');
      }
    });
  }

  // ========== Lightbox 灯箱 ==========
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');

  if (rantDetail && lightbox) {
    rantDetail.addEventListener('click', function (e) {
      var img = e.target.closest('.rant-detail__img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
      closeLightbox();
    }
  });

  // ========== 删除功能 ==========
  var confirmModal = document.getElementById('confirmModal');
  var confirmMessage = document.getElementById('confirmMessage');
  var confirmOkBtn = document.getElementById('confirmOkBtn');
  var confirmCancelBtn = document.getElementById('confirmCancelBtn');
  var adminBar = document.getElementById('adminBar');
  var adminTrigger = document.getElementById('adminTrigger');
  var adminExitBtn = document.getElementById('adminExitBtn');
  var pendingDeleteId = null;
  var pendingDeleteType = null;

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
    var isAdmin = RantStore.isAdmin();
    if (adminBar) adminBar.style.display = isAdmin ? 'flex' : 'none';
    if (adminTrigger) adminTrigger.textContent = isAdmin ? '退出管理' : '管理';
    await renderRantDetail();
    await renderComments();
  }

  // 确认弹窗
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
  }
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', async function () {
      if (pendingDeleteId) {
        if (pendingDeleteType === 'rant') {
          await RantStore.deleteRant(pendingDeleteId);
          Toast.show('吐槽已删除', 'success');
          setTimeout(function () { window.location.href = 'index.html'; }, 300);
        } else if (pendingDeleteType === 'comment') {
          await RantStore.deleteComment(rantId, pendingDeleteId);
          Toast.show('评论已删除', 'success');
          await renderComments();
        }
      }
      closeConfirmModal();
    });
  }

  function openConfirmModal(id, type, label) {
    pendingDeleteId = id;
    pendingDeleteType = type;
    if (confirmMessage) {
      confirmMessage.textContent = type === 'rant'
        ? '确定要删除「' + label + '」吗？此操作不可撤销。'
        : '确定要删除这条评论吗？此操作不可撤销。';
    }
    if (confirmModal) confirmModal.style.display = 'flex';
  }

  function closeConfirmModal() {
    if (confirmModal) confirmModal.style.display = 'none';
    pendingDeleteId = null;
    pendingDeleteType = null;
  }

  if (confirmModal) {
    confirmModal.addEventListener('click', function (e) {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }

  // 重写 renderRantDetail 加入删除按钮
  var _origRenderRantDetail = renderRantDetail;
  renderRantDetail = async function () {
    await _origRenderRantDetail();
    var isAdmin = RantStore.isAdmin();
    var isAuthorCheck = await RantStore.isAuthor(rantId);
    var canDelete = isAdmin || isAuthorCheck;
    if (canDelete && rant) {
      var footerEl = document.querySelector('.rant-detail__footer');
      if (footerEl) {
        var delBtn = document.createElement('button');
        delBtn.className = 'rant-delete-btn rant-delete-btn--detail';
        delBtn.textContent = '🗑️ 删除';
        delBtn.addEventListener('click', function () {
          openConfirmModal(rantId, 'rant', rant.title);
        });
        footerEl.insertBefore(delBtn, footerEl.firstChild);
      }
    }
  };

  // 重写 renderComments 加入评论删除按钮（管理员模式）
  var _origRenderComments2 = renderComments;
  renderComments = async function (newCommentId) {
    await _origRenderComments2(newCommentId);
    if (RantStore.isAdmin()) {
      var items = commentList.querySelectorAll('.comment-item');
      items.forEach(function (item) {
        var cmtHeader = item.querySelector('.comment-item__header');
        if (cmtHeader && !item.querySelector('.comment-delete-btn')) {
          var delBtn = document.createElement('button');
          delBtn.className = 'comment-delete-btn';
          delBtn.textContent = '🗑️';
          delBtn.title = '删除评论';
          cmtHeader.appendChild(delBtn);
        }
      });
    }

    // 评论删除事件委托
    commentList.addEventListener('click', function (e) {
      var delBtn = e.target.closest('.comment-delete-btn');
      if (!delBtn) return;
      var item = delBtn.closest('.comment-item');
      if (!item) return;
      var cmtId = item.getAttribute('data-cmt-id');
      if (cmtId) {
        openConfirmModal(cmtId, 'comment', '');
      }
    });
  };

  // ========== 启动 ==========
  async function start() {
    try {
      rant = await RantStore.getRantById(rantId);
    } catch (err) {
      console.error('[Detail] 加载吐槽失败:', err);
      rantDetail.innerHTML = '\
        <div class="empty-state">\
          <p class="empty-icon">⚠️</p>\
          <p>加载失败，请检查网络后刷新页面</p>\
          <button class="btn btn-secondary" onclick="location.reload()" style="margin-top:16px;">🔄 重试</button>\
        </div>';
      return;
    }

    if (!rant) {
      rantDetail.innerHTML = '\
        <div class="empty-state">\
          <p class="empty-icon">🔍</p>\
          <p>吐槽不存在或已被删除</p>\
          <a href="index.html" class="btn btn-primary" style="margin-top:16px;">← 返回首页</a>\
        </div>';
      return;
    }

    await updateAdminUI();
    await renderRantDetail();
    await renderComments();
  }

  start();
})();
