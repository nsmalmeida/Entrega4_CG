// main.js - Usa m4.js, level.js e character.js externos

var vertexShaderSource = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;

  uniform mat4 u_worldViewProjection;
  uniform mat4 u_world;
  uniform mat4 u_viewInverse;
  uniform mat4 u_worldInverseTranspose;
  uniform float u_textureScale;

  varying vec3 v_normal;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec3 v_surfaceWorldPosition;

  void main() {
    gl_Position = u_worldViewProjection * vec4(a_position, 1.0);
    v_normal = mat3(u_worldInverseTranspose) * a_normal;
    v_surfaceWorldPosition = (u_world * vec4(a_position, 1.0)).xyz;
    v_surfaceToView = u_viewInverse[3].xyz - v_surfaceWorldPosition;
    v_texcoord = a_texcoord * u_textureScale;
  }
`

var fragmentShaderSource = `
  precision mediump float;

  varying vec3 v_normal;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec3 v_surfaceWorldPosition;

  uniform sampler2D u_texture;
  uniform int u_useTexture;
  uniform vec4 u_color;

  uniform vec3 u_lightPositions[4];
  uniform vec3 u_lightColors[4];
  uniform vec3 u_ambientLight;
  uniform float u_shininess;

  void main() {
    vec3 normal = normalize(v_normal);
    vec3 surfaceToViewDirection = normalize(v_surfaceToView);

    vec4 baseColor;
    if (u_useTexture == 1) {
        baseColor = texture2D(u_texture, v_texcoord);
    } else {
        baseColor = u_color;
    }

    vec3 totalLight = u_ambientLight;

    for (int i = 0; i < 4; i++) {
      vec3 surfaceToLightDirection = normalize(u_lightPositions[i] - v_surfaceWorldPosition);
      vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

      float light = dot(normal, surfaceToLightDirection);
      float diffuse = max(light, 0.0);

      float specular = 0.0;
      if (light > 0.0) {
        specular = pow(dot(normal, halfVector), u_shininess);
      }

      totalLight += (diffuse * u_lightColors[i]);
      totalLight += (specular * u_lightColors[i]);
    }

    gl_FragColor = vec4(baseColor.rgb * totalLight, baseColor.a);
  }
