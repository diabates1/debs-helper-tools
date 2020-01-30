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
var PRJ_TIMESHEET_ID = 10;

// Debug
//var delayMs      = 1;
var backlogsStr   = 'Backlogs';
var playgndStr    = 'PlayGround';

/*******************************************************************************
 * Input arguments.
 ******************************************************************************/
function list(val) {
  return val.split(',');
}
program
  .version('1.0.0')
  .usage('[options]')
  .option('    --filter <file>'                , 'Filtered  projects for operation')
  .option('    --what   <op>'                  , 'Action on projects {list, create, close, updated}')
  .option('-b, --backlogs'                     , 'Add       projects backlog version')
  .option('-p, --playgrounds'                  , 'Add       projects playground version')
  .option('    --sprints <items>'              , 'Add       projects sprint  version',list)
  .option('    --updated <date>'               , 'List      issues updated after a given date as yyyy.ww')
  .option('    --offset <int>'                 , 'Offset for some request exxeeding 100 default results')
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
msg.debug("Backlogs         = " + program['backlogs']);
msg.debug("Playground       = " + program['playground']);
msg.debug("Sprints          = " + program['sprints']);
msg.debug("Update date      = " + program['updated']);

/******************************************************************************
 * Load Redmine service configuration.
 *****************************************************************************/
var redmine     = new Redmine("./redmine.env.json");


/******************************************************************************
 * Get issues possible statuses and do operations on success
 *****************************************************************************/
