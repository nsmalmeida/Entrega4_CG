// character.js
var Character = {
  bufferInfo: null,

  init: function (gl) {
    function setCubeVertices(v) {
      return new Float32Array([
        // Frente
        -v, -v,  v,   v, -v,  v,   v,  v,  v,  -v,  v,  v,
        // Trás
        -v, -v, -v,  -v,  v, -v,   v,  v, -v,   v, -v, -v,
        // Topo
        -v,  v, -v,  -v,  v,  v,   v,  v,  v,   v,  v, -v,
        // Fundo
        -v, -v, -v,   v, -v, -v,   v, -v,  v,  -v, -v,  v,
        // Direita
         v, -v, -v,   v,  v, -v,   v,  v,  v,   v, -v,  v,
        // Esquerda
        -v, -v, -v,  -v, -v,  v,  -v,  v,  v,  -v,  v, -v,
      ]);
    }

    function setCubeNormals() {
      return new Float32Array([
        // Frente
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // Trás
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Topo
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // Fundo
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // Direita
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // Esquerda
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      ]);
    }

    function setCubeIndices() {
      return new Uint16Array([
        0, 1, 2,      0, 2, 3,    // Frente
        4, 5, 6,      4, 6, 7,    // Trás
        8, 9, 10,     8, 10, 11,  // Topo
        12, 13, 14,   12, 14, 15, // Fundo
        16, 17, 18,   16, 18, 19, // Direita
        20, 21, 22,   20, 22, 23  // Esquerda
      ]);
    }

    //
    const arrays = {
      position: setCubeVertices(0.5), // Gera o cubo com tamanho 0.5
      normal: setCubeNormals(),
      indices: setCubeIndices(),
    }

    this.bufferInfo = {
      pos: gl.createBuffer(),
      norm: gl.createBuffer(),
      ind: gl.createBuffer(),
      count: arrays.indices.length,
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.pos)
    gl.bufferData(gl.ARRAY_BUFFER, arrays.position, gl.STATIC_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.norm)
    gl.bufferData(gl.ARRAY_BUFFER, arrays.normal, gl.STATIC_DRAW)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferInfo.ind)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrays.indices, gl.STATIC_DRAW)
  },

  draw: function (gl, loc, m4, x, z) {
    if (!this.bufferInfo) return

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.pos)
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc.position)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.norm)
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc.normal)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferInfo.ind)

    gl.uniform1i(loc.useTex, 0)
    gl.uniform4fv(loc.color, [0.0, 0.8, 1.0, 1.0]) // Cor Ciano do personagem

    // Matriz de transformação
    let matrix = m4.identity()
    matrix = m4.translate(matrix, x, 0.5, z) // Move
    matrix = m4.scale(matrix, 0.8, 0.8, 0.8) // Escala (Personagem é um pouco menor que o bloco)

    // Envia as matrizes separadas conforme o padrão do seu main.js atual
    gl.uniformMatrix4fv(loc.modelViewMatrix, false, matrix)
    gl.uniformMatrix4fv(loc.inverseTransposeModelViewMatrix, false, m4.transpose(m4.inverse(matrix)))

    gl.drawElements(gl.TRIANGLES, this.bufferInfo.count, gl.UNSIGNED_SHORT, 0)
  },
}