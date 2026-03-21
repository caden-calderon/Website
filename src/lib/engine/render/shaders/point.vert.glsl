uniform float uPointSize;
uniform bool  uSizeAttenuation;
uniform vec2  uSizeRange;
uniform float uDepthFade;

attribute float aRadius;
attribute float aOpacity;

varying vec3  vColor;
varying float vOpacity;
varying float vSeed; // per-point random seed for fragment colour noise

// Fast hash from position for per-point randomness
float hash(vec3 p) {
	p = fract(p * vec3(443.897, 441.423, 437.195));
	p += dot(p, p.yzx + 19.19);
	return fract((p.x + p.y) * p.z);
}

void main() {
	vColor = color;
	vSeed = hash(position);

	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * mvPosition;

	float size = uPointSize * aRadius;
	if (uSizeAttenuation) {
		size *= (10.0 / -mvPosition.z);
	}
	gl_PointSize = clamp(size, uSizeRange.x, uSizeRange.y);

	float depth = -mvPosition.z;
	float depthFactor = uDepthFade > 0.0
		? exp(-uDepthFade * depth * 0.01)
		: 1.0;
	vOpacity = aOpacity * depthFactor;
}
