export class MeshSyncer {
  constructor(device, assets) {
    this.device = device;
    this.assets = assets;
    this.dynamicMeshCache = new Map();
  }

  sync(world) {
    const views = world.query(["DynamicMesh"]);
    for (const view of views) {
      for (let i = 0; i < view.len; i++) {
        const entId = view.entities[i * 2];
        const version = world.getDynamicMeshVersion(entId);
        // Separate counter for vertex-attribute-only changes (e.g. a color
        // repaint) that don't move geometry -- see DynamicMesh::color_version
        // (engine/component.rs). Older wasm builds without the export just
        // read back 0 always, which degrades to "never triggers on its own",
        // not an error -- safe default for demos that don't use it.
        const colorVersion = world.getDynamicMeshColorVersion
          ? world.getDynamicMeshColorVersion(entId)
          : 0;

        let cached = this.dynamicMeshCache.get(entId);
        if (!cached) {
          cached = { version: -1, colorVersion: -1, meshId: -1 };
          this.dynamicMeshCache.set(entId, cached);
        }

        if (cached.version !== version || cached.colorVersion !== colorVersion) {
          const vertices = world.getDynamicMeshVertices(entId);
          const indices = world.getDynamicMeshIndices(entId);

          if (cached.meshId === -1) {
            cached.meshId = this.assets.createMesh(vertices, indices);
          } else {
            this.updateMeshBuffer(cached.meshId, vertices, indices);
          }
          cached.version = version;
          cached.colorVersion = colorVersion;
          world.wasm.wasm_set_mesh_handle(entId, cached.meshId);
        }
      }
    }
  }

  updateMeshBuffer(meshId, vertices, indices) {
    const mesh = this.assets.getMesh(meshId);
    if (!mesh) return;

    const vertexByteSize = vertices.byteLength;
    const indexByteSize = indices.byteLength;

    const vSize = mesh.vertexBuffer?.size || 0;
    const iSize = mesh.indexBuffer?.size || 0;

    if (vSize < vertexByteSize) {
      if (mesh.vertexBuffer) mesh.vertexBuffer.destroy();
      mesh.vertexBuffer = this.device.createBuffer({
        size: Math.max(vertexByteSize, vSize * 2 || 1024),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    }

    if (iSize < indexByteSize) {
      if (mesh.indexBuffer) mesh.indexBuffer.destroy();
      mesh.indexBuffer = this.device.createBuffer({
        size: Math.max(indexByteSize, iSize * 2 || 1024),
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
    }

    if (vertexByteSize > 0)
      this.device.queue.writeBuffer(mesh.vertexBuffer, 0, vertices);
    if (indexByteSize > 0)
      this.device.queue.writeBuffer(mesh.indexBuffer, 0, indices);
    mesh.indexCount = indices.length;
  }
}
