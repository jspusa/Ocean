/* Opt into the installed native Chrome GPU for device profiling. Historical
 * software-WebGL regressions retain their original, explicit default. */
'use strict';
module.exports=function browserLaunch(native=process.env.NATIVE_GPU==='1'){
 if(native)return {headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})};
 return {executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
};
