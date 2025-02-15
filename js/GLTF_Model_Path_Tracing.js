let canvas, engine, pathTracingScene;
let container, stats;
let gui;
let pixel_ResolutionController, pixel_ResolutionObject;
let needChangePixelResolution = false;
let gltfModel_SelectionController, gltfModel_SelectionObject;
let needChangeGltfModelSelection = false;
let quadLight_LocationController, quadLight_LocationObject;
let needChangeQuadLightLocation = false;
let quadLight_RadiusController, quadLight_RadiusObject;
let needChangeQuadLightRadius = false;
let model_MaterialController, model_MaterialObject;
let needChangeModelMaterial = false;
let transform_Folder;
let position_Folder;
let scale_Folder;
//let skew_Folder;
let rotation_Folder;
let transform_TranslateXController, transform_TranslateXObject;
let transform_TranslateYController, transform_TranslateYObject;
let transform_TranslateZController, transform_TranslateZObject;
let transform_ScaleUniformController, transform_ScaleUniformObject;
let transform_ScaleXController, transform_ScaleXObject;
let transform_ScaleYController, transform_ScaleYObject;
let transform_ScaleZController, transform_ScaleZObject;
// let transform_SkewX_YController, transform_SkewX_YObject;
// let transform_SkewX_ZController, transform_SkewX_ZObject;
// let transform_SkewY_XController, transform_SkewY_XObject;
// let transform_SkewY_ZController, transform_SkewY_ZObject;
// let transform_SkewZ_XController, transform_SkewZ_XObject;
// let transform_SkewZ_YController, transform_SkewZ_YObject;
let transform_RotateXController, transform_RotateXObject;
let transform_RotateYController, transform_RotateYObject;
let transform_RotateZController, transform_RotateZObject;
let parameter_KController, parameter_KObject;
let needChangePosition = false;
let needChangeScaleUniform = false;
let needChangeScale = false;
//let needChangeSkew = false;
let needChangeRotation = false;

let isPaused = true;
let sceneIsDynamic = false;
let camera, oldCameraMatrix, newCameraMatrix;
let camFlightSpeed; // scene specific, depending on scene size dimensions
let cameraRecentlyMoving = false;
let windowIsBeingResized = false;
let timeInSeconds = 0.0;
let frameTime = 0.0;
let newWidth, newHeight;
let nm, om;
let increaseFOV = false;
let decreaseFOV = false;
let uApertureSize; // scene specific, depending on scene size dimensions
let apertureChangeAmount; // scene specific, depending on scene size dimensions
let uFocusDistance; // scene specific, depending on scene size dimensions
let focusDistChangeAmount; // scene specific, depending on scene size dimensions
let mouseControl = true;
let cameraDirectionVector = new BABYLON.Vector3(); //for moving where the camera is looking
let cameraRightVector = new BABYLON.Vector3(); //for strafing the camera right and left
let cameraUpVector = new BABYLON.Vector3(); //for moving camera up and down
let blueNoiseTexture;
let infoElement = document.getElementById('info');
infoElement.style.cursor = "default";
infoElement.style.userSelect = "none";
infoElement.style.MozUserSelect = "none";

let cameraInfoElement = document.getElementById('cameraInfo');
cameraInfoElement.style.cursor = "default";
cameraInfoElement.style.userSelect = "none";
cameraInfoElement.style.MozUserSelect = "none";

// common required uniforms
let uRandomVec2 = new BABYLON.Vector2(); // used to offset the texture UV when sampling the blueNoiseTexture for smooth randomness - this vec2 is updated/changed every animation frame
let uTime = 0.0; // elapsed time in seconds since the app started
let uFrameCounter = 1.0; // 1 instead of 0 because it is used as a rng() seed in pathtracing shader
let uSampleCounter = 0.0; // will get increased by 1 in animation loop before rendering
let uOneOverSampleCounter = 0.0; // the sample accumulation buffer gets multiplied by this reciprocal of SampleCounter, for averaging final pixel color 
let uULen = 1.0; // rendering pixel horizontal scale, related to camera's FOV and aspect ratio
let uVLen = 1.0; // rendering pixel vertical scale, related to camera's FOV
let uCameraIsMoving = false; // lets the path tracer know if the camera is being moved
let uToneMappingExposure = 1.0; // exposure amount when applying Reinhard tonemapping in final stages of pixel colors' output


// scene/demo-specific variables
let sphereRadius = 16;
let wallRadius = 50;
let leftSphereTransformNode;
let rightSphereTransformNode;
let gltfModelTransformNode;
let modelUniformScale;
let modelNameAndExtension = "";
let containerMeshes = [];
let pathTracedMesh;
let modelInitialScale = 1;
let modelWasDefinedInRHCoordSystem = true;
let total_number_of_triangles = 0;
let totalWork;
let albedoTexture, bumpTexture, metallicTexture, emissiveTexture;
let triangle_array;
let triangleDataTexture;
let aabb_array;
let aabbDataTexture;

// scene/demo-specific uniforms
let uQuadLightPlaneSelectionNumber;
let uQuadLightRadius;
let uModelMaterialType;
let uModelUsesAlbedoTexture = false;
let uModelUsesBumpTexture = false;
let uModelUsesMetallicTexture = false;
let uModelUsesEmissiveTexture = false;
let uLeftSphereInvMatrix = new BABYLON.Matrix();
let uRightSphereInvMatrix = new BABYLON.Matrix();
let uGLTF_Model_InvMatrix = new BABYLON.Matrix();


const KEYCODE_NAMES = {
	65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j', 75: 'k', 76: 'l', 77: 'm',
	78: 'n', 79: 'o', 80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v', 87: 'w', 88: 'x', 89: 'y', 90: 'z',
	37: 'left', 38: 'up', 39: 'right', 40: 'down', 32: 'space', 33: 'pageup', 34: 'pagedown', 9: 'tab',
	189: 'dash', 187: 'equals', 219: 'leftbracket', 221: 'rightbracket', 188: 'comma', 190: 'period', 27: 'escape', 13: 'enter',
	48: 'zero', 49: 'one', 50: 'two', 51: 'three', 52: 'four', 53: 'five', 54: 'six', 55: 'seven', 56: 'eight', 57: 'nine'
}
let KeyboardState = {
	a: false, b: false, c: false, d: false, e: false, f: false, g: false, h: false, i: false, j: false, k: false, l: false, m: false,
	n: false, o: false, p: false, q: false, r: false, s: false, t: false, u: false, v: false, w: false, x: false, y: false, z: false,
	left: false, up: false, right: false, down: false, space: false, pageup: false, pagedown: false, tab: false,
	dash: false, equals: false, leftbracket: false, rightbracket: false, comma: false, period: false, escape: false, enter: false,
	zero: false, one: false, two: false, three: false, four: false, five: false, six: false, seven: false, eight: false, nine: false
}

