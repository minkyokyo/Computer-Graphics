import * as THREE from "three";

// setting render
const RENDER_WIDTH = window.outerWidth; // 창 가로크기
const RENDER_HEIGHT = window.outerHeight; // 창 세로크기
const renderer = new THREE.WebGLRenderer();
renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT); //렌더러 크기 설정

// push my render in html
const container = document.getElementById("myContainer");
container.appendChild(renderer.domElement);

// camera setting
const CAMERA1 = new THREE.PerspectiveCamera(
  90, //fov
  RENDER_WIDTH / RENDER_HEIGHT, //aspect ratio
  1, //near
  500 //far
);
CAMERA1.position.set(0, 0, 20); //world의 (0,0,20)에 위치
CAMERA1.up.set(0, 1, 0); // up vector 설정~
CAMERA1.lookAt(0, 0, 0); // 원점을 바라보고 있다. lookat벡터는 -z축이 될 것.

//************************* Step 1. Vertex로 큐브 만들기 *************************
// geometry setting
const VERTICES = []; //vetex를 담을 배열.
const CUBE_LENGTH = 10; //cube의 길이
const minus = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
]; //vertex x,y에 곱해질 값. 각 4분면의 부호다

for (let i = 0; i < 4; i++) {
  let x = (CUBE_LENGTH / 2) * minus[i][0];
  let y = (CUBE_LENGTH / 2) * minus[i][1];
  VERTICES.push(x, y, CUBE_LENGTH / 2);
  VERTICES.push(x, y, -CUBE_LENGTH / 2);
}

//Index
const INDEXES = [
  0, 1, 7, 7, 6, 0, 2, 3, 1, 2, 1, 0, 4, 5, 3, 4, 3, 2, 6, 7, 5, 6, 5, 4, 1, 3,
  5, 1, 5, 7, 2, 0, 6, 2, 6, 4,
];

const geometry = new THREE.BufferGeometry();
//position attribute 설정
geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(VERTICES, 3)
);
//index 설정
geometry.setIndex(INDEXES);

// material setting
const material = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  wireframe: true,
});

// cube model
let myMesh = new THREE.Mesh(geometry, material);

// axis model
const axesHelper = new THREE.AxesHelper(5);

// create my world (scene)
const myScene = new THREE.Scene();

//scene에 큐브랑 축 추가
myScene.add(myMesh);
myScene.add(axesHelper);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(myScene, CAMERA1);
}
animate();

//************************* Step 2. Event 함수 등록 *************************
// register event-callback functions into renderer's dom
renderer.domElement.style = "touch-action:none";
renderer.domElement.onpointerdown = mouseDownHandler; // -> mouse click
renderer.domElement.onpointermove = mouseMoveHandlerTemp; // -> mouse move
renderer.domElement.onpointerup = mouseUpHandler; // -> mouse relase
renderer.domElement.onwheel = mouseWheelHandler; // -> mouse wheel

const MODE = { NONE: -1, OBJECT: 0, CAMERA: 1 }; //Obejct mode, camera mode
var mode = MODE.NONE; // 사용자가 입력한 키에 따라 바뀜. 초기는 None Mode.

let prev_x;
let prev_y;

let left_down_flag = false; // 왼쪽 마우스 클릭했니??
let right_down_flag = false; // 오른쪽 마우스 클릭했니??

// camera의 회전축의 중심! 초기값은 원점이다.
let camRotCenter = new THREE.Vector3(0, 0, 0);

// key 입력 이벤트
window.addEventListener("keydown", function (event) {
  switch (event.code) {
    case "KeyQ": //Q
      mode = MODE.OBJECT; //Q를 입력하면 Object가 움직입니다.
      break;
    case "KeyW": //W
      mode = MODE.CAMERA; //W를 입력하면 Camera가 움직입니다.
      break;
  }
});

function mouseUpHandler(e) {
  //마우스를 떼었을 때, 뗐다는 표시를 합니다.
  if (left_down_flag) left_down_flag = false;
  else if (right_down_flag) right_down_flag = false;
}

