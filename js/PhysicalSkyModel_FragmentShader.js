BABYLON.Effect.ShadersStore["pathTracingFragmentShader"] = `
#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

// Demo-specific Uniforms
uniform mat4 uLeftSphereInvMatrix;
uniform mat4 uRightSphereInvMatrix;
uniform vec3 uSunDirection;
uniform int uRightSphereMatType;

// demo/scene-specific setup
#define N_QUADS 4 // ceiling quad and quad area light are removed for this demo
#define N_SPHERES 2

#include<pathtracing_physical_sky_defines> // required defines for scenes that use the physical sky model

struct UnitSphere { vec3 color; int type; };
struct Quad { vec3 normal; vec3 v0; vec3 v1; vec3 v2; vec3 v3; vec3 color; int type; };

Quad quads[N_QUADS];
UnitSphere spheres[N_SPHERES];

// the camera ray for this pixel (global variables)
vec3 rayOrigin, rayDirection;


// all required includes go here:

#include<pathtracing_defines_and_uniforms> // required on all scenes

#include<pathtracing_random> // required on all scenes

#include<pathtracing_calc_fresnel> // required on all scenes

#include<pathtracing_solve_quadratic> // required on scenes with any math-geometry shapes like sphere, cylinder, cone, etc.

#include<pathtracing_unit_sphere_intersect> // required on scenes with unit spheres that will be translated, rotated, and scaled by their matrix transform

#include<pathtracing_quad_intersect> // required on scenes with quads (actually internally they are made up of 2 triangles)

#include<pathtracing_physical_sky_functions> // required on scenes that use the physical sky model for environment lighting


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void SceneIntersect( vec3 rayOrigin, vec3 rayDirection, out float hitT, out vec3 hitNormal, out vec3 hitEmission, out vec3 hitColor, out int hitType, out float hitObjectID )
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	vec3 rObjOrigin, rObjDirection;
	vec3 hit, n;
	float d;
	int objectCount = 0;
	
	// initialize hit record 
	hitT = INFINITY;
	hitType = -100;
	hitObjectID = -INFINITY;

        // transform ray into Left Sphere's object space
	rObjOrigin = vec3( uLeftSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uLeftSphereInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitSphereIntersect( rObjOrigin, rObjDirection, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uLeftSphereInvMatrix)) * hitNormal);
		hitColor = spheres[0].color;
		hitType = spheres[0].type;
		hitObjectID = float(objectCount);
	}
	objectCount++;

	// transform ray into Right Sphere's object space
	rObjOrigin = vec3( uRightSphereInvMatrix * vec4(rayOrigin, 1.0) );
	rObjDirection = vec3( uRightSphereInvMatrix * vec4(rayDirection, 0.0) );

	d = UnitSphereIntersect( rObjOrigin, rObjDirection, n );

	if (d < hitT)
	{
		hitT = d;
		hitNormal = normalize(n);
		hitNormal = normalize(transpose(mat3(uRightSphereInvMatrix)) * hitNormal);
		hitColor = spheres[1].color;
		hitType = spheres[1].type;
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

	vec3 accumCol = vec3(0);
        vec3 mask = vec3(1);
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
		{
			vec3 skyColor = Get_Sky_Color(rayDirection);

			if (bounces == 0) // ray hits sky first
			{
				pixelSharpness = 1.01;
				//skyHit = true;
				//firstX = skyPos;
				accumCol = skyColor;
				break; // exit early	
			}
			else if (diffuseCount == 0 && bounceIsSpecular)
			{
				pixelSharpness = 1.01;
				//skyHit = true;
				//firstX = skyPos;
				accumCol = mask * skyColor;
				break; // exit early	
			}
			else if (sampleLight)
			{
				accumCol = mask * skyColor;
				break;
			}
			else if (diffuseCount == 1 && previousIntersecType == TRANSPARENT && bounceIsSpecular)
			{
				accumCol = mask * skyColor;
				break;
			}
			else if (diffuseCount > 0)
			{
				weight = dot(rayDirection, uSunDirection) < 0.99 ? 1.0 : 0.0;
				accumCol = mask * skyColor * weight;
				break;
			}
		}
		

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


		/* if (hitType == LIGHT)
		{
			if (diffuseCount == 0)
				pixelSharpness = 1.01;

			if (bounceIsSpecular || sampleLight)
				accumCol = mask * hitColor;

			// reached a light, so we can exit
			break;

		} // end if (hitType == LIGHT) */


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

			rayDirection = randomDirectionInSpecularLobe(uSunDirection, 0.1); // create shadow ray pointed towards light
			rayOrigin = x + nl * uEPS_intersect;
			
			weight = max(0.0, dot(rayDirection, nl)) * 0.05; // down-weight directSunLight contribution
			mask *= weight;

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

			// is ray leaving a solid object from the inside?
			// If so, attenuate ray color with object color by how far ray has travelled through the medium
			if (distance(n, nl) > 0.1)
			{
				thickness = 0.01;
				mask *= exp( log(clamp(hitColor, 0.01, 0.99)) * thickness * hitT );
			}

			mask *= TP;

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

			rayDirection = randomDirectionInSpecularLobe(uSunDirection, 0.1); // create shadow ray pointed towards light
			rayOrigin = x + nl * uEPS_intersect;
			
			weight = max(0.0, dot(rayDirection, nl)) * 0.05; // down-weight directSunLight contribution
			mask *= weight;

			// this check helps keep random noisy bright pixels from this clearCoat diffuse surface out of the possible previous refracted glass surface
			if (bounces < 3) 
				sampleLight = true;
			continue;

		} //end if (hitType == CLEARCOAT_DIFFUSE)

	} // end for (int bounces = 0; bounces < 6; bounces++)


	return max(vec3(0), accumCol);

} // end vec3 CalculateRadiance( out vec3 objectNormal, out vec3 objectColor, out float objectID, out float pixelSharpness )


//-------------------------------------------------------------------------------------------------
void SetupScene(void)
//-------------------------------------------------------------------------------------------------
{
	vec3 light_emissionColor = vec3(1.0, 1.0, 1.0) * 10.0; // Bright white light

	float wallRadius = 50.0;

	spheres[0] = UnitSphere( vec3(1.0, 1.0, 0.0), CLEARCOAT_DIFFUSE ); // clearCoat diffuse Sphere Left
	spheres[1] = UnitSphere( vec3(1.0, 1.0, 1.0), uRightSphereMatType ); // user-chosen material Sphere Right
 
	quads[0] = Quad( vec3( 0, 0, 1), vec3(-wallRadius, wallRadius, wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3(-wallRadius,-wallRadius, wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Back Wall
	quads[1] = Quad( vec3( 1, 0, 0), vec3(-wallRadius,-wallRadius, wallRadius), vec3(-wallRadius,-wallRadius,-wallRadius), vec3(-wallRadius, wallRadius,-wallRadius), vec3(-wallRadius, wallRadius, wallRadius), vec3( 0.7, 0.05, 0.05), DIFFUSE);// Left Wall Red
	quads[2] = Quad( vec3(-1, 0, 0), vec3( wallRadius,-wallRadius,-wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3( wallRadius, wallRadius,-wallRadius), vec3(0.05, 0.05,  0.7), DIFFUSE);// Right Wall Blue
	//quads[3] = Quad( vec3( 0,-1, 0), vec3(-wallRadius, wallRadius,-wallRadius), vec3( wallRadius, wallRadius,-wallRadius), vec3( wallRadius, wallRadius, wallRadius), vec3(-wallRadius, wallRadius, wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Ceiling
	quads[3] = Quad( vec3( 0, 1, 0), vec3(-wallRadius,-wallRadius, wallRadius), vec3( wallRadius,-wallRadius, wallRadius), vec3( wallRadius,-wallRadius,-wallRadius), vec3(-wallRadius,-wallRadius,-wallRadius), vec3( 1.0,  1.0,  1.0), DIFFUSE);// Floor

} // end void SetupScene(void)


// if your scene is static and doesn't have any special requirements, you can use the default main()
#include<pathtracing_default_main>

`;
