var net = require("net");
require("log4js");

var trafficLeft = 0;
var monthlyTraffic = 13 * 1024 * 1024 * 1024; //13GB
var targetHost = "moviecontrol.netflix.com";
var connectionCounter = 0;

function forwardOnPort(port){
  var server = net.createServer(function(inCon){
    var outCon;
    
    if(trafficLeft <= 0){
      //forward to internal sorry http server
      outCon = net.createConnection(3000, "127.0.0.1");
    } else {
      //forward to target 
      outCon = net.createConnection(port, targetHost);
    }
    
    var conID = connectionCounter++;
    console.log("new connection #" + conID);
    
    //proxy the incoming connection 
    inCon.pipe(outCon);
    outCon.pipe(inCon);
    
    //output errors
    outCon.on('error', console.error);
    inCon.on('error', console.error);
    
    //decrease traffic left on connection end
    function decraseTrafficLeft(con){
      return function(){
        var traffic = 0;
        traffic+= con.bytesRead;
        traffic+= con.bytesWritten;
        
        trafficLeft-=traffic;
        console.log("connection #" + conID + " used " + traffic + " bytes of traffic");
      }
    }
    inCon.on('end', decraseTrafficLeft(inCon));
    outCon.on('end', decraseTrafficLeft(outCon));
  });
  
  server.listen(port);
  console.log("listening on port", port);
}
forwardOnPort(80);
forwardOnPort(443);

//sorry http server
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Sorry, our daily traffic limit is exceeded, try it again tomorrow\n');
}).listen(3000);

function recalculateTraffic(){
  //hack to get days of month
  var daysOfMonth = new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  
  //add new traffic and halve the traffic that was left
  trafficLeft = Math.round(monthlyTraffic/daysOfMonth +  trafficLeft/2);
  
  //recalculate every day
  setTimeout(recalculateTraffic, 86400000);
}
recalculateTraffic();

//output every minute the amount of traffic left
setInterval(function(){
  console.log(trafficLeft + " bytes traffic left");
}, 1000 * 60);
:w

