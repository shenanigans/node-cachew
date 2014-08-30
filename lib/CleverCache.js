
/*      @module cachew
        @class CleverCache
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

var EventEmitter = require ('events').EventEmitter;
var util = require ('util');

var CleverCache = function (fallback, max, keepalive) {
    EventEmitter.call (this);

    this.fallback = fallback;
    this.max = max;
    this.count = 0;
    this.keepalive = Boolean (keepalive);

    this.cacheMap = {};
};
util.inherits (CleverCache, EventEmitter);

/*      @function CleverCache#set

@argument/Sstring key
@argument/Object val
@returns cachew.CleverCache
    Self.
*/
CleverCache.prototype.set = function (key, val) {
    var now = (new Date()).getTime();

    if (!Object.hasOwnProperty.call (this.cacheMap, key)) {
        // novel key
        var entry = { key:key, val:val, T:now };
        this.cacheMap[key] = entry;
        if (!this.newest) {
            // first key
            this.newest = entry;
            this.oldest = entry;
            return this;
        }

        // add to end of chain
        entry.previous = this.newest;
        this.newest.next = entry;
        this.newest = entry;

        if (this.count < this.max) return ++this.count;

        // too many records! Delete the oldest record
        delete this.cacheMap[this.oldest.key];
        if (this.oldest.next) this.oldest.next.previous = undefined;
        this.oldest = this.oldest.next;

        return this.count;
    }

    // update existing key
    var entry = this.cacheMap[key];
    entry.T = now;
    entry.val = val;

    // if the edited entry is already the newest entry, there is no need to edit the chain
    if (this.newest === entry) return this.count;

    // swap next/prev pointers with neighbors
    entry.previous.next = entry.next;
    if (entry.next)
        entry.next.previous = entry.previous;

    // move the "oldest" pointer
    if (this.oldest === entry)
        this.oldest = entry.previous;

    // move the "newest" pointer
    entry.next = this.newest;
    this.newest.previous = entry;
    this.newest = entry;

    return this.count;
};

/*      @function CleverCache#get

@argument/String key
@returns Object
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
CleverCache.prototype.get = function (key) {
    if (!Object.hasOwnProperty.call (this.cacheMap, key))
        return;

    var val = this.cacheMap[key].val;
    if (this.keepalive)
        this.set (key, val);
    return val;
};

/*      @function CleverCache#drop

@argument/String key
@returns Object
    The value associated with the dropped key, or `undefined`.
*/
CleverCache.prototype.drop = function (key) {
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


module.exports = CleverCache;

