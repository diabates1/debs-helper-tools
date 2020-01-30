#!/usr/bin/env node

/*******************************************************************************
 * Redmine Project Manager Healper.
 ******************************************************************************/

"use strict";

var program       = require('node_modules/commander')           ;
var fs            = require('fs')                               ;
var tools         = require('node_ebs_libs/tools/tools')        ;
var msg           = require('node_ebs_libs/tools/msg')          ;
var sprintf       = require('node_ebs_libs/tools/sprintf')      ;
var Vodia         = require('vodia/vodia_api')                  ;

/*******************************************************************************
 * Input arguments.
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .usage('[options]')
  .option('    --ext   <##>'                  , 'Issue number to get data from'      )
  .option('    --what  <action>'              , 'Action to be performed on extension')
  .option('    --debug <items>'               , 'Debug flags to activate, available are {info, log, debug, error}, defaults are {info, error}',list)
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
msg.debug("Extension        = " + program['ext']);
if (!tools.isDefined(program['ext'])) {
  msg.error("Nothing to do, please specify --ext you want to work with, leave.");
  process.exit(1);
}
var extension = program['ext'];
msg.debug("What             = " + program['what']);
if (!tools.isDefined(program['what'])) {
  msg.error("Nothing to do, please specify --what action you want, leave.");
  process.exit(1);
}
var what  = program['what'];

/******************************************************************************
 * First is to login.
 *****************************************************************************/
var vodia     = new Vodia("./vodia.env.json");
vodia.login()
  .then(function (ret) {

    /**************************************************************************
     * Set back the session Id.
     *************************************************************************/
    vodia.setSession(ret);

    /**************************************************************************
     * Process the action.
     *************************************************************************/
    switch (what) {

      case 'info':
        vodia.extensionGet( "localhost", extension )
          .then(function (extData) {
            console.log(extData);
          })
          .catch (function (error) {
            msg.error("Cannot get information of extension <" + extension + ">, leave.");
            process.exit(1);
          });
        break;

      case 'create':
        vodia.extensionCreate( "localhost", extension )
          .then(function (ret) {
            msg.info("Extension <" + extension + "> done.");
          })
          .catch (function (error) {
            msg.error("API error", error);
            process.exit(1);
          });
        break;

      case 'shell':
        vodia.shell( extension )
          .then(function (ret) {
            msg.info("Command done!", ret);
          })
          .catch (function (error) {
            msg.error("API error", error);
            process.exit(1);
          });
        break;

      default:
        msg.error("Unknown action <" + what + ">, leave.");
        process.exit(1);
        break;
    }
  })
  .catch (function (error) {
    msg.error("Cannot login, leave.", error);
    process.exit(1);
  });

