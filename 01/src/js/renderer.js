"use strict";




const renderer = {

	isReady:false,

	shader:undefined,

	buffers:null,





	



	//=========================================================================== Init ===========================================================================
	
	init:function(){
		this.buffers = webgl.createPoints( 100, 3,0,2 );

		// make some random test data
		let a = this.buffers.pos.array;
		for( let i = 0; i < a.length; i += 3) {
			a[i + 0] = Math.random() * 5;
			a[i + 1] = Math.random() * 5;
		}
		this.buffers.pos.bufferPushed = false;
		this.buffers.elementCount = this.buffers.elementCountMax;

		// centralise camera


		/*
		*/
	},











	//=========================================================================== Render ===========================================================================

	render:function( mtxModel ){
		if( !webgl.isReady ) return;
		
		var gl = webgl.gl;
		var shader = webgl.shaderPoints;
		
		// set shader program
		webgl.prepareShader( shader );

		// set uniforms
		gl.uniformMatrix4fv( shader.uniforms.mtxModel, false, mtxModel );
		gl.uniformMatrix4fv( shader.uniforms.mtxCamera, false, camera.mtxCamera );
		gl.uniformMatrix4fv( shader.uniforms.mtxProjection, false, camera.mtxProjection );

		// for fake height shading
		gl.uniform2f( shader.uniforms.planeHeights, app.floorLevel, app.ceilingLevel );

		// render buffers
		webgl.renderPoints( shader, this.buffers );
	}
}

