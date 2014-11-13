
/**     @module/class cachew.DocumentChainCache
    Simple, lightweight, efficient cache for large numbers of keys which expire on a uniform TTL but
    may be renewed frequently. This cache type uses a double-linked-list structure. A single timer
    is used and no events are provided.
@argument/Number duration
    @optional
@argument/Number max
    @optional
@argument/Boolean keepalive
    @optional
    Calling `get` resets the timer on a key by default.
*/
var DocumentChainCache = function (indices, duration, max, keepalive) {
    this.duration = duration;
    this.max = max;
    this.count = 0;
    this.keepalive = keepalive;

    this.cacheMap = {};
    for (var i in indices)
        this.cacheMap[indices[i]] = {};
    this.indices = indices;
};

/*      @member/Function set

@argument/Object doc
@returns cachew#DocumentChainCache
    Self.
*/
DocumentChainCache.prototype.set = function (doc) {
    var now = (new Date()).getTime();
    // search for entry
    var entry;
    for (var i in this.indices) {
        var key = this.indices[i];
        if (Object.hasOwnProperty.call (doc, key))
            if (Object.hasOwnProperty.call (this.cacheMap[key], doc[key])) {
                entry = this.cacheMap[key][doc[key]];
                break;
            }
    }

    if (entry) { // inline drop
        this.count--;
        for (var i in this.indices) {
            var key = this.indices[i];
            if (Object.hasOwnProperty.call (entry.val, key))
                delete this.cacheMap[key][entry.val[key]];
        }

        // move some pointers... it's ok if they're undefined
        if (entry.newer)
            entry.newer.older = entry.older;
        if (entry.older)
            entry.older.newer = entry.newer;
        if (this.newest === entry)
            this.newest = entry.older;
        if (this.oldest === entry) {
            this.oldest = entry.newer;
            if (this.duration)
                if (!this.oldest)
                    clearTimeout (this.reaper);
                else
                    reap (this, Math.max (0, this.oldest.T - now));
            }
        delete entry.newer;
        delete entry.older;
    }

    // novel key
    var entry = { val:doc };
    if (this.duration)
        entry.T = now + this.duration;

    for (var i in this.indices) {
        var key = this.indices[i];
        if (Object.hasOwnProperty.call (doc, key))
            this.cacheMap[key][doc[key]] = entry;
    }

    if (!this.newest) { // first key
        this.newest = this.oldest = entry;
        this.count = 1;
        if (this.duration)
            reap (this, this.duration);
        return this;
    }

    // add to end of chain
    entry.older = this.newest;
    this.newest.newer = entry;
    this.newest = entry;
    if (!this.max || this.count < this.max) {
        this.count++;
        return this;
    }

    // too many records! delete the oldest record and reset the reaper
    var old = this.oldest;
    for (var i in this.indices) {
        var key = this.indices[i];
        if (Object.hasOwnProperty.call (old.val, key))
            delete this.cacheMap[key][old.val[key]];
    }
    if (old.newer) // remove the dropped key from the new oldest key
        old.newer.older = undefined;
    this.oldest = old.newer;
    delete old.newer;
    delete old.older;
    if (this.duration && this.oldest)
        reap (this, Math.max (0, this.oldest.T - now));

    return this;
};

/*      @member/Function get

@argument/String key
@returns Object
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
DocumentChainCache.prototype.get = function (index, key, keepalive) {
    if (!Object.hasOwnProperty.call (this.cacheMap, index))
        throw new Error ('Cannot select by an unknown index');
    if (!Object.hasOwnProperty.call (this.cacheMap[index], key))
        return undefined;

    var entry = this.cacheMap[index][key];

    // renew?
    if ((keepalive || this.keepalive)) {
        var now = (new Date()).getTime();
        if (this.duration)
            entry.T = now + this.duration;

        if (this.newest === entry) return entry.val;

        if (this.oldest === entry) {
            // move the "oldest" pointer
            // the reaper timeout must be updated
            this.oldest = entry.newer;
            if (this.oldest) {
                this.oldest.older = undefined;
                if (this.duration)
                    reap (this, Math.max (0, this.oldest.T - now));
            }
        }

        // swap next/prev pointers with neighbors
        if (entry.older)
            entry.older.newer = entry.newer;
        if (entry.newer)
            entry.newer.older = entry.older;

        // move the "newest" pointer
        entry.older = this.newest;
        this.newest.newer = entry;
        this.newest = entry;
    }

    return entry.val;
};

/*      @member/Function drop

@argument/String key
@returns Object|undefined
    The value associated with the dropped key, or `undefined`.
*/
DocumentChainCache.prototype.drop = function (index, key) {
    if (!Object.hasOwnProperty.call (this.cacheMap, index))
        throw new Error ('Cannot select by an unknown index');
    if (!Object.hasOwnProperty.call (this.cacheMap[index], key))
        return undefined;

    this.count--;
    var entry = this.cacheMap[index][key];
    for (var i in this.indices) {
        var key = this.indices[i];
        if (Object.hasOwnProperty.call (entry.val, key))
            delete this.cacheMap[key][entry.val[key]];
    }

    // move some pointers... it's ok if they're undefined
    if (entry.newer)
        entry.newer.older = entry.older;
    if (entry.older)
        entry.older.newer = entry.newer;
    if (this.newest === entry)
        this.newest = entry.older;
    if (this.oldest === entry) {
        this.oldest = entry.newer;
        if (this.duration)
            if (!this.oldest)
                clearTimeout (this.reaper);
            else
                reap (this, Math.max (0, this.oldest.T - now));
        }
    delete entry.newer;
    delete entry.older;

    return entry.val;
};


/*      @property/Function reap
    @development
    @private
    Set a timeout to cull the oldest record from a DocumentChainCache instance and recurse. When the timer
    trips, it will double-check that the oldest record is actually expired before culling it.
@argument/cachew.DocumentChainCache target
@argument/Number time
    Milliseconds until the culling operation should occur.
*/
var reap = function (target, time) {
    clearTimeout (target.reaper);
    target.reaper = setTimeout (function _reap (){
        if (!target.oldest) {
            return;
        }
        var now = (new Date()).getTime();
        if (target.oldest.T >= now) {
            clearTimeout (target.reaper);
            target.reaper = setTimeout (_reap, Math.max (0, target.oldest.T - now));
            return;
        }

        target.count--;

        // delete oldest key
        var old = target.oldest;
        for (var i in target.indices) {
            var key = target.indices[i];
            if (Object.hasOwnProperty.call (old.val, key))
                delete target.cacheMap[key][old.val[key]];
        }

        if (old.newer) {
            if (old.newer)
                old.newer.older = old.older;
            if (old.older)
                old.older.newer = old.newer;

            if (target.newest === old)
                target.newest = old.older;
            if (target.oldest === old)
                target.oldest = old.newer;

            delete old.newer;
            delete old.older;

            clearTimeout (target.reaper);
            var delay = Math.max (0, target.oldest.T - now);
            if (delay)
                target.reaper = setTimeout (_reap, delay);
            else
                process.nextTick (_reap);
        } else {
            // DocumentChainCache is empty
            target.oldest = undefined;
            target.newest = undefined;
        }
    }, time);
};


module.exports = DocumentChainCache;

