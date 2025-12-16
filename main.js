// main.js - Versão Estética Final

// ... (MANTENHA OS SHADERS, createShader, createProgram, etc., IGUAIS AO ANTERIOR) ...
// ... (Copie do seu arquivo original as variáveis shader e funções auxiliares até "ESTADO DO JOGO") ...

let vertexShaderSource = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;

  uniform mat4 u_projectionMatrix;
  uniform mat4 u_viewingMatrix;
  uniform mat4 u_modelViewMatrix; 
  uniform mat4 u_inverseTransposeModelViewMatrix;
  
  uniform float u_textureScale;
  varying vec3 v_normal;
  varying vec3 v_surfaceWorldPosition;
  varying vec2 v_texcoord;

  void main() {
    // 1. Posiciona o vértice na tela (Projeção * Câmera * Objeto * Posição Original)
    gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
    // 2. Calcula a NORMAL correta no mundo
    v_normal = mat3(u_inverseTransposeModelViewMatrix) * a_normal;
    //3. Calcula onde esse ponto está no mundo 3D (para saber a distância da luz depois)
    v_surfaceWorldPosition = (u_modelViewMatrix * vec4(a_position, 1.0)).xyz;
    // 4. Passa a coordenada da textura
    v_texcoord = a_texcoord * u_textureScale;
  }
`

let fragmentShaderSource = `
  precision mediump float;

  varying vec3 v_normal;
  varying vec3 v_surfaceWorldPosition;
  varying vec2 v_texcoord;

  uniform sampler2D u_texture;
  uniform int u_useTexture;
  uniform vec4 u_color;

  uniform vec3 u_lightPositions[4];
  uniform vec3 u_lightColors[4];
  uniform vec3 u_ambientLight;
  uniform float u_shininess;
  uniform vec3 u_viewPosition;

  void main() {
    // Normalizamos os vetores porque a interpolação pode alterar o tamanho deles
    vec3 normal = normalize(v_normal);
    vec3 surfaceToViewDirection = normalize(u_viewPosition - v_surfaceWorldPosition);

    // ... (Pega a cor base da textura ou cor sólida) ...
    vec4 baseColor;
    if (u_useTexture == 1) {
        baseColor = texture2D(u_texture, v_texcoord);
    } else {
        baseColor = u_color;
    }

    // Começa com a luz ambiente
    vec3 totalLight = u_ambientLight; 

    // Loop para calcular as 4 luzes
    for (int i = 0; i < 4; i++) {
      // TRUQUE DO BLINN-PHONG: Half Vector (Vetor Metade)
      vec3 surfaceToLightDirection = normalize(u_lightPositions[i] - v_surfaceWorldPosition);
      vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

      // CÁLCULO DIFUSO (Lambert)
      float light = dot(normal, surfaceToLightDirection);
      float diffuse = max(light, 0.0);

      // CÁLCULO ESPECULAR (Brilho)
      float specular = 0.0;
      if (light > 0.0) {
        specular = pow(max(dot(normal, halfVector), 0.0), u_shininess);
      }

      totalLight += (diffuse * u_lightColors[i]);
      totalLight += (specular * u_lightColors[i]);
    }

    gl_FragColor = vec4(baseColor.rgb * totalLight, baseColor.a);
  }
