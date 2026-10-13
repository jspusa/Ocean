// Runs inside the page. Measure the real animated mesh through the production
// vertex shader, including submerged vertices; this is framing, not visibility.
export function projectedPartnerBounds(){
 const g=renderer.gl,f=partnerFixture.actor,b=renderer.batches.find(b=>(b.kind===9||b.kind===7)&&b.instances.includes(f)&&!(b.minDistance>0)),original=b.instances;
 const program=g.createProgram(),vert=g.createShader(g.VERTEX_SHADER),frag=g.createShader(g.FRAGMENT_SHADER),feedback=g.createTransformFeedback(),buffer=g.createBuffer();
 try{
  g.shaderSource(vert,VS);g.compileShader(vert);g.shaderSource(frag,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(1.);}');g.compileShader(frag);
  g.attachShader(program,vert);g.attachShader(program,frag);g.transformFeedbackVaryings(program,['vWorld'],g.INTERLEAVED_ATTRIBS);g.linkProgram(program);
  if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));
  b.instances=[f];renderer.updateBatch(b);g.useProgram(program);
  g.uniform1i(g.getUniformLocation(program,'uKind'),b.kind);g.uniform1i(g.getUniformLocation(program,'uMat'),b.material);g.uniform1i(g.getUniformLocation(program,'uSpecies'),f.species);g.uniform1f(g.getUniformLocation(program,'uTime'),t);
  for(const key of ['uVP','uLightVP','uDynamicLightVP'])g.uniformMatrix4fv(g.getUniformLocation(program,key),false,renderer.vp);
  g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,feedback);g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,buffer);g.bufferData(g.TRANSFORM_FEEDBACK_BUFFER,b.vertexCount*12,g.DYNAMIC_READ);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
  g.bindVertexArray(b.vao);
  const output=new Float32Array(b.vertexCount*3);
  const view=renderer.canvas.getBoundingClientRect(),panel=$('panel').getBoundingClientRect(),bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity,behind:0};
  for(const offset of [0,.7,1.4,2.1]){
   g.uniform1f(g.getUniformLocation(program,'uTime'),t+offset);g.enable(g.RASTERIZER_DISCARD);g.beginTransformFeedback(g.POINTS);g.drawArraysInstanced(g.POINTS,0,b.vertexCount,1);g.endTransformFeedback();g.disable(g.RASTERIZER_DISCARD);g.getBufferSubData(g.TRANSFORM_FEEDBACK_BUFFER,0,output);
   for(let i=0;i<output.length;i+=3){const p=project([output[i],output[i+1],output[i+2]],renderer.vp),x=(p[0]*.5+.5)*view.width,y=(.5-p[1]*.5)*view.height;if(p[2]<=0)bounds.behind++;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}
  }
  return {...bounds,limitRight:view.width<=650?view.width:panel.left,limitBottom:view.width<=650?panel.top:view.height,vertices:b.vertexCount,phases:4,gl:g.getError()};
 }finally{
  g.disable(g.RASTERIZER_DISCARD);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);g.bindVertexArray(null);g.useProgram(null);b.instances=original;renderer.updateBatch(b);
  g.deleteBuffer(buffer);g.deleteTransformFeedback(feedback);g.deleteProgram(program);g.deleteShader(vert);g.deleteShader(frag);renderer.render(eye,target,t);
 }
}
