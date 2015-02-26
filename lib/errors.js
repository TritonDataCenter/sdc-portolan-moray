/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Errors
 */

var fmt = require('util').format;



// --- Exports



function underlayNotFound(id) {
    var err = new Error(fmt('underlay mapping for cn_uuid=%s not found',
        id));
    err.code = 'ENOENT';

    return err;
}


function vl2NotFound(mac, vid) {
    var err = new Error(fmt('VL2 mapping for mac=%s, vid=%d not found',
        mac, vid));
    err.code = 'ENOENT';

    return err;
}


function vl3NotFound(ip, vid) {
    var err = new Error(fmt('VL3 mapping for ip=%s, vid=%d not found',
        ip, vid));
    err.code = 'ENOENT';

    return err;
}



module.exports = {
    underlayNotFound: underlayNotFound,
    vl2NotFound: vl2NotFound,
    vl3NotFound: vl3NotFound
};
