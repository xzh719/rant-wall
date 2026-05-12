/**
 * post.js — 发布吐槽页逻辑 (T-05)
 * 表单验证、情绪选择、匿名/实名切换、提交存储
 */
(function () {
  'use strict';

  var form = document.getElementById('rantForm');
  var emotionSelector = document.getElementById('emotionSelector');
  var titleInput = document.getElementById('rantTitle');
  var contentInput = document.getElementById('rantContent');
  var titleCount = document.getElementById('titleCount');
  var contentCount = document.getElementById('contentCount');
  var anonymousToggle = document.getElementById('anonymousToggle');
  var toggleLabelText = document.getElementById('toggleLabelText');
  var nicknameGroup = document.getElementById('nicknameGroup');
  var nicknameInput = document.getElementById('nicknameInput');
  var submitBtn = document.getElementById('submitBtn');

  var selectedEmotion = null;
  var uploadedImage = null; // base64 字符串

  // ========== 图片上传 ==========
  var imageFileInput = document.getElementById('imageFileInput');
  var imageUploadArea = document.getElementById('imageUploadArea');
  var imageUploadPlaceholder = document.getElementById('imageUploadPlaceholder');
  var imagePreview = document.getElementById('imagePreview');
  var imagePreviewImg = document.getElementById('imagePreviewImg');
  var imageRemoveBtn = document.getElementById('imageRemoveBtn');

  // 点击上传
  if (imageUploadPlaceholder) {
    imageUploadPlaceholder.addEventListener('click', function () {
      imageFileInput.click();
    });
  }

  // 文件选择
  if (imageFileInput) {
    imageFileInput.addEventListener('change', function () {
      var file = imageFileInput.files[0];
      if (file) handleImageFile(file);
    });
  }

  // 拖拽上传
  if (imageUploadArea) {
    imageUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      imageUploadArea.classList.add('image-upload-area--dragover');
    });
    imageUploadArea.addEventListener('dragleave', function () {
      imageUploadArea.classList.remove('image-upload-area--dragover');
    });
    imageUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      imageUploadArea.classList.remove('image-upload-area--dragover');
      var file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    });
  }

  // 移除图片
  if (imageRemoveBtn) {
    imageRemoveBtn.addEventListener('click', function () {
      uploadedImage = null;
      imageFileInput.value = '';
      imagePreview.style.display = 'none';
      imageUploadPlaceholder.style.display = 'flex';
    });
  }

  function handleImageFile(file) {
    // 类型验证
    var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.indexOf(file.type) === -1) {
      Toast.show('仅支持 JPG/PNG/GIF/WebP 格式', 'error');
      return;
    }

    // 大小验证
    if (file.size > 1 * 1024 * 1024) {
      Toast.show('图片大小不能超过 1MB', 'error');
      return;
    }

    // 读取 → 压缩 → 预览
    var reader = new FileReader();
    reader.onload = function (e) {
      compressImage(e.target.result, function (compressedBase64) {
        uploadedImage = compressedBase64;
        imagePreviewImg.src = compressedBase64;
        imagePreview.style.display = 'block';
        imageUploadPlaceholder.style.display = 'none';
      });
    };
    reader.readAsDataURL(file);
  }

  function compressImage(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var maxWidth = 400;
      var width = img.width;
      var height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 压缩为 JPEG，质量 0.5
      var compressed = canvas.toDataURL('image/jpeg', 0.5);

      // 超过 100KB 继续降质量
      if (compressed.length > 100 * 1024) {
        compressed = canvas.toDataURL('image/jpeg', 0.25);
      }

      // 仍然太大，拒绝
      if (compressed.length > 200 * 1024) {
        Toast.show('图片过大，请选择更小的图片', 'error');
        uploadedImage = null;
        imagePreview.style.display = 'none';
        imageUploadPlaceholder.style.display = 'flex';
        return;
      }

      callback(compressed);
    };
    img.src = dataUrl;
  }

  // ========== 渲染情绪标签选择器 ==========
  function renderEmotionSelector() {
    var tags = RantStore.getEmotionTags();
    var customs = RantStore.getCustomEmotions();
    emotionSelector.innerHTML = '';
    tags.forEach(function (tag, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emotion-option';
      if (i >= 8) btn.classList.add('emotion-option--custom');
      btn.dataset.value = tag.value;
      btn.textContent = tag.emoji + ' ' + tag.label;
      btn.addEventListener('click', function () {
        emotionSelector.querySelectorAll('.emotion-option').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        selectedEmotion = tag.value;
      });

      // 自定义标签可删除
      if (i >= 8) {
        var delBtn = document.createElement('span');
        delBtn.className = 'emotion-option__delete';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var customsIdx = i - 8;
          RantStore.deleteCustomEmotion(customsIdx);
          selectedEmotion = null;
          renderEmotionSelector();
          Toast.show('已删除自定义情绪', 'info');
        });
        btn.appendChild(delBtn);
      }

      emotionSelector.appendChild(btn);
    });

    // "+ 自定义" 按钮
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'emotion-option emotion-option--add';
    addBtn.textContent = '+ 自定义';
    addBtn.addEventListener('click', openCustomEmotionModal);
    emotionSelector.appendChild(addBtn);
  }

  // ========== 字数统计（含颜色过渡） ==========
  titleInput.addEventListener('input', function () {
    var len = titleInput.value.length;
    titleCount.textContent = len;
    updateCountColor(titleCount, len, 30);
  });

  contentInput.addEventListener('input', function () {
    var len = contentInput.value.length;
    contentCount.textContent = len;
    updateCountColor(contentCount, len, 500);
  });

  function updateCountColor(el, current, max) {
    el.classList.remove('form-hint--safe', 'form-hint--warn', 'form-hint--danger');
    var ratio = current / max;
    if (ratio < 0.6) {
      el.classList.add('form-hint--safe');
    } else if (ratio < 0.9) {
      el.classList.add('form-hint--warn');
    } else {
      el.classList.add('form-hint--danger');
    }
  }

  // ========== 匿名开关 ==========
  anonymousToggle.addEventListener('change', function () {
    if (anonymousToggle.checked) {
      toggleLabelText.textContent = '匿名发布';
      nicknameGroup.style.display = 'none';
      nicknameInput.required = false;
    } else {
      toggleLabelText.textContent = '实名发布';
      nicknameGroup.style.display = 'flex';
      nicknameInput.required = true;
    }
  });

  // 恢复上次的昵称
  var savedNickname = RantStore.getNickname();
  if (savedNickname) {
    nicknameInput.value = savedNickname;
  }

  // ========== 表单提交 ==========
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    // 验证情绪标签
    if (!selectedEmotion) {
      showError('emotionSelector', '请选择一个情绪标签');
      return;
    }

    // 验证标题
    var title = titleInput.value.trim();
    if (title.length < 1) {
      showError('rantTitle', '标题不能为空');
      titleInput.focus();
      return;
    }
    if (title.length > 30) {
      showError('rantTitle', '标题不能超过30字');
      titleInput.focus();
      return;
    }

    // 验证正文
    var content = contentInput.value.trim();
    if (content.length < 10) {
      showError('rantContent', '正文至少需要10个字，再多说几句吧');
      contentInput.focus();
      return;
    }
    if (content.length > 500) {
      showError('rantContent', '正文不能超过500字');
      contentInput.focus();
      return;
    }

    // 验证昵称（实名模式）
    var isAnonymous = anonymousToggle.checked;
    var author = '';
    if (!isAnonymous) {
      author = nicknameInput.value.trim();
      if (author.length < 1) {
        showError('nicknameInput', '请输入你的昵称');
        nicknameInput.focus();
        return;
      }
      if (author.length > 10) {
        showError('nicknameInput', '昵称不能超过10字');
        nicknameInput.focus();
        return;
      }
      RantStore.setNickname(author);
    }

    // 禁用按钮防重复提交 + spinner
    submitBtn.disabled = true;
    submitBtn.classList.add('btn--loading');
    var originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> 发布中...';

    // 写入数据（异步 Bmob）
    try {
      await RantStore.addRant({
        emotion: selectedEmotion,
        title: title,
        content: content,
        author: author,
        isAnonymous: isAnonymous,
        image: uploadedImage
      });

      // 延迟跳转
      setTimeout(function () {
        window.location.href = 'index.html';
      }, 400);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn--loading');
      submitBtn.textContent = originalText;
      Toast.show('发布失败，请稍后重试', 'error');
      console.error('Bmob addRant error:', err);
    }
  });

  // ========== 错误提示（改用 Toast） ==========
  function showError(targetId, message) {
    Toast.show(message, 'error');
    var el;
    if (targetId === 'emotionSelector') {
      el = emotionSelector;
    } else {
      el = document.getElementById(targetId);
    }
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.style.borderColor = 'var(--color-error, #ef4444)';
      // 3s 后自动清除红色边框
      setTimeout(function () { el.style.borderColor = ''; }, 3000);
    }
  }

  function clearErrors() {
    [titleInput, contentInput, nicknameInput].forEach(function (input) {
      input.style.borderColor = '';
    });
  }

  // ========== 自定义情绪弹窗 ==========
  var PRESET_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#F97316','#06B6D4','#84CC16','#6366F1','#E11D48','#14B8A6'];
  var selectedCustomColor = '#8B5CF6';
  var customEmotionModal = document.getElementById('customEmotionModal');
  var customEmotionLabel = document.getElementById('customEmotionLabel');
  var customEmotionEmoji = document.getElementById('customEmotionEmoji');
  var customEmotionSaveBtn = document.getElementById('customEmotionSaveBtn');
  var customEmotionCancelBtn = document.getElementById('customEmotionCancelBtn');
  var colorPickerRow = document.getElementById('colorPickerRow');

  function openCustomEmotionModal() {
    if (customEmotionModal) customEmotionModal.style.display = 'flex';
    if (customEmotionLabel) customEmotionLabel.value = '';
    if (customEmotionEmoji) customEmotionEmoji.value = '';
    renderColorPicker();
  }

  function closeCustomEmotionModal() {
    if (customEmotionModal) customEmotionModal.style.display = 'none';
  }

  function renderColorPicker() {
    if (!colorPickerRow) return;
    colorPickerRow.innerHTML = '';
    PRESET_COLORS.forEach(function (color) {
      var swatch = document.createElement('span');
      swatch.className = 'color-picker-swatch';
      if (color === selectedCustomColor) swatch.classList.add('color-picker-swatch--selected');
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', function () {
        selectedCustomColor = color;
        renderColorPicker();
      });
      colorPickerRow.appendChild(swatch);
    });
  }

  if (customEmotionSaveBtn) {
    customEmotionSaveBtn.addEventListener('click', function () {
      var label = (customEmotionLabel ? customEmotionLabel.value.trim() : '');
      var emoji = (customEmotionEmoji ? customEmotionEmoji.value.trim() : '');
      if (!label) { Toast.show('请输入标签名', 'error'); return; }
      if (!emoji) { Toast.show('请输入 Emoji', 'error'); return; }
      if (label.length > 4) { Toast.show('标签名不能超过4字', 'error'); return; }

      var value = 'custom_' + Date.now().toString(36);
      RantStore.addCustomEmotion({
        value: value,
        emoji: emoji,
        label: label,
        color: selectedCustomColor
      });
      closeCustomEmotionModal();
      renderEmotionSelector();
      Toast.show('自定义情绪已创建！', 'success');
    });
  }

  if (customEmotionCancelBtn) {
    customEmotionCancelBtn.addEventListener('click', closeCustomEmotionModal);
  }

  if (customEmotionModal) {
    customEmotionModal.addEventListener('click', function (e) {
      if (e.target === customEmotionModal) closeCustomEmotionModal();
    });
  }

  // ========== 启动 ==========
  renderEmotionSelector();
})();