function mouseDownHandler(e) {
  //사용자가 모드를 입력 안했을 시에는 마우스 이벤트를 종료합니다.
  if (mode == MODE.NONE) return;

  if (e.button == 0) left_down_flag = true; //왼쪽 버튼 누르면 표시
  else if (e.button == 2) right_down_flag = true; //오른쪽 버튼 누르면 표시
  //prev_x, prev_y 처음 값 설정
  prev_x = e.clientX;
  prev_y = e.clientY;
}

function mouseWheelHandler(e) {
  if (mode != MODE.CAMERA) return;

  // 카메라의 -z축을 구하자.
  let lookAt = new THREE.Vector3(); // create once and reuse it!
  CAMERA1.getWorldDirection(lookAt); //get WorldDirection으로 구할 수 있음.
  let move = new THREE.Vector3(); // 이동할 벡터를 담는 변수

  if (e.deltaY > 0) {
    //아래로 휠! 카메라를 뒤로 후진한다.
    //backward move는 카메라의 z축 방향과 평행합니다.
    move = lookAt.clone().multiplyScalar(-1);
  } else if (e.deltaY < 0) {
    //위로 휠! 카메라를 앞으로 전진한다.
    //forward move는 카메라의 -z축 방향과 평행합니다.
    move = lookAt.clone();
  }

  // 벡터에 상수배를 하여 움직일 양을 정한다. 여기선 5만큼 했다.
  move = move.multiplyScalar(5);

  //카메라 매트릭스에 곱해질 회전행렬을 구한다.
  let matT = new THREE.Matrix4().makeTranslation(move.x, move.y, move.z);

  //camera 회전축의 중심점도 move만큼 변동합니다.
  camRotCenter.add(move);

  //---- Camera matrix 업데이트----
  CAMERA1.matrixAutoUpdate = false;
  CAMERA1.matrixWorldNeedsUpdate = true; //view Matrix때문에 해줘야함
  let mat_prev = CAMERA1.matrix.clone();
  mat_prev.premultiply(matT);
  CAMERA1.matrix = mat_prev;

  //---- Camera의 position property 업데이트 ----
  CAMERA1.position.x = CAMERA1.position.x + move.x;
  CAMERA1.position.y = CAMERA1.position.y + move.y;
  CAMERA1.position.z = CAMERA1.position.z + move.z;
}

function mouseMoveHandlerTemp(e) {
  //마우스 클릭을 했는지 확인.
  if (left_down_flag || right_down_flag) {
    //현재 mouse 좌표 world space로 변환.
    let newPosWS = compute_pos_ss2ws(e.clientX, e.clientY);
    //이전 mouse 좌표 world space로 변환 differenc를 구하기 위함.
    let prevPosWS = compute_pos_ss2ws(prev_x, prev_y);

    switch (mode) {
      case MODE.OBJECT:
        // 물체를 움직이자!
        if (left_down_flag) {
          //물체를 회전 하는 함수 호출
          ObjectRotate(newPosWS, prevPosWS);
        } else if (right_down_flag) {
          //물체를 이동 하는 함수 호출
          ObjectMove(newPosWS, prevPosWS);
          //지금 좌표를 이전 좌표로 저장.
        }
        break;
      case MODE.CAMERA:
        //카메라를 움직이자!
        if (left_down_flag) {
          //카메라를 회전 함수 호출
          CameraRotate(newPosWS, prevPosWS);
        } else if (right_down_flag) {
          //카메라를 이동 함수 호출
          CameraMove(newPosWS, prevPosWS);
        }
        break;
      default:
        console.log("mode off, please press Q or W");
        break;
    }
    //현재 좌표를 이전 좌표로 저장.
    prev_x = e.clientX;
    prev_y = e.clientY;
  }
}

