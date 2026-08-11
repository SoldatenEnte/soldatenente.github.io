export class EntityBuilder {
  constructor(world, id) {
    this.world = world;
    this.id = id;
  }
  add(name, data = null) {
    const schema = this.world.schemas[name];
    if (!schema) return this;
    this.world.wasm.wasm_add_component(this.id, name);
    if (data && Object.keys(data).length > 0 && schema.elements > 0) {
      const ptr = this.world.wasm.get_component_ptr(this.id, name);
      if (ptr !== 0) {
        const arr = new Float32Array(
          this.world.memory.buffer,
          ptr,
          schema.elements,
        );
        if (Array.isArray(data)) {
          for (let i = 0; i < data.length && i < schema.elements; i++)
            arr[i] = data[i];
        } else {
          const fields = this.world.componentFields[name] || [];
          Object.entries(data).forEach(([key, val]) => {
            const idx = fields.indexOf(key);
            if (idx !== -1) arr[idx] = val;
          });
        }
      }
    }
    return this;
  }
}

export class ArtisanWorld {
  constructor(wasmEngine, wasmMemory) {
    this.wasm = wasmEngine;
    this.memory = wasmMemory;
    this.queryCache = new Map();
    this.archetypeMeta = new Map();
    this.schemas = {};
    this.componentFields = {};
    this.refreshSchemas();
  }

  saveWorld() { return this.wasm.wasm_save_world(); }
  loadWorld(json) { this.wasm.wasm_load_world(json); }

  getTileMapData(entityId) { return this.wasm.wasm_get_tilemap_data(entityId); }
  getInventory(entityId) { return this.wasm.wasm_get_inventory(entityId); }
  getDynamicMeshVertices(entityId) { return this.wasm.wasm_get_dynamic_mesh_vertices(entityId); }
  getDynamicMeshIndices(entityId) { return this.wasm.wasm_get_dynamic_mesh_indices(entityId); }
  getDynamicMeshVersion(entityId) { return this.wasm.wasm_get_dynamic_mesh_version(entityId); }
  getDynamicMeshColorVersion(entityId) { return this.wasm.wasm_get_dynamic_mesh_color_version(entityId); }
  get_component_ptr(entityId, name) { return this.wasm.get_component_ptr(entityId, name); }

  getTileEntity(x, y, layer = 0) {
    const id = this.wasm.wasm_tile_get(x, y, layer);
    return id === 4294967295 ? null : id;
  }

  setTileEntity(x, y, entityId, layer = 0) { this.wasm.wasm_tile_set(x, y, layer, entityId); }
  removeTileEntity(x, y, layer = 0) { this.wasm.wasm_tile_remove(x, y, layer); }
  setParent(childId, parentId) { this.wasm.wasm_set_parent(childId, parentId === null ? 4294967295 : parentId); }

  setText(entityId, text, fontSize = 24.0, color = [1, 1, 1, 1], alignment = 0, bold = 0.0, italic = 0.0, underline = 0.0) {
    const ptr = this.get_component_ptr(entityId, "Text2D");
    if (ptr !== 0) {
      const arr = new Float32Array(this.memory.buffer, ptr, 132);
      arr[0] = fontSize;
      arr[1] = color[0]; arr[2] = color[1]; arr[3] = color[2]; arr[4] = color[3];
      arr[5] = alignment;
      arr[6] = 1.2;
      
      const len = Math.min(text.length, 120);
      arr[7] = len;
      arr[8] = bold;
      arr[9] = italic;
      arr[10] = underline;
      arr[11] = 0.0; // pad
      
      for (let i = 0; i < len; i++) { arr[12 + i] = text.charCodeAt(i); }
      this.wasm.wasm_mark_changed(entityId, this.componentIds["Text2D"]);
    }
  }

  findPath(sx, sy, ex, ey, diagonal = true, maxIter = 1000) {
    return this.wasm.wasm_find_path(sx, sy, ex, ey, diagonal, maxIter);
  }

  registerComponent(name, fieldsOrLength = []) {
    if (this.schemas[name]) return;
    const isArray = Array.isArray(fieldsOrLength);
    this.componentFields[name] = isArray ? fieldsOrLength : [];
    const elements = isArray ? fieldsOrLength.length : fieldsOrLength;
    this.wasm.wasm_register_component(name, elements * 4, 4, elements, JSON.stringify(this.componentFields[name]));
    this.refreshSchemas();
  }

