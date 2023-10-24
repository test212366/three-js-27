uniform float time;
uniform float progress;
uniform sampler2D scene360;
uniform sampler2D scenePlanet;

uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.1415926;



vec2 distort(vec2 olduv, float pr,  float expo) {
	vec2 p0 = 2. * olduv - 1.;
	vec2 p1 = p0 / (1. - pr * length(p0) * expo);
	return (p1 + 1.) * .5;
}


void main() {

	float progress1 = smoothstep(0.75, 1., progress);

	vec2 uv1 = distort(vUv, - 10. * pow(0.5 + 0.5 * progress, 32.), progress * 4. );
	vec2 uv2 = distort(vUv, - 10. * ( 1. - progress1), progress * 4. );



	vec4 s360 = texture2D(scene360, uv2);
	vec4 sPlanet = texture2D(scenePlanet, uv1);
	float mixer = progress1;

	vec4 finalTexture = mix(sPlanet, s360, mixer);

	gl_FragColor = finalTexture;
}