/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Functions for storing records into the portolan-moray buckets
 */

var assert = require('assert-plus');
var mod_bucket = require('./buckets');
var mod_common = require('./common');



// -- Globals



var NAMES = mod_bucket.names;



// --- Internal



function overlayMapRecord(opts) {
    return {
        key: mod_common.vnetMacIPkey(opts.ip, opts.vnet_id),
        value: {
            mac: opts.mac,
            ip: opts.ip,
            cn_uuid: opts.cn_uuid,
            vnet_id: opts.vnet_id,
            version: opts.version || mod_bucket.VERSION,
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
        value: rec.value,
        options: {
            // XXX: set etag?
        }
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
            return cb(err);
        }

        var record = {
            mac: obj.mac,
            vnet_id: obj.vnet_id,
            ip: opts.ip,
            cn_uuid: opts.cn_uuid || obj.cn_uuid,
            version: opts.version || obj.version,
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

    client.delObject(NAMES.mac_ip, key, function (err) {
        if (err) {
            return cb(err);
        }

        return cb();
    });
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
        ip: opts.ip,
        port: opts.port
    };

    client.putObject(NAMES.underlay, key, record, function (err) {
        if (err) {
            return (cb(err));
        }
        cb();
    });
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
            ip: opts.ip,
            port: opts.port
        },
        options: {
            // XXX: set etag?
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
            return cb(err);
        }

        var record = {
            cn_uuid: obj.cn_uuid,
            ip: opts.ip || opts.ip,
            port: opts.port || obj.port
        };

        var putOpts = {
            etag: obj._etag
        };

        client.putObject(bucket, key, record, putOpts, function (err2) {
            if (err2) {
                return cb(err2);
            }

            return cb();
        });
    });
}


function removeUnderlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.cn_uuid, 'opts.cn_uuid');

    var client = opts.moray;
    var key = opts.cn_uuid;

    client.delObject(NAMES.underlay, key, function (err) {
        if (err) {
            return cb(err);
        }

        cb();
    });
}


function addVl2CnEvent(opts, cb) {
    // TODO for CLI
}

function vl2CnEventBatch(opts) {
    return {
        bucket: NAMES.net_events,
        key: opts.uuid,
        operation: 'put',
        value: {
            cn_uuid: opts.cn_uuid,
            vnet_id: opts.vnet_id,
            id: opts.uuid,
            version: opts.version || mod_bucket.VERSION,
            record: {
                // XXX - types not present here, but needed for seralization
                // in portolan.
                type: 'SVP_LOG_VL2',
                id: opts.uuid,
                mac: opts.mac,
                vnet_id: opts.vnet_id
            }
        },
        options: {
            // XXX: set etag?
        }
    };
}

function removeVl2CnEvent(opts, cb) {
    // TODO for CLI
}

function vl2CnEventDelBatch(opts) {
    return {
        bucket: NAMES.net_events,
        key: opts.uuid,
        operation: 'delete'
    };
}

function addVl3CnEvent(opts, cb) {
    // TODO for CLI
}

function vl3CnEventBatch(opts) {
    return {
        bucket: NAMES.net_events,
        key: opts.uuid,
        operation: 'put',
        value: {
            cn_uuid: opts.cn_uuid,
            vnet_id: opts.vnet_id,
            id: opts.uuid,
            version: opts.version || mod_bucket.VERSION,
            record: {
                // XXX - superfluous? portolan types not present here.
                type: 'SVP_LOG_VL3',
                id: opts.uuid,
                ip: opts.ip,
                mac: opts.mac,
                vlan: opts.vlan,
                vnet_id: opts.vnet_id
            }
        },
        options: {
            // XXX: set etag?
        }
    };
}

function removeVl3CnEvent(opts, cb) {
    // TODO for CLI
}

function vl3CnEventDelBatch(opts) {
    return {
        bucket: NAMES.net_events,
        key: opts.uuid,
        operation: 'delete'
    };
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

    addVl2CnEvent: addVl2CnEvent,
    vl2CnEventBatch: vl2CnEventBatch,
    removeVl2CnEvent: removeVl2CnEvent,
    vl2CnEventDelBatch: vl2CnEventDelBatch,
    addVl3CnEvent: addVl3CnEvent,
    vl3CnEventBatch: vl3CnEventBatch,
    removeVl3CnEvent: removeVl3CnEvent,
    vl3CnEventDelBatch: vl3CnEventDelBatch
};
