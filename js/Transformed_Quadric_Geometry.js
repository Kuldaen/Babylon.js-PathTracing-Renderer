let canvas, engine, pathTracingScene;
let container, stats;
let gui;
let pixel_ResolutionController, pixel_ResolutionObject;
let needChangePixelResolution = false;
let quadLight_LocationController, quadLight_LocationObject;
let needChangeQuadLightLocation = false;
let quadLight_RadiusController, quadLight_RadiusObject;
let needChangeQuadLightRadius = false;
let allShapes_MaterialController, allShapes_MaterialObject;
let needChangeAllShapesMaterial = false;
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
let needChangeParameterK = false;

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


// scene/demo-specific variables;
let shapeRadius = 10;
let shapeTranslationX, shapeTranslationY, shapeTranslationZ;
let shapeRotationX, shapeRotationY, shapeRotationZ;
let shapeScaleX, shapeScaleY, shapeScaleZ;
let shapeUniformScale = shapeRadius;
let wallRadius = 50;
let sphereTransformNode, cylinderTransformNode, coneTransformNode, paraboloidTransformNode, hyperboloidTransformNode, capsuleTransformNode,
	flattenedRingTransformNode, boxTransformNode, pyramidFrustumTransformNode, diskTransformNode, rectangleTransformNode, torusTransformNode;

