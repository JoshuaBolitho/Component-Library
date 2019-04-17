'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var howler = require('howler');
var EventEmitter = _interopDefault(require('events'));
var VimeoPlayer = _interopDefault(require('@vimeo/player'));

/**************************************************
**
**	Main syncronization clock for entire
**	application. Just register update callbacks to 
**	ensure they never get out of sync with one 
**	another.
**
**************************************************/


let instance = null;


class MasterClock {


	// singleton
	constructor () {

		if (!instance) {
			this.initialize();
		}

		return instance;
	}


	initialize () {

		instance = this;

        this._started = Date.now();
        this._timeScale = 1.0;
        this.time = this._started;
        this._desiredFps = 60;
        this._desiredFrameDurationMS = 1000 / this._desiredFps;

        this._updates = [];
        this.eventObj = {};

        //this.update();
	}


	/*********************************************
    **
    **	Starts the callback loop
    **
    *********************************************/

	play () {

        if (this.playing) return;
        
        this.playing = true;
        this.update();
    }


    /*********************************************
    **
    **	Pauses the callback loop
    **
    *********************************************/

    pause () {
        this.playing = false;
    }


    /*********************************************
    **
    **	Sets time speed, in relation to 60fps
    **
    *********************************************/

    timeScale (rate) {

        if (rate) {
            this._timeScale = rate;
        }

        return this._timeScale;
    }


    /*********************************************
    **
    **	Register and unregister callback
    **	function that are to be called on each
    **	iteraction of the main update loop.
    **
    *********************************************/

    registerCallback (callback) {
        this._updates.push(callback);
    }


    unregisterCallback (callback) {

        var index = this._updates.indexOf(callback);

        if (index > -1) {
            this._updates.splice(index, 1);
        } else {
            throw new Error("Cannot get location of given callback.");
        }
    }


    /*********************************************
    **
    **	Records some time information for the 
    **	current frame and passes it to every 
    **	registered callback.
    **
    *********************************************/

    update () {

        this.lastTime = this.time;

        this.time = Date.now();

        this.elapsedMS = this.time - this.lastTime;

        this.deltaScale = (this.elapsedMS / this._desiredFrameDurationMS) * this._timeScale;

        this.now = this.time;

        if (this.playing) {
            
            window.requestAnimationFrame(this.update.bind(this));

            this.eventObj.now = this.now;
            this.eventObj.elapsed = this.elapsedMS;
            this.eventObj.delta_scale = this.deltaScale;

            for (var i = 0, l = this._updates.length; i < l; i++) {
                this._updates[i](this.eventObj);
            }
        }
    }
}

var MasterClock$1 = (instance) ? instance : new MasterClock();

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
	    };
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

var instance$1;

class MasterAudio extends EventEmitter {


	constructor () {

		super();

		if (!instance$1) {
			this.init();
			instance$1 = this;
		}

		this.muted = false;
		this.volume = { current:1.0, last:1.0 };
	}


	init () {

		// mute when tab is changed in browser
		document.addEventListener("visibilitychange", this.on_VISIBILITY_CHANGE.bind(this));
	}


	on_VISIBILITY_CHANGE (e) {

		if (document.hidden && !this.muted) {

			this.mute(0.5, true);

		} else if (!document.hidden && this.muted)  {

			this.unmute(0.5, true);
		}
	}


	load (spritesheet_config) {

		// save parent load complete callback, so can be called manually from class
		// on_AUDIO_LOAD_COMPLETE, else this class wouldn't know when a load completes.
		this.onLoadParentCallbackFn = spritesheet_config.onload;

		// fires when audio files have loaded.
		spritesheet_config.onload = this.on_AUDIO_LOAD_COMPLETE.bind(this);

		this.sound = new howler.Howl(spritesheet_config);
	}


	on_AUDIO_LOAD_COMPLETE () {

		this.loaded = true;

		if (this.onLoadParentCallbackFn) this.onLoadParentCallbackFn();
		
		this.emit('LOAD_COMPLETE');
	}


	play (sprite_id, volume) {

		let audio_id = this.sound.play(sprite_id);

		if (volume >= 0 && audio_id) this.setVolumeByAudioId(volume, audio_id);

		return audio_id;
		
	}

	
	setVolumeByAudioId (volume, audio_id) {

		this.sound.volume(volume, audio_id);
	}


