#!/usr/bin/env node

/*******************************************************************************
 * Redmine Project Manager Healper.
 ******************************************************************************/

"use strict";

var program       = require('node_modules/commander')           ;
var jenkinsCon    = require('jenkins')                          ;
var fs            = require('fs')                               ;
var path          = require('path')                             ;
var os            = require('os')                               ;
var http          = require('http')                             ;
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
  .option('    --what    <op>'          , 'Action on builds {download}'        )
  .option('    --job     <job name>'    , 'Job name to get artifacts from.'    )
  .option('    --build   <build id>'    , 'Build id to get artifacts from {#id, lastStableBuild,...}.')
  .option('    --download <pat>'         , 'Path where to download artifacst.'  )
  .option('    --debug   <items>'       , 'Debug flags to activate, available are {info, log, debug, error}, defaults are {info, error}',list)
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
var what = program['what'];

msg.debug("Job name         = " + program['job']);
if (!tools.isDefined(program['job'])) {
  msg.error("Nothing to do, please specify --job name you want to work with.");
  process.exit(1);
}
var job = program['job']; 

msg.debug("Build id         = " + program['build']);
var build = program['build']; 
if (!tools.isDefined(program['build'])) {
  msg.info("Build not specified, using last stable build.");
  build = 'lastStableBuild'; 
}

msg.debug("Download path    = " + program['download']);
var dlPath = program['download']; 
if (!tools.isDefined(dlPath)) {
  msg.info("Download path not specified, using surrent directory.");
  dlPath = '.'; 
}

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

/****************************************************************************** 
 * Jenkins to provide build information based on Job & build id.
 *****************************************************************************/ 
jenkins.build.get(job, build)
  .then(function(buildData) {

    /************************************************************************** 
     * Decode data from build.
     *************************************************************************/ 
    var duration    = buildData['duration'] / 1000;
    var durationMin = Math.trunc(duration / 60);
    var durationSec = Math.trunc(duration % 60);
    var dateObj   = new Date(buildData['timestamp']);

    /************************************************************************** 
     * Tells what we ogt from jenkins.
     *************************************************************************/ 
    msg.info("Build result for job <" + job + ">.");
    msg.info("Build id     : " + build);
    msg.info("Datetime     : " + dateObj + " (Duration: " + durationMin + "min, " + durationSec + " sec.)" );
    msg.info("Result       : " + buildData['result']);
    msg.info("URL          : " + buildData['url']);
    var dateStr   = new Date(dateObj).toISOString()
                      .replace(/T/, '_')
                      .replace(/\..+/, '')
                      .replace(/:/g, '')
                      .replace(/-/g, '')

    /************************************************************************** 
     * Prepare download link basics + destination directory.
     *************************************************************************/ 
    var dlURL     = undefined;
    var filepath  = undefined;
    var file      = undefined;
    var request   = undefined;
    var filename  = undefined;
    var files     = []       ;
    var filepath  = dlPath   + '/' + job + '/' + dateStr     ;
    var parents   = [];
    var parentsToken = filepath.split(path.sep);
    var tmp       = '';
    for (var i = 0; i < parentsToken.length; i++) {
      tmp += parentsToken[i] + path.sep;
      try {
        fs.mkdirSync(tmp);
      } catch (e) {}
    }

    /************************************************************************** 
     * Loop on artifacts and start download.
     *************************************************************************/ 
    var artifacts = buildData['artifacts'];
    var artifact  = undefined;
    for(var i = 0; i < artifacts.length; i++) {
      artifact = artifacts[i];

      /************************************************************************ 
       * Build full URL including credentials.
       ***********************************************************************/ 
      dlURL    = jenkinsBUrl + '/job/' + job + '/' + build + '/artifact/' + artifact['relativePath']
      msg.info(sprintf('Downloading <%-30s> from: %s',
                          artifact['displayPath']    ,
                          artifact['relativePath']   )  );
      filename = filepath + '/' + artifact['displayPath'] ;

      /************************************************************************ 
       * Keep context for the moment of the download.
       ***********************************************************************/ 
      files.push({
                   file       : artifact['displayPath']       ,
                   fileStream : fs.createWriteStream(filename)
                 });
      request  = http.get(dlURL, function(response) {

        /********************************************************************** 
         * OK, we will download the file iping to related filename.
         *********************************************************************/ 
        var file = response.req.path.split('/').slice(-1).pop();
        var flt  = function (elem) {
          return (elem['file'] == file);
        }
        var fileStream = files.filter(flt)[0].fileStream;
        response.pipe(fileStream)
          .on('finish', function () { msg.info("Download completed : " + this.path); });

      });
    }
  })
  .catch (function (err) {
    msg.error("Error while retreiving jenkins server job", err);
  })