// scene/demo-specific uniforms
let uQuadLightPlaneSelectionNumber;
let uQuadLightRadius;
let uAllShapesMatType;
let uShapeK = 1.0;
let uSphereInvMatrix = new BABYLON.Matrix();
let uCylinderInvMatrix = new BABYLON.Matrix();
let uConeInvMatrix = new BABYLON.Matrix();
let uParaboloidInvMatrix = new BABYLON.Matrix();
let uHyperboloidInvMatrix = new BABYLON.Matrix();
let uCapsuleInvMatrix = new BABYLON.Matrix();
let uFlattenedRingInvMatrix = new BABYLON.Matrix();
let uBoxInvMatrix = new BABYLON.Matrix();
let uPyramidFrustumInvMatrix = new BABYLON.Matrix();
let uDiskInvMatrix = new BABYLON.Matrix();
let uRectangleInvMatrix = new BABYLON.Matrix();
let uTorusInvMatrix = new BABYLON.Matrix();


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

	quadLight_LocationObject = {
		QuadLight_Location: 'Ceiling'
	};

	quadLight_RadiusObject = {
		QuadLight_Radius: 50
	}

	allShapes_MaterialObject = {
		AllShapes_MaterialPreset: 'ClearCoat_Diffuse'
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
		uniformScale: shapeRadius
	}
	transform_ScaleXObject = {
		scaleX: shapeRadius
	}
	transform_ScaleYObject = {
		scaleY: shapeRadius
	}
	transform_ScaleZObject = {
		scaleZ: shapeRadius
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
	parameter_KObject = {
		parameterK: 1
	};

	function handlePixelResolutionChange()
	{
		needChangePixelResolution = true;
	}

	function handleQuadLightLocationChange()
	{
		needChangeQuadLightLocation = true;
	}
	function handleQuadLightRadiusChange()
	{
		needChangeQuadLightRadius = true;
	}
	function handleAllShapesMaterialChange()
	{
		needChangeAllShapesMaterial = true;
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
	function handleParameterKChange()
	{
		needChangeParameterK = true;
	}

	gui = new dat.GUI();

	pixel_ResolutionController = gui.add(pixel_ResolutionObject, 'pixel_Resolution', 0.3, 1.0, 0.01).onChange(handlePixelResolutionChange);

	quadLight_LocationController = gui.add(quadLight_LocationObject, 'QuadLight_Location', ['Ceiling',
		'Right Wall', 'Left Wall', 'Floor', 'Front Wall', 'Back Wall']).onChange(handleQuadLightLocationChange);

	quadLight_RadiusController = gui.add(quadLight_RadiusObject, 'QuadLight_Radius', 5, 150, 1.0).onChange(handleQuadLightRadiusChange);

	allShapes_MaterialController = gui.add(allShapes_MaterialObject, 'AllShapes_MaterialPreset', ['Transparent',
		'Diffuse', 'ClearCoat_Diffuse', 'Metal']).onChange(handleAllShapesMaterialChange);

	transform_Folder = gui.addFolder('Shapes_Transform');

	position_Folder = transform_Folder.addFolder('Position');
	transform_TranslateXController = position_Folder.add(transform_TranslateXObject, 'translateX', -60, 60, 1).onChange(handlePositionChange);
	transform_TranslateYController = position_Folder.add(transform_TranslateYObject, 'translateY', -25, 95, 1).onChange(handlePositionChange);
	transform_TranslateZController = position_Folder.add(transform_TranslateZObject, 'translateZ', -60, 60, 1).onChange(handlePositionChange);

	scale_Folder = transform_Folder.addFolder('Scale');
	transform_ScaleUniformController = scale_Folder.add(transform_ScaleUniformObject, 'uniformScale', 1, 30, 1).onChange(handleScaleUniformChange);
	transform_ScaleXController = scale_Folder.add(transform_ScaleXObject, 'scaleX', 1, 50, 1).onChange(handleScaleChange);
	transform_ScaleYController = scale_Folder.add(transform_ScaleYObject, 'scaleY', 1, 50, 1).onChange(handleScaleChange);
	transform_ScaleZController = scale_Folder.add(transform_ScaleZObject, 'scaleZ', 1, 50, 1).onChange(handleScaleChange);

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

	parameter_KController = gui.add(parameter_KObject, 'parameterK', 0.01, 1, 0.01).onChange(handleParameterKChange);

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
uAllShapesMatType = 4; // enum number code for ClearCoat Diffuse material - demo starts off with this material applied to all of the shapes

oldCameraMatrix = new BABYLON.Matrix();
newCameraMatrix = new BABYLON.Matrix();

// must be instantiated here after scene has been created
sphereTransformNode = new BABYLON.TransformNode();
sphereTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
sphereTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

cylinderTransformNode = new BABYLON.TransformNode();
cylinderTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
cylinderTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

coneTransformNode = new BABYLON.TransformNode();
coneTransformNode.position.set(-wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
coneTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

paraboloidTransformNode = new BABYLON.TransformNode();
paraboloidTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
paraboloidTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

hyperboloidTransformNode = new BABYLON.TransformNode();
hyperboloidTransformNode.position.set(-wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
hyperboloidTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

capsuleTransformNode = new BABYLON.TransformNode();
capsuleTransformNode.position.set(-wallRadius * 0.25, -wallRadius + (2.25 * shapeRadius) + 0.01, wallRadius * 0.75);
capsuleTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

flattenedRingTransformNode = new BABYLON.TransformNode();
flattenedRingTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
flattenedRingTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

boxTransformNode = new BABYLON.TransformNode();
boxTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
boxTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

pyramidFrustumTransformNode = new BABYLON.TransformNode();
pyramidFrustumTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
pyramidFrustumTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

diskTransformNode = new BABYLON.TransformNode();
diskTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
diskTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

rectangleTransformNode = new BABYLON.TransformNode();
rectangleTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
rectangleTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);

torusTransformNode = new BABYLON.TransformNode();
torusTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
torusTransformNode.scaling.set(shapeRadius, shapeRadius, shapeRadius);



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
	uniformNames: ["uResolution", "uRandomVec2", "uULen", "uVLen", "uTime", "uFrameCounter", "uSampleCounter", "uEPS_intersect", "uCameraMatrix", "uApertureSize", "uFocusDistance",
		"uCameraIsMoving", "uShapeK", "uAllShapesMatType", "uTorusInvMatrix", "uSphereInvMatrix", "uCylinderInvMatrix", "uConeInvMatrix", "uParaboloidInvMatrix", "uHyperboloidInvMatrix",
		"uCapsuleInvMatrix", "uFlattenedRingInvMatrix", "uBoxInvMatrix", "uPyramidFrustumInvMatrix", "uDiskInvMatrix", "uRectangleInvMatrix", "uQuadLightPlaneSelectionNumber", "uQuadLightRadius"],
	samplerNames: ["previousBuffer", "blueNoiseTexture"],
	name: "pathTracingEffectWrapper"
});

pathTracing_eWrapper.onApplyObservable.add(() =>
{
	uVLen = Math.tan(camera.fov * 0.5);
	uULen = uVLen * (width / height);

	pathTracing_eWrapper.effect.setTexture("previousBuffer", screenCopyRenderTarget);
	pathTracing_eWrapper.effect.setTexture("blueNoiseTexture", blueNoiseTexture);
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
	pathTracing_eWrapper.effect.setFloat("uShapeK", uShapeK);
	pathTracing_eWrapper.effect.setInt("uAllShapesMatType", uAllShapesMatType);
	pathTracing_eWrapper.effect.setBool("uCameraIsMoving", uCameraIsMoving);
	pathTracing_eWrapper.effect.setMatrix("uCameraMatrix", camera.getWorldMatrix());
	pathTracing_eWrapper.effect.setMatrix("uSphereInvMatrix", uSphereInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uCylinderInvMatrix", uCylinderInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uConeInvMatrix", uConeInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uParaboloidInvMatrix", uParaboloidInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uHyperboloidInvMatrix", uHyperboloidInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uCapsuleInvMatrix", uCapsuleInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uFlattenedRingInvMatrix", uFlattenedRingInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uBoxInvMatrix", uBoxInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uPyramidFrustumInvMatrix", uPyramidFrustumInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uDiskInvMatrix", uDiskInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uRectangleInvMatrix", uRectangleInvMatrix);
	pathTracing_eWrapper.effect.setMatrix("uTorusInvMatrix", uTorusInvMatrix);
});


function getElapsedTimeInSeconds()
{
	timeInSeconds += (engine.getDeltaTime() * 0.001);
	return timeInSeconds;
}


// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function ()
{
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

	uTime = getElapsedTimeInSeconds();

	frameTime = engine.getDeltaTime() * 0.001;

	uRandomVec2.set(Math.random(), Math.random());

	// reset cameraIsMoving flag
	uCameraIsMoving = false;


	// check if GUI has been used, update uniforms //////////////////////////////////////////////////

	if (needChangePixelResolution)
	{
		engine.setHardwareScalingLevel(Math.round(1 / pixel_ResolutionController.getValue()));

		handleWindowResize();
		needChangePixelResolution = false;
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

	if (needChangeAllShapesMaterial)
	{
		if (allShapes_MaterialController.getValue() == 'Transparent')
		{
			uAllShapesMatType = 2;// enum number code for TRANSPARENT material
		}
		else if (allShapes_MaterialController.getValue() == 'Diffuse')
		{
			uAllShapesMatType = 1;// enum number code for DIFFUSE material
		}
		else if (allShapes_MaterialController.getValue() == 'ClearCoat_Diffuse')
		{
			uAllShapesMatType = 4;// enum number code for CLEARCOAT_DIFFUSE material
		}
		else if (allShapes_MaterialController.getValue() == 'Metal')
		{
			uAllShapesMatType = 3;// enum number code for METAL material
		}

		uCameraIsMoving = true;
		needChangeAllShapesMaterial = false;
	}


	if (needChangePosition)
	{
		shapeTranslationX = transform_TranslateXController.getValue();
		shapeTranslationY = transform_TranslateYController.getValue();
		shapeTranslationZ = transform_TranslateZController.getValue();

		// first, reset all shapes' positions
		sphereTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
		cylinderTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
		coneTransformNode.position.set(-wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
		paraboloidTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
		hyperboloidTransformNode.position.set(-wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
		capsuleTransformNode.position.set(-wallRadius * 0.25, -wallRadius + (2.25 * shapeRadius) + 0.01, wallRadius * 0.75);
		flattenedRingTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
		boxTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
		pyramidFrustumTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.0);
		diskTransformNode.position.set(wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
		rectangleTransformNode.position.set(-wallRadius * 0.75, -wallRadius + shapeRadius + 0.01, wallRadius * 0.75);
		torusTransformNode.position.set(wallRadius * 0.25, -wallRadius + shapeRadius + 0.01, -wallRadius * 0.75);
		
		// now apply requested translation offsets
		sphereTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		cylinderTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		coneTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		paraboloidTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		hyperboloidTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		capsuleTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		flattenedRingTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		boxTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		pyramidFrustumTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		diskTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		rectangleTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);
		torusTransformNode.position.addInPlaceFromFloats(shapeTranslationX, shapeTranslationY, shapeTranslationZ);

		uCameraIsMoving = true;
		needChangePosition = false;
	}



	if (needChangeScaleUniform)
	{
		shapeUniformScale = transform_ScaleUniformController.getValue();

		transform_ScaleXController.setValue(shapeUniformScale);
		transform_ScaleYController.setValue(shapeUniformScale);
		transform_ScaleZController.setValue(shapeUniformScale);

		sphereTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		cylinderTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		coneTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		paraboloidTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		hyperboloidTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		capsuleTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		flattenedRingTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		boxTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		pyramidFrustumTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		diskTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		rectangleTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);
		torusTransformNode.scaling.set(shapeUniformScale, shapeUniformScale, shapeUniformScale);

		uCameraIsMoving = true;
		needChangeScaleUniform = false;
	}


	if (needChangeScale)
	{
		shapeScaleX = transform_ScaleXController.getValue();
		shapeScaleY = transform_ScaleYController.getValue();
		shapeScaleZ = transform_ScaleZController.getValue();

		sphereTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		cylinderTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		coneTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		paraboloidTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		hyperboloidTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		capsuleTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		flattenedRingTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		boxTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		pyramidFrustumTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		diskTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		rectangleTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);
		torusTransformNode.scaling.set(shapeScaleX, shapeScaleY, shapeScaleZ);

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
		shapeRotationX = transform_RotateXController.getValue();
		shapeRotationY = transform_RotateYController.getValue();
		shapeRotationZ = transform_RotateZController.getValue();

		shapeRotationX *= (Math.PI / 180);
		shapeRotationY *= (Math.PI / 180);
		shapeRotationZ *= (Math.PI / 180);

		sphereTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		cylinderTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		coneTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		paraboloidTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		hyperboloidTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		capsuleTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		flattenedRingTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		boxTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		pyramidFrustumTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		diskTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		rectangleTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);
		torusTransformNode.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);

		uCameraIsMoving = true;
		needChangeRotation = false;
	}

	if (needChangeParameterK)
	{
		uShapeK = parameter_KController.getValue();

		uCameraIsMoving = true;
		needChangeParameterK = false;
	}
	// end GUI check and updating ///////////////////////////////////////////////////////////////



	if (windowIsBeingResized)
	{
		uCameraIsMoving = true;
		windowIsBeingResized = false;
	}


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

	if (keyPressed('z') && !keyPressed('x'))
	{
		uShapeK -= 1 * frameTime;
		if (uShapeK < 0.01)
			uShapeK = 0.01;
		uCameraIsMoving = true;
	}
	if (keyPressed('x') && !keyPressed('z'))
	{
		uShapeK += 1 * frameTime;
		if (uShapeK > 1)
			uShapeK = 1;
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

	// update various quadric shapes' inverse matrices
	uSphereInvMatrix.copyFrom(sphereTransformNode.getWorldMatrix());
	uSphereInvMatrix.invert();
	uCylinderInvMatrix.copyFrom(cylinderTransformNode.getWorldMatrix());
	uCylinderInvMatrix.invert();
	uConeInvMatrix.copyFrom(coneTransformNode.getWorldMatrix());
	uConeInvMatrix.invert();
	uParaboloidInvMatrix.copyFrom(paraboloidTransformNode.getWorldMatrix());
	uParaboloidInvMatrix.invert();
	uHyperboloidInvMatrix.copyFrom(hyperboloidTransformNode.getWorldMatrix());
	uHyperboloidInvMatrix.invert();
	uCapsuleInvMatrix.copyFrom(capsuleTransformNode.getWorldMatrix());
	uCapsuleInvMatrix.invert();
	uFlattenedRingInvMatrix.copyFrom(flattenedRingTransformNode.getWorldMatrix());
	uFlattenedRingInvMatrix.invert();
	uBoxInvMatrix.copyFrom(boxTransformNode.getWorldMatrix());
	uBoxInvMatrix.invert();
	uPyramidFrustumInvMatrix.copyFrom(pyramidFrustumTransformNode.getWorldMatrix());
	uPyramidFrustumInvMatrix.invert();
	uDiskInvMatrix.copyFrom(diskTransformNode.getWorldMatrix());
	uDiskInvMatrix.invert();
	uRectangleInvMatrix.copyFrom(rectangleTransformNode.getWorldMatrix());
	uRectangleInvMatrix.invert();
	uTorusInvMatrix.copyFrom(torusTransformNode.getWorldMatrix());
	uTorusInvMatrix.invert();

	uOneOverSampleCounter = 1.0 / uSampleCounter;

	// CAMERA INFO
	cameraInfoElement.innerHTML = "FOV( mousewheel ): " + (camera.fov * 180 / Math.PI).toFixed(0) + "<br>" + "Aperture( [ and ] ): " + uApertureSize.toFixed(1) +
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
