import EventEmitter from 'events';

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

export default WebcamStream;