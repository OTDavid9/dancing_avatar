const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let scene;
let socket;
let avatarRoot = null;
let skeleton = null;

/* ---------------- SCENE ---------------- */

const createScene = async () => {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.04, 0.09, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 2.4,
    3.5,
    new BABYLON.Vector3(0, 1.2, 0),
    scene
  );
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 1.0;

  // Floor (gives visual grounding)
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
  ground.position.y = 0;
  ground.material = new BABYLON.StandardMaterial("gmat", scene);
  ground.material.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);

  await loadAvatar(scene);

  return scene;
};

/* ---------------- LOAD REAL AVATAR ---------------- */

async function loadAvatar(scene) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    "https://models.babylonjs.com/CesiumMan/",
    "CesiumMan.glb",
    scene
  );

  avatarRoot = result.meshes[0];
  skeleton = result.skeletons[0];

  avatarRoot.scaling.set(1.2, 1.2, 1.2);
  avatarRoot.position.y = 0;

  // ✅ ENABLE BUTTON WHEN READY
  const startBtn = document.getElementById("start");
  startBtn.disabled = false;
  startBtn.textContent = "Start Dancing";

  console.log("✅ Avatar loaded");
}


/* ---------------- WEBSOCKET (READY FOR BONES) ---------------- */

document.getElementById("start").onclick = () => {
  if (socket) socket.close();

  socket = new WebSocket(`ws://${location.host}/ws/dance`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      style: document.getElementById("style").value,
      duration: Number(document.getElementById("duration").value)
    }));
  };

  socket.onmessage = (e) => {
    const pose = JSON.parse(e.data);
    applyIdleMotion(); // temporary motion
  };
};


/* ---------------- TEMP MOTION (VISUAL PROOF) ---------------- */

function applyIdleMotion() {
  if (!skeleton) return;

  const spine = skeleton.bones.find(b => b.name.toLowerCase().includes("spine"));
  if (!spine) return;

  spine.rotation.y = Math.sin(performance.now() * 0.002) * 0.1;
}

/* ---------------- RUN ---------------- */

createScene().then(() => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
