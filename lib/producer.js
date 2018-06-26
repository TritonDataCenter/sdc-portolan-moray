/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2018, Joyent, Inc.
 */

/*
 * Functions for storing records into the portolan-moray buckets
 */

'use strict';

var assert = require('assert-plus');
var mod_bucket = require('./buckets');
var mod_common = require('./common');
var mod_uuid = require('uuid');



// -- Globals



var NAMES = mod_bucket.names;
var VERSION = mod_bucket.version;



// --- Internal



function overlayMapRecord(opts) {
    return {
        key: mod_common.vnetMacIPkey(opts.ip, opts.vnet_id),
        value: {
            mac: opts.mac,
            ip: mod_common.ipToString(opts.ip),
            cn_uuid: opts.cn_uuid,
            vnet_id: opts.vnet_id,
            router: opts.router || false,
            version: opts.version || VERSION,
            deleted: opts.deleted || false
        }
    };
}

function vnetRouteMapRecord(opts) {
    return {
        key: mod_common.vnetRouteKey(opts),
        value: {
            net_uuid: opts.net_uuid,
            vnet_id: opts.vnet_id,
            vlan_id: opts.vlan_id,
            subnet: mod_common.cidrToString(opts.subnet),
            r_dc_id: opts.r_dc_id,
            r_net_uuid: opts.r_net_uuid,
            r_vnet_id: opts.r_vnet_id,
            r_vlan_id: opts.r_vlan_id,
            r_subnet: mod_common.cidrToString(opts.r_subnet),
            r_send_mac: opts.r_send_mac,
            version: opts.version || VERSION,
            deleted: opts.deleted || false
        }
    };
}


// --- Exports



function addOverlayMapping(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.mac');
    assert.string(opts.ip, 'opts.ip');
    assert.string(opts.cn_uuid, 'opts.cn_uuid');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');
    assert.func(callback, 'callback');

    var client = opts.moray;
    var rec = overlayMapRecord(opts);

    client.putObject(NAMES.mac_ip, rec.key, rec.value, function (err) {
        if (err) {
            return callback(err);
        }

        return callback();
    });
}


/**
 * Returns a batch item for an overlay record, suitable for using as one of
 * the array elements in moray.batch()
 */
function overlayMappingBatch(opts) {
    var rec = overlayMapRecord(opts);

    return {
        bucket: NAMES.mac_ip,
        key: rec.key,
        operation: 'put',
        value: rec.value
    };
}


function updateOverlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.mac');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.string(opts.ip, 'opts.ip');
    assert.optionalString(opts.cn_uuid, 'opts.cn_uuid');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');

    var client = opts.moray;
    var key = mod_common.vnetMacIPkey(opts.ip, opts.vnet_id);

    client.getObject(NAMES.mac_ip, key, function (err, obj) {
        if (err) {
            cb(err);
            return;
        }

        var record = {
            mac: obj.mac,
            vnet_id: obj.vnet_id,
            ip: mod_common.ipToString(opts.ip),
            cn_uuid: opts.cn_uuid || obj.cn_uuid,
            version: opts.version || obj.version || VERSION,
            deleted: opts.deleted || obj.deleted
        };

        var putOpts = {
            etag: obj._etag
        };

        client.putObject(NAMES.mac_ip, key, record, putOpts, function (err2) {
            if (err2) {
                return cb(err2);
            }

            return cb(null, record);
        });
    });
}


function removeOverlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.ip, 'opts.ip');
    assert.number(opts.vnet_id, 'opts.vnet_id');

    var client = opts.moray;
    var key = mod_common.vnetMacIPkey(opts.ip, opts.vnet_id);

    client.delObject(NAMES.mac_ip, key, cb);
}


function addUnderlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.cn_uuid, 'opts.cn_uuid');
    assert.string(opts.ip, 'opts.ip');
    assert.number(opts.port, 'opts.port');

    var client = opts.moray;
    var key = opts.cn_uuid;

    var record = {
        cn_uuid: opts.cn_uuid,
        ip: mod_common.ipToString(opts.ip),
        port: opts.port
    };

    client.putObject(NAMES.underlay, key, record, cb);
}


/**
 * Returns a batch item for an underlay record, suitable for using as one of
 * the array elements in moray.batch()
 */
function underlayMappingBatch(opts) {
    return {
        bucket: NAMES.underlay,
        key: opts.cn_uuid,
        operation: 'put',
        value: {
            cn_uuid: opts.cn_uuid,
            ip: mod_common.ipToString(opts.ip),
            port: opts.port
        }
    };
}


/**
 * Returns a batch item for deleting an underlay record, suitable for using
 * as one of the array elements in moray.batch()
 */
function underlayMappingDelBatch(opts) {
    return {
        bucket: NAMES.underlay,
        key: opts.cn_uuid,
        operation: 'delete'
    };
}


function updateUnderlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.cn_uuid');
    assert.optionalString(opts.ip, 'opts.ip');
    assert.optionalNumber(opts.port, 'opts.port');

    var client = opts.moray;
    var key = opts.cn_uuid;
    var bucket = NAMES.underlay;

    client.getObject(bucket, key, function (err, obj) {
        if (err) {
            cb(err);
            return;
        }

        var record = {
            cn_uuid: obj.cn_uuid,
            ip: mod_common.ipToString(opts.ip) || obj.ip,
            port: opts.port || obj.port
        };

        var putOpts = {
            etag: obj._etag
        };

        client.putObject(bucket, key, record, putOpts, cb);
    });
}


function removeUnderlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.cn_uuid, 'opts.cn_uuid');

    var client = opts.moray;
    var key = opts.cn_uuid;

    client.delObject(NAMES.underlay, key, cb);
}

function addVnetRouteMapping(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.number(opts.vlan_id, 'opts.vlan_id');
    assert.string(opts.subnet, 'opts.subnet');
    assert.number(opts.r_dc_id, 'opts.r_dc_id');
    assert.number(opts.r_vnet_id, 'opts.r_vnet_id');
    assert.number(opts.r_vlan_id, 'opts.r_vlan_id');
    assert.string(opts.r_subnet, 'opts.r_subnet');
    assert.number(opts.r_send_mac, 'opts.r_send_mac');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');
    assert.func(callback, 'callback');

    var client = opts.moray;
    var rec = vnetRouteMapRecord(opts);

    client.putObject(NAMES.vnet_routes, rec.key, rec.value, callback);
}

function vnetRouteMappingBatch(opts) {
    var rec = vnetRouteMapRecord(opts);

    return {
        bucket: NAMES.vnet_routes,
        key: rec.key,
        operation: 'put',
        value: rec.value
    };
}

function vnetRouteMappingDelBatch(opts) {
    var rec = vnetRouteMapRecord(opts);

    return {
        bucket: NAMES.vnet_routes,
        key: rec.key,
        operation: 'delete'
    };
}

/*
 * XXX: UNUSED, for future use by NAPI.
 */
function updateVnetRouteMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.number(opts.vlan_id, 'opts.vlan_id');
    assert.string(opts.subnet, 'opts.subnet');
    assert.number(opts.r_dc_id, 'opts.r_dc_id');
    assert.number(opts.r_vnet_id, 'opts.r_vnet_id');
    assert.number(opts.r_vlan_id, 'opts.r_vlan_id');
    assert.string(opts.r_subnet, 'opts.r_subnet');
    assert.number(opts.r_send_mac, 'opts.r_send_mac');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');
    assert.func(cb, 'callback');

    var client = opts.moray;
    var key = mod_common.vnetRouteKey(opts);

    client.getObject(NAMES.vnet_routes, key, function onUpdateGet(err, obj) {
        if (err) {
            cb(err);
            return;
        }

        var rec_val = {
            vnet_id: opts.vnet_id,
            vlan_id: opts.vlan_id,
            subnet: mod_common.cidrToString(opts.subnet),
            r_dc_id: opts.r_dc_id || obj.r_dc_id,
            r_vnet_id: opts.r_vnet_id || obj.r_vnet_id,
            r_vlan_id: opts.r_vlan_id || obj.r_vlan_id,
            r_subnet: mod_common.cidrToString(opts.r_subnet),
            r_send_mac: opts.r_send_mac || obj.r_send_mac,
            version: opts.version || obj.version || VERSION,
            deleted: opts.deleted || obj.deleted || false
        };

        var putOpts = {
            etag: obj._etag
        };

        client.putObject(NAMES.vnet_routes, key, rec_val, putOpts,
            function onUpdatePut(putErr, data) {

            if (putErr) {
               cb(putErr);
               return;
            }

            cb(null, data);
        });
    });
}

function removeVnetRouteMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.number(opts.vlan_id, 'opts.vlan_id');
    assert.string(opts.subnet, 'opts.subnet');
    assert.string(opts.r_subnet, 'opts.r_subnet');

    var client = opts.moray;
    var key = mod_common.vnetRouteKey(opts);

    client.delObject(NAMES.vnet_routes, key, cb);
}

/*
 * Produces a moray-batchable set of SVP VL2 logs, indicating that a shootdown
 * is required. These are required when an IP:MAC mapping is deleted (which
 * incudes updates).
 */
function vl2CnEventBatch(opts) {
    assert.object(opts, 'opts');
    assert.object(opts.vnetCns, 'opts.vnetCns');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.number(opts.mac, 'opts.mac');
    assert.optionalNumber(opts.version, 'opts.version');

    var batch = [];

    batch = opts.vnetCns.map(function (cn) {
        var uuid = mod_uuid.v4();
        return {
            bucket: NAMES.net_events,
            key: uuid,
            operation: 'put',
            options: {
                etag: null
            },
            value: {
                cn_uuid: cn,
                vnet_id: opts.vnet_id,
                version: opts.version || VERSION,
                record: {
                    type: 'SVP_LOG_VL2',
                    mac: opts.mac,
                    vnet_id: opts.vnet_id
                }
            }
        };
    });

    return batch;
}

