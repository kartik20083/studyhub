const socket=io();
const messagesDiv=document.getElementById('messages');
const nameInput=document.getElementById('nameInput');
const classSelect=document.getElementById('classSelect');
let currentClass=classSelect.value;

classSelect.addEventListener('change',()=>{ currentClass=classSelect.value; renderNotes([]); });

socket.on('init', data=>{
  data.classes[currentClass].messages.forEach(renderMessage);
  renderNotes(data.classes[currentClass].notes);
});

socket.on('chat:new', msg=>{ if(msg.classId===currentClass) renderMessage(msg); });
socket.on('notes:update', ({notes,classId})=>{ if(classId===currentClass) renderNotes(notes); });

function renderMessage(msg){
  const div=document.createElement('div');
  div.classList.add('message-bubble');
  div.classList.add(msg.name===nameInput.value?'outgoing':'incoming');
  let content=msg.text;
  if(/\.(jpg|jpeg|png|gif)$/i.test(msg.text)) content=`<img src="${msg.text}" style="max-width:100%;">`;
  else if(/\.(mp4|webm|ogg)$/i.test(msg.text)) content=`<video src="${msg.text}" controls style="max-width:100%;"></video>`;
  div.innerHTML=`<b>${msg.name}</b>: ${content}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop=messagesDiv.scrollHeight;
}

function sendMessage(){
  const text=document.getElementById('chatInput').value;
  if(!text.trim()) return;
  socket.emit('chat:send',{name:nameInput.value||'Anon',text,classId:currentClass});
  document.getElementById('chatInput').value='';
}

document.getElementById('fileInput').addEventListener('change', async e=>{
  const file=e.target.files[0];
  if(!file) return;
  const formData=new FormData();
  formData.append('file',file);
  const res=await fetch('/upload',{method:'POST',body:formData});
  const data=await res.json();
  socket.emit('chat:send',{name:nameInput.value||'Anon',text:data.url,classId:currentClass});
  e.target.value='';
});

// Notes rendering
function renderNotes(notes){
  const div=document.getElementById('notesList');
  div.innerHTML='';
  notes.forEach(n=>{
    const note=document.createElement('div');
    note.innerHTML=`<b>${n.title}</b><p>${n.body}</p>`;
    div.appendChild(note);
  });
}

// Voice chat placeholder
function startVoiceChat(){ alert("Voice chat coming soon!"); }
