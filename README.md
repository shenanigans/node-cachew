node-cachew
===========
In-memory value caching with two levels of complexity - the lightweight `ChainCache` is perfect for
values which expire on a uniform TTL, while the flexible `CleverCache` provides individualized
timeouts, events and asynchronous fallback support. Maximum cache size restrictions efficiently
drop the next value to expire when a new value is `set`.

Installation
------------
`npm install cachew`

Usage
-----
* `ChainCache` is a very simple cache that requires minimal timing resources. If every key expires
    on the same TTL (or never) then `ChainCache` is most likely the right solution.
    ```javascript

    var activeUserCache (
        1000 * 60 * 3,
        10000,
        true
    );

    function fileActionRecord (action) {
        activeUserCache.set ('jane doe', action);
    };

    function isUserActive (username) {
        return activeUserCache.get (username) !== undefined;
    };
    ```
* `CleverCache` is less simple and will execute a lot of extraneous paths if its features are not
    required.
