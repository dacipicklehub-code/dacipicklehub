// app.js — extracted from index.html
// Global variables
let selectedSlots = new Set();
let pendingBookingEntries = [];
let pendingSlotsWithTimer = {}; // Track pending slots with timestamps
let searchedBookingReference = ''; // Store searched reference for success modal
let searchedBookingData = null; // Store searched booking data
let receiptBookingReference = ''; // Booking reference for current session
let receiptBookingTotal = 0; // Total amount for current booking
let receiptFile = null; // Receipt file upload (removed)
let lastSubmissionTime = 0; // Track last submission timestamp for duplicate prevention
let lastSubmissionSlots = []; // Track last submission slot keys for duplicate prevention
const SOFT_OPENING_RATE = 250; // Soft opening rate per hour
const WEEKDAY_RATE = 250; // Regular weekday rate (Mon-Fri)
const WEEKEND_RATE = 250; // Regular weekend rate (Sat-Sun)

// Blocked dates (YYYY-MM-DD format)
const BLOCKED_DATES = [];

// Soft opening period (dates where soft opening rates apply)
const SOFT_OPENING_DATES = [
  '2026-06-25',
  '2026-06-26',
  '2026-06-27'
];

let isRegularRateActive = false; // Legacy flag - not used with new date-based pricing

// Form validation handler for confirm modal
function sanitizeName(value) {
  return value.replace(/[^A-Za-z ]+/g, '').slice(0, 30);
}

