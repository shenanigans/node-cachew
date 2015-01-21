
var DocumentChainCache = require ('../main').DocumentChainCache;
var assert = require ('assert');

var LONG_TIME = 10000;
var SHORT_TIME = 50;

describe ("DocumentChainCache", function(){
    describe ("CRUD", function(){
        var testCache;
        var able    = { alfa:'able',    bravo:'able'    };
        var baker   = { alfa:'baker',   bravo:'baker'   };
        var charlie = { alfa:'charlie', bravo:'charlie' };
        var dog     = { alfa:'dog',     bravo:'dog'     };
        var easy    = { alfa:'easy',    bravo:'easy'    };

        describe ("Create", function(){
            it ("creates a new cache", function(){
                testCache = new DocumentChainCache ([ 'alfa', 'bravo' ]);
            });
            it ("adds values to the cache", function(){
                testCache.set (able);
                testCache.set (baker);
                testCache.set (charlie);
                testCache.set (dog);
                testCache.set (easy);
            });
        });
        describe ("Read", function(){
            it ("reads the correct values from the cache", function(){
                assert (testCache.get ('alfa', 'easy') === easy, 'read ok');
                assert (testCache.get ('bravo', 'easy') === easy, 'read ok');
                assert (testCache.get ('alfa', 'dog') === dog, 'read ok');
                assert (testCache.get ('bravo', 'dog') === dog, 'read ok');
                assert (testCache.get ('alfa', 'baker') === baker, 'read ok');
                assert (testCache.get ('bravo', 'baker') === baker, 'read ok');
                assert (testCache.get ('alfa', 'charlie') === charlie, 'read ok');
                assert (testCache.get ('bravo', 'charlie') === charlie, 'read ok');
                assert (testCache.get ('alfa', 'able') === able, 'read ok');
                assert (testCache.get ('bravo', 'able') === able, 'read ok');
            });
            it ("reads undefined for unknown keys", function(){
                assert (
                    testCache.get ('alfa', 'Charlie Chaplin') === undefined,
                    'unknown ok'
                );
                assert (
                    testCache.get ('bravo', '"Dog" The Bounty Hunter') === undefined,
                    'unknown ok'
                );
            });
        });
        describe ("Update", function(){
            var fox    = { alfa:'charlie', bravo:'yoke' };
            var george = { alfa:'zebra',   bravo:'dog'  };

            it ("overwrites a record by key", function(){
                testCache.set (fox);
                assert (testCache.get ('alfa', 'charlie') === fox, 'overwrite ok');
                assert (testCache.get ('bravo', 'yoke') === fox, 'overwrite ok');
                testCache.set (george);
                assert (testCache.get ('alfa', 'zebra') === george, 'overwrite ok');
                assert (testCache.get ('bravo', 'dog') === george, 'overwrite ok');
            });
            it ("clears the overwritten record fully", function(){
                var indigo = { alfa:'indigo', bravo:'indigo' };
                var jig    = { alfa:'indigo' };
                testCache.set (indigo);
                testCache.set (jig);
                assert (testCache.get ('alfa', 'indigo') === jig, 'overwrite ok');
                assert (testCache.get ('bravo', 'indigo') === undefined, 'fully cleared');
            });
        });
        describe ("Delete", function(){
            it ("deletes values associated with keys", function(){
                testCache.drop ('bravo', 'baker');
                testCache.drop ('alfa', 'charlie');
                testCache.drop ('bravo', 'dog');
            });
            it ("does nothing when an unknown key is deleted", function(){
                testCache.drop ('alfa', 'James Steed');
                testCache.drop ('bravo', 'Roger St. Hammond');
                testCache.drop ('alfa', 'Jason Clarkson');
            });
            it ("reads undefined for deleted keys", function(){
                assert (testCache.get ('bravo', 'dog') === undefined, 'deleted ok');
                assert (testCache.get ('bravo', 'baker') === undefined, 'deleted ok');
                assert (testCache.get ('alfa', 'charlie') === undefined, 'deleted ok');
            });
            it ("still has all the keys that weren't deleted", function(){
                assert (testCache.get ('alfa', 'able') === able, 'still ok');
                assert (testCache.get ('bravo', 'easy') === easy, 'still ok');
            });
        });
    });

    describe ("overflows", function(){
        var smallCache;
        var largeCache;
        var able    = { alfa:'able',    bravo:'able'    };
        var baker   = { alfa:'baker',   bravo:'baker'   };
        var charlie = { alfa:'charlie', bravo:'charlie' };
        var dog     = { alfa:'dog',     bravo:'dog'     };
        var easy    = { alfa:'easy',    bravo:'easy'    };

        it ("instantiates caches with maximum length", function(){
            smallCache = new DocumentChainCache ([ 'alfa', 'bravo' ], LONG_TIME, 3);
            largeCache = new DocumentChainCache ([ 'alfa', 'bravo' ], LONG_TIME, 5);
        });
        it ("writes and reads back sub-maximum numbers of keys normally", function(){
            smallCache.set (able);
            smallCache.set (baker);
            largeCache.set (able);
            largeCache.set (baker);
            largeCache.set (charlie);
            largeCache.set (dog);

            assert (smallCache.get ('alfa', 'able') === able, 'read ok');
            assert (smallCache.get ('bravo', 'able') === able, 'read ok');
            assert (smallCache.get ('alfa', 'baker') === baker, 'read ok');
            assert (smallCache.get ('bravo', 'baker') === baker, 'read ok');

            assert (largeCache.get ('alfa', 'able') === able, 'read ok');
            assert (largeCache.get ('bravo', 'able') === able, 'read ok');
            assert (largeCache.get ('alfa', 'baker') === baker, 'read ok');
            assert (largeCache.get ('bravo', 'baker') === baker, 'read ok');
            assert (largeCache.get ('alfa', 'charlie') === charlie, 'read ok');
            assert (largeCache.get ('bravo', 'charlie') === charlie, 'read ok');
            assert (largeCache.get ('alfa', 'dog') === dog, 'read ok');
            assert (largeCache.get ('bravo', 'dog') === dog, 'read ok');
        });

        describe ("simple overflow", function(){
            it ("does not overflow when max is only reached", function(){
                smallCache.set (charlie);
                largeCache.set (easy);

                assert (smallCache.get ('alfa', 'able') === able, 'read ok');
                assert (smallCache.get ('bravo', 'able') === able, 'read ok');
                assert (smallCache.get ('alfa', 'baker') === baker, 'read ok');
                assert (smallCache.get ('bravo', 'baker') === baker, 'read ok');
                assert (smallCache.get ('alfa', 'charlie') === charlie, 'read ok');
                assert (smallCache.get ('bravo', 'charlie') === charlie, 'read ok');
                assert (largeCache.get ('alfa', 'able') === able, 'read ok');
                assert (largeCache.get ('bravo', 'able') === able, 'read ok');
                assert (largeCache.get ('alfa', 'baker') === baker, 'read ok');
                assert (largeCache.get ('bravo', 'baker') === baker, 'read ok');
                assert (largeCache.get ('alfa', 'charlie') === charlie, 'read ok');
                assert (largeCache.get ('bravo', 'charlie') === charlie, 'read ok');
                assert (largeCache.get ('alfa', 'dog') === dog, 'read ok');
                assert (largeCache.get ('bravo', 'dog') === dog, 'read ok');
                assert (largeCache.get ('alfa', 'easy') === easy, 'read ok');
                assert (largeCache.get ('bravo', 'easy') === easy, 'read ok');
            });
            it ("overflows in correct order", function(){
                var xray = { alfa:'xray', bravo:'xray' };
                smallCache.set (xray);
                assert (smallCache.get ('alfa', 'able') === undefined, 'overflow ok');
                assert (smallCache.get ('bravo', 'able') === undefined, 'overflow ok');
                largeCache.set (xray);
                assert (largeCache.get ('alfa', 'able') === undefined, 'overflow ok');
                assert (largeCache.get ('bravo', 'able') === undefined, 'overflow ok');

                var yoke = { alfa:'yoke', bravo:'yoke' };
                smallCache.set (yoke);
                assert (smallCache.get ('alfa', 'baker') === undefined, 'overflow ok');
                assert (smallCache.get ('bravo', 'baker') === undefined, 'overflow ok');
                largeCache.set (yoke);
                assert (largeCache.get ('alfa', 'baker') === undefined, 'overflow ok');
                assert (largeCache.get ('bravo', 'baker') === undefined, 'overflow ok');

                var zebra = { alfa:'zebra', bravo:'zebra' };
                smallCache.set (zebra);
                assert (smallCache.get ('alfa', 'charlie') === undefined, 'overflow ok');
                assert (smallCache.get ('bravo', 'charlie') === undefined, 'overflow ok');
                largeCache.set (zebra);
                assert (largeCache.get ('alfa', 'charlie') === undefined, 'overflow ok');
                assert (largeCache.get ('bravo', 'charlie') === undefined, 'overflow ok');
            });
        });
    });

    describe ("timeouts", function(){
        it ("expires keys in the correct order", function (done) {
            var timeCache = new DocumentChainCache ([ 'alfa', 'bravo' ], SHORT_TIME, 100);

            var feedChain = [
                'able', 'baker', 'charlie', 'dog', 'easy', 'fox', 'george', 'how', 'item', 'jig',
                'king', 'love', 'mike', 'nan', 'oboe', 'peter', 'queen', 'roger', 'sugar', 'tare'
            ];
            for (var i in feedChain) feedChain[i] = { alfa:feedChain[i], bravo:feedChain[i] };
            var testChain = [];
            var finished;

            // feeder
            process.nextTick (function feed(){
                if (finished) return;
                if (!feedChain.length) {
                    finished = true;
                    return done (new Error ('failed to expire a key'));
                }

                var doc = feedChain.shift();
                timeCache.set (doc);
                testChain.push (doc);
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
                        if (timeCache.get ('alfa', testChain[i].alfa))
                            if (!i) {
                                // cannot lead with a defined key
                                finished = true;
                                return done (new Error ('failed to expire a key'));
                            } else
                                defined = true
                        else
                            deleted++;
                    else if (!timeCache.get ('alfa', testChain[i].alfa)) {
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

        it ("expires keys in the correct order when they are randomly overwritten", function (done) {
            var timeCache = new DocumentChainCache ([ 'alfa', 'bravo' ], SHORT_TIME, 100);

            var feedChain = [
                'able', 'baker', 'charlie', 'dog', 'easy', 'fox', 'george', 'how', 'item', 'jig',
                'king', 'love', 'mike', 'nan', 'oboe', 'peter', 'queen', 'roger', 'sugar', 'tare'
            ];
            for (var i in feedChain) feedChain[i] = { alfa:feedChain[i], bravo:feedChain[i] };
            var testChain = [];
            var finished;

            // feeder
            process.nextTick (function feed(){
                if (finished) return;
                if (!feedChain.length) {
                    finished = true;
                    return done (new Error ('failed to expire a key'));
                }

                var doc = feedChain.shift();
                timeCache.set (doc);
                testChain.push (doc);
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
                        if (timeCache.get ('alfa', testChain[i].alfa))
                            if (i)
                                defined = true
                            else {
                                // cannot lead with a defined key
                                finished = true;
                                return done (new Error ('failed to expire a key'));
                            }
                        else
                            deleted++;
                    else if (!timeCache.get ('alfa', testChain[i].alfa)) {
                        finished = true;
                        return done (new Error ('keys expired in the wrong order'));
                    }

                // move deleted keys from testChain to feedChain
                feedChain.push.apply (feedChain, testChain.splice (0, deleted).reverse());

                // select a random defined key to renew
                if (testChain.length) {
                    var randi = Math.floor (Math.random() * testChain.length);
                    timeCache.set (testChain[randi]);
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
            var timeCache = new DocumentChainCache ([ 'alfa', 'bravo' ], SHORT_TIME, 3);
            var able    = { alfa:'able',    bravo:'able'    };
            var baker   = { alfa:'baker',   bravo:'baker'   };
            var charlie = { alfa:'charlie', bravo:'charlie' };
            timeCache.set (able);
            timeCache.set (baker);
            timeCache.set (charlie);

            try {
                assert (timeCache.get ('alfa', 'able') === able, 'filled correctly');
                assert (timeCache.get ('alfa', 'baker') === baker, 'filled correctly');
                assert (timeCache.get ('alfa', 'charlie') === charlie, 'filled correctly');
            } catch (err) {
                return done (err);
            }
            setTimeout (function(){
                try {
                    assert (timeCache.get ('alfa', 'able') === undefined, 'emptied correctly');
                    assert (timeCache.get ('alfa', 'baker') === undefined, 'emptied correctly');
                    assert (timeCache.get ('alfa', 'charlie') === undefined, 'emptied correctly');

                    timeCache.set (able);
                    timeCache.set (baker);
                    timeCache.set (charlie);

                    assert (timeCache.get ('alfa', 'able') === able, 'refilled correctly');
                    assert (timeCache.get ('alfa', 'baker') === baker, 'refilled correctly');
                    assert (timeCache.get ('alfa', 'charlie') === charlie, 'refilled correctly');
                } catch (err) {
                    return done (err);
                }

                setTimeout (function(){
                    try {
                        assert (timeCache.get ('alfa', 'able') === undefined, 're-emptied correctly');
                        assert (timeCache.get ('alfa', 'baker') === undefined, 're-emptied correctly');
                        assert (timeCache.get ('alfa', 'charlie') === undefined, 're-emptied correctly');

                        timeCache.set (able);
                        timeCache.set (baker);
                        timeCache.set (charlie);

                        assert (timeCache.get ('alfa', 'able') === able, 're-refilled correctly');
                        assert (timeCache.get ('alfa', 'baker') === baker, 're-refilled correctly');
                        assert (timeCache.get ('alfa', 'charlie') === charlie, 're-refilled correctly');
                    } catch (err) {
                        return done (err);
                    }

                    done();
                }, 1.1 * SHORT_TIME);
            }, 1.1 * SHORT_TIME);
        });
    });
});
