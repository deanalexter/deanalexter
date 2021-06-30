#version 300 es

precision highp float;

in vec3 col;

out vec4 colOut;



void main( void ){

	// circular particles (discard corners)
	float dx = gl_PointCoord.x - 0.5;
	float dy = gl_PointCoord.y - 0.5;
	float dis = smoothstep( 0.4, 0.5, sqrt( dx*dx + dy*dy ));
	if( dis > 0.98 ) discard;


	//-----
	colOut = vec4( col, 1.0 );
	//colOut.a = dis;
}
