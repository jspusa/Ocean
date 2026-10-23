/* Frozen original 948c046 bubble update/upload behavior for differential checks. */
class ReferenceBubbles {
 setupBubbles(){const g=this.gl;this.bubbles=[];this.lastBubbleTime=-1;this.bubbleVAO=g.createVertexArray();g.bindVertexArray(this.bubbleVAO);this.bubbleBuffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.bubbleBuffer);g.bufferData(g.ARRAY_BUFFER,512*4*4,g.DYNAMIC_DRAW);this.attr(0,4,16,0);g.bindVertexArray(null);}
 renderBubbles(eye,t){if(this.submersible){this.bubbles=[];this.bubbleTime=t;return;}const g=this.gl;const dt=Math.max(0,Math.min(.1,t-(this.bubbleTime??t)));this.bubbleTime=t;
 if(typeof active!=='undefined'&&active){let breathPhase=(typeof oceanAudio!=='undefined'&&oceanAudio.enabled&&oceanAudio.ctx)?((oceanAudio.ctx.currentTime-oceanAudio.startedAt)%7.6)/7.6:(t%7.6)/7.6;
 if(breathPhase>.43&&breathPhase<.82&&t-this.lastBubbleTime>.105){this.lastBubbleTime=t;
 const third=typeof settings!=='undefined'&&settings.third&&!follow;let origin=third?player.p:eye;let f=dir(),right=[Math.cos(player.yaw),0,Math.sin(player.yaw)];
 for(let k=0;k<3;k++){let side=third?0:rr(.34,.60);this.bubbles.push({p:V.add(origin,V.add(V.mul(f,third?.60:.45),V.add(V.mul(right,side),[rr(-.03,.01),third?.05:-.14,0]))),r:rr(.012,.033),a:0,phase:rr(0,6.28)});}}
 }
 let data=[];this.bubbles=this.bubbles.filter(b=>b.a<9&&b.p[1]<-.12).slice(-500);
 for(let b of this.bubbles){b.a+=dt;b.p[1]+=dt*(.30+b.r*6.);b.p[0]+=Math.sin(t*2.1+b.phase)*dt*.035;b.p[2]+=.018*dt;data.push(...b.p,b.r*(1+b.a*.16));}
 if(!data.length)return;g.bindVertexArray(this.bubbleVAO);g.bindBuffer(g.ARRAY_BUFFER,this.bubbleBuffer);g.bufferSubData(g.ARRAY_BUFFER,0,new Float32Array(data));this.common(this.bubbleProgram,eye,this.vp,t);g.uniform1f(this.uniform(this.bubbleProgram,'uHeight'),this.canvas.height);g.drawArrays(g.POINTS,0,data.length/4);}
}