function sanitizePhone(value) {
  let digits = String(value).replace(/\D+/g, '');
  if (digits.startsWith('63') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function isValidConfirmName(value) {
  return /^[A-Za-z ]{1,30}$/.test(value);
}

function isValidConfirmPhone(value) {
  return /^\d{10}$/.test(value);
}

function updateConfirmModalButtonState() {
  const confirmBtn = document.getElementById('confirmModalBtn');
  const nameInput = document.getElementById('confirmName');
  const phoneInput = document.getElementById('confirmPhone');
  
  if (!confirmBtn || !nameInput || !phoneInput) return;
  
  const rawName = nameInput.value;
  const rawPhone = phoneInput.value;
  const sanitizedName = sanitizeName(rawName);
  const sanitizedPhone = sanitizePhone(rawPhone);

  if (rawName !== sanitizedName) {
    nameInput.value = sanitizedName;
  }
  if (rawPhone !== sanitizedPhone) {
    phoneInput.value = sanitizedPhone;
  }

  const name = sanitizedName.trim();
  const phone = sanitizedPhone.trim();
  const isValid = isValidConfirmName(name) && isValidConfirmPhone(phone);

  confirmBtn.disabled = !isValid;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found:', message);
    return;
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Detect mobile/touch devices (Android, iOS, etc.)
function isMobileDevice() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

// Detect if user is in Facebook's in-app browser
function isFacebookBrowser() {
  const userAgent = navigator.userAgent || navigator.vendor || '';
  return /FBAN|FBAV|FB/.test(userAgent);
}

// Open page in external browser (Chrome/Safari)
window.openInExternalBrowser = function() {
  const currentUrl = window.location.href;
  if (/Android|webOS/i.test(navigator.userAgent)) {
    // Try Android Chrome
    window.location.href = 'intent://' + window.location.host + window.location.pathname + window.location.search + '#Intent;scheme=https;package=com.android.chrome;end';
  } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    // Try iOS Safari
    window.location.href = 'safari:' + currentUrl;
  }
};

// Close browser notice modal
window.closeBrowserNoticeModal = function() {
  const modal = document.getElementById('browserNoticeModal');
  if (modal) modal.classList.remove('open');
};

// Show browser notice modal
window.showBrowserNoticeModal = function() {
  const modal = document.getElementById('browserNoticeModal');
  if (modal) {
    modal.classList.add('open');
  }
};

window.getInitials = function(name) {
  if (!name) return '?';
  return String(name)
    .split(' ')
    .filter(Boolean)
    .map(n => n[0] || '')
    .slice(0, 3)
    .join('')
    .toUpperCase();
};

// Show mobile browser notice on page load
window.addEventListener('load', () => {
  if (isMobileDevice()) {
    showBrowserNoticeModal();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // Remove direct Supabase client - now using backend API
  // Supabase keys are stored in backend environment variables for security

  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusLabel");

  // Helper function to call backend API
  function getApiUrl() {
    if (location.protocol === 'file:') {
      return 'http://localhost:3000/api/bookings';
    }

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      if (location.port === '3000') {
        return `${location.protocol}//${location.host}/api/bookings`;
      }
      return 'http://localhost:3000/api/bookings';
    }

    return '/api/bookings';
  }

  async function callBackendAPI(action, data = {}) {
    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data })
      });

      if (!response.ok) {
        let errorBody = null;
        let textBody = null;
        try {
          errorBody = await response.json();
        } catch (parseError) {
          try {
            textBody = await response.text();
          } catch (textError) {
            textBody = null;
          }
        }
        const message = errorBody?.message || textBody || `API Error: ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        err.body = errorBody;
        err.text = textBody;
        throw err;
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

    const setViewportHeight = () => {
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => setTimeout(setViewportHeight, 150));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewportHeight);
      window.visualViewport.addEventListener('scroll', setViewportHeight);
    }

  function getRemainingTime(timestamp) {
    const now = Date.now();
    const elapsed = now - timestamp;
    const sixtyMins = 60 * 60 * 1000;
    if (elapsed >= sixtyMins) return '0:00';
    const remaining = sixtyMins - elapsed;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Load booked slots from backend API for a specific dateKey (YYYY-MM-DD)
  let bookedSlots = {};
  async function loadBookedSlotsForDate(dk) {
    bookedSlots = {};
    try {
      const result = await callBackendAPI('get-booked-slots', { bookingDate: dk });
      if (result.bookings && Array.isArray(result.bookings)) {
        result.bookings.forEach(row => {
          const courtIndex = COURTS.indexOf(row.court);
          if (courtIndex >= 0 && row.time_slot) {
            const status = (row.status || '').toString().toLowerCase();

            const key = `${dk}|${row.time_slot}|${courtIndex}`;

            if (status === 'pending') {
              let ts = Date.now();
              try {
                if (row.created_at) ts = new Date(row.created_at).getTime() || Date.now();
              } catch (e) {
                ts = Date.now();
              }
              const sixtyMins = 60 * 60 * 1000;
              if ((Date.now() - ts) < sixtyMins) {
                pendingSlotsWithTimer[key] = ts;
              } else {
                if (pendingSlotsWithTimer[key]) delete pendingSlotsWithTimer[key];
              }
              return;
            }

            bookedSlots[key] = row.customer_name || 'Unknown';
            if (pendingSlotsWithTimer[key]) delete pendingSlotsWithTimer[key];
          }
        });
      }
    } catch (e) {
      console.error('loadBookedSlotsForDate error', e);
      showToast('Could not load bookings (offline)');
    }
  }

  async function loadAndRenderTable() {
    const dk = dateKey(selectedDate);
    await loadBookedSlotsForDate(dk);
    renderTable();
  }

  window.refreshSlots = loadAndRenderTable;

  const WEEKDAY_SLOTS = [
    '4PM - 5PM',
    '5PM - 6PM',
    '6PM - 7PM',
    '7PM - 8PM',
    '8PM - 9PM',
    '9PM - 10PM'
  ];

  const WEEKEND_SLOTS = [
    '8AM - 9AM',
    '9AM - 10AM',
    '10AM - 11AM',
    '11AM - 12PM',
    '12PM - 1PM',
    '1PM - 2PM',
    '2PM - 3PM',
    '3PM - 4PM',
    '4PM - 5PM',
    '5PM - 6PM',
    '6PM - 7PM',
    '7PM - 8PM',
    '8PM - 9PM',
    '9PM - 10PM'
  ];

  function getSlotsForDate(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return WEEKEND_SLOTS;
    }
    return WEEKDAY_SLOTS;
  }

  const COURTS = ['Court One', 'Court Two'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let selectedDate = new Date();
  let today = new Date();
  let viewMonth = today.getMonth();
  let viewYear = today.getFullYear();

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateDisplay(d) {
    if (typeof d === 'string' || typeof d === 'number') {
      d = new Date(d);
    }
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      return String(d || '');
    }
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function getRate(slot, dateStr) {
    if (SOFT_OPENING_DATES.includes(dateStr)) {
      return SOFT_OPENING_RATE;
    }
    
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return WEEKEND_RATE;
    }
    
    return WEEKDAY_RATE;
  }

  function isDateBlocked(dateStr) {
    return BLOCKED_DATES.includes(dateStr);
  }

  function isSlotPast(dateKey, slot) {
    const selectedDateObj = new Date(selectedDate);
    const todayObj = new Date(today);
    const isToday = selectedDateObj.getFullYear() === todayObj.getFullYear() &&
                    selectedDateObj.getMonth() === todayObj.getMonth() &&
                    selectedDateObj.getDate() === todayObj.getDate();

    if (!isToday) return false;
    if (!slot || typeof slot !== 'string') return false;

    const startTimeStr = slot.split(' - ')[0];
    const timeMatch = startTimeStr.match(/^(\d{1,2})(?::(\d{2}))?\s?(AM|PM)$/i);
    if (!timeMatch) return false;

    const [, hoursStr, minsStr, periodRaw] = timeMatch;
    const period = periodRaw.toUpperCase();
    let hours = Number(hoursStr);
    let minutes = minsStr ? Number(minsStr) : 0;

    if (period === 'AM' && hours === 12) {
      hours = 0;
    } else if (period === 'PM' && hours !== 12) {
      hours += 12;
    }

    const slotTime = new Date(todayObj);
    slotTime.setHours(hours, minutes, 0, 0);

    const now = new Date();

    return slotTime <= now;
  }

  function renderCalendar() {
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    document.getElementById('calMonthYear').textContent = `${MONTHS[viewMonth]} ${viewYear}`;

    DAYS.forEach(day => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = day;
      grid.appendChild(el);
    });

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= totalDays; d++) {
      const day = document.createElement('div');
      day.className = 'cal-day';
      day.textContent = d;

      const thisDate = new Date(viewYear, viewMonth, d);
      const dateKeyStr = dateKey(thisDate);
      const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
      const isSelected = d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
      const isPast = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isBlocked = isDateBlocked(dateKeyStr);

      if (isToday) day.classList.add('today');
      if (isSelected && !isToday) day.classList.add('selected');
      if (isPast) day.classList.add('past');
      if (isBlocked) day.classList.add('blocked');

      if (!isPast && !isBlocked) {
        day.onclick = () => {
          selectedDate = new Date(viewYear, viewMonth, d);
          renderCalendar();
          loadAndRenderTable();
        };
      }

      grid.appendChild(day);
    }
  }

  document.getElementById('prevBtn').onclick = () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
    loadAndRenderTable();
  };

  document.getElementById('nextBtn').onclick = () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
    loadAndRenderTable();
  };

  window.goToToday = function() {
    selectedDate = new Date(today);
    viewMonth = today.getMonth();
    viewYear = today.getFullYear();
    renderCalendar();
    loadAndRenderTable();
  };

  function updatePendingTimerButtons() {
    const now = Date.now();
    const sixtyMins = 60 * 60 * 1000;
    const pendingButtons = document.querySelectorAll('.slot-pending');
    let needsRerender = false;

    pendingButtons.forEach(btn => {
      const slotKey = btn.dataset.slotKey;
      if (!slotKey) return;
      const start = pendingSlotsWithTimer[slotKey];
      if (!start || now - start >= sixtyMins) {
        delete pendingSlotsWithTimer[slotKey];
        needsRerender = true;
        return;
      }
      btn.textContent = `PENDING\n${getRemainingTime(start)}`;
    });

    if (needsRerender) {
      renderTable();
    }
  }

  function renderTable() {
    const dk = dateKey(selectedDate);
    document.getElementById('selectedDateLabel').textContent = formatDateDisplay(selectedDate);

    const body = document.getElementById('slotBody');
    body.innerHTML = '';

    if (isDateBlocked(dk)) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.style.textAlign = 'center';
      td.style.padding = '24px';
      td.style.color = '#ef4444';
      td.style.fontWeight = '700';
      td.textContent = '🚫 This date is blocked for bookings. Please choose other dates. Thank you';
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    const slots = getSlotsForDate(selectedDate);
    slots.forEach(slot => {
      const tr = document.createElement('tr');
      
      const tdTime = document.createElement('td');
      tdTime.className = 'time-cell';
      tdTime.textContent = slot;
      tr.appendChild(tdTime);

      COURTS.forEach((court, index) => {
        const tdC = document.createElement('td');
        const key = `${dk}|${slot}|${index}`;
        const btn = document.createElement('button');
        btn.className = 'slot-btn';

        const pastSlot = isSlotPast(dk, slot);

        if (bookedSlots[key]) {
          btn.classList.add('slot-booked');
          btn.textContent = window.getInitials(bookedSlots[key]);
          btn.disabled = true;
        }
        else if (pendingSlotsWithTimer[key] && (Date.now() - pendingSlotsWithTimer[key]) < 60 * 60 * 1000) {
          btn.classList.add('slot-pending');
          btn.dataset.slotKey = key;
          const remaining = getRemainingTime(pendingSlotsWithTimer[key]);
          btn.textContent = `PENDING\n${remaining}`;
          btn.style.whiteSpace = 'pre-wrap';
          btn.disabled = true;
        } else if (pastSlot) {
          btn.classList.add('slot-past');
          btn.textContent = 'Past';
          btn.disabled = true;
        } else if (selectedSlots.has(key)) {
          btn.classList.add('slot-selected');
          btn.textContent = '✓ Selected';
        } else {
          btn.classList.add('slot-available');
          btn.textContent = 'Available';
        }

        btn.onclick = () => {
          if (btn.disabled) return;
          if (selectedSlots.has(key)) {
            selectedSlots.delete(key);
          } else {
            selectedSlots.add(key);
          }
          updateCart();
          debounceRenderTable();
        };

        tdC.appendChild(btn);
        tr.appendChild(tdC);
      });

      body.appendChild(tr);
    });
  }

  function updateCart() {
    const count = selectedSlots.size;
    const total = [...selectedSlots].reduce((sum, key) => {
      const parts = key.split('|');
      return sum + getRate(parts[1], parts[0]);
    }, 0);

    document.getElementById('cartCount').textContent = `${count} slot${count !== 1 ? 's' : ''} selected`;
    document.getElementById('cartTotal').textContent = `₱${total.toLocaleString()}`;
    document.getElementById('cartBar').classList.toggle('visible', count > 0);
  }

  window.clearForm = function() {
    selectedSlots.clear();
    updateCart();
    loadAndRenderTable();
    closeModal();
    closeSuccessModal();
    const refInput = document.getElementById('searchRef');
    if (refInput) refInput.value = '';
    showToast("🧹 Selection cleared!");
  };

  window.openModal = function() {
    const refInput = document.getElementById('searchRef');
    if (refInput) {
      refInput.value = '';
      attachKeyboardScroll(refInput);
    }
    document.getElementById('bookingModal').classList.add('open');
    setTimeout(() => {
      const el = document.getElementById('searchRef');
      if (el) {
        el.focus();
        ensureInputVisible(el);
      }
    }, 120);
    updateCheckButtonState();
  };

  window.openConfirmModal = function() {
    if (selectedSlots.size === 0) {
      showToast('⚠️ Please select at least one time slot before proceeding.');
      return;
    }

    console.log('openConfirmModal called, selectedSlots:', [...selectedSlots]);
    
    const container = document.getElementById('confirmSlotsContainer');
    const dateEl = document.getElementById('confirmDate');
    const countEl = document.getElementById('confirmCount');
    const totalEl = document.getElementById('confirmTotal');
    const nameEl = document.getElementById('confirmName');
    const phoneEl = document.getElementById('confirmPhone');
    const confirmBtn = document.getElementById('confirmModalBtn');

    if (!container || !dateEl || !countEl || !totalEl) {
      console.error('Missing confirm modal elements:', {
        container: !!container,
        dateEl: !!dateEl,
        countEl: !!countEl,
        totalEl: !!totalEl,
        confirmModal: !!document.getElementById('confirmModal')
      });
      if (document.getElementById('confirmModal')) {
        return;
      }
      return openModal();
    }

    dateEl.textContent = formatDateDisplay(selectedDate);

    container.innerHTML = '';
    const sel = [...selectedSlots];
    let total = 0;
    sel.forEach(key => {
      const parts = key.split('|');
      const date = parts[0];
      const slot = parts[1];
      const courtIndex = parseInt(parts[2], 10);
      const court = COURTS[courtIndex] || 'Court';
      const price = getRate(slot, date);
      total += price;

      const card = document.createElement('div');
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.padding = '12px';
      card.style.borderRadius = '8px';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';

      const left = document.createElement('div');
      left.innerHTML = `<div class="slot-row-court">${court}</div><div class="slot-row-time">${slot}</div>`;
      const right = document.createElement('div');
      right.style.color = '#166534';
      right.style.fontWeight = '800';
      right.textContent = `₱${price}`;

      card.appendChild(left);
      card.appendChild(right);
      container.appendChild(card);
    });

    countEl.textContent = sel.length;
    totalEl.textContent = `₱${total}`;

    const existingName = document.getElementById('bookingName');
    const existingPhone = document.getElementById('bookingPhone');
    if (nameEl) nameEl.value = existingName ? sanitizeName(existingName.value) : '';
    if (phoneEl) phoneEl.value = existingPhone ? sanitizePhone(existingPhone.value) : '';

    document.getElementById('confirmModal').classList.add('open');
    setTimeout(() => {
      if (nameEl) {
        nameEl.focus();
        ensureInputVisible(nameEl);
      }
    }, 120);

    if (nameEl) {
      attachKeyboardScroll(nameEl);
      nameEl.removeEventListener('input', updateConfirmModalButtonState);
      nameEl.addEventListener('input', updateConfirmModalButtonState);
    }
    if (phoneEl) {
      attachKeyboardScroll(phoneEl);
      phoneEl.removeEventListener('input', updateConfirmModalButtonState);
      phoneEl.addEventListener('input', updateConfirmModalButtonState);
    }
    
    updateConfirmModalButtonState();
  };

  window.closeConfirmModal = function() { document.getElementById('confirmModal').classList.remove('open'); };

  window.closeModal = function() {
    document.getElementById('bookingModal').classList.remove('open');
  };

  window.openSuccessModal = function() {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.add('open');
  };

  window.handleDoneBooking = function() {
    closeSuccessModal();
    selectedSlots.clear();
    updateCart();
    loadAndRenderTable();
  };

  window.toggleSuccessPaymentExtension = function() {
    const checkbox = document.getElementById('successSaveCopy');
    const paySection = document.getElementById('successPaySection');
    const nextSteps = document.querySelector('.next-steps-card');
    const bottomRef = document.getElementById('bookingRefCardContainerBottom');
    if (!checkbox || !paySection || !nextSteps || !bottomRef) return;
    const show = checkbox.checked;
    paySection.style.display = show ? 'block' : 'none';
    nextSteps.style.display = show ? 'grid' : 'none';
    bottomRef.style.display = show ? 'block' : 'none';
  };

  window.populateSuccessModal = function() {
    const nameEl = document.getElementById('successName');
    const dateEl = document.getElementById('successDate');
    const totalEl = document.getElementById('successPaidTotal');
    const itemsEl = document.getElementById('successBookingItems');
    const refEl = document.getElementById('successRefDisplay');
    const refElBottom = document.getElementById('successRefDisplayBottom');
    const expiryEl = document.getElementById('successExpiryNote');
    const doneBtn = document.getElementById('successDoneBtn');
    const saveCopyCheckbox = document.getElementById('successSaveCopy');
    const paySection = document.getElementById('successPaySection');
    const nextSteps = document.querySelector('.next-steps-card');
    const bottomRef = document.getElementById('bookingRefCardContainerBottom');

    const name = document.getElementById('confirmName')?.value || 'Guest';
    const bookingRef = receiptBookingReference || `DACI-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const totalAmount = receiptBookingTotal || [...selectedSlots].reduce((sum, key) => {
      const parts = key.split('|');
      return sum + getRate(parts[1], parts[0]);
    }, 0);

    if (nameEl) nameEl.textContent = name;
    if (dateEl) dateEl.textContent = formatDateDisplay(selectedDate);
    if (totalEl) totalEl.textContent = `₱${totalAmount.toLocaleString()}`;
    if (itemsEl) {
      itemsEl.innerHTML = [...selectedSlots].map(key => {
        const parts = key.split('|');
        const court = COURTS[Number(parts[2])] || 'Court';
        const price = getRate(parts[1], parts[0]);
        return `
          <div class="success-booking-item">
            <div class="success-booking-item-info">
              <div class="success-booking-item-title">${court}</div>
              <div class="success-booking-item-meta">${parts[1]}</div>
            </div>
            <div class="success-booking-item-right">
              <div class="success-booking-item-price">₱${price}</div>
              <span class="status-badge pending">PENDING</span>
            </div>
          </div>
        `;
      }).join('');
    }
    if (refEl) refEl.textContent = bookingRef;
    if (refElBottom) refElBottom.textContent = bookingRef;
    if (expiryEl) expiryEl.textContent = 'Expires in 60:00';
    if (saveCopyCheckbox) saveCopyCheckbox.checked = false;
    if (paySection) paySection.style.display = 'none';
    if (nextSteps) nextSteps.style.display = 'none';
    if (bottomRef) bottomRef.style.display = 'none';
    if (doneBtn) doneBtn.disabled = false;

    bookingSubmissionTime = Date.now();
  };

  window.closeSuccessModal = function() {
    document.getElementById('successModal').classList.remove('open');
    bookingSubmissionTime = null;
  };

  // Initialize
  renderCalendar();
  loadAndRenderTable();

  let bookingSubmissionTime = null;
  let pendingPollInterval = null;
  let renderTableTimeout = null;
  
  function debounceRenderTable() {
    clearTimeout(renderTableTimeout);
    renderTableTimeout = setTimeout(() => {
      renderTable();
    }, 50);
  }

  function startPendingPoll() {
    if (pendingPollInterval) return;
    pendingPollInterval = setInterval(async () => {
      if (Object.keys(pendingSlotsWithTimer).length === 0) {
        clearInterval(pendingPollInterval);
        pendingPollInterval = null;
        return;
      }
      try {
        await loadAndRenderTable();
      } catch (e) {
        console.error('Pending poll load failed', e);
      }
    }, 10000);
  }

  setInterval(() => {
    const now = Date.now();
    const sixtyMins = 60 * 60 * 1000;
    let tableNeedsRefresh = false;

    Object.keys(pendingSlotsWithTimer).forEach(key => {
      if (now - pendingSlotsWithTimer[key] >= sixtyMins) {
        delete pendingSlotsWithTimer[key];
        tableNeedsRefresh = true;
      }
    });

    if (Object.keys(pendingSlotsWithTimer).length > 0) {
      updatePendingTimerButtons();
    } else if (tableNeedsRefresh) {
      renderTable();
    }

    if (bookingSubmissionTime) {
      const elapsed = now - bookingSubmissionTime;
      const thirtyMins = 30 * 60 * 1000;
      const remaining = thirtyMins - elapsed;
      
      if (remaining <= 0) {
        const expiryEl = document.getElementById('successExpiryNote');
        if (expiryEl) expiryEl.textContent = 'Payment window expired - booking requires re-submission';
        bookingSubmissionTime = null;
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const expiryEl = document.getElementById('successExpiryNote');
        if (expiryEl) {
          expiryEl.textContent = `Expires in ${mins}:${secs.toString().padStart(2, '0')}`;
        }
      }
    }
  }, 1000);

  const attachKeyboardScroll = (inputEl) => {
    if (!inputEl || inputEl.dataset.keyboardScrollAttached === 'true') return;
    const scrollHandler = () => {
      setTimeout(() => {
        if (document.activeElement !== inputEl) return;
        const modal = inputEl.closest('.modal');
        if (modal) {
          const inputRect = inputEl.getBoundingClientRect();
          const modalRect = modal.getBoundingClientRect();
          const topGap = inputRect.top - modalRect.top;
          const bottomGap = modalRect.bottom - inputRect.bottom;
          if (topGap < 120 || bottomGap < 180) {
            const scrollAmount = topGap - 120;
            modal.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          }
        }
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }, 220);
    };
    inputEl.addEventListener('focus', scrollHandler);
    inputEl.addEventListener('touchstart', scrollHandler);
    inputEl.dataset.keyboardScrollAttached = 'true';
  };

  const ensureInputVisible = (inputEl) => {
    if (!inputEl) return;
    setTimeout(() => {
      if (document.activeElement !== inputEl) return;
      const modal = inputEl.closest('.modal');
      if (modal) {
        const inputRect = inputEl.getBoundingClientRect();
        const modalRect = modal.getBoundingClientRect();
        const topGap = inputRect.top - modalRect.top;
        const bottomGap = modalRect.bottom - inputRect.bottom;
        if (topGap < 120 || bottomGap < 180) {
          const scrollAmount = topGap - 120;
          modal.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
      }
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 240);
  };

  function updateCheckButtonState() {
    const btn = document.getElementById('checkRefBtn');
    const ref = document.getElementById('searchRef');
    if (!btn) return;
    btn.disabled = !ref || !ref.value.trim();
  }

  const searchInputEl = document.getElementById('searchRef');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', updateCheckButtonState);
    searchInputEl.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const btn = document.getElementById('checkRefBtn');
        if (btn && !btn.disabled) checkReference();
      }
    });
  }

  window.checkReference = async function() {
    const refEl = document.getElementById('searchRef');
    const btn = document.getElementById('checkRefBtn');
    const resultsEl = document.getElementById('bookingCheckResults');
    const contentEl = document.getElementById('bookingResultsContent');

    if (!refEl) return;
    const ref = refEl.value.trim();
    if (!ref) {
      showToast('⚠️ Please enter a reference number');
      return;
    }

    if (btn) {
      btn.disabled = true;
      var prevText = btn.textContent;
      btn.textContent = 'Checking...';
    }

    try {
      const result = await callBackendAPI('get-booking-by-reference', { reference: ref });
      if (!result || !result.bookings || result.bookings.length === 0) {
        if (contentEl) {
          contentEl.innerHTML = '<div style="color:#f87171;text-align:center;padding:16px;">🔎 Reference not found</div>';
        }
        if (resultsEl) resultsEl.style.display = 'block';
        return;
      }

      if (contentEl) {
        contentEl.innerHTML = '<div style="color:#257C36;text-align:center;padding:16px;">✅ Booking found</div>';
      }
      if (resultsEl) resultsEl.style.display = 'block';

    } catch (err) {
      console.error('Search error:', err);
      if (contentEl) {
        const errorMsg = err?.message || 'Unknown error';
        contentEl.innerHTML = `<div style="color:#f87171;text-align:center;padding:16px;">❌ Error: ${errorMsg}</div>`;
      }
      if (resultsEl) resultsEl.style.display = 'block';
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText || 'Check Status';
      }
    }
  };

  window.submitBooking = async function() {
    const confirmBtn = document.getElementById('confirmBtn') || document.getElementById('confirmModalBtn');
    if (confirmBtn && confirmBtn.disabled) {
      showToast('⏱️ Please wait - your booking is being submitted...');
      return;
    }
    
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
    }
    
    if (selectedSlots.size === 0) {
      showToast('⚠️ Please select at least one time slot');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Next';
      }
      return;
    }

    const nameInput = document.getElementById('confirmName');
    const phoneInput = document.getElementById('confirmPhone');
    const name = nameInput ? sanitizeName(nameInput.value).trim() : '';
    const phone = phoneInput ? sanitizePhone(phoneInput.value).trim() : '';

    if (!isValidConfirmName(name) || !isValidConfirmPhone(phone)) {
      showToast('⚠️ Please enter a valid name and 10-digit phone number');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Next';
      }
      return;
    }

    const bookingRef = `DACI-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const bookings = [...selectedSlots].map(key => {
      const [date, slot, courtIndex] = key.split('|');
      const courtName = COURTS[Number(courtIndex)] || 'Court';
      const price = getRate(slot, date);
      return {
        booking_date: date,
        booking_time: slot,
        time_slot: slot,
        court: courtName,
        court_name: courtName,
        customer_name: name,
        phone_number: phone,
        reference_code: bookingRef,
        status: 'pending',
        price,
        rate: price
      };
    });

    try {
      const result = await callBackendAPI('bulk-insert-bookings', { bookings });
      if (!result || !result.success) {
        throw new Error(result?.error || 'Booking save failed');
      }

      receiptBookingReference = bookingRef;
      receiptBookingTotal = bookings.reduce((sum, booking) => sum + booking.price, 0);
      showToast('✅ Booking submitted!');
      closeConfirmModal();
      populateSuccessModal();
      openSuccessModal();
    } catch (err) {
      console.error('Booking error:', err);
      showToast(`Booking failed: ${err.message || 'Please try again.'}`);
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Next';
      }
      return;
    }

    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Next';
    }
  };
});
