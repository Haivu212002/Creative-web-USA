import { pageHref } from './routes.js?v=20261104-mp2';
import { CATEGORIES, DAYS, DRAFT_KEY, GALLERY_CATEGORIES, activePromotions, createElement as el, formatPrice, fullAddress, loadDraft, loadPublishedContent, safeImage, saveDraft, uniqueId, validateContent } from './core.js?v=20261104-mp2';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
let content;
let published;
let expectedRaw;
let savedAt;
let contentDirty = false;
let editorDirty = false;
let currentPanel = 'overview';
let editing = null;

const entitySpecs = {
  services: { title: 'dịch vụ', prefix: 'service', fields: [
    { key: 'name', label: 'Tên dịch vụ', required: true, max: 150 },
    { key: 'category', label: 'Nhóm dịch vụ', options: CATEGORIES },
    { key: 'description', label: 'Mô tả', type: 'textarea', full: true },
    { key: 'details', label: 'Thông tin chi tiết trên trang dịch vụ', type: 'textarea', full: true, max: 6000 },
    { key: 'highlights', label: 'Các nội dung nên trao đổi với salon', type: 'textarea', full: true, max: 6000, hint: 'Mỗi dòng là một ý trong danh sách.' },
    { key: 'preparation', label: 'Chuẩn bị trước khi đến', type: 'textarea', full: true, max: 6000, hint: 'Mỗi dòng là một ý trong danh sách.' },
    { key: 'goodToKnow', label: 'Thông tin cần biết', type: 'textarea', full: true, max: 6000 },
    { key: 'price', label: 'Giá (USD)', type: 'number', min: 0, max: 10000, step: '0.01', hint: 'Để trống để hiển thị “Call for pricing”.' },
    { key: 'duration', label: 'Thời lượng (phút)', type: 'number', min: 1, max: 480, step: '1', hint: 'Để trống nếu chưa xác định.' },
    { key: 'image', label: 'Ảnh dịch vụ', required: true, full: true, image: true },
  ] },
  gallery: { title: 'ảnh', prefix: 'photo', fields: [
    { key: 'caption', label: 'Chú thích', max: 300, full: true },
    { key: 'alt', label: 'Mô tả ảnh cho trình đọc màn hình', required: true, max: 300, full: true },
    { key: 'category', label: 'Nhóm ảnh', options: GALLERY_CATEGORIES, full: true },
    { key: 'src', label: 'Đường dẫn ảnh', required: true, full: true, image: true },
  ] },
  promotions: { title: 'khuyến mãi', prefix: 'offer', fields: [
    { key: 'title', label: 'Tên khuyến mãi', required: true, max: 150 },
    { key: 'highlight', label: 'Nội dung nổi bật (ví dụ: $25)', max: 100 },
    { key: 'description', label: 'Mô tả & điều kiện áp dụng', type: 'textarea', full: true },
    { key: 'code', label: 'Mã coupon (nếu có)', full: true, max: 100 },
    { key: 'startDate', label: 'Từ ngày (không bắt buộc)', type: 'date' },
    { key: 'endDate', label: 'Đến hết ngày (không bắt buộc)', type: 'date' },
    { key: 'enabled', label: 'Cho phép hiển thị khi trong thời hạn', type: 'checkbox', full: true },
  ] },
};

