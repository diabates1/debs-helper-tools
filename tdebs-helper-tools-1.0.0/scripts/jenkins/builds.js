#!/usr/bin/env node

/*******************************************************************************
 * Redmine Project Manager Healper.
 ******************************************************************************/

"use strict";

var program       = require('node_modules/commander')           ;
var jenkinsCon    = require('jenkins')                          ;
var fs            = require('fs')                               ;
var os            = require('os')                               ;
var tools         = require('node_ebs_libs/tools/tools')        ;
var msg           = require('node_ebs_libs/tools/msg')          ;
var sprintf       = require('node_ebs_libs/tools/sprintf')      ;

/*******************************************************************************
 * Input arguments.                                                             
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .usage('[options]')
  .option('    --filter <file>'                , 'Filtered  builds for operation')
  .option('    --what   <op>'                  , 'Action on builds {list}')
  .option('-s, --success'                      , 'Show      builds with "success" status')
  .option('-a  --abort'                        , 'Show      builds aborted')
  .option('-f  --fail'                         , 'Show      builds with "failure" status')
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
msg.debug("What             = " + program['what']);
if (!tools.isDefined(program['what'])) {
  msg.error("Nothing to do, please specify --what in between {list}");
  process.exit(1);
}
msg.debug("success          = " + program['success']);
msg.debug("abort            = " + program['abort']);
msg.debug("failure          = " + program['failure']);

/****************************************************************************** 
 * Load Redmine service configuration.
 *****************************************************************************/ 
var jenkinsEnv  = JSON.parse(fs.readFileSync("./jenkins.env.json", 'utf8'));
var credFile    = process.env[jenkinsEnv['env']] + '/' + jenkinsEnv.credential['file'];
var jenkinsCred = JSON.parse(fs.readFileSync(credFile, 'utf8')).credentials
                      .find(function(elt){return elt['name']
					              == jenkinsEnv.credential['key'];});
var jenkinsUrl  =   jenkinsEnv['protocol']         + "://"
                  + jenkinsEnv['host']             + ':'
                  + jenkinsEnv['port']                    ;
var jenkinsBUrl =   jenkinsEnv['protocol']         + "://"
                  + jenkinsCred['user']            + ":"
                  + jenkinsCred['token']['value']  + "@" 
                  + jenkinsEnv['host']             + ':'
                  + jenkinsEnv['port']                    ;
var jenkins     = new jenkinsCon({
                                   promisify   : true        ,
                                   depth       : 0           ,
                                   baseUrl     : jenkinsBUrl 
                                 });
jenkins.job.list()
  .then(function(jobs) {
    jobs.forEach(function (job) {
      var name   = job['name'] ;
      var status = undefined;
      switch (job['color']) {
        case 'disabled'       : status = ''              ; break;
        case 'notbuilt_anime' : status = '?  (building)' ; break;
        case 'blue_anime'     : status = ':) (building)' ; break;
        case 'blue'           : status = ':)'            ; break;
        case 'red_anime'      : status = ':( (building)' ; break;
        case 'red'            : status = ':('            ; break;
        case 'aborted_anime'  : status = ':s (building)' ; break;
        case 'aborted'        : status = ':s'            ; break;
        case 'disabled'       : status = '-'             ; break;
        default               : status = '? (' + job['color'] +')'; break;
      }
      var jobReport = sprintf("%-50s%s", name, status);
      msg.info(jobReport);
    });
  })
  .catch (function (err) {
    msg.error("Error while retreiving jenkins server job", err);
  })
