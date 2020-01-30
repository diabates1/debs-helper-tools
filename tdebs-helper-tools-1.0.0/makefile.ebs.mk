
#$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,build))
#$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,install))
#$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,release))
#$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,clean))

###############################################################################
#
# Jenkins rules
#
###############################################################################

# List status of given jobs
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,jenkins/builds))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,jenkins/artifacts))


###############################################################################
#
# Redmine rules
#
###############################################################################

# Provides list of updated issue from a given date (start of a week).
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/issues/updated))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/wikis/updated))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/updated))

# Sprints' handling (creation, list or close).
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/sprints/create))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/sprints/list))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/sprints/close))

# Provides issues data
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,redmine/issue/title))


###############################################################################
#
# Bootcode rules
#
###############################################################################

# Start command on hello mesage (unofficial version)
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,btc/run))


###############################################################################
#
# TDGI Database tools
#
###############################################################################

# Encrypt/Decrypt running database as saved by Intel
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,tdgixxx/db_decrypt))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,tdgixxx/db_encrypt))


###############################################################################
#
# Vodia rules
#
###############################################################################

# Get extension informations
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,vodia/extension/info))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,vodia/extension/create))
$(eval $(call $(EBS_MACRO_DECLARE_PACKAGE_RULE),makefile.pkg.mk,vodia/shell))