function ObjectRotate(new_posWorld, prev_posWorld) {
  //스크린 좌표들의 중점을 구한다.
  let center = new THREE.Vector3(
    (new_posWorld.x + prev_posWorld.x) / 2,
    (new_posWorld.y + prev_posWorld.y) / 2,
    (new_posWorld.z + prev_posWorld.z) / 2
  );
  // camera의 -z축을 구하자.
  let lookAt = new THREE.Vector3();
  //getWorldDirection이라는 친절한 함수를 사용하여 -z축을 구함.
  CAMERA1.getWorldDirection(lookAt);
  //CENTER의 z축으로 1만큼 이동 (near 만큼 이동)
  let Temp_cam = new THREE.Vector3(
    center.x + -lookAt.x,
    center.y + -lookAt.y,
    center.z + -lookAt.z
  );

  //C는 임시 카메라 좌표, N은 새로운 스크린좌표를 의미. 임시 카메라에서 스크린 new 방향의 벡터입니다.
  let CN = new THREE.Vector3();
  CN = CN.subVectors(new_posWorld, Temp_cam);

  //C는 임시 카메라, P은 이전 스크린좌표를 의미. 임시 카메라에서 스크린 prev 방향의 벡터입니다.
  let CP = new THREE.Vector3();
  CP = CP.subVectors(prev_posWorld, Temp_cam);

  //유닛벡터를 구합니다.
  let normalCN = CN.normalize();
  let normalCP = CP.normalize();

  //rot_axis => 외적을 통해 구할 수 있다.
  let rot_axis = new THREE.Vector3();
  rot_axis.crossVectors(normalCN, normalCP); //회전축!
  rot_axis.normalize(); // 노말라이즈를 해주어야 한다. .setFromAxisAngle 쓰려고

  //between anlge => 두 벡터 사이의 각도
  let bet_angle = normalCP.angleTo(normalCN);

  //쿼터니언 구하기
  let quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(rot_axis, bet_angle); //이걸로 회전 행렬을 구하자.

  //쿼터니언으로 회전행렬을 구한다.
  const matR = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

  //그 다음 큐브를 원점으로 이동시키는 행렬
  const matT = new THREE.Matrix4().makeTranslation(
    -myMesh.position.x,
    -myMesh.position.y,
    -myMesh.position.z
  );

  //다시 큐브를 원위치로 돌려놓는 행렬.
  const matT_inv = new THREE.Matrix4().makeTranslation(
    myMesh.position.x,
    myMesh.position.y,
    myMesh.position.z
  );

  //---- myMesh(내가 만든 큐브) matrix 업데이트----
  myMesh.matrixAutoUpdate = false;
  let mat_prev = myMesh.matrix.clone();
  mat_prev.premultiply(matT); //원점으로 이동시키고
  mat_prev.premultiply(matR); //회전
  mat_prev.premultiply(matT_inv); // 다시 큐브의 원래 위치로
  myMesh.matrix = mat_prev;
}

function ObjectMove(new_posWorld, prev_posWorld) {
  // camera의 -z축을 구하자.
  let lookAt = new THREE.Vector3();
  //getWorldDirection이라는 친절한 함수를 사용하여 -z축을 구함.
  CAMERA1.getWorldDirection(lookAt);

  //world에서 camera의 posistion과 world에서 object의 postion을 통해 벡터를 구함.
  //camera에서 object로 향하는 벡터
  let camToObj = new THREE.Vector3();
  camToObj.subVectors(myMesh.position, CAMERA1.position);
  //정규화
  let camToObj_n = camToObj.clone().normalize();

  //두 벡터로 cos세타 구하기
  let cos_ = lookAt.dot(camToObj_n); //유닛벡터라서 길이를 딱히 나눠주지 않는다.
  //벡터 CO * cos_ = CO`(정사영 내린 값)
  let CO_N_length = camToObj.length() * cos_ * 1.0; //float 만들려고 1.0곱함.

  //이제 비율을 구했다!
  // near : CO정사영 의 비율로 벡터 differenc를 구하면됨!
  let diff = new THREE.Vector3();
  diff.subVectors(new_posWorld, prev_posWorld); // Prev -> New로 가는 벡터

  //벡터에 스칼라를 곱해서 물체 쪽에서는 얼만큼 움직이는지 파악.
  let diff_s = diff.clone().multiplyScalar(CO_N_length);

  //mesh에 곱해질 매트릭스 선언
  let matLocal = new THREE.Matrix4();
  const matT = new THREE.Matrix4().makeTranslation(
    diff_s.x,
    diff_s.y,
    diff_s.z
  );
  //---- myMesh(내가 만든 큐브) matrix 업데이트----
  myMesh.matrixAutoUpdate = false;
  let mat_prev = myMesh.matrix.clone();
  mat_prev.premultiply(matT); //움직인 만큼 이동하기!
  myMesh.matrix = mat_prev;

  //---- myMesh의 position property 업데이트 ----
  myMesh.position.set(
    myMesh.position.x + diff_s.x,
    myMesh.position.y + diff_s.y,
    myMesh.position.z + diff_s.z
  );
}

