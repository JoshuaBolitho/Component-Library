(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.ComponentLibrary = factory());
}(this, function () { 'use strict';

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

    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var howler = createCommonjsModule(function (module, exports) {
    /*!
     *  howler.js v2.1.1
     *  howlerjs.com
     *
     *  (c) 2013-2018, James Simpson of GoldFire Studios
     *  goldfirestudios.com
     *
     *  MIT License
     */

    (function() {

      /** Global Methods **/
      /***************************************************************************/

      /**
       * Create the global controller. All contained methods and properties apply
       * to all sounds that are currently playing or will be in the future.
       */
      var HowlerGlobal = function() {
        this.init();
      };
      HowlerGlobal.prototype = {
        /**
         * Initialize the global Howler object.
         * @return {Howler}
         */
        init: function() {
          var self = this || Howler;

          // Create a global ID counter.
          self._counter = 1000;

          // Pool of unlocked HTML5 Audio objects.
          self._html5AudioPool = [];
          self.html5PoolSize = 10;

          // Internal properties.
          self._codecs = {};
          self._howls = [];
          self._muted = false;
          self._volume = 1;
          self._canPlayEvent = 'canplaythrough';
          self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

          // Public properties.
          self.masterGain = null;
          self.noAudio = false;
          self.usingWebAudio = true;
          self.autoSuspend = true;
          self.ctx = null;

          // Set to false to disable the auto audio unlocker.
          self.autoUnlock = true;

          // Setup the various state values for global tracking.
          self._setup();

          return self;
        },

        /**
         * Get/set the global volume for all sounds.
         * @param  {Float} vol Volume from 0.0 to 1.0.
         * @return {Howler/Float}     Returns self or current volume.
         */
        volume: function(vol) {
          var self = this || Howler;
          vol = parseFloat(vol);

          // If we don't have an AudioContext created yet, run the setup.
          if (!self.ctx) {
            setupAudioContext();
          }

          if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
            self._volume = vol;

            // Don't update any of the nodes if we are muted.
            if (self._muted) {
              return self;
            }

            // When using Web Audio, we just need to adjust the master gain.
            if (self.usingWebAudio) {
              self.masterGain.gain.setValueAtTime(vol, Howler.ctx.currentTime);
            }

            // Loop through and change volume for all HTML5 audio nodes.
            for (var i=0; i<self._howls.length; i++) {
              if (!self._howls[i]._webAudio) {
                // Get all of the sounds in this Howl group.
                var ids = self._howls[i]._getSoundIds();

                // Loop through all sounds and change the volumes.
                for (var j=0; j<ids.length; j++) {
                  var sound = self._howls[i]._soundById(ids[j]);

                  if (sound && sound._node) {
                    sound._node.volume = sound._volume * vol;
                  }
                }
              }
            }

            return self;
          }

          return self._volume;
        },

        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(muted) {
          var self = this || Howler;

          // If we don't have an AudioContext created yet, run the setup.
          if (!self.ctx) {
            setupAudioContext();
          }

          self._muted = muted;

          // With Web Audio, we just need to mute the master gain.
          if (self.usingWebAudio) {
            self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx.currentTime);
          }

          // Loop through and mute all HTML5 Audio nodes.
          for (var i=0; i<self._howls.length; i++) {
            if (!self._howls[i]._webAudio) {
              // Get all of the sounds in this Howl group.
              var ids = self._howls[i]._getSoundIds();

              // Loop through all sounds and mark the audio node as muted.
              for (var j=0; j<ids.length; j++) {
                var sound = self._howls[i]._soundById(ids[j]);

                if (sound && sound._node) {
                  sound._node.muted = (muted) ? true : sound._muted;
                }
              }
            }
          }

          return self;
        },

        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          var self = this || Howler;

          for (var i=self._howls.length-1; i>=0; i--) {
            self._howls[i].unload();
          }

          // Create a new AudioContext to make sure it is fully reset.
          if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
            self.ctx.close();
            self.ctx = null;
            setupAudioContext();
          }

          return self;
        },

        /**
         * Check for codec support of specific extension.
         * @param  {String} ext Audio file extention.
         * @return {Boolean}
         */
        codecs: function(ext) {
          return (this || Howler)._codecs[ext.replace(/^x-/, '')];
        },

        /**
         * Setup various state values for global tracking.
         * @return {Howler}
         */
        _setup: function() {
          var self = this || Howler;

          // Keeps track of the suspend/resume state of the AudioContext.
          self.state = self.ctx ? self.ctx.state || 'suspended' : 'suspended';

          // Automatically begin the 30-second suspend process
          self._autoSuspend();

          // Check if audio is available.
          if (!self.usingWebAudio) {
            // No audio is available on this system if noAudio is set to true.
            if (typeof Audio !== 'undefined') {
              try {
                var test = new Audio();

                // Check if the canplaythrough event is available.
                if (typeof test.oncanplaythrough === 'undefined') {
                  self._canPlayEvent = 'canplay';
                }
              } catch(e) {
                self.noAudio = true;
              }
            } else {
              self.noAudio = true;
            }
          }

          // Test to make sure audio isn't disabled in Internet Explorer.
          try {
            var test = new Audio();
            if (test.muted) {
              self.noAudio = true;
            }
          } catch (e) {}

          // Check for supported codecs.
          if (!self.noAudio) {
            self._setupCodecs();
          }

          return self;
        },

        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var self = this || Howler;
          var audioTest = null;

          // Must wrap in a try/catch because IE11 in server mode throws an error.
          try {
            audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
          } catch (err) {
            return self;
          }

          if (!audioTest || typeof audioTest.canPlayType !== 'function') {
            return self;
          }

          var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

          // Opera version <33 has mixed MP3 support, so we need to check for and block it.
          var checkOpera = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
          var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);

          self._codecs = {
            mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
            mpeg: !!mpegTest,
            opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
            ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
            oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
            wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
            aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
            caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
            m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
            mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
            weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
            webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
            dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
            flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
          };

          return self;
        },

        /**
         * Some browsers/devices will only allow audio to be played after a user interaction.
         * Attempt to automatically unlock audio on the first user interaction.
         * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
         * @return {Howler}
         */
        _unlockAudio: function() {
          var self = this || Howler;

          // Only run this on certain browsers/devices.
          var shouldUnlock = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi|Chrome|Safari/i.test(self._navigator && self._navigator.userAgent);
          if (self._audioUnlocked || !self.ctx || !shouldUnlock) {
            return;
          }

          self._audioUnlocked = false;
          self.autoUnlock = false;

          // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
          // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
          // By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
          if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
            self._mobileUnloaded = true;
            self.unload();
          }

          // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
          // http://stackoverflow.com/questions/24119684
          self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

          // Call this method on touch start to create and play a buffer,
          // then check if the audio actually played to determine if
          // audio has now been unlocked on iOS, Android, etc.
          var unlock = function(e) {
            // Create a pool of unlocked HTML5 Audio objects that can
            // be used for playing sounds without user interaction. HTML5
            // Audio objects must be individually unlocked, as opposed
            // to the WebAudio API which only needs a single activation.
            // This must occur before WebAudio setup or the source.onended
            // event will not fire.
            for (var i=0; i<self.html5PoolSize; i++) {
              var audioNode = new Audio();

              // Mark this Audio object as unlocked to ensure it can get returned
              // to the unlocked pool when released.
              audioNode._unlocked = true;

              // Add the audio node to the pool.
              self._releaseHtml5Audio(audioNode);
            }

            // Loop through any assigned audio nodes and unlock them.
            for (var i=0; i<self._howls.length; i++) {
              if (!self._howls[i]._webAudio) {
                // Get all of the sounds in this Howl group.
                var ids = self._howls[i]._getSoundIds();

                // Loop through all sounds and unlock the audio nodes.
                for (var j=0; j<ids.length; j++) {
                  var sound = self._howls[i]._soundById(ids[j]);

                  if (sound && sound._node && !sound._node._unlocked) {
                    sound._node._unlocked = true;
                    sound._node.load();
                  }
                }
              }
            }

            // Fix Android can not play in suspend state.
            self._autoResume();

            // Create an empty buffer.
            var source = self.ctx.createBufferSource();
            source.buffer = self._scratchBuffer;
            source.connect(self.ctx.destination);

            // Play the empty buffer.
            if (typeof source.start === 'undefined') {
              source.noteOn(0);
            } else {
              source.start(0);
            }

            // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
            if (typeof self.ctx.resume === 'function') {
              self.ctx.resume();
            }

            // Setup a timeout to check that we are unlocked on the next event loop.
            source.onended = function() {
              source.disconnect(0);

              // Update the unlocked state and prevent this check from happening again.
              self._audioUnlocked = true;

              // Remove the touch start listener.
              document.removeEventListener('touchstart', unlock, true);
              document.removeEventListener('touchend', unlock, true);
              document.removeEventListener('click', unlock, true);

              // Let all sounds know that audio has been unlocked.
              for (var i=0; i<self._howls.length; i++) {
                self._howls[i]._emit('unlock');
              }
            };
          };

          // Setup a touch start listener to attempt an unlock in.
          document.addEventListener('touchstart', unlock, true);
          document.addEventListener('touchend', unlock, true);
          document.addEventListener('click', unlock, true);

          return self;
        },

        /**
         * Get an unlocked HTML5 Audio object from the pool. If none are left,
         * return a new Audio object and throw a warning.
         * @return {Audio} HTML5 Audio object.
         */
        _obtainHtml5Audio: function() {
          var self = this || Howler;

          // Return the next object from the pool if one exists.
          if (self._html5AudioPool.length) {
            return self._html5AudioPool.pop();
          }

          //.Check if the audio is locked and throw a warning.
          var testPlay = new Audio().play();
          if (testPlay && typeof Promise !== 'undefined' && (testPlay instanceof Promise || typeof testPlay.then === 'function')) {
            testPlay.catch(function() {
              console.warn('HTML5 Audio pool exhausted, returning potentially locked audio object.');
            });
          }

          return new Audio();
        },

        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(audio) {
          var self = this || Howler;

          // Don't add audio to the pool if we don't know if it has been unlocked.
          if (audio._unlocked) {
            self._html5AudioPool.push(audio);
          }

          return self;
        },

        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var self = this;

          if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
            return;
          }

          // Check if any sounds are playing.
          for (var i=0; i<self._howls.length; i++) {
            if (self._howls[i]._webAudio) {
              for (var j=0; j<self._howls[i]._sounds.length; j++) {
                if (!self._howls[i]._sounds[j]._paused) {
                  return self;
                }
              }
            }
          }

          if (self._suspendTimer) {
            clearTimeout(self._suspendTimer);
          }

          // If no sound has played after 30 seconds, suspend the context.
          self._suspendTimer = setTimeout(function() {
            if (!self.autoSuspend) {
              return;
            }

            self._suspendTimer = null;
            self.state = 'suspending';
            self.ctx.suspend().then(function() {
              self.state = 'suspended';

              if (self._resumeAfterSuspend) {
                delete self._resumeAfterSuspend;
                self._autoResume();
              }
            });
          }, 30000);

          return self;
        },

        /**
         * Automatically resume the Web Audio AudioContext when a new sound is played.
         * @return {Howler}
         */
        _autoResume: function() {
          var self = this;

          if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
            return;
          }

          if (self.state === 'running' && self._suspendTimer) {
            clearTimeout(self._suspendTimer);
            self._suspendTimer = null;
          } else if (self.state === 'suspended') {
            self.ctx.resume().then(function() {
              self.state = 'running';

              // Emit to all Howls that the audio has resumed.
              for (var i=0; i<self._howls.length; i++) {
                self._howls[i]._emit('resume');
              }
            });

            if (self._suspendTimer) {
              clearTimeout(self._suspendTimer);
              self._suspendTimer = null;
            }
          } else if (self.state === 'suspending') {
            self._resumeAfterSuspend = true;
          }

          return self;
        }
      };

      // Setup the global audio controller.
      var Howler = new HowlerGlobal();

      /** Group Methods **/
      /***************************************************************************/

      /**
       * Create an audio group controller.
       * @param {Object} o Passed in properties for this group.
       */
      var Howl = function(o) {
        var self = this;

        // Throw an error if no source is provided.
        if (!o.src || o.src.length === 0) {
          console.error('An array of source files must be passed with any new Howl.');
          return;
        }

        self.init(o);
      };
      Howl.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(o) {
          var self = this;

          // If we don't have an AudioContext created yet, run the setup.
          if (!Howler.ctx) {
            setupAudioContext();
          }

          // Setup user-defined default properties.
          self._autoplay = o.autoplay || false;
          self._format = (typeof o.format !== 'string') ? o.format : [o.format];
          self._html5 = o.html5 || false;
          self._muted = o.mute || false;
          self._loop = o.loop || false;
          self._pool = o.pool || 5;
          self._preload = (typeof o.preload === 'boolean') ? o.preload : true;
          self._rate = o.rate || 1;
          self._sprite = o.sprite || {};
          self._src = (typeof o.src !== 'string') ? o.src : [o.src];
          self._volume = o.volume !== undefined ? o.volume : 1;
          self._xhrWithCredentials = o.xhrWithCredentials || false;

          // Setup all other default properties.
          self._duration = 0;
          self._state = 'unloaded';
          self._sounds = [];
          self._endTimers = {};
          self._queue = [];
          self._playLock = false;

          // Setup event listeners.
          self._onend = o.onend ? [{fn: o.onend}] : [];
          self._onfade = o.onfade ? [{fn: o.onfade}] : [];
          self._onload = o.onload ? [{fn: o.onload}] : [];
          self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
          self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
          self._onpause = o.onpause ? [{fn: o.onpause}] : [];
          self._onplay = o.onplay ? [{fn: o.onplay}] : [];
          self._onstop = o.onstop ? [{fn: o.onstop}] : [];
          self._onmute = o.onmute ? [{fn: o.onmute}] : [];
          self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
          self._onrate = o.onrate ? [{fn: o.onrate}] : [];
          self._onseek = o.onseek ? [{fn: o.onseek}] : [];
          self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
          self._onresume = [];

          // Web Audio or HTML5 Audio?
          self._webAudio = Howler.usingWebAudio && !self._html5;

          // Automatically try to enable audio.
          if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
            Howler._unlockAudio();
          }

          // Keep track of this Howl group in the global controller.
          Howler._howls.push(self);

          // If they selected autoplay, add a play event to the load queue.
          if (self._autoplay) {
            self._queue.push({
              event: 'play',
              action: function() {
                self.play();
              }
            });
          }

          // Load the source file unless otherwise specified.
          if (self._preload) {
            self.load();
          }

          return self;
        },

        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var self = this;
          var url = null;

          // If no audio is available, quit immediately.
          if (Howler.noAudio) {
            self._emit('loaderror', null, 'No audio support.');
            return;
          }

          // Make sure our source is in an array.
          if (typeof self._src === 'string') {
            self._src = [self._src];
          }

          // Loop through the sources and pick the first one that is compatible.
          for (var i=0; i<self._src.length; i++) {
            var ext, str;

            if (self._format && self._format[i]) {
              // If an extension was specified, use that instead.
              ext = self._format[i];
            } else {
              // Make sure the source is a string.
              str = self._src[i];
              if (typeof str !== 'string') {
                self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
                continue;
              }

              // Extract the file extension from the URL or base64 data URI.
              ext = /^data:audio\/([^;,]+);/i.exec(str);
              if (!ext) {
                ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
              }

              if (ext) {
                ext = ext[1].toLowerCase();
              }
            }

            // Log a warning if no extension was found.
            if (!ext) {
              console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
            }

            // Check if this extension is available.
            if (ext && Howler.codecs(ext)) {
              url = self._src[i];
              break;
            }
          }

          if (!url) {
            self._emit('loaderror', null, 'No codec support for selected audio sources.');
            return;
          }

          self._src = url;
          self._state = 'loading';

          // If the hosting page is HTTPS and the source isn't,
          // drop down to HTML5 Audio to avoid Mixed Content errors.
          if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
            self._html5 = true;
            self._webAudio = false;
          }

          // Create a new sound object and add it to the pool.
          new Sound(self);

          // Load and decode the audio data for playback.
          if (self._webAudio) {
            loadBuffer(self);
          }

          return self;
        },

        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(sprite, internal) {
          var self = this;
          var id = null;

          // Determine if a sprite, sound id or nothing was passed
          if (typeof sprite === 'number') {
            id = sprite;
            sprite = null;
          } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
            // If the passed sprite doesn't exist, do nothing.
            return null;
          } else if (typeof sprite === 'undefined') {
            // Use the default sound sprite (plays the full audio length).
            sprite = '__default';

            // Check if there is a single paused sound that isn't ended. 
            // If there is, play that sound. If not, continue as usual.  
            if (!self._playLock) {
              var num = 0;
              for (var i=0; i<self._sounds.length; i++) {
                if (self._sounds[i]._paused && !self._sounds[i]._ended) {
                  num++;
                  id = self._sounds[i]._id;
                }
              }

              if (num === 1) {
                sprite = null;
              } else {
                id = null;
              }
            }
          }

          // Get the selected node, or get one from the pool.
          var sound = id ? self._soundById(id) : self._inactiveSound();

          // If the sound doesn't exist, do nothing.
          if (!sound) {
            return null;
          }

          // Select the sprite definition.
          if (id && !sprite) {
            sprite = sound._sprite || '__default';
          }

          // If the sound hasn't loaded, we must wait to get the audio's duration.
          // We also need to wait to make sure we don't run into race conditions with
          // the order of function calls.
          if (self._state !== 'loaded') {
            // Set the sprite value on this sound.
            sound._sprite = sprite;

            // Mark this sound as not ended in case another sound is played before this one loads.
            sound._ended = false;

            // Add the sound to the queue to be played on load.
            var soundId = sound._id;
            self._queue.push({
              event: 'play',
              action: function() {
                self.play(soundId);
              }
            });

            return soundId;
          }

          // Don't play the sound if an id was passed and it is already playing.
          if (id && !sound._paused) {
            // Trigger the play event, in order to keep iterating through queue.
            if (!internal) {
              self._loadQueue('play');
            }

            return sound._id;
          }

          // Make sure the AudioContext isn't suspended, and resume it if it is.
          if (self._webAudio) {
            Howler._autoResume();
          }

          // Determine how long to play for and where to start playing.
          var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
          var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);
          var timeout = (duration * 1000) / Math.abs(sound._rate);
          var start = self._sprite[sprite][0] / 1000;
          var stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
          var loop = !!(sound._loop || self._sprite[sprite][2]);
          sound._sprite = sprite;

          // Mark the sound as ended instantly so that this async playback
          // doesn't get grabbed by another call to play while this one waits to start.
          sound._ended = false;

          // Update the parameters of the sound.
          var setParams = function() {
            sound._paused = false;
            sound._seek = seek;
            sound._start = start;
            sound._stop = stop;
            sound._loop = loop;
          };

          // End the sound instantly if seek is at the end.
          if (seek >= stop) {
            self._ended(sound);
            return;
          }

          // Begin the actual playback.
          var node = sound._node;
          if (self._webAudio) {
            // Fire this when the sound is ready to play to begin Web Audio playback.
            var playWebAudio = function() {
              self._playLock = false;
              setParams();
              self._refreshBuffer(sound);

              // Setup the playback params.
              var vol = (sound._muted || self._muted) ? 0 : sound._volume;
              node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
              sound._playStart = Howler.ctx.currentTime;

              // Play the sound using the supported method.
              if (typeof node.bufferSource.start === 'undefined') {
                sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
              } else {
                sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
              }

              // Start a new timer if none is present.
              if (timeout !== Infinity) {
                self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
              }

              if (!internal) {
                setTimeout(function() {
                  self._emit('play', sound._id);
                  self._loadQueue();
                }, 0);
              }
            };

            if (Howler.state === 'running') {
              playWebAudio();
            } else {
              self._playLock = true;

              // Wait for the audio context to resume before playing.
              self.once('resume', playWebAudio);

              // Cancel the end timer.
              self._clearTimer(sound._id);
            }
          } else {
            // Fire this when the sound is ready to play to begin HTML5 Audio playback.
            var playHtml5 = function() {
              node.currentTime = seek;
              node.muted = sound._muted || self._muted || Howler._muted || node.muted;
              node.volume = sound._volume * Howler.volume();
              node.playbackRate = sound._rate;

              // Some browsers will throw an error if this is called without user interaction.
              try {
                var play = node.play();

                // Support older browsers that don't support promises, and thus don't have this issue.
                if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof play.then === 'function')) {
                  // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
                  self._playLock = true;

                  // Set param values immediately.
                  setParams();

                  // Releases the lock and executes queued actions.
                  play
                    .then(function() {
                      self._playLock = false;
                      node._unlocked = true;
                      if (!internal) {
                        self._emit('play', sound._id);
                        self._loadQueue();
                      }
                    })
                    .catch(function() {
                      self._playLock = false;
                      self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                        'on mobile devices and Chrome where playback was not within a user interaction.');

                      // Reset the ended and paused values.
                      sound._ended = true;
                      sound._paused = true;
                    });
                } else if (!internal) {
                  self._playLock = false;
                  setParams();
                  self._emit('play', sound._id);
                  self._loadQueue();
                }

                // Setting rate before playing won't work in IE, so we set it again here.
                node.playbackRate = sound._rate;

                // If the node is still paused, then we can assume there was a playback issue.
                if (node.paused) {
                  self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                    'on mobile devices and Chrome where playback was not within a user interaction.');
                  return;
                }

                // Setup the end timer on sprites or listen for the ended event.
                if (sprite !== '__default' || sound._loop) {
                  self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
                } else {
                  self._endTimers[sound._id] = function() {
                    // Fire ended on this audio node.
                    self._ended(sound);

                    // Clear this listener.
                    node.removeEventListener('ended', self._endTimers[sound._id], false);
                  };
                  node.addEventListener('ended', self._endTimers[sound._id], false);
                }
              } catch (err) {
                self._emit('playerror', sound._id, err);
              }
            };

            // Play immediately if ready, or wait for the 'canplaythrough'e vent.
            var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && Howler._navigator.isCocoonJS);
            if (node.readyState >= 3 || loadedNoReadyState) {
              playHtml5();
            } else {
              self._playLock = true;

              var listener = function() {
                // Begin playback.
                playHtml5();

                // Clear this listener.
                node.removeEventListener(Howler._canPlayEvent, listener, false);
              };
              node.addEventListener(Howler._canPlayEvent, listener, false);

              // Cancel the end timer.
              self._clearTimer(sound._id);
            }
          }

          return sound._id;
        },

        /**
         * Pause playback and save current position.
         * @param  {Number} id The sound ID (empty to pause all in group).
         * @return {Howl}
         */
        pause: function(id) {
          var self = this;

          // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
          if (self._state !== 'loaded' || self._playLock) {
            self._queue.push({
              event: 'pause',
              action: function() {
                self.pause(id);
              }
            });

            return self;
          }

          // If no id is passed, get all ID's to be paused.
          var ids = self._getSoundIds(id);

          for (var i=0; i<ids.length; i++) {
            // Clear the end timer.
            self._clearTimer(ids[i]);

            // Get the sound.
            var sound = self._soundById(ids[i]);

            if (sound && !sound._paused) {
              // Reset the seek position.
              sound._seek = self.seek(ids[i]);
              sound._rateSeek = 0;
              sound._paused = true;

              // Stop currently running fades.
              self._stopFade(ids[i]);

              if (sound._node) {
                if (self._webAudio) {
                  // Make sure the sound has been created.
                  if (!sound._node.bufferSource) {
                    continue;
                  }

                  if (typeof sound._node.bufferSource.stop === 'undefined') {
                    sound._node.bufferSource.noteOff(0);
                  } else {
                    sound._node.bufferSource.stop(0);
                  }

                  // Clean up the buffer source.
                  self._cleanBuffer(sound._node);
                } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                  sound._node.pause();
                }
              }
            }

            // Fire the pause event, unless `true` is passed as the 2nd argument.
            if (!arguments[1]) {
              self._emit('pause', sound ? sound._id : null);
            }
          }

          return self;
        },

        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(id, internal) {
          var self = this;

          // If the sound hasn't loaded, add it to the load queue to stop when capable.
          if (self._state !== 'loaded' || self._playLock) {
            self._queue.push({
              event: 'stop',
              action: function() {
                self.stop(id);
              }
            });

            return self;
          }

          // If no id is passed, get all ID's to be stopped.
          var ids = self._getSoundIds(id);

          for (var i=0; i<ids.length; i++) {
            // Clear the end timer.
            self._clearTimer(ids[i]);

            // Get the sound.
            var sound = self._soundById(ids[i]);

            if (sound) {
              // Reset the seek position.
              sound._seek = sound._start || 0;
              sound._rateSeek = 0;
              sound._paused = true;
              sound._ended = true;

              // Stop currently running fades.
              self._stopFade(ids[i]);

              if (sound._node) {
                if (self._webAudio) {
                  // Make sure the sound's AudioBufferSourceNode has been created.
                  if (sound._node.bufferSource) {
                    if (typeof sound._node.bufferSource.stop === 'undefined') {
                      sound._node.bufferSource.noteOff(0);
                    } else {
                      sound._node.bufferSource.stop(0);
                    }

                    // Clean up the buffer source.
                    self._cleanBuffer(sound._node);
                  }
                } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                  sound._node.currentTime = sound._start || 0;
                  sound._node.pause();
                }
              }

              if (!internal) {
                self._emit('stop', sound._id);
              }
            }
          }

          return self;
        },

        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(muted, id) {
          var self = this;

          // If the sound hasn't loaded, add it to the load queue to mute when capable.
          if (self._state !== 'loaded'|| self._playLock) {
            self._queue.push({
              event: 'mute',
              action: function() {
                self.mute(muted, id);
              }
            });

            return self;
          }

          // If applying mute/unmute to all sounds, update the group's value.
          if (typeof id === 'undefined') {
            if (typeof muted === 'boolean') {
              self._muted = muted;
            } else {
              return self._muted;
            }
          }

          // If no id is passed, get all ID's to be muted.
          var ids = self._getSoundIds(id);

          for (var i=0; i<ids.length; i++) {
            // Get the sound.
            var sound = self._soundById(ids[i]);

            if (sound) {
              sound._muted = muted;

              // Cancel active fade and set the volume to the end value.
              if (sound._interval) {
                self._stopFade(sound._id);
              }

              if (self._webAudio && sound._node) {
                sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx.currentTime);
              } else if (sound._node) {
                sound._node.muted = Howler._muted ? true : muted;
              }

              self._emit('mute', sound._id);
            }
          }

          return self;
        },

        /**
         * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
         *   volume() -> Returns the group's volume value.
         *   volume(id) -> Returns the sound id's current volume.
         *   volume(vol) -> Sets the volume of all sounds in this Howl group.
         *   volume(vol, id) -> Sets the volume of passed sound id.
         * @return {Howl/Number} Returns self or current volume.
         */
        volume: function() {
          var self = this;
          var args = arguments;
          var vol, id;

          // Determine the values based on arguments.
          if (args.length === 0) {
            // Return the value of the groups' volume.
            return self._volume;
          } else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
            // First check if this is an ID, and if not, assume it is a new volume.
            var ids = self._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else {
              vol = parseFloat(args[0]);
            }
          } else if (args.length >= 2) {
            vol = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }

          // Update the volume or return the current volume.
          var sound;
          if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
            // If the sound hasn't loaded, add it to the load queue to change volume when capable.
            if (self._state !== 'loaded'|| self._playLock) {
              self._queue.push({
                event: 'volume',
                action: function() {
                  self.volume.apply(self, args);
                }
              });

              return self;
            }

            // Set the group volume.
            if (typeof id === 'undefined') {
              self._volume = vol;
            }

            // Update one or all volumes.
            id = self._getSoundIds(id);
            for (var i=0; i<id.length; i++) {
              // Get the sound.
              sound = self._soundById(id[i]);

              if (sound) {
                sound._volume = vol;

                // Stop currently running fades.
                if (!args[2]) {
                  self._stopFade(id[i]);
                }

                if (self._webAudio && sound._node && !sound._muted) {
                  sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
                } else if (sound._node && !sound._muted) {
                  sound._node.volume = vol * Howler.volume();
                }

                self._emit('volume', sound._id);
              }
            }
          } else {
            sound = id ? self._soundById(id) : self._sounds[0];
            return sound ? sound._volume : 0;
          }

          return self;
        },

        /**
         * Fade a currently playing sound between two volumes (if no id is passsed, all sounds will fade).
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id (omit to fade all sounds).
         * @return {Howl}
         */
        fade: function(from, to, len, id) {
          var self = this;

          // If the sound hasn't loaded, add it to the load queue to fade when capable.
          if (self._state !== 'loaded' || self._playLock) {
            self._queue.push({
              event: 'fade',
              action: function() {
                self.fade(from, to, len, id);
              }
            });

            return self;
          }

          // Make sure the to/from/len values are numbers.
          from = parseFloat(from);
          to = parseFloat(to);
          len = parseFloat(len);

          // Set the volume to the start position.
          self.volume(from, id);

          // Fade the volume of one or all sounds.
          var ids = self._getSoundIds(id);
          for (var i=0; i<ids.length; i++) {
            // Get the sound.
            var sound = self._soundById(ids[i]);

            // Create a linear fade or fall back to timeouts with HTML5 Audio.
            if (sound) {
              // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
              if (!id) {
                self._stopFade(ids[i]);
              }

              // If we are using Web Audio, let the native methods do the actual fade.
              if (self._webAudio && !sound._muted) {
                var currentTime = Howler.ctx.currentTime;
                var end = currentTime + (len / 1000);
                sound._volume = from;
                sound._node.gain.setValueAtTime(from, currentTime);
                sound._node.gain.linearRampToValueAtTime(to, end);
              }

              self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
            }
          }

          return self;
        },

        /**
         * Starts the internal interval to fade a sound.
         * @param  {Object} sound Reference to sound to fade.
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id to fade.
         * @param  {Boolean} isGroup   If true, set the volume on the group.
         */
        _startFadeInterval: function(sound, from, to, len, id, isGroup) {
          var self = this;
          var vol = from;
          var diff = to - from;
          var steps = Math.abs(diff / 0.01);
          var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
          var lastTick = Date.now();

          // Store the value being faded to.
          sound._fadeTo = to;

          // Update the volume value on each interval tick.
          sound._interval = setInterval(function() {
            // Update the volume based on the time since the last tick.
            var tick = (Date.now() - lastTick) / len;
            lastTick = Date.now();
            vol += diff * tick;

            // Make sure the volume is in the right bounds.
            vol = Math.max(0, vol);
            vol = Math.min(1, vol);

            // Round to within 2 decimal points.
            vol = Math.round(vol * 100) / 100;

            // Change the volume.
            if (self._webAudio) {
              sound._volume = vol;
            } else {
              self.volume(vol, sound._id, true);
            }

            // Set the group's volume.
            if (isGroup) {
              self._volume = vol;
            }

            // When the fade is complete, stop it and fire event.
            if ((to < from && vol <= to) || (to > from && vol >= to)) {
              clearInterval(sound._interval);
              sound._interval = null;
              sound._fadeTo = null;
              self.volume(to, sound._id);
              self._emit('fade', sound._id);
            }
          }, stepLen);
        },

        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(id) {
          var self = this;
          var sound = self._soundById(id);

          if (sound && sound._interval) {
            if (self._webAudio) {
              sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
            }

            clearInterval(sound._interval);
            sound._interval = null;
            self.volume(sound._fadeTo, id);
            sound._fadeTo = null;
            self._emit('fade', id);
          }

          return self;
        },

        /**
         * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
         *   loop() -> Returns the group's loop value.
         *   loop(id) -> Returns the sound id's loop value.
         *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
         *   loop(loop, id) -> Sets the loop value of passed sound id.
         * @return {Howl/Boolean} Returns self or current loop value.
         */
        loop: function() {
          var self = this;
          var args = arguments;
          var loop, id, sound;

          // Determine the values for loop and id.
          if (args.length === 0) {
            // Return the grou's loop value.
            return self._loop;
          } else if (args.length === 1) {
            if (typeof args[0] === 'boolean') {
              loop = args[0];
              self._loop = loop;
            } else {
              // Return this sound's loop value.
              sound = self._soundById(parseInt(args[0], 10));
              return sound ? sound._loop : false;
            }
          } else if (args.length === 2) {
            loop = args[0];
            id = parseInt(args[1], 10);
          }

          // If no id is passed, get all ID's to be looped.
          var ids = self._getSoundIds(id);
          for (var i=0; i<ids.length; i++) {
            sound = self._soundById(ids[i]);

            if (sound) {
              sound._loop = loop;
              if (self._webAudio && sound._node && sound._node.bufferSource) {
                sound._node.bufferSource.loop = loop;
                if (loop) {
                  sound._node.bufferSource.loopStart = sound._start || 0;
                  sound._node.bufferSource.loopEnd = sound._stop;
                }
              }
            }
          }

          return self;
        },

        /**
         * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   rate() -> Returns the first sound node's current playback rate.
         *   rate(id) -> Returns the sound id's current playback rate.
         *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
         *   rate(rate, id) -> Sets the playback rate of passed sound id.
         * @return {Howl/Number} Returns self or the current playback rate.
         */
        rate: function() {
          var self = this;
          var args = arguments;
          var rate, id;

          // Determine the values based on arguments.
          if (args.length === 0) {
            // We will simply return the current rate of the first node.
            id = self._sounds[0]._id;
          } else if (args.length === 1) {
            // First check if this is an ID, and if not, assume it is a new rate value.
            var ids = self._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else {
              rate = parseFloat(args[0]);
            }
          } else if (args.length === 2) {
            rate = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }

          // Update the playback rate or return the current value.
          var sound;
          if (typeof rate === 'number') {
            // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
            if (self._state !== 'loaded' || self._playLock) {
              self._queue.push({
                event: 'rate',
                action: function() {
                  self.rate.apply(self, args);
                }
              });

              return self;
            }

            // Set the group rate.
            if (typeof id === 'undefined') {
              self._rate = rate;
            }

            // Update one or all volumes.
            id = self._getSoundIds(id);
            for (var i=0; i<id.length; i++) {
              // Get the sound.
              sound = self._soundById(id[i]);

              if (sound) {
                // Keep track of our position when the rate changed and update the playback
                // start position so we can properly adjust the seek position for time elapsed.
                if (self.playing(id[i])) {
                  sound._rateSeek = self.seek(id[i]);
                  sound._playStart = self._webAudio ? Howler.ctx.currentTime : sound._playStart;
                }
                sound._rate = rate;

                // Change the playback rate.
                if (self._webAudio && sound._node && sound._node.bufferSource) {
                  sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler.ctx.currentTime);
                } else if (sound._node) {
                  sound._node.playbackRate = rate;
                }

                // Reset the timers.
                var seek = self.seek(id[i]);
                var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
                var timeout = (duration * 1000) / Math.abs(sound._rate);

                // Start a new end timer if sound is already playing.
                if (self._endTimers[id[i]] || !sound._paused) {
                  self._clearTimer(id[i]);
                  self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
                }

                self._emit('rate', sound._id);
              }
            }
          } else {
            sound = self._soundById(id);
            return sound ? sound._rate : self._rate;
          }

          return self;
        },

        /**
         * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   seek() -> Returns the first sound node's current seek position.
         *   seek(id) -> Returns the sound id's current seek position.
         *   seek(seek) -> Sets the seek position of the first sound node.
         *   seek(seek, id) -> Sets the seek position of passed sound id.
         * @return {Howl/Number} Returns self or the current seek position.
         */
        seek: function() {
          var self = this;
          var args = arguments;
          var seek, id;

          // Determine the values based on arguments.
          if (args.length === 0) {
            // We will simply return the current position of the first node.
            id = self._sounds[0]._id;
          } else if (args.length === 1) {
            // First check if this is an ID, and if not, assume it is a new seek position.
            var ids = self._getSoundIds();
            var index = ids.indexOf(args[0]);
            if (index >= 0) {
              id = parseInt(args[0], 10);
            } else if (self._sounds.length) {
              id = self._sounds[0]._id;
              seek = parseFloat(args[0]);
            }
          } else if (args.length === 2) {
            seek = parseFloat(args[0]);
            id = parseInt(args[1], 10);
          }

          // If there is no ID, bail out.
          if (typeof id === 'undefined') {
            return self;
          }

          // If the sound hasn't loaded, add it to the load queue to seek when capable.
          if (self._state !== 'loaded' || self._playLock) {
            self._queue.push({
              event: 'seek',
              action: function() {
                self.seek.apply(self, args);
              }
            });

            return self;
          }

          // Get the sound.
          var sound = self._soundById(id);

          if (sound) {
            if (typeof seek === 'number' && seek >= 0) {
              // Pause the sound and update position for restarting playback.
              var playing = self.playing(id);
              if (playing) {
                self.pause(id, true);
              }

              // Move the position of the track and cancel timer.
              sound._seek = seek;
              sound._ended = false;
              self._clearTimer(id);

              // Update the seek position for HTML5 Audio.
              if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
                sound._node.currentTime = seek;
              }

              // Seek and emit when ready.
              var seekAndEmit = function() {
                self._emit('seek', id);

                // Restart the playback if the sound was playing.
                if (playing) {
                  self.play(id, true);
                }
              };

              // Wait for the play lock to be unset before emitting (HTML5 Audio).
              if (playing && !self._webAudio) {
                var emitSeek = function() {
                  if (!self._playLock) {
                    seekAndEmit();
                  } else {
                    setTimeout(emitSeek, 0);
                  }
                };
                setTimeout(emitSeek, 0);
              } else {
                seekAndEmit();
              }
            } else {
              if (self._webAudio) {
                var realTime = self.playing(id) ? Howler.ctx.currentTime - sound._playStart : 0;
                var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
                return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
              } else {
                return sound._node.currentTime;
              }
            }
          }

          return self;
        },

        /**
         * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
         * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
         * @return {Boolean} True if playing and false if not.
         */
        playing: function(id) {
          var self = this;

          // Check the passed sound ID (if any).
          if (typeof id === 'number') {
            var sound = self._soundById(id);
            return sound ? !sound._paused : false;
          }

          // Otherwise, loop through all sounds and check if any are playing.
          for (var i=0; i<self._sounds.length; i++) {
            if (!self._sounds[i]._paused) {
              return true;
            }
          }

          return false;
        },

        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(id) {
          var self = this;
          var duration = self._duration;

          // If we pass an ID, get the sound and return the sprite length.
          var sound = self._soundById(id);
          if (sound) {
            duration = self._sprite[sound._sprite][1] / 1000;
          }

          return duration;
        },

        /**
         * Returns the current loaded state of this Howl.
         * @return {String} 'unloaded', 'loading', 'loaded'
         */
        state: function() {
          return this._state;
        },

        /**
         * Unload and destroy the current Howl object.
         * This will immediately stop all sound instances attached to this group.
         */
        unload: function() {
          var self = this;

          // Stop playing any active sounds.
          var sounds = self._sounds;
          for (var i=0; i<sounds.length; i++) {
            // Stop the sound if it is currently playing.
            if (!sounds[i]._paused) {
              self.stop(sounds[i]._id);
            }

            // Remove the source or disconnect.
            if (!self._webAudio) {
              // Set the source to 0-second silence to stop any downloading (except in IE).
              var checkIE = /MSIE |Trident\//.test(Howler._navigator && Howler._navigator.userAgent);
              if (!checkIE) {
                sounds[i]._node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
              }

              // Remove any event listeners.
              sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
              sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);

              // Release the Audio object back to the pool.
              Howler._releaseHtml5Audio(sounds[i]._node);
            }

            // Empty out all of the nodes.
            delete sounds[i]._node;

            // Make sure all timers are cleared out.
            self._clearTimer(sounds[i]._id);
          }

          // Remove the references in the global Howler object.
          var index = Howler._howls.indexOf(self);
          if (index >= 0) {
            Howler._howls.splice(index, 1);
          }

          // Delete this sound from the cache (if no other Howl is using it).
          var remCache = true;
          for (i=0; i<Howler._howls.length; i++) {
            if (Howler._howls[i]._src === self._src || self._src.indexOf(Howler._howls[i]._src) >= 0) {
              remCache = false;
              break;
            }
          }

          if (cache && remCache) {
            delete cache[self._src];
          }

          // Clear global errors.
          Howler.noAudio = false;

          // Clear out `self`.
          self._state = 'unloaded';
          self._sounds = [];
          self = null;

          return null;
        },

        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(event, fn, id, once) {
          var self = this;
          var events = self['_on' + event];

          if (typeof fn === 'function') {
            events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
          }

          return self;
        },

        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(event, fn, id) {
          var self = this;
          var events = self['_on' + event];
          var i = 0;

          // Allow passing just an event and ID.
          if (typeof fn === 'number') {
            id = fn;
            fn = null;
          }

          if (fn || id) {
            // Loop through event store and remove the passed function.
            for (i=0; i<events.length; i++) {
              var isId = (id === events[i].id);
              if (fn === events[i].fn && isId || !fn && isId) {
                events.splice(i, 1);
                break;
              }
            }
          } else if (event) {
            // Clear out all events of this type.
            self['_on' + event] = [];
          } else {
            // Clear out all events of every type.
            var keys = Object.keys(self);
            for (i=0; i<keys.length; i++) {
              if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
                self[keys[i]] = [];
              }
            }
          }

          return self;
        },

        /**
         * Listen to a custom event and remove it once fired.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @return {Howl}
         */
        once: function(event, fn, id) {
          var self = this;

          // Setup the event listener.
          self.on(event, fn, id, 1);

          return self;
        },

        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(event, id, msg) {
          var self = this;
          var events = self['_on' + event];

          // Loop through event store and fire all functions.
          for (var i=events.length-1; i>=0; i--) {
            // Only fire the listener if the correct ID is used.
            if (!events[i].id || events[i].id === id || event === 'load') {
              setTimeout(function(fn) {
                fn.call(this, id, msg);
              }.bind(self, events[i].fn), 0);

              // If this event was setup with `once`, remove it.
              if (events[i].once) {
                self.off(event, events[i].fn, events[i].id);
              }
            }
          }

          // Pass the event type into load queue so that it can continue stepping.
          self._loadQueue(event);

          return self;
        },

        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Howl}
         */
        _loadQueue: function(event) {
          var self = this;

          if (self._queue.length > 0) {
            var task = self._queue[0];

            // Remove this task if a matching event was passed.
            if (task.event === event) {
              self._queue.shift();
              self._loadQueue();
            }

            // Run the task if no event type is passed.
            if (!event) {
              task.action();
            }
          }

          return self;
        },

        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(sound) {
          var self = this;
          var sprite = sound._sprite;

          // If we are using IE and there was network latency we may be clipping
          // audio before it completes playing. Lets check the node to make sure it
          // believes it has completed, before ending the playback.
          if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
            setTimeout(self._ended.bind(self, sound), 100);
            return self;
          }

          // Should this sound loop?
          var loop = !!(sound._loop || self._sprite[sprite][2]);

          // Fire the ended event.
          self._emit('end', sound._id);

          // Restart the playback for HTML5 Audio loop.
          if (!self._webAudio && loop) {
            self.stop(sound._id, true).play(sound._id);
          }

          // Restart this timer if on a Web Audio loop.
          if (self._webAudio && loop) {
            self._emit('play', sound._id);
            sound._seek = sound._start || 0;
            sound._rateSeek = 0;
            sound._playStart = Howler.ctx.currentTime;

            var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
            self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
          }

          // Mark the node as paused.
          if (self._webAudio && !loop) {
            sound._paused = true;
            sound._ended = true;
            sound._seek = sound._start || 0;
            sound._rateSeek = 0;
            self._clearTimer(sound._id);

            // Clean up the buffer source.
            self._cleanBuffer(sound._node);

            // Attempt to auto-suspend AudioContext if no sounds are still playing.
            Howler._autoSuspend();
          }

          // When using a sprite, end the track.
          if (!self._webAudio && !loop) {
            self.stop(sound._id, true);
          }

          return self;
        },

        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(id) {
          var self = this;

          if (self._endTimers[id]) {
            // Clear the timeout or remove the ended listener.
            if (typeof self._endTimers[id] !== 'function') {
              clearTimeout(self._endTimers[id]);
            } else {
              var sound = self._soundById(id);
              if (sound && sound._node) {
                sound._node.removeEventListener('ended', self._endTimers[id], false);
              }
            }

            delete self._endTimers[id];
          }

          return self;
        },

        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(id) {
          var self = this;

          // Loop through all sounds and find the one with this ID.
          for (var i=0; i<self._sounds.length; i++) {
            if (id === self._sounds[i]._id) {
              return self._sounds[i];
            }
          }

          return null;
        },

        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var self = this;

          self._drain();

          // Find the first inactive node to recycle.
          for (var i=0; i<self._sounds.length; i++) {
            if (self._sounds[i]._ended) {
              return self._sounds[i].reset();
            }
          }

          // If no inactive node was found, create a new one.
          return new Sound(self);
        },

        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var self = this;
          var limit = self._pool;
          var cnt = 0;
          var i = 0;

          // If there are less sounds than the max pool size, we are done.
          if (self._sounds.length < limit) {
            return;
          }

          // Count the number of inactive sounds.
          for (i=0; i<self._sounds.length; i++) {
            if (self._sounds[i]._ended) {
              cnt++;
            }
          }

          // Remove excess inactive sounds, going in reverse order.
          for (i=self._sounds.length - 1; i>=0; i--) {
            if (cnt <= limit) {
              return;
            }

            if (self._sounds[i]._ended) {
              // Disconnect the audio source when using Web Audio.
              if (self._webAudio && self._sounds[i]._node) {
                self._sounds[i]._node.disconnect(0);
              }

              // Remove sounds until we have the pool size.
              self._sounds.splice(i, 1);
              cnt--;
            }
          }
        },

        /**
         * Get all ID's from the sounds pool.
         * @param  {Number} id Only return one ID if one is passed.
         * @return {Array}    Array of IDs.
         */
        _getSoundIds: function(id) {
          var self = this;

          if (typeof id === 'undefined') {
            var ids = [];
            for (var i=0; i<self._sounds.length; i++) {
              ids.push(self._sounds[i]._id);
            }

            return ids;
          } else {
            return [id];
          }
        },

        /**
         * Load the sound back into the buffer source.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _refreshBuffer: function(sound) {
          var self = this;

          // Setup the buffer source for playback.
          sound._node.bufferSource = Howler.ctx.createBufferSource();
          sound._node.bufferSource.buffer = cache[self._src];

          // Connect to the correct node.
          if (sound._panner) {
            sound._node.bufferSource.connect(sound._panner);
          } else {
            sound._node.bufferSource.connect(sound._node);
          }

          // Setup looping and playback rate.
          sound._node.bufferSource.loop = sound._loop;
          if (sound._loop) {
            sound._node.bufferSource.loopStart = sound._start || 0;
            sound._node.bufferSource.loopEnd = sound._stop || 0;
          }
          sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx.currentTime);

          return self;
        },

        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(node) {
          var self = this;
          var isIOS = Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;

          if (Howler._scratchBuffer && node.bufferSource) {
            node.bufferSource.onended = null;
            node.bufferSource.disconnect(0);
            if (isIOS) {
              try { node.bufferSource.buffer = Howler._scratchBuffer; } catch(e) {}
            }
          }
          node.bufferSource = null;

          return self;
        }
      };

      /** Single Sound Methods **/
      /***************************************************************************/

      /**
       * Setup the sound object, which each node attached to a Howl group is contained in.
       * @param {Object} howl The Howl parent group.
       */
      var Sound = function(howl) {
        this._parent = howl;
        this.init();
      };
      Sound.prototype = {
        /**
         * Initialize a new Sound object.
         * @return {Sound}
         */
        init: function() {
          var self = this;
          var parent = self._parent;

          // Setup the default parameters.
          self._muted = parent._muted;
          self._loop = parent._loop;
          self._volume = parent._volume;
          self._rate = parent._rate;
          self._seek = 0;
          self._paused = true;
          self._ended = true;
          self._sprite = '__default';

          // Generate a unique ID for this sound.
          self._id = ++Howler._counter;

          // Add itself to the parent's pool.
          parent._sounds.push(self);

          // Create the new node.
          self.create();

          return self;
        },

        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var self = this;
          var parent = self._parent;
          var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume;

          if (parent._webAudio) {
            // Create the gain node for controlling volume (the source will connect to this).
            self._node = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
            self._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
            self._node.paused = true;
            self._node.connect(Howler.masterGain);
          } else {
            // Get an unlocked Audio object from the pool.
            self._node = Howler._obtainHtml5Audio();

            // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
            self._errorFn = self._errorListener.bind(self);
            self._node.addEventListener('error', self._errorFn, false);

            // Listen for 'canplaythrough' event to let us know the sound is ready.
            self._loadFn = self._loadListener.bind(self);
            self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);

            // Setup the new audio node.
            self._node.src = parent._src;
            self._node.preload = 'auto';
            self._node.volume = volume * Howler.volume();

            // Begin loading the source.
            self._node.load();
          }

          return self;
        },

        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var self = this;
          var parent = self._parent;

          // Reset all of the parameters of this sound.
          self._muted = parent._muted;
          self._loop = parent._loop;
          self._volume = parent._volume;
          self._rate = parent._rate;
          self._seek = 0;
          self._rateSeek = 0;
          self._paused = true;
          self._ended = true;
          self._sprite = '__default';

          // Generate a new ID so that it isn't confused with the previous sound.
          self._id = ++Howler._counter;

          return self;
        },

        /**
         * HTML5 Audio error listener callback.
         */
        _errorListener: function() {
          var self = this;

          // Fire an error event and pass back the code.
          self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);

          // Clear the event listener.
          self._node.removeEventListener('error', self._errorFn, false);
        },

        /**
         * HTML5 Audio canplaythrough listener callback.
         */
        _loadListener: function() {
          var self = this;
          var parent = self._parent;

          // Round up the duration to account for the lower precision in HTML5 Audio.
          parent._duration = Math.ceil(self._node.duration * 10) / 10;

          // Setup a sprite if none is defined.
          if (Object.keys(parent._sprite).length === 0) {
            parent._sprite = {__default: [0, parent._duration * 1000]};
          }

          if (parent._state !== 'loaded') {
            parent._state = 'loaded';
            parent._emit('load');
            parent._loadQueue();
          }

          // Clear the event listener.
          self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
        }
      };

      /** Helper Methods **/
      /***************************************************************************/

      var cache = {};

      /**
       * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
       * @param  {Howl} self
       */
      var loadBuffer = function(self) {
        var url = self._src;

        // Check if the buffer has already been cached and use it instead.
        if (cache[url]) {
          // Set the duration from the cache.
          self._duration = cache[url].duration;

          // Load the sound into this Howl.
          loadSound(self);

          return;
        }

        if (/^data:[^;]+;base64,/.test(url)) {
          // Decode the base64 data URI without XHR, since some browsers don't support it.
          var data = atob(url.split(',')[1]);
          var dataView = new Uint8Array(data.length);
          for (var i=0; i<data.length; ++i) {
            dataView[i] = data.charCodeAt(i);
          }

          decodeAudioData(dataView.buffer, self);
        } else {
          // Load the buffer from the URL.
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.withCredentials = self._xhrWithCredentials;
          xhr.responseType = 'arraybuffer';
          xhr.onload = function() {
            // Make sure we get a successful response back.
            var code = (xhr.status + '')[0];
            if (code !== '0' && code !== '2' && code !== '3') {
              self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
              return;
            }

            decodeAudioData(xhr.response, self);
          };
          xhr.onerror = function() {
            // If there is an error, switch to HTML5 Audio.
            if (self._webAudio) {
              self._html5 = true;
              self._webAudio = false;
              self._sounds = [];
              delete cache[url];
              self.load();
            }
          };
          safeXhrSend(xhr);
        }
      };

      /**
       * Send the XHR request wrapped in a try/catch.
       * @param  {Object} xhr XHR to send.
       */
      var safeXhrSend = function(xhr) {
        try {
          xhr.send();
        } catch (e) {
          xhr.onerror();
        }
      };

      /**
       * Decode audio data from an array buffer.
       * @param  {ArrayBuffer} arraybuffer The audio data.
       * @param  {Howl}        self
       */
      var decodeAudioData = function(arraybuffer, self) {
        // Fire a load error if something broke.
        var error = function() {
          self._emit('loaderror', null, 'Decoding audio data failed.');
        };

        // Load the sound on success.
        var success = function(buffer) {
          if (buffer && self._sounds.length > 0) {
            cache[self._src] = buffer;
            loadSound(self, buffer);
          } else {
            error();
          }
        };

        // Decode the buffer into an audio source.
        if (typeof Promise !== 'undefined' && Howler.ctx.decodeAudioData.length === 1) {
          Howler.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
        } else {
          Howler.ctx.decodeAudioData(arraybuffer, success, error);
        }
      };

      /**
       * Sound is now loaded, so finish setting everything up and fire the loaded event.
       * @param  {Howl} self
       * @param  {Object} buffer The decoded buffer sound source.
       */
      var loadSound = function(self, buffer) {
        // Set the duration.
        if (buffer && !self._duration) {
          self._duration = buffer.duration;
        }

        // Setup a sprite if none is defined.
        if (Object.keys(self._sprite).length === 0) {
          self._sprite = {__default: [0, self._duration * 1000]};
        }

        // Fire the loaded event.
        if (self._state !== 'loaded') {
          self._state = 'loaded';
          self._emit('load');
          self._loadQueue();
        }
      };

      /**
       * Setup the audio context when available, or switch to HTML5 Audio mode.
       */
      var setupAudioContext = function() {
        // If we have already detected that Web Audio isn't supported, don't run this step again.
        if (!Howler.usingWebAudio) {
          return;
        }

        // Check if we are using Web Audio and setup the AudioContext if we are.
        try {
          if (typeof AudioContext !== 'undefined') {
            Howler.ctx = new AudioContext();
          } else if (typeof webkitAudioContext !== 'undefined') {
            Howler.ctx = new webkitAudioContext();
          } else {
            Howler.usingWebAudio = false;
          }
        } catch(e) {
          Howler.usingWebAudio = false;
        }

        // If the audio context creation still failed, set using web audio to false.
        if (!Howler.ctx) {
          Howler.usingWebAudio = false;
        }

        // Check if a webview is being used on iOS8 or earlier (rather than the browser).
        // If it is, disable Web Audio as it causes crashing.
        var iOS = (/iP(hone|od|ad)/.test(Howler._navigator && Howler._navigator.platform));
        var appVersion = Howler._navigator && Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
        var version = appVersion ? parseInt(appVersion[1], 10) : null;
        if (iOS && version && version < 9) {
          var safari = /safari/.test(Howler._navigator && Howler._navigator.userAgent.toLowerCase());
          if (Howler._navigator && Howler._navigator.standalone && !safari || Howler._navigator && !Howler._navigator.standalone && !safari) {
            Howler.usingWebAudio = false;
          }
        }

        // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
        if (Howler.usingWebAudio) {
          Howler.masterGain = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
          Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : 1, Howler.ctx.currentTime);
          Howler.masterGain.connect(Howler.ctx.destination);
        }

        // Re-run the setup on Howler.
        Howler._setup();
      };

      // Add support for CommonJS libraries such as browserify.
      {
        exports.Howler = Howler;
        exports.Howl = Howl;
      }

      // Define globally in case AMD is not available or unused.
      if (typeof window !== 'undefined') {
        window.HowlerGlobal = HowlerGlobal;
        window.Howler = Howler;
        window.Howl = Howl;
        window.Sound = Sound;
      } else if (typeof commonjsGlobal !== 'undefined') { // Add to global in Node.js (for testing, etc).
        commonjsGlobal.HowlerGlobal = HowlerGlobal;
        commonjsGlobal.Howler = Howler;
        commonjsGlobal.Howl = Howl;
        commonjsGlobal.Sound = Sound;
      }
    })();


    /*!
     *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
     *  
     *  howler.js v2.1.1
     *  howlerjs.com
     *
     *  (c) 2013-2018, James Simpson of GoldFire Studios
     *  goldfirestudios.com
     *
     *  MIT License
     */

    (function() {

      // Setup default properties.
      HowlerGlobal.prototype._pos = [0, 0, 0];
      HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];

      /** Global Methods **/
      /***************************************************************************/

      /**
       * Helper method to update the stereo panning position of all current Howls.
       * Future Howls will not use this value unless explicitly set.
       * @param  {Number} pan A value of -1.0 is all the way left and 1.0 is all the way right.
       * @return {Howler/Number}     Self or current stereo panning value.
       */
      HowlerGlobal.prototype.stereo = function(pan) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // Loop through all Howls and update their stereo panning.
        for (var i=self._howls.length-1; i>=0; i--) {
          self._howls[i].stereo(pan);
        }

        return self;
      };

      /**
       * Get/set the position of the listener in 3D cartesian space. Sounds using
       * 3D position will be relative to the listener's position.
       * @param  {Number} x The x-position of the listener.
       * @param  {Number} y The y-position of the listener.
       * @param  {Number} z The z-position of the listener.
       * @return {Howler/Array}   Self or current listener position.
       */
      HowlerGlobal.prototype.pos = function(x, y, z) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // Set the defaults for optional 'y' & 'z'.
        y = (typeof y !== 'number') ? self._pos[1] : y;
        z = (typeof z !== 'number') ? self._pos[2] : z;

        if (typeof x === 'number') {
          self._pos = [x, y, z];

          if (typeof self.ctx.listener.positionX !== 'undefined') {
            self.ctx.listener.positionX.setTargetAtTime(self._pos[0], Howler.ctx.currentTime, 0.1);
            self.ctx.listener.positionY.setTargetAtTime(self._pos[1], Howler.ctx.currentTime, 0.1);
            self.ctx.listener.positionZ.setTargetAtTime(self._pos[2], Howler.ctx.currentTime, 0.1);
          } else {
            self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
          }
        } else {
          return self._pos;
        }

        return self;
      };

      /**
       * Get/set the direction the listener is pointing in the 3D cartesian space.
       * A front and up vector must be provided. The front is the direction the
       * face of the listener is pointing, and up is the direction the top of the
       * listener is pointing. Thus, these values are expected to be at right angles
       * from each other.
       * @param  {Number} x   The x-orientation of the listener.
       * @param  {Number} y   The y-orientation of the listener.
       * @param  {Number} z   The z-orientation of the listener.
       * @param  {Number} xUp The x-orientation of the top of the listener.
       * @param  {Number} yUp The y-orientation of the top of the listener.
       * @param  {Number} zUp The z-orientation of the top of the listener.
       * @return {Howler/Array}     Returns self or the current orientation vectors.
       */
      HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // Set the defaults for optional 'y' & 'z'.
        var or = self._orientation;
        y = (typeof y !== 'number') ? or[1] : y;
        z = (typeof z !== 'number') ? or[2] : z;
        xUp = (typeof xUp !== 'number') ? or[3] : xUp;
        yUp = (typeof yUp !== 'number') ? or[4] : yUp;
        zUp = (typeof zUp !== 'number') ? or[5] : zUp;

        if (typeof x === 'number') {
          self._orientation = [x, y, z, xUp, yUp, zUp];

          if (typeof self.ctx.listener.forwardX !== 'undefined') {
            self.ctx.listener.forwardX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
            self.ctx.listener.forwardY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
            self.ctx.listener.forwardZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
            self.ctx.listener.upX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
            self.ctx.listener.upY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
            self.ctx.listener.upZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
          } else {
            self.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
          }
        } else {
          return or;
        }

        return self;
      };

      /** Group Methods **/
      /***************************************************************************/

      /**
       * Add new properties to the core init.
       * @param  {Function} _super Core init method.
       * @return {Howl}
       */
      Howl.prototype.init = (function(_super) {
        return function(o) {
          var self = this;

          // Setup user-defined default properties.
          self._orientation = o.orientation || [1, 0, 0];
          self._stereo = o.stereo || null;
          self._pos = o.pos || null;
          self._pannerAttr = {
            coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : 360,
            coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : 360,
            coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : 0,
            distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : 'inverse',
            maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : 10000,
            panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : 'HRTF',
            refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : 1,
            rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : 1
          };

          // Setup event listeners.
          self._onstereo = o.onstereo ? [{fn: o.onstereo}] : [];
          self._onpos = o.onpos ? [{fn: o.onpos}] : [];
          self._onorientation = o.onorientation ? [{fn: o.onorientation}] : [];

          // Complete initilization with howler.js core's init function.
          return _super.call(this, o);
        };
      })(Howl.prototype.init);

      /**
       * Get/set the stereo panning of the audio source for this sound or all in the group.
       * @param  {Number} pan  A value of -1.0 is all the way left and 1.0 is all the way right.
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl/Number}    Returns self or the current stereo panning value.
       */
      Howl.prototype.stereo = function(pan, id) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }

        // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'stereo',
            action: function() {
              self.stereo(pan, id);
            }
          });

          return self;
        }

        // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist.
        var pannerType = (typeof Howler.ctx.createStereoPanner === 'undefined') ? 'spatial' : 'stereo';

        // Setup the group's stereo panning if no ID is passed.
        if (typeof id === 'undefined') {
          // Return the group's stereo panning if no parameters are passed.
          if (typeof pan === 'number') {
            self._stereo = pan;
            self._pos = [pan, 0, 0];
          } else {
            return self._stereo;
          }
        }

        // Change the streo panning of one or all sounds in group.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound) {
            if (typeof pan === 'number') {
              sound._stereo = pan;
              sound._pos = [pan, 0, 0];

              if (sound._node) {
                // If we are falling back, make sure the panningModel is equalpower.
                sound._pannerAttr.panningModel = 'equalpower';

                // Check if there is a panner setup and create a new one if not.
                if (!sound._panner || !sound._panner.pan) {
                  setupPanner(sound, pannerType);
                }

                if (pannerType === 'spatial') {
                  if (typeof sound._panner.positionX !== 'undefined') {
                    sound._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
                    sound._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
                    sound._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
                  } else {
                    sound._panner.setPosition(pan, 0, 0);
                  }
                } else {
                  sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
                }
              }

              self._emit('stereo', sound._id);
            } else {
              return sound._stereo;
            }
          }
        }

        return self;
      };

      /**
       * Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
       * @param  {Number} x  The x-position of the audio source.
       * @param  {Number} y  The y-position of the audio source.
       * @param  {Number} z  The z-position of the audio source.
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl/Array}    Returns self or the current 3D spatial position: [x, y, z].
       */
      Howl.prototype.pos = function(x, y, z, id) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }

        // If the sound hasn't loaded, add it to the load queue to change position when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'pos',
            action: function() {
              self.pos(x, y, z, id);
            }
          });

          return self;
        }

        // Set the defaults for optional 'y' & 'z'.
        y = (typeof y !== 'number') ? 0 : y;
        z = (typeof z !== 'number') ? -0.5 : z;

        // Setup the group's spatial position if no ID is passed.
        if (typeof id === 'undefined') {
          // Return the group's spatial position if no parameters are passed.
          if (typeof x === 'number') {
            self._pos = [x, y, z];
          } else {
            return self._pos;
          }
        }

        // Change the spatial position of one or all sounds in group.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound) {
            if (typeof x === 'number') {
              sound._pos = [x, y, z];

              if (sound._node) {
                // Check if there is a panner setup and create a new one if not.
                if (!sound._panner || sound._panner.pan) {
                  setupPanner(sound, 'spatial');
                }

                if (typeof sound._panner.positionX !== 'undefined') {
                  sound._panner.positionX.setValueAtTime(x, Howler.ctx.currentTime);
                  sound._panner.positionY.setValueAtTime(y, Howler.ctx.currentTime);
                  sound._panner.positionZ.setValueAtTime(z, Howler.ctx.currentTime);
                } else {
                  sound._panner.setPosition(x, y, z);
                }
              }

              self._emit('pos', sound._id);
            } else {
              return sound._pos;
            }
          }
        }

        return self;
      };

      /**
       * Get/set the direction the audio source is pointing in the 3D cartesian coordinate
       * space. Depending on how direction the sound is, based on the `cone` attributes,
       * a sound pointing away from the listener can be quiet or silent.
       * @param  {Number} x  The x-orientation of the source.
       * @param  {Number} y  The y-orientation of the source.
       * @param  {Number} z  The z-orientation of the source.
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl/Array}    Returns self or the current 3D spatial orientation: [x, y, z].
       */
      Howl.prototype.orientation = function(x, y, z, id) {
        var self = this;

        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }

        // If the sound hasn't loaded, add it to the load queue to change orientation when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'orientation',
            action: function() {
              self.orientation(x, y, z, id);
            }
          });

          return self;
        }

        // Set the defaults for optional 'y' & 'z'.
        y = (typeof y !== 'number') ? self._orientation[1] : y;
        z = (typeof z !== 'number') ? self._orientation[2] : z;

        // Setup the group's spatial orientation if no ID is passed.
        if (typeof id === 'undefined') {
          // Return the group's spatial orientation if no parameters are passed.
          if (typeof x === 'number') {
            self._orientation = [x, y, z];
          } else {
            return self._orientation;
          }
        }

        // Change the spatial orientation of one or all sounds in group.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);

          if (sound) {
            if (typeof x === 'number') {
              sound._orientation = [x, y, z];

              if (sound._node) {
                // Check if there is a panner setup and create a new one if not.
                if (!sound._panner) {
                  // Make sure we have a position to setup the node with.
                  if (!sound._pos) {
                    sound._pos = self._pos || [0, 0, -0.5];
                  }

                  setupPanner(sound, 'spatial');
                }

                if (typeof sound._panner.orientationX !== 'undefined') {
                  sound._panner.orientationX.setValueAtTime(x, Howler.ctx.currentTime);
                  sound._panner.orientationY.setValueAtTime(y, Howler.ctx.currentTime);
                  sound._panner.orientationZ.setValueAtTime(z, Howler.ctx.currentTime);
                } else {
                  sound._panner.setOrientation(x, y, z);
                }
              }

              self._emit('orientation', sound._id);
            } else {
              return sound._orientation;
            }
          }
        }

        return self;
      };

      /**
       * Get/set the panner node's attributes for a sound or group of sounds.
       * This method can optionall take 0, 1 or 2 arguments.
       *   pannerAttr() -> Returns the group's values.
       *   pannerAttr(id) -> Returns the sound id's values.
       *   pannerAttr(o) -> Set's the values of all sounds in this Howl group.
       *   pannerAttr(o, id) -> Set's the values of passed sound id.
       *
       *   Attributes:
       *     coneInnerAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
       *                      inside of which there will be no volume reduction.
       *     coneOuterAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
       *                      outside of which the volume will be reduced to a constant value of `coneOuterGain`.
       *     coneOuterGain - (0 by default) A parameter for directional audio sources, this is the gain outside of the
       *                     `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
       *     distanceModel - ('inverse' by default) Determines algorithm used to reduce volume as audio moves away from
       *                     listener. Can be `linear`, `inverse` or `exponential.
       *     maxDistance - (10000 by default) The maximum distance between source and listener, after which the volume
       *                   will not be reduced any further.
       *     refDistance - (1 by default) A reference distance for reducing volume as source moves further from the listener.
       *                   This is simply a variable of the distance model and has a different effect depending on which model
       *                   is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
       *     rolloffFactor - (1 by default) How quickly the volume reduces as source moves from listener. This is simply a
       *                     variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]`
       *                     with `inverse` and `exponential`.
       *     panningModel - ('HRTF' by default) Determines which spatialization algorithm is used to position audio.
       *                     Can be `HRTF` or `equalpower`.
       *
       * @return {Howl/Object} Returns self or current panner attributes.
       */
      Howl.prototype.pannerAttr = function() {
        var self = this;
        var args = arguments;
        var o, id, sound;

        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }

        // Determine the values based on arguments.
        if (args.length === 0) {
          // Return the group's panner attribute values.
          return self._pannerAttr;
        } else if (args.length === 1) {
          if (typeof args[0] === 'object') {
            o = args[0];

            // Set the grou's panner attribute values.
            if (typeof id === 'undefined') {
              if (!o.pannerAttr) {
                o.pannerAttr = {
                  coneInnerAngle: o.coneInnerAngle,
                  coneOuterAngle: o.coneOuterAngle,
                  coneOuterGain: o.coneOuterGain,
                  distanceModel: o.distanceModel,
                  maxDistance: o.maxDistance,
                  refDistance: o.refDistance,
                  rolloffFactor: o.rolloffFactor,
                  panningModel: o.panningModel
                };
              }

              self._pannerAttr = {
                coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== 'undefined' ? o.pannerAttr.coneInnerAngle : self._coneInnerAngle,
                coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== 'undefined' ? o.pannerAttr.coneOuterAngle : self._coneOuterAngle,
                coneOuterGain: typeof o.pannerAttr.coneOuterGain !== 'undefined' ? o.pannerAttr.coneOuterGain : self._coneOuterGain,
                distanceModel: typeof o.pannerAttr.distanceModel !== 'undefined' ? o.pannerAttr.distanceModel : self._distanceModel,
                maxDistance: typeof o.pannerAttr.maxDistance !== 'undefined' ? o.pannerAttr.maxDistance : self._maxDistance,
                refDistance: typeof o.pannerAttr.refDistance !== 'undefined' ? o.pannerAttr.refDistance : self._refDistance,
                rolloffFactor: typeof o.pannerAttr.rolloffFactor !== 'undefined' ? o.pannerAttr.rolloffFactor : self._rolloffFactor,
                panningModel: typeof o.pannerAttr.panningModel !== 'undefined' ? o.pannerAttr.panningModel : self._panningModel
              };
            }
          } else {
            // Return this sound's panner attribute values.
            sound = self._soundById(parseInt(args[0], 10));
            return sound ? sound._pannerAttr : self._pannerAttr;
          }
        } else if (args.length === 2) {
          o = args[0];
          id = parseInt(args[1], 10);
        }

        // Update the values of the specified sounds.
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          sound = self._soundById(ids[i]);

          if (sound) {
            // Merge the new values into the sound.
            var pa = sound._pannerAttr;
            pa = {
              coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
              coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
              coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
              distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
              maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
              refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
              rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
              panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel
            };

            // Update the panner values or create a new panner if none exists.
            var panner = sound._panner;
            if (panner) {
              panner.coneInnerAngle = pa.coneInnerAngle;
              panner.coneOuterAngle = pa.coneOuterAngle;
              panner.coneOuterGain = pa.coneOuterGain;
              panner.distanceModel = pa.distanceModel;
              panner.maxDistance = pa.maxDistance;
              panner.refDistance = pa.refDistance;
              panner.rolloffFactor = pa.rolloffFactor;
              panner.panningModel = pa.panningModel;
            } else {
              // Make sure we have a position to setup the node with.
              if (!sound._pos) {
                sound._pos = self._pos || [0, 0, -0.5];
              }

              // Create a new panner node.
              setupPanner(sound, 'spatial');
            }
          }
        }

        return self;
      };

      /** Single Sound Methods **/
      /***************************************************************************/

      /**
       * Add new properties to the core Sound init.
       * @param  {Function} _super Core Sound init method.
       * @return {Sound}
       */
      Sound.prototype.init = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;

          // Setup user-defined default properties.
          self._orientation = parent._orientation;
          self._stereo = parent._stereo;
          self._pos = parent._pos;
          self._pannerAttr = parent._pannerAttr;

          // Complete initilization with howler.js core Sound's init function.
          _super.call(this);

          // If a stereo or position was specified, set it up.
          if (self._stereo) {
            parent.stereo(self._stereo);
          } else if (self._pos) {
            parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
          }
        };
      })(Sound.prototype.init);

      /**
       * Override the Sound.reset method to clean up properties from the spatial plugin.
       * @param  {Function} _super Sound reset method.
       * @return {Sound}
       */
      Sound.prototype.reset = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;

          // Reset all spatial plugin properties on this sound.
          self._orientation = parent._orientation;
          self._stereo = parent._stereo;
          self._pos = parent._pos;
          self._pannerAttr = parent._pannerAttr;

          // If a stereo or position was specified, set it up.
          if (self._stereo) {
            parent.stereo(self._stereo);
          } else if (self._pos) {
            parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
          } else if (self._panner) {
            // Disconnect the panner.
            self._panner.disconnect(0);
            self._panner = undefined;
            parent._refreshBuffer(self);
          }

          // Complete resetting of the sound.
          return _super.call(this);
        };
      })(Sound.prototype.reset);

      /** Helper Methods **/
      /***************************************************************************/

      /**
       * Create a new panner node and save it on the sound.
       * @param  {Sound} sound Specific sound to setup panning on.
       * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
       */
      var setupPanner = function(sound, type) {
        type = type || 'spatial';

        // Create the new panner node.
        if (type === 'spatial') {
          sound._panner = Howler.ctx.createPanner();
          sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
          sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
          sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
          sound._panner.distanceModel = sound._pannerAttr.distanceModel;
          sound._panner.maxDistance = sound._pannerAttr.maxDistance;
          sound._panner.refDistance = sound._pannerAttr.refDistance;
          sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
          sound._panner.panningModel = sound._pannerAttr.panningModel;

          if (typeof sound._panner.positionX !== 'undefined') {
            sound._panner.positionX.setValueAtTime(sound._pos[0], Howler.ctx.currentTime);
            sound._panner.positionY.setValueAtTime(sound._pos[1], Howler.ctx.currentTime);
            sound._panner.positionZ.setValueAtTime(sound._pos[2], Howler.ctx.currentTime);
          } else {
            sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
          }

          if (typeof sound._panner.orientationX !== 'undefined') {
            sound._panner.orientationX.setValueAtTime(sound._orientation[0], Howler.ctx.currentTime);
            sound._panner.orientationY.setValueAtTime(sound._orientation[1], Howler.ctx.currentTime);
            sound._panner.orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx.currentTime);
          } else {
            sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
          }
        } else {
          sound._panner = Howler.ctx.createStereoPanner();
          sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
        }

        sound._panner.connect(sound._node);

        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id, true);
        }
      };
    })();
    });
    var howler_1 = howler.Howler;
    var howler_2 = howler.Howl;

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter() {
      EventEmitter.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.usingDomains = false;

    EventEmitter.prototype.domain = undefined;
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function() {
      this.domain = null;
      if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active && !(this instanceof domain.Domain)) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };

    EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };

    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
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

    		this.sound = new howler_2(spritesheet_config);
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
    				howler_1.volume(this.volume.current);
    			}});

    		} else {

    			this.rawAnimation(target_volume, duration);
    		}
    	}


    	setMasterVolume (volume_amount) {

    		this.volume.current = volume_amount;
    		howler_1.volume(this.volume.current);
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
    				howler_1.volume(new_volume);

    				window.setTimeout(animate, FPS);

    			} else {

    				this.volume.current = target_volume;
    				howler_1.volume(target_volume);
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

    /*! @vimeo/player v2.8.2 | (c) 2019 Vimeo | MIT License | https://github.com/vimeo/player.js */
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    /**
     * @module lib/functions
     */

    /**
     * Check to see this is a node environment.
     * @type {Boolean}
     */

    /* global global */
    var isNode = typeof global !== 'undefined' && {}.toString.call(global) === '[object global]';
    /**
     * Get the name of the method for a given getter or setter.
     *
     * @param {string} prop The name of the property.
     * @param {string} type Either “get” or “set”.
     * @return {string}
     */

    function getMethodName(prop, type) {
      if (prop.indexOf(type.toLowerCase()) === 0) {
        return prop;
      }

      return "".concat(type.toLowerCase()).concat(prop.substr(0, 1).toUpperCase()).concat(prop.substr(1));
    }
    /**
     * Check to see if the object is a DOM Element.
     *
     * @param {*} element The object to check.
     * @return {boolean}
     */

    function isDomElement(element) {
      return Boolean(element && element.nodeType === 1 && 'nodeName' in element && element.ownerDocument && element.ownerDocument.defaultView);
    }
    /**
     * Check to see whether the value is a number.
     *
     * @see http://dl.dropboxusercontent.com/u/35146/js/tests/isNumber.html
     * @param {*} value The value to check.
     * @param {boolean} integer Check if the value is an integer.
     * @return {boolean}
     */

    function isInteger(value) {
      // eslint-disable-next-line eqeqeq
      return !isNaN(parseFloat(value)) && isFinite(value) && Math.floor(value) == value;
    }
    /**
     * Check to see if the URL is a Vimeo url.
     *
     * @param {string} url The url string.
     * @return {boolean}
     */

    function isVimeoUrl(url) {
      return /^(https?:)?\/\/((player|www)\.)?vimeo\.com(?=$|\/)/.test(url);
    }
    /**
     * Get the Vimeo URL from an element.
     * The element must have either a data-vimeo-id or data-vimeo-url attribute.
     *
     * @param {object} oEmbedParameters The oEmbed parameters.
     * @return {string}
     */

    function getVimeoUrl() {
      var oEmbedParameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var id = oEmbedParameters.id;
      var url = oEmbedParameters.url;
      var idOrUrl = id || url;

      if (!idOrUrl) {
        throw new Error('An id or url must be passed, either in an options object or as a data-vimeo-id or data-vimeo-url attribute.');
      }

      if (isInteger(idOrUrl)) {
        return "https://vimeo.com/".concat(idOrUrl);
      }

      if (isVimeoUrl(idOrUrl)) {
        return idOrUrl.replace('http:', 'https:');
      }

      if (id) {
        throw new TypeError("\u201C".concat(id, "\u201D is not a valid video id."));
      }

      throw new TypeError("\u201C".concat(idOrUrl, "\u201D is not a vimeo.com url."));
    }

    var arrayIndexOfSupport = typeof Array.prototype.indexOf !== 'undefined';
    var postMessageSupport = typeof window !== 'undefined' && typeof window.postMessage !== 'undefined';

    if (!isNode && (!arrayIndexOfSupport || !postMessageSupport)) {
      throw new Error('Sorry, the Vimeo Player API is not available in this browser.');
    }

    var commonjsGlobal$1 = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule$1(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    /*!
     * weakmap-polyfill v2.0.0 - ECMAScript6 WeakMap polyfill
     * https://github.com/polygonplanet/weakmap-polyfill
     * Copyright (c) 2015-2016 polygon planet <polygon.planet.aqua@gmail.com>
     * @license MIT
     */
    (function (self) {

      if (self.WeakMap) {
        return;
      }

      var hasOwnProperty = Object.prototype.hasOwnProperty;

      var defineProperty = function (object, name, value) {
        if (Object.defineProperty) {
          Object.defineProperty(object, name, {
            configurable: true,
            writable: true,
            value: value
          });
        } else {
          object[name] = value;
        }
      };

      self.WeakMap = function () {
        // ECMA-262 23.3 WeakMap Objects
        function WeakMap() {
          if (this === void 0) {
            throw new TypeError("Constructor WeakMap requires 'new'");
          }

          defineProperty(this, '_id', genId('_WeakMap')); // ECMA-262 23.3.1.1 WeakMap([iterable])

          if (arguments.length > 0) {
            // Currently, WeakMap `iterable` argument is not supported
            throw new TypeError('WeakMap iterable is not supported');
          }
        } // ECMA-262 23.3.3.2 WeakMap.prototype.delete(key)


        defineProperty(WeakMap.prototype, 'delete', function (key) {
          checkInstance(this, 'delete');

          if (!isObject(key)) {
            return false;
          }

          var entry = key[this._id];

          if (entry && entry[0] === key) {
            delete key[this._id];
            return true;
          }

          return false;
        }); // ECMA-262 23.3.3.3 WeakMap.prototype.get(key)

        defineProperty(WeakMap.prototype, 'get', function (key) {
          checkInstance(this, 'get');

          if (!isObject(key)) {
            return void 0;
          }

          var entry = key[this._id];

          if (entry && entry[0] === key) {
            return entry[1];
          }

          return void 0;
        }); // ECMA-262 23.3.3.4 WeakMap.prototype.has(key)

        defineProperty(WeakMap.prototype, 'has', function (key) {
          checkInstance(this, 'has');

          if (!isObject(key)) {
            return false;
          }

          var entry = key[this._id];

          if (entry && entry[0] === key) {
            return true;
          }

          return false;
        }); // ECMA-262 23.3.3.5 WeakMap.prototype.set(key, value)

        defineProperty(WeakMap.prototype, 'set', function (key, value) {
          checkInstance(this, 'set');

          if (!isObject(key)) {
            throw new TypeError('Invalid value used as weak map key');
          }

          var entry = key[this._id];

          if (entry && entry[0] === key) {
            entry[1] = value;
            return this;
          }

          defineProperty(key, this._id, [key, value]);
          return this;
        });

        function checkInstance(x, methodName) {
          if (!isObject(x) || !hasOwnProperty.call(x, '_id')) {
            throw new TypeError(methodName + ' method called on incompatible receiver ' + typeof x);
          }
        }

        function genId(prefix) {
          return prefix + '_' + rand() + '.' + rand();
        }

        function rand() {
          return Math.random().toString().substring(2);
        }

        defineProperty(WeakMap, '_polyfill', true);
        return WeakMap;
      }();

      function isObject(x) {
        return Object(x) === x;
      }
    })(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof commonjsGlobal$1 !== 'undefined' ? commonjsGlobal$1 : commonjsGlobal$1);

    var npo_src = createCommonjsModule$1(function (module) {
    /*! Native Promise Only
        v0.8.1 (c) Kyle Simpson
        MIT License: http://getify.mit-license.org
    */
    (function UMD(name, context, definition) {
      // special form of UMD for polyfilling across evironments
      context[name] = context[name] || definition();

      if (module.exports) {
        module.exports = context[name];
      }
    })("Promise", typeof commonjsGlobal$1 != "undefined" ? commonjsGlobal$1 : commonjsGlobal$1, function DEF() {

      var builtInProp,
          cycle,
          scheduling_queue,
          ToString = Object.prototype.toString,
          timer = typeof setImmediate != "undefined" ? function timer(fn) {
        return setImmediate(fn);
      } : setTimeout; // dammit, IE8.

      try {
        Object.defineProperty({}, "x", {});

        builtInProp = function builtInProp(obj, name, val, config) {
          return Object.defineProperty(obj, name, {
            value: val,
            writable: true,
            configurable: config !== false
          });
        };
      } catch (err) {
        builtInProp = function builtInProp(obj, name, val) {
          obj[name] = val;
          return obj;
        };
      } // Note: using a queue instead of array for efficiency


      scheduling_queue = function Queue() {
        var first, last, item;

        function Item(fn, self) {
          this.fn = fn;
          this.self = self;
          this.next = void 0;
        }

        return {
          add: function add(fn, self) {
            item = new Item(fn, self);

            if (last) {
              last.next = item;
            } else {
              first = item;
            }

            last = item;
            item = void 0;
          },
          drain: function drain() {
            var f = first;
            first = last = cycle = void 0;

            while (f) {
              f.fn.call(f.self);
              f = f.next;
            }
          }
        };
      }();

      function schedule(fn, self) {
        scheduling_queue.add(fn, self);

        if (!cycle) {
          cycle = timer(scheduling_queue.drain);
        }
      } // promise duck typing


      function isThenable(o) {
        var _then,
            o_type = typeof o;

        if (o != null && (o_type == "object" || o_type == "function")) {
          _then = o.then;
        }

        return typeof _then == "function" ? _then : false;
      }

      function notify() {
        for (var i = 0; i < this.chain.length; i++) {
          notifyIsolated(this, this.state === 1 ? this.chain[i].success : this.chain[i].failure, this.chain[i]);
        }

        this.chain.length = 0;
      } // NOTE: This is a separate function to isolate
      // the `try..catch` so that other code can be
      // optimized better


      function notifyIsolated(self, cb, chain) {
        var ret, _then;

        try {
          if (cb === false) {
            chain.reject(self.msg);
          } else {
            if (cb === true) {
              ret = self.msg;
            } else {
              ret = cb.call(void 0, self.msg);
            }

            if (ret === chain.promise) {
              chain.reject(TypeError("Promise-chain cycle"));
            } else if (_then = isThenable(ret)) {
              _then.call(ret, chain.resolve, chain.reject);
            } else {
              chain.resolve(ret);
            }
          }
        } catch (err) {
          chain.reject(err);
        }
      }

      function resolve(msg) {
        var _then,
            self = this; // already triggered?


        if (self.triggered) {
          return;
        }

        self.triggered = true; // unwrap

        if (self.def) {
          self = self.def;
        }

        try {
          if (_then = isThenable(msg)) {
            schedule(function () {
              var def_wrapper = new MakeDefWrapper(self);

              try {
                _then.call(msg, function $resolve$() {
                  resolve.apply(def_wrapper, arguments);
                }, function $reject$() {
                  reject.apply(def_wrapper, arguments);
                });
              } catch (err) {
                reject.call(def_wrapper, err);
              }
            });
          } else {
            self.msg = msg;
            self.state = 1;

            if (self.chain.length > 0) {
              schedule(notify, self);
            }
          }
        } catch (err) {
          reject.call(new MakeDefWrapper(self), err);
        }
      }

      function reject(msg) {
        var self = this; // already triggered?

        if (self.triggered) {
          return;
        }

        self.triggered = true; // unwrap

        if (self.def) {
          self = self.def;
        }

        self.msg = msg;
        self.state = 2;

        if (self.chain.length > 0) {
          schedule(notify, self);
        }
      }

      function iteratePromises(Constructor, arr, resolver, rejecter) {
        for (var idx = 0; idx < arr.length; idx++) {
          (function IIFE(idx) {
            Constructor.resolve(arr[idx]).then(function $resolver$(msg) {
              resolver(idx, msg);
            }, rejecter);
          })(idx);
        }
      }

      function MakeDefWrapper(self) {
        this.def = self;
        this.triggered = false;
      }

      function MakeDef(self) {
        this.promise = self;
        this.state = 0;
        this.triggered = false;
        this.chain = [];
        this.msg = void 0;
      }

      function Promise(executor) {
        if (typeof executor != "function") {
          throw TypeError("Not a function");
        }

        if (this.__NPO__ !== 0) {
          throw TypeError("Not a promise");
        } // instance shadowing the inherited "brand"
        // to signal an already "initialized" promise


        this.__NPO__ = 1;
        var def = new MakeDef(this);

        this["then"] = function then(success, failure) {
          var o = {
            success: typeof success == "function" ? success : true,
            failure: typeof failure == "function" ? failure : false
          }; // Note: `then(..)` itself can be borrowed to be used against
          // a different promise constructor for making the chained promise,
          // by substituting a different `this` binding.

          o.promise = new this.constructor(function extractChain(resolve, reject) {
            if (typeof resolve != "function" || typeof reject != "function") {
              throw TypeError("Not a function");
            }

            o.resolve = resolve;
            o.reject = reject;
          });
          def.chain.push(o);

          if (def.state !== 0) {
            schedule(notify, def);
          }

          return o.promise;
        };

        this["catch"] = function $catch$(failure) {
          return this.then(void 0, failure);
        };

        try {
          executor.call(void 0, function publicResolve(msg) {
            resolve.call(def, msg);
          }, function publicReject(msg) {
            reject.call(def, msg);
          });
        } catch (err) {
          reject.call(def, err);
        }
      }

      var PromisePrototype = builtInProp({}, "constructor", Promise,
      /*configurable=*/
      false); // Note: Android 4 cannot use `Object.defineProperty(..)` here

      Promise.prototype = PromisePrototype; // built-in "brand" to signal an "uninitialized" promise

      builtInProp(PromisePrototype, "__NPO__", 0,
      /*configurable=*/
      false);
      builtInProp(Promise, "resolve", function Promise$resolve(msg) {
        var Constructor = this; // spec mandated checks
        // note: best "isPromise" check that's practical for now

        if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
          return msg;
        }

        return new Constructor(function executor(resolve, reject) {
          if (typeof resolve != "function" || typeof reject != "function") {
            throw TypeError("Not a function");
          }

          resolve(msg);
        });
      });
      builtInProp(Promise, "reject", function Promise$reject(msg) {
        return new this(function executor(resolve, reject) {
          if (typeof resolve != "function" || typeof reject != "function") {
            throw TypeError("Not a function");
          }

          reject(msg);
        });
      });
      builtInProp(Promise, "all", function Promise$all(arr) {
        var Constructor = this; // spec mandated checks

        if (ToString.call(arr) != "[object Array]") {
          return Constructor.reject(TypeError("Not an array"));
        }

        if (arr.length === 0) {
          return Constructor.resolve([]);
        }

        return new Constructor(function executor(resolve, reject) {
          if (typeof resolve != "function" || typeof reject != "function") {
            throw TypeError("Not a function");
          }

          var len = arr.length,
              msgs = Array(len),
              count = 0;
          iteratePromises(Constructor, arr, function resolver(idx, msg) {
            msgs[idx] = msg;

            if (++count === len) {
              resolve(msgs);
            }
          }, reject);
        });
      });
      builtInProp(Promise, "race", function Promise$race(arr) {
        var Constructor = this; // spec mandated checks

        if (ToString.call(arr) != "[object Array]") {
          return Constructor.reject(TypeError("Not an array"));
        }

        return new Constructor(function executor(resolve, reject) {
          if (typeof resolve != "function" || typeof reject != "function") {
            throw TypeError("Not a function");
          }

          iteratePromises(Constructor, arr, function resolver(idx, msg) {
            resolve(msg);
          }, reject);
        });
      });
      return Promise;
    });
    });

    /**
     * @module lib/callbacks
     */
    var callbackMap = new WeakMap();
    /**
     * Store a callback for a method or event for a player.
     *
     * @param {Player} player The player object.
     * @param {string} name The method or event name.
     * @param {(function(this:Player, *): void|{resolve: function, reject: function})} callback
     *        The callback to call or an object with resolve and reject functions for a promise.
     * @return {void}
     */

    function storeCallback(player, name, callback) {
      var playerCallbacks = callbackMap.get(player.element) || {};

      if (!(name in playerCallbacks)) {
        playerCallbacks[name] = [];
      }

      playerCallbacks[name].push(callback);
      callbackMap.set(player.element, playerCallbacks);
    }
    /**
     * Get the callbacks for a player and event or method.
     *
     * @param {Player} player The player object.
     * @param {string} name The method or event name
     * @return {function[]}
     */

    function getCallbacks(player, name) {
      var playerCallbacks = callbackMap.get(player.element) || {};
      return playerCallbacks[name] || [];
    }
    /**
     * Remove a stored callback for a method or event for a player.
     *
     * @param {Player} player The player object.
     * @param {string} name The method or event name
     * @param {function} [callback] The specific callback to remove.
     * @return {boolean} Was this the last callback?
     */

    function removeCallback(player, name, callback) {
      var playerCallbacks = callbackMap.get(player.element) || {};

      if (!playerCallbacks[name]) {
        return true;
      } // If no callback is passed, remove all callbacks for the event


      if (!callback) {
        playerCallbacks[name] = [];
        callbackMap.set(player.element, playerCallbacks);
        return true;
      }

      var index = playerCallbacks[name].indexOf(callback);

      if (index !== -1) {
        playerCallbacks[name].splice(index, 1);
      }

      callbackMap.set(player.element, playerCallbacks);
      return playerCallbacks[name] && playerCallbacks[name].length === 0;
    }
    /**
     * Return the first stored callback for a player and event or method.
     *
     * @param {Player} player The player object.
     * @param {string} name The method or event name.
     * @return {function} The callback, or false if there were none
     */

    function shiftCallbacks(player, name) {
      var playerCallbacks = getCallbacks(player, name);

      if (playerCallbacks.length < 1) {
        return false;
      }

      var callback = playerCallbacks.shift();
      removeCallback(player, name, callback);
      return callback;
    }
    /**
     * Move callbacks associated with an element to another element.
     *
     * @param {HTMLElement} oldElement The old element.
     * @param {HTMLElement} newElement The new element.
     * @return {void}
     */

    function swapCallbacks(oldElement, newElement) {
      var playerCallbacks = callbackMap.get(oldElement);
      callbackMap.set(newElement, playerCallbacks);
      callbackMap.delete(oldElement);
    }

    /**
     * @module lib/embed
     */
    var oEmbedParameters = ['autopause', 'autoplay', 'background', 'byline', 'color', 'dnt', 'height', 'id', 'loop', 'maxheight', 'maxwidth', 'muted', 'playsinline', 'portrait', 'responsive', 'speed', 'title', 'transparent', 'url', 'width'];
    /**
     * Get the 'data-vimeo'-prefixed attributes from an element as an object.
     *
     * @param {HTMLElement} element The element.
     * @param {Object} [defaults={}] The default values to use.
     * @return {Object<string, string>}
     */

    function getOEmbedParameters(element) {
      var defaults = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return oEmbedParameters.reduce(function (params, param) {
        var value = element.getAttribute("data-vimeo-".concat(param));

        if (value || value === '') {
          params[param] = value === '' ? 1 : value;
        }

        return params;
      }, defaults);
    }
    /**
     * Create an embed from oEmbed data inside an element.
     *
     * @param {object} data The oEmbed data.
     * @param {HTMLElement} element The element to put the iframe in.
     * @return {HTMLIFrameElement} The iframe embed.
     */

    function createEmbed(_ref, element) {
      var html = _ref.html;

      if (!element) {
        throw new TypeError('An element must be provided');
      }

      if (element.getAttribute('data-vimeo-initialized') !== null) {
        return element.querySelector('iframe');
      }

      var div = document.createElement('div');
      div.innerHTML = html;
      element.appendChild(div.firstChild);
      element.setAttribute('data-vimeo-initialized', 'true');
      return element.querySelector('iframe');
    }
    /**
     * Make an oEmbed call for the specified URL.
     *
     * @param {string} videoUrl The vimeo.com url for the video.
     * @param {Object} [params] Parameters to pass to oEmbed.
     * @param {HTMLElement} element The element.
     * @return {Promise}
     */

    function getOEmbedData(videoUrl) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var element = arguments.length > 2 ? arguments[2] : undefined;
      return new Promise(function (resolve, reject) {
        if (!isVimeoUrl(videoUrl)) {
          throw new TypeError("\u201C".concat(videoUrl, "\u201D is not a vimeo.com url."));
        }

        var url = "https://vimeo.com/api/oembed.json?url=".concat(encodeURIComponent(videoUrl), "&domain=").concat(window.location.hostname);

        for (var param in params) {
          if (params.hasOwnProperty(param)) {
            url += "&".concat(param, "=").concat(encodeURIComponent(params[param]));
          }
        }

        var xhr = 'XDomainRequest' in window ? new XDomainRequest() : new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onload = function () {
          if (xhr.status === 404) {
            reject(new Error("\u201C".concat(videoUrl, "\u201D was not found.")));
            return;
          }

          if (xhr.status === 403) {
            reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
            return;
          }

          try {
            var json = JSON.parse(xhr.responseText); // Check api response for 403 on oembed

            if (json.domain_status_code === 403) {
              // We still want to create the embed to give users visual feedback
              createEmbed(json, element);
              reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
              return;
            }

            resolve(json);
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = function () {
          var status = xhr.status ? " (".concat(xhr.status, ")") : '';
          reject(new Error("There was an error fetching the embed code from Vimeo".concat(status, ".")));
        };

        xhr.send();
      });
    }
    /**
     * Initialize all embeds within a specific element
     *
     * @param {HTMLElement} [parent=document] The parent element.
     * @return {void}
     */

    function initializeEmbeds() {
      var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
      var elements = [].slice.call(parent.querySelectorAll('[data-vimeo-id], [data-vimeo-url]'));

      var handleError = function handleError(error) {
        if ('console' in window && console.error) {
          console.error("There was an error creating an embed: ".concat(error));
        }
      };

      elements.forEach(function (element) {
        try {
          // Skip any that have data-vimeo-defer
          if (element.getAttribute('data-vimeo-defer') !== null) {
            return;
          }

          var params = getOEmbedParameters(element);
          var url = getVimeoUrl(params);
          getOEmbedData(url, params, element).then(function (data) {
            return createEmbed(data, element);
          }).catch(handleError);
        } catch (error) {
          handleError(error);
        }
      });
    }
    /**
     * Resize embeds when messaged by the player.
     *
     * @param {HTMLElement} [parent=document] The parent element.
     * @return {void}
     */

    function resizeEmbeds() {
      var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

      // Prevent execution if users include the player.js script multiple times.
      if (window.VimeoPlayerResizeEmbeds_) {
        return;
      }

      window.VimeoPlayerResizeEmbeds_ = true;

      var onMessage = function onMessage(event) {
        if (!isVimeoUrl(event.origin)) {
          return;
        } // 'spacechange' is fired only on embeds with cards


        if (!event.data || event.data.event !== 'spacechange') {
          return;
        }

        var iframes = parent.querySelectorAll('iframe');

        for (var i = 0; i < iframes.length; i++) {
          if (iframes[i].contentWindow !== event.source) {
            continue;
          } // Change padding-bottom of the enclosing div to accommodate
          // card carousel without distorting aspect ratio


          var space = iframes[i].parentElement;
          space.style.paddingBottom = "".concat(event.data.data[0].bottom, "px");
          break;
        }
      };

      if (window.addEventListener) {
        window.addEventListener('message', onMessage, false);
      } else if (window.attachEvent) {
        window.attachEvent('onmessage', onMessage);
      }
    }

    /**
     * @module lib/postmessage
     */
    /**
     * Parse a message received from postMessage.
     *
     * @param {*} data The data received from postMessage.
     * @return {object}
     */

    function parseMessageData(data) {
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (error) {
          // If the message cannot be parsed, throw the error as a warning
          console.warn(error);
          return {};
        }
      }

      return data;
    }
    /**
     * Post a message to the specified target.
     *
     * @param {Player} player The player object to use.
     * @param {string} method The API method to call.
     * @param {object} params The parameters to send to the player.
     * @return {void}
     */

    function postMessage(player, method, params) {
      if (!player.element.contentWindow || !player.element.contentWindow.postMessage) {
        return;
      }

      var message = {
        method: method
      };

      if (params !== undefined) {
        message.value = params;
      } // IE 8 and 9 do not support passing messages, so stringify them


      var ieVersion = parseFloat(navigator.userAgent.toLowerCase().replace(/^.*msie (\d+).*$/, '$1'));

      if (ieVersion >= 8 && ieVersion < 10) {
        message = JSON.stringify(message);
      }

      player.element.contentWindow.postMessage(message, player.origin);
    }
    /**
     * Parse the data received from a message event.
     *
     * @param {Player} player The player that received the message.
     * @param {(Object|string)} data The message data. Strings will be parsed into JSON.
     * @return {void}
     */

    function processData(player, data) {
      data = parseMessageData(data);
      var callbacks = [];
      var param;

      if (data.event) {
        if (data.event === 'error') {
          var promises = getCallbacks(player, data.data.method);
          promises.forEach(function (promise) {
            var error = new Error(data.data.message);
            error.name = data.data.name;
            promise.reject(error);
            removeCallback(player, data.data.method, promise);
          });
        }

        callbacks = getCallbacks(player, "event:".concat(data.event));
        param = data.data;
      } else if (data.method) {
        var callback = shiftCallbacks(player, data.method);

        if (callback) {
          callbacks.push(callback);
          param = data.value;
        }
      }

      callbacks.forEach(function (callback) {
        try {
          if (typeof callback === 'function') {
            callback.call(player, param);
            return;
          }

          callback.resolve(param);
        } catch (e) {// empty
        }
      });
    }

    var playerMap = new WeakMap();
    var readyMap = new WeakMap();

    var Player =
    /*#__PURE__*/
    function () {
      /**
       * Create a Player.
       *
       * @param {(HTMLIFrameElement|HTMLElement|string|jQuery)} element A reference to the Vimeo
       *        player iframe, and id, or a jQuery object.
       * @param {object} [options] oEmbed parameters to use when creating an embed in the element.
       * @return {Player}
       */
      function Player(element) {
        var _this = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Player);

        /* global jQuery */
        if (window.jQuery && element instanceof jQuery) {
          if (element.length > 1 && window.console && console.warn) {
            console.warn('A jQuery object with multiple elements was passed, using the first element.');
          }

          element = element[0];
        } // Find an element by ID


        if (typeof document !== 'undefined' && typeof element === 'string') {
          element = document.getElementById(element);
        } // Not an element!


        if (!isDomElement(element)) {
          throw new TypeError('You must pass either a valid element or a valid id.');
        }

        var win = element.ownerDocument.defaultView; // Already initialized an embed in this div, so grab the iframe

        if (element.nodeName !== 'IFRAME') {
          var iframe = element.querySelector('iframe');

          if (iframe) {
            element = iframe;
          }
        } // iframe url is not a Vimeo url


        if (element.nodeName === 'IFRAME' && !isVimeoUrl(element.getAttribute('src') || '')) {
          throw new Error('The player element passed isn’t a Vimeo embed.');
        } // If there is already a player object in the map, return that


        if (playerMap.has(element)) {
          return playerMap.get(element);
        }

        this.element = element;
        this.origin = '*';
        var readyPromise = new npo_src(function (resolve, reject) {
          var onMessage = function onMessage(event) {
            if (!isVimeoUrl(event.origin) || _this.element.contentWindow !== event.source) {
              return;
            }

            if (_this.origin === '*') {
              _this.origin = event.origin;
            }

            var data = parseMessageData(event.data);
            var isError = data && data.event === 'error';
            var isReadyError = isError && data.data && data.data.method === 'ready';

            if (isReadyError) {
              var error = new Error(data.data.message);
              error.name = data.data.name;
              reject(error);
              return;
            }

            var isReadyEvent = data && data.event === 'ready';
            var isPingResponse = data && data.method === 'ping';

            if (isReadyEvent || isPingResponse) {
              _this.element.setAttribute('data-ready', 'true');

              resolve();
              return;
            }

            processData(_this, data);
          };

          if (win.addEventListener) {
            win.addEventListener('message', onMessage, false);
          } else if (win.attachEvent) {
            win.attachEvent('onmessage', onMessage);
          }

          if (_this.element.nodeName !== 'IFRAME') {
            var params = getOEmbedParameters(element, options);
            var url = getVimeoUrl(params);
            getOEmbedData(url, params, element).then(function (data) {
              var iframe = createEmbed(data, element); // Overwrite element with the new iframe,
              // but store reference to the original element

              _this.element = iframe;
              _this._originalElement = element;
              swapCallbacks(element, iframe);
              playerMap.set(_this.element, _this);
              return data;
            }).catch(reject);
          }
        }); // Store a copy of this Player in the map

        readyMap.set(this, readyPromise);
        playerMap.set(this.element, this); // Send a ping to the iframe so the ready promise will be resolved if
        // the player is already ready.

        if (this.element.nodeName === 'IFRAME') {
          postMessage(this, 'ping');
        }

        return this;
      }
      /**
       * Get a promise for a method.
       *
       * @param {string} name The API method to call.
       * @param {Object} [args={}] Arguments to send via postMessage.
       * @return {Promise}
       */


      _createClass(Player, [{
        key: "callMethod",
        value: function callMethod(name) {
          var _this2 = this;

          var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          return new npo_src(function (resolve, reject) {
            // We are storing the resolve/reject handlers to call later, so we
            // can’t return here.
            // eslint-disable-next-line promise/always-return
            return _this2.ready().then(function () {
              storeCallback(_this2, name, {
                resolve: resolve,
                reject: reject
              });
              postMessage(_this2, name, args);
            }).catch(reject);
          });
        }
        /**
         * Get a promise for the value of a player property.
         *
         * @param {string} name The property name
         * @return {Promise}
         */

      }, {
        key: "get",
        value: function get(name) {
          var _this3 = this;

          return new npo_src(function (resolve, reject) {
            name = getMethodName(name, 'get'); // We are storing the resolve/reject handlers to call later, so we
            // can’t return here.
            // eslint-disable-next-line promise/always-return

            return _this3.ready().then(function () {
              storeCallback(_this3, name, {
                resolve: resolve,
                reject: reject
              });
              postMessage(_this3, name);
            }).catch(reject);
          });
        }
        /**
         * Get a promise for setting the value of a player property.
         *
         * @param {string} name The API method to call.
         * @param {mixed} value The value to set.
         * @return {Promise}
         */

      }, {
        key: "set",
        value: function set(name, value) {
          var _this4 = this;

          return new npo_src(function (resolve, reject) {
            name = getMethodName(name, 'set');

            if (value === undefined || value === null) {
              throw new TypeError('There must be a value to set.');
            } // We are storing the resolve/reject handlers to call later, so we
            // can’t return here.
            // eslint-disable-next-line promise/always-return


            return _this4.ready().then(function () {
              storeCallback(_this4, name, {
                resolve: resolve,
                reject: reject
              });
              postMessage(_this4, name, value);
            }).catch(reject);
          });
        }
        /**
         * Add an event listener for the specified event. Will call the
         * callback with a single parameter, `data`, that contains the data for
         * that event.
         *
         * @param {string} eventName The name of the event.
         * @param {function(*)} callback The function to call when the event fires.
         * @return {void}
         */

      }, {
        key: "on",
        value: function on(eventName, callback) {
          if (!eventName) {
            throw new TypeError('You must pass an event name.');
          }

          if (!callback) {
            throw new TypeError('You must pass a callback function.');
          }

          if (typeof callback !== 'function') {
            throw new TypeError('The callback must be a function.');
          }

          var callbacks = getCallbacks(this, "event:".concat(eventName));

          if (callbacks.length === 0) {
            this.callMethod('addEventListener', eventName).catch(function () {// Ignore the error. There will be an error event fired that
              // will trigger the error callback if they are listening.
            });
          }

          storeCallback(this, "event:".concat(eventName), callback);
        }
        /**
         * Remove an event listener for the specified event. Will remove all
         * listeners for that event if a `callback` isn’t passed, or only that
         * specific callback if it is passed.
         *
         * @param {string} eventName The name of the event.
         * @param {function} [callback] The specific callback to remove.
         * @return {void}
         */

      }, {
        key: "off",
        value: function off(eventName, callback) {
          if (!eventName) {
            throw new TypeError('You must pass an event name.');
          }

          if (callback && typeof callback !== 'function') {
            throw new TypeError('The callback must be a function.');
          }

          var lastCallback = removeCallback(this, "event:".concat(eventName), callback); // If there are no callbacks left, remove the listener

          if (lastCallback) {
            this.callMethod('removeEventListener', eventName).catch(function (e) {// Ignore the error. There will be an error event fired that
              // will trigger the error callback if they are listening.
            });
          }
        }
        /**
         * A promise to load a new video.
         *
         * @promise LoadVideoPromise
         * @fulfill {number} The video with this id successfully loaded.
         * @reject {TypeError} The id was not a number.
         */

        /**
         * Load a new video into this embed. The promise will be resolved if
         * the video is successfully loaded, or it will be rejected if it could
         * not be loaded.
         *
         * @param {number|object} options The id of the video or an object with embed options.
         * @return {LoadVideoPromise}
         */

      }, {
        key: "loadVideo",
        value: function loadVideo(options) {
          return this.callMethod('loadVideo', options);
        }
        /**
         * A promise to perform an action when the Player is ready.
         *
         * @todo document errors
         * @promise LoadVideoPromise
         * @fulfill {void}
         */

        /**
         * Trigger a function when the player iframe has initialized. You do not
         * need to wait for `ready` to trigger to begin adding event listeners
         * or calling other methods.
         *
         * @return {ReadyPromise}
         */

      }, {
        key: "ready",
        value: function ready() {
          var readyPromise = readyMap.get(this) || new npo_src(function (resolve, reject) {
            reject(new Error('Unknown player. Probably unloaded.'));
          });
          return npo_src.resolve(readyPromise);
        }
        /**
         * A promise to add a cue point to the player.
         *
         * @promise AddCuePointPromise
         * @fulfill {string} The id of the cue point to use for removeCuePoint.
         * @reject {RangeError} the time was less than 0 or greater than the
         *         video’s duration.
         * @reject {UnsupportedError} Cue points are not supported with the current
         *         player or browser.
         */

        /**
         * Add a cue point to the player.
         *
         * @param {number} time The time for the cue point.
         * @param {object} [data] Arbitrary data to be returned with the cue point.
         * @return {AddCuePointPromise}
         */

      }, {
        key: "addCuePoint",
        value: function addCuePoint(time) {
          var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          return this.callMethod('addCuePoint', {
            time: time,
            data: data
          });
        }
        /**
         * A promise to remove a cue point from the player.
         *
         * @promise AddCuePointPromise
         * @fulfill {string} The id of the cue point that was removed.
         * @reject {InvalidCuePoint} The cue point with the specified id was not
         *         found.
         * @reject {UnsupportedError} Cue points are not supported with the current
         *         player or browser.
         */

        /**
         * Remove a cue point from the video.
         *
         * @param {string} id The id of the cue point to remove.
         * @return {RemoveCuePointPromise}
         */

      }, {
        key: "removeCuePoint",
        value: function removeCuePoint(id) {
          return this.callMethod('removeCuePoint', id);
        }
        /**
         * A representation of a text track on a video.
         *
         * @typedef {Object} VimeoTextTrack
         * @property {string} language The ISO language code.
         * @property {string} kind The kind of track it is (captions or subtitles).
         * @property {string} label The human‐readable label for the track.
         */

        /**
         * A promise to enable a text track.
         *
         * @promise EnableTextTrackPromise
         * @fulfill {VimeoTextTrack} The text track that was enabled.
         * @reject {InvalidTrackLanguageError} No track was available with the
         *         specified language.
         * @reject {InvalidTrackError} No track was available with the specified
         *         language and kind.
         */

        /**
         * Enable the text track with the specified language, and optionally the
         * specified kind (captions or subtitles).
         *
         * When set via the API, the track language will not change the viewer’s
         * stored preference.
         *
         * @param {string} language The two‐letter language code.
         * @param {string} [kind] The kind of track to enable (captions or subtitles).
         * @return {EnableTextTrackPromise}
         */

      }, {
        key: "enableTextTrack",
        value: function enableTextTrack(language, kind) {
          if (!language) {
            throw new TypeError('You must pass a language.');
          }

          return this.callMethod('enableTextTrack', {
            language: language,
            kind: kind
          });
        }
        /**
         * A promise to disable the active text track.
         *
         * @promise DisableTextTrackPromise
         * @fulfill {void} The track was disabled.
         */

        /**
         * Disable the currently-active text track.
         *
         * @return {DisableTextTrackPromise}
         */

      }, {
        key: "disableTextTrack",
        value: function disableTextTrack() {
          return this.callMethod('disableTextTrack');
        }
        /**
         * A promise to pause the video.
         *
         * @promise PausePromise
         * @fulfill {void} The video was paused.
         */

        /**
         * Pause the video if it’s playing.
         *
         * @return {PausePromise}
         */

      }, {
        key: "pause",
        value: function pause() {
          return this.callMethod('pause');
        }
        /**
         * A promise to play the video.
         *
         * @promise PlayPromise
         * @fulfill {void} The video was played.
         */

        /**
         * Play the video if it’s paused. **Note:** on iOS and some other
         * mobile devices, you cannot programmatically trigger play. Once the
         * viewer has tapped on the play button in the player, however, you
         * will be able to use this function.
         *
         * @return {PlayPromise}
         */

      }, {
        key: "play",
        value: function play() {
          return this.callMethod('play');
        }
        /**
         * A promise to unload the video.
         *
         * @promise UnloadPromise
         * @fulfill {void} The video was unloaded.
         */

        /**
         * Return the player to its initial state.
         *
         * @return {UnloadPromise}
         */

      }, {
        key: "unload",
        value: function unload() {
          return this.callMethod('unload');
        }
        /**
         * Cleanup the player and remove it from the DOM
         *
         * It won't be usable and a new one should be constructed
         *  in order to do any operations.
         *
         * @return {Promise}
         */

      }, {
        key: "destroy",
        value: function destroy() {
          var _this5 = this;

          return new npo_src(function (resolve) {
            readyMap.delete(_this5);
            playerMap.delete(_this5.element);

            if (_this5._originalElement) {
              playerMap.delete(_this5._originalElement);

              _this5._originalElement.removeAttribute('data-vimeo-initialized');
            }

            if (_this5.element && _this5.element.nodeName === 'IFRAME' && _this5.element.parentNode) {
              _this5.element.parentNode.removeChild(_this5.element);
            }

            resolve();
          });
        }
        /**
         * A promise to get the autopause behavior of the video.
         *
         * @promise GetAutopausePromise
         * @fulfill {boolean} Whether autopause is turned on or off.
         * @reject {UnsupportedError} Autopause is not supported with the current
         *         player or browser.
         */

        /**
         * Get the autopause behavior for this player.
         *
         * @return {GetAutopausePromise}
         */

      }, {
        key: "getAutopause",
        value: function getAutopause() {
          return this.get('autopause');
        }
        /**
         * A promise to set the autopause behavior of the video.
         *
         * @promise SetAutopausePromise
         * @fulfill {boolean} Whether autopause is turned on or off.
         * @reject {UnsupportedError} Autopause is not supported with the current
         *         player or browser.
         */

        /**
         * Enable or disable the autopause behavior of this player.
         *
         * By default, when another video is played in the same browser, this
         * player will automatically pause. Unless you have a specific reason
         * for doing so, we recommend that you leave autopause set to the
         * default (`true`).
         *
         * @param {boolean} autopause
         * @return {SetAutopausePromise}
         */

      }, {
        key: "setAutopause",
        value: function setAutopause(autopause) {
          return this.set('autopause', autopause);
        }
        /**
         * A promise to get the buffered property of the video.
         *
         * @promise GetBufferedPromise
         * @fulfill {Array} Buffered Timeranges converted to an Array.
         */

        /**
         * Get the buffered property of the video.
         *
         * @return {GetBufferedPromise}
         */

      }, {
        key: "getBuffered",
        value: function getBuffered() {
          return this.get('buffered');
        }
        /**
         * A promise to get the color of the player.
         *
         * @promise GetColorPromise
         * @fulfill {string} The hex color of the player.
         */

        /**
         * Get the color for this player.
         *
         * @return {GetColorPromise}
         */

      }, {
        key: "getColor",
        value: function getColor() {
          return this.get('color');
        }
        /**
         * A promise to set the color of the player.
         *
         * @promise SetColorPromise
         * @fulfill {string} The color was successfully set.
         * @reject {TypeError} The string was not a valid hex or rgb color.
         * @reject {ContrastError} The color was set, but the contrast is
         *         outside of the acceptable range.
         * @reject {EmbedSettingsError} The owner of the player has chosen to
         *         use a specific color.
         */

        /**
         * Set the color of this player to a hex or rgb string. Setting the
         * color may fail if the owner of the video has set their embed
         * preferences to force a specific color.
         *
         * @param {string} color The hex or rgb color string to set.
         * @return {SetColorPromise}
         */

      }, {
        key: "setColor",
        value: function setColor(color) {
          return this.set('color', color);
        }
        /**
         * A representation of a cue point.
         *
         * @typedef {Object} VimeoCuePoint
         * @property {number} time The time of the cue point.
         * @property {object} data The data passed when adding the cue point.
         * @property {string} id The unique id for use with removeCuePoint.
         */

        /**
         * A promise to get the cue points of a video.
         *
         * @promise GetCuePointsPromise
         * @fulfill {VimeoCuePoint[]} The cue points added to the video.
         * @reject {UnsupportedError} Cue points are not supported with the current
         *         player or browser.
         */

        /**
         * Get an array of the cue points added to the video.
         *
         * @return {GetCuePointsPromise}
         */

      }, {
        key: "getCuePoints",
        value: function getCuePoints() {
          return this.get('cuePoints');
        }
        /**
         * A promise to get the current time of the video.
         *
         * @promise GetCurrentTimePromise
         * @fulfill {number} The current time in seconds.
         */

        /**
         * Get the current playback position in seconds.
         *
         * @return {GetCurrentTimePromise}
         */

      }, {
        key: "getCurrentTime",
        value: function getCurrentTime() {
          return this.get('currentTime');
        }
        /**
         * A promise to set the current time of the video.
         *
         * @promise SetCurrentTimePromise
         * @fulfill {number} The actual current time that was set.
         * @reject {RangeError} the time was less than 0 or greater than the
         *         video’s duration.
         */

        /**
         * Set the current playback position in seconds. If the player was
         * paused, it will remain paused. Likewise, if the player was playing,
         * it will resume playing once the video has buffered.
         *
         * You can provide an accurate time and the player will attempt to seek
         * to as close to that time as possible. The exact time will be the
         * fulfilled value of the promise.
         *
         * @param {number} currentTime
         * @return {SetCurrentTimePromise}
         */

      }, {
        key: "setCurrentTime",
        value: function setCurrentTime(currentTime) {
          return this.set('currentTime', currentTime);
        }
        /**
         * A promise to get the duration of the video.
         *
         * @promise GetDurationPromise
         * @fulfill {number} The duration in seconds.
         */

        /**
         * Get the duration of the video in seconds. It will be rounded to the
         * nearest second before playback begins, and to the nearest thousandth
         * of a second after playback begins.
         *
         * @return {GetDurationPromise}
         */

      }, {
        key: "getDuration",
        value: function getDuration() {
          return this.get('duration');
        }
        /**
         * A promise to get the ended state of the video.
         *
         * @promise GetEndedPromise
         * @fulfill {boolean} Whether or not the video has ended.
         */

        /**
         * Get the ended state of the video. The video has ended if
         * `currentTime === duration`.
         *
         * @return {GetEndedPromise}
         */

      }, {
        key: "getEnded",
        value: function getEnded() {
          return this.get('ended');
        }
        /**
         * A promise to get the loop state of the player.
         *
         * @promise GetLoopPromise
         * @fulfill {boolean} Whether or not the player is set to loop.
         */

        /**
         * Get the loop state of the player.
         *
         * @return {GetLoopPromise}
         */

      }, {
        key: "getLoop",
        value: function getLoop() {
          return this.get('loop');
        }
        /**
         * A promise to set the loop state of the player.
         *
         * @promise SetLoopPromise
         * @fulfill {boolean} The loop state that was set.
         */

        /**
         * Set the loop state of the player. When set to `true`, the player
         * will start over immediately once playback ends.
         *
         * @param {boolean} loop
         * @return {SetLoopPromise}
         */

      }, {
        key: "setLoop",
        value: function setLoop(loop) {
          return this.set('loop', loop);
        }
        /**
         * A promise to get the paused state of the player.
         *
         * @promise GetLoopPromise
         * @fulfill {boolean} Whether or not the video is paused.
         */

        /**
         * Get the paused state of the player.
         *
         * @return {GetLoopPromise}
         */

      }, {
        key: "getPaused",
        value: function getPaused() {
          return this.get('paused');
        }
        /**
         * A promise to get the playback rate of the player.
         *
         * @promise GetPlaybackRatePromise
         * @fulfill {number} The playback rate of the player on a scale from 0.5 to 2.
         */

        /**
         * Get the playback rate of the player on a scale from `0.5` to `2`.
         *
         * @return {GetPlaybackRatePromise}
         */

      }, {
        key: "getPlaybackRate",
        value: function getPlaybackRate() {
          return this.get('playbackRate');
        }
        /**
         * A promise to set the playbackrate of the player.
         *
         * @promise SetPlaybackRatePromise
         * @fulfill {number} The playback rate was set.
         * @reject {RangeError} The playback rate was less than 0.5 or greater than 2.
         */

        /**
         * Set the playback rate of the player on a scale from `0.5` to `2`. When set
         * via the API, the playback rate will not be synchronized to other
         * players or stored as the viewer's preference.
         *
         * @param {number} playbackRate
         * @return {SetPlaybackRatePromise}
         */

      }, {
        key: "setPlaybackRate",
        value: function setPlaybackRate(playbackRate) {
          return this.set('playbackRate', playbackRate);
        }
        /**
         * A promise to get the played property of the video.
         *
         * @promise GetPlayedPromise
         * @fulfill {Array} Played Timeranges converted to an Array.
         */

        /**
         * Get the played property of the video.
         *
         * @return {GetPlayedPromise}
         */

      }, {
        key: "getPlayed",
        value: function getPlayed() {
          return this.get('played');
        }
        /**
         * A promise to get the seekable property of the video.
         *
         * @promise GetSeekablePromise
         * @fulfill {Array} Seekable Timeranges converted to an Array.
         */

        /**
         * Get the seekable property of the video.
         *
         * @return {GetSeekablePromise}
         */

      }, {
        key: "getSeekable",
        value: function getSeekable() {
          return this.get('seekable');
        }
        /**
         * A promise to get the seeking property of the player.
         *
         * @promise GetSeekingPromise
         * @fulfill {boolean} Whether or not the player is currently seeking.
         */

        /**
         * Get if the player is currently seeking.
         *
         * @return {GetSeekingPromise}
         */

      }, {
        key: "getSeeking",
        value: function getSeeking() {
          return this.get('seeking');
        }
        /**
         * A promise to get the text tracks of a video.
         *
         * @promise GetTextTracksPromise
         * @fulfill {VimeoTextTrack[]} The text tracks associated with the video.
         */

        /**
         * Get an array of the text tracks that exist for the video.
         *
         * @return {GetTextTracksPromise}
         */

      }, {
        key: "getTextTracks",
        value: function getTextTracks() {
          return this.get('textTracks');
        }
        /**
         * A promise to get the embed code for the video.
         *
         * @promise GetVideoEmbedCodePromise
         * @fulfill {string} The `<iframe>` embed code for the video.
         */

        /**
         * Get the `<iframe>` embed code for the video.
         *
         * @return {GetVideoEmbedCodePromise}
         */

      }, {
        key: "getVideoEmbedCode",
        value: function getVideoEmbedCode() {
          return this.get('videoEmbedCode');
        }
        /**
         * A promise to get the id of the video.
         *
         * @promise GetVideoIdPromise
         * @fulfill {number} The id of the video.
         */

        /**
         * Get the id of the video.
         *
         * @return {GetVideoIdPromise}
         */

      }, {
        key: "getVideoId",
        value: function getVideoId() {
          return this.get('videoId');
        }
        /**
         * A promise to get the title of the video.
         *
         * @promise GetVideoTitlePromise
         * @fulfill {number} The title of the video.
         */

        /**
         * Get the title of the video.
         *
         * @return {GetVideoTitlePromise}
         */

      }, {
        key: "getVideoTitle",
        value: function getVideoTitle() {
          return this.get('videoTitle');
        }
        /**
         * A promise to get the native width of the video.
         *
         * @promise GetVideoWidthPromise
         * @fulfill {number} The native width of the video.
         */

        /**
         * Get the native width of the currently‐playing video. The width of
         * the highest‐resolution available will be used before playback begins.
         *
         * @return {GetVideoWidthPromise}
         */

      }, {
        key: "getVideoWidth",
        value: function getVideoWidth() {
          return this.get('videoWidth');
        }
        /**
         * A promise to get the native height of the video.
         *
         * @promise GetVideoHeightPromise
         * @fulfill {number} The native height of the video.
         */

        /**
         * Get the native height of the currently‐playing video. The height of
         * the highest‐resolution available will be used before playback begins.
         *
         * @return {GetVideoHeightPromise}
         */

      }, {
        key: "getVideoHeight",
        value: function getVideoHeight() {
          return this.get('videoHeight');
        }
        /**
         * A promise to get the vimeo.com url for the video.
         *
         * @promise GetVideoUrlPromise
         * @fulfill {number} The vimeo.com url for the video.
         * @reject {PrivacyError} The url isn’t available because of the video’s privacy setting.
         */

        /**
         * Get the vimeo.com url for the video.
         *
         * @return {GetVideoUrlPromise}
         */

      }, {
        key: "getVideoUrl",
        value: function getVideoUrl() {
          return this.get('videoUrl');
        }
        /**
         * A promise to get the volume level of the player.
         *
         * @promise GetVolumePromise
         * @fulfill {number} The volume level of the player on a scale from 0 to 1.
         */

        /**
         * Get the current volume level of the player on a scale from `0` to `1`.
         *
         * Most mobile devices do not support an independent volume from the
         * system volume. In those cases, this method will always return `1`.
         *
         * @return {GetVolumePromise}
         */

      }, {
        key: "getVolume",
        value: function getVolume() {
          return this.get('volume');
        }
        /**
         * A promise to set the volume level of the player.
         *
         * @promise SetVolumePromise
         * @fulfill {number} The volume was set.
         * @reject {RangeError} The volume was less than 0 or greater than 1.
         */

        /**
         * Set the volume of the player on a scale from `0` to `1`. When set
         * via the API, the volume level will not be synchronized to other
         * players or stored as the viewer’s preference.
         *
         * Most mobile devices do not support setting the volume. An error will
         * *not* be triggered in that situation.
         *
         * @param {number} volume
         * @return {SetVolumePromise}
         */

      }, {
        key: "setVolume",
        value: function setVolume(volume) {
          return this.set('volume', volume);
        }
      }]);

      return Player;
    }(); // Setup embed only if this is not a node environment


    if (!isNode) {
      initializeEmbeds();
      resizeEmbeds();
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


    		this.player = new Player(element, config);
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

    return main;

}));
