uniform float uPointSize;
uniform bool  uSizeAttenuation;
uniform vec2  uSizeRange;
uniform float uDepthFade;

attribute float aRadius;
attribute float aOpacity;

varying vec3  vColor;
varying float vOpacity;

void main() {
	vColor = color; // three.js injects `color` when vertexColors = true

	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * mvPosition;

	// Point size: base × per-sample radius
	// When attenuation is off, pointSize is direct pixel size.
	// When on, scale inversely with depth (smaller constant for tighter control).
	float size = uPointSize * aRadius;
	if (uSizeAttenuation) {
		size *= (10.0 / -mvPosition.z);
	}
	gl_PointSize = clamp(size, uSizeRange.x, uSizeRange.y);

	// Depth-based opacity fade
	float depth = -mvPosition.z;
	float depthFactor = uDepthFade > 0.0
		? exp(-uDepthFade * depth * 0.01)
		: 1.0;
	vOpacity = aOpacity * depthFactor;
}
