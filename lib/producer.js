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


// --- Exports



function addOverlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.mac');
    assert.string(opts.ip, 'opts.ip');
    assert.string(opts.cn_id, 'opts.cn_id');
    assert.number(opts.vid, 'opts.vid');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');

    var client = opts.moray;
    var key = mod_common.vnetMacIPkey(opts.ip, opts.vid);

    var record = {
        mac: opts.mac,
        ip: opts.ip,
        cn_id: opts.cn_id,
        vid: opts.vid,
        version: opts.version || mod_bucket.VERSION,
        deleted: opts.deleted || false
    };

    client.putObject(NAMES.mac_ip, key, record, function (err) {
        if (err) {
            return (cb(err));
        }
        cb();
    });
}


function updateOverlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.mac');
    assert.number(opts.vid, 'opts.vid');
    assert.string(opts.ip, 'opts.ip');
    assert.optionalString(opts.cn_id, 'opts.cn_id');
    assert.optionalNumber(opts.version, 'opts.version');
    assert.optionalBool(opts.deleted, 'opts.deleted');

    var client = opts.moray;
    var key = mod_common.vnetMacIPkey(opts.ip, opts.vid);

    client.getObject(NAMES.mac_ip, key, function (err, obj) {
        if (err) {
            return cb(err);
        }

        var record = {
            mac: obj.mac,
            vid: obj.vid,
            ip: opts.ip,
            cn_id: opts.cn_id || obj.cn_id,
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
    assert.number(opts.vid, 'opts.vid');

    var client = opts.moray;
    var key = mod_common.vnetMacIPkey(opts.ip, opts.vid);

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
    assert.string(opts.cn_id, 'opts.cn_id');
    assert.string(opts.ip, 'opts.ip');
    assert.number(opts.port, 'opts.port');

    var client = opts.moray;
    var key = opts.cn_id;

    var record = {
        cn_id: opts.cn_id,
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


function updateUnderlayMapping(opts, cb) {
    assert.object(opts, 'opts');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.mac, 'opts.cn_id');
    assert.optionalString(opts.ip, 'opts.ip');
    assert.optionalNumber(opts.port, 'opts.port');

    var client = opts.moray;
    var key = opts.cn_id;
    var bucket = NAMES.underlay;

    client.getObject(bucket, key, function (err, obj) {
        if (err) {
            return cb(err);
        }

        var record = {
            cn_id: obj.cn_id,
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
    assert.string(opts.cn_id, 'opts.cn_id');

    var client = opts.moray;
    var key = opts.cn_id;

    client.delObject(NAMES.underlay, key, function (err) {
        if (err) {
            return cb(err);
        }

        cb();
    });
}



module.exports = {
    addOverlayMapping: addOverlayMapping,
    updateOverlayMapping: updateOverlayMapping,
    removeOverlayMapping: removeOverlayMapping,

    addUnderlayMapping: addUnderlayMapping,
    updateUnderlayMapping: updateUnderlayMapping,
    removeUnderlayMapping: removeUnderlayMapping
};