	setVolumeByIndex (volume, index) {

		// need to find a better way to manage these ids
		let audio_id = this.sound._sounds[index]._id;

		this.sound.volume(volume, audio_id);
	}


	mute (duration = 0, bypassRequestAniamtionFrame = false) {

		if (!this.muted) {

			this.muted = true;
			this.volume.last = this.volume.current;
			this.fadeMasterAudio(0, duration, 0, bypassRequestAniamtionFrame);
		}
	}


	unmute (duration = 0, bypassRequestAniamtionFrame = false) {

		if (this.muted) {

			this.muted = false;
			this.volume.current = this.volume.last;
			this.fadeMasterAudio(this.volume.current, duration, 0, bypassRequestAniamtionFrame);
		}
	}


	fadeMasterAudio (target_volume, duration, delay = 0, bypassRequestAniamtionFrame = false) {

		if (!bypassRequestAniamtionFrame) {

			TweenMax.to(this.volume, duration, {current:target_volume, delay:delay, ease:Power4.easeOut, onUpdate:()=>{
				howler.Howler.volume(this.volume.current);
			}});

		} else {

			this.rawAnimation(target_volume, duration);
		}
	}


	setMasterVolume (volume_amount) {

		this.volume.current = volume_amount;
		howler.Howler.volume(this.volume.current);
	}


	// TweenMax usually handles fades, but relys requestAnimationFrame and only works when the tab is in focus.
	// Fortunately setTimeout will continue to run in the background.

	rawAnimation (target_volume, duration) {

		const FPS = 16.6;
		var timestamp = Date.now();
		var timeout_duration = duration * 1000;
		var current_volume = this.volume.current;
		var target_volume = target_volume;
		var volume_change_amount = target_volume - current_volume;

		var animate = () => {

			let now = Date.now();
			let elapsed = now - timestamp;
			let position = elapsed / timeout_duration;
			let new_volume = current_volume + (volume_change_amount * position);

			if (position < 1) {

				this.volume.current = new_volume;
				howler.Howler.volume(new_volume);

				window.setTimeout(animate, FPS);

			} else {

				this.volume.current = target_volume;
				howler.Howler.volume(target_volume);
			}
		};

		animate();
	}


	destroy () {

	}
}

var MasterAudio$1 = (instance$1) ? instance$1 : new MasterAudio();

/******************************************************
**
**	Converts parent elements text to single characters
**	within multiple span tags, so that the text can be
**	animate by fading in each letter separately. 
**	
******************************************************/


class TextFade {
	
	
	constructor (parent, verticalPadding) {

		this.parent = parent;
		this.verticalPadding = (verticalPadding) ? verticalPadding : 0;
		this.setText(this.parent.innerHTML);
	}


	setText (string) {

		this.originalString = string;
		this.spanString = this.prepareText(this.originalString);

		this.parent.innerHTML = this.spanString;
		this.spanElements = this.parent.getElementsByTagName('span');

		// do not display text until show()
		for (var i = 0; i < this.spanElements.length; i++) {
			this.spanElements[i].style.visibility = 'hidden';
			this.spanElements[i].style.opacity = 0;
		}
	}


	prepareText (textString) {
		
		var str = "";

		for (var i = 0; i < textString.length; i++) {
			str += '<span style="margin:0 ' + this.verticalPadding + '">' + textString.charAt(i) + '</span>';
		}

		return str;
	}


	show (dur, del) {

		// var totalDuration = dur, delay = del;
		// var duration = totalDuration / this.spanElements.length;

		for (var i = 0; i < this.spanElements.length; i++) {
			this.spanElements[i].style.visibility = 'visible';
			this.spanElements[i].style.opacity = 1;
		}
	}



	hide (dur, del) {

		this.spanString = this.prepareText(this.originalString);
		this.parent.innerHTML = this.spanString;
		this.spanElements = this.parent.getElementsByTagName('span');

		// var totalDuration = dur, delay = del;
		// var duration = totalDuration / this.spanElements.length;

		for (var i = this.spanElements.length; i > 0; i--) {
			this.spanElements[i].style.visibility = 'hidden';
			this.spanElements[i].style.opacity = 0;
		}
	}

}

