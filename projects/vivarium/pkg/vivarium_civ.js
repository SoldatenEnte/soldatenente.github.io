/* @ts-self-types="./vivarium_civ.d.ts" */
import { startWorkers } from './snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.no-bundler.js';


export class BridgeBench {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BridgeBenchFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bridgebench_free(ptr, 0);
    }
    /**
     * Advances the world tick, so a following `changed_row_count` reports only
     * changes made after this call.
     */
    advance_tick() {
        wasm.bridgebench_advance_tick(this.__wbg_ptr);
    }
    /**
     * How many rows currently report a change tick equal to the world tick.
     * Used to show that S3 leaves change detection blind while S4 does not.
     * @returns {number}
     */
    changed_row_count() {
        const ret = wasm.bridgebench_changed_row_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Sum of every `x`, computed in Rust.
     *
     * Every strategy must produce the same value after performing the same
     * mutation. A divergence means a strategy did not actually write what the
     * others wrote, and its timing must not be compared with theirs.
     * @returns {number}
     */
    checksum() {
        const ret = wasm.bridgebench_checksum(this.__wbg_ptr);
        return ret;
    }
    /**
     * S3: start of the whole payload column. One call for `n` entities.
     *
     * The returned address is only valid until the column reallocates or the
     * linear memory grows; see the memory-view lifetime rules of the bridge.
     * @returns {number}
     */
    column_ptr() {
        const ret = wasm.bridgebench_column_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * S5 write direction: JavaScript hands back a whole buffer at once.
     * @param {Float32Array} data
     */
    copy_in(data) {
        const ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.bridgebench_copy_in(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * S5: one bulk copy of the entire column into a fresh `Float32Array`.
     * Crosses the boundary once, but pays for `n * 3` copied floats.
     * @returns {Float32Array}
     */
    copy_out() {
        const ret = wasm.bridgebench_copy_out(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.bridgebench_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * S4: the protocol obligation for a direct write through a typed-array
     * view. Without it Rust's change detection never observes the mutation.
     * @param {number} index
     */
    mark_changed(index) {
        wasm.bridgebench_mark_changed(this.__wbg_ptr, index);
    }
    /**
     * S2: a newly allocated `Float32Array` per entity. Every call crosses the
     * boundary *and* allocates a JavaScript object.
     * @param {number} index
     * @returns {Float32Array}
     */
    marshalled(index) {
        const ret = wasm.bridgebench_marshalled(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * S2 write direction: three `f32` passed across the boundary per entity.
     * @param {number} index
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    marshalled_set(index, x, y, z) {
        wasm.bridgebench_marshalled_set(this.__wbg_ptr, index, x, y, z);
    }
    /**
     * Builds a world of `n` entities, all in one archetype, so the payload
     * column is contiguous.
     *
     * `decoy_components` controls how many schema entries precede the payload
     * in the lookup table. Artisan's `get_component_ptr` scans this list
     * linearly, so its length is part of the measured protocol.
     * @param {number} n
     * @param {number} decoy_components
     */
    constructor(n, decoy_components) {
        const ret = wasm.bridgebench_new(n, decoy_components);
        this.__wbg_ptr = ret;
        BridgeBenchFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Same lookup with the component id already known. The difference to
     * [`Self::ptr_by_name`] is the cost of the name resolution alone.
     * @param {number} index
     * @returns {number}
     */
    ptr_by_id(index) {
        const ret = wasm.bridgebench_ptr_by_id(this.__wbg_ptr, index);
        return ret >>> 0;
    }
    /**
     * Byte offset of a single entity's component, resolved through the
     * component *name* — the path the public API actually takes.
     * @param {number} index
     * @param {string} name
     * @returns {number}
     */
    ptr_by_name(index, name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bridgebench_ptr_by_name(this.__wbg_ptr, index, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * Resets every payload value, so each strategy starts from the same state.
     */
    reset() {
        wasm.bridgebench_reset(this.__wbg_ptr);
    }
    /**
     * Structural generation counter. JavaScript compares it against the value
     * it saw when it created a view; a change means the view may be stale.
     * @returns {number}
     */
    structural_gen() {
        const ret = wasm.bridgebench_structural_gen(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) BridgeBench.prototype[Symbol.dispose] = BridgeBench.prototype.free;

export class WasmEngine {
    static __wrap(ptr) {
        const obj = Object.create(WasmEngine.prototype);
        obj.__wbg_ptr = ptr;
        WasmEngineFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmengine_free(ptr, 0);
    }
    /**
     * @returns {Uint32Array}
     */
    get_active_archetypes() {
        const ret = wasm.wasmengine_get_active_archetypes(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} id
     * @returns {Uint32Array}
     */
    get_archetype_memory_layout(id) {
        const ret = wasm.wasmengine_get_archetype_memory_layout(this.__wbg_ptr, id);
        return ret;
    }
    /**
     * @param {number} entity_id
     * @param {string} name
     * @returns {number}
     */
    get_component_ptr(entity_id, name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmengine_get_component_ptr(this.__wbg_ptr, entity_id, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * @returns {Array<any>}
     */
    get_component_schemas() {
        const ret = wasm.wasmengine_get_component_schemas(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} name
     * @returns {Float32Array | undefined}
     */
    get_resource(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmengine_get_resource(this.__wbg_ptr, ptr0, len0);
        let v2;
        if (ret[0] !== 0) {
            v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v2;
    }
    /**
     * @returns {number}
     */
    get_structural_gen() {
        const ret = wasm.wasmengine_get_structural_gen(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} id
     */
    kill(id) {
        wasm.wasmengine_kill(this.__wbg_ptr, id);
    }
    /**
     * @returns {any}
     */
    static memory() {
        const ret = wasm.wasmengine_memory();
        return ret;
    }
    /**
     * @param {number} width
     * @param {number} height
     * @param {number} segments
     * @returns {object}
     */
    mesh_capsule_2d(width, height, segments) {
        const ret = wasm.wasmengine_mesh_capsule_2d(this.__wbg_ptr, width, height, segments);
        return ret;
    }
    /**
     * @param {number} segments
     * @returns {object}
     */
    mesh_circle_2d(segments) {
        const ret = wasm.wasmengine_mesh_circle_2d(this.__wbg_ptr, segments);
        return ret;
    }
    /**
     * @param {number} width
     * @param {number} height
     * @returns {object}
     */
    mesh_quad_2d(width, height) {
        const ret = wasm.wasmengine_mesh_quad_2d(this.__wbg_ptr, width, height);
        return ret;
    }
    /**
     * @param {number} inner_radius
     * @param {number} outer_radius
     * @param {number} segments
     * @returns {object}
     */
    mesh_ring_2d(inner_radius, outer_radius, segments) {
        const ret = wasm.wasmengine_mesh_ring_2d(this.__wbg_ptr, inner_radius, outer_radius, segments);
        return ret;
    }
    constructor() {
        const ret = wasm.wasmengine_new();
        this.__wbg_ptr = ret;
        WasmEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Runs the presentation-only schedule (see `App::add_render_system`).
     * Call once per rendered frame, after however many `tick()` calls this
     * frame needed and immediately before drawing -- so render-prep cost
     * scales with frame rate instead of with simulation speed.
     */
    render_tick() {
        wasm.wasmengine_render_tick(this.__wbg_ptr);
    }
    /**
     * @param {string} name
     * @param {Float32Array} data
     */
    set_resource(name, data) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.wasmengine_set_resource(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * @returns {number}
     */
    spawn() {
        const ret = wasm.wasmengine_spawn(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} dt
     */
    tick(dt) {
        wasm.wasmengine_tick(this.__wbg_ptr, dt);
    }
    /**
     * @param {number} entity_id
     * @param {string} name
     */
    wasm_add_component(entity_id, name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_wasm_add_component(this.__wbg_ptr, entity_id, ptr0, len0);
    }
    /**
     * @param {number} sx
     * @param {number} sy
     * @param {number} ex
     * @param {number} ey
     * @param {boolean} diag
     * @param {number} max_iter
     * @returns {Int32Array}
     */
    wasm_find_path(sx, sy, ex, ey, diag, max_iter) {
        const ret = wasm.wasmengine_wasm_find_path(this.__wbg_ptr, sx, sy, ex, ey, diag, max_iter);
        return ret;
    }
    /**
     * See `DynamicMesh::color_version`'s doc comment -- a separate change
     * counter for vertex-attribute-only updates that don't move geometry,
     * so a renderer can still know to re-upload without also triggering
     * version-watchers that care about topology/positions (e.g.
     * spatial_3d::sys_build_bvh).
     * @param {number} entity_id
     * @returns {number}
     */
    wasm_get_dynamic_mesh_color_version(entity_id) {
        const ret = wasm.wasmengine_wasm_get_dynamic_mesh_color_version(this.__wbg_ptr, entity_id);
        return ret >>> 0;
    }
    /**
     * @param {number} entity_id
     * @returns {Uint32Array}
     */
    wasm_get_dynamic_mesh_indices(entity_id) {
        const ret = wasm.wasmengine_wasm_get_dynamic_mesh_indices(this.__wbg_ptr, entity_id);
        return ret;
    }
    /**
     * @param {number} entity_id
     * @returns {number}
     */
    wasm_get_dynamic_mesh_version(entity_id) {
        const ret = wasm.wasmengine_wasm_get_dynamic_mesh_version(this.__wbg_ptr, entity_id);
        return ret >>> 0;
    }
    /**
     * @param {number} entity_id
     * @returns {Float32Array}
     */
    wasm_get_dynamic_mesh_vertices(entity_id) {
        const ret = wasm.wasmengine_wasm_get_dynamic_mesh_vertices(this.__wbg_ptr, entity_id);
        return ret;
    }
    /**
     * @param {number} _entity_id
     * @returns {Float32Array}
     */
    wasm_get_inventory(_entity_id) {
        const ret = wasm.wasmengine_wasm_get_inventory(this.__wbg_ptr, _entity_id);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    wasm_get_light_data() {
        const ret = wasm.wasmengine_wasm_get_light_data(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint32Array}
     */
    wasm_get_render_batches_2d() {
        const ret = wasm.wasmengine_wasm_get_render_batches_2d(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint32Array}
     */
    wasm_get_render_batches_3d() {
        const ret = wasm.wasmengine_wasm_get_render_batches_3d(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} _entity_id
     * @returns {Uint32Array}
     */
    wasm_get_tilemap_data(_entity_id) {
        const ret = wasm.wasmengine_wasm_get_tilemap_data(this.__wbg_ptr, _entity_id);
        return ret;
    }
    /**
     * @param {string} json
     */
    wasm_load_world(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_wasm_load_world(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} entity_id
     * @param {number} comp_id
     */
    wasm_mark_changed(entity_id, comp_id) {
        wasm.wasmengine_wasm_mark_changed(this.__wbg_ptr, entity_id, comp_id);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    wasm_pick_2d(x, y) {
        const ret = wasm.wasmengine_wasm_pick_2d(this.__wbg_ptr, x, y);
        return ret >>> 0;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @returns {Uint32Array}
     */
    wasm_query_at(x, y, radius) {
        const ret = wasm.wasmengine_wasm_query_at(this.__wbg_ptr, x, y, radius);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} radius
     * @returns {Uint32Array}
     */
    wasm_query_at_3d(x, y, z, radius) {
        const ret = wasm.wasmengine_wasm_query_at_3d(this.__wbg_ptr, x, y, z, radius);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} ox
     * @param {number} oy
     * @param {number} oz
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @returns {Float32Array}
     */
    wasm_raycast_3d(ox, oy, oz, dx, dy, dz) {
        const ret = wasm.wasmengine_wasm_raycast_3d(this.__wbg_ptr, ox, oy, oz, dx, dy, dz);
        return ret;
    }
    /**
     * @param {string} name
     * @param {number} size
     * @param {number} align
     * @param {number} elements
     * @param {string} fields_json
     */
    wasm_register_component(name, size, align, elements, fields_json) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(fields_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.wasmengine_wasm_register_component(this.__wbg_ptr, ptr0, len0, size, align, elements, ptr1, len1);
    }
    /**
     * @param {number} entity_id
     * @param {string} name
     */
    wasm_remove_component(entity_id, name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmengine_wasm_remove_component(this.__wbg_ptr, entity_id, ptr0, len0);
    }
    /**
     * @returns {string}
     */
    wasm_save_world() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmengine_wasm_save_world(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} ndc_x
     * @param {number} ndc_y
     * @returns {Float32Array}
     */
    wasm_screen_to_ray(ndc_x, ndc_y) {
        const ret = wasm.wasmengine_wasm_screen_to_ray(this.__wbg_ptr, ndc_x, ndc_y);
        return ret;
    }
    /**
     * @param {number} entity_id
     * @param {Float32Array} vertices
     * @param {Uint32Array} indices
     */
    wasm_set_dynamic_mesh(entity_id, vertices, indices) {
        const ptr0 = passArrayF32ToWasm0(vertices, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(indices, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.wasmengine_wasm_set_dynamic_mesh(this.__wbg_ptr, entity_id, ptr0, len0, ptr1, len1);
    }
    /**
     * @param {number} entity_id
     * @param {number} mesh_id
     */
    wasm_set_mesh_handle(entity_id, mesh_id) {
        wasm.wasmengine_wasm_set_mesh_handle(this.__wbg_ptr, entity_id, mesh_id);
    }
    /**
     * @param {number} child_id
     * @param {number} parent_id
     */
    wasm_set_parent(child_id, parent_id) {
        wasm.wasmengine_wasm_set_parent(this.__wbg_ptr, child_id, parent_id);
    }
    /**
     * @param {number} count
     * @returns {Uint32Array}
     */
    wasm_spawn_batch(count) {
        const ret = wasm.wasmengine_wasm_spawn_batch(this.__wbg_ptr, count);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Spawns `count` entities that all carry the same component set.
     *
     * The per-entity path costs one boundary crossing per component: building
     * 250 000 entities with eight components each from JavaScript means two
     * million calls, which dominates everything else. This performs the whole
     * construction inside WebAssembly and returns the identifiers once.
     *
     * Components are created with their default values; fill them afterwards
     * through a column view rather than per entity.
     * @param {number} count
     * @param {string[]} names
     * @returns {Uint32Array}
     */
    wasm_spawn_batch_with(count, names) {
        const ptr0 = passArrayJsValueToWasm0(names, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmengine_wasm_spawn_batch_with(this.__wbg_ptr, count, ptr0, len0);
        var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} layer
     * @returns {number}
     */
    wasm_tile_get(x, y, layer) {
        const ret = wasm.wasmengine_wasm_tile_get(this.__wbg_ptr, x, y, layer);
        return ret >>> 0;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} layer
     */
    wasm_tile_remove(x, y, layer) {
        wasm.wasmengine_wasm_tile_remove(this.__wbg_ptr, x, y, layer);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} layer
     * @param {number} entity_id
     */
    wasm_tile_set(x, y, layer, entity_id) {
        wasm.wasmengine_wasm_tile_set(this.__wbg_ptr, x, y, layer, entity_id);
    }
    /**
     * @param {Uint8Array | null | undefined} keys
     * @param {number} mouse_x
     * @param {number} mouse_y
     * @param {number} mouse_dx
     * @param {number} mouse_dy
     * @param {number} wheel_dy
     * @param {Uint8Array | null} [mouse_buttons]
     */
    wasm_update_input(keys, mouse_x, mouse_y, mouse_dx, mouse_dy, wheel_dy, mouse_buttons) {
        wasm.wasmengine_wasm_update_input(this.__wbg_ptr, isLikeNone(keys) ? 0 : addToExternrefTable0(keys), mouse_x, mouse_y, mouse_dx, mouse_dy, wheel_dy, isLikeNone(mouse_buttons) ? 0 : addToExternrefTable0(mouse_buttons));
    }
}
if (Symbol.dispose) WasmEngine.prototype[Symbol.dispose] = WasmEngine.prototype.free;

/**
 * Environment block for the browser run. The JavaScript side merges in the
 * values only it can see (user agent, `hardwareConcurrency`, WebGPU adapter,
 * `crossOriginIsolated`).
 * @returns {string}
 */
export function artisan_bench_env() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.artisan_bench_env();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Static description of every benchmark case, as JSON. Lets a page build its
 * result table before running anything.
 * @returns {string}
 */
export function artisan_bench_manifest() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.artisan_bench_manifest();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Runs a single benchmark case and returns its result as JSON.
 *
 * Kept per-case rather than per-suite so the page can yield to the event loop
 * between categories; a multi-second synchronous call would otherwise freeze
 * the tab and let the browser throttle the very work being measured.
 *
 * `cfg_json` accepts the fields of `BenchCfg`; omitted fields take their
 * defaults.
 * @param {number} id
 * @param {string} cfg_json
 * @returns {string}
 */
export function artisan_bench_run(id, cfg_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(cfg_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.artisan_bench_run(id, ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Number of threads rayon will actually use right now.
 *
 * Before `initThreadPool` has resolved this is 1, and a run measured in that
 * state must not be labelled as threaded.
 * @returns {number}
 */
export function artisan_rayon_threads() {
    const ret = wasm.artisan_rayon_threads();
    return ret >>> 0;
}

/**
 * @param {number} dpi_scale
 * @returns {WasmEngine}
 */
export function create_vivarium_engine(dpi_scale) {
    const ret = wasm.create_vivarium_engine(dpi_scale);
    return WasmEngine.__wrap(ret);
}

/**
 * @param {number} num_threads
 * @returns {Promise<any>}
 */
export function initThreadPool(num_threads) {
    const ret = wasm.initThreadPool(num_threads);
    return ret;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} segments
 * @returns {object}
 */
export function mesh_capsule_2d(width, height, segments) {
    const ret = wasm.mesh_capsule_2d(width, height, segments);
    return ret;
}

/**
 * @param {number} segments
 * @returns {object}
 */
export function mesh_circle_2d(segments) {
    const ret = wasm.mesh_circle_2d(segments);
    return ret;
}

/**
 * @param {number} size
 * @returns {object}
 */
export function mesh_cube(size) {
    const ret = wasm.mesh_cube(size);
    return ret;
}

/**
 * @param {number} radius_top
 * @param {number} radius_bottom
 * @param {number} height
 * @param {number} radial_segments
 * @returns {object}
 */
export function mesh_cylinder(radius_top, radius_bottom, height, radial_segments) {
    const ret = wasm.mesh_cylinder(radius_top, radius_bottom, height, radial_segments);
    return ret;
}

/**
 * @param {number} radius
 * @param {number} subdivisions
 * @param {boolean} flat_shaded
 * @returns {object}
 */
export function mesh_icosphere(radius, subdivisions, flat_shaded) {
    const ret = wasm.mesh_icosphere(radius, subdivisions, flat_shaded);
    return ret;
}

/**
 * @param {number} size
 * @returns {object}
 */
export function mesh_plane(size) {
    const ret = wasm.mesh_plane(size);
    return ret;
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {object}
 */
export function mesh_quad_2d(width, height) {
    const ret = wasm.mesh_quad_2d(width, height);
    return ret;
}

/**
 * @param {number} inner_radius
 * @param {number} outer_radius
 * @param {number} segments
 * @returns {object}
 */
export function mesh_ring_2d(inner_radius, outer_radius, segments) {
    const ret = wasm.mesh_ring_2d(inner_radius, outer_radius, segments);
    return ret;
}

/**
 * @param {number} radius
 * @param {number} rings
 * @param {number} sectors
 * @returns {object}
 */
export function mesh_sphere(radius, rings, sectors) {
    const ret = wasm.mesh_sphere(radius, rings, sectors);
    return ret;
}

/**
 * @param {Float32Array} vertices
 * @param {Uint32Array} indices
 */
export function recalculate_normals(vertices, indices) {
    var ptr0 = passArrayF32ToWasm0(vertices, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(indices, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.recalculate_normals(ptr0, len0, vertices, ptr1, len1);
}

/**
 * Returns the settler marker mesh's raw {vertices, indices} (same 12-float-
 * per-vertex layout every DynamicMesh in this demo uses) so the browser can
 * register it ONCE via renderer.assets.createMesh(...) and hand the
 * resulting numeric id back through wasm_set_settler_mesh_id -- see that
 * function and PlanetSimulationState::settler_mesh_id for why this matters
 * (it's what lets thousands of settlers share a single instanced draw call
 * instead of each getting its own GPU buffer and its own batch of size 1).
 * @returns {object}
 */
export function vivarium_settler_marker_mesh() {
    const ret = wasm.vivarium_settler_marker_mesh();
    return ret;
}

/**
 * Cheap UI query; unlike wasm_headless_stats this does not census every
 * settler just to tell the tile panel whether droughts exist elsewhere.
 * @param {WasmEngine} engine
 * @returns {number}
 */
export function wasm_active_drought_count(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_active_drought_count(engine.__wbg_ptr);
    return ret >>> 0;
}

/**
 * @param {WasmEngine} engine
 */
export function wasm_admin_clear_droughts(engine) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_admin_clear_droughts(engine.__wbg_ptr);
}

/**
 * @param {WasmEngine} engine
 * @param {number} face_id
 * @returns {boolean}
 */
export function wasm_admin_enrich_face(engine, face_id) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_admin_enrich_face(engine.__wbg_ptr, face_id);
    return ret !== 0;
}

/**
 * Paint a small graph-radius brush onto the planet.
 * tool: 0 drought, 1 refill food, 2 land, 3 ocean, 4 people.
 * Returns [changed faces, occupied faces skipped]. Ocean painting refuses to
 * submerge occupied tiles, so the editor can never strand a settler at sea.
 * @param {WasmEngine} engine
 * @param {number} center_face
 * @param {number} tool
 * @param {number} radius
 * @returns {Uint32Array}
 */
export function wasm_admin_paint(engine, center_face, tool, radius) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_admin_paint(engine.__wbg_ptr, center_face, tool, radius);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Hover-only footprint preview. Passing a negative face clears it.
 * @param {WasmEngine} engine
 * @param {number} center_face
 * @param {number} tool
 * @param {number} radius
 */
export function wasm_admin_preview(engine, center_face, tool, radius) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_admin_preview(engine.__wbg_ptr, center_face, tool, radius);
}

/**
 * @param {WasmEngine} engine
 * @param {number} face_id
 * @returns {boolean}
 */
export function wasm_admin_refill_face(engine, face_id) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_admin_refill_face(engine.__wbg_ptr, face_id);
    return ret !== 0;
}

/**
 * Safe, bounded controls for the in-demo World Admin panel.
 * @param {WasmEngine} engine
 * @param {number} multiplier
 */
export function wasm_admin_set_food_regen(engine, multiplier) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_admin_set_food_regen(engine.__wbg_ptr, multiplier);
}

/**
 * @param {WasmEngine} engine
 * @param {number} face_id
 * @returns {boolean}
 */
export function wasm_admin_start_drought(engine, face_id) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_admin_start_drought(engine.__wbg_ptr, face_id);
    return ret !== 0;
}

/**
 * Benchmark-only: sets which per-tick systems actually run, as a bitmask
 * (see BENCH_SYS_* in systems.rs). u32::MAX = everything on (the default).
 * tools/scripts/vivarium_civ_bench.js uses this to attribute per-system cost
 * by ablation -- measure with all systems on, then re-measure with one
 * system's bit cleared; the difference is that system's cost. This exists
 * because wasm32-unknown-unknown has no usable std::time::Instant, so an
 * in-wasm profiler isn't available.
 * @param {WasmEngine} engine
 * @param {number} mask
 */
export function wasm_bench_set_system_mask(engine, mask) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_bench_set_system_mask(engine.__wbg_ptr, mask);
}

/**
 * Extends wasm_debug_trait_correlation with the settler's CURRENT TILE's
 * food_fraction and face_population, bucketed the same way (coopHi/coopLo).
 * Added to check a second hypothesis: even if a settler's own hunger clears
 * the birth threshold, sys_step_settlers ALSO requires
 * food_fraction(birth_face) >= birth_food_floor, a TILE-level gate --
 * crowded tiles share one depleting food_stock, so a trait that pulls
 * settlers into crowds (social_cohesion_weight) could starve births at the
 * tile level even once the settler-level hunger gate is fixed.
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_debug_tile_correlation(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_debug_tile_correlation(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Debug-only diagnostic (temporary, for the 2026-08-01 trait-collapse
 * investigation): buckets alive settlers by whether each trait is above or
 * below 0.5 and reports avg hunger + avg age for each bucket, so the actual
 * mechanism behind trait selection can be measured directly instead of
 * theorized about. Layout: [coopHi_avgHunger, coopHi_avgAge, coopHi_n,
 * coopLo_avgHunger, coopLo_avgAge, coopLo_n, aggHi..., aggLo..., mobHi...,
 * mobLo...] (4 buckets x 3 values = 12 floats).
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_debug_trait_correlation(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_debug_trait_correlation(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {string} msg
 */
export function wasm_error(msg) {
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.wasm_error(ptr0, len0);
}

/**
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_get_colony_stats(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_get_colony_stats(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * [0] is_water [1] elevation [2] temp [3] moisture [4] arability (fertility)
 * [5] minerals [6] face_owner (legacy faction system, unused) [7] face_score
 * (legacy, unused)
 * Emergent-civilisation adaptation, appended: [8] food_stock [9] food_cap
 * [10] drought [11] population (settlers currently on this face) [12]
 * dominant_tribe (-1 if empty) -- everything the tile info panel needs to
 * match the prototype's inspect() panel (Terrain/Food/Fertility/Population/
 * Drought/Dominant tribe).
 * @param {WasmEngine} engine
 * @param {number} face_id
 * @returns {Float32Array}
 */
export function wasm_get_face_info(engine, face_id) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_get_face_info(engine.__wbg_ptr, face_id);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_get_settlements_data(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_get_settlements_data(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {WasmEngine} engine
 * @param {number} face
 * @returns {Uint32Array}
 */
export function wasm_headless_face_neighbors(engine, face) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_face_neighbors(engine.__wbg_ptr, face);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * @param {WasmEngine} engine
 * @param {number} face
 * @returns {Float32Array}
 */
export function wasm_headless_face_visual(engine, face) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_face_visual(engine.__wbg_ptr, face);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Reads back the planet's current SimTuning values in the same flat-index
 * order as wasm_headless_set_tuning -- lets a caller patch just the fields it
 * cares about (read, modify a few indices, write the whole thing back)
 * instead of needing to know every field's current value up front.
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_headless_get_tuning(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_get_tuning(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Diagnostic for terrain-editor tests: maximum world-space separation
 * between flat-shaded vertex duplicates that originated from the same
 * welded icosphere corner. A watertight planet should remain near zero.
 * @param {WasmEngine} engine
 * @returns {number}
 */
export function wasm_headless_max_seam_error(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_max_seam_error(engine.__wbg_ptr);
    return ret;
}

/**
 * One-shot planet calibration info for tuning: [num_faces, land_faces,
 * mean_arability_over_land, coastal_faces (dist_to_water == 0), mean_dist_to_water_over_land].
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_headless_planet_info(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_planet_info(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Sets every SimTuning field at once, by flat f32 index (see
 * components::SIM_TUNING_FIELD_NAMES for the order) -- lets the headless
 * harness sweep balance constants with `--set name=value` without a rebuild.
 * SimTuning is #[repr(C)] and all-f32 (see components.rs), so the fields are
 * laid out contiguously and can be written through a raw f32 pointer, same
 * pattern as the manual byte-offset schemas already used for the other sim
 * components in lib.rs. Values beyond `values.len()` are left untouched.
 * @param {WasmEngine} engine
 * @param {Float32Array} values
 */
export function wasm_headless_set_tuning(engine, values) {
    _assertClass(engine, WasmEngine);
    const ptr0 = passArrayF32ToWasm0(values, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.wasm_headless_set_tuning(engine.__wbg_ptr, ptr0, len0);
}

/**
 * Headless test-harness support (see tools/scripts/vivarium_headless_sim.js):
 * starts the simulation the same way clicking "Deploy Settlements" does,
 * without needing the UIBridge/DOM machinery the browser demo uses to poke
 * PlanetConfig/PlanetSimulationState fields by byte offset.
 * @param {WasmEngine} engine
 * @param {number} seed_bits
 * @param {number} population
 */
export function wasm_headless_start(engine, seed_bits, population) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_headless_start(engine.__wbg_ptr, seed_bits, population);
}

/**
 * Flat stats vector for the headless harness (emergent-civilisation
 * adaptation). Indices:
 * [0] alive  [1] tribe_count  [2] largest_tribe_size
 * [3] avg_hunger  [4] avg_thirst
 * [5] occupied_faces -- distinct faces with >=1 settler on them
 * [6] births_total  [7] deaths_starved  [8] deaths_aged -- lifetime counters
 *     (see PlanetSimulationState), for diagnosing *why* the population
 *     curve looks the way it does instead of just watching alive.
 * [9] cooperation_events  [10] aggression_events  [11] tribe_splits --
 *     lifetime conflict/culture counters (see sys_tribe_dynamics /
 *     sys_step_settlers' birth branch).
 * [12] active_droughts
 * [13] avg_cooperation  [14] avg_aggression  [15] avg_mobility -- population-
 *     wide personality means, to watch whether selection pressure actually
 *     shifts culture over a long run.
 * @param {WasmEngine} engine
 * @returns {Float32Array}
 */
export function wasm_headless_stats(engine) {
    _assertClass(engine, WasmEngine);
    const ret = wasm.wasm_headless_stats(engine.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Comma-separated field names matching the index order wasm_headless_set_tuning expects.
 * @returns {string}
 */
export function wasm_headless_tuning_names() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.wasm_headless_tuning_names();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} msg
 */
export function wasm_info(msg) {
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.wasm_info(ptr0, len0);
}

/**
 * Restores `prev_face_id`'s vertex colors (if any) and tints `face_id`'s
 * vertices to mark it as selected. Pass -1 for either id to skip that step.
 * Reuses `PlanetSimulationState.base_colors`, which already stores each
 * vertex's original biome color for exactly this kind of overlay.
 * @param {WasmEngine} engine
 * @param {number} prev_face_id
 * @param {number} face_id
 */
export function wasm_select_face(engine, prev_face_id, face_id) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_select_face(engine.__wbg_ptr, prev_face_id, face_id);
}

/**
 * See vivarium_settler_marker_mesh's doc comment. Called once by the browser
 * after registering that mesh; every settler spawned/born afterward gets a
 * MeshHandle pointing at this shared id instead of its own DynamicMesh.
 * @param {WasmEngine} engine
 * @param {number} mesh_id
 */
export function wasm_set_settler_mesh_id(engine, mesh_id) {
    _assertClass(engine, WasmEngine);
    wasm.wasm_set_settler_mesh_id(engine.__wbg_ptr, mesh_id);
}

/**
 * @param {string} msg
 */
export function wasm_warn(msg) {
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.wasm_warn(ptr0, len0);
}

export class wbg_rayon_PoolBuilder {
    static __wrap(ptr) {
        const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
        obj.__wbg_ptr = ptr;
        wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        wbg_rayon_PoolBuilderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
    }
    build() {
        wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    mainJS() {
        const ret = wasm.wbg_rayon_poolbuilder_mainJS(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    numThreads() {
        const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    receiver() {
        const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;

/**
 * @param {number} receiver
 */
export function wbg_rayon_start_worker(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
}
function __wbg_get_imports(memory) {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_4db0cbe2cc60dbee: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_debug_string_c25d447a39f5578f: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_function_1ff95bcc5517c252: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_ea9085d691f535d3: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_undefined_c05833b95a3cf397: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_memory_de265df8aadd6273: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_module_a22faa8909381977: function() {
            const ret = wasmModule;
            return ret;
        },
        __wbg___wbindgen_number_get_394265ed1e1b84ee: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_b0ca35b86a603356: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_8a2dd23819f8a60a: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_error_9860926bbe8a3463: function(arg0, arg1) {
            console.error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_get_78f252d074a84d0b: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_info_e13011f3afdbab54: function(arg0, arg1) {
            console.info(getStringFromWasm0(arg0, arg1));
        },
        __wbg_instanceof_Window_05ba1ee4f6781663: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_length_1f0964f4a5e2c6d8: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_32b398fb48b6d94a: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_da52cf8fe3429cb2: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_from_slice_7568ba55b4a7e81f: function(arg0, arg1) {
            const ret = new Uint32Array(getArrayU32FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_from_slice_adc482e0820cc439: function(arg0, arg1) {
            const ret = new Int32Array(getArrayI32FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_from_slice_ddf8b82c4d6af38e: function(arg0, arg1) {
            const ret = new Float32Array(getArrayF32FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_length_664ae1da061c56fa: function(arg0) {
            const ret = new Int32Array(arg0 >>> 0);
            return ret;
        },
        __wbg_new_with_length_e1d8c8061ed4e317: function(arg0) {
            const ret = new Float32Array(arg0 >>> 0);
            return ret;
        },
        __wbg_new_with_length_f048f86e32f1515e: function(arg0) {
            const ret = new Uint32Array(arg0 >>> 0);
            return ret;
        },
        __wbg_now_22e8113d679a19ef: function() {
            const ret = performance.now();
            return ret;
        },
        __wbg_prototypesetcall_4770620bbe4688a0: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_d2ae3af0c1217ae6: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_set_8535240470bf2500: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_slice_ecaaa67ec7cf96c1: function(arg0, arg1, arg2) {
            const ret = arg0.slice(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_startWorkers_622cedd0d351664e: function(arg0, arg1, arg2) {
            const ret = startWorkers(arg0, arg1, wbg_rayon_PoolBuilder.__wrap(arg2));
            return ret;
        },
        __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_146583524fe1469b: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_URL_151cb8815849ce83: function() {
            const ret = import.meta.url;
            return ret;
        },
        __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_warn_6a464a31859c9b6e: function(arg0, arg1) {
            console.warn(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
            const ret = getArrayF32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
            const ret = getArrayU32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
        memory: memory || new WebAssembly.Memory({initial:19,maximum:16384,shared:true}),
    };
    return {
        __proto__: null,
        "./vivarium_civ_bg.js": import0,
    };
}

const BridgeBenchFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bridgebench_free(ptr, 1));
const WasmEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmengine_free(ptr, 1));
const wbg_rayon_PoolBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : undefined);
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined);

if (cachedTextEncoder) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module, thread_stack_size) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    if (typeof thread_stack_size !== 'undefined' && (typeof thread_stack_size !== 'number' || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
        throw new Error('invalid stack size');
    }

    wasm.__wbindgen_start(thread_stack_size);
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module, memory, thread_stack_size} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports(memory);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module, thread_stack_size);
}

async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('vivarium_civ_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports(memory);

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync, __wbg_init as default };
