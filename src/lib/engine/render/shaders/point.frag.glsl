uniform float uBrightness;
uniform float uSaturation;
uniform float uOpacity;
uniform float uEdgeSharpness;
uniform float uDarkCutoff;
uniform float uHueShift;
uniform float uWarmth;

varying vec3  vColor;
varying float vOpacity;

/* ---- colour-space helpers ---- */

vec3 rgb2hsl(vec3 c) {
	float hi = max(c.r, max(c.g, c.b));
	float lo = min(c.r, min(c.g, c.b));
	float l  = (hi + lo) * 0.5;

	if (hi == lo) return vec3(0.0, 0.0, l);

	float d = hi - lo;
	float s = l > 0.5 ? d / (2.0 - hi - lo) : d / (hi + lo);

	float h;
	if      (hi == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
	else if (hi == c.g) h = (c.b - c.r) / d + 2.0;
	else                h = (c.r - c.g) / d + 4.0;
	h /= 6.0;

	return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
	if (t < 0.0) t += 1.0;
	if (t > 1.0) t -= 1.0;
	if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
	if (t < 0.5)        return q;
	if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
	return p;
}

vec3 hsl2rgb(vec3 hsl) {
	if (hsl.y == 0.0) return vec3(hsl.z);

	float q = hsl.z < 0.5
		? hsl.z * (1.0 + hsl.y)
		: hsl.z + hsl.y - hsl.z * hsl.y;
	float p = 2.0 * hsl.z - q;

	return vec3(
		hue2rgb(p, q, hsl.x + 1.0 / 3.0),
		hue2rgb(p, q, hsl.x),
		hue2rgb(p, q, hsl.x - 1.0 / 3.0)
	);
}

/* ---- main ---- */

void main() {
	// Circular point with configurable edge sharpness
	float dist = length(gl_PointCoord - 0.5);
	if (dist > 0.5) discard;

	float innerEdge = mix(0.0, 0.48, uEdgeSharpness);
	float edge = 1.0 - smoothstep(innerEdge, 0.5, dist);

	// Convert to HSL for colour grading
	vec3 hsl = rgb2hsl(vColor);

	// Hue rotation
	hsl.x = fract(hsl.x + uHueShift);

	// Saturate BEFORE brightness so exposure doesn't kill colour
	hsl.y = clamp(hsl.y * uSaturation, 0.0, 1.0);

	// Convert back to RGB for exposure
	vec3 saturated = hsl2rgb(hsl);

	// Exposure / gain on saturated colour — preserves hue relationships
	vec3 finalColor = saturated * uBrightness;

	// Warmth: shift colour temperature (positive = warm/amber, negative = cool/blue)
	finalColor.r += uWarmth * 0.1;
	finalColor.b -= uWarmth * 0.1;
	finalColor = clamp(finalColor, 0.0, 1.0);

	// Dark cutoff: fade out points whose luminance is below the threshold
	float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
	float darkFade = uDarkCutoff > 0.0
		? smoothstep(uDarkCutoff * 0.3, uDarkCutoff, lum)
		: 1.0;

	float alpha = edge * vOpacity * uOpacity * darkFade;
	if (alpha < 0.01) discard;

	gl_FragColor = vec4(finalColor, alpha);
}
