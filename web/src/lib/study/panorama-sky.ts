import * as THREE from 'three';

/** High-detail cube views blend into their common panorama at face boundaries.
 * Both samples use the same world direction, so the joining band follows the
 * camera just like the rest of the scenery rather than a screen-space fade. */
export function makePanoramaSky(detail:THREE.Texture,reference:THREE.Texture,rotation:THREE.Euler) {
  const material=new THREE.ShaderMaterial({
    uniforms:{detailMap:{value:detail},referenceMap:{value:reference},rotation:{value:new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation)).transpose()}},
    vertexShader:`varying vec3 worldDirection;
      #include <common>
      void main(){worldDirection=transformDirection(position,modelMatrix);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}`,
    fragmentShader:`uniform samplerCube detailMap;uniform sampler2D referenceMap;uniform mat3 rotation;varying vec3 worldDirection;
      #include <common>
      void main(){
        vec3 d=normalize(rotation*worldDirection),cubeD=vec3(-d.x,d.y,d.z),a=abs(cubeD);
        float largest=max(max(a.x,a.y),a.z),smallest=min(min(a.x,a.y),a.z),second=a.x+a.y+a.z-largest-smallest;
        float weight=smoothstep(0.0,0.18,(largest-second)/largest);
        vec3 color=textureCube(detailMap,cubeD).rgb;
        if(weight<0.9999){
          float longitude=dot(d.xz,d.xz)>0.00000001?atan(d.z,d.x):0.0;
          vec2 uv=vec2(longitude*RECIPROCAL_PI2+0.5,asin(clamp(d.y,-1.0,1.0))*RECIPROCAL_PI+0.5);
          color=mix(texture2D(referenceMap,uv).rgb,color,weight);
        }
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
    side:THREE.BackSide,depthWrite:false,depthTest:true,toneMapped:false,allowOverride:false,
  });
  // Draw the far environment before the room and its translucent surfaces.
  // It writes no depth, so both glass and the forest clearing can blend over it.
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);mesh.name='study-panorama-sky';mesh.frustumCulled=false;mesh.renderOrder=-10000;mesh.matrixAutoUpdate=false;
  mesh.onBeforeRender=(_renderer,_scene,camera)=>{mesh.matrixWorld.copyPosition(camera.matrixWorld);};
  return mesh;
}