const contentGroups = [
  { title: 'Thương hiệu', fields: [
    { path: 'brand.name', label: 'Tên salon', required: true },
    { path: 'brand.domain', label: 'Tên miền (không có https://)', required: true },
    { path: 'brand.tagline', label: 'Khẩu hiệu', full: true, required: true },
  ] },
  { title: 'Thông tin liên hệ', fields: [
    { path: 'contact.phone', label: 'Số điện thoại cho liên kết gọi', required: true, hint: 'Định dạng +1 và 10 chữ số, ví dụ +17172484131.' },
    { path: 'contact.phoneDisplay', label: 'Số điện thoại hiển thị', required: true },
    { path: 'contact.address', label: 'Địa chỉ đường', required: true },
    { path: 'contact.city', label: 'Thành phố', required: true },
    { path: 'contact.state', label: 'Tiểu bang', required: true },
    { path: 'contact.zip', label: 'ZIP code', required: true },
    { path: 'contact.facebookName', label: 'Tên Facebook', required: true },
    { path: 'contact.facebookUrl', label: 'Đường dẫn Facebook', required: true, type: 'url' },
  ] },
  { title: 'Trang chủ', fields: [
    { path: 'hero.eyebrow', label: 'Dòng giới thiệu nhỏ', full: true, required: true },
    { path: 'hero.title', label: 'Tiêu đề chính', required: true },
    { path: 'hero.accent', label: 'Tiêu đề nhấn mạnh', required: true },
    { path: 'hero.description', label: 'Mô tả trang chủ', type: 'textarea', full: true, required: true },
  ] },
  { title: 'Giới thiệu salon', fields: [
    { path: 'about.heading', label: 'Tiêu đề', full: true, required: true },
    { path: 'about.description', label: 'Câu chuyện salon', type: 'textarea', full: true, required: true },
  ] },
  { title: 'Gift certificates', fields: [
    { path: 'gifts.heading', label: 'Tiêu đề', full: true, required: true },
    { path: 'gifts.description', label: 'Giới thiệu thẻ quà tặng', type: 'textarea', full: true, required: true },
  ] },
];

function report(message, error = false) {
  $('#studio-status').textContent = message;
  $('#studio-status').classList.toggle('is-error', error);
}

function imageSrc(value) { return value.startsWith('assets/') ? `../${value}` : value; }

function confirmAction(message) {
  const dialog = $('#confirm-dialog');
  $('#confirm-message').textContent = message;
  return new Promise(resolve => {
    let answer = false;
    const yes = () => { answer = true; dialog.close(); };
    const no = () => dialog.close();
    const done = () => {
      $('#confirm-yes').removeEventListener('click', yes);
      $('#confirm-no').removeEventListener('click', no);
      resolve(answer);
    };
    $('#confirm-yes').addEventListener('click', yes);
    $('#confirm-no').addEventListener('click', no);
    dialog.addEventListener('close', done, { once: true });
    dialog.showModal();
    $('#confirm-no').focus();
  });
}

function persist(next) {
  try {
    if (localStorage.getItem(DRAFT_KEY) !== expectedRaw) throw new Error('Bản nháp đã thay đổi ở tab khác. Hãy tải lại trang trước khi tiếp tục để tránh ghi đè.');
    const draft = saveDraft(next);
    expectedRaw = localStorage.getItem(DRAFT_KEY);
    content = structuredClone(next);
    savedAt = draft.savedAt;
    report('Đã lưu bản nháp trong trình duyệt này. Website công khai chưa thay đổi.');
    renderLists();
    return true;
  } catch (error) {
    const message = error.name === 'QuotaExceededError' ? 'Bộ nhớ trình duyệt không đủ. Hãy dùng ảnh nhỏ hơn hoặc đường dẫn ảnh HTTPS. Bản lưu trước vẫn được giữ nguyên.' : error.message;
    report(message, true);
    return false;
  }
}

