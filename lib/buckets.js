/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Bucket definitions
 */


// --- Globals


var BUCKETS = {
    mac_ip: {
        name: 'vnet_mac_ip',
        cfg: {
            index: {
                mac: {
                    type: 'number'
                },
                ip: {
                    type: 'string'
                },
                cn_id: {
                    type: 'string'
                },
                vid: {
                    type: 'number'
                },
                version: {
                    type: 'number'
                },
                deleted: {
                    type: 'boolean'
                }
            },
            options: {
                version: 0
            }
        }
    },

    underlay: {
        name: 'portolan_underlay_mappings',
        cfg: {
            index: {
                cn_id: {
                    type: 'string'
                },
                ip: {
                    type: 'string'
                },
                port: {
                    type: 'number'
                }
            },
            options: {
                version: 0
            }
        }
    },

    net_events: {
        name: 'cn_net_events',
        cfg: {
            index: {
                cn_id: {
                    type: 'string'
                },
                vid: {
                    type: 'number'
                },
                id: {
                    type: 'number'
                }
            },
            options: {
                version: 0
            }
        }
    }
};
var NAMES = {};
var VERSION = 1;


for (var b in BUCKETS) {
    NAMES[b] = BUCKETS[b].name;
}


module.exports = {
    buckets: BUCKETS,
    version: VERSION,
    names: NAMES
};
