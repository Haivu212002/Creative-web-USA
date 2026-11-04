export const DRAFT_KEY = 'fashion-nails.content-draft.v1';
export const CATEGORIES = { nails: 'Nails', pedicure: 'Pedicures', spa: 'Waxing & Facial' };
export const GALLERY_CATEGORIES = { nails: 'Nail art', pedicure: 'Pedicures', salon: 'Our salon', community: 'Our community', inspiration: 'Style inspiration · AI-created' };
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SALON_TIMEZONE = 'America/New_York';

export function directionsUrl(contact) {
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination: fullAddress(contact) });
}

export function mapEmbedUrl(contact) {
  return 'https://www.google.com/maps?' + new URLSearchParams({ q: fullAddress(contact), z: '16', hl: 'en', output: 'embed' });
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value, limit = 2000) => typeof value === 'string' && value.length <= limit;

export function safeImage(value) {
  if (typeof value !== 'string') return false;
  if (/^assets\/images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(value)) return true;
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function safeFacebook(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value) { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

export function validateContent(data) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!isObject(data)) return ['Nội dung phải là một đối tượng JSON.'];
  check(data.schemaVersion === 1, 'Phiên bản dữ liệu không được hỗ trợ.');
  for (const [section, fields] of Object.entries({
    brand: ['name', 'domain', 'tagline'],
    contact: ['phone', 'phoneDisplay', 'address', 'city', 'state', 'zip', 'facebookName', 'facebookUrl'],
    hero: ['eyebrow', 'title', 'accent', 'description'],
    about: ['heading', 'description'],
    gifts: ['heading', 'description'],
  })) {
    if (!isObject(data[section])) { errors.push(`Thiếu mục ${section}.`); continue; }
    for (const key of fields) check(isText(data[section][key]) && data[section][key].trim().length > 0, `Trường ${section}.${key} không hợp lệ.`);
  }
  if (isObject(data.brand)) check(typeof data.brand.domain === 'string' && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(data.brand.domain), 'Tên miền không hợp lệ.');
  if (isObject(data.contact)) {
    check(/^\+1\d{10}$/.test(data.contact.phone), 'Số điện thoại cần có dạng +17172484131.');
    check(safeFacebook(data.contact.facebookUrl), 'Đường dẫn Facebook phải dùng HTTPS trên facebook.com.');
  }
  const checkItems = (key, max, validator) => {
    const list = data[key];
    if (!Array.isArray(list) || list.length > max) { errors.push(`Danh sách ${key} không hợp lệ (tối đa ${max}).`); return; }
    const ids = new Set();
    list.forEach((item, index) => {
      if (!isObject(item)) { errors.push(`${key}[${index}] không hợp lệ.`); return; }
      check(typeof item.id === 'string' && /^[a-z0-9-]{1,80}$/.test(item.id) && !ids.has(item.id), `ID ${key}[${index}] không hợp lệ hoặc bị trùng.`);
      ids.add(item.id);
      validator(item, `${key}[${index}]`);
    });
  };
  checkItems('services', 100, (item, path) => {
    check(isText(item.name, 150) && item.name.trim().length > 0, `${path}: thiếu tên dịch vụ.`);
    check(Object.hasOwn(CATEGORIES, item.category), `${path}: nhóm dịch vụ không hợp lệ.`);
    check(isText(item.description), `${path}: mô tả không hợp lệ.`);
    for (const key of ['details', 'highlights', 'preparation', 'goodToKnow']) {
      check(item[key] === undefined || isText(item[key], 6000), `${path}.${key}: thông tin dịch vụ không hợp lệ.`);
    }
    check(item.price === null || (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && item.price <= 10000), `${path}: giá không hợp lệ.`);
    check(item.duration === null || (Number.isInteger(item.duration) && item.duration > 0 && item.duration <= 480), `${path}: thời gian không hợp lệ.`);
    check(safeImage(item.image), `${path}: đường dẫn ảnh không hợp lệ.`);
  });
  checkItems('gallery', 100, (item, path) => {
    check(safeImage(item.src), `${path}: đường dẫn ảnh không hợp lệ.`);
    check(isText(item.alt, 300) && item.alt.trim().length > 0, `${path}: thiếu mô tả ảnh.`);
    check(isText(item.caption, 300), `${path}: chú thích không hợp lệ.`);
    check(Object.hasOwn(GALLERY_CATEGORIES, item.category), `${path}: nhóm ảnh không hợp lệ.`);
  });
  checkItems('promotions', 50, (item, path) => {
    check(isText(item.title, 150) && item.title.trim().length > 0, `${path}: thiếu tiêu đề.`);
    for (const key of ['highlight', 'description', 'code']) check(isText(item[key]), `${path}.${key}: nội dung không hợp lệ.`);
    check(typeof item.enabled === 'boolean', `${path}: trạng thái không hợp lệ.`);
    check(item.startDate === '' || isDate(item.startDate), `${path}: ngày bắt đầu không hợp lệ.`);
    check(item.endDate === '' || isDate(item.endDate), `${path}: ngày kết thúc không hợp lệ.`);
    check(!item.startDate || !item.endDate || item.startDate <= item.endDate, `${path}: ngày kết thúc phải sau ngày bắt đầu.`);
  });
  if (!Array.isArray(data.hours) || data.hours.length !== 7) errors.push('Giờ mở cửa cần đủ 7 ngày.');
  else {
    const days = new Set();
    for (const item of data.hours) {
      if (!isObject(item)) { errors.push('Giờ mở cửa không hợp lệ.'); continue; }
      check(Number.isInteger(item.day) && item.day >= 0 && item.day <= 6 && !days.has(item.day), 'Ngày trong tuần không hợp lệ hoặc bị trùng.');
      days.add(item.day);
      check((item.open === null && item.close === null) || (validTime(item.open) && validTime(item.close) && item.open < item.close), 'Giờ đóng cửa cần sau giờ mở cửa.');
    }
  }
  return errors;
}

