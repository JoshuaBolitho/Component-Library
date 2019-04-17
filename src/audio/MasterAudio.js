import { Howl, Howler } from 'howler';
import EventEmitter from 'events';


var instance;

class MasterAudio extends EventEmitter {


	constructor () {

		super();

		if (!instance) {
			this.init();
			instance = this;
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

		this.sound = new Howl(spritesheet_config);
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
				Howler.volume(this.volume.current);
			}});

		} else {

			this.rawAnimation(target_volume, duration);
		}
	}


	setMasterVolume (volume_amount) {

		this.volume.current = volume_amount;
		Howler.volume(this.volume.current);
	}


	// TweenMax usually handles fades, but relys requestAnimationFrame and only works when the tab is in focus.
	// Fortunately setTimeout will continue to run in the background.

	rawAnimation (target_volume, duration) {

		const FPS = 16.6;
		var timestamp = Date.now();
		var timeout = timestamp + duration;
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
				Howler.volume(new_volume);

				window.setTimeout(animate, FPS);

			} else {

				this.volume.current = target_volume;
				Howler.volume(target_volume);
			}
		}

		animate();
	}


	destroy () {

	}
}

export default (instance) ? instance : new MasterAudio();