function onKeyDown(event)
{
	event.preventDefault();

	KeyboardState[KEYCODE_NAMES[event.keyCode]] = true;
}

function onKeyUp(event)
{
	event.preventDefault();

	KeyboardState[KEYCODE_NAMES[event.keyCode]] = false;
}

function keyPressed(keyName)
{
	return KeyboardState[keyName];
}

function onMouseWheel(event)
{
	if (isPaused)
		return;

	// use the following instead, because event.preventDefault() gives errors in console
	event.stopPropagation();

	if (event.deltaY > 0)
	{
		increaseFOV = true;
	}
	else if (event.deltaY < 0)
	{
		decreaseFOV = true;
	}
}

// Watch for browser/canvas resize events
window.addEventListener("resize", function ()
{
	handleWindowResize();
});

if ('ontouchstart' in window)
{
	mouseControl = false;
	// TODO: instantiate my custom 'MobileJoystickControls' or similar Babylon solution?
}

if (mouseControl)
{
	window.addEventListener('wheel', onMouseWheel, false);
}

canvas = document.getElementById("renderCanvas");

engine = new BABYLON.Engine(canvas, true);


// Create the scene space
pathTracingScene = new BABYLON.Scene(engine);


// Load in the model either in glTF or glb format  /////////////////////////////////////////////////////

modelNameAndExtension = "UtahTeapot.glb";
modelInitialScale = 130;

function loadModel()
{
	BABYLON.SceneLoader.LoadAssetContainer("models/", modelNameAndExtension, pathTracingScene, function (container)
	{
		// clear out the mesh object and array
		pathTracedMesh = null;
		containerMeshes = [];
		albedoTexture = bumpTexture = metallicTexture = emissiveTexture = null;
		uModelUsesAlbedoTexture = uModelUsesBumpTexture =
			uModelUsesMetallicTexture = uModelUsesEmissiveTexture = false;

		console.log("Model file name: " + modelNameAndExtension);
		console.log("number of meshes found in original gltf/glb file: " + container.meshes.length);

		for (let i = 0; i < container.meshes.length; i++)
		{
			if (container.meshes[i].geometry)
			{
				containerMeshes.push(container.meshes[i]);
			}
		}

		if (container.meshes.length > 1)
		{
			console.log("now merging these " + container.meshes.length + " meshes into 1 mesh...")
			pathTracedMesh = BABYLON.Mesh.MergeMeshes(containerMeshes, true, true);
		}
		else // only 1 mesh was detected in original gltf/glb model file
		{
			pathTracedMesh = container.meshes[0];
		}

		pathTracedMesh.isVisible = false; // don't want WebGL to render this geometry in the normal way

		console.log("Triangle Face count: " + (pathTracedMesh.getTotalIndices() / 3));

		// not sure if the following is the correct way to check for indices inside the gltf/glb file?
		if (pathTracedMesh.getTotalIndices() != pathTracedMesh.getTotalVertices())
		{
			console.log("Indices detected, now converting to UnIndexed mesh...")
			pathTracedMesh.convertToUnIndexedMesh();
		}

		//console.log("total Vertex count: " + pathTracedMesh.getTotalVertices());
		//console.log("total Vertex x,y,z components in flat array: " + (pathTracedMesh.getTotalVertices() * 3));

		//console.log(pathTracedMesh.getVerticesData("position"));

		total_number_of_triangles = pathTracedMesh.getTotalVertices() / 3;

		// model has albedo texture?
		if (pathTracedMesh.material.albedoTexture != undefined)
		{
			albedoTexture = pathTracedMesh.material.albedoTexture;
			uModelUsesAlbedoTexture = true;
		}
		// model has bump texture?
		if (pathTracedMesh.material.bumpTexture != undefined)
		{
			bumpTexture = pathTracedMesh.material.bumpTexture;
			uModelUsesBumpTexture = true;
		}
		// model has metallic texture?
		if (pathTracedMesh.material.metallicTexture != undefined)
		{
			metallicTexture = pathTracedMesh.material.metallicTexture;
			uModelUsesMetallicTexture = true;
		}
		// model has emissive texture?
		if (pathTracedMesh.material.emissiveTexture != undefined)
		{
			emissiveTexture = pathTracedMesh.material.emissiveTexture;
			uModelUsesEmissiveTexture = true;
		}
			

		// now that the model is loaded and converted to our desired representation, we can start building an AABB around each triangle, 
		//  and then send this list of AABBs to the BVH builder function.  Finally, 2 GPU data textures will be created which hold the 
		//   compact BVH tree in one texture (for efficient GPU ray-BVH traversal), and all triangle vertex data (for quick GPU look-up) in the other texture.
		Prepare_Model_For_PathTracing();
	});
} // end function loadModel()