/*****************************************************
**
**	A more compact and flexible method for handling 
**	touch and mouse events so they behave the same 
**	way, while avoiding some of the browser pitfalls 
**	that hurt interaction on some touch devices. 
**	Additionally, this class returns the actual 
**	element that is listening for the event, removing 
**	the need to have global class variables for 
**	referencing the class from an event callback 
**	function that hasn't had the parent class bound 
**	to it. Also makes code easier to read.
**
*****************************************************/

const TOUCH_TIMEOUT_DURATION = 200;
const CANCEL_DISTANCE_X = 20;
const CANCEL_DISTANCE_Y = 20;

var _this_;

class Button extends EventEmitter {


	constructor (el) {

		super();

        if (!el) {
        	console.error('No target element provided');
            return;
        }

        _this_ = this;

        this.el = el;
        this.enabled = true;
	}


	init () {

		if (!this.enabled) return;
     
        // Manually handling the tap interaction, since the browser can
        // have a 200ms latency that is frustrating.

        this.touch_start_time = 0;


        // Notice that the touch events are called first and will block
        // mouse events if he client device supports touch. If there are
        // no touch events triggered - there will be no blocking and this 
        // class will then fall-back to mouse events. 

        this.el.addEventListener('touchstart', this.on_TOUCH_START);
        this.el.addEventListener('touchmove', this.on_TOUCH_MOVE);
        this.el.addEventListener('touchend', this.on_TOUCH_END);

        this.el.addEventListener('mousedown', this.on_MOUSE_DOWN);
        this.el.addEventListener('mousemove', this.on_MOUSE_MOVE);
        this.el.addEventListener('mouseup', this.on_MOUSE_UP);
	}


	on_TOUCH_START (e) {
		
		// stop the event from triggering the click event
		e.stopPropagation();
        e.preventDefault();

        let x = e.changedTouches[0].pageX;
        let y = e.changedTouches[0].pageY;

		_this_.buttonPressStart(x, y);
	}


	on_TOUCH_MOVE (e) {
		
		e.stopPropagation();
        e.preventDefault();

        let x = e.changedTouches[0].pageX;
        let y = e.changedTouches[0].pageY;

		_this_.buttonPressMove(x, y);
	}


	on_TOUCH_END (e) {
        
        // stop the event from triggering the click event
        e.stopPropagation();
        e.preventDefault();

        _this_.buttonPressEnd(e, this);
	}


	on_MOUSE_DOWN (e) {

		let x = e.clientX;
        let y = e.clientY;

        _this_.buttonPressStart(x, y);
	}


	on_MOUSE_MOVE (e) {

		let x = e.clientX;
        let y = e.clientY;

		_this_.buttonPressMove(x, y);
	}


	on_MOUSE_UP (e) {
		
        _this_.buttonPressEnd(e, _this_);
	}


	buttonPressStart (x, y) {

		_this_.touch_timeout = Date.now() + TOUCH_TIMEOUT_DURATION;

		_this_.button_last_press_x = x;
        _this_.button_last_press_y = y;

        _this_.travel_x = 0;
        _this_.travel_y = 0;
	}


	buttonPressMove (x, y) {

		let distance_x = x - _this_.button_last_press_x;
		let distance_y = y - _this_.button_last_press_y;

		_this_.button_last_press_x = x;
		_this_.button_last_press_y = y;

		_this_.travel_x += distance_x;
		_this_.travel_y += distance_y;
	}


	buttonPressEnd (event, target) {

		// Make sure tap interaction happens within time frame.
        if (Date.now() > _this_.touch_timeout || Math.abs(_this_.travel_x) > CANCEL_DISTANCE_X || Math.abs(_this_.travel_y) > CANCEL_DISTANCE_Y) return;

		_this_.emit('SELECTED', event, target);
	}


	destroy () {

		if (!this.enabled) return;

		this.enabled = false;

		this.el.removeEventListener('touchstart', this.on_TOUCH_START);
		this.el.removeEventListener('touchmove', this.on_TOUCH_MOVE);
        this.el.removeEventListener('touchend', this.on_TOUCH_END);
        this.el.removeEventListener('mousedown', this.on_MOUSE_DOWN);
        this.el.removeEventListener('mousemove', this.on_MOUSE_MOVE);
        this.el.removeEventListener('mouseup', this.on_MOUSE_UP);

        this.el = null;
	}


