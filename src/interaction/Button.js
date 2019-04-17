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


import EventEmitter from 'events';

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

export default Button;