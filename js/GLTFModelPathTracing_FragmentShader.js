BABYLON.Effect.ShadersStore["pathTracingFragmentShader"] = `
#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

// Demo-specific Uniforms
uniform sampler2D tAABBTexture;
uniform sampler2D tTriangleTexture;
uniform sampler2D tAlbedoTexture;
uniform sampler2D tBumpTexture;
uniform sampler2D tMetallicTexture;
uniform sampler2D tEmissiveTexture;

uniform mat4 uLeftSphereInvMatrix;
uniform mat4 uRightSphereInvMatrix;
uniform mat4 uGLTF_Model_InvMatrix;
uniform float uQuadLightPlaneSelectionNumber;
uniform float uQuadLightRadius;
uniform int uModelMaterialType;
uniform bool uModelUsesAlbedoTexture;
uniform bool uModelUsesBumpTexture;
uniform bool uModelUsesMetallicTexture;
uniform bool uModelUsesEmissiveTexture;


//#define INV_TEXTURE_WIDTH 0.000244140625 // (1 / 4096 texture width)
//#define INV_TEXTURE_WIDTH 0.00048828125  // (1 / 2048 texture width)
//#define INV_TEXTURE_WIDTH 0.0009765625   // (1 / 1024 texture width)

#define INV_TEXTURE_WIDTH 0.00048828125  // (1 / 2048 texture width)

// demo/scene-specific setup
#define N_QUADS 6
#define N_SPHERES 2

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

#include<pathtracing_sample_axis_aligned_quad_light> // required on scenes with axis-aligned quad area lights (quad must reside in either XY, XZ, or YZ planes) 

#include<pathtracing_boundingbox_intersect> // required on scenes containing a BVH for models in gltf/glb format

#include<pathtracing_bvhTriangle_intersect> // required on scenes containing triangular models in gltf/glb format

#include<pathtracing_bvhDoubleSidedTriangle_intersect> // required on scenes containing triangular models in gltf/glb format, and that need transparency effects



vec3 perturbNormal(vec3 nl, vec2 normalScale, vec2 uv)
{
        vec3 S = normalize( cross( abs(nl.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0), nl ) );
        vec3 T = cross(nl, S);
        vec3 N = normalize( nl );
	// invert S, T when the UV direction is backwards (from mirrored faces),
	// otherwise it will do the normal mapping backwards.
	vec3 NfromST = cross( S, T );
	if( dot( NfromST, N ) < 0.0 )
	{
		S *= -1.0;
		T *= -1.0;
	}
        mat3 tsn = mat3( S, T, N );

	vec3 mapN = texture(tBumpTexture, uv).xyz * 2.0 - 1.0;
	mapN = normalize(mapN);
        mapN.xy *= normalScale;
        
        return normalize( tsn * mapN );
}


vec2 stackLevels[28];

//vec4 boxNodeData0 corresponds to .x = idTriangle,  .y = aabbMin.x, .z = aabbMin.y, .w = aabbMin.z
//vec4 boxNodeData1 corresponds to .x = idRightChild .y = aabbMax.x, .z = aabbMax.y, .w = aabbMax.z

void GetBoxNodeData(const in float i, inout vec4 boxNodeData0, inout vec4 boxNodeData1)
{
	// each bounding box's data is encoded in 2 rgba(or xyzw) texture slots 
	float ix2 = i * 2.0;
	// (ix2 + 0.0) corresponds to .x = idTriangle,  .y = aabbMin.x, .z = aabbMin.y, .w = aabbMin.z 
	// (ix2 + 1.0) corresponds to .x = idRightChild .y = aabbMax.x, .z = aabbMax.y, .w = aabbMax.z 

	ivec2 uv0 = ivec2( mod(ix2 + 0.0, 2048.0), (ix2 + 0.0) * INV_TEXTURE_WIDTH ); // data0
	ivec2 uv1 = ivec2( mod(ix2 + 1.0, 2048.0), (ix2 + 1.0) * INV_TEXTURE_WIDTH ); // data1
	
	boxNodeData0 = texelFetch(tAABBTexture, uv0, 0);
	boxNodeData1 = texelFetch(tAABBTexture, uv1, 0);
}


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
void SceneIntersect( vec3 rayOrigin, vec3 rayDirection, out float hitT, out vec3 hitNormal, out vec3 hitEmission, out vec3 hitColor, out vec2 hitUV, out int hitType, out float hitObjectID )
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
{
	vec4 currentBoxNodeData0, nodeAData0, nodeBData0, tmpNodeData0;
	vec4 currentBoxNodeData1, nodeAData1, nodeBData1, tmpNodeData1;

	vec4 vd0, vd1, vd2, vd3, vd4, vd5, vd6, vd7;

	vec3 inverseDir;// = 1.0 / rayDirection; // will be calculated later, after ray has been transformed to glTF model's object space
	vec3 hit, n;
	vec3 rObjOrigin, rObjDirection;

	vec2 currentStackData, stackDataA, stackDataB, tmpStackData;
	ivec2 uv0, uv1, uv2, uv3, uv4, uv5, uv6, uv7;

	float d;
	float stackptr = 0.0;	
	float bc, bd;
	float id = 0.0;
	float tu, tv;
	float triangleID = 0.0;
	float triangleU = 0.0;
	float triangleV = 0.0;
	float triangleW = 0.0;

	int objectCount = 0;
	
	bool skip = false;
	bool triangleLookupNeeded = false;
	
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

	// transform ray into GLTF_Model's object space
	rayOrigin = vec3( uGLTF_Model_InvMatrix * vec4(rayOrigin, 1.0) );
	rayDirection = vec3( uGLTF_Model_InvMatrix * vec4(rayDirection, 0.0) );
	inverseDir = 1.0 / rayDirection; // inverseDir must be re-calculated, now that we are in model's object space

	GetBoxNodeData(stackptr, currentBoxNodeData0, currentBoxNodeData1);
	currentStackData = vec2(stackptr, BoundingBoxIntersect(currentBoxNodeData0.yzw, currentBoxNodeData1.yzw, rayOrigin, inverseDir));
	stackLevels[0] = currentStackData;
	skip = (currentStackData.y < hitT);

	while (true)
        {
		if (!skip) 
                {
                        // decrease pointer by 1 (0.0 is root level, 27.0 is maximum depth)
                        if (--stackptr < 0.0) // went past the root level, terminate loop
                                break;

                        currentStackData = stackLevels[int(stackptr)];
			
			if (currentStackData.y >= hitT)
				continue;
			
			GetBoxNodeData(currentStackData.x, currentBoxNodeData0, currentBoxNodeData1);
                }
		skip = false; // reset skip
		

		if (currentBoxNodeData0.x < 0.0) // < 0.0 signifies an inner node
		{
			GetBoxNodeData(currentStackData.x + 1.0, nodeAData0, nodeAData1);
			GetBoxNodeData(currentBoxNodeData1.x, nodeBData0, nodeBData1);
			stackDataA = vec2(currentStackData.x + 1.0, BoundingBoxIntersect(nodeAData0.yzw, nodeAData1.yzw, rayOrigin, inverseDir));
			stackDataB = vec2(currentBoxNodeData1.x, BoundingBoxIntersect(nodeBData0.yzw, nodeBData1.yzw, rayOrigin, inverseDir));
			
			// first sort the branch node data so that 'a' is the smallest
			if (stackDataB.y < stackDataA.y)
			{
				tmpStackData = stackDataB;
				stackDataB = stackDataA;
				stackDataA = tmpStackData;

				tmpNodeData0 = nodeBData0;   tmpNodeData1 = nodeBData1;
				nodeBData0   = nodeAData0;   nodeBData1   = nodeAData1;
				nodeAData0   = tmpNodeData0; nodeAData1   = tmpNodeData1;
			} // branch 'b' now has the larger rayT value of 'a' and 'b'

			if (stackDataB.y < hitT) // see if branch 'b' (the larger rayT) needs to be processed
			{
				currentStackData = stackDataB;
				currentBoxNodeData0 = nodeBData0;
				currentBoxNodeData1 = nodeBData1;
				skip = true; // this will prevent the stackptr from decreasing by 1
			}
			if (stackDataA.y < hitT) // see if branch 'a' (the smaller rayT) needs to be processed 
			{
				if (skip) // if larger branch 'b' needed to be processed also,
					stackLevels[int(stackptr++)] = stackDataB; // cue larger branch 'b' for future round
							// also, increase pointer by 1
				
				currentStackData = stackDataA;
				currentBoxNodeData0 = nodeAData0; 
				currentBoxNodeData1 = nodeAData1;
				skip = true; // this will prevent the stackptr from decreasing by 1
			}

			continue;
		} // end if (currentBoxNodeData0.x < 0.0) // inner node


		// else this is a leaf

		// each triangle's data is encoded in 8 rgba(or xyzw) texture slots
		id = 8.0 * currentBoxNodeData0.x;

		uv0 = ivec2( mod(id + 0.0, 2048.0), (id + 0.0) * INV_TEXTURE_WIDTH );
		uv1 = ivec2( mod(id + 1.0, 2048.0), (id + 1.0) * INV_TEXTURE_WIDTH );
		uv2 = ivec2( mod(id + 2.0, 2048.0), (id + 2.0) * INV_TEXTURE_WIDTH );
		
		vd0 = texelFetch(tTriangleTexture, uv0, 0);
		vd1 = texelFetch(tTriangleTexture, uv1, 0);
		vd2 = texelFetch(tTriangleTexture, uv2, 0);

		if (!uModelUsesAlbedoTexture && uModelMaterialType == TRANSPARENT)
			d = BVH_DoubleSidedTriangleIntersect( vec3(vd0.xyz), vec3(vd0.w, vd1.xy), vec3(vd1.zw, vd2.x), rayOrigin, rayDirection, tu, tv );
		else
			d = BVH_TriangleIntersect( vec3(vd0.xyz), vec3(vd0.w, vd1.xy), vec3(vd1.zw, vd2.x), rayOrigin, rayDirection, tu, tv );

		if (d < hitT)
		{
			hitT = d;
			triangleID = id;
			triangleU = tu;
			triangleV = tv;
			triangleLookupNeeded = true;
		}
	      
        } // end while (true)



	if (triangleLookupNeeded)
	{
		uv0 = ivec2( mod(triangleID + 0.0, 2048.0), (triangleID + 0.0) * INV_TEXTURE_WIDTH );
		uv1 = ivec2( mod(triangleID + 1.0, 2048.0), (triangleID + 1.0) * INV_TEXTURE_WIDTH );
		uv2 = ivec2( mod(triangleID + 2.0, 2048.0), (triangleID + 2.0) * INV_TEXTURE_WIDTH );
		uv3 = ivec2( mod(triangleID + 3.0, 2048.0), (triangleID + 3.0) * INV_TEXTURE_WIDTH );
		uv4 = ivec2( mod(triangleID + 4.0, 2048.0), (triangleID + 4.0) * INV_TEXTURE_WIDTH );
		uv5 = ivec2( mod(triangleID + 5.0, 2048.0), (triangleID + 5.0) * INV_TEXTURE_WIDTH );
		uv6 = ivec2( mod(triangleID + 6.0, 2048.0), (triangleID + 6.0) * INV_TEXTURE_WIDTH );
		uv7 = ivec2( mod(triangleID + 7.0, 2048.0), (triangleID + 7.0) * INV_TEXTURE_WIDTH );
		
		// the complete vertex data for each individual triangle consumes 8 rgba texture slots on the GPU data texture
		// also, packing/padding the vertex data into 8 texels ensures 8-boundary alignments (power of 2) which is more memory-access friendly 
		vd0 = texelFetch(tTriangleTexture, uv0, 0); // rgb: vertex0 position xyz, a: vertex1 position x 
		vd1 = texelFetch(tTriangleTexture, uv1, 0); // rg: vertex1(cont.) position yz, ba: vertex2 position xy
		vd2 = texelFetch(tTriangleTexture, uv2, 0); // r: vertex2(cont.) position z, gba: vertex0 normal xyz
		vd3 = texelFetch(tTriangleTexture, uv3, 0); // rgb: vertex1 normal xyz, a: vertex2 normal x
		vd4 = texelFetch(tTriangleTexture, uv4, 0); // rg: vertex2(cont.) normal yz, ba: vertex0 uv
		vd5 = texelFetch(tTriangleTexture, uv5, 0); // rg: vertex1 uv, ba: vertex2 uv
		vd6 = texelFetch(tTriangleTexture, uv6, 0); // rgb: triangle material rgb color, a: triangle material type id (enum)
		vd7 = texelFetch(tTriangleTexture, uv7, 0); // rgba: (reserved for future PBR material extra properties)

		// face normal for flat-shaded polygon look
		//hitNormal = normalize( cross(vec3(vd0.w, vd1.xy) - vec3(vd0.xyz), vec3(vd1.zw, vd2.x) - vec3(vd0.xyz)) );
		
		// interpolated normal using triangle intersection's uv's
		triangleW = 1.0 - triangleU - triangleV;
		n = normalize(triangleW * vec3(vd2.yzw) + triangleU * vec3(vd3.xyz) + triangleV * vec3(vd3.w, vd4.xy));
		hitUV = triangleW * vec2(vd4.zw) + triangleU * vec2(vd5.xy) + triangleV * vec2(vd5.zw);
		n = uModelUsesBumpTexture ? perturbNormal(n, vec2(1.0, 1.0), hitUV) : n;
		// transform normal back into world space
		hitNormal = normalize(transpose(mat3(uGLTF_Model_InvMatrix)) * n);

		//hitType = int(vd6.x);
		hitType = uModelUsesAlbedoTexture ? PBR_MATERIAL : uModelMaterialType;

		hitColor = vec3(1);//vd6.yzw;
		
		//hitTextureID = int(vd7.x);
		//hitTextureID = -1;
		
		hitObjectID = float(objectCount);
	} // if (triangleLookupNeeded)

} // end void SceneIntersect( vec3 rayOrigin, vec3 rayDirection, out float hitT, out vec3 hitNormal, out vec3 hitEmission, out vec3 hitColor, out vec2 hitUV, out int hitType, out float hitObjectID )



//-----------------------------------------------------------------------------------------------------------------------------
vec3 CalculateRadiance( out vec3 objectNormal, out vec3 objectColor, out float objectID, out float pixelSharpness )
//-----------------------------------------------------------------------------------------------------------------------------
{
	Quad light = quads[5];

	// recorded intersection data:
	vec3 hitNormal, hitEmission, hitColor;
	vec2 hitUV;
	float hitT, hitObjectID;
	int hitType, hitTextureID;

	vec3 accumCol = vec3(0);
        vec3 mask = vec3(1);
	vec3 dirToLight;
	vec3 tdir;
	vec3 x, n, nl;
	vec3 absorptionCoefficient;
	vec3 metallicRoughness = vec3(0);
	vec3 emission = vec3(0);

	float nc, nt, ratioIoR, Re, Tr;
	float P, RP, TP;
	float weight;
	float thickness = 0.05;
	float scatteringDistance;
	float maxEmission = 0.0;

	int diffuseCount = 0;
	int previousIntersecType = -100;
	hitType = -100;

	bool coatTypeIntersected = false;
	bool bounceIsSpecular = true;
	bool sampleLight = false;


	for (int bounces = 0; bounces < 6; bounces++)
	{
		previousIntersecType = hitType;

		SceneIntersect(rayOrigin, rayDirection, hitT, hitNormal, hitEmission, hitColor, hitUV, hitType, hitObjectID);


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


		if (hitType == PBR_MATERIAL)
		{
			hitColor = texture(tAlbedoTexture, hitUV).rgb;
			hitColor = pow(hitColor, vec3(2.2));
			
			emission = uModelUsesEmissiveTexture ? texture(tEmissiveTexture, hitUV).rgb : vec3(0);
			emission = pow(emission, vec3(2.2));
			maxEmission = max(emission.r, max(emission.g, emission.b));
			if (bounceIsSpecular && maxEmission > 0.01)
			{
				pixelSharpness = 1.01;
				accumCol = mask * emission;
				break;
			}

			hitType = DIFFUSE;
			
			metallicRoughness = uModelUsesMetallicTexture ? texture(tMetallicTexture, hitUV).rgb : vec3(0);
			metallicRoughness = pow(metallicRoughness, vec3(2.2));
			if (metallicRoughness.g > 0.01) // roughness
			{
				hitType = CLEARCOAT_DIFFUSE;
			}	
			if (metallicRoughness.b > 0.01) // metalness
			{
				hitType = METAL;
			}
				
		}

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

			rayDirection = randomDirectionInSpecularLobe(reflect(rayDirection, nl), metallicRoughness.g);
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


//--------------------------------------------------------------------------------------------------
void SetupScene(void)
//--------------------------------------------------------------------------------------------------
{
	vec3 light_emissionColor = vec3(1.0, 1.0, 1.0) * 10.0; // Bright white light

	float wallRadius = 50.0;
	float lightRadius = uQuadLightRadius * 0.2;

	spheres[0] = UnitSphere( vec3(1.0, 1.0, 0.0), CLEARCOAT_DIFFUSE ); // clearCoat diffuse Sphere Left
	spheres[1] = UnitSphere( vec3(1.0, 1.0, 1.0), METAL ); // metal Sphere Right
 
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
