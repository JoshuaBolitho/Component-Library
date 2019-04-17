const LOAD_COUNT = 2;
const FPS = 60;
const FRAME_DURATION = (8/FPS) * 1000;

var current_frame = 0;
var date;


class SpriteSheetPlayer {
	

	constructor (elementId, spriteSheetURL, mapURL, manualUpdate = false) {

		this.el = document.getElementById(elementId);
		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext('2d');
		this.el.appendChild(this.canvas);

		// animation can be self contained, or used with an external animation engine.
		this.manualUpdate = manualUpdate;

		this.spriteSheetURL = spriteSheetURL;
		this.mapURL = mapURL;
	}


	init () {

		this.initialized = true;

		this.load();
	}


	load (element) {

		this.loaded = 0;
		this.loadSpriteSheet(this.spriteSheetURL, this.on_LOAD_COMPLETE.bind(this));
		this.loadJSON(this.mapURL, this.on_LOAD_COMPLETE.bind(this));
	}


	on_LOAD_COMPLETE (response) {

		this.loaded++;

		// only two types of responses
		if (response instanceof HTMLImageElement) {
			this.spriteSheet = response;
		} else {
			this.map = JSON.parse(response);
			this.frameCount = this.map.length;
		}

		if (this.loaded >= LOAD_COUNT) {
			this.assetsLoaded = true;
			this.play();
		}
	}


	loadSpriteSheet (url, callback) {

		var image = new Image();

		image.onload = (e)=>{
			callback(image);
		};
		image.addEventListener('error', function() {
	 		console.log('error loading spritesheet image');
	  	});
	  	image.src = url;
	}


	loadJSON (url, callback) {

	    var xobj = new XMLHttpRequest();
	    xobj.overrideMimeType("application/json");
	    xobj.open('GET', url, true);
	    xobj.onreadystatechange = function() {
	        if (xobj.readyState == 4 && xobj.status == "200") {
	            callback(xobj.responseText);
	        }
	    }
	    xobj.send(null);
	}


	play () {

		if (this.assetsLoaded !== true) return;

		this.playing = true;
		this.lastFrame = Date.now();
		this.nextFrame = Date.now() + FRAME_DURATION;

		// set the first frame
		this.setFrame(current_frame, this.spriteSheet, this.map);

		if (!this.manualUpdate) {
			window.requestAnimationFrame(this.render.bind(this));
		}
	}


	update () {

		if (this.playing && this.assetsLoaded) {
			this.render();	
		}
	}

	render () {

		date = Date.now();
		
		// run animation loop internally
		if (!this.manualUpdate) {
			window.requestAnimationFrame(this.render.bind(this));	
		}

		// when to progress to the next frame
		if (date < this.nextFrame) return;

		// TODO: account delta time for smoother animations
		this.lastFrame = date;
		this.nextFrame = date + FRAME_DURATION;

		current_frame++;

		if (current_frame >= this.frameCount) {

			// random pause between animation loops
			this.nextFrame = date + Math.random()*2000 + 1000;
			current_frame = 0;
		}

		this.ctx.clearRect(0,0,this.width,this.height);
		this.setFrame(current_frame, this.spriteSheet, this.map);
	}


	setFrame (frame, spritesheet, map) {

		let frameObj = this.map[frame];

		// TODO: Big performance boost when drawImage pulls another canvas as the source, rather than an image.
		this.ctx.drawImage(spritesheet, frameObj.x, frameObj.y, frameObj.width, frameObj.height, 0, 0, this.width, this.height);
	}


	resize (w, h) {

		this.width = w;
		this.height = h;

		this.el.style.width = w + 'px';
		this.el.style.height = h + 'px';

		this.canvas.width = w;
		this.canvas.height = h;
	}
}

export default SpriteSheetPlayer;