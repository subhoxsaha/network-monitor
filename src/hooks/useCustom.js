import { useState, useCallback, useEffect } from 'react';
import { notify } from '../lib/toast';

/**
 * useAsync - Handle async operations with loading/error states
 */
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
};

/**
 * useCopy - Copy to clipboard with notification
 */
export const useCopy = (timeout = 2000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        notify.success('Copied to clipboard');

        setTimeout(() => setIsCopied(false), timeout);
      } catch (err) {
        notify.error('Failed to copy');
        console.error('Copy failed:', err);
      }
    },
    [timeout]
  );

  return { copy, isCopied };
};

/**
 * useLocalStorage - Sync state with localStorage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

/**
 * useDebounce - Debounce value changes
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useThrottle - Throttle function calls
 */
export const useThrottle = (callback, delay = 500) => {
  const [lastRun, setLastRun] = useState(Date.now());

  return useCallback(
    (...args) => {
      if (Date.now() - lastRun >= delay) {
        callback(...args);
        setLastRun(Date.now());
      }
    },
    [callback, delay, lastRun]
  );
};

/**
 * usePrevious - Get previous value
 */
export const usePrevious = (value) => {
  const [prev, setPrev] = useState();

  useEffect(() => {
    setPrev(value);
  }, [value]);

  return prev;
};

/**
 * useWindowSize - Track window size
 */
export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

/**
 * useOnClickOutside - Detect clicks outside element
 */
export const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

/**
 * useToggle - Simple toggle state
 */
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle, setValue];
};

/**
 * useFormInput - Form input management
 */
export const useFormInput = (initialValue = '') => {
  const [value, setValue] = useState(initialValue);

  return {
    bind: {
      value,
      onChange: (e) => setValue(e.target.value),
    },
    value,
    setValue,
    reset: () => setValue(initialValue),
  };
};