function CameraRotate(new_posWorld, prev_posWorld) {
  //교수님이 처음 회전 중심 원점을 하라 했다..

  //스크린 좌표들의 중점을 구한다.
  let center = new THREE.Vector3(
    (new_posWorld.x + prev_posWorld.x) / 2,
    (new_posWorld.y + prev_posWorld.y) / 2,
    (new_posWorld.z + prev_posWorld.z) / 2
  );
  // camera의 -z축을 구하자.
  let lookAt = new THREE.Vector3();
  //getWorldDirection이라는 친절한 함수를 사용하여 -z축을 구함.
  CAMERA1.getWorldDirection(lookAt);
  //CENTER의 z축으로 1(near)만큼 이동
  let Temp_cam = new THREE.Vector3(
    center.x + -lookAt.x,
    center.y + -lookAt.y,
    center.z + -lookAt.z
  );

  //C는 임시 카메라 좌표, N은 새로운 스크린좌표를 의미. 임시 카메라에서 스크린 new 방향의 벡터입니다.
  let CN = new THREE.Vector3();
  CN = CN.subVectors(new_posWorld, Temp_cam);

  //C는 임시 카메라 좌표, P은 이전 스크린좌표를 의미. 임시 카메라에서 스크린 prev 방향의 벡터입니다.
  let CP = new THREE.Vector3();
  CP = CP.subVectors(prev_posWorld, Temp_cam);

  //유닛벡터를 구합니다.
  let normalCN = CN.normalize();
  let normalCP = CP.normalize();

  //rot_axis => 외적을 통해 구할 수 있다.
  let rot_axis = new THREE.Vector3();
  rot_axis.crossVectors(normalCP, normalCN); //회전축!
  rot_axis.normalize(); // 노말라이즈를 해주어야 합니다!

  //between anlge => 두 벡터 사이의 각도
  let bet_angle = normalCP.angleTo(normalCN);

  //이걸로 회전 행렬을 구하자.
  let quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(rot_axis, bet_angle); //회전축과 각도로 쿼터니언을 구함.
  const matR = new THREE.Matrix4().makeRotationFromQuaternion(quaternion); //쿼터니언으로 회전행렬 구함.

  //그 다음 카메라 회전축 중심이 원점으로 이동하는 행렬을 구한다.
  const matT_rotCenter = new THREE.Matrix4().makeTranslation(
    -camRotCenter.x,
    -camRotCenter.y,
    -camRotCenter.z
  );

  // 카메라 회전축 중심이 다시 원 위치로 돌아가는 이동 행렬.
  const matT_rotCenter_back = new THREE.Matrix4().makeTranslation(
    camRotCenter.x,
    camRotCenter.y,
    camRotCenter.z
  );

  //---- Camera matrix 업데이트----
  CAMERA1.matrixWorldNeedsUpdate = true;
  CAMERA1.matrixAutoUpdate = false;
  let mat_prev = CAMERA1.matrix.clone();
  mat_prev.premultiply(matT_rotCenter); //중심점이 원점으로 가게 이동
  mat_prev.premultiply(matR); // 회전
  mat_prev.premultiply(matT_rotCenter_back); // 중심점이 원래 위치로 가게 이동
  CAMERA1.matrix = mat_prev;

  //---- Camera의 position property 업데이트 ----
  // 회전축 중심이 원점으로 이동한 만큼 카메라 위치도 이동
  let position = new THREE.Vector4(
    CAMERA1.position.x - camRotCenter.x,
    CAMERA1.position.y - camRotCenter.y,
    CAMERA1.position.z - camRotCenter.z,
    1
  );
  //이동한 점에 회전 행렬 곱해
  position.applyMatrix4(matR);

  //카메라 회전 중심을 다시 원 위치로 이동한 만큼 카메라도 이동
  position.x = position.x + camRotCenter.x;
  position.y = position.y + camRotCenter.y;
  position.z = position.z + camRotCenter.z;
  //이 위치를 카메라 포지션에 저장
  CAMERA1.position.set(position.x, position.y, position.z);
}