  refreshSchemas() {
    const schemaArr = this.wasm.get_component_schemas();
    for (const s of schemaArr) {
      this.schemas[s.name] = s;
      this.componentFields[s.name] = s.fields || [];
    }
    
    this.componentIds = {};
    for (let i = 0; i < schemaArr.length; i++) {
        this.componentIds[schemaArr[i].name] = schemaArr[i].id;
    }
  }

  spawn() { return new EntityBuilder(this, this.wasm.spawn()); }
  spawnBatch(count) {
    return Array.from(this.wasm.wasm_spawn_batch(count)).map((id) => new EntityBuilder(this, id));
  }

  /**
   * Spawns `count` entities that all share the same component set, building
   * them entirely inside WebAssembly.
   *
   * `spawnBatch(n)` followed by per-entity `.add()` costs one boundary crossing
   * per component, which dominates at large counts. This costs one call total.
   * Components get their default values — fill them through `query()` views
   * afterwards rather than entity by entity.
   *
   * @returns {Uint32Array} the raw entity ids, in creation order
   */
  spawnBatchWith(count, componentNames) {
    return this.wasm.wasm_spawn_batch_with(count, componentNames);
  }

  pickAt(worldX, worldY, radius = 5.0) { return this.wasm.wasm_query_at(worldX, worldY, radius); }

  query(componentNames) {
    const gen = this.wasm.get_structural_gen();
    const curBuffer = this.memory.buffer;
    const cacheKey = [...componentNames].sort().join(",");

    // Validity is tracked PER KEY: a cached result is reusable only if the world
    // hasn't structurally changed since IT was built (not since any other query ran).
    let cache = this.queryCache.get(cacheKey);
    if (cache && cache.gen === gen && cache.buffer === curBuffer) return cache.views;

    const isBufferChanged = !cache || cache.buffer !== curBuffer;
    if (!cache) { cache = { gen: -1, buffer: null, views: [] }; this.queryCache.set(cacheKey, cache); }

    const activeArchs = this.wasm.get_active_archetypes();
    const views = [];
    let outIdx = 0;

    for (let i = 0; i < activeArchs.length; i++) {
      const archId = activeArchs[i];
      let meta = this.archetypeMeta.get(archId);
      if (!meta) {
        const layout = this.wasm.get_archetype_memory_layout(archId);
        if (layout.length === 0) continue;
        const numComps = layout[3];
        const compCols = new Map();
        for (let c = 0; c < numComps; c++) { compCols.set(layout[4 + c * 2], c); }
        meta = { numComps, compCols, matchCache: new Map() };
        this.archetypeMeta.set(archId, meta);
      }

      let isMatch = meta.matchCache.get(cacheKey);
      if (isMatch === undefined) {
        isMatch = true;
        for (const name of componentNames) {
          const schema = this.schemas[name];
          if (!schema || !meta.compCols.has(schema.id)) { isMatch = false; break; }
        }
        meta.matchCache.set(cacheKey, isMatch);
      }
      if (!isMatch) continue;

      const layout = this.wasm.get_archetype_memory_layout(archId);
      if (layout.length === 0) continue;
      const len = layout[0], cap = layout[1], entPtr = layout[2];
      if (len === 0) continue;

      // Rebuild views on every cache miss: column pointers can move independently
      // of len/cap, so stale typed arrays are never worth the risk.
      const view = { archId, len, cap, entPtr, arrays: {}, entities: new Uint32Array(curBuffer, entPtr, len * 2) };
      for (const name of componentNames) {
        const schema = this.schemas[name];
        if (schema.elements > 0) {
          const colIdx = meta.compCols.get(schema.id);
          const compPtr = layout[4 + colIdx * 2 + 1];
          view.arrays[name] = new Float32Array(curBuffer, compPtr, cap * schema.elements);
        } else {
          view.arrays[name] = null;
        }
      }
      views.push(view);
      outIdx++;
    }

    cache.views = views;
    cache.gen = gen;
    cache.buffer = curBuffer;
    return views;
  }
}