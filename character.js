// character.js
var Character = {
  bufferInfo: null,

  init: function (gl) {
    var arrays = {
      position: new Float32Array([
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
        -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
        -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
      ]),
      normal: new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        0,
      ]),
      indices: new Uint16Array([
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21,
        22, 20, 22, 23,
      ]),
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
    gl.uniform4fv(loc.color, [0.0, 0.8, 1.0, 1.0])

    // CORREÇÃO: Ordem das transformações
    var matrix = m4.identity()
    matrix = m4.scale(matrix, 0.8, 0.8, 0.8) // Primeiro escala
    matrix = m4.translate(matrix, x, 0.5, z) // Depois translada

    gl.uniformMatrix4fv(loc.world, false, matrix)
    gl.uniformMatrix4fv(loc.worldInverseTranspose, false, m4.transpose(m4.inverse(matrix)))

    gl.drawElements(gl.TRIANGLES, this.bufferInfo.count, gl.UNSIGNED_SHORT, 0)
  },
}
