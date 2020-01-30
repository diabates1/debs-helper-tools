#!/usr/bin/env node

/*******************************************************************************
 * BTC command helper.
 ******************************************************************************/

"use strict";

// First use here so keep link there :)
// Source: https://www.npmjs.com/package/commander
var program   = require('node_modules/commander')        ;
var tools     = require('node_ebs_libs/tools/tools')     ;
var msg       = require('node_ebs_libs/tools/msg')       ;
var dgram     = require('dgram');

/*******************************************************************************
 * Input arguments.
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .option('-i, --ip    <xxx.xxx.xxx.xxx>' , 'Host IP   to listen to.'                                   )
  .option('-p, --port  <pppp>'            , 'Host port to listen to.'                                   )
  .option('-c, --cmd   <\"...\">'         , 'Command to send to bootloader in response to hello message')
  .option('    --debug <items>'           , 'Debug flags to activate, available are {info, log, debug, error}',list)
  .parse(process.argv);

/******************************************************************************
 * Setting up default message level for start up until option is loaded.
 * Once can overwrite here.
 *****************************************************************************/
if (tools.isDefined(program['debug'])) {
  msg.set_level(msg.MSG_ERROR);
  for (var i = 0 ; i < program['debug'].length ; i++)
    msg.set_flag(program['debug'][i]);
}
  /*
msg.set_level (   0
                | msg.MSG_INFO
                | msg.MSG_DEBUG
                | msg.MSG_ERROR
                | msg.MSG_ERROR_STACK );
//*/
global.msg = msg;


/******************************************************************************
 * Checking arguments... mandatory are list & search dir.
 *****************************************************************************/
msg.debug("Command : " + program['cmd']);
if ( (! tools.isDefined(program['cmd'])) ) {
  msg.error("Please make sure you have enter a command to send to BTC (check help using -h or --help).");
  process.exit(1);
}
var command     = program['cmd'];

msg.debug("IP      : " + program['ip']);
if ( (! tools.isDefined(program['ip'])) ) {
  msg.error("Please make sure you have enter an ip to listen to (check help using -h or --help).");
  process.exit(1);
}
var ip = program['ip'];

msg.debug("Port    : " + program['port']);
if ( (! tools.isDefined(program['port'])) ) {
  msg.error("Please make sure you have enter a port to listen to (check help using -h or --help).");
  process.exit(1);
}
var port = program['port'];


/******************************************************************************
 * Format message using:
 * --------------------- 
 * 
 * MSB first.
 *
 *      +-------+-------+-------+-------+
 *      |   3   |   2   |   1   |   0   |
 *      +-------+-------+-------+-------+
 * 0x00 | Magic number                  |
 *      +-------+-------+-------+-------+
 * 0x04 | Magic cont.   | Type          |
 *      +-------+-------+-------+-------+
 * 0x08 | Length                        |
 *      +-------+-------+-------+-------+    +-------+-------+-------+-------+
 * 0x0c | Ack           | Msg           | or | Ret code.                     |
 *      +-------+-------+-------+-------+    +-------+-------+-------+-------+
 * 0x10 | Msg cont...                   |
 *      +-------+-------+-------+-------+
 * ...  | Msg cont...                   |
 *      +-------+-------+-------+-------+
 *
 *****************************************************************************/
var command_buf = new Buffer(command);
// See magic  stuff in btc.
var magic_buf   = new Buffer([ 84, 68, 80, 82, 84, 68 ]);
// See type   stuff in btc.
var type_buf    = new Buffer([ 0,  2 ]);
// See length stuff in btc
var total_length =   magic_buf.length
                   + type_buf.length
                   + 4 /*length_buf.length*/
                   + command_buf.length
                   + 2 ;/*ack_buf.length*/
// See length stuff in btc
var length_buf  = new Buffer([ 
                               ((total_length & 0xff000000)>>24),
                               ((total_length & 0x00ff0000)>>16),
                               ((total_length & 0x0000ff00)>> 8),
                               ((total_length & 0x000000ff)    ),
                             ]);
var ack_buf      = new Buffer([ 0,  0 ]);

msg.info("Preparing packet with length <" + total_length + ">.");
command_buf = Buffer.concat([magic_buf, type_buf, length_buf, ack_buf, command_buf] , total_length)
//console.log("Buffer", command_buf);
var type_ack         = new Buffer([ 0,  4 ]);
var total_length_ack = magic_buf.length +
                       type_ack.length  +
                       4
var length_ack       = new Buffer([ 
                               ((total_length_ack & 0xff000000)>>24),
                               ((total_length_ack & 0x00ff0000)>>16),
                               ((total_length_ack & 0x0000ff00)>> 8),
                               ((total_length_ack & 0x000000ff)    ),
                             ]);
var buf_ack = new Buffer(40)
buf_ack = Buffer.concat([magic_buf,type_ack,length_ack],total_length_ack);


/******************************************************************************
 * Starting UDP server to listen for hello message.
 *****************************************************************************/

msg.info("Wait for hello message on " + ip + ":" + port  + " and send comand <" + command + ">");

var target_ip = "192.168.1.1"
var server    = dgram.createSocket('udp4');

server.on('error', (err) => {
  global.msg.error("BTC command server error:\n" + err.stack);
  server.close();
  process.exit(1);
});

server.on('message', (msg, rinfo) => {

  /***************************************************************************/
  /* Is the essage come from target?
   ***************************************************************************/
  if (rinfo.address == target_ip) {

    /*************************************************************************/
    /* Which message arrived? Is it hello message?
     *************************************************************************/
    var hdr_str = "Bootcode version";
    var hdr_msg = msg.toString('utf8', 0, hdr_str.length);

    if (hdr_str === hdr_msg) {
      global.msg.info("Send command <" + command + ">");
      setTimeout( () => {
        server.send(command_buf             ,
                    0, command_buf.length   ,
                    port, '192.168.1.1' );
      }, 200);
    }

    /*************************************************************************/
    /* Message is ack instead (or reset by command).
     *************************************************************************/
    else {
      //console.log(msg);
      var ret = (msg.readInt8(12) << 24) + (msg.readInt8(13) << 16) + (msg.readInt8(14) <<  8) + (msg.readInt8(15));
      global.msg.info("Command executed with return <" + (ret == 1 ? "success" : "failure") + ">.");
      setTimeout( () => {
        global.msg.info("Send ACK of ACK!");
        server.send(buf_ack                 ,
                    0, buf_ack.length       ,
                    port, '192.168.1.1'     );
        setTimeout(() => {server.close();process.exit((ret == 1 ? 0 : 1));}, 1000);
      }, 200);
    }

  }
});

server.on('listening', () => {
  const address = server.address();
  server.setBroadcast(true);
  msg.info("BTC command server listening " + address.address + ":" + address.port + "...");
});

server.bind({ 'address'     : '0.0.0.0',
              'port'        : port ,
              'exclusive'   : true } );
