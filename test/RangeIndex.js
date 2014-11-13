
var RangeIndex = require ('../main').RangeIndex;
var assert = require ('assert');
var async = require ('async');
var stats = require ('statsjs');

describe ("RangeIndex", function(){
    describe ("basic CRUD", function(){
        var testIndex;
        var clippedIndex;
        it ("instantiates a new index", function(){
            testIndex = new RangeIndex();
        });
        it ("sets values in the index", function(){
            testIndex.set (1, 'able');
            testIndex.set (2, 'baker');
            testIndex.set (3, 'charlie');
            testIndex.set (4, 'dog');
            testIndex.set (5, 'easy');
            testIndex.set (6, 'fox');
            testIndex.set (7, 'george');
        });
        it ("reads values by exact index", function(){
            assert (testIndex.get (1) === 'able', 'value set correctly');
            assert (testIndex.get (2) === 'baker', 'value set correctly');
            assert (testIndex.get (3) === 'charlie', 'value set correctly');
            assert (testIndex.get (4) === 'dog', 'value set correctly');
            assert (testIndex.get (5) === 'easy', 'value set correctly');
            assert (testIndex.get (6) === 'fox', 'value set correctly');
            assert (testIndex.get (7) === 'george', 'value set correctly');
        });
        it ("sets new values and confirms them by exact index", function(){
            testIndex.set (1, 'ABLE');
            testIndex.set (2, 'BAKER');
            testIndex.set (3, 'CHARLIE');
            testIndex.set (4, 'DOG');
            testIndex.set (5, 'EASY');
            testIndex.set (6, 'FOX');
            testIndex.set (7, 'GEORGE');
            assert (testIndex.get (1) === 'ABLE', 'value set correctly');
            assert (testIndex.get (2) === 'BAKER', 'value set correctly');
            assert (testIndex.get (3) === 'CHARLIE', 'value set correctly');
            assert (testIndex.get (4) === 'DOG', 'value set correctly');
            assert (testIndex.get (5) === 'EASY', 'value set correctly');
            assert (testIndex.get (6) === 'FOX', 'value set correctly');
            assert (testIndex.get (7) === 'GEORGE', 'value set correctly');
        });
        it ("deletes values", function(){
            testIndex.drop (3);
            testIndex.drop (5);
            testIndex.drop (6);
        });
        it ("returns undefined for deleted values", function(){
            assert (testIndex.get (3) === undefined, 'value was deleted');
            assert (testIndex.get (5) === undefined, 'value was deleted');
            assert (testIndex.get (6) === undefined, 'value was deleted');
        });
        it ("does nothing when deleting unset indices", function(){
            testIndex.drop (9);
            testIndex.drop (5.5);
            testIndex.drop (-1);
        });
        it ("still has all values that weren't deleted", function(){
            assert (testIndex.get (1) === 'ABLE', 'value set correctly');
            assert (testIndex.get (2) === 'BAKER', 'value set correctly');
            assert (testIndex.get (4) === 'DOG', 'value set correctly');
            assert (testIndex.get (7) === 'GEORGE', 'value set correctly');
        });
    });

    describe ("getNearest", function(){
        var testIndex = new RangeIndex();
        testIndex.set (0, 'zebra');
        testIndex.set (10, 'able');
        testIndex.set (20, 'baker');
        testIndex.set (30, 'charlie');
        testIndex.set (40, 'dog');
        testIndex.set (50, 'easy');
        testIndex.set (60, 'fox');
        testIndex.set (70, 'george');

        it ("gets the nearest single value", function(){
            assert (testIndex.getNearest (7, 1)[0]  === 'able', 'selected correctly');
            assert (testIndex.getNearest (67, 1)[0] === 'george', 'selected correctly');
            assert (testIndex.getNearest (33, 1)[0] === 'charlie', 'selected correctly');
            assert (testIndex.getNearest (0, 1)[0]  === 'zebra', 'selected correctly');
        });
        it ("gets the nearest odd number of values", function(){
            var group = testIndex.getNearest (17, 4);
            assert (group[0]  === 'baker', 'selected correctly');
            assert (group[1]  === 'able', 'selected correctly');
            assert (group[2]  === 'charlie', 'selected correctly');
            var group = testIndex.getNearest (50, 4);
            assert (group[0] === 'easy', 'selected correctly');
            assert (group[1] === 'fox', 'selected correctly');
            assert (group[2] === 'dog', 'selected correctly');
        });
        it ("gets the nearest even number of values", function(){
            var group = testIndex.getNearest (17, 4);
            assert (group[0]  === 'baker', 'selected correctly');
            assert (group[1]  === 'able', 'selected correctly');
            assert (group[2]  === 'charlie', 'selected correctly');
            assert (group[3]  === 'zebra', 'selected correctly');
            var group = testIndex.getNearest (50, 4);
            assert (group[0] === 'easy', 'selected correctly');
            assert (group[1] === 'fox', 'selected correctly');
            assert (group[2] === 'dog', 'selected correctly');
            assert (group[3] === 'george', 'selected correctly');
        });
    });

    describe ("getNearestAbove", function(){
        var testIndex = new RangeIndex();
        testIndex.set (0, 'zebra');
        testIndex.set (10, 'able');
        testIndex.set (20, 'baker');
        testIndex.set (30, 'charlie');
        testIndex.set (40, 'dog');
        testIndex.set (50, 'easy');
        testIndex.set (60, 'fox');
        testIndex.set (70, 'george');

        it ("gets the nearest values above a value", function(){
            var group = testIndex.getNearestAbove (13, 4);
            assert (group[0] === 'baker', 'selected correctly');
            assert (group[1] === 'charlie', 'selected correctly');
            assert (group[2] === 'dog', 'selected correctly');
            assert (group[3] === 'easy', 'selected correctly');
            var group = testIndex.getNearestAbove (40, 4);
            assert (group[0] === 'dog', 'selected correctly');
            assert (group[1] === 'easy', 'selected correctly');
            assert (group[2] === 'fox', 'selected correctly');
            assert (group[3] === 'george', 'selected correctly');
        });
    });

    describe ("getNearestBelow", function(){
        var testIndex = new RangeIndex();
        testIndex.set (0, 'zebra');
        testIndex.set (10, 'able');
        testIndex.set (20, 'baker');
        testIndex.set (30, 'charlie');
        testIndex.set (40, 'dog');
        testIndex.set (50, 'easy');
        testIndex.set (60, 'fox');
        testIndex.set (70, 'george');

        it ("gets the nearest values below a value", function(){
            var group = testIndex.getNearestBelow (99, 3);
            assert (group[0]  === 'george', 'selected correctly');
            assert (group[1]  === 'fox', 'selected correctly');
            assert (group[2]  === 'easy', 'selected correctly');
            var group = testIndex.getNearestBelow (41, 3);
            assert (group[0] === 'dog', 'selected correctly');
            assert (group[1] === 'charlie', 'selected correctly');
            assert (group[2] === 'baker', 'selected correctly');
            var group = testIndex.getNearestBelow (39, 3);
            assert (group[0] === 'charlie', 'selected correctly');
            assert (group[1] === 'baker', 'selected correctly');
            assert (group[2] === 'able', 'selected correctly');
        });
    });

    describe ("getBest", function(){
        var testIndex = new RangeIndex();
        testIndex.set (0, 'zebra');
        testIndex.set (10, 'able');
        testIndex.set (20, 'baker');
        testIndex.set (30, 'charlie');
        testIndex.set (40, 'dog');
        testIndex.set (50, 'easy');
        testIndex.set (60, 'fox');
        testIndex.set (70, 'george');

        it ("gets the best value", function(){
            assert (testIndex.getBest (17) === 'baker', 'selected correctly');
            assert (testIndex.getBest (20) === 'baker', 'selected correctly');
            assert (testIndex.getBest (11) === 'able', 'selected correctly');
            assert (testIndex.getBest (5) === 'able', 'selected correctly');
            assert (testIndex.getBest (4) === 'zebra', 'selected correctly');
        });
    });

    describe ("getRange", function(){
        var testIndex = new RangeIndex();
        testIndex.set (0, 'zebra');
        testIndex.set (10, 'able');
        testIndex.set (20, 'baker');
        testIndex.set (30, 'charlie');
        testIndex.set (40, 'dog');
        testIndex.set (50, 'easy');
        testIndex.set (60, 'fox');
        testIndex.set (70, 'george');

        it ("selects index ranges", function(){
            var group = testIndex.getRange (40, 50);
            assert (group[0]  === 'dog', 'selected correctly');
            assert (group[1]  === 'easy', 'selected correctly');
            assert (group.length === 2, 'did not select extra');
            var group = testIndex.getRange (11, 21);
            assert (group[0] === 'baker', 'selected correctly');
            assert (group.length === 1, 'did not select extra');
            var group = testIndex.getRange (-10, 17);
            assert (group[0] === 'zebra', 'selected correctly');
            assert (group[1] === 'able', 'selected correctly');
            assert (group.length === 2, 'did not select extra');
        });
    });
});
