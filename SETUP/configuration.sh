# DP site deployment from source control
# ======================================================================

# This script is used to deploy the DP site code from source control.
# If you are installing a released package and not pulling from source control,
# you can ignore this file.

# All site configuration is done in `pinc/site_vars.php`
# (see `pinc/site_vars.php.template` for an example.

# Make an editable copy of this file, put it *outside* your web
# server's doc root, and edit that file to deploy your DP system.

# XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# This script exists simply to define variables for SETUP/updtae_from_github, so
# disable unused variable warnings.
# shellcheck shell=bash disable=SC2034

# Code location
# -------------

# The location where the code was installed.
# (It corresponds to the root directory in the git repository
# and should contain directories such as 'pinc' and 'tools'.)
CODE_DIR=/home/$USER/public_html/c

# Location of the site_vars.php configuration file to move into place.
SITE_VARS=/home/$USER/site_vars.php

# $TAG is the git branch or tag to extract files from the repository.
TAG=master

# $GROUP is the name of the group that will group-own the files.
GROUP=$USER

# $SHIFT_TO_LIVE should be 'yes', 'no', or 'prompt'.
# If it's 'yes', or it's 'prompt' and the user answers 'y',
# then $CODE_DIR.new will be moved to $CODE_DIR.
# If that directory already exists, it will first be renamed as
#     $CODE_DIR.bak
# and if *that* directory already exists, it will be REMOVED.
SHIFT_TO_LIVE=prompt