`

function createShader(gl, type, source) {
  var shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl, vsSource, fsSource) {
  var vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
  var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  var program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return null
  }
  return program
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTexture(gl, url) {
  var texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]))
  
  var image = new Image()
  image.crossOrigin = "anonymous"
  image.src = url
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       gl.generateMipmap(gl.TEXTURE_2D);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }
  return texture
}

// --- FUNÇÕES DE GEOMETRIA ---
function setCubeVertices(v) {
  return new Float32Array([
    -v, -v,  v,  v, -v,  v,  v,  v,  v, -v,  v,  v, 
    -v, -v, -v, -v,  v, -v,  v,  v, -v,  v, -v, -v, 
    -v,  v, -v, -v,  v,  v,  v,  v,  v,  v,  v, -v, 
    -v, -v, -v,  v, -v, -v,  v, -v,  v, -v, -v,  v, 
     v, -v, -v,  v,  v, -v,  v,  v,  v,  v, -v,  v, 
    -v, -v, -v, -v, -v,  v, -v,  v,  v, -v,  v, -v, 
  ]);
}

function setCubeNormals() {
  return new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);
}

function setCubeTexcoords() {
  return new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 0, 0,
    0, 0, 0, 1, 1, 1, 1, 0,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);
}

function setCubeIndices() {
  return new Uint16Array([
    0, 1, 2,      0, 2, 3,    
    4, 5, 6,      4, 6, 7,    
    8, 9, 10,     8, 10, 11,  
    12, 13, 14,   12, 14, 15, 
    16, 17, 18,   16, 18, 19, 
    20, 21, 22,   20, 22, 23  
  ]);
}

function createCubeData() {
  var positions = setCubeVertices(0.5);
  var normals = setCubeNormals();
  var texcoords = setCubeTexcoords();
  var indices = setCubeIndices();
  return { positions, normals, texcoords, indices };
}

function createSphereData(radius, latitudeBands, longitudeBands) {
    var positions = [];
    var normals = [];
    var texcoords = [];
    var indices = [];

    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      var theta = latNumber * Math.PI / latitudeBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);

      for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = cosPhi * sinTheta;
        var y = cosTheta;
        var z = sinPhi * sinTheta;
        var u = 1 - (longNumber / longitudeBands);
        var v = 1 - (latNumber / latitudeBands);

        normals.push(x);
        normals.push(y);
        normals.push(z);
        texcoords.push(u);
        texcoords.push(v);
        positions.push(radius * x);
        positions.push(radius * y);
        positions.push(radius * z);
      }
    }

    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
        var first = (latNumber * (longitudeBands + 1)) + longNumber;
        var second = first + longitudeBands + 1;
        indices.push(first);
        indices.push(second);
        indices.push(first + 1);
        indices.push(second);
        indices.push(second + 1);
        indices.push(first + 1);
      }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        indices: new Uint16Array(indices)
    };
}

// --- ESTADO DO JOGO ---
var charX = 0
var charZ = 0
var charSpeed = 0.03
var keysPressed = {}
var isDragging = false
var lastMouseX = 0
var cameraAngle = 0
var zoom = 30.0
var mapSize = 21
var blockSize = 1.0
var mapOffset = (mapSize * blockSize) / 2

// --- ATUALIZADO: SCORE E TIMER ---
var scores = []; // Array para guardar pontuação
var startTime = Date.now(); // Marca o inicio da rodada
var uiElement = document.getElementById("ui-controls"); // Referencia para atualizar texto

var keyData = { x: 0, z: 0, active: true };
var doorData = { row: -1, col: -1, faceIndex: -1, offsetBytes: 0 };

function degToRad(d) {
  return (d * Math.PI) / 180
}

function main() {
  var canvas = document.querySelector("#glCanvas")
  var gl = canvas.getContext("webgl")
  if (!gl) {
    console.error("WebGL não suportado")
    return
  }

  var program = createProgram(gl, vertexShaderSource, fragmentShaderSource)

  var loc = {
    position: gl.getAttribLocation(program, "a_position"),
    normal: gl.getAttribLocation(program, "a_normal"),
    texcoord: gl.getAttribLocation(program, "a_texcoord"),
    worldViewProjection: gl.getUniformLocation(program, "u_worldViewProjection"),
    world: gl.getUniformLocation(program, "u_world"),
    viewInverse: gl.getUniformLocation(program, "u_viewInverse"),
    worldInverseTranspose: gl.getUniformLocation(program, "u_worldInverseTranspose"),
    lightPositions: gl.getUniformLocation(program, "u_lightPositions"),
    lightColors: gl.getUniformLocation(program, "u_lightColors"),
    ambientLight: gl.getUniformLocation(program, "u_ambientLight"),
    shininess: gl.getUniformLocation(program, "u_shininess"),
    texture: gl.getUniformLocation(program, "u_texture"),
    useTex: gl.getUniformLocation(program, "u_useTexture"),
    color: gl.getUniformLocation(program, "u_color"),
    textureScale: gl.getUniformLocation(program, "u_textureScale"),
  }

  var cubeData = createCubeData()
  var buffers = {
    pos: gl.createBuffer(),
    norm: gl.createBuffer(),
    tex: gl.createBuffer(),
    ind: gl.createBuffer(),
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos)
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.positions, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.norm)
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.normals, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tex)
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.texcoords, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ind)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeData.indices, gl.STATIC_DRAW)

  var sphereGeo = createSphereData(0.15, 20, 20); 
  var sphereBuffers = {
      pos: gl.createBuffer(),
      norm: gl.createBuffer(),
      tex: gl.createBuffer(),
      ind: gl.createBuffer(),
      count: sphereGeo.indices.length
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.pos);
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.norm);
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.tex);
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.texcoords, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.ind);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereGeo.indices, gl.STATIC_DRAW);

  window.Character = window.Character || {}
  window.Character.init(gl)

  var texTerrain = loadTexture(gl, './ground.png')
  var texWall = loadTexture(gl, './wall.png')
  var texDoor = loadTexture(gl, './door.jpg')

  var lightPositions = new Float32Array([15.0, 10.0, 0.0, -15.0, 10.0, 0.0, 0.0, 10.0, 15.0, 0.0, 10.0, -15.0])
  var lightColors = new Float32Array([0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.1, 0.1, 0.6])

  function spawnKey() {
      var emptySpots = [];
      for (var r = 0; r < mapSize; r++) {
          for (var c = 0; c < mapSize; c++) {
              if (window.LevelMap[r][c] === 0) {
                  emptySpots.push({ row: r, col: c });
              }
          }
      }
      if (emptySpots.length > 0) {
          var randIndex = Math.floor(Math.random() * emptySpots.length);
          var spot = emptySpots[randIndex];
          keyData.x = spot.col - mapOffset + 0.5;
          keyData.z = spot.row - mapOffset + 0.5;
          keyData.active = true;
      }
  }

  function spawnDoor() {
      var candidates = [];
      for (var r = 1; r < mapSize - 1; r++) {
          for (var c = 1; c < mapSize - 1; c++) {
              if (window.LevelMap[r][c] === 1) {
                  if (window.LevelMap[r - 1][c] === 0) {
                       candidates.push({ r: r, c: c, face: 'Back', offsetBytes: 12 });
                  } else if (window.LevelMap[r + 1][c] === 0) {
                       candidates.push({ r: r, c: c, face: 'Front', offsetBytes: 0 });
                  } else if (window.LevelMap[r][c - 1] === 0) {
                       candidates.push({ r: r, c: c, face: 'Left', offsetBytes: 60 });
                  } else if (window.LevelMap[r][c + 1] === 0) {
                       candidates.push({ r: r, c: c, face: 'Right', offsetBytes: 48 });
                  }
              }
          }
      }

      if (candidates.length > 0) {
          var rand = Math.floor(Math.random() * candidates.length);
          var chosen = candidates[rand];
          doorData.row = chosen.r;
          doorData.col = chosen.c;
          doorData.offsetBytes = chosen.offsetBytes;
      }
  }

  // --- ATUALIZADO: FUNÇÃO DE RESETAR O JOGO ---
  function resetMatch() {
      // 1. Reseta posição do personagem
      charX = 0;
      charZ = 0;
      
      // 2. Reseta/Sorteia chave
      spawnKey();
      
      // 3. Reseta/Sorteia porta
      spawnDoor();
      
      // 4. Reinicia cronômetro
      startTime = Date.now();
      
      console.log("Nova rodada iniciada!");
  }

  // Inicialização do primeiro jogo
  resetMatch();

  window.addEventListener("keydown", (e) => { keysPressed[e.key.toLowerCase()] = true })
  window.addEventListener("keyup", (e) => { keysPressed[e.key.toLowerCase()] = false })

  canvas.addEventListener("mousedown", (e) => { isDragging = true; lastMouseX = e.clientX })
  window.addEventListener("mouseup", () => { isDragging = false })
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return
    cameraAngle += (e.clientX - lastMouseX) * 0.01
    lastMouseX = e.clientX
  })
  canvas.addEventListener("wheel", (e) => {
      e.preventDefault(); zoom += e.deltaY * 0.02; zoom = Math.max(5.0, Math.min(60.0, zoom));
  }, { passive: false })

  function checkCollision(x, z) {
    var col = Math.floor(x + mapOffset)
    var row = Math.floor(z + mapOffset)
    if (row < 0 || row >= mapSize || col < 0 || col >= mapSize) { return true }
    
    // Colisão com parede
    if (window.LevelMap[row][col] === 1) {
        // --- ATUALIZADO: Lógica de Vitoria ---
        if (row === doorData.row && col === doorData.col) {
            if (!keyData.active) {
                // GANHOU A RODADA
                var endTime = Date.now();
                var durationSeconds = (endTime - startTime) / 1000;
                
                // Pontuação: Max 10. Perde 1 ponto a cada 4 segundos (ajustável)
                // Exemplo: 0s-4s = 10pts, 5s-8s = 9pts, etc.
                var points = Math.max(0, 10 - Math.floor(durationSeconds / 4.0));
                
                scores.push(points);
                
                // Reinicia o jogo
                resetMatch();
            } else {
                console.log("Porta trancada!");
            }
        }
        return true; 
    }
    return false;
  }

  function updateCharacter() {
    var nextX = charX
    var nextZ = charZ
    var r = 0.35

    if (keysPressed["w"] || keysPressed["arrowup"]) nextZ -= charSpeed
    if (keysPressed["s"] || keysPressed["arrowdown"]) nextZ += charSpeed
    if (keysPressed["a"] || keysPressed["arrowleft"]) nextX -= charSpeed
    if (keysPressed["d"] || keysPressed["arrowright"]) nextX += charSpeed

    if (!checkCollision(nextX - r, charZ - r) && !checkCollision(nextX + r, charZ - r) &&
        !checkCollision(nextX - r, charZ + r) && !checkCollision(nextX + r, charZ + r)) {
      charX = nextX
    }
    if (!checkCollision(charX - r, nextZ - r) && !checkCollision(charX + r, nextZ - r) &&
        !checkCollision(charX - r, nextZ + r) && !checkCollision(charX + r, nextZ + r)) {
      charZ = nextZ
    }
    
    if (keyData.active) {
        var dx = charX - keyData.x;
        var dz = charZ - keyData.z;
        var dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 0.5) {
            keyData.active = false;
        }
    }
  }

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)
  gl.clearColor(0.05, 0.05, 0.05, 1.0)
  gl.useProgram(program)

  requestAnimationFrame(drawScene)

  function drawScene() {
    updateCharacter()
    
    // --- ATUALIZADO: UI UPDATE ---
    var elapsed = (Date.now() - startTime) / 1000;
    // Calcula pontos potenciais em tempo real para mostrar na tela
    var potentialPoints = Math.max(0, 10 - Math.floor(elapsed / 4.0));
    
    if (uiElement) {
        uiElement.innerHTML = `
            <strong>Projeto Final - WebGL</strong><br>
            <span style="color:yellow">Tempo: ${elapsed.toFixed(1)}s</span><br>
            <span style="color:cyan">Potencial: ${potentialPoints} pts</span><br>
            <span style="color:white">Histórico: [${scores.join(', ')}]</span><br>
            ${!keyData.active ? '<span style="color:lime">CHAVE PEGA!</span>' : '<span style="color:red">PEGUE A CHAVE</span>'}
        `;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
    var zNear = -1.0
    var zFar = -200.0
    var fieldOfViewRadians = degToRad(60)
    var top = Math.abs(zNear) * Math.tan(fieldOfViewRadians * 0.5)
    var bottom = -top
    var right = top * aspect
    var left = -right
    var projectionMatrix = window.m4.setPerspectiveProjectionMatrix(left, right, bottom, top, zNear, zFar)

    var camHeight = zoom * 0.8
    var camRadius = zoom
    var camX = Math.sin(cameraAngle) * camRadius
    var camZ = Math.cos(cameraAngle) * camRadius

    var viewMatrix = window.m4.setViewingMatrix([camX, camHeight, camZ], [0, 0, 0], [0, 1, 0])
    var viewInverseMatrix = window.m4.inverse(viewMatrix)
    var viewProjectionMatrix = window.m4.multiply(projectionMatrix, viewMatrix)

    gl.uniform3fv(loc.lightPositions, lightPositions)
    gl.uniform3fv(loc.lightColors, lightColors)
    gl.uniform3fv(loc.ambientLight, [0.2, 0.2, 0.2])
    gl.uniform1f(loc.shininess, 30.0)
    gl.uniformMatrix4fv(loc.viewInverse, false, viewInverseMatrix)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos)
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc.position)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.norm)
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc.normal)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tex)
    gl.vertexAttribPointer(loc.texcoord, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc.texcoord)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ind)

    // CHÃO
    var floorM = window.m4.identity()
    floorM = window.m4.translate(floorM, 0, -0.5, 0)
    floorM = window.m4.scale(floorM, mapSize, 1, mapSize)
    var floorWVP = window.m4.multiply(viewProjectionMatrix, floorM)
    gl.uniformMatrix4fv(loc.worldViewProjection, false, floorWVP)
    gl.uniformMatrix4fv(loc.world, false, floorM)
    gl.uniformMatrix4fv(loc.worldInverseTranspose, false, window.m4.transpose(window.m4.inverse(floorM)))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texTerrain)
    gl.uniform1i(loc.texture, 0)
    gl.uniform1i(loc.useTex, 1)
    gl.uniform1f(loc.textureScale, 21.0)
    gl.drawElements(gl.TRIANGLES, cubeData.indices.length, gl.UNSIGNED_SHORT, 0)

    // PAREDES E PORTA
    gl.uniform1f(loc.textureScale, 1.0)

    for (var row = 0; row < mapSize; row++) {
      for (var col = 0; col < mapSize; col++) {
        if (window.LevelMap[row][col] === 1) {
          var x = col - mapOffset + 0.5
          var z = row - mapOffset + 0.5
          var wallM = window.m4.identity()
          wallM = window.m4.translate(wallM, x, 0.5, z)
          var wallWVP = window.m4.multiply(viewProjectionMatrix, wallM)
          gl.uniformMatrix4fv(loc.worldViewProjection, false, wallWVP)
          gl.uniformMatrix4fv(loc.world, false, wallM)
          gl.uniformMatrix4fv(loc.worldInverseTranspose, false, window.m4.transpose(window.m4.inverse(wallM)))

          if (row === doorData.row && col === doorData.col) {
              gl.bindTexture(gl.TEXTURE_2D, texWall);
              gl.drawElements(gl.TRIANGLES, cubeData.indices.length, gl.UNSIGNED_SHORT, 0);

              gl.enable(gl.POLYGON_OFFSET_FILL);
              gl.polygonOffset(-1.0, -1.0);
              gl.bindTexture(gl.TEXTURE_2D, texDoor);
              gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, doorData.offsetBytes);
              gl.disable(gl.POLYGON_OFFSET_FILL);

          } else {
              gl.bindTexture(gl.TEXTURE_2D, texWall);
              gl.drawElements(gl.TRIANGLES, cubeData.indices.length, gl.UNSIGNED_SHORT, 0);
          }
        }
      }
    }

    // CHAVE
    if (keyData.active) {
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.pos);
        gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.norm);
        gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.tex);
        gl.vertexAttribPointer(loc.texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.ind);

        gl.uniform1i(loc.useTex, 0)
        gl.uniform4fv(loc.color, [1.0, 0.84, 0.0, 1.0])

        var keyM = window.m4.identity()
        keyM = window.m4.translate(keyM, keyData.x, 0.5, keyData.z)
        var keyWVP = window.m4.multiply(viewProjectionMatrix, keyM)
        gl.uniformMatrix4fv(loc.worldViewProjection, false, keyWVP)
        gl.uniformMatrix4fv(loc.world, false, keyM)
        gl.uniformMatrix4fv(loc.worldInverseTranspose, false, window.m4.transpose(window.m4.inverse(keyM)))
        gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0)
    }

    // PERSONAGEM
    gl.bindBuffer(gl.ARRAY_BUFFER, window.Character.bufferInfo.pos)
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, window.Character.bufferInfo.norm)
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0)
    gl.disableVertexAttribArray(loc.texcoord)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.Character.bufferInfo.ind)

    gl.uniform1i(loc.useTex, 0)
    gl.uniform4fv(loc.color, [0.0, 1.0, 1.0, 1.0])

    var charM = window.m4.identity()
    charM = window.m4.scale(charM, 0.8, 0.8, 0.8)
    charM = window.m4.translate(charM, charX, 0.5, charZ)
    var charWVP = window.m4.multiply(viewProjectionMatrix, charM)

    gl.uniformMatrix4fv(loc.worldViewProjection, false, charWVP)
    gl.uniformMatrix4fv(loc.world, false, charM)
    gl.uniformMatrix4fv(loc.worldInverseTranspose, false, window.m4.transpose(window.m4.inverse(charM)))
    gl.drawElements(gl.TRIANGLES, window.Character.bufferInfo.count, gl.UNSIGNED_SHORT, 0)
    gl.enableVertexAttribArray(loc.texcoord)

    requestAnimationFrame(drawScene)
  }
}
window.addEventListener("load", main)