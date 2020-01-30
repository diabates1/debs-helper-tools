#!/usr/bin/env node

// Example: listing wiki of a project.
// https://td-rdm-001.td-tcl.com:9427/redmine/projects/tonly_digital_2013_gtw_intel_grxxxx_generic_201702/wiki/index.json

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

var delayMs       = 100;
var PRJ_TIMESHEET_ID = 10;

// Debug
//var delayMs      = 1;

/*******************************************************************************
 * Input arguments.
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .usage('[options]')
  .option('    --what   <op>'                  , 'Action on projects {updated}')
  .option('    --filter <file>'                , 'Filtered  projects for operation')
  .option('    --updated <date>'               , 'List      issues updated after a given date as yyyy.ww')
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
  msg.error("Nothing to do, please specify --what in between {list, create, close, updated}");
  process.exit(1);
}
msg.debug("Filter           = " + program['filter']);
msg.debug("Update date      = " + program['updated']);

/******************************************************************************
 * Load Redmine service configuration.
 *****************************************************************************/
var redmine     = new Redmine("./redmine.env.json");

var operatesPromises = []     ;
var operatesResults  = []     ;

if ( program['what'] == "updated" ) {

  if ( !tools.isDefined(program['updated']) ||
       program['updated'] == ""             ) {
    msg.error("Update date is not defined or empty, please tell the --updated option");
    process.exit(1);
  }

  var updated = program['updated'] ;
  var week    = undefined          ;
  var year    = undefined          ;

  year = updated.toString().substring(0, 4);
  week = updated.toString().substring(5);

  if ( !tools.isDefined(week)  ||
       !tools.isDefined(year)  ) {
    msg.error("Bad updated format <" + updated.toString() + ">, must be yyyy.ww, please tell the --updated option");
    process.exit(1);
  }

  var date    = tools.getDateOfISOWeek(week, year);
  var dateStr = sprintf("%s-%02s-%02sT00:00:00Z", date.getFullYear()
                                                , (date.getMonth()+1)
                                                , date.getDate()      );

  /**************************************************************************
   * Request redmine project to process operation on
   * May not exceed 100 => do not take into account paging
   *************************************************************************/
  redmine.projects('offset=0&limit=100')
    .then ( function (reply) {

      msg.debug("Redmine api success:", reply);

      /**********************************************************************
       * Filter out project with parents (keep root projects).
       *********************************************************************/
      var flt_xxx = function (project) {
        return true;
      }
      var rootProjects = reply['projects'].filter(flt_xxx);

      /**********************************************************************
       * Process root projects.
       *********************************************************************/
      var acc = 0;
      for(var i = 0; i < rootProjects.length; i++) {
        var rootProject = rootProjects[i];
        operates(rootProject, reply['projects'], acc * delayMs);
        acc++;
      }

      Promise.all(operatesPromises)
        .then( function (){
          /******************************************************************
           * All goes perfectly, shows out operation results
           *****************************************************************/
          showOerationResults();
        })
        .catch( function (error){
          /******************************************************************
           * Something went wrong
           *****************************************************************/
          msg.error("Error while waiting for end of operations.", error)
          showOerationResults();
        })

    })
    .catch( function (error) {
      msg.error("Unable to retreive project list: ", error);
    });

}

/******************************************************************************
 * Overall operation status function
 * It is based on operation results as gobal values filled in by promises
 *****************************************************************************/
function showOerationResults() {

  /****************************************************************************
   * Loop on project and show results
   ***************************************************************************/
  for (var p = 0; p < operatesResults.length; p++) {
    var projectResult = operatesResults[p];

    /**************************************************************************
     * Bypass project because is has not been processed
     *************************************************************************/
    if ( projectResult['results'].length == 0 ) {
      continue;
    }

    /**************************************************************************
     * Loops on results statuses
     *************************************************************************/
    msg.info('────────────────────────────────────────────────────────────────────────────────────────────────────');
    msg.info(projectResult['name']);
    msg.info('────────────────────────────────────────────────────────────────────────────────────────────────────');
    for (var r = 0; r < projectResult['results'].length; r++) {
      var res = projectResult.results[r];
      var str = sprintf("\t%-40s\t%s", res['wiki'], res['on'])
      msg.info(str);
    }
  }
}

