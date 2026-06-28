// index.js — page-specific scripts for index.html

function toggleFAQ(button) {
  const faqItem = button.closest('.faq-item-new');
  if (!faqItem) return;
  faqItem.classList.toggle('active');
  button.setAttribute('aria-expanded', faqItem.classList.contains('active') ? 'true' : 'false');
}

document.addEventListener('DOMContentLoaded', () => {
  const faqButtons = document.querySelectorAll('.faq-toggle');
  faqButtons.forEach(button => {
    button.addEventListener('click', () => toggleFAQ(button));
  });

  const openSearchBtn = document.getElementById('openSearchBtn');
  const searchBookingBtn = document.getElementById('searchBookingBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const proceedBtn = document.getElementById('proceedBtn');
  const bookingCancelBtn = document.getElementById('bookingCancelBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const successDoneBtn = document.getElementById('successDoneBtn');
  const checkRefBtn = document.getElementById('checkRefBtn');
  const openMessengerBtn = document.getElementById('openMessengerBtn');

  const safeCall = (fnName) => () => {
    if (typeof window[fnName] === 'function') {
      window[fnName]();
    } else {
      console.warn(`${fnName} is not defined yet`);
    }
  };

  if (openSearchBtn) openSearchBtn.addEventListener('click', safeCall('openModal'));
  if (searchBookingBtn) searchBookingBtn.addEventListener('click', safeCall('openModal'));
  if (refreshBtn) refreshBtn.addEventListener('click', safeCall('refreshSlots'));
  if (clearBtn) clearBtn.addEventListener('click', safeCall('clearForm'));
  if (proceedBtn) proceedBtn.addEventListener('click', safeCall('openConfirmModal'));
  if (bookingCancelBtn) bookingCancelBtn.addEventListener('click', safeCall('closeModal'));
  if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', safeCall('closeConfirmModal'));
  const confirmModalBtn = document.getElementById('confirmModalBtn');
  if (confirmModalBtn) confirmModalBtn.addEventListener('click', safeCall('submitBooking'));
  if (successDoneBtn) successDoneBtn.addEventListener('click', safeCall('handleDoneBooking'));
  if (checkRefBtn) checkRefBtn.addEventListener('click', safeCall('checkReference'));

  if (openMessengerBtn) {
    openMessengerBtn.addEventListener('click', () => {
      window.location.href = 'https://www.facebook.com/profile.php?id=61591229829491';
    });
  }
});
