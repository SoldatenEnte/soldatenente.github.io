/* tslint:disable */
/* eslint-disable */

export class BridgeBench {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Advances the world tick, so a following `changed_row_count` reports only
     * changes made after this call.
     */
    advance_tick(): void;
    /**
     * How many rows currently report a change tick equal to the world tick.
     * Used to show that S3 leaves change detection blind while S4 does not.
     */
    changed_row_count(): number;
    /**
     * Sum of every `x`, computed in Rust.
     *
     * Every strategy must produce the same value after performing the same
     * mutation. A divergence means a strategy did not actually write what the
     * others wrote, and its timing must not be compared with theirs.
     */
    checksum(): number;
    /**
     * S3: start of the whole payload column. One call for `n` entities.
     *
     * The returned address is only valid until the column reallocates or the
     * linear memory grows; see the memory-view lifetime rules of the bridge.
     */
    column_ptr(): number;
    /**
     * S5 write direction: JavaScript hands back a whole buffer at once.
     */
    copy_in(data: Float32Array): void;
    /**
     * S5: one bulk copy of the entire column into a fresh `Float32Array`.
     * Crosses the boundary once, but pays for `n * 3` copied floats.
     */
    copy_out(): Float32Array;
    len(): number;
    /**
     * S4: the protocol obligation for a direct write through a typed-array
     * view. Without it Rust's change detection never observes the mutation.
     */
    mark_changed(index: number): void;
    /**
     * S2: a newly allocated `Float32Array` per entity. Every call crosses the
     * boundary *and* allocates a JavaScript object.
     */
    marshalled(index: number): Float32Array;
    /**
     * S2 write direction: three `f32` passed across the boundary per entity.
     */
    marshalled_set(index: number, x: number, y: number, z: number): void;
    /**
     * Builds a world of `n` entities, all in one archetype, so the payload
     * column is contiguous.
     *
     * `decoy_components` controls how many schema entries precede the payload
     * in the lookup table. Artisan's `get_component_ptr` scans this list
     * linearly, so its length is part of the measured protocol.
     */
    constructor(n: number, decoy_components: number);
    /**
     * Same lookup with the component id already known. The difference to
     * [`Self::ptr_by_name`] is the cost of the name resolution alone.
     */
    ptr_by_id(index: number): number;
    /**
     * Byte offset of a single entity's component, resolved through the
     * component *name* — the path the public API actually takes.
     */
    ptr_by_name(index: number, name: string): number;
    /**
     * Resets every payload value, so each strategy starts from the same state.
     */
    reset(): void;
    /**
     * Structural generation counter. JavaScript compares it against the value
     * it saw when it created a view; a change means the view may be stale.
     */
    structural_gen(): number;
}

export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    get_active_archetypes(): Uint32Array;
    get_archetype_memory_layout(id: number): Uint32Array;
    get_component_ptr(entity_id: number, name: string): number;
    get_component_schemas(): Array<any>;
    get_resource(name: string): Float32Array | undefined;
    get_structural_gen(): number;
    kill(id: number): void;
    static memory(): any;
    mesh_capsule_2d(width: number, height: number, segments: number): object;
    mesh_circle_2d(segments: number): object;
    mesh_quad_2d(width: number, height: number): object;
    mesh_ring_2d(inner_radius: number, outer_radius: number, segments: number): object;
    constructor();
    /**
     * Runs the presentation-only schedule (see `App::add_render_system`).
     * Call once per rendered frame, after however many `tick()` calls this
     * frame needed and immediately before drawing -- so render-prep cost
     * scales with frame rate instead of with simulation speed.
     */
    render_tick(): void;
    set_resource(name: string, data: Float32Array): void;
    spawn(): number;
    tick(dt: number): void;
    wasm_add_component(entity_id: number, name: string): void;
    wasm_find_path(sx: number, sy: number, ex: number, ey: number, diag: boolean, max_iter: number): Int32Array;
    /**
     * See `DynamicMesh::color_version`'s doc comment -- a separate change
     * counter for vertex-attribute-only updates that don't move geometry,
     * so a renderer can still know to re-upload without also triggering
     * version-watchers that care about topology/positions (e.g.
     * spatial_3d::sys_build_bvh).
     */
    wasm_get_dynamic_mesh_color_version(entity_id: number): number;
    wasm_get_dynamic_mesh_indices(entity_id: number): Uint32Array;
    wasm_get_dynamic_mesh_version(entity_id: number): number;
    wasm_get_dynamic_mesh_vertices(entity_id: number): Float32Array;
    wasm_get_inventory(_entity_id: number): Float32Array;
    wasm_get_light_data(): Float32Array;
    wasm_get_render_batches_2d(): Uint32Array;
    wasm_get_render_batches_3d(): Uint32Array;
    wasm_get_tilemap_data(_entity_id: number): Uint32Array;
    wasm_load_world(json: string): void;
    wasm_mark_changed(entity_id: number, comp_id: number): void;
    wasm_pick_2d(x: number, y: number): number;
    wasm_query_at(x: number, y: number, radius: number): Uint32Array;
    wasm_query_at_3d(x: number, y: number, z: number, radius: number): Uint32Array;
    wasm_raycast_3d(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Float32Array;
    wasm_register_component(name: string, size: number, align: number, elements: number, fields_json: string): void;
    wasm_remove_component(entity_id: number, name: string): void;
    wasm_save_world(): string;
    wasm_screen_to_ray(ndc_x: number, ndc_y: number): Float32Array;
    wasm_set_dynamic_mesh(entity_id: number, vertices: Float32Array, indices: Uint32Array): void;
    wasm_set_mesh_handle(entity_id: number, mesh_id: number): void;
    wasm_set_parent(child_id: number, parent_id: number): void;
    wasm_spawn_batch(count: number): Uint32Array;
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
     */
    wasm_spawn_batch_with(count: number, names: string[]): Uint32Array;
    wasm_tile_get(x: number, y: number, layer: number): number;
    wasm_tile_remove(x: number, y: number, layer: number): void;
    wasm_tile_set(x: number, y: number, layer: number, entity_id: number): void;
    wasm_update_input(keys: Uint8Array | null | undefined, mouse_x: number, mouse_y: number, mouse_dx: number, mouse_dy: number, wheel_dy: number, mouse_buttons?: Uint8Array | null): void;
}

