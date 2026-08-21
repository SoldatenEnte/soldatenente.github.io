export class AssetManager {
  constructor(device) {
    this.device = device;
    this.meshes = [];
    this.textures = [];
    this.samplers = [];

    const whiteTex = this.device.createTexture({
      size: [1, 1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: whiteTex },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4, rowsPerImage: 1 },
      [1, 1, 1],
    );
    this.textures.push(whiteTex);

    const defaultSampler = this.device.createSampler({
      magFilter: "nearest",
      minFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.samplers.push(defaultSampler);
  }
  createMesh(vertices, indices) {
    let writeVertices = vertices;
    if (vertices.byteLength % 4 !== 0) {
      const padded = new Uint8Array(Math.ceil(vertices.byteLength / 4) * 4);
      padded.set(new Uint8Array(vertices.buffer, vertices.byteOffset, vertices.byteLength));
      writeVertices = padded;
    }

    const vertexBuffer = this.device.createBuffer({
      size: writeVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, writeVertices);

    let writeIndices = indices;
    if (indices.byteLength % 4 !== 0) {
      const padded = new Uint8Array(Math.ceil(indices.byteLength / 4) * 4);
      padded.set(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength));
      writeIndices = padded;
    }

    const indexBuffer = this.device.createBuffer({
      size: writeIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(indexBuffer, 0, writeIndices);

    const id = this.meshes.length;
    this.meshes.push({ vertexBuffer, indexBuffer, indexCount: indices.length });
    return id;
  }
  createDataTexture(width, height, data) {
    const texture = this.device.createTexture({
      size: [width, height, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    const bytesPerPixel = 4;
    const unalignedBytesPerRow = width * bytesPerPixel;
    const alignedBytesPerRow = Math.ceil(unalignedBytesPerRow / 256) * 256;
    if (height > 1 && unalignedBytesPerRow !== alignedBytesPerRow) {
      const paddedData = new Uint8Array(alignedBytesPerRow * height);
      for (let y = 0; y < height; y++) {
        const srcOffset = y * unalignedBytesPerRow;
        const dstOffset = y * alignedBytesPerRow;
        paddedData.set(
          data.subarray(srcOffset, srcOffset + unalignedBytesPerRow),
          dstOffset,
        );
      }
      this.device.queue.writeTexture(
        { texture },
        paddedData,
        { bytesPerRow: alignedBytesPerRow, rowsPerImage: height },
        [width, height, 1],
      );
    } else {
      this.device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: unalignedBytesPerRow, rowsPerImage: height },
        [width, height, 1],
      );
    }
    const id = this.textures.length;
    this.textures.push(texture);
    return id;
  }
  async loadTexture(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const texture = this.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: texture },
      [bitmap.width, bitmap.height],
    );

    const id = this.textures.length;
    this.textures.push(texture);
    return id;
  }
  getMesh(id) {
    return this.meshes[id];
  }
  getTexture(id) {
    return this.textures[id] || this.textures[0];
  }
  getSampler(id) {
    return this.samplers[id] || this.samplers[0];
  }
}