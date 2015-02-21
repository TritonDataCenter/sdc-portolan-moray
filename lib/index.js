/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Entry-point for the portolan moray module
 */

var mod_buckets = require('./buckets');
var mod_consumer = require('./consumer');
var mod_producer = require('./producer');

var toExport = {
    buckets: mod_buckets.buckets
};

[ mod_consumer, mod_producer ].forEach(function (mod) {
    for (var exp in mod) {
        toExport[exp] = mod[exp];
    }
});

module.exports = toExport;
