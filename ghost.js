// ghost.js
var Ghost = {
    bufferInfo: null,
    instances: [],
    indexCount: 0,
    
    // Configurações do Mapa (precisam bater com main.js)
    mapSize: 21,
    blockSize: 1.0,
    get mapOffset() { return (this.mapSize * this.blockSize) / 2; },

    init: function(gl) {
        // --- GEOMETRIA (Cilindro + Semiesfera) ---
        function createGhostGeometry() {
            function createCirclePoints(segments) {
                const pts = [];
                for (let i=0; i<segments; i++){
                    const a = (i/segments) * Math.PI*2;
                    pts.push([Math.cos(a), Math.sin(a)]);
                }
                return pts;
            }

            function makeCylinder(r, y0, y1, segments) {
                const positions = []; const normals = []; const indices = [];
                const circle = createCirclePoints(segments);
                // Laterais
                for (let i=0; i<segments; i++){
                    const nx = circle[i][0], nz = circle[i][1];
                    positions.push(nx*r, y1, nz*r); normals.push(nx,0,nz); 
                    positions.push(nx*r, y0, nz*r); normals.push(nx,0,nz); 
                }
                // Indices Laterais
                for (let i=0; i<segments; i++){
                    const i0 = i*2, i1 = i*2+1, i2 = ((i+1)%segments)*2, i3 = ((i+1)%segments)*2+1;
                    indices.push(i0, i1, i2, i2, i1, i3);
                }
                return { positions, normals, indices };
            }

            function makeHemisphere(r, yCenter, latSegments, lonSegments) {
                const positions = []; const normals = []; const indices = [];
                for (let lat=0; lat<=latSegments; lat++){
                    const v = lat / latSegments;
                    const theta = v * (Math.PI/2); 
                    const sinT = Math.sin(theta), cosT = Math.cos(theta);
                    for (let lon=0; lon<=lonSegments; lon++){
                        const u = lon / lonSegments;
                        const phi = u * (Math.PI*2);
                        const x = Math.cos(phi) * cosT;
                        const y = Math.sin(theta); 
                        const z = Math.sin(phi) * cosT;
                        positions.push(x*r, yCenter + y*r, z*r);
                        normals.push(x, y, z);
                    }
                }
                for (let lat=0; lat<latSegments; lat++){
                    for (let lon=0; lon<lonSegments; lon++){
                        const a = lat * (lonSegments+1) + lon;
                        const b = a + (lonSegments+1);
                        indices.push(a, b, a+1, a+1, b, b+1);
                    }
                }
                return { positions, normals, indices };
            }

            // Cria as partes (Raio 0.4 = Diametro 0.8)
            const cyl = makeCylinder(0.4, 0.0, 1.0, 20);
            const hem = makeHemisphere(0.4, 1.0, 10, 20);

            // Merge manual
            const positions = new Float32Array([...cyl.positions, ...hem.positions]);
            const normals = new Float32Array([...cyl.normals, ...hem.normals]);
            
            // Ajusta indices do hemisferio
            const offset = cyl.positions.length / 3;
            const hemIndices = hem.indices.map(i => i + offset);
            const indices = new Uint16Array([...cyl.indices, ...hemIndices]);
            
            return { positions, normals, indices };
        }

        const geo = createGhostGeometry();
        this.indexCount = geo.indices.length;

        this.bufferInfo = {
            pos: gl.createBuffer(),
            norm: gl.createBuffer(),
            ind: gl.createBuffer()
        };

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.pos);
        gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.norm);
        gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferInfo.ind);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
    },

    spawn: function() {
        this.instances = [];
        // Posições fixas na matriz: [1][1], [19][1], [1][19], [19][19]
        // (Linha, Coluna)
        const fixedSpawns = [
            { r: 1, c: 1 },
            { r: 19, c: 1 },
            { r: 1, c: 19 },
            { r: 19, c: 19 }
        ];

        fixedSpawns.forEach(s => {
            this.instances.push({
                x: s.c - this.mapOffset + 0.5,
                z: s.r - this.mapOffset + 0.5,
                targetX: null,
                targetZ: null,
                speed: 0.02, // Velocidade
                color: [Math.random(), 0.2, 0.2, 1.0] // Cor avermelhada variada
            });
        });
    },

    // Retorna true se houver colisão com o personagem
    update: function(charX, charZ) {
        let collision = false;
        
        this.instances.forEach(g => {
            // IA: Movimento Aleatório
            // Se não tem alvo ou chegou perto do alvo
            if (g.targetX === null || (Math.abs(g.x - g.targetX) < 0.05 && Math.abs(g.z - g.targetZ) < 0.05)) {
                // Snap to grid (alinha perfeitamente)
                if(g.targetX !== null) { g.x = g.targetX; g.z = g.targetZ; }

                // Escolhe nova direção válida
                var directions = [ {x:0, z:1}, {x:0, z:-1}, {x:1, z:0}, {x:-1, z:0} ];
                var validMoves = [];
                
                var currCol = Math.floor(g.x + this.mapOffset);
                var currRow = Math.floor(g.z + this.mapOffset);

                directions.forEach(d => {
                    var r = currRow + d.z;
                    var c = currCol + d.x;
                    // Verifica se está dentro do mapa e se é caminho (0)
                    if (r>=0 && r<this.mapSize && c>=0 && c<this.mapSize && window.LevelMap[r][c] === 0) {
                        validMoves.push({x: g.x + d.x, z: g.z + d.z});
                    }
                });

                if(validMoves.length > 0) {
                    // Escolhe um vizinho aleatório
                    var move = validMoves[Math.floor(Math.random() * validMoves.length)];
                    g.targetX = move.x;
                    g.targetZ = move.z;
                } else {
                    // Preso? Fica parado
                    g.targetX = g.x; g.targetZ = g.z;
                }
            }

            // Move em direção ao alvo (Interpolação linear simples)
            var dx = g.targetX - g.x;
            var dz = g.targetZ - g.z;
            var dist = Math.sqrt(dx*dx + dz*dz);
            
            if(dist > 0) {
                g.x += (dx/dist) * g.speed;
                g.z += (dz/dist) * g.speed;
            }

            // Checagem de Colisão com Personagem
            var distToChar = Math.sqrt(Math.pow(g.x - charX, 2) + Math.pow(g.z - charZ, 2));
            if(distToChar < 0.6) { // 0.6 é uma margem segura (raio fantasma 0.4 + raio char ~0.2)
                collision = true;
            }
        });

        return collision;
    },

    draw: function(gl, loc, m4) {
        if (!this.bufferInfo) return;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.pos);
        gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(loc.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferInfo.norm);
        gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(loc.normal);

        gl.disableVertexAttribArray(loc.texcoord); // Fantasmas não têm textura
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferInfo.ind);
        
        gl.uniform1i(loc.useTex, 0);

        this.instances.forEach(g => {
            gl.uniform4fv(loc.color, g.color);
            
            var m = m4.identity();
            m = m4.translate(m, g.x, 0.0, g.z); // Altura 0, pois a geometria já começa em Y=0 e vai até Y=1.4
            
            gl.uniformMatrix4fv(loc.modelViewMatrix, false, m);
            gl.uniformMatrix4fv(loc.inverseTransposeModelViewMatrix, false, m4.transpose(m4.inverse(m)));
            
            gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
        });
    }
};