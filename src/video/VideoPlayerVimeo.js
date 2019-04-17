import VimeoPlayer from '@vimeo/player';


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
			}
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

			this.player.loadVideo(this.data.video).then(()=>{ if (callback) callback() });
		}
	}


	resize (w, h) {

		this.width = w;
		this.height = h;
	}
}

export default VideoPlayerVimeo;