var rd_statuses    = undefined;
var rd_statusesHdr = ''       ;
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

  var date   = tools.getDateOfISOWeek(week, year);
  var redate = sprintf("D%s-%02s-%02sT00:00:00Z", date.getFullYear()
                                                , (date.getMonth()+1)
                                                , date.getDate()      );

  /****************************************************************************
   * Filter provided as file by user
   ***************************************************************************/
  var filteredPrj = undefined;
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

  var offset = program['offset'];
  if ( !tools.isDefined(offset) ) offset = 0;
  redmine.issues( "offset=" + offset + "&limit=100&status_id=*&updated_on=>%3" + redate )
    .then ( function (reply) {
      var issues = reply["issues"] ;

      /************************************************************************
       * Loop on modified issues.
       ************************************************************************/
      var hdr_str = sprintf("%-6s : %-15s : %-30s : %-60s : %s"
                                       , "id"
                                       , "statuts"
                                       , "owner"
                                       , "project"
                                       , "subject"                       );
      console.log( hdr_str );
      for ( var i = 0; i < issues.length; i++ ) {

        /**********************************************************************
         * Filter project whenever a filter is provided.
         **********************************************************************/
        if (tools.isDefined(filteredPrj)) {
          var project = issues[i].project;
          var flt_project = function (f) {
            return (f['name'] == project['name']);
          }
          if (!tools.isDefined(filteredPrj.filter(flt_project)[0])) {
            msg.debug("Bypass project <" + project['name'] + ">");
            continue;
          }
        }

        var issue = issues[i];
        var issue_str = sprintf("%-6s : %-15s : %-30s : %-60s : %s"
                                       , "[" + issue['id'] + "]"
                                       , tools.isDefined(issue.status)
                                           ? issue.status['name']
                                           : ""
                                       , tools.isDefined(issue.assigned_to)
                                           ? issue.assigned_to['name']
                                           : ""
                                       , tools.isDefined(issue.project)
                                           ? issue.project['name']
                                           : ""
                                       , issue['subject']                );
        console.log( issue_str );
      }

      /************************************************************************
       * Warn on missing issues...
       ************************************************************************/
      if ( reply["total_count"] > 100 ) {
        msg.error("Too much issue updated (" + reply["total_count"] + ">100) ! Paging not supported...");
        process.exit(1);
      }
    })
    .catch( function (error) {
      msg.error("Unable to retreive issues' updates: ", error);
      process.exit(1);
    });


}
else {

redmine.issuesStatuses()
  .then ( function (reply) {

    rd_statuses = reply['issue_statuses'];

    /**************************************************************************
     * Pre build statuses header
     *************************************************************************/
    for(var s = 0; s < rd_statuses.length; s++) {

      var sta = rd_statuses[s];

      rd_statusesHdr += sprintf('%5s\t', sta['name'].substring(0,5) );

    }

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
        var flt_noParent = function (project) {
          return !tools.isDefined(project['parent']);
        }
        var rootProjects = reply['projects'].filter(flt_noParent);

        /**********************************************************************
         * Process root projects.
         *********************************************************************/
        for(var i = 0; i < rootProjects.length; i++) {
          var rootProject = rootProjects[i];
          operates(rootProject, reply['projects'], i * delayMs);
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


  })
  .catch( function (error) {
    msg.error("Unable to retreive issues' statuses: ", error);
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
    if ( !tools.isDefined(projectResult['op']) ) {
      continue;
    }

    /**************************************************************************
     * Loops on results statuses
     *************************************************************************/
    msg.info('────────────────────────────────────────────────────────────────────────────────────────────────────');
    msg.info(projectResult['name']);
    msg.info('────────────────────────────────────────────────────────────────────────────────────────────────────');
    msg.info(sprintf("\t%20s\t%10s\t%s\t", "", "Status", rd_statusesHdr));
    for (var r = 0; r < projectResult['results'].length; r++) {
      var res = projectResult['results'][r];
      var str = sprintf("\t%20s\t%s", res['what'], res['status'])
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

  /****************************************************************************
   * Process root projects to find out level 1 chidren.
   ***************************************************************************/
  var flt_isChild = function (project) {
    if (!tools.isDefined(project['parent']))  return false;
    var p = project['parent'];
    return p['id'] == rootProject['id'];
  }

  var subProjects = projects.filter(flt_isChild);
  if (subProjects.length == 0) {
    /**************************************************************************
     * If not child found then current project may includes all version:
     * . backlogs,
     * . playgrounds,
     * . sprints ,
     * . dummy: Select Sprint version.
     *************************************************************************/
    var doOp = function (resolve, reject) {
      var P = {
                'ok': resolve,
                'ko': reject
              };

      operatesOptions(rootProject, P);
    }
    operatesPromises.push(new Promise(doOp));
  }
  else {
    /**************************************************************************
     * If children found, then process children but not more deeper for
     * . Sprint   creation
     * . Playground check
     * . Backlogs check
     *************************************************************************/
    for (var j = 0; j < subProjects.length; j++) {
      var childProject = subProjects[j];

      var doOp = function (resolve, reject) {
        var P = {
                  'ok': resolve,
                  'ko': reject
                };
        operatesOptionsDelayed(childProject, (j+1) * delayS, P);
      }
      operatesPromises.push(new Promise(doOp));
    }
  }

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
   * Build up the version to be processed
   *  . Check if Backlogs must be processed; and
   *  . Check if Playground must be processed; and
   *  . Check if Sprints  exists, create if not.
   ***************************************************************************/
  var versions = [];
  if (tools.isDefined(program['backlogs'])) {
    versions.push(backlogsStr);
  }
  if (tools.isDefined(program['playgrounds'])) {
    versions.push(playgndStr);
  }
  if (tools.isDefined(program['sprints'])) {
    for (var s = 0; s < program['sprints'].length; s++)
      versions.push(program['sprints'][s]);
  }
  msg.debug("Versions in progress:", versions);

  /****************************************************************************
   * First of all, read versions of project
   * This is the basics of this tool
   ***************************************************************************/
  redmine.projectVersions(project['id'], 'offset=0&limit=100')
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
      operateOptionVersion(project, reply['versions'], versions, projectResult, P);

    })
    .catch( function (error) {
      msg.error("Redmine api fails with error: ", error);
      P.ko();
    });

}

/******************************************************************************
 * Process operation on a project and store the result in global result object
 * Also tells the promises if ok/ko
 *****************************************************************************/
function operateOptionVersion(project, versions, what, result, P) {

  var versionsPromises = [];
  result['op']         = program['what'];

  /****************************************************************************
   * Let's do an operation on a version, and do it on all versions
   ***************************************************************************/
  for (var i = 0; i < what.length; i++) {

    /**************************************************************************
     * Select version to process
     *************************************************************************/
    var w = what[i];

    /**************************************************************************
     * Prepare result storage fir this version
     *************************************************************************/
    var opRes = {
                  'what'   : w        ,
                  'status' : undefined
                }
    result['results'].push(opRes);

    /**************************************************************************
     * End of operation are synchronized as several version could be processed
     *************************************************************************/
    var doOpVer = function(resolve, reject) {

      var PP = {
                 'ok': resolve,
                 'ko': reject
               };

      /************************************************************************
       *
       ***********************************************************************/
      var flt_version = function (item) {
        return w == item['name'];
      }
      var search  = versions.find(flt_version);
      var whatStr = "";
      switch (program['what']) {
        case 'list'   :
          tellsStatus(project, w, search, opRes, PP);
          break;
        case 'create' :
          if (tools.isDefined(search)) {
            opRes['status'] = sprintf("%10s\t", search['status']);
            PP.ok();
          }
          else {
            msg.debug("\tAdding version <" + w + "> to project <" + project['name'] + ">");
            addVersionToProject(project, w, opRes, PP);
          }
          break;
        case 'close' :
          if (w != backlogsStr   &&
              w != playgndStr    ) {
            if (tools.isDefined(search)     &&
                search['status'] == 'open'  ) {
              msg.debug("\tClosing version <" + w + "> of <" + project['name'] + ">");
              closeVersion(project, search, opRes, PP);
            }
            else {
              opRes['status'] = sprintf("%10s\t", ".");
              PP.ok();
            }
          }
          else {
            opRes['status'] = sprintf("%10s\t", ".");
            PP.ok();
          }
          break;
        default:
          msg.error("Unknown operation <" + program['what'] + ">");
          PP.ko();
          process.exit(1);
      }

    }
    versionsPromises.push(new Promise(doOpVer));
  }
  Promise.all(versionsPromises)
    .then( function () {
      P.ok();
    })
    .catch (function () {
      P.ko();
    })

}

function tellsStatus(project, what, version, result, PP) {

  var whatStr = "";
  if (!tools.isDefined(version)) {
    result['status'] = sprintf("%10s", '-');
    PP.ok();
  }
  else {

    /**************************************************************************
     * Get issues possible statuses.
     *************************************************************************/
    var statPromises = [];

    for(var s = 0; s < rd_statuses.length; s++) {
      var sta = rd_statuses[s];

      /********************************************************************
       * Read versions of project.
       *******************************************************************/
      statPromises.push(
                         redmine.issues('offset=0&limit=1'                 +
                                        '&project_id=' + project['id']     +
                                        '&status_id='  + sta.id            +
                                        '&fixed_version_id=' + version['id']  )
                       );
    }

    Promise.all(statPromises)
      .then ( function (replies) {

        /****************************************************************
         * Say which project is currenlty performed.
         ***************************************************************/
        for (var s = 0; s < replies.length; s++) {
          var reply = replies[s];
          whatStr += sprintf("%5s\t", (reply['total_count'] == 0 ? '.' : reply['total_count']));
        }
        result['status'] = sprintf("%10s\t", version['status']) + whatStr;
        PP.ok();

      })
      .catch( function (error) {
        msg.error("Redmine api fails with error: ", error);
        return "";
        PP.ko();
      });

  }
}

function getSprintBounds (sprint) {
  var year = sprint.substring(0, 4);
  var week = sprint.substring(6, 8);
  var date = tools.getDateOfISOWeek(week, year);
  var firstday = new Date(date);
  var lastday  = new Date(date.setDate(date.getDate() - date.getDay()+7));
  return { 'start' : firstday, 'stop': lastday };
}

function addVersionToProject(project, version, result, PP) {

  var bounds  = getSprintBounds(version);
  var dueDate = bounds.stop.getUTCFullYear() + "-" +
                sprintf("%02d", (bounds.stop.getUTCMonth()+1)) + "-" +
                sprintf("%02d", bounds.stop.getUTCDate());

  var versionStruct = {
                        'version' : {
                          'name'            : version        ,
                          'description'     : ''             ,
                          'status'          : 'open'         ,
                          'wiki_page_title' : ''             ,
                          'effective_date'  : ( (version == backlogsStr ||
                                                 version == playgndStr  )   ? ''
                                                                            : dueDate),
                          'sharing'         : 'descendants'
                        }
                      };

  redmine.projectAddVersion(project['identifier'], versionStruct)
    .then ( function (reply) {
      result['status'] = sprintf("%10s\t", "+");
      PP.ok();
    })
    .catch( function (error) {
      result['status'] = sprintf("%10s\t", "X");
      msg.error("Redmine api fails with error: ", error);
      PP.ko();
    });

}

function closeVersion(project, version, result, PP) {

  var versionId = version['id'];

  delete version['id' ]        ;
  delete version['project']    ;
  delete version['created_on'] ;
  delete version['updated_on'] ;
  version['status'] = 'closed' ;

  var versionStruct = {
                        'version' : version
                      };

  redmine.versionUpdate(versionId, versionStruct)
    .then ( function (reply) {
      result['status'] = sprintf("%10s\t", "-");
      PP.ok();
    })
    .catch( function (error) {
      result['status'] = sprintf("%10s\t", "X");
      msg.error("Redmine api fails with error: ", error);
      PP.ko();
    });

}
