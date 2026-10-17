import { toast } from 'react-toastify';

// Shared non-blocking notifications rendered by the application's ToastContainer.
export const notify = (message) => toast(String(message), { role: 'status' });

const redirectMessageKey = 'certiverxia:redirect-notification';
export const notifyAfterRedirect = (message) => {
  sessionStorage.setItem(redirectMessageKey, String(message));
};

export const showRedirectNotification = () => {
  const message = sessionStorage.getItem(redirectMessageKey);
  if (message) {
    sessionStorage.removeItem(redirectMessageKey);
    notify(message);
  }
};