function CameraMove(new_posWorld, prev_posWorld) {
  let lookAt = new THREE.Vector3();
  //getWorldDirection이라는 아주 친절한 함수로 camera의 lookat을 구한다.
  CAMERA1.getWorldDirection(lookAt);

  //카메라도 물체와의 거리를 이용해서 움직인다.
  //world에서 camera의 posistion과 world에서 object의 postion을 통해 벡터를 구함.
  //camera에서 object로 향하는 벡터
  let camToObj = new THREE.Vector3();
  camToObj.subVectors(myMesh.position, CAMERA1.position);
  //정규화
  let camToObj_n = camToObj.clone().normalize();
  //두 벡터로 cos세타 구하기
  let cos_ = lookAt.dot(camToObj_n); // 둘 다 유닛벡터라서 길이를 딱히 나눠주지 않는다.
  //벡터 CO * cos_ = CO`
  let CO_N_length = camToObj.length() * cos_ * 1.0; //float 만들려고 1.0곱함.

  //이제 비율을 구했다!
  // near : CO 정사영 의 비율로 벡터 differenc를 구하면됨!
  let diff = new THREE.Vector3();
  diff.subVectors(new_posWorld, prev_posWorld); // Prev -> New로 가는 벡터
  //벡터에 스칼라 곱해서 near plane에 비해 얼마나 움직이는지 알아냄.
  let diff_s = diff.multiplyScalar(CO_N_length);

  const matT = new THREE.Matrix4().makeTranslation(
    diff_s.x,
    diff_s.y,
    diff_s.z
  );

  //---- Camera matrix 업데이트----
  CAMERA1.matrixWorldNeedsUpdate = true; // viewMatrix를 위해 업뎃!!
  CAMERA1.matrixAutoUpdate = false; //내가 지정한 matrix로 셋팅하기 위해서
  let mat_prev = CAMERA1.matrix.clone();
  mat_prev.premultiply(matT); // 기존 matrix에 이동행렬을 곱해줌.
  CAMERA1.matrix = mat_prev;

  //---- Camera의 position property 업데이트 ----
  CAMERA1.position.set(
    CAMERA1.position.x + diff_s.x,
    CAMERA1.position.y + diff_s.y,
    CAMERA1.position.z + diff_s.z
  );

  //카메라 이동에 따라, 카메라 회전축의 중심점도 바꿔줌.
  camRotCenter.add(diff_s);
}

//screen space to projection space
function compute_pos_ss2ws(x_ss, y_ss) {
  return new THREE.Vector3(
    (x_ss / RENDER_WIDTH) * 2 - 1,
    (-y_ss / RENDER_HEIGHT) * 2 + 1,
    -1 // projection space에서 -1에...
  ).unproject(CAMERA1); // unproject는 projection space에서 world로 변환해준다.
}
