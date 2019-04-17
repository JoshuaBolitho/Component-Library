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

export default TextFade;