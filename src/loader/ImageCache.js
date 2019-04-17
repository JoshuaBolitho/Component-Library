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

import EventEmitter from 'events';


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

export default ImageCache;