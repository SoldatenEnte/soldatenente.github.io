export class UIBridge {
  constructor(world) {
    this.world = world;
    this.proxies = new Map();
  }

  getComponentProxy(entityId, componentName) {
    const key = `${entityId}_${componentName}`;
    if (this.proxies.has(key)) return this.proxies.get(key);

    const schema = this.world.schemas[componentName];
    if (!schema || schema.elements === 0) return null;

    const proxy = new Proxy(
      {},
      {
        get: (target, prop) => {
          const fieldIdx = schema.fields.indexOf(prop);
          if (fieldIdx === -1) return undefined;
          const ptr = this.world.wasm.get_component_ptr(
            entityId,
            componentName,
          );
          if (ptr === 0) return undefined;
          const arr = new Float32Array(
            this.world.memory.buffer,
            ptr,
            schema.elements,
          );
          return arr[fieldIdx];
        },
        set: (target, prop, value) => {
          const fieldIdx = schema.fields.indexOf(prop);
          if (fieldIdx === -1) return false;
          const ptr = this.world.wasm.get_component_ptr(
            entityId,
            componentName,
          );
          if (ptr === 0) return false;
          const arr = new Float32Array(
            this.world.memory.buffer,
            ptr,
            schema.elements,
          );
          arr[fieldIdx] = value;
          this.world.wasm.wasm_mark_changed(entityId, schema.id);
          return true;
        },
      },
    );

    this.proxies.set(key, proxy);
    return proxy;
  }
}