/******************************************************************************
 * Main operation function
 * It goes through project and start operation
 * It manages first level of promises to be completed to mark end of operations
 *****************************************************************************/
function operates (rootProject, projects, delayS) {

  msg.debug("Found root project <" + rootProject['name'] + ">");

  var doOp = function (resolve, reject) {
    var P = {
              'ok': resolve,
              'ko': reject
            };
    operatesOptionsDelayed(rootProject, delayS, P);
  }
  operatesPromises.push(new Promise(doOp));

}

/******************************************************************************
 * Healper to delay some API burst, Redmine does not really like API bursts
 * It goes with function above
 *****************************************************************************/
function operatesOptionsDelayed(childProject, delayMs, P) {

  var prjToKeep = childProject;

  var delay = function (resolve, reject) {
    setTimeout(function () {
      resolve(prjToKeep);
    }, delayMs);
  }
  new Promise(delay).then(function (project) {
    msg.debug("Waking up: " + project['name']);
    operatesOptions(project, P);
  });
}


/******************************************************************************
 * Operation on a project
 * This one includes the project filtering and versions' list
 *****************************************************************************/
function operatesOptions (project, P) {

// /*
  /****************************************************************************
   * Internal filter list
   * Would be overwrite by filter list from file if any
   ***************************************************************************/
  var filteredPrj = [
                  { 'name'      : '010_TD_IT'             }
               ];
// */

  /****************************************************************************
   * Debug list of filtered project to ease devs
   * Uncomment line bellow to overwrite internal list
   * Will not work in case of filter provided in file
   ***************************************************************************/
 /*
  var filteredPrj = [
                  { 'name'      : '20_Vialis_2005_STB_HEVC_HD_Settopbox_201606' },
                  { 'name'      : '20_Bouygues_Telecom_Professional_2003_Access_DSL_Fiber_Access_201605'}
               ];
// */

  /****************************************************************************
   * Global list of results for the current processed project
   * Will be filled by operations
   ***************************************************************************/
  var projectResult =  {
                         'name'    : project['name']       ,
                         'id'      : project['id']         ,
                         'op'      : undefined             ,
                         'results' : []
                       };
  operatesResults.push(projectResult);

  /****************************************************************************
   * Filter provided as file by user
   ***************************************************************************/
  if (tools.isDefined(program['filter'])    ) {
    if (tools.fileExists(program['filter']) ) {
      msg.debug("Loading filter fomr file <" + program['filter'] + ">.");
      filteredPrj = JSON.parse(fs.readFileSync(program['filter'], 'utf8')).projects;
    }
    else {
      msg.error("Filter file not found. Leave.");
      process.exit(1);
    }
  }

  /****************************************************************************
   * Continue only with known projects (<=> filtered).
   ***************************************************************************/
  var flt_project = function (f) {
    return (f['name'] == project['name']);
  }
  if (!tools.isDefined(filteredPrj.filter(flt_project)[0])) {
    msg.debug("Bypass project <" + project['name'] + ">");
    P.ok();
    return;
  }

  msg.debug("Found project <" + project['name'] + ">");

  /****************************************************************************
   * First of all, read versions of project
   * This is the basics of this tool
   ***************************************************************************/
  redmine.projectWikis(project['id'])
    .then ( function (reply) {

      /************************************************************************
       * Say which project is currenlty performed.
       ***********************************************************************/
      msg.debug(project['name']);

      /************************************************************************
       * Perform given operation on given project
       * Give where to store results and also promises
       * (keep context in function parameter, this is more easy to implement like this)
       ***********************************************************************/
      var wiki_pages = reply['wiki_pages'] ;
      var wiki_page  = undefined           ;
      var wiki_str   = ""                  ;
      for(i = 0; i < wiki_pages.length; i++) {
        wiki_page = wiki_pages[i];
        wiki_str = sprintf("%-30s : %-15s"         ,
                           wiki_page['title']      ,
                           wiki_page['updated_on'] );
        if (wiki_page['updated_on'] > dateStr ) {
          projectResult['results'].push({
                                          'wiki' : wiki_page['title']  ,
                                          'on'   : wiki_page['updated_on']
                                        });
        }
        else {
        }
      }
      P.ok();

    })
    .catch( function (error) {
      msg.error("Redmine api fails with error: ", error);
      P.ko();
    });

}