	resize (w, h) {
		// Three doesn't seem to be any reason for a resize at the moment.
		// Only keeping for consistency.
	}
}

/********************************************************** 
**
**  For when you need to preload an array of images while
**  storing the <img> element instances. This is useful
**  for when you can recycle each instance by appending 
**  and removing it as a child of the parent element.
**  This approach is much better than creating and 
**  deleting images on the fly, relying on the browser's
**  cache.
**
**********************************************************/


class ImageCache extends EventEmitter {


    constructor () {

        super();

        this.cache = [];
        this.load_max = 0;
        this.loaded = 0;
    }


    load (url_array, is_texture) {

        let url;

        this.loaded = 0;
        this.load_max = url_array.length;
        
        for (var i = 0; i < this.load_max; i++) {

            url = url_array[i];

            if (is_texture) {
                this.cache.push( this.createTexture(url) );    
            } else {
                this.cache.push( this.createImage(url) );
            }   
        }
    }


    createTexture () {

        //return new THREE.TextureLoader().load(url, this.on_IMAGE_LOADED.bind(this));
    }


    createImage (url) {

        let img = new Image();
        img.onload = this.on_IMAGE_LOADED.bind(this);
        img.src = url;

        return img;
    }


    on_IMAGE_LOADED (e) {

        this.loaded++;

        if (this.loaded >= this.load_max) {
            this.emit('CACHE_LOADED');
        }
    }
}

/*******************************************************
**	
**	Utility class for loading JSON files
**
*******************************************************/

class JSONLoader {

	
	constructor () {

	}


	/*************************************************
	**	
	**	Load external JSON files
	**
	*************************************************/

	load (url, callback) {

		var jsonLoadedCallbackFn = callback;

		var request = new XMLHttpRequest();
		request.onload = function (e) {
			this.on_REPLY.apply(this, [e, jsonLoadedCallbackFn]);
		}.bind(this);
		request.onerror = this.on_LOAD_ERROR.bind(this);
		request.open('GET', url, true);
		request.responseType = 'json';
		request.send();
	}


	/*************************************************
	**	
	**	Server responded. Need to ensure that the 
	**	response shows that everthing went alright.
	**
	*************************************************/

	on_REPLY (e, callback) {

		if (e.target.status >= 200 && e.target.status < 400) {
			
			var response = e.target.response;

			// convert to object if request is a JSON string
			if (typeof response === 'string') {
				response = JSON.parse(e.target.response);
			}

			// Go ahead and pass the response to the caller
			callback(response);

		} else {
			
			console.log('Error: There was an error loading the JSON. -- Status:', e.target.status);
		}
	}
	

	on_LOAD_ERROR (e) {
		console.log('Error: There was an error loading the JSON', e);
	}

}

/*******************************************************
**	
**	Collects device, browser, and input infromation
**
*******************************************************/

let instance$2 = null;

class DeviceDetect {
	
	constructor () {

		// ES6 singleton pattern
		if (!instance$2) {

			instance$2 = this;
			
			this._initialize();
		}

		return instance$2;
	}


	_initialize () {

		this.isMobile = this._detectMobile();
		this.touchSupport = this._detectTouchSupport();
		this.browserSupport = this._detectBrowserSupport();

		// passive events : https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
		//this._detectPassiveEventSupport(this.passiveEventSupport);
	}


	/*************************************************
	**	
	**	Supplied from 
	**	http://detectmobilebrowsers.com/, minus a 
	**	small change to report the result locally, 
	**	rather than in window;
	**
	*************************************************/

	_detectMobile () {
		var check = false;
		(function(a,b){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true;})(navigator.userAgent||navigator.vendor||window.opera,'http://detectmobilebrowser.com/mobile');
		return check;
	}


	/*************************************************
	**	
	**	Detects touch support, but not a guarentee
	**	that the client is using a touch input.
	**
	*************************************************/

	_detectTouchSupport () {
		return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
	}


	/*************************************************
	**	
	**	Minimum browser requirements needed to view
	**	the application.
	**
	*************************************************/

