
# EHT = EBS Helper Tools.

EBS_HEADER              = "EHT"
include $(EBS_TOP)/ebs/tools/makefiles/tools/system.ebs.mk
include $(EBS_TOP)/ebs/tools/makefiles/pkgs/packages_rules_helpers.ebs.mk
include $(EBS_TOP)/ebs/tools/makefiles/oss/oss_pkg.ebs.mk

EHT_BLD_ROOT = $(shell pwd)
EHT_JENKINS_ROOT=$(EHT_BLD_ROOT)/scripts/jenkins
EHT_REDMINE_ROOT=$(EHT_BLD_ROOT)/scripts/redmine
EHT_BTC_ROOT=$(EHT_BLD_ROOT)/scripts/btc
EHT_VODIA_ROOT=$(EHT_BLD_ROOT)/scripts/vodia

###############################################################################
#
# Environment.
#
###############################################################################


###############################################################################
#
# Build.
#
###############################################################################

build:
	$(EBS_SHEL_CMD_ECHO_H1) "Helpers tools build nothing."


###############################################################################
#
# Install.
#
###############################################################################

install:
	$(EBS_SHEL_CMD_ECHO_H1) "Helpers tools install nothing."


###############################################################################
#
# Clean.
#
###############################################################################

clean:
	$(EBS_SHEL_CMD_ECHO_H1) "Helpers tools clean nothing."


###############################################################################
#
# Release.
#
###############################################################################

release:
	$(EBS_SHEL_CMD_ECHO_H1) "Helpers tools release nothing."


###############################################################################
#
# Jenkins APIs.
#
###############################################################################

jenkins/builds:
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_JENKINS_ROOT)                                             && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node builds.js --what list

BUILD_ID   ?= 'lastStableBuild'
DL_PATH    ?= '.'
jenkins/artifacts:
ifeq ($(JOB_NAME),)
	$(error Please specify the job for artifacts download JOB_NAME=<job name>)
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_JENKINS_ROOT)                                             && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node artifacts.js --what download                                   \
	                    --job  $(JOB_NAME)                                \
	                    --build $(BUILD_ID)                               \
	                    --download $(DL_PATH)                             \
                            --debug error,info                             && \
        tree -s $(DL_PATH)/$(JOB_NAME)


###############################################################################
#
# Redmine APIs.
#
###############################################################################

#
# Show list of updated issue starting at the begning of the week provided as argument WEEK.
#
redmine/updated:         redmine/issues/updated  \
                         redmine/wikis/updated
redmine/issues/updated:
ifeq ($(WEEK),)
	$(error Please specify the week with WEEK=yyyy.ww)
endif
	$(eval PAGING?=0)
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node projects.js --what updated                                     \
                           --debug error,info                                 \
	                   --offset  $(PAGING)                                \
                           --updated $(WEEK) > $(EBS_TOP)/output/$(WEEK).issues.$(PAGING)
	cat $(EBS_TOP)/output/$(WEEK).issues.$(PAGING)

redmine/wikis/updated:
ifeq ($(WEEK),)
	$(error Please specify the week with WEEK=yyyy.ww)
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node wikis.js    --what updated                                     \
                           --debug error,info                                 \
	                   --filter flts/flt_red_SW_projects_Wikis.json       \
                           --updated $(WEEK) > $(EBS_TOP)/output/$(WEEK).wikis  && \
	cat $(EBS_TOP)/output/$(WEEK).wikis

