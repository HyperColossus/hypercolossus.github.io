export function validateEvents(value) {
  if (!Array.isArray(value) || value.length > 200) throw new Error('Invalid events');
  const ids = new Set();
  for (const event of value) {
    if (!event || typeof event.id !== 'string' || !event.id || event.id.length>100 || ids.has(event.id) || typeof event.name !== 'string' || !event.name.trim() || event.name.length > 100 || typeof event.location !== 'string' || event.location.length > 200 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.date) || !Number.isFinite(Date.parse(event.date))) throw new Error('Invalid event');
    const [year,month,day,hour,minute]=event.date.match(/\d+/g).map(Number);
    const date=new Date(Date.UTC(year,month-1,day,hour,minute));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day||hour>23||minute>59) throw new Error('Invalid event');
    ids.add(event.id);
  }
  return value;
}
