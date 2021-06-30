"use strict";





const app = {

	frameCount:0,
	frameTime:-1,
	frameTimeElapsed:-1,

	dataLoaded:false,

	mtxModel:null,

	mouseX:0,
	mouseY:0,
	mouseIsDown:false,
	mouseButton:-1,

	//slider
	cameraIsoMode:0,

	// should be dynamic
	modelBounds:[0,0,0,0],
	floorLevel:72,
	ceilingLevel:180,


	init:function(){
		console.log('init');

		this.initDOM();

		webgl.init($('#canvas-webgl'));

		this.mtxModel = glMatrix.mat4.create();

		camera.init();
		renderer.init();

		this.loadData('data/data.txt');

		this.updateCameraLens();
		this.align();
		this.start();
	},

	initDOM:function(){
		// some dom events - TODO: - add touch
		window.addEventListener('resize', ()=>{
			this.align();
		});
		$('#canvas-webgl').addEventListener('mousedown', (e)=>{
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
			this.mouseButton = e.button;
			this.mouseIsDown = true;
		});
		document.addEventListener('mousemove', (e)=>{
			const x = e.clientX;
			const y = e.clientY;
			const dx = x - this.mouseX;
			const dy = y - this.mouseY;
			if( this.mouseIsDown !== false ){
				this.moveCamera( dx,dy, this.mouseButton );
			}
			this.mouseX = x;
			this.mouseY = y;
		});
		window.addEventListener('mouseup', (e)=>{
			const x = e.clientX;
			const y = e.clientY;
			this.mouseX = x;
			this.mouseY = y;
			this.mouseButton = -1;
			this.mouseIsDown = false;
		});
		window.addEventListener('wheel', (e)=>{
			const dz = (e.delta || e.deltaY || 0)  * 0.001;
			this.zoomCamera( dz );
		});

		// sliders?
		$('#slider2').addEventListener('input', ()=>{
			this.updateCameraLens();
		}, false);
	},

	loadData:function(url){
		// synchronously load a file then return the contents

		const xhr = new XMLHttpRequest();

		xhr.onload = (e) => {
			if( xhr.readyState === 4 ){
				if( xhr.status === 200 ){
					//
					this.loadDataComplete(xhr.responseText);

				}else{
					// error
					// url, xhr.statusText
				}
			}
		}
		xhr.onerror = (e) => {
			// error
			// url, xhr.statusText
		};

		xhr.open( 'GET', url, true );
		xhr.overrideMimeType('text/html');
		xhr.send( null );
	},

	loadDataComplete:function(data){
		this.dataLoaded = true;

		const lines = data.split( String.fromCharCode(10));
		console.log( lines.length );

		const pointCount = lines.length;
	
		renderer.buffers = webgl.createPoints( pointCount, 3,0,2 );

		let minx = null,
			maxx = null,
			miny = null,
			maxy = null,
			minz = null,
			maxz = null;
		const _min = Math.min;
		const _max = Math.max;

		// make some random test data
		let a = renderer.buffers.pos.array;
		for( let l = 0; l < lines.length; l++ ) {
			let i = l * 3;
			let line = lines[l];
			let s = line.split(' ');
			if( s.length < 3 ) continue;

			let x = parseFloat(s[0]);
			let y = parseFloat(s[1]);
			let z = parseFloat(s[2]);

			a[i + 0] = x;
			a[i + 1] = y;
			a[i + 2] = z;

			if( minx === null ){
				minx = x;
				maxx = x;
				miny = y;
				maxy = y;
				minz = z;
				maxz = z;
			}else{
				minx = _min( minx, x );
				maxx = _max( maxx, x );
				miny = _min( miny, y );
				maxy = _max( maxy, y );
				minz = _min( minz, z );
				maxz = _max( maxz, z );
			}
		}
		renderer.buffers.pos.bufferPushed = false;
		renderer.buffers.elementCount = renderer.buffers.elementCountMax;

		// centralise camera
		//console.log(minx,maxx, miny,maxy, minz,maxz);
		this.modelBounds = [minx,maxx, miny,maxy, minz,maxz]; // store
		camera.normalizeToRect( minx,maxx, miny,maxy );

		glMatrix.mat4.translate( this.mtxModel, this.mtxModel, [0,0,0] );
		/*
		*/

//		console.log(data);
	},

	align:function(){

		const canvas = $('#canvas-webgl');
		const r = window.devicePixelRatio || 1;
		const w = window.innerWidth;
		const h = window.innerHeight;
		canvas.width = w * r;
		canvas.height = h * r;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
	},



	//--------- loading ----------
	loading:function(){
		//
		if(!this.dataLoaded) return;

		//
		this.loadComplete();
	},

	loadComplete:function(){

		webgl.setClearColor( 0x0d121c, 1 );

		this.isLoaded = true;
	},
	


	//---------- render loop ----------	
	start: function(){

		// init time counters
		this.frameTime = Date.now();
		this.frameCount = 0;

		// start loop
		window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
		(window.animateFrame = ( time )=>{

			this.frameCount++;
			this.frameTimeElapsed = time - this.frameTime;
			this.frameTime = time;

			this.isLoaded ?
				this.loop():
				this.loading();
			window.requestAnimationFrame( animateFrame );
		})();
	},

	loop:function(){
		// timing

		//---------- updates ----------
		camera.update();

		// labels
		const l = $('#testlabel');
		var test =[0,0,0];
		camera.project( test, this.mtxModel, [150,80, app.floorLevel + 20] );
		l.style.left = test[0] + 'px';
		l.style.top = test[1] + 'px';

		//---------- rendering ----------
		// set up screen
		webgl.prepareScreen();

		// render
		this.render();
	},

	moveCamera:function(dx,dy,btn){
		//
		const rx = dx * 0.005;
		const ry = dy * 0.0025;

//		console.log(dx,dy,btn);
//		glMatrix.mat4.rotateX( this.mtxModel, this.mtxModel, 0.002 );
		
//		camera.orbitalAngle += rx;
		camera.orbitalTilt += ry;
		camera.orbitalTilt = Math.min(Math.max( camera.orbitalTilt, 0), 1);


		glMatrix.mat4.rotateZ( this.mtxModel, this.mtxModel, rx );
//		glMatrix.mat4.rotateX( this.mtxModel, this.mtxModel, ry );
	},

	zoomCamera:function(dz){
		//
		camera.disFromTarget *= dz + 1;
	},

	updateCameraLens:function(){
		const o = $('#slider2');
		this.cameraIsoMode = o.value / o.max;

		// lerp between states
		const mf = this.cameraIsoMode;
		const fov0 = 60, fov1 = 1;
		const fov = fov0 * (1 - mf) + fov1 * mf;

		camera.fov = fov;
		camera.normalizeToRect(
			this.modelBounds[0],
			this.modelBounds[1],
			this.modelBounds[2],
			this.modelBounds[3],
		);

		// also 
	},

	render:function(){

		const o = $('#slider1');
		const mf = o.value / o.max;
		renderer.buffers.elementCount = mf * renderer.buffers.elementCountMax >>0;

		// move to floor level
		camera.posTarget[2] = -this.floorLevel;
//		glMatrix.mat4.rotateX( this.mtxModel, this.mtxModel, 0.002 );
//		glMatrix.mat4.rotateY( this.mtxModel, this.mtxModel, 0.01 );
//		glMatrix.mat4.rotateZ( this.mtxModel, this.mtxModel, 0.02 );

		renderer.render( this.mtxModel );
	},
}


const $ = function(s){
	return document.querySelector(s) || null;
}
