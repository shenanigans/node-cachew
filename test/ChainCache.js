
var ChainCache = require ('../main').ChainCache;
var assert = require ('assert');

var LONG_TIME = 10000;
var SHORT_TIME = 50;

describe ("ChainCache", function(){
    describe ("CRUD", function(){
        var testCache;
        describe ("Create", function(){
            it ("creates a new cache", function(){
                testCache = new ChainCache();
            });
            it ("adds values to the cache", function(){
                testCache.set ('able', 'ABLE');
                testCache.set ('baker', 'BAKER');
                testCache.set ('charlie', 'CHARLIE');
                testCache.set ('dog', 'DOG');
                testCache.set ('easy', 'EASY');
            });
        });
        describe ("Read", function(){
            it ("reads the correct values from the cache", function(){
                assert (testCache.get ('easy') === "EASY", 'testCache.get ("easy")');
                assert (testCache.get ('dog') === "DOG", 'testCache.get ("dog")');
                assert (testCache.get ('baker') === "BAKER", 'testCache.get ("baker")');
                assert (testCache.get ('charlie') === "CHARLIE", 'testCache.get ("charlie")');
                assert (testCache.get ('able') === "ABLE", 'testCache.get ("able")');
            });
            it ("reads undefined for unset keys", function(){
                assert (
                    testCache.get ('Charlie Chaplin') === undefined,
                    'testCache.get ("Charlie Chaplin")'
                );
                assert (
                    testCache.get ('"Dog" The Bounty Hunter') === undefined,
                    'testCache.get ("\\"Dog\\" The Bounty Hunter")'
                );
            });
        });
        describe ("Update", function(){
            it ("sets a new value for a key", function(){
                testCache.set ('baker', 'boozer');
                testCache.set ('charlie', 'chuckles');
                testCache.set ('dog', 'doofus');
            });
            it ("reads back the new value", function(){
                assert (testCache.get ('dog') === "doofus", 'testCache.get ("dog")');
                assert (testCache.get ('baker') === "boozer", 'testCache.get ("baker")');
                assert (testCache.get ('charlie') === "chuckles", 'testCache.get ("charlie")');
            });
        });
        describe ("Delete", function(){
            it ("deletes values associated with keys", function(){
                testCache.drop ('baker');
                testCache.drop ('charlie');
                testCache.drop ('dog');
            });
            it ("does nothing when an unknown key is deleted", function(){
                testCache.drop ('James Steed');
                testCache.drop ('Roger St. Hammond');
                testCache.drop ('Jason Clarkson');
            });
            it ("reads undefined for deleted keys", function(){
                assert (testCache.get ('dog') === undefined, 'testCache.get ("dog")');
                assert (testCache.get ('baker') === undefined, 'testCache.get ("baker")');
                assert (testCache.get ('charlie') === undefined, 'testCache.get ("charlie")');
            });
            it ("still has all the keys that weren't deleted", function(){
                assert (testCache.get ('able') === "ABLE", 'testCache.get ("able")');
                assert (testCache.get ('easy') === "EASY", 'testCache.get ("easy")');
            });
        });
    });

    describe ("overflows", function(){
        var smallCache;
        var largeCache;
        it ("instantiates caches with maximum length", function(){
            smallCache = new ChainCache (LONG_TIME, 3);
            largeCache = new ChainCache (LONG_TIME, 5);
        });
        it ("writes and reads back sub-maximum numbers of keys normally", function(){
            smallCache.set ('able', 'ABLE');
            smallCache.set ('baker', 'BAKER');
            largeCache.set ('able', 'ABLE');
            largeCache.set ('baker', 'BAKER');
            largeCache.set ('charlie', 'CHARLIE');
            largeCache.set ('dog', 'DOG');

            assert (smallCache.get ('baker') === "BAKER", 'smallCache.get ("baker")');
            assert (smallCache.get ('able') === "ABLE", 'smallCache.get ("able")');
            assert (largeCache.get ('dog') === "DOG", 'largeCache.get ("dog")');
            assert (largeCache.get ('charlie') === "CHARLIE", 'largeCache.get ("charlie")');
        });

        describe ("simple overflow", function(){
            it ("does not overflow when max is only reached", function(){
                smallCache.set ('charlie', 'CHARLIE');
                largeCache.set ('easy', 'EASY');

                assert (smallCache.get ('able') === "ABLE", 'smallCache.get ("able")');
                assert (smallCache.get ('baker') === "BAKER", 'smallCache.get ("baker")');
                assert (smallCache.get ('charlie') === "CHARLIE", 'smallCache.get ("charlie")');
                assert (largeCache.get ('able') === "ABLE", 'largeCache.get ("able")');
                assert (largeCache.get ('baker') === "BAKER", 'largeCache.get ("baker")');
                assert (largeCache.get ('charlie') === "CHARLIE", 'largeCache.get ("charlie")');
                assert (largeCache.get ('dog') === "DOG", 'largeCache.get ("dog")');
                assert (largeCache.get ('easy') === "EASY", 'largeCache.get ("easy")');
            });
            it ("overflows in correct order", function(){
                smallCache.set ('xray', 'XRAY');
                assert (smallCache.get ('able') === undefined, 'able should be deleted');
                smallCache.set ('yoke', 'YOKE');
                assert (smallCache.get ('baker') === undefined, 'baker should be deleted');
                smallCache.set ('zebra', 'ZEBRA');
                assert (smallCache.get ('charlie') === undefined, 'charlie should be deleted');


                largeCache.set ('victor', 'VICTOR');
                assert (largeCache.get ('able') === undefined, 'able should be deleted');
                largeCache.set ('william', 'WILLIAM');
                assert (largeCache.get ('baker') === undefined, 'baker should be deleted');
                largeCache.set ('xray', 'XRAY');
                assert (largeCache.get ('charlie') === undefined, 'charlie should be deleted');
                largeCache.set ('yoke', 'YOKE');
                assert (largeCache.get ('dog') === undefined, 'dog should be deleted');
                largeCache.set ('zebra', 'ZEBRA');
                assert (largeCache.get ('easy') === undefined, 'easy should be deleted');
            });
        });

        describe ("overflow reordering", function(){
            var overflow = new ChainCache (LONG_TIME, 3);
            overflow.set ('able', 'ABLE');
            overflow.set ('baker', 'BAKER');
            overflow.set ('charlie', 'CHARLIE');

            it ("bumps the oldest key and overflows correctly", function(){
                overflow.set ('able', 'ABLE');
                overflow.set ('dog', 'DOG');
                assert (overflow.get ('baker') === undefined, 'baker should be deleted');
                overflow.set ('easy', 'EASY');
                assert (overflow.get ('charlie') === undefined, 'charlie should be deleted');
                overflow.set ('fox', 'FOX');
                assert (overflow.get ('able') === undefined, 'able should be deleted');
            });

            describe ("keepalive caches", function(){
                var keepalive;
                it ("instantiates keepalive caches", function(){
                    keepalive = new ChainCache (LONG_TIME, 3, true);
                });
                it ("writes normally with keepalive set", function(){
                    keepalive.set ('able', 'ABLE');
                    keepalive.set ('baker', 'BAKER');
                    keepalive.set ('charlie', 'CHARLIE');
                });
                it ("bumps the oldest key and overflows correctly", function(){
                    keepalive.get ('able');
                    keepalive.set ('dog', 'DOG');
                    assert (keepalive.get ('baker') === undefined, 'baker should be deleted');
                });
                it ("bumps a key from the middle and overflows correctly", function(){
                    keepalive.get ('able');
                    keepalive.set ('easy', 'EASY');
                    assert (keepalive.get ('charlie') === undefined, 'charlie should be deleted');
                });
            });
        });
    });

    describe ("timeouts", function(){
        it ("expires keys in the correct order", function (done) {
            var timeCache = new ChainCache (SHORT_TIME, 100);

            var feedChain = [
                'able', 'baker', 'charlie', 'dog', 'easy', 'fox', 'george', 'how', 'item', 'jig', 'king'
            ];
            var testChain = [];
            var finished;

            // feeder
            process.nextTick (function feed(){
                if (finished) return;
                if (!feedChain.length) {
                    finished = true;
                    return done (new Error ('failed to expire a key'));
                }

                var word = feedChain.shift();
                timeCache.set (word, 'FOO BAR BAZ');
                testChain.push (word);
                setTimeout (feed, SHORT_TIME / 4);
            });

            // consumer
            var cyclesRemaining = 10;
            setTimeout (function consume(){
                if (finished) return;

                // the testChain MUST lead with at least one undefined key
                // once a defined key is found, all subsequent keys must be defined
                var defined = false;
                var deleted = 0;
                for (var i=0,j=testChain.length; i<j; i++)
                    if (!defined)
                        if (timeCache.get (testChain[i]))
                            if (!i) {
                                // cannot lead with a defined key
                                finished = true;
                                return done (new Error ('failed to expire a key'));
                            } else
                                defined = true
                        else
                            deleted++;
                    else if (!timeCache.get (testChain[i])) {
                        finished = true;
                        return done (new Error ('keys expired in the wrong order'));
                    }

                // move deleted keys from testChain to feedChain
                feedChain.push.apply (feedChain, testChain.splice (0, deleted).reverse());

                if (!--cyclesRemaining) {
                    finished = true;
                    return done();
                }
                setTimeout (consume, SHORT_TIME);
            }, SHORT_TIME * 1.5);
        });

        it ("expires keys in the correct order when they are randomly renewed", function (done) {
            var timeCache = new ChainCache (SHORT_TIME, 100);

            var feedChain = [
                'able', 'baker', 'charlie', 'dog', 'easy', 'fox', 'george', 'how', 'item', 'jig',
                'king', 'love', 'mike', 'nan', 'oboe', 'peter', 'queen', 'roger', 'sugar', 'tare'
            ];
            var testChain = [];
            var finished;

            // feeder
            process.nextTick (function feed(){
                if (finished) return;
                if (!feedChain.length) {
                    finished = true;
                    return done (new Error ('failed to expire a key'));
                }

                var word = feedChain.shift();
                timeCache.set (word, 'FOO BAR BAZ');
                testChain.push (word);
                setTimeout (feed, SHORT_TIME / 4);
            });

            // consumer
            var cyclesRemaining = 10;
            setTimeout (function consume(){
                if (finished) return;

                // the testChain MUST lead with at least one undefined key
                // once a defined key is found, all subsequent keys must be defined
                var defined = false;
                var deleted = 0;
                for (var i=0,j=testChain.length; i<j; i++)
                    if (!defined)
                        if (timeCache.get (testChain[i]))
                            if (i)
                                defined = true
                            else {
                                // cannot lead with a defined key
                                finished = true;
                                return done (new Error ('failed to expire a key'));
                            }
                        else
                            deleted++;
                    else if (!timeCache.get (testChain[i])) {
                        finished = true;
                        return done (new Error ('keys expired in the wrong order'));
                    }

                // move deleted keys from testChain to feedChain
                feedChain.push.apply (feedChain, testChain.splice (0, deleted).reverse());

                // select a random defined key to renew
                if (testChain.length) {
                    var randi = Math.floor (Math.random() * testChain.length);
                    timeCache.set (testChain[randi], 'FOO BAR BAZ');
                    testChain.push (testChain.splice (randi, 1)[0]);
                }

                if (!--cyclesRemaining) {
                    finished = true;
                    return done();
                }
                setTimeout (consume, SHORT_TIME);
            }, SHORT_TIME * 1.5);
        });

        it ("fills completely and expires fully multiple times without errors", function (done) {
            var testCache = new ChainCache (SHORT_TIME, 3);
            testCache.set ('able', 'ABLE');
            testCache.set ('baker', 'BAKER');
            testCache.set ('charlie', 'CHARLIE');

            try {
                assert (testCache.get ('able') === 'ABLE', 'filled correctly');
                assert (testCache.get ('baker') === 'BAKER', 'filled correctly');
                assert (testCache.get ('charlie') === 'CHARLIE', 'filled correctly');
            } catch (err) {
                return done (err);
            }
            setTimeout (function(){
                try {
                    assert (testCache.get ('able') === undefined, 'emptied correctly');
                    assert (testCache.get ('baker') === undefined, 'emptied correctly');
                    assert (testCache.get ('charlie') === undefined, 'emptied correctly');

                    testCache.set ('able', 'ABLE');
                    testCache.set ('baker', 'BAKER');
                    testCache.set ('charlie', 'CHARLIE');

                    assert (testCache.get ('able') === 'ABLE', 'refilled correctly');
                    assert (testCache.get ('baker') === 'BAKER', 'refilled correctly');
                    assert (testCache.get ('charlie') === 'CHARLIE', 'refilled correctly');
                } catch (err) {
                    return done (err);
                }

                setTimeout (function(){
                    try {
                        assert (testCache.get ('able') === undefined, 're-emptied correctly');
                        assert (testCache.get ('baker') === undefined, 're-emptied correctly');
                        assert (testCache.get ('charlie') === undefined, 're-emptied correctly');

                        testCache.set ('able', 'ABLE');
                        testCache.set ('baker', 'BAKER');
                        testCache.set ('charlie', 'CHARLIE');

                        assert (testCache.get ('able') === 'ABLE', 're-refilled correctly');
                        assert (testCache.get ('baker') === 'BAKER', 're-refilled correctly');
                        assert (testCache.get ('charlie') === 'CHARLIE', 're-refilled correctly');
                    } catch (err) {
                        return done (err);
                    }

                    done();
                }, 1.1 * SHORT_TIME);
            }, 1.1 * SHORT_TIME);
        });
    });
});