`

function createShader(gl, type, source) {
  let shader = gl.createShader(type)
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
  let vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
  let fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  let program = gl.createProgram()
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
  return (value & (value - 1)) === 0
}

function loadTexture(gl, url) {
  let texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([128, 128, 128, 255])
  )

  let image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      )
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }
  }
  return texture
}
//prettier-ignore
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
//prettier-ignore
function setCubeNormals() {
  // 4 vértices, 6 lados
  return new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);
}
//prettier-ignore
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
//prettier-ignore
function setCubeIndices() {
  return new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 
    12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23  
  ]);
}
function createCubeData() {
  return {
    positions: setCubeVertices(0.5),
    normals: setCubeNormals(),
    texcoords: setCubeTexcoords(),
    indices: setCubeIndices(),
  }
}

function createSphereData(radius, latitudeBands, longitudeBands) {
  let positions = [],
    normals = [],
    texcoords = [],
    indices = []
  // Percorre de cima (Polo Norte) para baixo (Polo Sul)
  for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
    let theta = (latNumber * Math.PI) / latitudeBands
    let sinTheta = Math.sin(theta)
    let cosTheta = Math.cos(theta)
    // Percorre ao redor da esfera (360 graus).
    for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
      let phi = (longNumber * 2 * Math.PI) / longitudeBands
      let sinPhi = Math.sin(phi)
      let cosPhi = Math.cos(phi)
      let x = cosPhi * sinTheta
      let y = cosTheta
      let z = sinPhi * sinTheta
      // Cálculo da Textura (UV):
      let u = 1 - longNumber / longitudeBands
      let v = 1 - latNumber / latitudeBands
      normals.push(x, y, z)
      texcoords.push(u, v)
      positions.push(radius * x, radius * y, radius * z)
    }
  }
  // Loop dos Índices (Costurando os Triângulos)
  for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
    for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
      let first = latNumber * (longitudeBands + 1) + longNumber
      let second = first + longitudeBands + 1
      indices.push(first, second, first + 1, second, second + 1, first + 1)
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    texcoords: new Float32Array(texcoords),
    indices: new Uint16Array(indices),
  }
}

// --- ESTADO DO JOGO ---
// Character/Personagem
let charX = 0,
  charZ = 0,
  charSpeed = 0.03
// Onde o mouse estava no framer anterior
let keysPressed = {},
  isDragging = false,
  lastMouseX = 0
// A distância da câmera em relação ao centro (raio da órbita)
let cameraAngle = 0,
  zoom = 30.0
// O tamanho da matriz do labirinto (21x21 blocos; valor calculado para centralizar o mapa na origem;
let mapSize = 21,
  blockSize = 1.0,
  mapOffset = (mapSize * blockSize) / 2

let scores = []
let startTime = Date.now()
let scorePenalty = 0

// Referências para os novos elementos da UI
let elScore = document.getElementById('score-val')
let elTimer = document.getElementById('timer-val')
let elMsg = document.getElementById('game-msg')

// Guarda onde a chave está (x, z) e se ela ainda está lá (active: true) ou se já foi pega (active: false)
let keyData = { x: 0, z: 0, active: true }
// Guarda onde a porta foi criada
// offsetBytes: Diz ao WebGL onde na memória começa o desenho da face da porta para aplicar a textura de madeira só nela
let doorData = { row: -1, col: -1, faceIndex: -1, offsetBytes: 0 }

function degToRad(d) {
  return (d * Math.PI) / 180
}

function main() {
  let canvas = document.querySelector('#glCanvas')
  let gl = canvas.getContext('webgl', { alpha: true }) // Habilita transparência no contexto
  if (!gl) {
    console.error('WebGL não suportado')
    return
  }

  let program = createProgram(gl, vertexShaderSource, fragmentShaderSource)

  let loc = {
    position: gl.getAttribLocation(program, 'a_position'),
    normal: gl.getAttribLocation(program, 'a_normal'),
    texcoord: gl.getAttribLocation(program, 'a_texcoord'),
    projectionMatrix: gl.getUniformLocation(program, 'u_projectionMatrix'),
    viewingMatrix: gl.getUniformLocation(program, 'u_viewingMatrix'),
    modelViewMatrix: gl.getUniformLocation(program, 'u_modelViewMatrix'),
    inverseTransposeModelViewMatrix: gl.getUniformLocation(program,'u_inverseTransposeModelViewMatrix'),
    viewPosition: gl.getUniformLocation(program, 'u_viewPosition'),
    lightPositions: gl.getUniformLocation(program, 'u_lightPositions'),
    lightColors: gl.getUniformLocation(program, 'u_lightColors'),
    ambientLight: gl.getUniformLocation(program, 'u_ambientLight'),
    shininess: gl.getUniformLocation(program, 'u_shininess'),
    texture: gl.getUniformLocation(program, 'u_texture'),
    useTex: gl.getUniformLocation(program, 'u_useTexture'),
    color: gl.getUniformLocation(program, 'u_color'),
    textureScale: gl.getUniformLocation(program, 'u_textureScale'),
  }

  // --- BUFFERS GERAIS ---
  let cubeData = createCubeData()
  let buffers = {
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

  let sphereGeo = createSphereData(0.15, 20, 20)
  let sphereBuffers = {
    pos: gl.createBuffer(),
    norm: gl.createBuffer(),
    tex: gl.createBuffer(),
    ind: gl.createBuffer(),
    count: sphereGeo.indices.length,
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.pos)
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.positions, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.norm)
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.normals, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.tex)
  gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.texcoords, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.ind)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereGeo.indices, gl.STATIC_DRAW)

  Character = Character || {}
  Character.init(gl)

  if (window.Ghost) {
    window.Ghost.init(gl)
  } else {
    console.error('ghost.js não carregado!')
  }

  let texTerrain = loadTexture(gl, './ground.png')
  let texWall = loadTexture(gl, './wall.png')
  let texDoor = loadTexture(gl, './door.png')

  let lightPositions = new Float32Array([
    15.0, 10.0, 0.0, -15.0, 10.0, 0.0, 0.0, 10.0, 15.0, 0.0, 10.0, -15.0,
  ])
  let lightColors = new Float32Array([
    0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.1, 0.1, 0.6,
  ])

  // Ela serve para "mapear" onde é chão e onde é parede. Retorna uma matriz de objetos que definem chao.
  function getEmptySpots() {
    let emptySpots = []
    for (let r = 0; r < mapSize; r++) {
      for (let c = 0; c < mapSize; c++) {
        if (LevelMap[r][c] === 0) {
          emptySpots.push({ row: r, col: c })
        }
      }
    }
    return emptySpots
  }

  let emptySpots = getEmptySpots()

  // Esta função escolhe um lugar aleatório livre no labirinto para colocar a chave.
  function spawnKey() {
    if (emptySpots.length > 0) {
      let randIndex = Math.floor(Math.random() * emptySpots.length)
      let spot = emptySpots[randIndex]
      keyData.x = spot.col - mapOffset + 0.5
      keyData.z = spot.row - mapOffset + 0.5
      keyData.active = true
    }
  }

  // Esta função escolhe uma parede aleatório com uma lateral livre no labirinto para colocar a textura da porta.
  function spawnDoor() {
    let candidates = []
    for (let r = 1; r < mapSize - 1; r++) {
      for (let c = 1; c < mapSize - 1; c++) {
        if (window.LevelMap[r][c] === 1) {
          if (window.LevelMap[r - 1][c] === 0)
            candidates.push({ r: r, c: c, face: 'Back', offsetBytes: 12 })
          else if (window.LevelMap[r + 1][c] === 0)
            candidates.push({ r: r, c: c, face: 'Front', offsetBytes: 0 })
          else if (window.LevelMap[r][c - 1] === 0)
            candidates.push({ r: r, c: c, face: 'Left', offsetBytes: 60 })
          else if (window.LevelMap[r][c + 1] === 0)
            candidates.push({ r: r, c: c, face: 'Right', offsetBytes: 48 })
        }
      }
    }
    if (candidates.length > 0) {
      let chosen = candidates[Math.floor(Math.random() * candidates.length)]
      doorData.row = chosen.r
      doorData.col = chosen.c
      doorData.offsetBytes = chosen.offsetBytes
    }
  }

  // Reinicia a Rodada
  function resetMatch(fullReset = true) {
    charX = 0
    charZ = 0
    spawnKey()
    spawnDoor()
    if (Ghost) Ghost.spawn()
    startTime = Date.now()
    if (fullReset) scorePenalty = 0
    console.log('Nova rodada iniciada!')
  }

  resetMatch(true)

  // Detecta quando uma tecla é pressionada.
  window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true
  })
  // Detecta quando uma tecla é solta.
  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false
  })
  // Detecta quando o botão do mouse é clicado em cima do jogo (canvas).
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true
    lastMouseX = e.clientX
  })
  // Detecta quando o botão do mouse é solto (em qualquer lugar da tela).
  window.addEventListener('mouseup', () => {
    isDragging = false
  })
  // Detecta o movimento do cursor do mouse.
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    cameraAngle += (e.clientX - lastMouseX) * 0.01
    lastMouseX = e.clientX
  })
  // Detecta a rolagem da roda do mouse (scroll)
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      zoom += e.deltaY * 0.02
      zoom = Math.max(5.0, Math.min(60.0, zoom))
    },
    { passive: false }
  )

  // Função para impedir que o personagem atravesse paredes e verificar se o jogador ganhou o jogo.
  // Retorna true se houve colisão.
  function checkCollision(x, z) {
    let col = Math.floor(x + mapOffset)
    let row = Math.floor(z + mapOffset)
    // Verifica se o personagem está tentando sair do tabuleiro
    if (row < 0 || row >= mapSize || col < 0 || col >= mapSize) {
      return true
    }

    if (LevelMap[row][col] === 1) {
      // Verifica se o jogador encostou na porta
      if (row === doorData.row && col === doorData.col) {
        if (!keyData.active) {
          // GANHOU
          let endTime = Date.now()
          let durationSeconds = (endTime - startTime) / 1000
          let basePoints = 10 - Math.floor(durationSeconds / 4.0)
          let finalPoints =
            basePoints - scorePenalty < 0 ? 0 : basePoints - scorePenalty
          scores.push(finalPoints)
          console.log('GANHOU! Pontos: ' + finalPoints)
          resetMatch(true)
        } else {
          console.log('Porta trancada!')
        }
      }
      return true
    }
    return false
  }

  function updateCharacter() {
    let nextX = charX,
      nextZ = charZ,
      r = 0.35 // Raio de Colisao
    if (keysPressed['w'] || keysPressed['arrowup']) nextZ -= charSpeed
    if (keysPressed['s'] || keysPressed['arrowdown']) nextZ += charSpeed
    if (keysPressed['a'] || keysPressed['arrowleft']) nextX -= charSpeed
    if (keysPressed['d'] || keysPressed['arrowright']) nextX += charSpeed

    // Testa 4 pontos ao redor do centro do personagem
    if (
      !checkCollision(nextX - r, charZ - r) &&
      !checkCollision(nextX + r, charZ - r) &&
      !checkCollision(nextX - r, charZ + r) &&
      !checkCollision(nextX + r, charZ + r)
    ) {
      charX = nextX
    }
    if (
      !checkCollision(charX - r, nextZ - r) &&
      !checkCollision(charX + r, nextZ - r) &&
      !checkCollision(charX - r, nextZ + r) &&
      !checkCollision(charX + r, nextZ + r)
    ) {
      charZ = nextZ
    }

    // Calcula a distância entre o personagem e a chave
    if (keyData.active) {
      let dist = Math.sqrt(
        Math.pow(charX - keyData.x, 2) + Math.pow(charZ - keyData.z, 2)
      )
      if (dist < 0.5) keyData.active = false
    }
  }

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  // 1. ALTERAÇÃO IMPORTANTE: CLEAR COLOR TRANSPARENTE
  // R, G, B, Alpha (0.0 = transparente)
  gl.clearColor(0.0, 0.0, 0.0, 0.0)

  gl.useProgram(program)

  requestAnimationFrame(drawScene)

  function drawScene() {
    updateCharacter()

    if (window.Ghost) {
      let hit = window.Ghost.update(charX, charZ)
      if (hit) {
        console.log('FANTASMA PEGOU! -5 Pontos')
        scorePenalty += 5
        resetMatch(false)
      }
    }

    // 2. ATUALIZAÇÃO DA NOVA UI COM OS IDs CORRETOS
    let elapsed = (Date.now() - startTime) / 1000

    // Recuperar elementos caso a variavel global tenha perdido referencia
    elScore = document.getElementById('score-val')
    elTimer = document.getElementById('timer-val')
    elMsg = document.getElementById('game-msg')

    // Calcula pontuação total acumulada
    let totalScore = scores.reduce((a, b) => a + b, 0)

    if (elScore) elScore.innerText = totalScore
    if (elTimer) elTimer.innerText = elapsed.toFixed(1)

    if (elMsg) {
      if (!keyData.active) {
        elMsg.innerHTML =
          '<span style="color:#4caf50">CHAVE COLETADA! ACHE A PORTA!</span>'
      } else {
        elMsg.innerHTML = '<span style="color:#ff5722">ENCONTRE A CHAVE!</span>'
      }
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
    let zNear = -1.0,
      zFar = -200.0
    let fieldOfViewRadians = degToRad(60)
    let top = Math.abs(zNear) * Math.tan(fieldOfViewRadians * 0.5)
    let bottom = -top,
      right = top * aspect,
      left = -right

    let projectionMatrix = window.m4.setPerspectiveProjectionMatrix(
      left,
      right,
      bottom,
      top,
      zNear,
      zFar
    )

    let camHeight = zoom * 0.8,
      camRadius = zoom
    let camX = Math.sin(cameraAngle) * camRadius,
      camZ = Math.cos(cameraAngle) * camRadius
    let viewMatrix = window.m4.setViewingMatrix(
      [camX, camHeight, camZ],
      [0, 0, 0],
      [0, 1, 0]
    )

    gl.uniform3fv(loc.lightPositions, lightPositions)
    gl.uniform3fv(loc.lightColors, lightColors)
    gl.uniform3fv(loc.ambientLight, [0.2, 0.2, 0.2])
    gl.uniform1f(loc.shininess, 30.0)
    gl.uniform3fv(loc.viewPosition, [camX, camHeight, camZ])

    gl.uniformMatrix4fv(loc.projectionMatrix, false, projectionMatrix)
    gl.uniformMatrix4fv(loc.viewingMatrix, false, viewMatrix)

    // --- DRAW CHÃO ---
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

    let floorM = window.m4.identity()
    floorM = window.m4.translate(floorM, 0, -0.5, 0)
    floorM = window.m4.scale(floorM, mapSize, 1, mapSize)
    gl.uniformMatrix4fv(loc.modelViewMatrix, false, floorM)
    gl.uniformMatrix4fv(
      loc.inverseTransposeModelViewMatrix,
      false,
      window.m4.transpose(window.m4.inverse(floorM))
    )
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texTerrain)
    gl.uniform1i(loc.texture, 0)
    gl.uniform1i(loc.useTex, 1)
    gl.uniform1f(loc.textureScale, 21.0)
    gl.drawElements(gl.TRIANGLES, cubeData.indices.length, gl.UNSIGNED_SHORT, 0)

    // --- DRAW PAREDES ---
    gl.uniform1f(loc.textureScale, 1.0)
    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        if (window.LevelMap[row][col] === 1) {
          let x = col - mapOffset + 0.5,
            z = row - mapOffset + 0.5
          let wallM = window.m4.identity()
          wallM = window.m4.translate(wallM, x, 0.5, z)
          gl.uniformMatrix4fv(loc.modelViewMatrix, false, wallM)
          gl.uniformMatrix4fv(
            loc.inverseTransposeModelViewMatrix,
            false,
            window.m4.transpose(window.m4.inverse(wallM))
          )

          if (row === doorData.row && col === doorData.col) {
            gl.bindTexture(gl.TEXTURE_2D, texWall)
            gl.drawElements(
              gl.TRIANGLES,
              cubeData.indices.length,
              gl.UNSIGNED_SHORT,
              0
            )
            gl.enable(gl.POLYGON_OFFSET_FILL)
            gl.polygonOffset(-1.0, -1.0)
            gl.bindTexture(gl.TEXTURE_2D, texDoor)
            gl.drawElements(
              gl.TRIANGLES,
              6,
              gl.UNSIGNED_SHORT,
              doorData.offsetBytes
            )
            gl.disable(gl.POLYGON_OFFSET_FILL)
          } else {
            gl.bindTexture(gl.TEXTURE_2D, texWall)
            gl.drawElements(
              gl.TRIANGLES,
              cubeData.indices.length,
              gl.UNSIGNED_SHORT,
              0
            )
          }
        }
      }
    }

    // --- DRAW CHAVE ---
    if (keyData.active) {
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.pos)
      gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.norm)
      gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffers.tex)
      gl.vertexAttribPointer(loc.texcoord, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.ind)
      gl.uniform1i(loc.useTex, 0)
      gl.uniform4fv(loc.color, [1.0, 0.84, 0.0, 1.0])
      let keyM = window.m4.identity()
      keyM = window.m4.translate(keyM, keyData.x, 0.5, keyData.z)
      gl.uniformMatrix4fv(loc.modelViewMatrix, false, keyM)
      gl.uniformMatrix4fv(
        loc.inverseTransposeModelViewMatrix,
        false,
        window.m4.transpose(window.m4.inverse(keyM))
      )
      gl.drawElements(gl.TRIANGLES, sphereBuffers.count, gl.UNSIGNED_SHORT, 0)
    }

    // --- DRAW FANTASMAS ---
    if (window.Ghost) {
      gl.disable(gl.CULL_FACE)
      window.Ghost.draw(gl, loc, window.m4)
      gl.enable(gl.CULL_FACE)
    }

    // --- DRAW PERSONAGEM ---
    gl.bindBuffer(gl.ARRAY_BUFFER, window.Character.bufferInfo.pos)
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, window.Character.bufferInfo.norm)
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.Character.bufferInfo.ind)
    gl.uniform1i(loc.useTex, 0)
    gl.uniform4fv(loc.color, [0.0, 1.0, 1.0, 1.0])
    let charM = window.m4.identity()
    charM = window.m4.scale(charM, 0.8, 0.8, 0.8)
    charM = window.m4.translate(charM, charX, 0.5, charZ)
    gl.uniformMatrix4fv(loc.modelViewMatrix, false, charM)
    gl.uniformMatrix4fv(
      loc.inverseTransposeModelViewMatrix,
      false,
      window.m4.transpose(window.m4.inverse(charM))
    )
    gl.drawElements(
      gl.TRIANGLES,
      window.Character.bufferInfo.count,
      gl.UNSIGNED_SHORT,
      0
    )

    gl.enableVertexAttribArray(loc.texcoord)
    requestAnimationFrame(drawScene)
  }
}
window.addEventListener('load', main)