/**
 * Environment block for the browser run. The JavaScript side merges in the
 * values only it can see (user agent, `hardwareConcurrency`, WebGPU adapter,
 * `crossOriginIsolated`).
 */
export function artisan_bench_env(): string;

/**
 * Static description of every benchmark case, as JSON. Lets a page build its
 * result table before running anything.
 */
export function artisan_bench_manifest(): string;

/**
 * Runs a single benchmark case and returns its result as JSON.
 *
 * Kept per-case rather than per-suite so the page can yield to the event loop
 * between categories; a multi-second synchronous call would otherwise freeze
 * the tab and let the browser throttle the very work being measured.
 *
 * `cfg_json` accepts the fields of `BenchCfg`; omitted fields take their
 * defaults.
 */
export function artisan_bench_run(id: number, cfg_json: string): string;

/**
 * Number of threads rayon will actually use right now.
 *
 * Before `initThreadPool` has resolved this is 1, and a run measured in that
 * state must not be labelled as threaded.
 */
export function artisan_rayon_threads(): number;

/**
 * A square field of `side * side` cells. A grid rather than a cloud on
 * purpose: with the entities laid out in a plane, each system's contribution
 * is separately legible — the travelling wave is `sys_wave`, the colour is
 * `sys_shade`, the crest glow is `sys_recolor` — instead of everything
 * dissolving into one mass.
 */
export function create_field(side: number, mesh_id: number): WasmEngine;

export function initThreadPool(num_threads: number): Promise<any>;

export function mesh_capsule_2d(width: number, height: number, segments: number): object;

export function mesh_circle_2d(segments: number): object;

export function mesh_cube(size: number): object;

export function mesh_cylinder(radius_top: number, radius_bottom: number, height: number, radial_segments: number): object;

export function mesh_icosphere(radius: number, subdivisions: number, flat_shaded: boolean): object;

export function mesh_plane(size: number): object;

export function mesh_quad_2d(width: number, height: number): object;

export function mesh_ring_2d(inner_radius: number, outer_radius: number, segments: number): object;

export function mesh_sphere(radius: number, rings: number, sectors: number): object;

export function recalculate_normals(vertices: Float32Array, indices: Uint32Array): void;

/**
 * The built schedule: stages, their systems, and the components each reads and
 * writes. Static for a given world, so the demo fetches it once per scene.
 */
export function schedule_json(engine: WasmEngine): string;

/**
 * Run the stages across the rayon pool (`true`) or on the calling thread
 * (`false`). Same systems, same stages, same work — only the width changes.
 */
export function set_parallel(engine: WasmEngine, parallel: boolean): void;

/**
 * Last frame's trace, flattened as
 * `[stage, index_in_stage, thread, start_ms, end_ms] * n`.
 *
 * Times are rebased so the earliest sample in the frame is 0, which is what
 * makes them safe to draw: `performance.now()` shares a time origin between a
 * page and its workers, but the clocks are not guaranteed to agree exactly, so
 * only within-frame differences are used.
 */
export function trace_data(engine: WasmEngine): Float64Array;

export function wasm_error(msg: string): void;

export function wasm_info(msg: string): void;

