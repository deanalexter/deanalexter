"use strict";





//---------- math ----------

const MATH_DEGTORAD = Math.PI / 180;
const MATH_RADTODEG = 180 / Math.PI;




const camera = {



	// lens settings
	fov:50,
	nearCut:0.01,
	farCut:1000,

	// location settings (can be considered lat,lng)
	posX:0,
	posY:0,

	//



	// camera orientation
	posCamera:undefined, // position of camera
	rotCamera:undefined, // rotation angle of camera
	mtxCameraOrigin:undefined, // camera matrix at origin
	mtxCamera:undefined, // final camera matrix

	// orbital contrtols
	posTarget:undefined, // the target position (coordinate that the camera is looking at)
	disFromTarget:0, // distance from the target
	orbitalAngle:0,

	orbitalTilt:0.5,
	orbitalTiltMin: -Math.PI,
	orbitalTiltMax: -Math.PI * 0.55,


	// projection mattix
	mtxProjection:undefined,

	// lighting
	mtxNormal:undefined,

	// axis orient, so that +x,+y,+z is left-handed coordinate system
	axisOrientation:undefined,



	//
	init:function(){
		this.posTarget = glMatrix.vec3.create();
		this.disFromTarget = 4;
	
		this.posCamera = glMatrix.vec3.create();
		this.rotCamera = glMatrix.quat.create();
		this.mtxCameraOrigin = glMatrix.mat4.create();
		this.mtxCamera = glMatrix.mat4.create();

		this.mtxProjection = glMatrix.mat4.create();
		this.mtxNormal = glMatrix.mat4.create();

		this.axisOrientation = glMatrix.vec3.create();

		//
		glMatrix.vec3.set( this.axisOrientation, 1, 1, -1 );
	},

	update:function(){
		// updates camera based on camera settings for canvas renderer

		//----- perspective -----
		const w = window.innerWidth;
		const h = window.innerHeight;

		glMatrix.mat4.perspective( this.mtxProjection, this.fov * MATH_DEGTORAD, w / h, this.nearCut, this.farCut ); // create
		glMatrix.mat4.scale( this.mtxProjection, this.mtxProjection, this.axisOrientation ); // fix coordinate system

		//----- orbital -----
		glMatrix.quat.identity(this.rotCamera);

		const mfo = this.orbitalTilt * Math.pow(1 - app.cameraIsoMode, 5);
		glMatrix.quat.rotateX(this.rotCamera, this.rotCamera, this.orbitalTiltMin * (1 - mfo) + this.orbitalTiltMax * mfo );

		glMatrix.quat.rotateY(this.rotCamera, this.rotCamera, this.orbitalAngle);

		//----- compile camera view -----
		glMatrix.vec3.set( this.posCamera, this.posX, this.posY, this.disFromTarget );
		glMatrix.mat4.fromRotationTranslation( this.mtxCameraOrigin, this.rotCamera, this.posCamera ); // translate rotate
		glMatrix.mat4.translate( this.mtxCamera, this.mtxCameraOrigin, this.posTarget ); // move focus

		//----- lighting -----
//		glMatrix.mat4.invert( this.mtxNormal, this.mtxCamera );
//		glMatrix.mat4.transpose( this.mtxNormal, this.mtxNormal );
	},

	normalizeToRect:function(x0,x1,y0,y1){
		// with current pov move camera to match rect center

		const dx = x1 - x0;
		const dy = y1 - y0;
		const size = Math.max( dx, dy );

		const margin = 0.75;

		this.disFromTarget = (size * 0.5 * margin) / Math.sin(MATH_DEGTORAD * this.fov / 2.0);
		this.posX = (x0 + x1) * 0.5;
		this.posY = (y0 + y1) * 0.5;

		// set near and far cut
		this.farCut = this.disFromTarget * 5;
		this.nearCut = this.disFromTarget / 100;

		// new matrix
		this.update();
	},

	project:function( out, mtxModel, pos ){
		/*
		replicate camera projection function in shader

		vec4 posModel = mtxModel * vec4( aPosition, 1.0 );
		vec4 posCamera = mtxCamera * posModel;
		gl_Position = mtxProjection * posCamera;

		*/

		// get model position
		const posVert     = glMatrix.vec4.set( temps.vec4[0], pos[0], pos[1], pos[2], 1.0 );
		const posModel    = glMatrix.vec4.transformMat4( temps.vec4[1], posVert, mtxModel );

		// calculate coordinates relative to camera
		const posCamera   = glMatrix.vec4.transformMat4( temps.vec4[2], posModel,  this.mtxCamera );

		// calculate projected coordinates
		const gl_Position = glMatrix.vec4.transformMat4( temps.vec4[3], posCamera, this.mtxProjection );

		// convert to screen
		const w = window.innerWidth;
		const h = window.innerHeight;
		const iw = 1 / gl_Position[3];
		out[0] = (1 + gl_Position[0] * iw) / 2 * w;
		out[1] = (1 - gl_Position[1] * iw) / 2 * h;
		out[2] = gl_Position[2] * iw;
	},

	unproject:function( screenX,screenY, assumedZ, screenWidth, screenHeight, vecOut ){
		// derives an XYZ world coordinate from screen XY coorindates (and an assumed Z), by reversing the projection and view matrices

		// get camera matrix
		var mtxV = this.mtxCameraOrigin,
			mtxP = this.mtxProjection;

		// xyz to projection coords
		var wP = assumedZ; // assumed distance from camera (we have to specify some value in order to solve the equation
		var xP = (screenX * 2 / screenWidth  - 1) * wP;
		var yP = (screenY * 2 / screenHeight - 1) * wP;

		// xyz to view coords
		var xV = (xP + wP * mtxP[8]) / mtxP[0];
		var yV = (yP + wP * mtxP[9]) / mtxP[5];
		var zV = -wP;

		// xyz to world coords
		var n0  = mtxV[0],
			n1  = mtxV[1],
			n2  = mtxV[2],
			n3  = mtxV[3],
			n4  = mtxV[4],
			n5  = mtxV[5],
			n6  = mtxV[6],
			n7  = mtxV[7],
			n8  = mtxV[8],
			n9  = mtxV[9],
			n10 = mtxV[10],
			n11 = mtxV[11],
			n12 = mtxV[12],
			n13 = mtxV[13],
			n14 = mtxV[14],
			n15 = mtxV[15];

		var A = n0  * n5  - n1  * n4,
			B = n0  * n6  - n2  * n4,
			t = n0  * n7  - n3  * n4,
			u = n1  * n6  - n2  * n5,
			v = n1  * n7  - n3  * n5,
			w = n2  * n7  - n3  * n6,
			x = n8  * n13 - n9  * n12,
			y = n8  * n14 - n10 * n12,
			z = n8  * n15 - n11 * n12,
			C = n9  * n14 - n10 * n13,
			D = n9  * n15 - n11 * n13,
			E = n10 * n15 - n11 * n14;

		var q = 1/(A * E - B * D + t * C + u * z - v * y + w * x);
		var m0  = ( n5  * E - n6  * D + n7  * C) * q,
			m1  = (-n1  * E + n2  * D - n3  * C) * q,
			m2  = ( n13 * w - n14 * v + n15 * u) * q,
			m4  = (-n4  * E + n6  * z - n7  * y) * q,
			m5  = ( n0  * E - n2  * z + n3  * y) * q,
			m6  = (-n12 * w + n14 * t - n15 * B) * q,
			m8  = ( n4  * D - n5  * z + n7  * x) * q,
			m9  = (-n0  * D + n1  * z - n3  * x) * q,
			m10 = ( n12 * v - n13 * t + n15 * A) * q,
			m12 = (-n4  * C + n5  * y - n6  * x) * q,
			m13 = ( n0  * C - n1  * y + n2  * x) * q,
			m14 = (-n12 * u + n13 * B - n14 * A) * q;

		var xW = m0 * xV + m4 * yV +  m8 * zV + m12;
		var yW = m1 * xV + m5 * yV +  m9 * zV + m13;
		var zW = m2 * xV + m6 * yV + m10 * zV + m14;

		// store
		vecOut[0] = xW;
		vecOut[1] = yW;
		vecOut[2] = zW;
	}
}


// generic global pool of objects
const temps = {
	vec4:[
		glMatrix.vec4.create(),
		glMatrix.vec4.create(),
		glMatrix.vec4.create(),
		glMatrix.vec4.create(),
	],
}


