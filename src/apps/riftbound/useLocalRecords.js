import { useCallback, useEffect, useState } from 'react';

export default function useLocalRecords(key, validate) {
  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      return { records: validate(raw ? JSON.parse(raw) : []), raw, error: '' };
    } catch {
      return { records: [], raw: null, error: 'Saved data could not be opened. Existing storage has been preserved. Enable browser storage or restore your saved data to continue.' };
    }
  }, [key, validate]);
  const [state, setState] = useState(read);
  const [writeError, setWriteError] = useState('');
  useEffect(() => {
    const reload = event => { if (event.key === key || event.key === null) setState(read()); };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, [key, read]); // Read only when another window changes this key.
  const save = records => {
    if (state.error) return false;
    try {
      if (localStorage.getItem(key) !== state.raw) {
        setState(read());
        setWriteError('Saved data changed in another window. Review the latest version and try again.');
        return false;
      }
      const raw = JSON.stringify(validate(records));
      localStorage.setItem(key, raw);
      setState({ records, raw, error: '' });
      setWriteError('');
      return true;
    } catch {
      setWriteError('Could not save. Browser storage may be full or unavailable; your previous saved data is unchanged.');
      return false;
    }
  };
  return { records: state.records, save, error: state.error || writeError, unavailable: !!state.error };
}
