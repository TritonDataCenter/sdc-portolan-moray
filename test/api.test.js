/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * Basic API tests
 */

'use strict';

var mod_pm = require('../lib');
var test = require('tape');



// --- Tests



test('buckets exposed', function (t) {
    t.ok(mod_pm.buckets, 'buckets exposed');
    [ 'mac_ip', 'underlay', 'net_events' ].forEach(function (b) {
        t.ok(mod_pm.buckets[b], b + ' bucket');
    });

    return t.end();
});