export function wasm_warn(msg: string): void;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    mainJS(): string;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly create_field: (a: number, b: number) => number;
    readonly schedule_json: (a: number) => [number, number];
    readonly set_parallel: (a: number, b: number) => void;
    readonly trace_data: (a: number) => [number, number];
    readonly __wbg_bridgebench_free: (a: number, b: number) => void;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly artisan_bench_env: () => [number, number];
    readonly artisan_bench_manifest: () => [number, number];
    readonly artisan_bench_run: (a: number, b: number, c: number) => [number, number];
    readonly bridgebench_advance_tick: (a: number) => void;
    readonly bridgebench_changed_row_count: (a: number) => number;
    readonly bridgebench_checksum: (a: number) => number;
    readonly bridgebench_column_ptr: (a: number) => number;
    readonly bridgebench_copy_in: (a: number, b: number, c: number) => void;
    readonly bridgebench_copy_out: (a: number) => any;
    readonly bridgebench_len: (a: number) => number;
    readonly bridgebench_mark_changed: (a: number, b: number) => void;
    readonly bridgebench_marshalled: (a: number, b: number) => any;
    readonly bridgebench_marshalled_set: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly bridgebench_new: (a: number, b: number) => number;
    readonly bridgebench_ptr_by_id: (a: number, b: number) => number;
    readonly bridgebench_ptr_by_name: (a: number, b: number, c: number, d: number) => number;
    readonly bridgebench_reset: (a: number) => void;
    readonly bridgebench_structural_gen: (a: number) => number;
    readonly mesh_capsule_2d: (a: number, b: number, c: number) => any;
    readonly mesh_circle_2d: (a: number) => any;
    readonly mesh_cube: (a: number) => any;
    readonly mesh_cylinder: (a: number, b: number, c: number, d: number) => any;
    readonly mesh_icosphere: (a: number, b: number, c: number) => any;
    readonly mesh_plane: (a: number) => any;
    readonly mesh_quad_2d: (a: number, b: number) => any;
    readonly mesh_ring_2d: (a: number, b: number, c: number) => any;
    readonly mesh_sphere: (a: number, b: number, c: number) => any;
    readonly recalculate_normals: (a: number, b: number, c: any, d: number, e: number) => void;
    readonly wasm_error: (a: number, b: number) => void;
    readonly wasm_info: (a: number, b: number) => void;
    readonly wasm_warn: (a: number, b: number) => void;
    readonly wasmengine_get_active_archetypes: (a: number) => [number, number];
    readonly wasmengine_get_archetype_memory_layout: (a: number, b: number) => any;
    readonly wasmengine_get_component_ptr: (a: number, b: number, c: number, d: number) => number;
    readonly wasmengine_get_component_schemas: (a: number) => any;
    readonly wasmengine_get_resource: (a: number, b: number, c: number) => [number, number];
    readonly wasmengine_get_structural_gen: (a: number) => number;
    readonly wasmengine_kill: (a: number, b: number) => void;
    readonly wasmengine_mesh_capsule_2d: (a: number, b: number, c: number, d: number) => any;
    readonly wasmengine_mesh_circle_2d: (a: number, b: number) => any;
    readonly wasmengine_mesh_quad_2d: (a: number, b: number, c: number) => any;
    readonly wasmengine_mesh_ring_2d: (a: number, b: number, c: number, d: number) => any;
    readonly wasmengine_new: () => number;
    readonly wasmengine_render_tick: (a: number) => void;
    readonly wasmengine_set_resource: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasmengine_spawn: (a: number) => number;
    readonly wasmengine_tick: (a: number, b: number) => void;
    readonly wasmengine_wasm_add_component: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_wasm_find_path: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly wasmengine_wasm_get_dynamic_mesh_color_version: (a: number, b: number) => number;
    readonly wasmengine_wasm_get_dynamic_mesh_indices: (a: number, b: number) => any;
    readonly wasmengine_wasm_get_dynamic_mesh_version: (a: number, b: number) => number;
    readonly wasmengine_wasm_get_dynamic_mesh_vertices: (a: number, b: number) => any;
    readonly wasmengine_wasm_get_inventory: (a: number, b: number) => any;
    readonly wasmengine_wasm_get_light_data: (a: number) => any;
    readonly wasmengine_wasm_get_render_batches_2d: (a: number) => any;
    readonly wasmengine_wasm_get_render_batches_3d: (a: number) => any;
    readonly wasmengine_wasm_get_tilemap_data: (a: number, b: number) => any;
    readonly wasmengine_wasm_load_world: (a: number, b: number, c: number) => void;
    readonly wasmengine_wasm_mark_changed: (a: number, b: number, c: number) => void;
    readonly wasmengine_wasm_pick_2d: (a: number, b: number, c: number) => number;
    readonly wasmengine_wasm_query_at: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmengine_wasm_query_at_3d: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmengine_wasm_raycast_3d: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly wasmengine_wasm_register_component: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasmengine_wasm_remove_component: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_wasm_save_world: (a: number) => [number, number];
    readonly wasmengine_wasm_screen_to_ray: (a: number, b: number, c: number) => any;
    readonly wasmengine_wasm_set_dynamic_mesh: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wasmengine_wasm_set_mesh_handle: (a: number, b: number, c: number) => void;
    readonly wasmengine_wasm_set_parent: (a: number, b: number, c: number) => void;
    readonly wasmengine_wasm_spawn_batch: (a: number, b: number) => [number, number];
    readonly wasmengine_wasm_spawn_batch_with: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmengine_wasm_tile_get: (a: number, b: number, c: number, d: number) => number;
    readonly wasmengine_wasm_tile_remove: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_wasm_tile_set: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasmengine_wasm_update_input: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly artisan_rayon_threads: () => number;
    readonly wasmengine_memory: () => any;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly initThreadPool: (a: number) => any;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_mainJS: (a: number) => any;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
    readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