function Prepare_Model_For_PathTracing()
{
	totalWork = new Uint32Array(total_number_of_triangles);

	triangle_array = new Float32Array(2048 * 2048 * 4);
	// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components

	aabb_array = new Float32Array(2048 * 2048 * 4);
	// 2048 = width of texture, 2048 = height of texture, 4 = r,g,b, and a components

	let vp0 = new BABYLON.Vector3();
	let vp1 = new BABYLON.Vector3();
	let vp2 = new BABYLON.Vector3();
	let vn0 = new BABYLON.Vector3();
	let vn1 = new BABYLON.Vector3();
	let vn2 = new BABYLON.Vector3();
	let vt0 = new BABYLON.Vector2();
	let vt1 = new BABYLON.Vector2();
	let vt2 = new BABYLON.Vector2();

	let triangle_b_box_min = new BABYLON.Vector3();
	let triangle_b_box_max = new BABYLON.Vector3();
	let triangle_b_box_centroid = new BABYLON.Vector3();

	let vpa = new Float32Array(pathTracedMesh.getVerticesData("position"));
	let vna = new Float32Array(pathTracedMesh.getVerticesData("normal"));
	let vta = null;
	let modelHasUVs = false;
	// is the following a valid way to check if the model has vertex UVs? 
	if (pathTracedMesh.getVerticesDataKinds().length == 3)
	{
		vta = new Float32Array(pathTracedMesh.getVerticesData("uv"));
		modelHasUVs = true;
	}

	for (let i = 0; i < total_number_of_triangles; i++)
	{

		triangle_b_box_min.set(Infinity, Infinity, Infinity);
		triangle_b_box_max.set(-Infinity, -Infinity, -Infinity);

		// record vertex texture coordinates (UVs)
		if (modelHasUVs)
		{
			vt0.set(vta[6 * i + 0], vta[6 * i + 1]);
			vt1.set(vta[6 * i + 2], vta[6 * i + 3]);
			vt2.set(vta[6 * i + 4], vta[6 * i + 5]);
		}
		else
		{
			vt0.set(-1, -1);
			vt1.set(-1, -1);
			vt2.set(-1, -1);
		}

		// record vertex normals
		vn0.set(vna[9 * i + 0], vna[9 * i + 1], vna[9 * i + 2]); 
		vn1.set(vna[9 * i + 3], vna[9 * i + 4], vna[9 * i + 5]); 
		vn2.set(vna[9 * i + 6], vna[9 * i + 7], vna[9 * i + 8]);
		if (modelWasDefinedInRHCoordSystem)
		{
			vn0.z *= -1;
			vn1.z *= -1;
			vn2.z *= -1;
		}
		vn0.normalize();
		vn1.normalize();
		vn2.normalize();

		// record vertex positions
		vp0.set(vpa[9 * i + 0], vpa[9 * i + 1], vpa[9 * i + 2]);
		vp1.set(vpa[9 * i + 3], vpa[9 * i + 4], vpa[9 * i + 5]);
		vp2.set(vpa[9 * i + 6], vpa[9 * i + 7], vpa[9 * i + 8]);
		if (modelWasDefinedInRHCoordSystem)
		{
			vp0.z *= -1;
			vp1.z *= -1;
			vp2.z *= -1;
		}

		vp0.scaleInPlace(modelInitialScale);
		vp1.scaleInPlace(modelInitialScale);
		vp2.scaleInPlace(modelInitialScale);


		// record triangle vertex data for triangleDataTexture

		//slot 0
		triangle_array[32 * i + 0] = vp0.x; // r or x
		triangle_array[32 * i + 1] = vp0.y; // g or y 
		triangle_array[32 * i + 2] = vp0.z; // b or z
		triangle_array[32 * i + 3] = vp1.x; // a or w

		//slot 1
		triangle_array[32 * i + 4] = vp1.y; // r or x
		triangle_array[32 * i + 5] = vp1.z; // g or y
		triangle_array[32 * i + 6] = vp2.x; // b or z
		triangle_array[32 * i + 7] = vp2.y; // a or w

		//slot 2
		triangle_array[32 * i + 8] = vp2.z; // r or x
		triangle_array[32 * i + 9] = vn0.x; // g or y
		triangle_array[32 * i + 10] = vn0.y; // b or z
		triangle_array[32 * i + 11] = vn0.z; // a or w

		//slot 3
		triangle_array[32 * i + 12] = vn1.x; // r or x
		triangle_array[32 * i + 13] = vn1.y; // g or y
		triangle_array[32 * i + 14] = vn1.z; // b or z
		triangle_array[32 * i + 15] = vn2.x; // a or w

		//slot 4
		triangle_array[32 * i + 16] = vn2.y; // r or x
		triangle_array[32 * i + 17] = vn2.z; // g or y
		triangle_array[32 * i + 18] = vt0.x; // b or z
		triangle_array[32 * i + 19] = vt0.y; // a or w

		//slot 5
		triangle_array[32 * i + 20] = vt1.x; // r or x
		triangle_array[32 * i + 21] = vt1.y; // g or y
		triangle_array[32 * i + 22] = vt2.x; // b or z
		triangle_array[32 * i + 23] = vt2.y; // a or w

		// the remaining slots are used for PBR material properties

		// //slot 6
		// triangle_array[32 * i + 24] = material.type; // r or x 
		// triangle_array[32 * i + 25] = material.color.r; // g or y
		// triangle_array[32 * i + 26] = material.color.g; // b or z
		// triangle_array[32 * i + 27] = material.color.b; // a or w

		// //slot 7
		// triangle_array[32 * i + 28] = 0; // r or x
		// triangle_array[32 * i + 29] = 0; // g or y
		// triangle_array[32 * i + 30] = 0; // b or z
		// triangle_array[32 * i + 31] = 0; // a or w


		


		// build an AABB around every triangle in the model
		triangle_b_box_min.copyFrom(triangle_b_box_min.minimizeInPlace(vp0));
		triangle_b_box_max.copyFrom(triangle_b_box_max.maximizeInPlace(vp0));
		triangle_b_box_min.copyFrom(triangle_b_box_min.minimizeInPlace(vp1));
		triangle_b_box_max.copyFrom(triangle_b_box_max.maximizeInPlace(vp1));
		triangle_b_box_min.copyFrom(triangle_b_box_min.minimizeInPlace(vp2));
		triangle_b_box_max.copyFrom(triangle_b_box_max.maximizeInPlace(vp2));

		triangle_b_box_centroid.set((triangle_b_box_min.x + triangle_b_box_max.x) * 0.5,
			(triangle_b_box_min.y + triangle_b_box_max.y) * 0.5,
			(triangle_b_box_min.z + triangle_b_box_max.z) * 0.5);

		// record every AABB's data for aabbDataTexture

		aabb_array[9 * i + 0] = triangle_b_box_min.x;
		aabb_array[9 * i + 1] = triangle_b_box_min.y;
		aabb_array[9 * i + 2] = triangle_b_box_min.z;
		aabb_array[9 * i + 3] = triangle_b_box_max.x;
		aabb_array[9 * i + 4] = triangle_b_box_max.y;
		aabb_array[9 * i + 5] = triangle_b_box_max.z;
		aabb_array[9 * i + 6] = triangle_b_box_centroid.x;
		aabb_array[9 * i + 7] = triangle_b_box_centroid.y;
		aabb_array[9 * i + 8] = triangle_b_box_centroid.z;

		// finally, record the integer index for this particular AABB.  This will keep the BVH_Builder fast and efficient,
		//  because it only has to sort/manipulate integer index(id) look-up numbers instead of the whole triangle_b_box structure for each AABB
		totalWork[i] = i;
	} // end for (let i = 0; i < total_number_of_triangles; i++)


	// Build the BVH acceleration structure, which places a bounding box ('root' of the tree) around all of the 
	// triangles of the entire mesh, then subdivides each box into 2 smaller boxes.  It continues until it reaches 1 triangle,
	// which it then designates as a 'leaf'
	BVH_Build_Iterative(totalWork, aabb_array);

	// once the aabb_array (BVH tree of boxes) is in a GPU-friendly format, create the aabbDataTexture which
	// will get fed to the GPU as a texture uniform. The GPU's BVH ray-caster inside the pathtracing shader's 
	// SceneIntersect() function will utilize the BVH tree data that is stored on the following data texture.  
	aabbDataTexture = BABYLON.RawTexture.CreateRGBATexture(aabb_array,
		2048,
		2048,
		pathTracingScene,
		false,
		false,
		BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		BABYLON.Constants.TEXTURETYPE_FLOAT);

	// Likewise, a triangleDataTexture is created to store all the model's vertex data for each triangle. This
	// includes info like vertex positions, vertex normals, vertex UVs, material/texture IDs, etc.  If the GPU BVH 
	// ray-caster successfully walks the BVH tree and intersects any triangle from the model and also determines 
	// that this intersection has the closest ray t value, then the triangle's integer ID is used to quickly look up
	// the matching entry on the following triangleDataTexture, in order to access its vertex properties inside the path tracer. 
	triangleDataTexture = BABYLON.RawTexture.CreateRGBATexture(triangle_array,
		2048,
		2048,
		pathTracingScene,
		false,
		false,
		BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		BABYLON.Constants.TEXTURETYPE_FLOAT);

	// once the model and its GPU data textures are ready, then set the scaling back to 1 to show the newly loaded model
	gltfModelTransformNode.scaling.set(1, 1, 1);

	transform_ScaleUniformController.setValue(1);
	transform_ScaleXController.setValue(1);
	transform_ScaleYController.setValue(1);
	transform_ScaleZController.setValue(1);

} // end function Prepare_Model_For_PathTracing()