	_detectBrowserSupport () {
		
		var check = true;

		// nothing below IE9
		if (!document.addEventListener) check = false;

		// nothing below IE10
		// if (!window.onpopstate) check = false;

		return check;
	}


	/*************************************************
	**	
	**	Test via a getter in the options object to 
	**	see if the passive property is accessed.
	**
	*************************************************/

	_detectPassiveEventSupport (result) {
		try {
			var opts = Object.defineProperty({}, 'passive', {
				get: function() {
					result = true;
				}
			});
			window.addEventListener("test", null, opts);
		} catch (e) {
			result = false;
		}
	}
}

/**********************************************************************
**
**	Smooth out noisey signals.
**
**	Learn more about the method
**	http://blogs.interknowlogy.com/2011/10/27/kinect-joint-smoothing/
**
**********************************************************************/

const DEFAULT_MAX_INCREMENT_LENGTH = 100;


class NoiseSmoothing {

		
	constructor (maxLength = DEFAULT_MAX_INCREMENT_LENGTH) {

		// stores previous entries, so that averages can be 
		this.increments = {
			x:[],
			y:[],
			z:[]
		};

		// the more increments the tighter the smoothing
	   	this.maxIncrementLength = maxLength;
	}


	sum (list) {

		let total = 0;

		for (let i = 0, l = list.length; i < l; i++) {
			total += list[i];
		}

		return total;
	}


	weightedAverage (data, weights) {

	    if ( data.length != weights.length ) {
	        return null;
	    }
	 
	    let weightedAverage = data.Select( ( t, i ) => t * weights[i] ).Sum();

	    for (var i = 0, l = data.length; i < l; i++) {
	    	weightedAverage += data[i] * weights[i];
	    }
	 
	    return weightedAverage / this.sum(weights);
	}


	ExponentialMovingAverage (increments, baseValue) {

	    let numerator = 0;
	    let denominator = 0;
		
		let length = increments.length;	 
	    let average = this.sum(increments) / length;

	    for (let i = 0; i < length; ++i) {
	        numerator += increments[i] * Math.Pow( baseValue, length - i - 1 );
	        denominator += Math.Pow(baseValue, length - i - 1);
	    }
	 
	    numerator += average * Math.Pow( baseValue, length );
	    denominator += Math.Pow( baseValue, length );
	 
	    return numerator / denominator;
	}


	update (x, y, z) {

		// NOTE: For when there's a need to weight individual vertices
		// let x = this.weightedAverage(list.x, weightList.x);
		// let y = this.weightedAverage(list.y, weightList.y);
		// let z = this.weightedAverage(list.z, weightList.z);

		return this.exponentialWeightedAvg(x, y, z);
	}


	exponentialWeightedAvg (x, y, z) {

	    let weightedX = x;
	    let weightedY = y;
	    let weightedZ = z;
	 	
	 	this.increments.x.push(x);
        this.increments.y.push(y);
        this.increments.z.push(z);

	    if (this.increments > this.maxIncrementLength) {
	        this.increments.x.shift();
	        this.increments.y.shift();
	        this.increments.z.shift();
	    }
	 
	    x = this.exponentialMovingAverage(weightedX, 0.9);
	    y = this.exponentialMovingAverage(weightedY, 0.9);
	    z = this.exponentialMovingAverage(weightedZ, 0.9);
	 
	    return {x:x, y:y, z:z};
	}
}

const MAX_VERTICES = 256;
const MAX_VERTICES_MASK = MAX_VERTICES -1;


class OneDimensionalNoise {


	constructor () {

		this.amplitude = 1;
    	this.scale = 1;
    	this.r = [];

    	for ( var i = 0; i < MAX_VERTICES; ++i ) {
	        this.r.push(Math.random());
	    }
	}


	getVal ( x ) {

        var scaledX = x * this.scale;
        var xFloor = Math.floor(scaledX);
        var t = scaledX - xFloor;
        var tRemapSmoothstep = t * t * ( 3 - 2 * t );

        /// Modulo using &
        var xMin = xFloor & MAX_VERTICES_MASK;
        var xMax = ( xMin + 1 ) & MAX_VERTICES_MASK;

        var y = this.lerp( this.r[ xMin ], this.r[ xMax ], tRemapSmoothstep );

        return y * this.amplitude;
    }


