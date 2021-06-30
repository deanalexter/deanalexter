#version 300 es

precision highp float;

in vec3 aPosition; // contains x,y,z
in vec3 aData;  // contains index

uniform mat4 mtxModel;
uniform mat4 mtxCamera;
uniform mat4 mtxProjection;

uniform vec2 planeHeights;

out vec3 col;



vec3 col0 = vec3( 0.047058823529411764, 0.45098039215686275, 0.996078431372549 );
vec3 col1 = vec3( 1.0, 1.0, 1.0 );

void main( void ){


	// get model position
	vec4 posModel = mtxModel * vec4( aPosition, 1.0 );

	// calculate coordinates relative to camera
	vec4 posCamera = mtxCamera * posModel;

	// calculate projected coordinates
	gl_Position = mtxProjection * posCamera;
	gl_PointSize = 2.0;

//	gl_Position = vec4(aPosition,1.0);



	// mix colors based on height
	float mfmix = smoothstep( planeHeights.x, planeHeights.y, posModel.z );
	mfmix = pow(mfmix, 0.2 );
	col = mix( col0, col1, mfmix);
}
