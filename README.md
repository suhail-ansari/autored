#AutoRed

A simple autocomplete engine for nodejs using redis

###Usage
	
	var AutoRed = require('autored');
	var autored = new AutoRed();
	//var autored = new Autored(port, host, options);
	//same as redis.createClient in node_redis

	var item1 = {
		"id": 1,
		"term": "google search",
		"category": "search-engines", //optional defaults to 'default'
		"data" :{
			"url": "http://google.com",
			"str": "Google Search"
		}
	}

	var item2 = {
		"id": 2,
		"term": "bing search",
		"category": "search-engines",
		"data" :{
			"url": "http://bing.com",
			"str": "Bing Search"
		}
	}

	var item1 = {
		"id": 3,
		"term": "Duck go search",
		"category": "search-engines",
		"data" :{
			"url": "http://duckduckgo.com",
			"str": "Duck Duck Go Search"
		}
	}

	autored.addItem(item1);
	autored.addItem(item2);
	autored.addItem(item3);

	
	//autored.search('search term', 'category', callback),
	
	//for default category autored.search('search term', '', callback)
	
	autored.search('go', 'search-engine', function(err, res){
		if(err){
			throw err;
		}else{
			console.log(res);
		}
	});

	/*	
		result: 
		[{ "url": "http://google.com", "str": "Google Search"},
		 { "url": "http://duckduckgo.com", "str": "Duck Duck Go Search"}]
	*/

	
	autored.search('go se', 'search-engine', function(err, res){
		if(err){
			throw err;
		}else{
			console.log(res);
		}
	});	

	/*	
		result: 
		[{ "url": "http://google.com", "str": "Google Search"},
		 { "url": "http://duckduckgo.com", "str": "Duck Duck Go Search"}]
	*/

	
	
	autored.search('sear', 'search-engine', function(err, res){
		if(err){
			throw err;
		}else{
			console.log(res);
		}
	});	

	/*	
		result: 
		[{ "url": "http://google.com", "str": "Google Search"},
		 { "url": "http://duckduckgo.com", "str": "Duck Duck Go Search"},
		 { "url": "http://bing.com", "str": "Bing Search"}]
	*/

	
	autored.search('bin', 'search-engine', function(err, res){
		if(err){
			throw err;
		}else{
			console.log(res);
		}
	});		

	/*	
		result: 
		[{ "url": "http://bing.com", "str": "Bing Search"}]
	*/

###Dependencies

 * [node_redis](https://github.com/mranney/node_redis): npm install redis
 * [hiredis](https://www.npmjs.org/package/hiredis‎): npm install hiredis


###TODO
 
 * ~~cache queries~~
 * ~~multiple word search~~
 * add actual tests.
 * think of new features.
 * upload to npm.

###Credits

 * [@pat_shaughnessy](https://twitter.com/pat_shaughnessy) for his [article](http://patshaughnessy.net/2011/11/29/two-ways-of-using-redis-to-build-a-nosql-autocomplete-search-index).
 * [Soulmate](https://github.com/seatgeek/soulmate) for the algorithm.
