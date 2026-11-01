const editor=document.querySelector('[data-grid-editor]');
const preview=document.querySelector('[data-grid-preview]');
const feedback=document.querySelector('[data-grid-feedback]');
function read(){
  // Accept only this lesson's three declarations, not arbitrary JavaScript or URLs.
  const declarations=editor.value.split(';').map(s=>s.trim()).filter(Boolean);
  const values={};
  for(const declaration of declarations){
    const match=declaration.match(/^([a-z-]+)\s*:\s*(.+)$/);
    if(!match||!['display','grid-template-columns','gap'].includes(match[1]))return null;
    values[match[1]]=match[2].trim();
  }
  if(values.display&&!/^(grid|block)$/.test(values.display))return null;
  if(values['grid-template-columns']&&!/^repeat\(\s*[1-8]\s*,\s*1fr\s*\)$/.test(values['grid-template-columns']))return null;
  if(values.gap&&!/^\d{1,2}px$/.test(values.gap))return null;
  return values;
}
function update(){const v=read();if(!v){feedback.textContent='Use display, grid-template-columns and gap. Check the colons and semicolons.';return;}preview.style.display=v.display||'block';preview.style.gridTemplateColumns=v['grid-template-columns']||'none';preview.style.gap=v.gap||'0px';feedback.textContent='Preview updated. Predict the result before you check it.';}
editor.addEventListener('input',update);
document.querySelector('[data-grid-check]').addEventListener('click',()=>{const v=read();if(!v){update();return;}const columns=v['grid-template-columns']?.match(/^repeat\(\s*([1-8])/);const pass=v.display==='grid'&&columns?.[1]==='4'&&v.gap==='24px';feedback.textContent=pass?'You made four columns with 24px gaps. Eight cards fill two rows. Now explain what 1fr means in your own words.':v.display!=='grid'?'First make the parent a grid container.':columns?.[1]!=='4'?'The target is four columns. Change the first number inside repeat().':'Set the gap to 24px, then check again.';});
update();
