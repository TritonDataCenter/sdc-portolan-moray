/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * Common functions
 */

'use strict';



// --- Exports



/**
 * Returns a key for the vnet_mac_ip table
 */
function vnetMacIPkey(ip, vid) {
    return [ip, vid].join(',');
}



module.exports = {
    vnetMacIPkey: vnetMacIPkey
};
