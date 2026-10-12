import React,{useState} from 'react';
import {backupText,previewRestore,cleanRecords} from './backups';
export default function LocalBackup({kind,records,save,unavailable=false}) {
  const [preview,setPreview]=useState(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const exportFile=() => {
    try {const url=URL.createObjectURL(new Blob([backupText(kind,records)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`riftbound-${kind}-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(() => URL.revokeObjectURL(url),1000);setError('');}
    catch {setError('Could not export these records. Existing browser storage is unchanged.');}
  };
  return <details className="rb-local-backup"><summary>Back up or restore {kind}</summary>
    <p>Download your browser records before moving devices or clearing browser storage. Restoring merges new records and preserves existing ones.</p>
    {unavailable && <p>Backups are unavailable while saved records cannot be opened. Your original browser storage is preserved.</p>}
    <button disabled={unavailable} onClick={exportFile}>Download {kind} backup</button>
    <label>Preview a backup<input disabled={unavailable} type="file" accept=".json,application/json" onChange={async event => {
      const file=event.target.files?.[0];event.target.value='';setPreview(null);setNotice('');if(!file)return;
      try {if(file.size>2*1024*1024)throw new Error('Use a backup smaller than 2 MB');setPreview(previewRestore(kind,await file.text(),records));setError('');}
      catch(issue) {setError(issue.message);}
    }} /></label>
    {error && <p role="alert">{error}</p>}
    {preview && <><p>{preview.added} new records · {preview.skipped} identical records skipped. Nothing has been saved yet.</p><button disabled={unavailable || !preview.added} onClick={() => {
      if(preview.snapshot!==JSON.stringify(cleanRecords(kind,records))) {setError('Records changed since preview. Choose the backup again.');setPreview(null);return;}
      if(save(preview.records)) {setNotice(`${preview.added} records restored.`);setPreview(null);setError('');}
    }}>Restore previewed records</button><button onClick={() => setPreview(null)}>Cancel restore</button></>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
