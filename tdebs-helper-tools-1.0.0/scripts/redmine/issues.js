#!/usr/bin/env node

/*******************************************************************************
 * Redmine Project Manager Healper.
 ******************************************************************************/

"use strict";

var program       = require('node_modules/commander')           ;
var fs            = require('fs')                               ;
var tools         = require('node_ebs_libs/tools/tools')        ;
var msg           = require('node_ebs_libs/tools/msg')          ;
var Redmine       = require('node_ebs_libs/net/redmine')        ;
var sprintf       = require('node_ebs_libs/tools/sprintf')      ;

var delayMs       = 5000;

/*******************************************************************************
 * Input arguments.
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .usage('[options]')
  .option('    --issue  <##>'                  , 'Issue number to get data from'     )
  .option('    --what   <fields>'              , 'Data to retreive from issue'       , list)
  .option('    --sep    \':\''                 , 'Data separator, default \':\''     )
  .option('    --debug <items>'                , 'Debug flags to activate, available are {info, log, debug, error}, defaults are {info, error}',list)
  .parse(process.argv);

/******************************************************************************
 * Setting up default message level for start up until option is loaded.
 * Default is info and error.
 * Once can overwrite here.
 *****************************************************************************/
msg.set_level(  msg.MSG_ERROR
              | msg.MSG_INFO  );
if (tools.isDefined(program['debug'])) {
  for (var i = 0 ; i < program['debug'].length ; i++){
    msg.set_flag(program['debug'][i]);
  }
}
 /*
msg.set_level (   0
                | msg.MSG_INFO
                | msg.MSG_DEBUG
                | msg.MSG_ERROR
                | msg.MSG_ERROR_STACK );
//*/

/******************************************************************************
 * Checking arguments...
 *****************************************************************************/
msg.debug("Issue            = " + program['issue']);
if (!tools.isDefined(program['issue'])) {
  msg.error("Nothing to do, please specify --issue you want to work with, leave.");
  process.exit(1);
}
var issue = program['issue'];
msg.debug("What             = " + program['what']);
if (!tools.isDefined(program['what'])) {
  msg.error("Nothing to do, please specify --what data you want, leave.");
  process.exit(1);
}
var what  = program['what' ];
msg.debug("Separator        = " + program['sep']);
var sep = program['sep'];
if (!tools.isDefined(program['sep']))  {
  sep = " : ";
}

/******************************************************************************
 * Load Redmine service configuration.
 *****************************************************************************/
var redmine     = new Redmine("./redmine.env.json");

redmine.issue(issue)
  .then ( function (reply) {
    var i;
    var whatRet = [];
    for(i = 0; i < what.length; i++) {
      whatRet.push(eval("reply.issue." + what[i]));
    }
    var ret = whatRet.join(sep);
    console.log(ret);
  })
  .catch( function (error) {
    msg.error("Unable to retreive issue " + issue + ", leave.", error);
    process.exit(1);
  });

