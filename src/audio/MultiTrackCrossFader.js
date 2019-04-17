import MasterAudio from './MasterAudio';


class MultiTrackCrossFader {


	constructor () {

		this.audio_ids = [];
		this.sample_count = 0;
	}


	loadMultiTrackSprite (config) {

		this.config = config;

		this.sample_count = Object.keys(config.sprite).length;

		MasterAudio.load(config);
		MasterAudio.once('LOAD_COMPLETE', this.on_MULTITRACK_LOAD_COMPLETE.bind(this));
	}


	start () {

		let audio_id;
		let temp_ids = [];

		// start playing all tracks and capture their audio_ids, 
		// which are unique instances of individual sprite_ids.
		for (var sprite_id in this.config.sprite) {

			// begin all track at zero volume
			audio_id = MasterAudio.play(sprite_id, 0);

			// add to list of track ids, since howler serializes every track with a unique id.
			temp_ids.push(audio_id);
		}

		return temp_ids;
	}


	play () {

		MasterAudio.fadeMasterAudio(1, 1);
	}


	pause () {

		MasterAudio.fadeMasterAudio(0, 1);
	}


	externalStart () {

		MasterAudio.setMasterVolume(0);
		MasterAudio.fadeMasterAudio(1, 10, 0.8);

		this.audio_ids = this.start();
		this.changePosition(0);
	}


	on_MULTITRACK_LOAD_COMPLETE (e) {
		
		// TODO: Maybe some autoplay functionality to trigger these
		// this.audio_ids = this.start();
		// this.changePosition(0);		
	}


	changePosition (global_position) {
		
		// determines the local track position in reference to the global position
		this.subtrack_position = (global_position * (this.sample_count-1));
		this.subtrack_index = Math.floor(this.subtrack_position);
		this.subtrack_position = this.subtrack_position - this.subtrack_index;
		this.subtrack_cross_position = 1 - this.subtrack_position;

		let sound_index_a = this.subtrack_index;
		let sound_index_b = sound_index_a + 1;

		MasterAudio.setVolumeByAudioId(this.subtrack_position, this.audio_ids[sound_index_b]);
		MasterAudio.setVolumeByAudioId(this.subtrack_cross_position, this.audio_ids[sound_index_a]);
	}
}

export default MultiTrackCrossFader;