/*
 * Produces a moray-batchable set of SVP VL3 logs, indicating that ARP
 * injection is required. These are produced when a new IP should become
 * available on nic creation or update.
 */
function vl3CnEventBatch(opts) {
    assert.object(opts, 'opts');
    assert.object(opts.vnetCns, 'opts.vnetCns');
    assert.number(opts.vnet_id, 'opts.vnet_id');
    assert.string(opts.ip, 'opts.ip');
    assert.number(opts.mac, 'opts.mac');
    assert.number(opts.vlan_id, 'opts.vlan_id');
    assert.optionalNumber(opts.version, 'opts.version');

    var batch = [];

    batch = opts.vnetCns.map(function (cn) {
        var uuid = mod_uuid.v4();
        return {
            bucket: NAMES.net_events,
            key: uuid,
            operation: 'put',
            options: {
                etag: null
            },
            value: {
                cn_uuid: cn,
                vnet_id: opts.vnet_id,
                version: opts.version || VERSION,
                record: {
                    type: 'SVP_LOG_VL3',
                    ip: mod_common.ipToString(opts.ip),
                    mac: opts.mac,
                    vlan: opts.vlan_id,
                    vnet_id: opts.vnet_id
                }
            }
        };
    });

    return batch;
}

/*
 * Produce a moray-batchable set of SVP ROUTE logs, indicating that a an
 * overlay mapping needs to be updated or removed.  This is triggered when a
 * network's attached networks array has been updated.
 */
function vnetRouteEventBatch(opts) {
    assert.object(opts, 'opts');
    assert.object(opts.vnetCns, 'opts.vnetCns');
    assert.number(opts.src_vnet_id, 'opts.src_vnet_id');
    assert.number(opts.dst_vnet_id, 'opts.dst_vnet_id');
    assert.number(opts.dcid, 'opts.dcid');
    assert.number(opts.src_vlan_id, 'opts.src_vlan_id');
    assert.number(opts.dst_vlan_id, 'opts.src_vlan_id');
    assert.string(opts.src_subnet, 'opts.src_subnet');
    assert.string(opts.dst_subnet, 'opts.dst_subnet');
    assert.optionalNumber(opts.version, 'opts.version');

    var batch = [];

    var src_cidr = mod_common.cidrToString(opts.src_subnet);
    var srcip = src_cidr.split('/')[0];
    var srcprefix = parseInt(src_cidr.split('/')[1], 10);

    var dst_cidr = mod_common.cidrToString(opts.dst_subnet);
    var dstip = dst_cidr.split('/')[0];
    var dstprefix = parseInt(dst_cidr.split('/')[1], 10);

    batch = opts.vnetCns.map(function vnetCnsMapOne(cn) {
        var uuid = mod_uuid.v4();
        return {
            bucket: NAMES.net_events,
            key: uuid,
            operation: 'put',
            options: {
                etag: null
            },
            value: {
                cn_uuid: cn,
                vnet_id: opts.src_vnet_id,
                version: opts.version || VERSION,
                record: {
                    type: 'SVP_LOG_ROUTE',
                    src_vnet_id: opts.src_vnet_id,
                    dst_vnet_id: opts.dst_vnet_id,
                    dcid: opts.dcid,
                    srcip: srcip,
                    dstip: dstip,
                    src_vlan_id: opts.src_vlan_id,
                    dst_vlan_id: opts.dst_vlan_id,
                    src_prefixlen: srcprefix,
                    dst_prefixlen: dstprefix
                }
            }
        };
    });

    return batch;
}

module.exports = {
    addOverlayMapping: addOverlayMapping,
    overlayMappingBatch: overlayMappingBatch,
    updateOverlayMapping: updateOverlayMapping,
    removeOverlayMapping: removeOverlayMapping,

    addUnderlayMapping: addUnderlayMapping,
    underlayMappingBatch: underlayMappingBatch,
    underlayMappingDelBatch: underlayMappingDelBatch,
    updateUnderlayMapping: updateUnderlayMapping,
    removeUnderlayMapping: removeUnderlayMapping,

    vl2CnEventBatch: vl2CnEventBatch,
    vl3CnEventBatch: vl3CnEventBatch,
    vnetRouteEventBatch: vnetRouteEventBatch,

    addVnetRouteMapping: addVnetRouteMapping,
    vnetRouteMappingBatch: vnetRouteMappingBatch,
    vnetRouteMappingDelBatch: vnetRouteMappingDelBatch,
    updateVnetRouteMapping: updateVnetRouteMapping,
    removeVnetRouteMapping: removeVnetRouteMapping
};
