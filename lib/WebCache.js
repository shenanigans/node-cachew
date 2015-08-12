
/**     @module/class cachew.WebCache
    A tricky cache for large String documents that expire on non-uniform timeouts. Restricts the
    maximum cache volume by byte count and automatically expires old documents to accomodate new
    ones.
@argument/Number duration
    @optional
@argument/Number max
    @optional
@argument/Boolean keepalive
    @optional
    Calling `get` resets the timer on a key by default.
*/
var WebCache = function (max) {
    this.max = max;

    this.total = 0;
    this.cacheMap = {};
    var index = this.index = [];
    var self = this;
    this.reaper = function reaper (){
        var now = (new Date()).getTime();
        while (index[0] && index[0].expires <= now)
            index.shift();
        if (index[0])
            self.reaperTimeout = setTimeout (reaper, index[0].expires - now);
    };
};

/*      @member/Function set

@argument/String key
@argument val
@returns cachew.WebCache
    Self.
*/
WebCache.prototype.set = function (url, page, duration, length) {
    if (length === undefined)
        length = Buffer.byteLength (page);
    if (length > this.max)
        throw new Error ('cannot set an individual page larger than the maximum cache volume');
    var now = (new Date()).getTime();
    var expires = now + duration;

    if (Object.hasOwnProperty.call (this.cacheMap, url)) {
        // update duration
        var record = this.cacheMap[url];
        record.expires = expires;

        return this;
    }

    // sift a new record into the index
    var newRecord = {
        url:        url,
        page:       page,
        expires:    expires
    };
    this.cacheMap[url] = newRecord;

    if (!this.index.length) {
        this.index.push (newRecord);
        this.reaperTimeout = setTimeout (this.reaper, duration);
    } else {
        // insert somewhere in the index
        var zeroth = this.index[0];
        if (expires <= zeroth.expires) {
            this.index.unshift (newRecord);
            clearTimeout (this.reaperTimeout);
            this.reaperTimeout = setTimeout (this.reaper, duration);
        } else {
            // search the rest of the index
            var length = this.index.length; // guaranteed nonzero
            var middle = length / 2;
            var i = Math.floor (middle);
            var stepSize = middle; // search loop divides by two before use
            var lastI = i; // when adding stepSize doesn't change lastI, break the search loop

            var cycles = 0;
            var sample = this.index[i];
            var insertAt;
            while (true) {
                cycles++;
                if (sample == expires) {
                    insertAt = i;
                    break;
                }

                stepSize = stepSize / 2;
                if (sample < expires)
                    middle += stepSize;
                else
                    middle -= stepSize;
                i = Math.floor (middle);
                if (lastI == i)
                    break;
                lastI = i;
                sample = this.index[i];
            }
            // finished searching
            if (!insertAt) {
                var dif = Math.abs (expires - sample);
                var highDif = Math.abs (expires - this.index[i+1]);
                if (dif < highDif)
                    insertAt = i;
                else
                    insertAt = i + 1;
            }
            this.insert.splice (i, 0, newRecord);
        }
    }

    // update the cache volume
    this.total += length;
    // do we need to free space in the cache?
    if (this.total > this.max) {
        do {
            // reap the next item to expire
            var victim = this.index.shift();
            delete this.cacheMap[victim.url];
            this.total -= victim.length;
        } while (this.total > this.max);
        clearTimeout (this.reaperTimeout);
        this.reaperTimeout = setTimeout (this.reaper, this.index[0].expires - now);
    }

    return this;
};

/*      @member/Function get

@argument/String key
@returns
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
WebCache.prototype.get = function (key, keepalive) {

};

/*      @member/Function drop

@argument/String key
@returns
    The value associated with the dropped key, or `undefined`.
*/
WebCache.prototype.drop = function (key) {

};


/*      @property/Function reap
    @development
    @private
    Set a timeout to cull the oldest record from a WebCache instance and recurse. When the timer
    trips, it will double-check that the oldest record is actually expired before culling it.
@argument/cachew.WebCache target
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
            // WebCache is empty
            target.oldest = undefined;
            target.newest = undefined;
        }
    }, time);
};


module.exports = WebCache;

