"use strict";

import * as cg from "./cg.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

function colission(a, b) {
    //console.log("prueba");
    //console.log(a);
    let cont = 0
    //console.log(posA);
    for (let i = 0; i < 3; i++) {
      var posA = a[i];
      var posB = b[i];
      if (posA - posB < 1 && posA - posB > -1) {
        cont++;
          //return true;
      }
    }
    if (cont == 3) {
      return true;
    }

    return false

}

async function main() {
  const gl = document.querySelector("#canvitas").getContext("webgl2");
  if (!gl) return undefined !== console.log("WebGL 2.0 not supported");

  twgl.setDefaults({ attribPrefix: "a_" });

  const vertSrc = await fetch("glsl/06-01.vert").then((r) => r.text());
  const fragSrc = await fetch("glsl/06-01.frag").then((r) => r.text());
  const meshProgramInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const cubex = await cg.loadObj(
    "models/cubito/cubito.obj",
    gl,
    meshProgramInfo,
  );
  const floor = await cg.loadObj(
    "models/madera/madera.obj",
    gl,
    meshProgramInfo,
  );

  const cam = new cg.Cam([0, -5, 25]);
  const rotationAxis = new Float32Array([0, 1, 0]);

  var cx = cam.pos[0];
  var cy = cam.pos[1]; 
  var cz = cam.pos[2];

  let aspect = 1;
  let deltaTime = 0;
  let lastTime = 0;
  let theta = 0;

  var numObjs = 15;
  var numObjsXPos = 15;
  var numObjsZPos = 15;
  var numObjsXNeg =-15;
  var numObjsZNeg =-15;


  const positions = new Array(numObjs);
  const delta = new Array(numObjs);
  const deltaG = -9.81;
  const rndb = (a, b) => Math.random() * (b - a) + a;
  for (let i = 0; i < numObjs; i++) {
    positions[i] = [
      rndb(-13.0, 13.0),
      rndb(6.0, 12.0),
      rndb(-13.0, 13.0),
    ];
    delta[i] = [rndb(-1.1, 1.1), 0.0, rndb(-1.1, 1.1)];
  }

  const uniforms = {
    u_world: m4.create(),
    u_projection: m4.create(),
    u_view: cam.viewM4,
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  function render(elapsedTime) {
    elapsedTime *= 1e-3;
    deltaTime = elapsedTime - lastTime;
    lastTime = elapsedTime;

    if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      aspect = gl.canvas.width / gl.canvas.height;
    }
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta = elapsedTime;

    m4.identity(uniforms.u_projection);
    m4.perspective(uniforms.u_projection, cam.zoom, aspect, 0.1, 100);

    gl.useProgram(meshProgramInfo.program);

    for (let i = 0; i < numObjs; i++) {
      m4.identity(uniforms.u_world);
      m4.translate(uniforms.u_world, uniforms.u_world, positions[i]);
      m4.rotate(uniforms.u_world, uniforms.u_world, theta, rotationAxis);
      twgl.setUniforms(meshProgramInfo, uniforms);

      for (const { bufferInfo, vao, material } of cubex) {
        gl.bindVertexArray(vao);
        twgl.setUniforms(meshProgramInfo, {}, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }

      // Update position
      for (let j = 0; j < 3; j++) {
        positions[i][j] += delta[i][j] * deltaTime;
        if (positions[i][j] > 13.0) {
          positions[i][j] = 13.0;
          delta[i][j] = -delta[i][j];
        } else if (positions[i][j] < -13.0) {
          positions[i][j] = -13.0;
          delta[i][j] = -delta[i][j];
        }
      }
      delta[i][1] += deltaG * deltaTime;
    }
    //llamar colision
    for (let i = 0; i < numObjs; i++) {
      for (let j = i + 1; j < numObjs; j++) {
        
          if(colission(positions[i], positions[j])){
            for(let k = 0; k < 3; k++){
            delta[i][k] = -delta[i][k];
            delta[j][k] = -delta[j][k];
          }
          }
        
        }
      }
    
    //base
    for (let i = numObjsXNeg; i < numObjsXPos; i += 2) {
      for (let j = numObjsZNeg; j < numObjsZPos; j += 2) {
        m4.identity(uniforms.u_world);
        //m4.translate(uniforms.u_world, uniforms.u_world, [i, -14.5 + Math.random() * 0.1, j]);
        m4.translate(uniforms.u_world, uniforms.u_world, [i, -15.5 , j]);
        twgl.setUniforms(meshProgramInfo, uniforms);

        for (const { bufferInfo, vao, material } of floor) {
          gl.bindVertexArray(vao);
          twgl.setUniforms(meshProgramInfo, {}, material);
          twgl.drawBufferInfo(gl, bufferInfo);
        }
      }
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  document.addEventListener("keydown", (e) => {
    /**/ if (e.key === "w") {
      cam.processKeyboard(cg.FORWARD, deltaTime);
      numObjsZPos++;
    }
    else if (e.key === "a") {
      cam.processKeyboard(cg.LEFT, deltaTime);
      numObjsXNeg--;
    }
    else if (e.key === "s") {
      cam.processKeyboard(cg.BACKWARD, deltaTime);
      numObjsZNeg--;
    }
    else if (e.key === "d") {
      cam.processKeyboard(cg.RIGHT, deltaTime);
      numObjsXPos++;
    }



  });
  document.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
  document.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
  document.addEventListener("mouseup", () => cam.stopMove());
  document.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
}

main();
