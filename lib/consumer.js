/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * Functions for consuming the portolan-moray buckets
 */

var assert = require('assert-plus');
var fmt = require('util').format;
var mod_bucket = require('./buckets');
var mod_common = require('./common');
var mod_errors = require('./errors');
var mod_lru = require('lru-cache');



// --- Globals



var NAMES = mod_bucket.names;
var SHARED = {
    cache: {}
};



// --- Exports



/**
 * Initialize the caches
 */
function initConsumer(opts, callback) {
    assert.object(opts, 'opts');
    assert.func(callback, 'callback');

    // XXX: thess should all be set by opts!
    SHARED.cache.vl2 = mod_lru({
        max: 100,
        maxAge: 10 * 1000
    });

    SHARED.cache.vl3 = mod_lru({
        max: 100,
        maxAge: 10 * 1000
    });

    SHARED.cache.cn = mod_lru({
        max: 100,
        maxAge: 10 * 1000
    });

    return callback();
}


/**
 * Gets a CN underlay mapping
 */
function underlayLookup(opts, callback) {
    assert.object(opts, 'opts');
    assert.string(opts.cn_uuid, 'opts.cn_uuid');
    assert.object(opts.moray, 'opts.moray');
    assert.optionalBool(opts.noCache, 'opts.noCache');
    assert.func(callback, 'callback');

    var cn = opts.cn_uuid;
    var moray = opts.moray;
    var noCache = opts.noCache || false;

    if (!noCache) {
        var cached = SHARED.cache.cn.get(cn);
        if (cached) {
            return setImmediate(function () {
                callback(null, cached);
            });
        }
    }

    moray.getObject(NAMES.underlay, cn, function (err, obj) {
        if (err) {
            if (err.name === 'ObjectNotFoundError') {
                return callback(mod_errors.underlayNotFound(cn));
            }

            return callback(err);
        }

        SHARED.cache.cn.set(cn, obj.value);
        return callback(null, obj.value);
    });
}


/**
 * Do a VL2 (Virtual Layer 2) lookup
 */
function vl2Lookup(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.optionalBool(opts.noCache, 'opts.noCache');
    assert.number(opts.vl2_mac, 'opts.vl2_mac');
    assert.number(opts.vl2_vnet_id, 'opts.vl2_vnet_id');

    var morayOpts = {};
    var mac = opts.vl2_mac;
    var mapping;
    var noCache = opts.noCache || false;
    var vnetID = opts.vl2_vnet_id;
    var filter = fmt('(&(mac=%d)(vnet_id=%d))', mac, vnetID);
    var key = [mac.toString(), vnetID.toString()].join(',');
    var req;

    if (!noCache) {
        var cached = SHARED.cache.vl2.get(key);
        if (cached) {
            opts.log.debug({ cached: cached },
                'vl2Lookup: returning cached value');
            return setImmediate(function () {
                callback(null, cached);
            });
        }
    }

    req = opts.moray.findObjects(NAMES.mac_ip, filter, morayOpts);

    req.once('error', function searchError(err) {
        opts.log.error(err);
        return callback(err);
    });

    req.on('record', function onRecord(obj) {
        if (obj.value.deleted) {
            return;
        }

        mapping = obj.value;
    });

    req.once('end', function onEnd() {
        if (!mapping) {
            // XXX: store this in the cache?
            return callback(mod_errors.vl2NotFound(mac, vnetID));
        }

        SHARED.cache.vl2.set(key, mapping);
        return callback(null, mapping);
    });
}


/**
 * Do a VL3 (Virtual Layer 3) lookup
 */
function vl3Lookup(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.optionalBool(opts.noCache, 'opts.noCache');
    assert.string(opts.vl3_ip, 'opts.vl3_ip');
    assert.number(opts.vl3_vnet_id, 'opts.vl3_vnet_id');

    var ip = opts.vl3_ip;
    var key = mod_common.vnetMacIPkey(opts.vl3_ip, opts.vl3_vnet_id);
    var noCache = opts.noCache || false;
    var vnetID = opts.vl3_vnet_id;

    if (!noCache) {
        var cached = SHARED.cache.vl3.get(key);
        if (cached) {
            opts.log.debug({ cached: cached },
                'vl3Lookup: returning cached value');
            return setImmediate(function () {
                callback(null, cached);
            });
        }
    }

    opts.moray.getObject(NAMES.mac_ip, key, function (err, obj) {
        if (err) {
            if (err.name === 'ObjectNotFoundError') {
                // XXX: cache this?
                // SHARED.cache.vl3.set(key, output);
                return callback(mod_errors.vl3NotFound(ip, vnetID));
            }

            opts.log.error(err);
            return callback(err);
        }

        if (obj.value.deleted) {
            return callback(mod_errors.vl3NotFound(ip, vnetID));
        }

        SHARED.cache.vl3.set(key, obj.value);
        return callback(null, obj.value);
    });
}



module.exports = {
    underlayLookup: underlayLookup,
    initConsumer: initConsumer,
    vl2Lookup: vl2Lookup,
    vl3Lookup: vl3Lookup
};
