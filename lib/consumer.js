/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2017, Joyent, Inc.
 */

/*
 * Functions for consuming the portolan-moray buckets
 */

'use strict';

var assert = require('assert-plus');
var fmt = require('util').format;
var mod_bucket = require('./buckets');
var mod_common = require('./common');
var mod_errors = require('./errors');
var mod_lru = require('lru-cache');
var VError = require('verror');



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

    SHARED.cache.cn_uuid = mod_lru({
        max: 100,
        maxAge: 10 * 1000
    });

    SHARED.cache.ip = mod_lru({
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

    var moray = opts.moray;
    var noCache = opts.noCache || false;

    if (!noCache) {
        var cached = SHARED.cache.cn_uuid.get(opts.cn_uuid);
        if (cached) {
            setImmediate(callback, null, cached);
            return;
        }
    }

    moray.getObject(NAMES.underlay, opts.cn_uuid, function (err, obj) {
        if (err) {
            if (VError.hasCauseWithName(err, 'ObjectNotFoundError')) {
                return callback(mod_errors.underlayNotFound(
                    'cn_uuid', opts.cn_uuid));
            }

            return callback(err);
        }

        SHARED.cache.ip.set(obj.value.ip, obj.value);
        SHARED.cache.cn_uuid.set(opts.cn_uuid, obj.value);
        return callback(null, obj.value);
    });
}

/**
 * Find a CN UUID via its mapped underlay IP.
 */
function underlayLookupByIp(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.string(opts.ip, 'opts.ip');
    assert.object(opts.moray, 'opts.moray');
    assert.func(callback, callback);

    var filter = fmt('(ip=%s)', opts.ip);
    var searchOpts = { limit: 2 };
    var req;
    var mappings = [];

    opts.log.debug({ ip: opts.ip }, 'underlayLookup searching');

    req = opts.moray.findObjects(NAMES.underlay, filter, searchOpts);

    req.once('error', function searchError(err) {
        opts.log.error(err);
        return callback(err);
    });

    req.on('record', function onRecord(obj) {
        if (mappings.length >= 1) {
            opts.log.error({ ip: opts.ip, mappings: mappings },
                'Multiple underlay mappings found');
        }

        mappings.push(obj.value);
    });

    req.once('end', function onEnd() {
        if (mappings.length === 0) {
            return callback(mod_errors.underlayNotFound('ip', opts.ip));
        } else if (mappings.length > 1) {
            return callback(mod_errors.fatal(
                fmt('Multiple mappings found for ip=%s', opts.ip)));
        }

        SHARED.cache.cn_uuid.set(mappings[0].cn_uuid, mappings[0]);
        SHARED.cache.ip.set(opts.ip, mappings[0]);
        return callback(null, mappings[0]);
    });
}

/**
 * Do a VL2 (Virtual Layer 2) lookup by mac, vnet_id
 */
function vl2Lookup(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.optionalBool(opts.noCache, 'opts.noCache');
    assert.number(opts.vl2_mac, 'opts.vl2_mac');
    assert.number(opts.vl2_vnet_id, 'opts.vl2_vnet_id');

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
            setImmediate(callback, null, cached);
            return;
        }
    }

    req = opts.moray.findObjects(NAMES.mac_ip, filter);

    req.once('error', function searchError(err) {
        opts.log.error(err, 'vl2Lookup search error');
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
 * Finds the set of mappings given a single vnet_id.
 */
function vl2LookupCns(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.number(opts.vnet_id, 'opts.vnet_id');

    var filter = fmt('(vnet_id=%d)', opts.vnet_id);
    var cns = [];

    // XXX - rows are currently tombstoned, not deleted, so we may
    // have to handle >>1000 here.
    var req = opts.moray.findObjects(NAMES.mac_ip, filter);

    req.once('error', function searchError(err) {
        opts.log.error(err, 'vl2LookupCns search error');
        return callback(err);
    });

    req.on('record', function onRecord(obj) {
        if (obj.value.deleted) {
            return;
        }
        cns = cns.concat(obj.value);
    });

    req.once('end', function onEnd() {
        // if cns is empty, not an error
        return callback(null, cns);
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
            setImmediate(callback, null, cached);
            return;
        }
    }

    opts.moray.getObject(NAMES.mac_ip, key, function (err, obj) {
        if (err) {
            if (VError.hasCauseWithName(err, 'ObjectNotFoundError')) {
                // XXX: cache this?
                // SHARED.cache.vl3.set(key, output);
                return callback(mod_errors.vl3NotFound(ip, vnetID));
            }

            opts.log.error(err, 'vl3Lookup getObject error');
            return callback(err);
        }

        if (obj.value.deleted) {
            return callback(mod_errors.vl3NotFound(ip, vnetID));
        }

        SHARED.cache.vl3.set(key, obj.value);
        return callback(null, obj.value);
    });
}


/**
 * Do some log lookups
 */
function logReq(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.cnUuid, 'opts.cnUuid');
    assert.number(opts.limit, 'opts.limit');

    var cnUuid = opts.cnUuid;
    var filter = fmt('cn_uuid=%s', cnUuid);
    var searchOpts = {
        limit: opts.limit,
        sort: {
            attribute: '_mtime'
        }
    };
    var logs = [];

    /*
     * There are potentially 1000+ results here, however the protocol specs the
     * limit as the _maximum bytes_ to return; even should varpd requests bytes
     * that would total >1000 messages, we can safely return the first 1000.
     */
    var req = opts.moray.findObjects(NAMES.net_events, filter, searchOpts,
        true);

    req.once('error', function searchError(err) {
        opts.log.error(err, 'logreq search error');
        return callback(err);
    });

    req.on('record', function onRecord(obj) {
        obj.value.id = obj.key;
        logs.push(obj.value);
    });

    req.once('end', function onEnd() {
        // "no results" is acceptable here.
        opts.log.debug({ logs: logs }, 'consumer.logReq returning records');
        return callback(null, logs);
    });
}

/**
 * Delete logs processed by the remote varpd
 */
function logRm(opts, callback) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.object(opts.moray, 'opts.moray');
    assert.string(opts.uuid, 'opts.uuid');

    opts.log.debug({ bucket: NAMES.net_events, uuid: opts.uuid },
        'logRm - attempting delete');

    opts.moray.delObject(NAMES.net_events, opts.uuid, function (err) {
        if (err) {
            // ObjectNotFound is strange but not a problem for delete.
            if (VError.hasCauseWithName(err, 'ObjectNotFoundError')) {
                opts.log.warn({ err: err, logUuid: opts.uuid },
                    'logRm call for already-deleted log');
            } else {
                callback(err);
                return;
            }
        }

        opts.log.debug({ logUuid: opts.uuid }, 'logRm - deleted log');
        callback();
    });
}


module.exports = {
    underlayLookup: underlayLookup,
    underlayLookupByIp: underlayLookupByIp,
    initConsumer: initConsumer,
    vl2Lookup: vl2Lookup,
    vl2LookupCns: vl2LookupCns,
    vl3Lookup: vl3Lookup,
    logReq: logReq,
    logRm: logRm
};