    lerp (a, b, t ) {
        return a * ( 1 - t ) + b * t;
    }


    setAmplitude (newAmplitude) {
        this.amplitude = newAmplitude;
    }


    setScale (newScale) {
        this.scale = newScale;
    }

}

class VideoPlayerVimeo {


	constructor () {

	}


	init (element, id, config) {

		if (this.initialized) return;
		this.initialized = true;

		this.isMobile = this.isMobileDevice();

		if (!config) {

			config = {
				id:id,
		        width:this.width,
		        height:this.height,
		        loop: true,
		        muted: (this.isMobile) ? true : false,
		        autoplay:true,
		        background:0
			};
		}


		this.player = new VimeoPlayer(element, config);
		this.player.on('loaded', ()=>{

		});

		this.player.on('errer', (error)=>{

		});

		this.player.on('play', ()=>{

		});
	}


	isMobileDevice () {

	    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
	}


	play () {

		this.player.play();
	}


	pause () {

		this.player.pause();
	}


	load (id, callback) {

		if (this.player) {

			this.player.loadVideo(this.data.video).then(()=>{ if (callback) callback(); });
		}
	}


	resize (w, h) {

		this.width = w;
		this.height = h;
	}
}

const RESOLUTION = { width:1024, height:1024 };


class WebcamStream extends EventEmitter {


	constructor (webcamEl, canvas) {

		super();

		this.webcam = webcamEl;
		this.imageData = canvas;
		//this.imageDataCtx;

		this.isIOS = (/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream);
	}


	init () {

		window.navigator.mediaDevices.getUserMedia({ video: { width: RESOLUTION.width, height: RESOLUTION.height, frameRate: 60 } })
      		.then(this.on_STREAM_FETCHED.bind(this)).catch(function () { alert("No camera available."); });
	}


	on_STREAM_FETCHED (mediaStream) {

		this.webcam.srcObject = mediaStream;
		this.webcam.play();

		this.onStreamDimensionsAvailable();
	}


    onStreamDimensionsAvailable () {

        if (this.webcam.videoWidth === 0) {

			setTimeout(this.onStreamDimensionsAvailable.bind(this), 100);

        } else {

          	// Resize the canvas to match the webcam video size.
          	this.imageData.width = this.webcam.videoWidth;
          	this.imageData.height = this.webcam.videoHeight;
          	this.imageDataCtx = this.imageData.getContext("2d");

          	// on iOS we want to close the video stream first and
          	// wait for the heavy BRFv4 initialization to finish.
          	// Once that is done, we start the stream again.

          	// as discussed above, close the stream on iOS and wait for BRFv4 to be initialized.

			if (this.isIOS) {

				this.webcam.pause();
				this.webcam.srcObject.getTracks().forEach(function(track) {
					track.stop();
				});
			}

			this.emit('STREAM_CONNECTED');
        }
    }


    update () {

		this.imageDataCtx.setTransform(-1.0, 0, 0, 1, RESOLUTION.width, 0); // A virtual mirror should be... mirrored
	    this.imageDataCtx.drawImage(this.webcam, 0, 0, RESOLUTION.width, RESOLUTION.height);
	    this.imageDataCtx.setTransform( 1.0, 0, 0, 1, 0, 0); // unmirrored for drawing the results
	}


	getCurrentFrame () {

		return this.imageData;
	}


	resize (w, h) {

		this.width = w;
		this.height = h;
	}
}

// animations


var main = {
    MasterClock: MasterClock$1,
    SpriteSheetPlayer: SpriteSheetPlayer,
    MasterAudio: MasterAudio$1,
    MultiTrackCrossFade: MultiTrackCrossFade,
    TextFade: TextFade,
    Button: Button,
    ImageCache: ImageCache,
    JSONLoader: JSONLoader,
    DeviceDetect: DeviceDetect,
    NoiseSmoothing: NoiseSmoothing,
    OneDimensionalNoise: OneDimensionalNoise,
    VideoPlayerVimeo: VideoPlayerVimeo,
    WebcamStream: WebcamStream
};

module.exports = main;
