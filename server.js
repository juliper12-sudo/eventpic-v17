const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname, port=8765;
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.js':'text/javascript'};
http.createServer((req,res)=>{
 let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/')u='/index.html';
 const f=path.join(root,u);
 if(!f.startsWith(root)){res.writeHead(403);return res.end()}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)})
}).listen(port,'127.0.0.1',()=>console.log('Eventpic: http://127.0.0.1:'+port));