BABYLON.Effect.ShadersStore["pathTracingFragmentShader"] = `
#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

// Demo-specific Uniforms
uniform mat4 uSphereInvMatrix;
uniform mat4 uCylinderInvMatrix;
uniform mat4 uConeInvMatrix;
uniform mat4 uParaboloidInvMatrix;
uniform mat4 uHyperboloidInvMatrix;
uniform mat4 uCapsuleInvMatrix;
uniform mat4 uFlattenedRingInvMatrix;
uniform mat4 uBoxInvMatrix;
uniform mat4 uPyramidFrustumInvMatrix;
uniform mat4 uDiskInvMatrix;
uniform mat4 uRectangleInvMatrix;
uniform mat4 uTorusInvMatrix;
uniform float uQuadLightPlaneSelectionNumber;
uniform float uQuadLightRadius;
uniform float uShapeK;
uniform int uAllShapesMatType;

// demo/scene-specific setup
#define N_QUADS 6

struct Quad { vec3 normal; vec3 v0; vec3 v1; vec3 v2; vec3 v3; vec3 color; int type; };

Quad quads[N_QUADS];

// the camera ray for this pixel (global variables)
vec3 rayOrigin, rayDirection;


// all required includes go here:

#include<pathtracing_defines_and_uniforms> // required on all scenes

#include<pathtracing_random> // required on all scenes

#include<pathtracing_calc_fresnel> // required on all scenes

#include<pathtracing_solve_quadratic> // required on scenes with any math-geometry shapes like sphere, cylinder, cone, etc.

#include<pathtracing_unit_sphere_intersect> // required on scenes with unit spheres that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_cylinder_intersect> // required on scenes with unit cylinders that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_cone_intersect> // required on scenes with unit cones that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_paraboloid_intersect> // required on scenes with unit paraboloids that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_hyperboloid_intersect> // required on scenes with unit hyperboloids that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_capsule_intersect> // required on scenes with unit capsules that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_flattened_ring_intersect> // required on scenes with unit flattened rings that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_box_intersect> // required on scenes with unit boxes that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_pyramid_frustum_intersect> // required on scenes with pyramids/frustums that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_disk_intersect> // required on scenes with unit disks that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_rectangle_intersect> // required on scenes with unit rectangles that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_unit_torus_intersect> // required on scenes with unit torii/rings that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_quad_intersect> // required on scenes with quads (actually internally they are made up of 2 triangles)

#include<pathtracing_sample_axis_aligned_quad_light> // required on scenes with axis-aligned quad area lights (quad must reside in either XY, XZ, or YZ planes) 


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void SceneIntersect( vec3 rayOrigin, vec3 rayDirection, out float hitT, out vec3 hitNormal, out vec3 hitEmission, out vec3 hitColor, out int hitType, out float hitObjectID )
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	//rayDirection = normalize(rayDirection);

	vec3 rObjOrigin, rObjDirection;
	vec3 hit, n;
	float d;
	int objectCount = 0;

	// initialize hit record 
	hitT = INFINITY;
	hitType = -100;
	hitObjectID = -INFINITY;
	
	
        // transform ray into sphere's object space
	rObjOrigin = vec3( uSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uSphereInvMatrix * vec4(rayDirection, 0.0) );
	// rObjDirection = normalize(rObjDirection);
	d = UnitSphereIntersect( rObjOrigin, rObjDirection, n );
	// hit = rObjOrigin + rObjDirection * d;
	// hit = vec3( inverse(uSphereInvMatrix) * vec4(hit, 1.0) );
	// d = distance(rayOrigin, hit);

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uSphereInvMatrix)) * hitNormal);
		hitColor = vec3(1.0, 0.0, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into cylinder's object space
	rObjOrigin = vec3( uCylinderInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCylinderInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitCylinderIntersect( rObjOrigin, rObjDirection, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uCylinderInvMatrix)) * hitNormal);
		hitColor = vec3(0.0, 1.0, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into cone's object space
	rObjOrigin = vec3( uConeInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uConeInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitConeIntersect( rObjOrigin, rObjDirection, uShapeK, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uConeInvMatrix)) * hitNormal);
		hitColor = vec3(1.0, 1.0, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into paraboloid's object space
	rObjOrigin = vec3( uParaboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uParaboloidInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitParaboloidIntersect( rObjOrigin, rObjDirection, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uParaboloidInvMatrix)) * hitNormal);
		hitColor = vec3(1.0, 0.0, 1.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into hyperboloid's object space
	rObjOrigin = vec3( uHyperboloidInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uHyperboloidInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitHyperboloidIntersect( rObjOrigin, rObjDirection, uShapeK, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uHyperboloidInvMatrix)) * hitNormal);
		hitColor = vec3(1.0, 0.1, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into capsule's object space
	rObjOrigin = vec3( uCapsuleInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uCapsuleInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitCapsuleIntersect( rObjOrigin, rObjDirection, uShapeK, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uCapsuleInvMatrix)) * hitNormal);
		hitColor = vec3(0.5, 1.0, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into flattened ring's object space
	rObjOrigin = vec3( uFlattenedRingInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uFlattenedRingInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitFlattenedRingIntersect( rObjOrigin, rObjDirection, uShapeK, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uFlattenedRingInvMatrix)) * hitNormal);
		hitColor = vec3(0.0, 0.4, 1.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into box's object space
	rObjOrigin = vec3( uBoxInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uBoxInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitBoxIntersect( rObjOrigin, rObjDirection, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uBoxInvMatrix)) * hitNormal);
		hitColor = vec3(0.0, 0.0, 1.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into pyramid/frustum's object space
	rObjOrigin = vec3( uPyramidFrustumInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uPyramidFrustumInvMatrix * vec4(rayDirection, 0.0) );

	d = PyramidFrustumIntersect( rObjOrigin, rObjDirection, uShapeK, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uPyramidFrustumInvMatrix)) * hitNormal);
		hitColor = vec3(0.2, 0.0, 1.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into disk's object space
	rObjOrigin = vec3( uDiskInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uDiskInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitDiskIntersect( rObjOrigin, rObjDirection );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = vec3(0,-1,0);
		hitNormal = normalize(transpose(mat3(uDiskInvMatrix)) * hitNormal);
		hitColor = vec3(0.0, 1.0, 0.5);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into rectangle's object space
	rObjOrigin = vec3( uRectangleInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uRectangleInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitRectangleIntersect( rObjOrigin, rObjDirection );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = vec3(0,-1,0);
		hitNormal = normalize(transpose(mat3(uRectangleInvMatrix)) * hitNormal);
		hitColor = vec3(1.0, 0.3, 0.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into torus's object space
	rObjOrigin = vec3( uTorusInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uTorusInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitTorusIntersect( rObjOrigin, rObjDirection, uShapeK, n );
	
	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uTorusInvMatrix)) * hitNormal);
		hitColor = vec3(0.5, 0.0, 1.0);
		hitType = uAllShapesMatType;
		hitObjectID = float(objectCount);
	}
	objectCount++;

        
	for (int i = 0; i < N_QUADS; i++)
        {
		d = QuadIntersect( quads[i].v0, quads[i].v1, quads[i].v2, quads[i].v3, rayOrigin, rayDirection, false );

		if (d < hitT)
		{
			hitT = d;
			hitNormal = normalize(quads[i].normal);
			hitColor = quads[i].color;
			hitType = quads[i].type;
			hitObjectID = float(objectCount);
		}

		objectCount++;
        }

} // end void SceneIntersect( vec3 rayOrigin, vec3 rayDirection, out float hitT, out vec3 hitNormal, out vec3 hitEmission, out vec3 hitColor, out int hitType, out float hitObjectID )



//-----------------------------------------------------------------------------------------------------------------------------
vec3 CalculateRadiance( out vec3 objectNormal, out vec3 objectColor, out float objectID, out float pixelSharpness )
//-----------------------------------------------------------------------------------------------------------------------------
{
	// a record of ray-surface intersection data
	vec3 hitNormal, hitEmission, hitColor;
	vec2 hitUV;
	float hitT, hitObjectID;
	int hitTextureID;
	int hitType;

	Quad light = quads[5];

	vec3 accumCol = vec3(0);
        vec3 mask = vec3(1);
	vec3 dirToLight;
	vec3 tdir;
	vec3 x, n, nl;
	vec3 absorptionCoefficient;

	float nc, nt, ratioIoR, Re, Tr;
	float P, RP, TP;
	float weight;
	float thickness = 0.05;
	float scatteringDistance;

	int diffuseCount = 0;
	int previousIntersecType = -100;
	hitType = -100;

	bool coatTypeIntersected = false;
	bool bounceIsSpecular = true;
	bool sampleLight = false;


	for (int bounces = 0; bounces < 6; bounces++)
	{
		previousIntersecType = hitType;

		SceneIntersect(rayOrigin, rayDirection, hitT, hitNormal, hitEmission, hitColor, hitType, hitObjectID);


		if (hitT == INFINITY)
			break;

		// useful data
		n = normalize(hitNormal);
                nl = dot(n, rayDirection) < 0.0 ? normalize(n) : normalize(-n);
		x = rayOrigin + rayDirection * hitT;
		
		if (bounces == 0)
		{
			objectNormal = nl;
			objectColor = hitColor;
			objectID = hitObjectID;
		}
		if (bounces == 1 && previousIntersecType == METAL)
		{
			objectNormal = nl;
			objectID = hitObjectID;
		}


		if (hitType == LIGHT)
		{
			if (diffuseCount == 0)
				pixelSharpness = 1.01;

			if (bounceIsSpecular || sampleLight)
				accumCol = mask * hitColor;

			// reached a light, so we can exit
			break;

		} // end if (hitType == LIGHT)


		// if we get here and sampleLight is still true, shadow ray failed to find a light source
		if (sampleLight)
			break;



                if (hitType == DIFFUSE) // Ideal diffuse reflection
		{
			diffuseCount++;

			mask *= hitColor;

			bounceIsSpecular = false;

			if (diffuseCount == 1 && blueNoise_rand() < 0.5)
			{
				// choose random Diffuse sample vector
				rayDirection = randomCosWeightedDirectionInHemisphere(nl);
				rayOrigin = x + nl * uEPS_intersect;
				continue;
			}

			dirToLight = sampleAxisAlignedQuadLight(x, nl, quads[5], weight);
			mask *= weight;

			rayDirection = dirToLight;
			rayOrigin = x + nl * uEPS_intersect;

			sampleLight = true;
			continue;

		} // end if (hitType == DIFFUSE)


		if (hitType == METAL)  // Ideal metal specular reflection
		{
			mask *= hitColor;

			rayDirection = reflect(rayDirection, nl);
			rayOrigin = x + nl * uEPS_intersect;

			continue;
		}


		if (hitType == TRANSPARENT)  // Ideal dielectric specular reflection/refraction
		{
			if (diffuseCount == 0 && !coatTypeIntersected && !uCameraIsMoving )
				pixelSharpness = 1.01;
			else if (diffuseCount > 0)
				pixelSharpness = 0.0;
			else
				pixelSharpness = -1.0;
			
			nc = 1.0; // IOR of Air
			nt = 1.5; // IOR of common Glass
			Re = calcFresnelReflectance(rayDirection, n, nc, nt, ratioIoR);
			Tr = 1.0 - Re;
			P  = 0.25 + (0.5 * Re);
                	RP = Re / P;
                	TP = Tr / (1.0 - P);

			if (blueNoise_rand() < P)
			{
				mask *= RP;
				rayDirection = reflect(rayDirection, nl); // reflect ray from surface
				rayOrigin = x + nl * uEPS_intersect;
				continue;
			}

			// transmit ray through surface

			mask *= TP;
			mask *= hitColor;

			tdir = refract(rayDirection, nl, ratioIoR);
			rayDirection = tdir;
			rayOrigin = x - nl * uEPS_intersect;

			if (diffuseCount == 1)
				bounceIsSpecular = true; // turn on refracting caustics

			continue;

		} // end if (hitType == TRANSPARENT)


		if (hitType == CLEARCOAT_DIFFUSE)  // Diffuse object underneath with ClearCoat on top
		{
			coatTypeIntersected = true;

			pixelSharpness = 0.0;

			nc = 1.0; // IOR of Air
			nt = 1.4; // IOR of Clear Coat
			Re = calcFresnelReflectance(rayDirection, nl, nc, nt, ratioIoR);
			Tr = 1.0 - Re;
			P  = 0.25 + (0.5 * Re);
                	RP = Re / P;
                	TP = Tr / (1.0 - P);

			if (blueNoise_rand() < P)
			{
				if (diffuseCount == 0)
					pixelSharpness = uFrameCounter > 500.0 ? 1.01 : -1.0;

				mask *= RP;
				rayDirection = reflect(rayDirection, nl); // reflect ray from surface
				rayOrigin = x + nl * uEPS_intersect;
				continue;
			}

			diffuseCount++;
			mask *= TP;
			mask *= hitColor;

			bounceIsSpecular = false;

			if (diffuseCount == 1 && blueNoise_rand() < 0.5)
			{
				// choose random Diffuse sample vector
				rayDirection = randomCosWeightedDirectionInHemisphere(nl);
				rayOrigin = x + nl * uEPS_intersect;
				continue;
			}

			dirToLight = sampleAxisAlignedQuadLight(x, nl, quads[5], weight);
			mask *= weight;

			rayDirection = dirToLight;
			rayOrigin = x + nl * uEPS_intersect;

			// this check helps keep random noisy bright pixels from this clearCoat diffuse surface out of the possible previous refracted glass surface
			if (bounces < 3) 
				sampleLight = true;
			continue;

		} //end if (hitType == CLEARCOAT_DIFFUSE)

	} // end for (int bounces = 0; bounces < 6; bounces++)


	return max(vec3(0), accumCol);

} // end vec3 CalculateRadiance( out vec3 objectNormal, out vec3 objectColor, out float objectID, out float pixelSharpness )


//-----------------------------------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------------------------------
{
	vec3 light_emissionColor = vec3(1.0, 1.0, 1.0) * 10.0; // Bright white light
	float wallRadius = 50.0;
	float lightRadius = uQuadLightRadius * 0.2;

	quads[0] = Quad( vec3( 0, 0, 1), vec3(-wallRadius, wallRadius, wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3(-wallRadius,-wallRadius, wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Back Wall
	quads[1] = Quad( vec3( 1, 0, 0), vec3(-wallRadius,-wallRadius, wallRadius), vec3(-wallRadius,-wallRadius,-wallRadius), vec3(-wallRadius, wallRadius,-wallRadius), vec3(-wallRadius, wallRadius, wallRadius), vec3( 0.7, 0.05, 0.05), DIFFUSE);// Left Wall Red
	quads[2] = Quad( vec3(-1, 0, 0), vec3( wallRadius,-wallRadius,-wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3( wallRadius, wallRadius,-wallRadius), vec3(0.05, 0.05,  0.7), DIFFUSE);// Right Wall Blue
	quads[3] = Quad( vec3( 0,-1, 0), vec3(-wallRadius, wallRadius,-wallRadius), vec3( wallRadius, wallRadius,-wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3(-wallRadius, wallRadius, wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Ceiling
	quads[4] = Quad( vec3( 0, 1, 0), vec3(-wallRadius,-wallRadius, wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3( wallRadius,-wallRadius,-wallRadius), vec3(-wallRadius,-wallRadius,-wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Floor

	if (uQuadLightPlaneSelectionNumber == 1.0)
		quads[5] = Quad( vec3(-1, 0, 0), vec3(wallRadius-1.0,-lightRadius, lightRadius), vec3(wallRadius-1.0, lightRadius, lightRadius), vec3(wallRadius-1.0, lightRadius,-lightRadius), vec3(wallRadius-1.0,-lightRadius,-lightRadius), light_emissionColor, LIGHT);// Quad Area Light on right wall
	else if (uQuadLightPlaneSelectionNumber == 2.0)
		quads[5] = Quad( vec3( 1, 0, 0), vec3(-wallRadius+1.0,-lightRadius,-lightRadius), vec3(-wallRadius+1.0, lightRadius,-lightRadius), vec3(-wallRadius+1.0, lightRadius, lightRadius), vec3(-wallRadius+1.0,-lightRadius, lightRadius), light_emissionColor, LIGHT);// Quad Area Light on left wall
	else if (uQuadLightPlaneSelectionNumber == 3.0)
		quads[5] = Quad( vec3( 0, 0, 1), vec3(-lightRadius,-lightRadius, -wallRadius+1.0), vec3(lightRadius,-lightRadius, -wallRadius+1.0), vec3(lightRadius, lightRadius, -wallRadius+1.0), vec3(-lightRadius, lightRadius, -wallRadius+1.0), light_emissionColor, LIGHT);// Quad Area Light on front 'wall'(opening of box)
	else if (uQuadLightPlaneSelectionNumber == 4.0)
		quads[5] = Quad( vec3( 0, 0,-1), vec3(-lightRadius,-lightRadius, wallRadius-1.0), vec3(-lightRadius, lightRadius, wallRadius-1.0), vec3(lightRadius, lightRadius, wallRadius-1.0), vec3(lightRadius,-lightRadius, wallRadius-1.0), light_emissionColor, LIGHT);// Quad Area Light on back wall
	else if (uQuadLightPlaneSelectionNumber == 5.0)
		quads[5] = Quad( vec3( 0, 1, 0), vec3(-lightRadius, -wallRadius+1.0,-lightRadius), vec3(-lightRadius, -wallRadius+1.0, lightRadius), vec3(lightRadius, -wallRadius+1.0, lightRadius), vec3(lightRadius, -wallRadius+1.0,-lightRadius), light_emissionColor, LIGHT);// Quad Area Light on floor	
	else if (uQuadLightPlaneSelectionNumber == 6.0)
		quads[5] = Quad( vec3( 0,-1, 0), vec3(-lightRadius, wallRadius-1.0,-lightRadius), vec3(lightRadius, wallRadius-1.0,-lightRadius), vec3(lightRadius, wallRadius-1.0, lightRadius), vec3(-lightRadius, wallRadius-1.0, lightRadius), light_emissionColor, LIGHT);// Quad Area Light on ceiling
	
} // end void SetupScene(void)


// if your scene is static and doesn't have any special requirements, you can use the default main()
#include<pathtracing_default_main>

`;
