import { useEffect, useState } from 'react';
import { getRiftbound } from './api';
export default function useSetTools() {
  const [set, setSet] = useState('');
  const [sets, setSets] = useState([]);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const key=`${set}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const facets = await getRiftbound('facets', controller.signal);
      if (controller.signal.aborted) return;
      setSets(facets.sets);
      const selected = set || facets.sets.find(item => item.id === 'OGN')?.id || facets.sets[0]?.id;
      if (!selected) throw new Error('Import the card catalog before using this tool.');
      if (!set) { setSet(selected); return; }
      const data = await getRiftbound(`set-tools?set=${encodeURIComponent(selected)}`, controller.signal);
      if (!controller.signal.aborted) setState({ loading: false, error: '', data, key });
    })().catch(error => { if (!controller.signal.aborted) setState({ loading: false, error: error.message, data: null, key }); });
    return () => controller.abort();
  }, [set, key]);
  const stale=state.key!==key;
  return { ...state, ...(stale ? {loading:true,data:null,error:''} : {}), sets, set, setSet, refresh: () => setRetry(value => value+1) };
}