// kickstart the loading process
loadModel();


// enable browser's mouse pointer lock feature, for free-look camera controlled by mouse movement
pathTracingScene.onPointerDown = evt =>
{
	engine.enterPointerlock();
}

// setup the frame rate display (FPS) in the top-left corner 
container = document.getElementById('container');

stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
stats.domElement.style.cursor = "default";
stats.domElement.style.webkitUserSelect = "none";
stats.domElement.style.MozUserSelect = "none";
container.appendChild(stats.domElement);


function handleWindowResize()
{
	windowIsBeingResized = true;

	engine.resize();

	newWidth = engine.getRenderWidth();
	newHeight = engine.getRenderHeight();
	pathTracingRenderTarget.resize({ width: newWidth, height: newHeight });
	screenCopyRenderTarget.resize({ width: newWidth, height: newHeight });

	width = newWidth;
	height = newHeight;

	uVLen = Math.tan(camera.fov * 0.5);
	uULen = uVLen * (width / height);
}


// setup GUI
function init_GUI()
{
	pixel_ResolutionObject = {
		pixel_Resolution: 1.0
	}

	gltfModel_SelectionObject = {
		Model_Selection: 'Utah Teapot'
	};

	quadLight_LocationObject = {
		QuadLight_Location: 'Ceiling'
	};

	quadLight_RadiusObject = {
		QuadLight_Radius: 50
	}

	model_MaterialObject = {
		Model_MaterialPreset: 'Metal'
	}

	transform_TranslateXObject = {
		translateX: 0
	}
	transform_TranslateYObject = {
		translateY: 0
	}
	transform_TranslateZObject = {
		translateZ: 0
	}
	transform_ScaleUniformObject = {
		uniformScale: 1
	}
	transform_ScaleXObject = {
		scaleX: 1
	}
	transform_ScaleYObject = {
		scaleY: 1
	}
	transform_ScaleZObject = {
		scaleZ: 1
	}
	// transform_SkewX_YObject = {
	//         skewX_Y: 0
	// }
	// transform_SkewX_ZObject = {
	//         skewX_Z: 0
	// }
	// transform_SkewY_XObject = {
	//         skewY_X: 0
	// }
	// transform_SkewY_ZObject = {
	//         skewY_Z: 0
	// }
	// transform_SkewZ_XObject = {
	//         skewZ_X: 0
	// }
	// transform_SkewZ_YObject = {
	//         skewZ_Y: 0
	// }
	transform_RotateXObject = {
		rotateX: 0
	}
	transform_RotateYObject = {
		rotateY: 0
	}
	transform_RotateZObject = {
		rotateZ: 0
	}

	function handlePixelResolutionChange()
	{
		needChangePixelResolution = true;
	}

	function handleGltfModelSelectionChange()
	{
		needChangeGltfModelSelection = true;
	}

	function handleQuadLightLocationChange()
	{
		needChangeQuadLightLocation = true;
	}

	function handleQuadLightRadiusChange()
	{
		needChangeQuadLightRadius = true;
	}

	function handleModelMaterialChange()
	{
		needChangeModelMaterial = true;
	}

	function handlePositionChange()
	{
		needChangePosition = true;
	}
	function handleScaleUniformChange()
	{
		needChangeScaleUniform = true;
	}
	function handleScaleChange()
	{
		needChangeScale = true;
	}
	// function handleSkewChange()
	// {
	//         needChangeSkew = true;
	// }
	function handleRotationChange()
	{
		needChangeRotation = true;
	}

	gui = new dat.GUI();

	pixel_ResolutionController = gui.add(pixel_ResolutionObject, 'pixel_Resolution', 0.3, 1.0, 0.01).onChange(handlePixelResolutionChange);

	gltfModel_SelectionController = gui.add(gltfModel_SelectionObject, 'Model_Selection', ['Utah Teapot',
		'Stanford Bunny', 'Stanford Dragon', 'glTF Duck', 'Damaged Helmet']).onChange(handleGltfModelSelectionChange);

	quadLight_LocationController = gui.add(quadLight_LocationObject, 'QuadLight_Location', ['Ceiling',
		'Right Wall', 'Left Wall', 'Floor', 'Front Wall', 'Back Wall']).onChange(handleQuadLightLocationChange);

	quadLight_RadiusController = gui.add(quadLight_RadiusObject, 'QuadLight_Radius', 5, 150, 1.0).onChange(handleQuadLightRadiusChange);

	model_MaterialController = gui.add(model_MaterialObject, 'Model_MaterialPreset', ['Transparent',
		'Diffuse', 'ClearCoat_Diffuse', 'Metal']).onChange(handleModelMaterialChange);
	
	transform_Folder = gui.addFolder('Model_Transform');

	position_Folder = transform_Folder.addFolder('Position');
	transform_TranslateXController = position_Folder.add(transform_TranslateXObject, 'translateX', -50, 50, 1).onChange(handlePositionChange);
	transform_TranslateYController = position_Folder.add(transform_TranslateYObject, 'translateY', -50, 50, 1).onChange(handlePositionChange);
	transform_TranslateZController = position_Folder.add(transform_TranslateZObject, 'translateZ', -50, 50, 1).onChange(handlePositionChange);

	scale_Folder = transform_Folder.addFolder('Scale');
	transform_ScaleUniformController = scale_Folder.add(transform_ScaleUniformObject, 'uniformScale', 0.01, 4, 0.01).onChange(handleScaleUniformChange);
	transform_ScaleXController = scale_Folder.add(transform_ScaleXObject, 'scaleX', 0.01, 4, 0.01).onChange(handleScaleChange);
	transform_ScaleYController = scale_Folder.add(transform_ScaleYObject, 'scaleY', 0.01, 4, 0.01).onChange(handleScaleChange);
	transform_ScaleZController = scale_Folder.add(transform_ScaleZObject, 'scaleZ', 0.01, 4, 0.01).onChange(handleScaleChange);

	// skew_Folder = transform_Folder.addFolder('Skew');
	// transform_SkewX_YController = skew_Folder.add(transform_SkewX_YObject, 'skewX_Y', -0.9, 0.9, 0.1).onChange(handleSkewChange);
	// transform_SkewX_ZController = skew_Folder.add(transform_SkewX_ZObject, 'skewX_Z', -0.9, 0.9, 0.1).onChange(handleSkewChange);
	// transform_SkewY_XController = skew_Folder.add(transform_SkewY_XObject, 'skewY_X', -0.9, 0.9, 0.1).onChange(handleSkewChange);
	// transform_SkewY_ZController = skew_Folder.add(transform_SkewY_ZObject, 'skewY_Z', -0.9, 0.9, 0.1).onChange(handleSkewChange);
	// transform_SkewZ_XController = skew_Folder.add(transform_SkewZ_XObject, 'skewZ_X', -0.9, 0.9, 0.1).onChange(handleSkewChange);
	// transform_SkewZ_YController = skew_Folder.add(transform_SkewZ_YObject, 'skewZ_Y', -0.9, 0.9, 0.1).onChange(handleSkewChange);

	rotation_Folder = transform_Folder.addFolder('Rotation');
	transform_RotateXController = rotation_Folder.add(transform_RotateXObject, 'rotateX', 0, 359, 1).onChange(handleRotationChange);
	transform_RotateYController = rotation_Folder.add(transform_RotateYObject, 'rotateY', 0, 359, 1).onChange(handleRotationChange);
	transform_RotateZController = rotation_Folder.add(transform_RotateZObject, 'rotateZ', 0, 359, 1).onChange(handleRotationChange);
} // end function init_GUI()

