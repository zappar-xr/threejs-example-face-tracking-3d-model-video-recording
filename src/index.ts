/// Zappar for ThreeJS Examples
/// Face Tracking 3D Model
import * as ZapparVideoRecorder from '@zappar/video-recorder';
import WebGlSnapshot from '@zappar/webgl-snapshot';
// In this example we track a 3D model to the user's face
import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './index.css';

const helmet = new URL('../assets/z_helmet.glb', import.meta.url).href;

// The SDK is supported on many different browsers, but there are some that
// don't provide camera access. This function detects if the browser is supported
// For more information on support, check out the readme over at
// https://www.npmjs.com/package/@zappar/zappar-threejs
if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded. You can use this if it's helpful, or use
// your own loading UI - it's up to you :-)
const manager = new ZapparThree.LoadingManager();

// Construct our ThreeJS renderer (using preserveDrawingBuffer for the snapshot) and scene as usual
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();

// In order to use camera and motion data, we need to ask the users for permission
// The Zappar library comes with some UI to help with that, so let's use it
ZapparThree.permissionRequestUI().then((granted) => {
  // If the user granted us the permissions we need then we can start the camera
  // Otherwise let's them know that it's necessary with Zappar's permission denied UI
  if (granted) camera.start(true); // true parameter for user facing camera
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;

// Create a FaceTracker and a FaceAnchorGroup from it to put Three content in
// Pass our loading manager to the loader to ensure that the progress bar
// works correctly
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
// Add our face tracker group into the ThreeJS scene
scene.add(faceTrackerGroup);

// Start with the content group invisible
faceTrackerGroup.visible = false;

// We want the user's face to appear in the center of the helmet
// so use ZapparThree.HeadMaskMesh to mask out the back of the helmet.
// In addition to constructing here we'll call mask.updateFromFaceAnchorGroup(...)
// in the frame loop later.
const mask = new ZapparThree.HeadMaskMeshLoader().load();
faceTrackerGroup.add(mask);

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(helmet, (gltf) => {
  // Position the loaded content to overlay user's face
  gltf.scene.position.set(0.3, -1.3, 0);
  gltf.scene.scale.set(1.1, 1.1, 1.1);

  // Add the scene to the tracker group
  faceTrackerGroup.add(gltf.scene);
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});

// Let's add some lighting, first a directional light above the model pointing down
const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.position.set(0, 5, 0);
directionalLight.lookAt(0, 0, 0);
scene.add(directionalLight);

// And then a little ambient light to brighten the model up a bit
const ambientLight = new THREE.AmbientLight('white', 0.4);
scene.add(ambientLight);

// Hide the 3D content when the face is out of view
faceTrackerGroup.faceTracker.onVisible.bind(() => { faceTrackerGroup.visible = true; });
faceTrackerGroup.faceTracker.onNotVisible.bind(() => { faceTrackerGroup.visible = false; });

// Get a reference to the 'Snapshot' button so we can attach a 'click' listener
const placeButton = document.getElementById('instructions') || document.createElement('div');

async function initRecorder() {
  const canvas = document.querySelector('canvas') || document.createElement('canvas');

  const recorder = await ZapparVideoRecorder.createCanvasVideoRecorder(canvas);
  let recording = false;

  // When we start recording update text
  recorder.onStart.bind(() => {
    recording = true;
    placeButton.innerText = 'TAP TO STOP RECORDING';
  });

  // When stop recording update text, and prompt a social share dialog.
  recorder.onComplete.bind(async (result) => {
    placeButton.innerText = 'TAP TO START RECORDING';

    WebGlSnapshot({
      data: await result.asDataURL(),
    });

    recording = false;
  });

  // Toggle between recording
  placeButton.addEventListener('click', async () => {
    if (recording) {
      recorder.stop();
    } else {
      recorder.start();
    }
  });
}

initRecorder();

// Use a function to render our scene as usual
function render(): void {
  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Update the head mask so it fits the user's head in this frame
  mask.updateFromFaceAnchorGroup(faceTrackerGroup);

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Call render() again next frame
  requestAnimationFrame(render);
}

// Start things off
render();