function actionButtons(type, item) {
  const actions = el('div', 'row-actions');
  const edit = el('button', '', 'Sửa');
  edit.type = 'button';
  edit.setAttribute('aria-label', `Sửa ${item.name || item.title || item.caption || 'ảnh'}`);
  edit.addEventListener('click', () => openEditor(type, item));
  const remove = el('button', 'delete-button', 'Xóa');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Xóa ${item.name || item.title || item.caption || 'ảnh'}`);
  remove.addEventListener('click', async () => {
    const name = item.name || item.title || item.caption || item.id;
    if (!await confirmAction(`Xóa “${name}” khỏi bản nháp? Ảnh và file gốc trong repository sẽ không bị xóa.`)) return;
    const next = structuredClone(content);
    next[type] = next[type].filter(row => row.id !== item.id);
    persist(next);
  });
  actions.append(edit, remove);
  return actions;
}

function renderLists() {
  const stats = $('#studio-stats');
  stats.replaceChildren();
  for (const [symbol, value, label] of [['✧', content.services.length, 'dịch vụ'], ['▧', content.gallery.length, 'ảnh salon'], ['♧', activePromotions(content.promotions).length, 'ưu đãi đang hiển thị']]) {
    const card = el('div', 'stat-card');
    const info = el('div');
    info.append(el('span', 'stat-value', value), el('span', 'stat-label', label));
    card.append(el('span', 'stat-symbol', symbol), info);
    stats.append(card);
  }
  $('#saved-time').textContent = savedAt ? `Lưu lần cuối: ${new Date(savedAt).toLocaleString('vi-VN')}` : 'Đang dùng content.json gốc';
  const serviceList = $('#admin-service-list');
  serviceList.replaceChildren();
  for (const item of content.services) {
    const row = el('article', 'admin-service-row');
    const image = el('img');
    image.src = imageSrc(item.image);
    image.alt = item.name;
    image.loading = 'lazy';
    const info = el('div', 'admin-service-info');
    info.append(el('h2', '', item.name), el('p', '', CATEGORIES[item.category]));
    const price = el('div', 'admin-price', formatPrice(item.price));
    price.append(el('small', '', item.duration ? `${item.duration} phút` : 'Chưa xác định thời lượng'));
    row.append(image, info, price, actionButtons('services', item));
    serviceList.append(row);
  }
  if (!content.services.length) serviceList.append(el('p', 'empty-state', 'Chưa có dịch vụ. Thêm dịch vụ đầu tiên để bắt đầu.'));
  const gallery = $('#admin-gallery-grid');
  gallery.replaceChildren();
  for (const item of content.gallery) {
    const card = el('article', 'admin-photo-card');
    const image = el('img');
    image.src = imageSrc(item.src);
    image.alt = item.alt;
    image.loading = 'lazy';
    const body = el('div', 'admin-photo-body');
    body.append(el('h2', '', item.caption || 'Ảnh salon'), el('p', '', GALLERY_CATEGORIES[item.category]), actionButtons('gallery', item));
    card.append(image, body);
    gallery.append(card);
  }
  if (!content.gallery.length) gallery.append(el('p', 'empty-state', 'Chưa có ảnh. Thêm khoảnh khắc đầu tiên của salon.'));
  const promotions = $('#admin-promotion-list');
  promotions.replaceChildren();
  const activeIds = new Set(activePromotions(content.promotions).map(item => item.id));
  for (const item of content.promotions) {
    const card = el('article', 'admin-promo-card');
    const header = el('div', 'admin-promo-header');
    const title = el('div');
    title.append(el('h2', '', `${item.title}${item.highlight ? ` · ${item.highlight}` : ''}`), el('span', `promo-state${activeIds.has(item.id) ? '' : ' is-paused'}`, activeIds.has(item.id) ? 'Đang hiển thị' : item.enabled ? 'Ngoài thời hạn' : 'Đang tắt'));
    header.append(title, actionButtons('promotions', item));
    card.append(header, el('p', '', item.description));
    if (item.code) card.append(el('span', 'promo-detail', `Coupon: ${item.code}`));
    card.append(el('span', 'promo-detail', `${item.startDate || 'Không giới hạn ngày bắt đầu'} → ${item.endDate || 'Không giới hạn ngày kết thúc'}`));
    promotions.append(card);
  }
  if (!content.promotions.length) promotions.append(el('p', 'empty-state', 'Chưa có ưu đãi. Website sẽ mời khách gọi hỏi khuyến mãi hiện tại.'));
  $('#booking-phone').textContent = content.contact.phoneDisplay;
  $('#booking-phone').href = `tel:${content.contact.phone}`;
}

function makeField(spec, value, idPrefix) {
  const field = el('div', `studio-field${spec.full ? ' full-width' : ''}`);
  const key = spec.key || spec.path;
  const id = `${idPrefix}-${key.replaceAll('.', '-')}`;
  const label = el('label', '', spec.label);
  label.htmlFor = id;
  let input;
  if (spec.options) {
    input = el('select');
    for (const [option, text] of Object.entries(spec.options)) input.append(new Option(text, option));
  } else if (spec.type === 'textarea') input = el('textarea');
  else { input = el('input'); input.type = spec.type || 'text'; }
  input.id = id;
  input.name = key;
  if (spec.type === 'checkbox') input.checked = Boolean(value);
  else input.value = value ?? '';
  if (spec.required) input.required = true;
  if (!['checkbox', 'number', 'date'].includes(spec.type) && !spec.options) input.maxLength = spec.image ? 1500000 : typeof spec.max === 'number' ? spec.max : 2000;
  for (const attr of ['min', 'step']) if (spec[attr] !== undefined) input.setAttribute(attr, spec[attr]);
  if (spec.type === 'number' && spec.max !== undefined) input.max = spec.max;
  field.append(label, input);
  if (spec.hint) field.append(el('small', '', spec.hint));
  if (spec.image) {
    field.append(el('small', '', 'Đường dẫn assets/images/… hoặc URL HTTPS. Ảnh tải lên chỉ lưu trong bản nháp.'));
    const preview = el('img', 'image-preview');
    preview.alt = 'Xem trước ảnh';
    const updatePreview = () => {
      const safe = safeImage(input.value);
      preview.hidden = !safe;
      if (safe) preview.src = imageSrc(input.value); else preview.removeAttribute('src');
    };
    input.addEventListener('input', updatePreview);
    preview.addEventListener('error', () => { preview.hidden = true; });
    field.append(preview);
    updatePreview();
    const uploadBox = el('div', 'studio-field full-width upload-field');
    const upload = el('input');
    upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp'; upload.id = `${id}-upload`;
    const uploadLabel = el('label', '', 'Hoặc chọn ảnh từ thiết bị'); uploadLabel.htmlFor = upload.id;
    uploadBox.append(uploadLabel, upload, el('small', '', 'JPG, PNG hoặc WebP, tối đa 700 KB/ảnh. Dung lượng lưu bản nháp phụ thuộc trình duyệt.'));
    upload.addEventListener('change', async () => {
      const file = upload.files?.[0];
      if (!file) return;
      try {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 700 * 1024) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 700 KB.');
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        if (!safeImage(dataUrl)) throw new Error('Định dạng ảnh không hợp lệ.');
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Ảnh không hợp lệ hoặc có kích thước quá lớn.');
        input.value = dataUrl;
        updatePreview();
        editorDirty = true;
        $('#editor-error').hidden = true;
      } catch (error) { $('#editor-error').textContent = error.message || 'Không đọc được ảnh.'; $('#editor-error').hidden = false; }
    });
    return [field, uploadBox];
  }
  return [field];
}

function renderContentFields() {
  const container = $('#content-fields');
  container.replaceChildren();
  for (const group of contentGroups) {
    const fieldset = el('fieldset', 'content-fieldset');
    const fields = el('div', 'form-fields');
    for (const spec of group.fields) {
      const [section, key] = spec.path.split('.');
      fields.append(...makeField(spec, content[section][key], 'content'));
    }
    fieldset.append(el('legend', '', group.title), fields);
    container.append(fieldset);
  }
  const hours = el('fieldset', 'content-fieldset');
  const rows = el('div', 'form-fields'); rows.style.display = 'block';
  hours.append(el('legend', '', 'Giờ mở cửa · Eastern Time'), rows);
  for (const schedule of [...content.hours].sort((a, b) => a.day - b.day)) {
    const row = el('div', 'hour-row');
    const label = el('div', 'hour-label', DAYS[schedule.day]);
    const closedLabel = el('label', '', 'Đóng cửa');
    const closed = el('input');
    closed.type = 'checkbox'; closed.name = `closed-${schedule.day}`; closed.checked = !schedule.open;
    closedLabel.prepend(closed); label.append(closedLabel);
    const open = el('input'); open.type = 'time'; open.name = `open-${schedule.day}`; open.value = schedule.open || '09:00'; open.required = true; open.disabled = closed.checked; open.setAttribute('aria-label', `Giờ mở cửa ${DAYS[schedule.day]}`);
    const close = el('input'); close.type = 'time'; close.name = `close-${schedule.day}`; close.value = schedule.close || '17:00'; close.required = true; close.disabled = closed.checked; close.setAttribute('aria-label', `Giờ đóng cửa ${DAYS[schedule.day]}`);
    closed.addEventListener('change', () => { open.disabled = closed.checked; close.disabled = closed.checked; });
    row.append(label, open, close); rows.append(row);
  }
  container.append(hours);
}

function openEditor(type, item = null) {
  const spec = entitySpecs[type];
  editing = { type, id: item?.id || null };
  $('#editor-title').textContent = `${item ? 'Chỉnh sửa' : 'Thêm'} ${spec.title}`;
  $('#editor-error').hidden = true;
  const fields = $('#editor-fields');
  fields.replaceChildren();
  const defaults = type === 'services' ? { category: 'nails', image: 'assets/images/nail-art-jewels-enhanced.webp' } : type === 'gallery' ? { category: 'nails', src: '' } : { enabled: true };
  const values = item || defaults;
  for (const field of spec.fields) fields.append(...makeField(field, values[field.key], 'edit'));
  editorDirty = false;
  $('#editor-dialog').showModal();
  $('#editor-fields input:not([type=file]), #editor-fields textarea, #editor-fields select')?.focus();
}

async function closeEditor() {
  if (editorDirty && !await confirmAction('Đóng mà không lưu thay đổi trong cửa sổ này? Bản nháp đã lưu trước đó không bị ảnh hưởng.')) return;
  editorDirty = false;
  $('#editor-dialog').close();
}

function setPanel(panel) {
  if (!$('#panel-' + panel)) panel = 'overview';
  currentPanel = panel;
  const previewPage = { services: 'services', gallery: 'gallery', promotions: 'specials', booking: 'contact' }[panel] || 'home';
  $('#preview-link').href = '../' + pageHref(previewPage, { preview: 'draft' });
  $$('.studio-panel').forEach(section => { section.hidden = section.id !== `panel-${panel}`; });
  $$('[data-panel]').forEach(link => {
    const active = link.dataset.panel === panel;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = `${$(`#panel-${panel} h1`).textContent} | Fashion Content Studio`;
}

function hasUnsaved() {
  if (!contentDirty && !editorDirty) return false;
  report('Có thay đổi chưa lưu. Hãy lưu nội dung trước khi xem trước, nhập hoặc xuất file.', true);
  return true;
}

function setupActions() {
  $$('[data-add]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.add)));
  $('#editor-close').addEventListener('click', closeEditor);
  $('#editor-cancel').addEventListener('click', closeEditor);
  $('#editor-dialog').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  $('#editor-form').addEventListener('input', () => { editorDirty = true; });
  $('#editor-form').addEventListener('submit', event => {
    event.preventDefault();
    const { type, id } = editing;
    const spec = entitySpecs[type];
    const item = { id: id || uniqueId(spec.prefix) };
    const form = $('#editor-form');
    for (const field of spec.fields) {
      const input = form.elements.namedItem(field.key);
      item[field.key] = field.type === 'checkbox' ? input.checked : field.type === 'number' ? input.value === '' ? null : Number(input.value) : input.value.trim();
    }
    const next = structuredClone(content);
    if (id) next[type] = next[type].map(row => row.id === id ? item : row); else next[type].push(item);
    const errors = validateContent(next);
    if (errors.length) { $('#editor-error').textContent = errors.join(' '); $('#editor-error').hidden = false; return; }
    if (persist(next)) { editorDirty = false; $('#editor-dialog').close(); }
    else { $('#editor-error').textContent = $('#studio-status').textContent; $('#editor-error').hidden = false; }
  });
  $('#content-form').addEventListener('input', () => { contentDirty = true; });
  $('#content-form').addEventListener('change', () => { contentDirty = true; });
  $('#content-form').addEventListener('submit', event => {
    event.preventDefault();
    const next = structuredClone(content);
    const form = $('#content-form');
    for (const group of contentGroups) for (const spec of group.fields) {
      const [section, key] = spec.path.split('.');
      next[section][key] = form.elements.namedItem(spec.path).value.trim();
    }
    next.hours = next.hours.map(row => ({ day: row.day, open: form.elements.namedItem(`closed-${row.day}`).checked ? null : form.elements.namedItem(`open-${row.day}`).value, close: form.elements.namedItem(`closed-${row.day}`).checked ? null : form.elements.namedItem(`close-${row.day}`).value }));
    const errors = validateContent(next);
    if (errors.length) { report(errors.join(' '), true); $('#studio-status').scrollIntoView({ block: 'center' }); return; }
    if (persist(next)) contentDirty = false;
  });
  $('#preview-link').addEventListener('click', event => {
    if (hasUnsaved() || !persist(content)) event.preventDefault();
  });
  $('#export-button').addEventListener('click', () => {
    if (hasUnsaved()) return;
    const errors = validateContent(content);
    if (errors.length) { report(errors.join(' '), true); return; }
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(content, null, 2)}\n`], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = 'content.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    report('Đã xuất content.json. Đưa file vào repository và triển khai để cập nhật website công khai.');
  });
  $('#import-label').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); $('#import-file').click(); } });
  $('#import-file').addEventListener('change', async () => {
    const file = $('#import-file').files?.[0];
    if (!file) return;
    try {
      if (hasUnsaved()) return;
      if (file.size > 5 * 1024 * 1024) throw new Error('File JSON phải nhỏ hơn 5 MB.');
      const next = JSON.parse(await file.text());
      const errors = validateContent(next);
      if (errors.length) throw new Error(errors.join(' '));
      if (!await confirmAction(`Nhập ${next.services.length} dịch vụ, ${next.gallery.length} ảnh và ${next.promotions.length} ưu đãi? Nội dung này sẽ thay bản nháp trong trình duyệt. Hãy xuất bản sao trước nếu cần giữ lại.`)) return;
      if (persist(next)) { contentDirty = false; renderContentFields(); }
    } catch (error) { report(`Không nhập được: ${error.message}`, true); }
    finally { $('#import-file').value = ''; }
  });
  $('#reset-draft').addEventListener('click', async () => {
    if (!await confirmAction('Khôi phục từ content.json gốc sẽ xóa bản nháp trên trình duyệt này. Hãy xuất JSON trước nếu muốn giữ lại các thay đổi. Tiếp tục?')) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
      expectedRaw = null;
      content = structuredClone(published);
      savedAt = null; contentDirty = false;
      renderLists(); renderContentFields();
      report('Đã khôi phục nội dung từ content.json. File gốc trong repository không thay đổi.');
    } catch (error) { report(error.message, true); }
  });
  window.addEventListener('hashchange', async () => {
    const next = location.hash.slice(1) || 'overview';
    if (next === currentPanel) return;
    if (contentDirty && currentPanel === 'content') {
      if (!await confirmAction('Rời mục này và bỏ các thay đổi nội dung chưa lưu?')) { history.replaceState(null, '', '#content'); return; }
      contentDirty = false; renderContentFields();
    }
    setPanel(next);
  });
  window.addEventListener('beforeunload', event => { if (contentDirty || editorDirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('storage', event => { if (event.key === DRAFT_KEY) report('Bản nháp đã thay đổi ở tab khác. Hãy tải lại trang này trước khi chỉnh sửa tiếp.', true); });
}

async function init() {
  try {
    published = await loadPublishedContent();
    content = structuredClone(published);
    try {
      expectedRaw = localStorage.getItem(DRAFT_KEY);
      const draft = loadDraft();
      if (draft) { content = draft.content; savedAt = draft.savedAt; }
      report(draft ? 'Đã mở bản nháp đã lưu trên trình duyệt này.' : `Đang dùng nội dung gốc · ${fullAddress(content.contact)}.`);
    } catch (error) {
      expectedRaw = Symbol('unreadable-draft');
      report(`${error.message} Nội dung gốc được hiển thị; bản nháp cũ không bị ghi đè. Có thể dùng “Khôi phục” để bắt đầu lại.`, true);
    }
    renderLists(); renderContentFields(); setupActions(); setPanel(location.hash.slice(1) || 'overview');
  } catch (error) {
    report(`Không tải được content.json. Hãy kiểm tra file và chạy website qua HTTP. ${error.message}`, true);
    $$('.studio-actions button, .studio-actions a, [data-add]').forEach(node => { node.setAttribute('aria-disabled', 'true'); if (node.tagName === 'BUTTON') node.disabled = true; });
  }
}

init();
