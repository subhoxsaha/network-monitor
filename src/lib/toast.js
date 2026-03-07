import toast from 'react-hot-toast';

export const notify = {
  /**
   * Success notification
   */
  success: (message, options = {}) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      ...options,
    });
  },

  /**
   * Error notification
   */
  error: (message, options = {}) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      ...options,
    });
  },

  /**
   * Loading notification
   */
  loading: (message, options = {}) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options,
    });
  },

  /**
   * Info notification
   */
  info: (message, options = {}) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      ...options,
    });
  },

  /**
   * Warning notification
   */
  warning: (message, options = {}) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: '⚠️',
      ...options,
    });
  },

  /**
   * Dismiss all toasts
   */
  dismiss: () => {
    toast.remove();
  },

  /**
   * Promise notification
   */
  promise: (promise, { loading, success, error }, options = {}) => {
    return toast.promise(
      promise,
      {
        loading,
        success,
        error,
      },
      {
        position: 'top-right',
        ...options,
      }
    );
  },
};

export default notify;
