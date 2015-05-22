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
        desc: 'vnet mac ip mapping',
        name: 'portolan_vnet_mac_ip',
        schema: {
            index: {
                mac: {
                    type: 'number'
                },
                ip: {
                    type: 'string'
                },
                cn_uuid: {
                    type: 'string'
                },
                vnet_id: {
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
        desc: 'underlay mapping',
        name: 'portolan_underlay_mappings',
        schema: {
            index: {
                cn_uuid: {
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
        desc: 'cn net event',
        name: 'portolan_cn_net_events',
        schema: {
            index: {
                cn_uuid: {
                    type: 'string'
                },
                vnet_id: {
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
