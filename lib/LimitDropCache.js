
/**     @module/class cachew.LimitDropCache
    Simple, lightweight, efficient cache for large numbers of keys which expire on a uniform TTL but
    may be renewed frequently. This cache type uses a double-linked-list structure. A single timer
    is used and no events are provided.
@argument/Number duration
    @optional
@argument/Number max
    @optional
*/
var LimitDropCache = function (duration, maxDuration, max, dropCall) {
    this.duration = duration;
    this.maxDuration = maxDuration;
    this.max = max;
    this.dropCall = dropCall;

    this.count = 0;
    this.cacheMap = {};
};

/*      @member/Function set

@argument/String key
@argument val
@returns cachew.LimitDropCache
    Self.
*/
LimitDropCache.prototype.set = function (key, val) {
    if (!Object.hasOwnProperty.call (this.cacheMap, key)) {
        // novel key
        var entry = { key:key, val:val, set:(new Date()).getTime() };
        entry.T = (new Date()).getTime() + this.duration;
        this.cacheMap[key] = entry;

        if (!this.newest) { // first key
            this.newest = this.oldest = entry;
            this.count = 1;
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
        delete this.cacheMap[this.oldest.key];
        var old = this.oldest;
        if (old.newer) // remove the dropped key from the new oldest key
            old.newer.older = undefined;
        this.oldest = old.newer;
        delete old.newer;
        delete old.older;
        if (this.oldest)
            reap (this, Math.max (0, this.oldest.T - (new Date()).getTime()));

        this.dropCall (old.key, old.val);

        return this;
    }

    // update existing key
    var entry = this.cacheMap[key];
    var now = (new Date()).getTime();
    entry.T = now + this.duration;
    entry.val = val;

    // if the edited entry is already the newest entry, there is no need to edit the chain
    if (this.newest === entry) return this.count;

    if (this.oldest === entry) {
        // move the "oldest" pointer
        // the reaper timeout must be updated
        this.oldest = entry.newer;
        if (this.oldest) {
            this.oldest.older = undefined;
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

    return this;
};

/*      @member/Function get

@argument/String key
@returns
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
LimitDropCache.prototype.get = function (key) {
    if (!Object.hasOwnProperty.call (this.cacheMap, key))
        return undefined;

    var entry = this.cacheMap[key];

    // renew?
    var now = (new Date()).getTime();
    if (now - entry.set < this.maxDuration) {
        entry.T = now + this.duration;

        if (this.newest === entry) return entry.val;

        if (this.oldest === entry) {
            // move the "oldest" pointer
            // the reaper timeout must be updated
            this.oldest = entry.newer;
            if (this.oldest) {
                this.oldest.older = undefined;
                reap (this, Math.max (0, this.oldest.T - now));
            }
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

    return entry.val;
};

/*      @member/Function drop

@argument/String key
@returns
    The value associated with the dropped key, or `undefined`.
*/
LimitDropCache.prototype.drop = function (key) {
    if (!Object.hasOwnProperty.call (this.cacheMap, key))
        return undefined;

    this.count--;
    var entry = this.cacheMap[key];
    delete this.cacheMap[key];

    // move some pointers... it's ok if they're undefined
    if (entry.newer)
        entry.newer.older = entry.older;
    if (entry.older)
        entry.older.newer = entry.newer;
    if (this.newest === entry)
        this.newest = entry.older;
    if (this.oldest === entry) {
        this.oldest = entry.newer;
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
    Set a timeout to cull the oldest record from a LimitDropCache instance and recurse. When the timer
    trips, it will double-check that the oldest record is actually expired before culling it.
@argument/cachew.LimitDropCache target
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
        delete target.cacheMap [old.key];
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
            // LimitDropCache is empty
            target.oldest = undefined;
            target.newest = undefined;
        }
        target.dropCall (old.key, old.val);
    }, time);
};


module.exports = LimitDropCache;

