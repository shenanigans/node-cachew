
/*      @module cachew
        @class ChainCache
    Simple, lightweight, efficient cache for expiring keys. A single timer is used, with minimal
    cancellation/reset and no events. An instance-wide timeout setting is used and keys simply
    revert to `undefined`.
@argument/Number duration
    @optional
@argument/Number max
    @optional
@argument/Boolean keepalive
    @optional
    Calling `get` resets the timer on a key.
*/
var ChainCache = function (duration, max, keepalive) {
    this.duration = duration;
    this.max = max;
    this.count = 0;
    this.keepalive;

    this.cacheMap = {};
};

/*      @function ChainCache#set

@argument/Sstring key
@argument/Object val
@returns cachew#ChainCache
    Self.
*/
ChainCache.prototype.set = function (key, val) {
    var now = (new Date()).getTime();

    if (!Object.hasOwnProperty.call (this.cacheMap, key)) {
        // novel key
        var entry = { key:key, val:val, T:now };
        this.cacheMap[key] = entry;
        if (!this.newest) {
            // first key
            this.newest = entry;
            this.oldest = entry;
            if (this.duration)
                reaper (this, this.duration);
            return this;
        }

        // add to end of chain
        entry.previous = this.newest;
        this.newest.next = entry;
        this.newest = entry;

        if (this.count < this.max) return ++this.count;

        // too many records!
        // delete the oldest record and reset the reaper
        delete this.cacheMap[this.oldest.key];
        if (this.oldest.next) this.oldest.next.previous = undefined;
        this.oldest = this.oldest.next;
        if (this.duration && this.oldest)
            reaper (this, Math.max (0, this.oldest.T - now + this.duration));

        return this.count;
    }

    // update existing key
    var entry = this.cacheMap[key];
    entry.T = now;
    entry.val = val;

    // if the edited entry is already the newest entry, there is no need to edit the chain
    if (this.newest === entry) return this.count;

    if (this.oldest === entry) {
        // move the "oldest" pointer
        // the reaper timeout must be updated
        this.oldest = entry.previous;
        if (this.duration)
            reaper (this, Math.max (0, this.oldest.T - now + this.duration));
    }

    // swap next/prev pointers with neighbors
    entry.previous.next = entry.next;
    if (entry.next)
        entry.next.previous = entry.previous;

    // move the "newest" pointer
    entry.next = this.newest;
    this.newest.previous = entry;
    this.newest = entry;

    return this.count;
};

/*      @function ChainCache#get

@argument/String key
@returns Object
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
ChainCache.prototype.get = function (key) {
    if (Object.hasOwnProperty.call (this.cacheMap, key)) {
        var val = this.cacheMap[key].val;
        if (this.keepalive)
            this.set (key, val);
        return val;
    }
};

/*      @function ChainCache#drop

@argument/String key
@returns Object
    The value associated with the dropped key, or `undefined`.
*/
ChainCache.prototype.drop = function (key) {
    if (!Object.hasOwnProperty.call (this.cacheMap, key))
        return;

    this.count--;
    var entry = this.cacheMap[key];

    // move some pointers... it's ok if they're undefined
    if (entry.next)
        entry.next.previous = entry.previous;
    if (entry.previous)
        entry.previous.next = entry.next;
    if (this.newest === entry)
        this.newest = entry.previous;
    if (this.oldest === entry) {
        this.oldest = entry.next;
        if (this.duration)
            if (!this.oldest)
                clearTimeout (this.reaper);
            else
                reaper (this, Math.max (0, this.oldest.T - now + this.duration));
    }

    return entry.val;
};


/*      @function reaper
    @development
    Set a timeout to cull the oldest record from a ChainCache instance and recurse. When the timer
    trips, it will double-check that the oldest record is actually expired before culling it.
@argument/cachew.ChainCache target
@argument/Number time
    Milliseconds until the culling operation should occur.
*/
var reaper = function (target, time) {
    clearTimeout (target.reaper);
    target.reaper = setTimeout (function(){
        if (!target.oldest) return;
        var now = (new Date()).getTime();
        if (target.T >= now) return;

        target.count--;

        // delete oldest key
        var old = target.oldest;
        delete target.cacheMap (old.key);

        if (old.next) {
            target.oldest = old.next;
            target.oldest.previous = undefined;
            reaper (this, Math.max (0, this.oldest.T - now + this.duration));
        } else {
            // ChainCache is empty
            target.oldest = undefined;
            target.newest = undefined;
        }
    }, time);
};


module.exports = ChainCache;

