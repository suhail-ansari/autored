var Autored = require('../index');
var assert = require('assert');
var autored = new Autored();

var fs = require('fs');

console.log(__dirname)
var dummyData = fs.readFileSync((__dirname + '/data.json'), 'utf-8');

dummyData = dummyData.split(';');

dummyData.map(function(i){
	assert.equal(true, autored.addItem(JSON.parse(i)));
});

var test1 = function(){
	console.log('running test1');
	autored.search('go', '', function(err, res){
		assert.equal(err, null); //no error occurred//
		//assert.equal(res, [ '{"url":"http://google.com","str":"Google Search"}',
		//					'{"url":"http://duck-duck-go.com","str":"Duck Duck Go Search"}' ]);
		console.log('finished test1');
	});
}

var test2 = function(){
	console.log('running test2');
	autored.search('se', '', function(err, res){
		assert.equal(err, null); //no error occurred//
		//assert.equal(res, [ '{"url":"http://google.com","str":"Google Search"}',
  		//					'{"url":"http://bing.com","str":"Bing Search"}',
  		//					'{"url":"http://duck-duck-go.com","str":"Duck Duck Go Search"}' ]);
		console.log('finished test2');
	});
}

var tearDown = function(){
	console.log('tearing down');
	autored.flushall();
}

process.nextTick(test1);
process.nextTick(test2);
//process.nextTick(tearDown);
