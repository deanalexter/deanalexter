"use strict";






const GL_BYTES_PER_FLOAT = 4;
const GL_BYTES_PER_INT = 4;
const GL_BYTES_PER_SHORT = 2;

const GL_VERTS_PER_POINT = 1;
const GL_VERTS_PER_LINE = 2;
const GL_VERTS_PER_TRIANGLE = 3;
const GL_VERTS_PER_QUAD = 4;
const GL_TRIANGLES_PER_QUAD = 2;

const GL_SHADER_BLEND_ON = true;
const GL_SHADER_BLEND_OFF = false;
const GL_SHADER_DEPTH_ON = true;
const GL_SHADER_DEPTH_OFF = false;
const GL_CULLING_NONE = 0;
const GL_CULLING_FRONT = 1;
const GL_CULLING_BACK  = 2;





const webgl = {

	glCanvas:null,
	glExtensions:[],

	shaders:[],
	shaderFiles:[
		'points.vert.glsl',
		'points.frag.glsl'
	],
	shaderSrc:[],



	init:function( glCanvas ){
		this.initGL(glCanvas);
		this.loadShaders('shaders/');
	},

	initGL:function( glCanvas ){

		// create canvas for WebGL to draw onto.
		this.glCanvas = glCanvas;
		try{
			this.gl = this.glCanvas.getContext( 'webgl2', { premultipliedAlpha:false });
		}catch(e){
			this.gl = null; // WebGL not found
		}
		if( !this.gl ){
			return false;
		}

		// get parameters
		var gl = this.gl;
		this.maxAttributes = gl.getParameter( gl.MAX_VERTEX_ATTRIBS ) || 16;
		this.maxTextureCount = gl.getParameter( gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS ) || 4; // we will assume 4, if no information is available
		this.maxTextureSize = gl.getParameter( gl.MAX_TEXTURE_SIZE ) || 4096; // we will assume 4096, if no information is available
		this.maxVaryings = gl.getParameter( gl.MAX_VARYING_VECTORS ) || 16;
		this.supportHighPrecisionVertex   = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER,   gl.HIGH_FLOAT ).rangeMin >= 10;
		this.supportHighPrecisionFragment = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT ).rangeMin >= 10;

		// extensions
		this.glExtensions.push( gl.getExtension( 'EXT_color_buffer_float' )); // floating point textures in frame buffer object alpha ?

		// debug info
		console.log( '---------- WebGL capabilities ----------');
		console.log( 'maxTextureCount = ' + this.maxTextureCount );
		console.log( 'maxTextureSize = ' + this.maxTextureSize );
		console.log( 'maxVaryings = ' + this.maxVaryings );
		console.log( 'supportHighPrecisionVertex = ' + this.supportHighPrecisionVertex );
		console.log( 'supportHighPrecisionFragment = ' + this.supportHighPrecisionFragment );

		// extensions
		console.log( '---------- WebGL extensions ----------');
		console.log( 'EXT_color_buffer_float = ' + !!gl.getExtension( 'EXT_color_buffer_float' ) );
		console.log( 'EXT_frag_depth = ' + !!gl.getExtension( 'EXT_frag_depth' ) );

		//
		console.log( '----------');

		//
		return true;
	},

	loadShaders:function(path){
		for (let f of this.shaderFiles) {
			this.loadShaderFile(path, f);
		}
	},

	loadShaderFile:function(path, filename){
		// synchronously load a file then return the contents

		const xhr = new XMLHttpRequest();
		const url = path + filename;

		xhr.onload = (e) => {
			if( xhr.readyState === 4 ){
				if( xhr.status === 200 ){
					this.shaderSrc[ filename ] = xhr.responseText;
					console.log(xhr.responseText);
					this.loadShadersComplete();
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

	loadShadersComplete:function(){
		// check all shaders are loaded

		let loaded = true;
		for (let f of this.shaderFiles) {
			let src = this.shaderSrc[f];
			if( !src || !(src.length > 0)) loaded = false;
		}
		if (!loaded) return;

		//
		console.log('SHADERS LOADED!!!');

		//
		this.shaderPoints = this.newShader(
			'points.vert.glsl',
			'points.frag.glsl'
		);

		this.shaderPoints.enableDepth = true;
		this.shaderPoints.enableBlending = false;
		this.shaderPoints.cullingMode = GL_CULLING_NONE;


		// lookup attributes and uniforms
		this.getAttributes( this.shaderPoints,
			'aPosition',
			'aData'
		);
		this.getUniforms( this.shaderPoints,
			'mtxModel',
			'mtxCamera',
			'mtxProjection',
			'planeHeights'
		);

		// flags
		this.isReady = true;
	},







	newShader:function( srcvert, srcfrag ){
		var shader = new Shader();

		this.initShader( shader, srcvert, srcfrag );

		return shader;
	},

	initShader:function( shader, srcvert, srcfrag ){
		shader.srcVertShader = this.shaderSrc[ srcvert ].trim();
		shader.srcFragShader = this.shaderSrc[ srcfrag ].trim();

		this.initShaderPrograms( shader );

		shader.isLoaded = true;
	},

	initShaderPrograms:function( shader ){
		// compile the shader src code and attach it

		var gl = this.gl;

		var objVert = shader.objVertShader = gl.createShader( gl.VERTEX_SHADER );
		var objFrag = shader.objFragShader = gl.createShader( gl.FRAGMENT_SHADER );

		// swap precision in source
		if( !this.supportHighPrecisionVertex ){
			shader.srcVertShader = shader.srcVertShader.replace(/precision[ \t\n]+highp[ \t\n]+float;/g,'precision mediump float;');
		}
		if( !this.supportHighPrecisionFragment ){
			shader.srcFragShader = shader.srcFragShader.replace(/precision[ \t\n]+highp[ \t\n]+float;/g,'precision mediump float;');
		}

		// attach source
		gl.shaderSource( objVert, shader.srcVertShader );
		gl.shaderSource( objFrag, shader.srcFragShader );
		gl.compileShader( objVert );
		gl.compileShader( objFrag );

		var prog = shader.prog = gl.createProgram();

		gl.attachShader( prog, objVert );
		gl.attachShader( prog, objFrag );
		gl.linkProgram( prog );

		if( !gl.getProgramParameter( prog, gl.LINK_STATUS )){ // error. could not initialise shaders

			var debug = '';
			debug += shader.srcVertShader;
			debug += shader.srcFragShader;

			console.error( 'Error Compiling Shaders.' );
			console.error( gl.getShaderInfoLog( objVert ));
			console.error( gl.getShaderInfoLog( objFrag ));

			this.isEnabled = false;
			return;
		}
	},

	getAttributes:function( shader, ...attributes ){
		// get attribute location in shader program

		var gl = this.gl;

		var i,a;
		for( i in attributes ){
			a = attributes[ i ];
			shader.attributes[ a ] = gl.getAttribLocation( shader.prog, a );
		}
	},

	getUniforms:function( shader, ...uniforms ){
		// get uniform location in shader program

		var gl = this.gl;

		var i,u;
		for( i in uniforms ){
			u = uniforms[ i ];
			shader.uniforms[ u ] = gl.getUniformLocation( shader.prog, u );
		}
	},




	createPoints:function( pointCount, posSize, colSize, dataSize ){

		// create geometry buffers
		var buffers = this.createPointBuffers(
			pointCount,			// max line count

			posSize,			// position dimensions
			colSize,			// color dimensions
			dataSize			// data dimensions
		);

		buffers.elementCount = 0;

		/*
		var mesh = new Mesh( buffers );

		//
		return mesh;
		*/
		return buffers;
	},

	createPointBuffers:function( pointCountMax, posFloatCount, colFloatCount, dataFloatCount ){
		// create webgl buffers and objects needed for point geometry

		var gl = this.gl;

		// build buffer object
		var buffers = new BufferContainer( GL_VERTS_PER_POINT, pointCountMax );

		if( posFloatCount > 0 )  buffers.pos  = new BufferElements( gl, buffers, posFloatCount );
		if( colFloatCount > 0 )  buffers.col  = new BufferElements( gl, buffers, colFloatCount );
		if( dataFloatCount > 0 ) buffers.data = new BufferElements( gl, buffers, dataFloatCount );

		// return
		return buffers;
	},






	setClearColor:function( hex, alpha ){

		var gl = this.gl;
		var col = this.colHexToRGBFloat( hex, alpha );

		gl.clearColor( col.r, col.g, col.b, alpha );
	},

	setViewport:function( w,h ){
		// set the viewport coordinates to this rect

		const gl = this.gl;
		gl.viewport( 0,0, w, h );
	},

	prepareShader:function( shader ){
		// use this shader

		const gl = this.gl;
		const prog = shader.prog;


		// set new shader program
		gl.useProgram( shader.prog );


		// depth writing
		shader.enableDepth ?
			gl.enable( gl.DEPTH_TEST ):
			gl.disable( gl.DEPTH_TEST );

		// blending mode
		shader.enableBlending ?
			gl.enable( gl.BLEND ):
			gl.disable( gl.BLEND );

		// culling
		switch( shader.cullingMode ){
			case GL_CULLING_NONE:
				gl.disable( gl.CULL_FACE );
				break;
			case GL_CULLING_FRONT:
				gl.enable( gl.CULL_FACE );
				gl.cullFace( gl.FRONT );
				break;
			case GL_CULLING_BACK:
				gl.enable( gl.CULL_FACE );
				gl.cullFace( gl.BACK );
				break;
		}
	},

	prepareScreen:function(){
		const gl = this.gl;

		// render to screen
		this.setViewport( this.glCanvas.width, this.glCanvas.height );

		// clear screen
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		// blending mode
		gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.DST_ALPHA );
//		gl.blendFunc( gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
	},

	renderPoints:function( shader, buffers ){
		const gl = this.gl;
		const attributes = shader.attributes;

		//
		if( buffers.elementCount === 0 ) return;

		// enable vertex attributes
		this.renderSetBufferAttribute( buffers, buffers.pos,  attributes.aPosition );
		this.renderSetBufferAttribute( buffers, buffers.col,  attributes.aColor );
		this.renderSetBufferAttribute( buffers, buffers.data, attributes.aData );

		// draw
		gl.drawArrays( gl.POINTS, 0, buffers.vertsPerElement * buffers.elementCount );

		// reset
		gl.disableVertexAttribArray( attributes.aPosition );
		gl.disableVertexAttribArray( attributes.aColor );
		gl.disableVertexAttribArray( attributes.aData );
	},

	renderSetBufferAttribute:function( buffers, bufferElement, attribute ){
		if( !bufferElement || attribute === undefined ) return;

		const gl = this.gl;

		gl.bindBuffer( gl.ARRAY_BUFFER, bufferElement.glBufferIndex );

		// update buffer data
		if( !bufferElement.bufferPushed ){
			gl.bufferSubData( gl.ARRAY_BUFFER, 0, bufferElement.array.subarray( 0, bufferElement.floatsPerVert * buffers.vertsPerElement * buffers.elementCount )); // update part of the buffer. from 0 to total
			bufferElement.bufferPushed = true;
		}

		gl.enableVertexAttribArray( attribute );
		gl.vertexAttribPointer( attribute, bufferElement.floatsPerVert, gl.FLOAT, false, 0, 0 );
	},

	colHexToRGBFloat:function( hex ){
		// unpack hex value of color

		return {
			r: ( hex >>16 & 0xff) / 0xff,
			g: ( hex >>8  & 0xff) / 0xff,
			b: ( hex      & 0xff) / 0xff
		}
	},
}







class BufferContainer {

	vertsPerElement = 0; // for example, this would be 3 for a buffer that is used as triangles

	elementCount = 0;
	elementCountMax = 0; // for example, total number of triangles in a mesh

	constructor( _vertsPerElement, _elementCountMax ){
		this.vertsPerElement = _vertsPerElement;
		this.elementCountMax = _elementCountMax;
	}
}

class BufferElements {

	array = null;

	floatsPerVert = 0; // for example, this would be 2 for a uv buffer
	bufferPushed = false;

	glBufferIndex = 0;

	constructor( gl, _buffers, _floatsPerVert ){
		this.floatsPerVert = _floatsPerVert;
		this.glBufferIndex = gl.createBuffer();
		this.array = new Float32Array( _floatsPerVert * _buffers.vertsPerElement * _buffers.elementCountMax );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.glBufferIndex );
		gl.bufferData( gl.ARRAY_BUFFER, this.array, gl.DYNAMIC_DRAW ); // push initial array. all elements.

		this.bufferPushed = true;
	}
}





class GLTexture {
	image = undefined;	// canvas or image data
	glTextureIndex = undefined; // index / serial / reference in gl memory

	width = 0;
	height = 0;

	// options
	useMipmap = false;
	flipY = false;
	needsUpdate = false;

	constructor( options ){
		if( options !== undefined ){
			if( options.flipY ) this.flipY = options.flipY;
			if( options.useMipmap ) this.useMipmap = options.useMipmap;
		}
	};
}





class GLTextureBuffer {
	glFrameBufferIndex = undefined; // reference to gl frame buffer memory
	glTextureIndex = undefined; // index / serial / reference in gl memory
	glDepthIndex = undefined; // reference to gl depth buffer

	width = 0;
	height = 0;
}





class Shader {
	
	isLoaded = false;

	enableDepth = true;
	enableBlending = true;
	cullingMode = GL_CULLING_BACK;

	srcVertShader = null;
	srcFragShader = null;

	objVertShader = undefined;
	objFragShader = undefined;

	prog = undefined;

	uniforms = [];
	attributes = [];

	constructor(){
	};
}




