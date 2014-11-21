node-cachew
===========
In-memory value caching for expiring keys and an efficient range index.


Installation And Use
--------------------
```shell
$ npm install cachew
```

#####ChainCache
Useful for simple refs expiring on a uniform timeout. Uses a linked-list configuration.
```javascript
var example = new require('cachew').ChainCache (
    100000,         // maximum key count
    1000 * 60 * 5,  // store for five minutes
    true            // renew keys when read
);
http.createServer (function (request, response) {
    // cache whole requests by ip
    example.set (
        request.connection.remoteAddress,
        request
    );

    // process request
});
```

#####DocumentChainCache
Used for complex Object refs which must be indexed on more than one key. Basically a ChainCache
under the hood.
```javascript
var example = new require('cachew').DocumentChainCache (
    [ 'remoteAddress' ],
    100000,         // maximum key count
    1000 * 60 * 5,  // store for five minutes
    true            // renew keys when read
);
http.createServer (function (request, response) {
    // cache connection information by ip
    example.set (request.connection);

    // process request
});
```

#####RangeIndex
When you need to store and retrieve values by numerical fit, use a RangeIndex.
```javascript
var example = new require('cachew').RangeIndex (
    100000 // maximum key count
);
var points = [
    { x:10,     y:15.3,     data:payload_01},
    { x:4.81,   y:7,        data:payload_02},
    { x:100,    y:153,      data:payload_03},
]
for (var i in points) {
    // map points by distance from the origin
    var point = points[i];
    var distance = Math.sqrt(
        Math.pow (point.x, 2)
      + Math.pow (point.y, 2)
    );
    example.set (distance, point);
}

// select all points within a hollow circle
// centered on the origin
console.log (example.getRange (10, 30));
```


Development
-----------
`cachew` is developed and maintained by Kevin "Schmidty" Smith under the MIT license. I am currently
broke and unemployed. If you want to see continued development on `cachew`, please help me
[pay my bills!](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=PN6C2AZTS2FP8&lc=US&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_SM%2egif%3aNonHosted)


Tests
-----
```shell
$ npm test
```
Several of the tests will take a long time to complete. These are rigorous timeout tests requiring
multiple rounds of expiration and renewal cycles. Some of them are expected to take nearly a full
second each.


LICENSE
-------
The MIT License (MIT)

Copyright (c) 2014 Kevin "Schmidty" Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
