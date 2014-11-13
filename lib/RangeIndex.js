
/**     @module/class cachew.RangeIndex
    Map values to Numbers, then perform nearby-value and range queries.
@argument/Number maxvals
    @optional
    Throw an Error when attempting to add a value and there are already `maxvals` values mapped.
@Array index
@Array refs
*/
var RangeIndex = function (maxvals) {
    this.maxvals = maxvals;
    this.index = [];
    this.refs = [];
};

/*      @member/Function seek
    @development
    Search for either the stored index and ref of a value, or the possible insertion index for the
    value.

    This function is a rather ugly pattern - a synchronous callback. The callback is guaranteed to
    complete before this method call does. It's the least inefficient way to pass two return values
    in javascript.
@argument/Number index
@callback
    @argument/Number location
    @argument value
*/
RangeIndex.prototype.seek = function (index, resCall) {
    if (!this.index.length)
        return resCall (0);

    var zeroth = this.index[0];
    if (index == zeroth)
        return resCall (0, this.refs[0]);
    if (index < zeroth)
        return resCall (-1);

    // search the rest of the index
    var length = this.index.length; // guaranteed nonzero
    var middle = length / 2;
    var i = Math.floor (middle);
    var stepSize = middle; // search loop divides by two before use
    var lastI = i; // when adding stepSize doesn't change lastI, break the search loop

    var cycles = 0;
    var sample = this.index[i];
    while (true) {
        cycles++;
        if (sample == index) return resCall (i, this.refs[i]);

        stepSize = stepSize / 2;
        if (sample < index)
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
    var dif = Math.abs (index - sample);
    var highDif = Math.abs (index - this.index[i+1]);
    if (dif < highDif)
        return resCall (i);
    return resCall (i+1);
};

/**     @member/Function set
    Map a value to a Number index.
@argument/Number index
@argument val
@returns/cachew.RangeIndex
    Self.
*/
RangeIndex.prototype.set = function (index, val) {
    if (this.maxvals && this.count >= this.maxvals)
        throw new Error ('index full');

    var location = 0;
    var current;
    while (true) {
        if (!this.index.length)
            break;

        var zeroth = this.index[0];
        if (index == zeroth) {
            current = this.refs[0];
            break;
        }
        if (index < zeroth) {
            location = -1;
            break;
        }

        // search the rest of the index
        var length = this.index.length; // guaranteed nonzero
        var middle = length / 2;
        var i = Math.floor (middle);
        var stepSize = middle; // search loop divides by two before use
        var lastI = i; // when adding stepSize doesn't change lastI, break the search loop

        var cycles = 0;
        var sample = this.index[i];
        var done = false;
        while (true) {
            cycles++;
            if (sample == index) {
                location = i;
                current = this.refs[i];
                done = true;
                break;
            }

            stepSize = stepSize / 2;
            if (sample < index)
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
        if (!done) {
            var dif = Math.abs (index - sample);
            var highDif = Math.abs (index - this.index[i+1]);
            if (dif < highDif)
                location = i;
            else
                location = i + 1;
        }
        break;
    }

    if (current === undefined) {
        if (location < 0) {
            this.index.unshift (index);
            this.refs.unshift (val);
        } else {
            this.index.splice (location, 0, index);
            this.refs.splice (location, 0, val);
        }
    } else {
        this.index[location] = index;
        this.refs[location] = val;
    }

    return this;
};

/**     @member/Function get
    Get a member of the index by exact value, or undefined.
@argument/Number index
@returns
    The value stored for `key`, or `undefined` if `key` was never set or has expired.
*/
RangeIndex.prototype.get = function (index) {
    if (!this.index.length)
        return;

    var zeroth = this.index[0];
    if (index == zeroth)
        return this.refs[0];
    if (index < zeroth)
        return;

    // search the rest of the index
    var length = this.index.length; // guaranteed nonzero
    var middle = length / 2;
    var i = Math.floor (middle);
    var stepSize = middle; // search loop divides by two before use
    var lastI = i; // when adding stepSize doesn't change lastI, break the search loop

    var cycles = 0;
    var sample = this.index[i];
    var done = false;
    while (true) {
        cycles++;
        if (sample == index)
            return this.refs[i];

        stepSize = stepSize / 2;
        if (sample < index)
            middle += stepSize;
        else
            middle -= stepSize;
        i = Math.floor (middle);
        if (lastI == i)
            break;
        lastI = i;
        sample = this.index[i];
    }
};

/**     @member/Function drop
    Drop a member from the index by exact value, returning the dropped value.
@argument/Number index
@returns Object|undefined
*/
RangeIndex.prototype.drop = function (index) {
    var self = this;
    var out;
    this.seek (index, function (i, item) {
        if (item !== undefined) {
            self.index.splice (i, 1);
            self.refs.splice (i, 1);
        }
        out = item;
    });
    return out;
};


/*      @member/Function getNarest
    Find the values mapped nearest to the provided index. Optionally limit the number of entries
    returned.
@argument/Number index
@argument/Number count
    @optional
@returns Array
*/
RangeIndex.prototype.getNearest = function (index, count) {
    count = count || 1;
    var self = this;
    var result = [];
    this.seek (index, function (i, center) {
        if (i < 0) return;
        result.push (self.refs[i]);
        var up = i+1;
        var down = i-1;

        // round up nearby values
        count = count || 1;
        var maxi = self.refs.length-1;
        while (result.length < count) {
            if (up > maxi)
                if (down < 0)
                    return;
                else
                    result.push (self.refs[down]);
            else if (down < 0)
                if (up > maxi)
                    return;
                else
                    result.push (self.refs[up]);
            else {
                var downDif = index - self.index[down];
                var upDif = self.index[up] - index;
                if (downDif < upDif) {
                    result.push (self.refs[down]);
                    down--;
                } else {
                    result.push (self.refs[up]);
                    up++;
                }
            }
        }

        return;
    });

    return result;
};

/*      @member/Function getNearestAbove
    Find the values mapped nearest above or equal to the provided value. Optionally limit the number
    of entries returned.
@argument/Number index
@argument/Number count
    @optional
@returns Array
*/
RangeIndex.prototype.getNearestAbove = function (index, count) {
    count = count || 1;
    var self = this;
    var result;
    this.seek (index, function (i, center) {
        if (i < 0)
            result = self.refs.slice (0, count);
        else {
            if (self.index[i] < index) i++;
            result = self.refs.slice (i, i + count);
        }
    });

    return result;
};

/*      @member/Function nearestBelow
    Find the values mapped nearest below or equal to the provided index. Optionally limit the number
    of entries returned and/or restrict the minimum index which may be selected.
@argument/Number index
@argument/Number count
    @optional
@returns Array
*/
RangeIndex.prototype.getNearestBelow = function (index, count) {
    count = count || 1;
    var self = this;
    var result;
    this.seek (index, function (i, center) {
        if (i < 0)
            result = [];
        else if (i >= self.index.length)
            result = self.refs.slice (Math.max (0, i - count), i).reverse();
        else {
            if (self.index[i] > index) i--;
            result = self.refs.slice (Math.max (0, i - count + 1), i + 1).reverse();
        }
    });

    return result;
};

/*      @member/Function range

@argument/Number min
@argument/Number max
@returns Array
*/
RangeIndex.prototype.getRange = function (min, max) {
    var self = this;
    var result;
    this.seek (min, function (minI, minCenter) {
        if (self.index[minI] < min) minI++;
        self.seek (max, function (maxI, maxCenter) {
            if (self.index[maxI] <= max) maxI++;
            result = self.refs.slice (Math.max (0, minI), maxI);
        });
    });

    return result;
};

/*      @member/Function best
    Simply return the single value mapped closest to the sample. Equivalent to
    `nearest (sample, 1);` but returns an individual value rather than an Array.
@argument/Number index
*/
RangeIndex.prototype.getBest = function (index) {
    var result;
    var self = this;
    this.seek (index, function (i, center) {
        if (center !== undefined)
            result = center;
        else
            result = self.refs[i];
    });
    return result;
};

/**     @member/Function getLowest
    Return the value mapped to the lowest key in the index.
*/
RangeIndex.prototype.getLowest = function(){
    return this.refs[0];
};

/**     @member/Function getHighest
    Return the value mapped to the highest key in the index.
*/
RangeIndex.prototype.getHighest = function(){
    if (!this.refs.length) return;
    return this.refs[this.refs.length-1];
};

module.exports = RangeIndex;
