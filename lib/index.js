var fs = require('fs');
var glob = require('glob');
var matter = require('gray-matter');
var removeMd = require('remove-markdown');
var striptags = require('striptags');
var path = require('path');
/*
exports.hugolunr = function(){
	var h = new HugoLunr();
	return h.index();
}*/

module.exports = HugoLunr;


function HugoLunr(input, output){
	var self = this;
	var stream;
	this.list = [];

	//defaults
	this.input = 'content/**';
	this.output = 'public/lunr.json';

 	if(process.argv.indexOf("-o") != -1){ //does output flag exist?
		this.setOutput(process.argv[process.argv.indexOf("-o") + 1]); //grab the next item
	}

	if(process.argv.indexOf("-i") != -1){ //does input flag exist?
	    this.setInput(process.argv[process.argv.indexOf("-i") + 1]); //grab the next item
	}

	this.baseDir = path.dirname(this.input);
}

HugoLunr.prototype.setInput = function(input) {
	this.input = input;
}

HugoLunr.prototype.setOutput = function(output) {
	this.output = output;
}

HugoLunr.prototype.index = function(input, output){
	var self = this;

	if (input){
		self.input = input;
	}

	if (output){
		self.output = output;
	}

	self.list = [];
	self.stream = fs.createWriteStream(self.output);
	self.readDirectory(self.input);
	self.stream.write(JSON.stringify(self.list, null,4) );
	self.stream.end();
}


HugoLunr.prototype.readDirectory = function(path){
	var self = this;
	var files = glob.sync(path);
	var len = files.length;
	for (var i=0;i<len;i++){
		var stats = fs.lstatSync(files[i]);
		if (!stats.isDirectory()){
			self.readFile(files[i]);
		}
	}
  	return true;
}

HugoLunr.prototype.readFile = function(filePath){
	var self = this;
	var ext = path.extname(filePath);
	var meta = matter.read(filePath);
	// Try yaml, but if there is no title, use toml instead
	if (!meta.data.title) {
		var meta = matter.read(filePath, {delims: '+++', lang:'toml'});
	}

	if (meta.data.draft === true){
		return;
	}

	if (ext == '.md'){
		var plainText = removeMd(meta.content);
	} else {
		var plainText = striptags(meta.content);
	}

	var uri = '/' + filePath.substring(0,filePath.lastIndexOf('.'));
	uri = uri.replace(self.baseDir +'/', '').toLowerCase();
	
	// If this is an overview page (ends in "index" or "_index"), we return the dirname instead
	var last = uri.split("/").reverse()[0]
	if (last == "index" || last == "_index") {
		uri = path.dirname(uri)
	}

	if (meta.data.slug !=  undefined){
		uri = path.dirname(uri) + meta.data.slug;
	}

	if (meta.data.url != undefined){
		uri = meta.data.url
	}

	var item = {'uri' : uri, 'content':plainText, 'data' : meta.data, };
	self.list.push(item);
}