init_GUI();



// Add a camera to the scene and attach it to the canvas
camera = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(), pathTracingScene);
camera.attachControl(canvas, true);

// SCENE/DEMO-SPECIFIC PARAMETERS
camera.position.set(0, -20, -120);
camera.inertia = 0;
camera.angularSensibility = 500;
camFlightSpeed = 100; // scene specific, depending on scene size dimensions
uApertureSize = 0.0; // aperture size at beginning of app
uFocusDistance = 113.0; // initial focus distance from camera in scene - scene specific, depending on scene size dimensions
const uEPS_intersect = 0.01; // value is scene-size dependent
apertureChangeAmount = 1; // scene specific, depending on scene size dimensions
focusDistChangeAmount = 1; // scene specific, depending on scene size dimensions
uQuadLightPlaneSelectionNumber = 6;
uQuadLightRadius = 50;
uModelMaterialType = 3; // enum number code for METAL material - demo starts off with this setting for the glTF/glb model

oldCameraMatrix = new BABYLON.Matrix();
newCameraMatrix = new BABYLON.Matrix();

// transform nodes can be instantiated only after scene has been created
leftSphereTransformNode = new BABYLON.TransformNode();
rightSphereTransformNode = new BABYLON.TransformNode();
gltfModelTransformNode = new BABYLON.TransformNode();


leftSphereTransformNode.position.set(-wallRadius * 0.45, -wallRadius + sphereRadius + 0.1, -wallRadius * 0.2);
leftSphereTransformNode.scaling.set(sphereRadius, sphereRadius, sphereRadius);
//leftSphereTransformNode.scaling.set(sphereRadius * 0.3, sphereRadius, sphereRadius);
//leftSphereTransformNode.rotation.set(0, 0, Math.PI * 0.2);
uLeftSphereInvMatrix.copyFrom(leftSphereTransformNode.getWorldMatrix());
uLeftSphereInvMatrix.invert();

rightSphereTransformNode.position.set(wallRadius * 0.45, -wallRadius + sphereRadius + 0.1, -wallRadius * 0.2);
rightSphereTransformNode.scaling.set(sphereRadius, sphereRadius, sphereRadius);
uRightSphereInvMatrix.copyFrom(rightSphereTransformNode.getWorldMatrix());
uRightSphereInvMatrix.invert();

gltfModelTransformNode.rotation.set(0, Math.PI, 0);
gltfModelTransformNode.scaling.set(0, 0, 0); // temporarily makes model invisible while it is being loaded and prepared


let width = engine.getRenderWidth(), height = engine.getRenderHeight();

blueNoiseTexture = new BABYLON.Texture("./textures/BlueNoise_RGBA256.png",
	pathTracingScene,
	true,
	false,
	BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
	null,
	null,
	null,
	false,
	BABYLON.Constants.TEXTUREFORMAT_RGBA);



const pathTracingRenderTarget = new BABYLON.RenderTargetTexture("pathTracingRenderTarget", { width, height }, pathTracingScene, false, false,
	BABYLON.Constants.TEXTURETYPE_FLOAT, false, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE, false, false, false,
	BABYLON.Constants.TEXTUREFORMAT_RGBA);

const screenCopyRenderTarget = new BABYLON.RenderTargetTexture("screenCopyRenderTarget", { width, height }, pathTracingScene, false, false,
	BABYLON.Constants.TEXTURETYPE_FLOAT, false, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE, false, false, false,
	BABYLON.Constants.TEXTUREFORMAT_RGBA);

const eRenderer = new BABYLON.EffectRenderer(engine);