export async function loadPublishedContent() {
  const response = await fetch(new URL('../../content.json', import.meta.url), { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Unable to load website content (${response.status}).`);
  const data = await response.json();
  const errors = validateContent(data);
  if (errors.length) throw new Error(errors.join(' '));
  return data;
}

export function loadDraft(storage = globalThis.localStorage) {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const draft = JSON.parse(raw);
  if (!isObject(draft) || typeof draft.savedAt !== 'string' || validateContent(draft.content).length) throw new Error('Bản nháp không hợp lệ. Hãy xuất bản sao trước khi khôi phục dữ liệu gốc.');
  return draft;
}

export function saveDraft(content, storage = globalThis.localStorage) {
  const errors = validateContent(content);
  if (errors.length) throw new Error(errors.join(' '));
  const draft = { savedAt: new Date().toISOString(), content };
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function salonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: SALON_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = key => parts.find(p => p.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function salonTime(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: SALON_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

export function appointmentSlots(date, hours, now = new Date()) {
  if (!isDate(date) || date < salonDate(now)) return [];
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const schedule = hours.find(h => h.day === day);
  if (!schedule?.open || !schedule.close) return [];
  const toMinutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const currentTime = date === salonDate(now) ? toMinutes(salonTime(now)) : -1;
  const slots = [];
  for (let minute = toMinutes(schedule.open); minute < toMinutes(schedule.close); minute += 30) {
    if (minute <= currentTime) continue;
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return slots;
}

export function formatTime(value) {
  if (!validTime(value)) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function formatPrice(price) {
  return price === null ? 'Call for pricing' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 }).format(price);
}

export function activePromotions(promotions, date = salonDate()) {
  return promotions.filter(item => item.enabled && (!item.startDate || item.startDate <= date) && (!item.endDate || item.endDate >= date));
}

export function createElement(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

export function fullAddress(contact) {
  return `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}`;
}

export function uniqueId(prefix = 'item') {
  return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}
