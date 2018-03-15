#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright 2018, Joyent, Inc.
#

#
# sdc-portolan-moray Makefile
#


#
# Tools
#

TAPE		:= ./node_modules/tape/bin/tape
NODE_EXEC	:= node
NPM			:= npm


#
# Files
#

JS_FILES	:= $(shell find lib test -name '*.js')
JSON_FILES	 = package.json
JSL_CONF_NODE	 = tools/jsl.node.conf
JSL_FILES_NODE	 = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSSTYLE_FLAGS	 = -f tools/jsstyle.conf
ESLINT		 = ./node_modules/.bin/eslint
ESLINT_CONF	 = tools/eslint.node.conf
ESLINT_FILES	 = $(JS_FILES)


#
# Repo-specific targets
#

.PHONY: all
all: | $(TAPE)
	$(NPM) rebuild

$(ESLINT): | $(NPM_EXEC)
	$(NPM) install

$(TAPE):
	$(NPM) install

CLEAN_FILES += ./node_modules/

.PHONY: test
test: $(TAPE)
	@(for F in test/*.test.js; do \
		echo "# $$F" ;\
		$(NODE_EXEC) $(TAPE) $$F ;\
		[[ $$? == "0" ]] || exit 1; \
	done)

.PHONY: check
check:: $(ESLINT)
	$(ESLINT) -c $(ESLINT_CONF) $(ESLINT_FILES)


#
# Includes
#

include ./tools/mk/Makefile.deps
include ./tools/mk/Makefile.targ
