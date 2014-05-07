/*
Author: Suhail Ansari
                _        _____          _ 
     /\        | |      |  __ \        | |
    /  \  _   _| |_ ___ | |__) |___  __| |
   / /\ \| | | | __/ _ \|  _  // _ \/ _` |
  / ____ \ |_| | || (_) | | \ \  __/ (_| |
 /_/    \_\__,_|\__\___/|_|  \_\___|\__,_|
                                          
A simple node autocomplete engine using redis

dependencies: 
    1. node_redis : npm install node_redis
    2. hiredis: npm install hiredis

Based on algorithm in this article : http://patshaughnessy.net/2011/11/29/two-ways-of-using-redis-to-build-a-nosql-autocomplete-search-index
original algorithm used in a ruby gem soulmate(https://github.com/seatgeek/soulmate)

*/

var AutoRed = function (port, host, opts) {

    //helper function to determine if n is integer//
    function isInt(n) {
        return n % 1 === 0;
    }

    //load node_redis
    var redis = require('redis');

    //connects to localhost:6379
    var client = redis.createClient(port, host, opts);

    //clear all data in redis
    this.flushall = function () {
        client.flushall();
    }

    /*add data item to redis for creating search index and for retreiving data later
    sample data looks like this
        
        {
            "id": 1,                     // (int )unique id for indexing 
            "term": "google search",     // (string) search keywords seperated by a space
            "category": "search-engines",// (string) category for indexing deafults to 'default',
            "score": 49,                 // (int) score for sorting succesful matches by score, defaults to 0 (redis stores these sorted by binary value)
            "data" : {                   // (json) the data that would be returned on success math of keywords in "term"
                "url": "http://google.com",
                "str": "Google Search"
            }
        };

    */
    this.addItem = function (item) {

        //check category, if not then set to 'default'
        if (!item.category) {
            item.category = 'default';
        }

        //check score, if not then set to 0
        if (!item.score || !isInt(item.score)) {
            item.score = 0
        }

        //check if the 'data' field is a valid json, may change in the future
        if (typeof item.data != 'string') {

            try {

                console.log(item.data);
                var data = JSON.stringify(item.data);

            } catch (err) {

                //throw new Error("invalid json data in data field. Either put in valid json string or valid json object");
                return false;
            }

        } else {

            try {

                JSON.parse(item.data);
                var data = item.data;

            } catch (err) {

                //throw new Error("invalid json data in data field. Either put in valid json string or valid json object");
                return false;
            }
        }

        //store in the redis hash-set by name->'autored-data:category', key->'id', value->'data'
        client.hset([('autored-data:' + item.category), item.id, data], function (err, response) {
            if (err) {
                throw err;
            } else {
                //nothing
            }
        });

        //build index//
        buildIndex(item.term.toLowerCase(), item.id, item.category, item.score);
        return true;
    }


    /* Build index for search
       1. seperate words in searchTerm
       2. create index for by dividing the word from length 2 to word.length.
            eg: word 'google' will generate indices ['go', 'goo', 'goog', 'googl', 'google']
       3. now create seach index by storing a sorted set in redis with 'id' of the search item (for retreival from hash-set)
          eg: for the sample data above, seach index will look like 
                
                "autored-index":"category":"search-index"  score id
                autored-index:search-engines:go            49    1
                autored-index:search-engines:goo           49    1
                autored-index:search-engines:goog          49    1
                autored-index:search-engines:googl         49    1
                autored-index:search-engines:google        49    1

                and so on with word "search"

    */
    var buildIndex = function (searchTerm, searchItemId, category, score) {

        var allWordsRegEx = new RegExp('\\b([a-zA-Z]{2}[a-zA-Z]*)\\b', 'g');

        var words = searchTerm.match(allWordsRegEx);
        console.log(words);
        for (word in words) {

            var searchIndices = generateIndices(words[word]);
            console.log(searchIndices);
            for (index in searchIndices) {
                client.zadd(['autored-index:' + category + ':' + searchIndices[index], score, searchItemId], function (err, response) {
                    if (err) {
                        throw err;
                    } else {
                        //
                    }
                });
            }

        }

    }


    /*
        generates indices for function buildIndex
        eg: word 'google' will generate indices ['go', 'goo', 'goog', 'googl', 'google']
    */
    var generateIndices = function (word) {
        console.log(word);
        console.log(word.length);
        if (word.length === 0 || word.length === 1) {
            return null;
        } else {
            var indices = [];
            for (var i = 2; i <= word.length; i++) {
                indices.push(word.substr(0, i));
            }
            //indices.push(word + "*");
            return indices;
        }
    }

    /*
        searches redis and return the autocomplete options
        eg: for search term "go"
        it will get the search index "autored-index:search-engines:go" and will get the value [1] (i.e the id)
        and we will then retreive the od from "autored-data:serach-engines" hash set and get the relevant autocomplete values

    */
    this.search = function (term, category, cb) {
        if (!category) {
            category = 'default';
        }
        

        //if no search term provided.
        if(!term || typeof term != 'string'){
            
            var err = new Error();
            err.name = 'InvalidSearchTermError';
            err.message = 'invalid search term provided';
            cb(err);
            return;
        }

        //split the search term in words.
        term = term.trim();
        term = term.toLowerCase();

        if(term.length == 1){
            cb(null, []);
            return;
        }

        var allWordsRegEx = new RegExp('\\b([a-zA-Z]{2}[a-zA-Z]*)\\b', 'g');
        var terms = term.match(allWordsRegEx);

        //return empty results if no valid search words in term
        if (terms.length === 0) {
            cb(null, []);
            return

        //for one term, return the data associated with the ids for this search-index
        } else if (terms.length === 1) {

            this.searchOne(category, term.trim(), cb);

        //tricky; check if the search results in the cache exists
        //if not, then calculate the intersection of 
        } else {

            this.searchMultiple(category, terms, cb);
        }


    }

    this.searchOne = function (category, term, cb) {

        //get the ids from the search-index 
        client.zrange([('autored-index:' + category + ':' + term), 0, -1], function (err, zrangeres) {
            if (err) {

                cb(err);

            } else {

                if (zrangeres.length > 0) {

                    //get the data from the hash set//
                    client.hmget([('autored-data:' + category)].concat(zrangeres), function (err, searchres) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, searchres);
                        }
                    });

                } else {
                    cb(null, []);
                }
            }
        });

    }

    this.searchMultiple = function (category, terms, cb) {

        var cacheQuery = [('autored-index:' + category + ':' + terms.join('|')), 0, -1];

        //get the data from cache, query would look like zrange autored-index:category:go|se 0 -1
        client.zrange(cacheQuery, function (err, cacheres) {
            if (err) {

                cb(err);
            } else {

                //if data in cache get the values from hash set and return them
                if (cacheres.length > 0) {
                    client.hmget([('autored-data:' + category)].concat(cacheres), function (err, cachedatares) {
                        if (err) {
                            cb(err);
                        } else {
                            //console.log('#1')
                            cb(null, cachedatares);
                        }
                    });

                // else calculate intersection between search indices of each search term and get the common id values
                // then get the values from hash-set and return the search results
                // also store the value in cache for quick retreival for 10 mins
                } else {
                    var newIntersectionQuery = [('autored-index:' + category + ':' + terms.join('|')), terms.length]
                        
                        .concat(terms.map(function (i) {
                            return ('autored-index:' + category + ':' + i)
                        }));
                        
                    //calculate and store intersection
                    client.zinterstore(newIntersectionQuery, function (err, zinterres) {
                        if (err) {
                            cb(err);

                        } else {

                            //get results from the intersection key
                            client.zrange([('autored-index:' + category + ':' + terms.join('|')), 0, -1], function (err, zrangeres) {

                                if (err) { //#

                                    cb(err);

                                } else if(zrangeres.length > 0){ //#

                                    //get the data from hash-set
                                    client.hmget([('autored-data:' + category)].concat(zrangeres), function (err, hmgetres) {

                                        if (err) {

                                            cb(err);

                                        } else {

                                            //console.log('#2')
                                            //return the data from hash set
                                            cb(null, hmgetres);

                                            //set the cache expiry to 10 mins
                                            client.expire([('autored-index:' + category + ':' + terms.join('|')), 6000], function (err, expireres) {
                                                return;
                                            });
                                        }
                                    });//client.hmget//
                                
                                } else{ //#
                                    
                                    //even interesection has no results, so return empty array.
                                    cb(null, []);
                                }
                            });//client.zrange//
                        }
                    });//client.zinterstore//
                }
            }
        });//client.zrange//
    }
}


module.exports = AutoRed;