// SCREEN COPY EFFECT
const screenCopy_eWrapper = new BABYLON.EffectWrapper({
	engine: engine,
	fragmentShader: BABYLON.Effect.ShadersStore["screenCopyFragmentShader"],
	uniformNames: [],
	samplerNames: ["pathTracedImageBuffer"],
	name: "screenCopyEffectWrapper"
});

screenCopy_eWrapper.onApplyObservable.add(() =>
{
	screenCopy_eWrapper.effect.setTexture("pathTracedImageBuffer", pathTracingRenderTarget);
});

// SCREEN OUTPUT EFFECT
const screenOutput_eWrapper = new BABYLON.EffectWrapper({
	engine: engine,
	fragmentShader: BABYLON.Effect.ShadersStore["screenOutputFragmentShader"],
	uniformNames: ["uOneOverSampleCounter", "uToneMappingExposure"],
	samplerNames: ["accumulationBuffer"],
	name: "screenOutputEffectWrapper"
});

screenOutput_eWrapper.onApplyObservable.add(() =>
{
	screenOutput_eWrapper.effect.setTexture("accumulationBuffer", pathTracingRenderTarget);
	screenOutput_eWrapper.effect.setFloat("uOneOverSampleCounter", uOneOverSampleCounter);
	screenOutput_eWrapper.effect.setFloat("uToneMappingExposure", uToneMappingExposure);
});

// MAIN PATH TRACING EFFECT
const pathTracing_eWrapper = new BABYLON.EffectWrapper({
	engine: engine,
	fragmentShader: BABYLON.Effect.ShadersStore["pathTracingFragmentShader"],
	uniformNames: ["uResolution", "uRandomVec2", "uULen", "uVLen", "uTime", "uFrameCounter", "uSampleCounter", "uEPS_intersect", "uCameraMatrix", 
		"uApertureSize", "uFocusDistance", "uCameraIsMoving", "uLeftSphereInvMatrix", "uRightSphereInvMatrix", "uGLTF_Model_InvMatrix", "uQuadLightPlaneSelectionNumber", 
		"uQuadLightRadius", "uModelMaterialType", "uModelUsesAlbedoTexture", "uModelUsesBumpTexture", "uModelUsesMetallicTexture", "uModelUsesEmissiveTexture"],
	samplerNames: ["previousBuffer", "blueNoiseTexture", "tAABBTexture", "tTriangleTexture", "tAlbedoTexture", "tBumpTexture", "tMetallicTexture", "tEmissiveTexture"],
	name: "pathTracingEffectWrapper"
});

pathTracing_eWrapper.onApplyObservable.add(() =>
{
	uVLen = Math.tan(camera.fov * 0.5);
	uULen = uVLen * (width / height);

	pathTracing_eWrapper.effect.setTexture("previousBuffer", screenCopyRenderTarget);
	pathTracing_eWrapper.effect.setTexture("blueNoiseTexture", blueNoiseTexture);
	pathTracing_eWrapper.effect.setTexture("tAABBTexture", aabbDataTexture);
	pathTracing_eWrapper.effect.setTexture("tTriangleTexture", triangleDataTexture);
	pathTracing_eWrapper.effect.setTexture("tAlbedoTexture", albedoTexture);
	pathTracing_eWrapper.effect.setTexture("tBumpTexture", bumpTexture);
	pathTracing_eWrapper.effect.setTexture("tMetallicTexture", metallicTexture);
	pathTracing_eWrapper.effect.setTexture("tEmissiveTexture", emissiveTexture);
	pathTracing_eWrapper.effect.setFloat2("uResolution", pathTracingRenderTarget.getSize().width, pathTracingRenderTarget.getSize().height);
	pathTracing_eWrapper.effect.setFloat2("uRandomVec2", uRandomVec2.x, uRandomVec2.y);
	pathTracing_eWrapper.effect.setFloat("uULen", uULen);
	pathTracing_eWrapper.effect.setFloat("uVLen", uVLen);
	pathTracing_eWrapper.effect.setFloat("uTime", uTime);
	pathTracing_eWrapper.effect.setFloat("uFrameCounter", uFrameCounter);
	pathTracing_eWrapper.effect.setFloat("uSampleCounter", uSampleCounter);
	pathTracing_eWrapper.effect.setFloat("uEPS_intersect", uEPS_intersect);
	pathTracing_eWrapper.effect.setFloat("uApertureSize", uApertureSize);
	pathTracing_eWrapper.effect.setFloat("uFocusDistance", uFocusDistance);
	pathTracing_eWrapper.effect.setFloat("uQuadLightPlaneSelectionNumber", uQuadLightPlaneSelectionNumber);
	pathTracing_eWrapper.effect.setFloat("uQuadLightRadius", uQuadLightRadius);
	pathTracing_eWrapper.effect.setInt("uModelMaterialType", uModelMaterialType);
	pathTracing_eWrapper.effect.setBool("uCameraIsMoving", uCameraIsMoving);
	pathTracing_eWrapper.effect.setBool("uModelUsesAlbedoTexture", uModelUsesAlbedoTexture);
	pathTracing_eWrapper.effect.setBool("uModelUsesBumpTexture", uModelUsesBumpTexture);
	pathTracing_eWrapper.effect.setBool("uModelUsesMetallicTexture", uModelUsesMetallicTexture);
	pathTracing_eWrapper.effect.setBool("uModelUsesEmissiveTexture", uModelUsesEmissiveTexture);
	pathTracing_eWrapper.effect.setMatrix("uCameraMatrix", camera.getWorldMatrix());
	pathTracing_eWrapper.effect.setMatrix("uLeftSphereInvMatrix", uLeftSphereInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uRightSphereInvMatrix", uRightSphereInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uGLTF_Model_InvMatrix", uGLTF_Model_InvMatrix);
});


function getElapsedTimeInSeconds()
{
	timeInSeconds += (engine.getDeltaTime() * 0.001);
	return timeInSeconds;
}


// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function ()
{

	// first, reset cameraIsMoving flag
	uCameraIsMoving = false;


	// if GUI has been used, update

	if (needChangePixelResolution)
	{
		engine.setHardwareScalingLevel(Math.round(1 / pixel_ResolutionController.getValue()));

		handleWindowResize();
		needChangePixelResolution = false;
	}

	if (needChangeGltfModelSelection)
	{
		// the following will make the old model invisible, while we wait for the new model to be loaded and prepared
		gltfModelTransformNode.scaling.set(0, 0, 0);

		transform_ScaleUniformController.setValue(0);
		transform_ScaleXController.setValue(0);
		transform_ScaleYController.setValue(0);
		transform_ScaleZController.setValue(0);
		transform_RotateXController.setValue(0);
		transform_RotateYController.setValue(0);
		transform_RotateZController.setValue(0);
		transform_TranslateXController.setValue(0);
		transform_TranslateYController.setValue(0);
		transform_TranslateZController.setValue(0);

		if (gltfModel_SelectionController.getValue() == 'Utah Teapot')
		{
			modelNameAndExtension = "UtahTeapot.glb";
			modelWasDefinedInRHCoordSystem = true;
			modelInitialScale = 130;
			transform_RotateYController.setValue(180);
		}
		else if (gltfModel_SelectionController.getValue() == 'Stanford Bunny')
		{
			modelNameAndExtension = "StanfordBunny.glb";
			modelWasDefinedInRHCoordSystem = true;
			modelInitialScale = 0.05;
		}
		else if (gltfModel_SelectionController.getValue() == 'Stanford Dragon')
		{
			modelNameAndExtension = "StanfordDragon.glb";
			modelWasDefinedInRHCoordSystem = true;
			modelInitialScale = 250;
			transform_RotateYController.setValue(180);
		}
		else if (gltfModel_SelectionController.getValue() == 'glTF Duck')
		{
			modelNameAndExtension = "Duck.gltf";
			modelWasDefinedInRHCoordSystem = false;
			modelInitialScale = 10;
		}
		else if (gltfModel_SelectionController.getValue() == 'Damaged Helmet')
		{
			modelNameAndExtension = "DamagedHelmet.gltf";
			modelWasDefinedInRHCoordSystem = false;
			modelInitialScale = 15;
			transform_RotateXController.setValue(90);
			transform_RotateYController.setValue(180);
		}

		loadModel(); // load the newly selected model

		uCameraIsMoving = true;
		needChangeGltfModelSelection = false;
	}

	if (needChangeQuadLightLocation)
	{
		if (quadLight_LocationController.getValue() == 'Right Wall')
		{
			uQuadLightPlaneSelectionNumber = 1;
		}
		else if (quadLight_LocationController.getValue() == 'Left Wall')
		{
			uQuadLightPlaneSelectionNumber = 2;
		}
		else if (quadLight_LocationController.getValue() == 'Front Wall')
		{
			uQuadLightPlaneSelectionNumber = 3;
		}
		else if (quadLight_LocationController.getValue() == 'Back Wall')
		{
			uQuadLightPlaneSelectionNumber = 4;
		}
		else if (quadLight_LocationController.getValue() == 'Floor')
		{
			uQuadLightPlaneSelectionNumber = 5;
		}
		else if (quadLight_LocationController.getValue() == 'Ceiling')
		{
			uQuadLightPlaneSelectionNumber = 6;
		}

		uCameraIsMoving = true;
		needChangeQuadLightLocation = false;
	}

	if (needChangeQuadLightRadius)
	{
		uQuadLightRadius = quadLight_RadiusController.getValue();

		uCameraIsMoving = true;
		needChangeQuadLightRadius = false;
	}

	if (needChangeModelMaterial)
	{
		if (model_MaterialController.getValue() == 'Transparent')
		{
			uModelMaterialType = 2;// enum number code for TRANSPARENT material
		}
		else if (model_MaterialController.getValue() == 'Diffuse')
		{
			uModelMaterialType = 1;// enum number code for DIFFUSE material
		}
		else if (model_MaterialController.getValue() == 'ClearCoat_Diffuse')
		{
			uModelMaterialType = 4;// enum number code for CLEARCOAT_DIFFUSE material
		}
		else if (model_MaterialController.getValue() == 'Metal')
		{
			uModelMaterialType = 3;// enum number code for METAL material
		}

		uCameraIsMoving = true;
		needChangeModelMaterial = false;
	}

	if (needChangePosition)
	{
		// first, reset model's position
		if (modelNameAndExtension == "StanfordDragon.glb")
			gltfModelTransformNode.position.set(0, -10, 0);
		else
			gltfModelTransformNode.position.set(0, 0, 0);

		// now apply requested translation offsets
		gltfModelTransformNode.position.addInPlaceFromFloats(transform_TranslateXController.getValue(),
			transform_TranslateYController.getValue(),
			transform_TranslateZController.getValue());
		
		uCameraIsMoving = true;
		needChangePosition = false;
	}


	if (needChangeScaleUniform)
	{
		modelUniformScale = transform_ScaleUniformController.getValue();

		transform_ScaleXController.setValue(modelUniformScale);
		transform_ScaleYController.setValue(modelUniformScale);
		transform_ScaleZController.setValue(modelUniformScale);

		gltfModelTransformNode.scaling.set(modelUniformScale, modelUniformScale, modelUniformScale);
	
		uCameraIsMoving = true;
		needChangeScaleUniform = false;
	}


	if (needChangeScale)
	{
		gltfModelTransformNode.scaling.set(transform_ScaleXController.getValue(),
			transform_ScaleYController.getValue(),
			transform_ScaleZController.getValue());

		uCameraIsMoving = true;
		needChangeScale = false;
	}

	// if (needChangeSkew)
	// {
	//         SkewMatrix.set(
	//                 1, transform_SkewX_YController.getValue(), transform_SkewX_ZController.getValue(), 0,
	//                 transform_SkewY_XController.getValue(), 1, transform_SkewY_ZController.getValue(), 0,
	//                 transform_SkewZ_XController.getValue(), transform_SkewZ_YController.getValue(), 1, 0,
	//                 0, 0, 0, 1
	//         );

	//         uCameraIsMoving = true;
	//         needChangeSkew = false;
	// }

	if (needChangeRotation)
	{
		gltfModelTransformNode.rotation.set(transform_RotateXController.getValue() * (Math.PI / 180),
			transform_RotateYController.getValue() * (Math.PI / 180),
			transform_RotateZController.getValue() * (Math.PI / 180));
		
		uCameraIsMoving = true;
		needChangeRotation = false;
	}


	// check for pointerLock state and add or remove keyboard listeners
	if (isPaused && engine.isPointerLock)
	{
		document.addEventListener('keydown', onKeyDown, false);
		document.addEventListener('keyup', onKeyUp, false);
		isPaused = false;
	}
	if (!isPaused && !engine.isPointerLock)
	{
		document.removeEventListener('keydown', onKeyDown, false);
		document.removeEventListener('keyup', onKeyUp, false);
		isPaused = true;
	}


	if (windowIsBeingResized)
	{
		uCameraIsMoving = true;
		windowIsBeingResized = false;
	}

	uTime = getElapsedTimeInSeconds();

	frameTime = engine.getDeltaTime() * 0.001;

	uRandomVec2.set(Math.random(), Math.random());

	// my own optimized way of telling if the camera has moved or not
	newCameraMatrix.copyFrom(camera.getWorldMatrix());
	nm = newCameraMatrix.m;
	om = oldCameraMatrix.m;
	if (nm[0] != om[0] || nm[1] != om[1] || nm[2] != om[2] || nm[3] != om[3] ||
		nm[4] != om[4] || nm[5] != om[5] || nm[6] != om[6] || nm[7] != om[7] ||
		nm[8] != om[8] || nm[9] != om[9] || nm[10] != om[10] || nm[11] != om[11] ||
		nm[12] != om[12] || nm[13] != om[13] || nm[14] != om[14] || nm[15] != om[15])
	{
		uCameraIsMoving = true;
	}
	// save camera state for next frame's comparison
	oldCameraMatrix.copyFrom(newCameraMatrix);

	// get current camera orientation basis vectors
	cameraDirectionVector.set(nm[8], nm[9], nm[10]);
	cameraDirectionVector.normalize();
	cameraUpVector.set(nm[4], nm[5], nm[6]);
	cameraUpVector.normalize();
	cameraRightVector.set(nm[0], nm[1], nm[2]);
	cameraRightVector.normalize();

	// check for user input
	if (keyPressed('w') && !keyPressed('s'))
	{
		camera.position.addInPlace(cameraDirectionVector.scaleToRef(camFlightSpeed * frameTime, cameraDirectionVector));
	}
	if (keyPressed('s') && !keyPressed('w'))
	{
		camera.position.subtractInPlace(cameraDirectionVector.scaleToRef(camFlightSpeed * frameTime, cameraDirectionVector));
	}
	if (keyPressed('a') && !keyPressed('d'))
	{
		camera.position.subtractInPlace(cameraRightVector.scaleToRef(camFlightSpeed * frameTime, cameraRightVector));
	}
	if (keyPressed('d') && !keyPressed('a'))
	{
		camera.position.addInPlace(cameraRightVector.scaleToRef(camFlightSpeed * frameTime, cameraRightVector));
	}
	if (keyPressed('e') && !keyPressed('q'))
	{
		camera.position.addInPlace(cameraUpVector.scaleToRef(camFlightSpeed * frameTime, cameraUpVector));
	}
	if (keyPressed('q') && !keyPressed('e'))
	{
		camera.position.subtractInPlace(cameraUpVector.scaleToRef(camFlightSpeed * frameTime, cameraUpVector));
	}

	if (keyPressed('equals') && !keyPressed('dash'))
	{
		uFocusDistance += focusDistChangeAmount;
		uCameraIsMoving = true;
	}
	if (keyPressed('dash') && !keyPressed('equals'))
	{
		uFocusDistance -= focusDistChangeAmount;
		if (uFocusDistance < 1)
			uFocusDistance = 1;
		uCameraIsMoving = true;
	}
	if (keyPressed('rightbracket') && !keyPressed('leftbracket'))
	{
		uApertureSize += apertureChangeAmount;
		if (uApertureSize > 100000.0)
			uApertureSize = 100000.0;
		uCameraIsMoving = true;
	}
	if (keyPressed('leftbracket') && !keyPressed('rightbracket'))
	{
		uApertureSize -= apertureChangeAmount;
		if (uApertureSize < 0.0)
			uApertureSize = 0.0;
		uCameraIsMoving = true;
	}


	// now update uniforms that are common to all scenes
	if (increaseFOV)
	{
		camera.fov += (Math.PI / 180);
		if (camera.fov > 150 * (Math.PI / 180))
			camera.fov = 150 * (Math.PI / 180);

		uVLen = Math.tan(camera.fov * 0.5);
		uULen = uVLen * (width / height);

		uCameraIsMoving = true;
		increaseFOV = false;
	}
	if (decreaseFOV)
	{
		camera.fov -= (Math.PI / 180);
		if (camera.fov < 1 * (Math.PI / 180))
			camera.fov = 1 * (Math.PI / 180);

		uVLen = Math.tan(camera.fov * 0.5);
		uULen = uVLen * (width / height);

		uCameraIsMoving = true;
		decreaseFOV = false;
	}

	if (!uCameraIsMoving)
	{
		if (sceneIsDynamic)
			uSampleCounter = 1.0; // reset for continuous updating of image
		else uSampleCounter += 1.0; // for progressive refinement of image

		uFrameCounter += 1.0;

		cameraRecentlyMoving = false;
	}

	if (uCameraIsMoving)
	{
		uSampleCounter = 1.0;
		uFrameCounter += 1.0;

		if (!cameraRecentlyMoving)
		{
			uFrameCounter = 1.0;
			cameraRecentlyMoving = true;
		}
	}

	
	// update glTF model's transform
	uGLTF_Model_InvMatrix.copyFrom(gltfModelTransformNode.getWorldMatrix());
	uGLTF_Model_InvMatrix.invert();
	

	uOneOverSampleCounter = 1.0 / uSampleCounter;

	// CAMERA INFO
	cameraInfoElement.innerHTML = "glTF_Model # of triangles: " + total_number_of_triangles.toFixed(0) + "<br>" + 
		"FOV( mousewheel ): " + (camera.fov * 180 / Math.PI).toFixed(0) + "<br>" + "Aperture( [ and ] ): " + uApertureSize.toFixed(1) +
		"<br>" + "FocusDistance( - and + ): " + uFocusDistance.toFixed(0) + "<br>" + "Samples: " + uSampleCounter;

	// the following is necessary to update the user's world camera movement - should take no time at all
	pathTracingScene.render();
	// now for the heavy lifter, the bulk of the frame time
	eRenderer.render(pathTracing_eWrapper, pathTracingRenderTarget);
	// then simply copy(store) what the pathTracer just calculated - should take no time at all
	eRenderer.render(screenCopy_eWrapper, screenCopyRenderTarget);
	// finally take the accumulated pathTracingRenderTarget buffer and average by numberOfSamples taken, then apply Reinhard tonemapping (brings image into friendly 0.0-1.0 rgb color float range),
	// and lastly raise to the power of (0.4545), in order to make gamma correction (gives more brightness range where it counts).  This last step should also take minimal time
	eRenderer.render(screenOutput_eWrapper, null); // null, because we don't feed this non-linear image-processed output back into the pathTracing accumulation buffer as it would 'pollute' the pathtracing unbounded linear color space

	stats.update();
}); // end engine.runRenderLoop(function ()
