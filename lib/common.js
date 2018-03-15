/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2018, Joyent, Inc.
 */

/*
 * Common functions
 */

'use strict';

var ip6addr = require('ip6addr');


// --- Exports



/**
 * Returns a key for the vnet_mac_ip table
 */
function vnetMacIPkey(ip, vid) {
    return [ipToString(ip), vid].join(',');
}

/*
 * Returns a key for the vnet_routes table
 */
function vnetRouteKey(opts) {
    return [
        opts.vnet_id,
        opts.vlan_id,
        cidrToString(opts.subnet),
        cidrToString(opts.r_subnet)
    ].join(',');
}

/* We standardize on IPv6 formatted strings for moray */
function ipToString(addr) {
    var ip = ip6addr.parse(addr);
    return (ip.toString({format: 'v6'}));
}

function cidrToString(subnet) {
    var cidr = ip6addr.createCIDR(subnet);
    return (cidr.toString({format: 'v6'}));
}

module.exports = {
    vnetMacIPkey: vnetMacIPkey,
    vnetRouteKey: vnetRouteKey,

    ipToString: ipToString,
    cidrToString: cidrToString
};
