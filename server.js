const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname,'studyhub-data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

const server = http.createServer(app);
const io = new Server(server,{cors:{origin:'*'}});

// State: classes, messages, notes
let state = { classes: { "11": { messages: [], notes: [] }, "12": { messages: [], notes: [] } } };

// Load persisted state
try{ if(fs.existsSync(DATA_FILE)) state = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch(e){console.warn(e);}
function persist(){ fs.writeFileSync(DATA_FILE, JSON.stringify(state,null,2)); }

// File upload
const upload = multer({ dest: path.join(__dirname,'public','uploads') });
app.post('/upload', upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).send('No file uploaded');
  res.json({url:'/uploads/'+req.file.filename});
});

// Socket.IO
io.on('connection', socket=>{
  console.log('Connected:', socket.id);
  socket.emit('init', state);

  // Chat message
  socket.on('chat:send', ({name,text,classId})=>{
    const msg={id:Date.now()+"-"+Math.random().toString(36).slice(2,8), name, text, ts:Date.now()};
    state.classes[classId].messages.push(msg);
    io.emit('chat:new',{...msg,classId});
    persist();
  });

  // Notes
  socket.on('notes:save', ({title,body,classId})=>{
    const note={id:Date.now()+"-"+Math.random().toString(36).slice(2,8), title, body, ts:Date.now()};
    state.classes[classId].notes.push(note);
    io.emit('notes:update',{notes:state.classes[classId].notes,classId});
    persist();
  });

  socket.on('notes:delete', ({id,classId})=>{
    state.classes[classId].notes=state.classes[classId].notes.filter(n=>n.id!==id);
    io.emit('notes:update',{notes:state.classes[classId].notes,classId});
    persist();
  });

  // Voice chat signaling
  socket.on('voice:offer', data=>socket.broadcast.emit('voice:offer', data));
  socket.on('voice:answer', data=>socket.broadcast.emit('voice:answer', data));
  socket.on('voice:candidate', data=>socket.broadcast.emit('voice:candidate', data));
});

server.listen(PORT,()=>console.log(`WhatsApp-style StudyHub running at http://localhost:${PORT}`));
