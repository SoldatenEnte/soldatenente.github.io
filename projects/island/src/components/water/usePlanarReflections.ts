import * as THREE from "three";
import * as React from "react";
import { useThree, RootState } from "@react-three/fiber";

const resolution = 512,
  reflectorOffset = 0;

export function usePlanarReflections(
  // Allow the ref to be null initially
  waterRef: React.RefObject<THREE.Mesh | null>,
  hasReflection: boolean
) {
  const { camera } = useThree();
  const [reflectorPlane] = React.useState(() => new THREE.Plane());
  const [normal] = React.useState(() => new THREE.Vector3());
  const [reflectorWorldPosition] = React.useState(() => new THREE.Vector3());
  const [cameraWorldPosition] = React.useState(() => new THREE.Vector3());
  const [rotationMatrix] = React.useState(() => new THREE.Matrix4());
  const [lookAtPosition] = React.useState(() => new THREE.Vector3(0, 0, -1));
  const [clipPlane] = React.useState(() => new THREE.Vector4());
  const [view] = React.useState(() => new THREE.Vector3());
  const [target] = React.useState(() => new THREE.Vector3());
  const [q] = React.useState(() => new THREE.Vector4());
  const [textureMatrix] = React.useState(() => new THREE.Matrix4());
  const [virtualCamera] = React.useState(() => new THREE.PerspectiveCamera());

  const beforeRender = React.useCallback(() => {
    const parent = waterRef.current;
    if (!parent) return;

    reflectorWorldPosition.setFromMatrixPosition(parent.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    rotationMatrix.extractRotation(parent.matrixWorld);
    normal.set(0, 1, 0); // Water is on XZ plane, so normal is Y up
    normal.applyMatrix4(rotationMatrix);
    reflectorWorldPosition.addScaledVector(normal, reflectorOffset);
    view.subVectors(reflectorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;
    view.reflect(normal).negate();
    view.add(reflectorWorldPosition);
    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1);
    lookAtPosition.applyMatrix4(rotationMatrix);
    lookAtPosition.add(cameraWorldPosition);
    target.subVectors(reflectorWorldPosition, lookAtPosition);
    target.reflect(normal).negate();
    target.add(reflectorWorldPosition);
    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0);
    virtualCamera.up.applyMatrix4(rotationMatrix);
    virtualCamera.up.reflect(normal);
    virtualCamera.lookAt(target);
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    textureMatrix.multiply(virtualCamera.projectionMatrix);
    textureMatrix.multiply(virtualCamera.matrixWorldInverse);
    textureMatrix.multiply(parent.matrixWorld);
    reflectorPlane.setFromNormalAndCoplanarPoint(
      normal,
      reflectorWorldPosition
    );
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
    clipPlane.set(
      reflectorPlane.normal.x,
      reflectorPlane.normal.y,
      reflectorPlane.normal.z,
      reflectorPlane.constant
    );
    const projectionMatrix = virtualCamera.projectionMatrix;
    q.x =
      (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) /
      projectionMatrix.elements[0];
    q.y =
      (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) /
      projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0;
    projectionMatrix.elements[14] = clipPlane.w;
  }, [camera, waterRef]);

  const fbo1 = React.useMemo(() => {
    const parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
    };
    const fbo = new THREE.WebGLRenderTarget(resolution, resolution, parameters);
    fbo.depthBuffer = true;
    fbo.depthTexture = new THREE.DepthTexture(
      resolution,
      resolution,
      THREE.UnsignedShortType
    );
    return fbo;
  }, []);

  const uniforms = React.useMemo(
    () => ({
      uReflectionEnabled: { value: hasReflection },
      uReflectedTexture: { value: fbo1.texture },
      uReflectionTextureMatrix: { value: textureMatrix },
    }),
    [fbo1, textureMatrix, hasReflection]
  );

  React.useEffect(
    () => void (uniforms.uReflectionEnabled.value = hasReflection),
    [hasReflection, uniforms]
  );

  return {
    uniforms,
    render: ({ gl, scene }: RootState) => {
      const parent = waterRef.current;
      if (!parent || !hasReflection) return;

      parent.visible = false;
      const currentXrEnabled = gl.xr.enabled;
      const currentShadowAutoUpdate = gl.shadowMap.autoUpdate;
      beforeRender();
      gl.xr.enabled = false;
      gl.shadowMap.autoUpdate = false;
      gl.setRenderTarget(fbo1);
      gl.state.buffers.depth.setMask(true);
      if (!gl.autoClear) gl.clear();
      gl.render(scene, virtualCamera);
      gl.xr.enabled = currentXrEnabled;
      gl.shadowMap.autoUpdate = currentShadowAutoUpdate;
      parent.visible = true;
      gl.setRenderTarget(null);
    },
  };
}