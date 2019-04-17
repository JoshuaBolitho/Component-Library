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

export default NoiseSmoothing;