#
# Create a list of sprints including backlog.
#
redmine/sprints/create:
ifeq ($(SPRINTS),)
	$(error Please specify the week with SPRINTS=yyyy_W##_sprint[,yyyy_W##_sprint,...])
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node projects.js --what create                                      \
                           --debug error,info                                 \
	                   --filter flts/flt_red_SW_projects.json             \
	                   -b                                                 \
	                   --sprints $(SPRINTS) > $(EBS_TOP)/output/sprints.create && \
	cat $(EBS_TOP)/output/sprints.create 

#
# Show a list of sprints' status, including backlogs.
#
redmine/sprints/list:
ifeq ($(SPRINTS),)
	$(error Please specify the week with SPRINTS=yyyy_W##_sprint[,yyyy_W##_sprint,...])
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node projects.js --what list                                        \
                           --debug error,info                                 \
	                   --filter flts/flt_red_SW_projects.json             \
	                   -b                                                 \
	                   --sprints $(SPRINTS) > $(EBS_TOP)/output/sprints.list && \
	cat $(EBS_TOP)/output/sprints.list 

#
# Close a list of sprints.
#
redmine/sprints/close:
ifeq ($(SPRINTS),)
	$(error Please specify the week with SPRINTS=yyyy_W##_sprint[,yyyy_W##_sprint,...])
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node projects.js --what close                                       \
                           --debug error,info                                 \
	                   --filter flts/flt_red_SW_projects.json             \
	                   --sprints $(SPRINTS) > $(EBS_TOP)/output/sprints.close && \
	cat $(EBS_TOP)/output/sprints.close

#
# Issue requests
#

# Issue title by issue number
redmine/issue/title:
ifeq ($(ISSUE),)
	$(error Please specify the issue id with ISSUE=<issue number>)
endif
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_REDMINE_ROOT)                                             && \
	mkdir -p $(EBS_TOP)/output                                         && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node issues.js --debug error,info                                   \
                         --what subject,status.name,assigned_to.name          \
	                 --issue $(ISSUE) > $(EBS_TOP)/output/$(ISSUE).title
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cat $(EBS_TOP)/output/$(ISSUE).title



###############################################################################
#
# Bootcode command on hello message (unoffical).
#
###############################################################################

btc/run:
ifeq ($(CMD),)
	$(error Please specify the BTC command to execute CMD="<cmd>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "NOTE: This is an unofficial tools (but helpfull)"
	$(EBS_MAKE_CMD_ECHO_H1) "      It may not be included in any process and is to be used internally only."
	$(EBS_MAKE_CMD_ECHO_H1) "      Support of this tool is also not guaranteed."
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "/!\ Make sure that only the ethernet connection is active on you laptop."
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Executing command <$(CMD)>, waiting for hello message..."
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_BTC_ROOT)/btc_cmd_srv                                     && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node ./btc_cmd_srv.js --debug error,info                            \
                                -i 0.0.0.0                                    \
                                -p 5445                                       \
	                        -c "$(CMD)"


###############################################################################
#
# Intel database tools.
#
###############################################################################

# DB encryption key (keep it secret!
TDGIXXX_DB_ENCRYPTION_KEY ?= SEINTELCHK

#
# Decrypt Intel database
#
tdgixxx/db_decrypt:
ifeq ($(DB_ENCRYPTED),)
	$(error Please specify the encrypted filename DB_ENCRYPTED="<encrypted database file path>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Decrypt database file <$(DB_ENCRYPTED)> using TDGIXXX_DB_ENCRYPTION_KEY <$(TDGIXXX_DB_ENCRYPTION_KEY)>"
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	openssl aes-256-cbc            -base64                                \
                                       -d -in $(DB_ENCRYPTED)                 \
                                       -out $(basename $(DB_ENCRYPTED)).dec$(suffix $(DB_ENCRYPTED)) \
                                       -pass pass:$(TDGIXXX_DB_ENCRYPTION_KEY)

#
# Encrypt Intel database
#
tdgixxx/db_encrypt:
ifeq ($(DB_DECRYPTED),)
	$(error Please specify the decrypted filename DB_DECRYPTED="<decrypted database file path>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Encrypt database file <$(DB_DECRYPTED)> using TDGIXXX_DB_ENCRYPTION_KEY <$(TDGIXXX_DB_ENCRYPTION_KEY)>"
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	openssl aes-256-cbc -base64    -in $(DB_DECRYPTED)                    \
                                       -out $(basename $(DB_DECRYPTED)).enc$(suffix $(DB_DECRYPTED)) \
                                       -pass pass:$(TDGIXXX_DB_ENCRYPTION_KEY)


###############################################################################
#
# Vodia rules
#
###############################################################################

# Get extension informations
vodia/extension/info:
ifeq ($(EXT),)
	$(error Please specify the extension EXT="<extension number>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Retrieving extension <$(EXT)> information from Vodia API..."
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_VODIA_ROOT)                                               && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node ./vodia.js --debug error,info                                  \
                          --ext   $(EXT)                                      \
                          --what  info

# create extension
vodia/extension/create:
ifeq ($(EXT),)
	$(error Please specify the extension EXT="<extension number>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Retrieving extension <$(EXT)> information from Vodia API..."
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_VODIA_ROOT)                                               && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node ./vodia.js --debug error,info                                  \
                          --ext   $(EXT)                                      \
                          --what  create

# execute shell command
vodia/shell:
ifeq ($(CMD),)
	$(error Please specify the command to execute CMD="<shell cmd>".)
endif
	$(EBS_MAKE_CMD_ECHO_H1) ""
	$(EBS_MAKE_CMD_ECHO_H1) "Executing command <$(CMD)> from Vodia API..."
	$(EBS_MAKE_CMD_DISPLAY)                                               \
	cd $(EHT_VODIA_ROOT)                                               && \
	NODE_PATH=.:$(EBS_TOP)/ebs/tools/node                                 \
	  node ./vodia.js --debug error,info                                  \
                          --ext   "$(CMD)"                                    \
                          --what  shell

