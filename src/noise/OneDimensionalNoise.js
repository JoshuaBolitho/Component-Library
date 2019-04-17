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

export default OneDimensionalNoise;