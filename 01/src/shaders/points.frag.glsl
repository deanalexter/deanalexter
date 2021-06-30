#version 300 es

precision highp float;

in vec3 col;

out vec4 colOut;



void main( void ){

	//-----
	colOut = vec4( col, 1.0 );
//	colOut = vec4( 0.0, 1.0, 0.0, 1.0 );
}
