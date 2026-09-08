const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=Number(process.env.PORT)||8765;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let u=decodeURIComponent(req.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.resolve(root,'.'+u);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end('403')}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)})
}).listen(port,'0.0.0.0',()=>console.log('Eventpic disponível na porta '+port));